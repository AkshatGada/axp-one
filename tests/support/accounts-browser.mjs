// Explicit fixture-only browser acceptance. Not packaged into the hosted function.
import {createServer,request} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createAccountStore} from '../../packages/accounts/store.mjs';
import {createAccountsAPI} from '../../packages/accounts/api.mjs';
import {repositoryRoot} from '../../packages/config/local.mjs';

if(process.env.AXP_ACCOUNT_BROWSER_FIXTURE!=='1'||process.env.VERCEL)throw Error('explicit_local_fixture_only');
const dir=mkdtempSync(join(tmpdir(),'axp-account-browser-')),store=createAccountStore({dir});
const identities=new Map([
  ['alice@example.test','10000000-0000-4000-8000-000000000001'],
  ['bob@example.test','10000000-0000-4000-8000-000000000002'],
]);
const rejected=()=>{throw Object.assign(Error('fixture_credentials_only'),{code:'auth_rejected',status:401});};
const user=id=>{const item=[...identities].find(([,value])=>value===id);return item?{id,email:item[0]}:rejected();};
const session=id=>({user:user(id),accessToken:`fixture-access-${id}`,refreshToken:`fixture-refresh-${id}`,expiresAt:Date.now()+3600000});
const provider={
  async signin({email,password}){if(password!=='fixture-only-password'||!identities.has(email))rejected();return session(identities.get(email));},
  async signup(){return {confirmationRequired:true};},
  async confirm(){rejected();},
  async getUser(token){return user(token.replace(/^fixture-access-/,''));},
  async refresh(token){return session(token.replace(/^fixture-refresh-/,''));},
  async signout(){},
};
const api=createAccountsAPI({store,provider,origin:'http://127.0.0.1:3497'});
const ui=spawn(process.execPath,[resolve(repositoryRoot,'apps/product-ui/node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','3498'],{
  cwd:resolve(repositoryRoot,'apps/product-ui'),stdio:'inherit',env:{...process.env,NEXT_PUBLIC_BASE_PATH:'',NEXT_DIST_DIR:'.next-product-dev'}});
const server=createServer((req,res)=>{
  if(req.url.startsWith('/api/accounts/'))return api.handler(req,res);
  if(req.url.startsWith('/api/')){res.writeHead(404);return res.end();}
  const proxy=request({hostname:'127.0.0.1',port:3498,path:req.url,method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});
  proxy.on('error',()=>{res.writeHead(503);res.end('Fixture UI starting');});req.pipe(proxy);
});
server.listen(3497,'127.0.0.1',()=>console.log('FIXTURE ONLY — no Supabase, emails, wallets or providers: http://127.0.0.1:3497/account/'));
let stopping=false;
const stop=()=>{if(stopping)return;stopping=true;ui.kill('SIGTERM');server.close();server.closeAllConnections();store.close();rmSync(dir,{recursive:true,force:true});setTimeout(()=>process.exit(0),200).unref();};
process.once('SIGINT',stop);process.once('SIGTERM',stop);ui.once('exit',stop);
