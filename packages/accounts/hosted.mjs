import {repositoryRoot} from '../config/local.mjs';
import {createKVFromConfig} from '../hosted/kv.mjs';
import {stateKeyFrom} from '../hosted/vault.mjs';
import {createHostedProductWorkspace} from '../product/hosted.mjs';
import {createAccountStore} from './store.mjs';
import {createAccountsAPI} from './api.mjs';
import {createSupabaseAuth} from './supabase.mjs';
import {createSupabaseAccountStore} from './supabase-store.mjs';
import {createHostedAccountNetwork} from './network-hosted.mjs';

const fail=(code,status=503)=>{throw Object.assign(new Error(code),{code,status});};
export function createHostedAccountsAPI({config=process.env,root=repositoryRoot,kv,provider,now=Date.now,networkOptions={}}={}) {
  const enabled=config.AXP_ACCOUNTS_ENABLED==='1';let workspace,stateKey,initError=null,network;
  const profileStore=config.AXP_ACCOUNTS_PROFILE_STORE??(provider?'sqlite-fixture':'supabase');
  const origin=config.AXP_ACCOUNTS_ORIGIN;
  if(enabled)try {
    if(!['supabase','sqlite-fixture'].includes(profileStore)||(profileStore==='sqlite-fixture'&&(!provider||config.VERCEL)))fail('profile_database_configuration_required');
    provider??=createSupabaseAuth({url:config.AXP_SUPABASE_URL,key:config.AXP_SUPABASE_PUBLISHABLE_KEY,now});
    if(profileStore==='supabase')createSupabaseAccountStore({sessions:{},url:config.AXP_SUPABASE_URL,key:config.AXP_SUPABASE_PUBLISHABLE_KEY});
    kv??=createKVFromConfig(config,{root});
    if(!kv||(config.VERCEL&&kv.kind==='file'))fail('accounts_durable_store_required');
    stateKey=stateKeyFrom(config,{root,allowLocalKey:kv.kind==='file'&&!config.VERCEL});
    workspace=createHostedProductWorkspace({kv,stateKey,id:'axp-accounts-v1',kind:'accounts',now});
    if(profileStore==='supabase')network=createHostedAccountNetwork({config,kv,stateKey,now,...networkOptions});
  } catch(e){initError=e.code??'accounts_configuration_required';}
  async function handler(req,res) {
    const health=new URL(req.url,'http://local').pathname.replace(/\/$/,'')==='/api/accounts/health';
    if((health&&profileStore!=='sqlite-fixture')||!workspace||initError||!enabled) {
      return createAccountsAPI({enabled:enabled&&!initError,provider,origin,network,store:workspace?{profileStore,resourceRepository:true}:null}).handler(req,res);
    }
    try {
      const buffer=await workspace.withState(async({dir})=>{
        const sessions=createAccountStore({dir,now});
        const store=profileStore==='supabase'?createSupabaseAccountStore({sessions,url:config.AXP_SUPABASE_URL,key:config.AXP_SUPABASE_PUBLISHABLE_KEY}):sessions;
        const out={status:200,headers:{},body:null,writeHead(status,headers){this.status=status;this.headers=headers;},end(body){this.body=body;}};
        const requestNetwork=network??createHostedAccountNetwork({config,kv,stateKey,now,...(profileStore==='sqlite-fixture'?{catalog:sessions}:{}),...networkOptions});
        try {await createAccountsAPI({store,provider,origin,now,network:requestNetwork}).handler(req,out);return out;}
        finally{store.close();}
      });
      // Session cookies are sent only after the fenced encrypted save succeeds.
      res.writeHead(buffer.status,buffer.headers);res.end(buffer.body);
    } catch(e) {
      const code=typeof e.code==='string'&&/^[a-z_0-9]+$/.test(e.code)?e.code:'accounts_unavailable';
      res.writeHead(e.status??503,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify({error:code}));
    }
  }
  return {handler,workspace,initError};
}
