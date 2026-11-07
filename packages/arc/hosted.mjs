// Isolated Arc judge workspace. Reuses the established encrypted snapshot/CAS
// executor and AXP API; no production or legacy-rail wallet is used here.
import {mkdtempSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHostedProductAPI} from '../product/hosted.mjs';
import {createArcDemoService} from './demo.mjs';
import {arcWalletIdentities} from './wallet.mjs';
import {ARC_LIMITS} from './network.mjs';
import {repositoryRoot} from '../config/local.mjs';

export const ARC_WORKSPACE='arc-mumbai-preview-v1';
const send=(res,status,value)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(value));};
const unavailable=()=>{throw Object.assign(Error('arc_preview_wallet_required'),{code:'arc_preview_wallet_required',status:503});};

function materializeWallet(config,root) {
  if(!config.VERCEL) {
    const path=resolve(root,config.AXP_ARC_PREVIEW_WALLET_PATH??'local-state/arc/secrets/arc-wallet.json');
    arcWalletIdentities(path);return {path,dispose(){}};
  }
  const encoded=config.AXP_ARC_PREVIEW_WALLET;
  if(typeof encoded!=='string'||encoded.length>22000)unavailable();
  let text;try{text=Buffer.from(encoded,'base64').toString('utf8');JSON.parse(text);}catch{unavailable();}
  const dir=mkdtempSync(join(tmpdir(),'axp-arc-wallet-')),path=join(dir,'wallet.json');
  try{writeFileSync(path,text,{mode:0o600,flag:'wx'});arcWalletIdentities(path);return {path,dispose:()=>rmSync(dir,{recursive:true,force:true})};}
  catch(e){rmSync(dir,{recursive:true,force:true});throw e;}
}

export async function createHostedArcDemoAPI({config=process.env,root=repositoryRoot,kv,now=Date.now,arcOptions={},workspaceFactory}={}) {
  const preview=config.VERCEL_ENV==='preview'&&config.VERCEL_GIT_COMMIT_REF==='feature/arc-integration';
  const local=!config.VERCEL&&config.AXP_ARC_PREVIEW_LOCAL==='1';
  const enabled=config.AXP_ARC_PREVIEW_ENABLED==='1'&&(preview||local);
  if(!enabled)return {handler:async(req,res)=>send(res,req.method==='GET'&&new URL(req.url,'http://local').pathname==='/api/arc/health'?200:503,
    {enabled:false,error:'arc_preview_disabled',network:'arc-testnet'}),enabled:false};
  const api=await createHostedProductAPI({root,kv,now,workspaceFactory,
    config:{...config,AXP_PRODUCT_ENABLED:'1',AXP_PRODUCT_WORKSPACE_ID:ARC_WORKSPACE,
      AXP_STATE_KEY:config.AXP_ARC_PREVIEW_STATE_KEY??config.AXP_STATE_KEY,
      AXP_PRODUCT_FINANCIAL_MODE:'devnet',AXP_PRODUCT_DEVNET_SIGN:'0',AXP_PRODUCT_TEMPO_ENABLED:'0',
      AXP_PRODUCT_DEMO_MODE:'1',AXP_PRODUCT_JEV_DAILY_CAP:'16',AXP_PRODUCT_PASSCODE:'',AXP_PUBLISHER_API_KEY:undefined,
      JEV_API_KEY:undefined,TYPESAFE_API_KEY:undefined,DEEPSEEK_API_KEY:undefined},
    // These are disabled Solana placeholders, identical to the isolated local
    // harness. They never receive a Solana signer or native transport.
    serviceOptions:{paymentOptions:{identities:{payer:'arc-demo-solana-disabled',payee:'arc-demo-solana-disabled-publisher'}}},
    serviceFactory:options=>{
      const answer=options.financialMode==='synthetic';let wallet;
      try {
        if(!answer&&!arcOptions.identities)wallet=materializeWallet(config,root);
        const service=createArcDemoService({...options,runId:answer?'product-organic-v1':'arc-mumbai-v1',
          arcEnabled:!answer,arcSigningEnabled:!answer,arcWalletPath:wallet?.path,arcOptions,
          apiKey:undefined,organicApiKey:undefined,signingEnabled:false,tempoEnabled:false});
        const originalConfig=service.publisherConfig;
        service.publisherConfig=()=>({...originalConfig(),apiBasePath:'/api/arc',settlementNetwork:'arc-testnet',
          demonstration:{fixtureProviders:true,actualNetwork:'arc-testnet',durableWorkspace:ARC_WORKSPACE}});
        const demo=service.demo;
        service.demo=()=>({...demo(),arcDemo:true});
        const close=service.close;
        service.close=()=>{try{close();}finally{wallet?.dispose();}};
        return service;
      }catch(e){wallet?.dispose();throw e;}
    },
  });
  return {...api,enabled,handler:async(req,res)=>{
    // Never let an Arc URL accidentally address the ordinary product workspace.
    if(!/^\/api\/arc(?:\/|\?|$)/.test(req.url))return send(res,404,{error:'not_found'});
    if(req.method==='GET'&&new URL(req.url,'http://local').pathname.replace(/\/$/,'')==='/api/arc/health') {
      let state=null,reachable=!api.initError;
      try{if(api.financialWorkspace)state=await api.financialWorkspace.inspect();}catch{reachable=false;}
      const walletConfigured=!!arcOptions.identities||!!config.AXP_ARC_PREVIEW_WALLET||local&&existsSync(resolve(root,config.AXP_ARC_PREVIEW_WALLET_PATH??'local-state/arc/secrets/arc-wallet.json'));
      return send(res,200,{enabled:enabled&&reachable&&walletConfigured,network:'arc-testnet',workspaceId:ARC_WORKSPACE,
        configured:{store:api.configured.store,storeReachable:reachable,walletConfigured,fixtureProviders:true,...(api.initError?{error:api.initError}:{})},
        signingEnabled:enabled&&reachable&&walletConfigured,solanaSigningEnabled:false,tempoSigningEnabled:false,
        configurationOnly:true,state,caps:ARC_LIMITS});
    }
    const original=req.url;req.url=original.replace(/^\/api\/arc/,'/api/product');
    try{return await api.handler(req,res);}finally{req.url=original;}
  },limits:ARC_LIMITS};
}
