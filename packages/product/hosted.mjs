// Durable, bounded single-workspace product demo for Vercel. Local SQLite is
// scratch space only: every request restores an encrypted private snapshot.
// The snapshot and its lease share ONE compare-and-swap record, so an expired
// invocation cannot overwrite a successor's state or release its lease.
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,copyFileSync,existsSync,rmSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes,createHmac} from 'node:crypto';
import {Readable} from 'node:stream';
import {DatabaseSync} from 'node:sqlite';
import {repositoryRoot} from '../config/local.mjs';
import {createKVFromConfig} from '../hosted/kv.mjs';
import {stateKeyFrom,packDirectory,unpackDirectory} from '../hosted/vault.mjs';
import {createProductService,secretMatches} from './service.mjs';
import {createProductAPI} from './api.mjs';
import {walletIdentities} from './native.mjs';
import {loadEvidence} from '../v2/evidence.mjs';

const SCHEMA='axp.hosted-product-state.v1';
const fail=(code,status=503)=>{throw Object.assign(new Error(code),{code,status});};
const errorCode=e=>typeof e?.code==='string'&&/^[a-z_0-9]+$/.test(e.code)?e.code:'product_unavailable';
export const productStateKey=(id,kind='financial')=>`axp:product:${id}:${kind}:v1`;
const safeId=id=>{if(typeof id!=='string'||!/^[-a-z0-9]{1,80}$/.test(id))fail('product_workspace_invalid');return id;};
const parse=text=>{if(text===null)return {schemaVersion:SCHEMA,snapshot:null,revision:0,lease:null};let row;try{row=JSON.parse(text);}catch{fail('product_state_invalid');}if(row.schemaVersion!==SCHEMA||!Number.isSafeInteger(row.revision)||row.revision<0||(row.snapshot!==null&&typeof row.snapshot!=='string')||(row.lease!==null&&(!row.lease||typeof row.lease.owner!=='string'||!Number.isSafeInteger(row.lease.until))))fail('product_state_invalid');return row;};

/** A fenced snapshot executor, exported for offline tests and explicit migration.
 * Persistent KV must implement atomic compareAndSet. A plain get/set lease is
 * insufficient: stale workers could otherwise overwrite signed payment state. */
export function createHostedProductWorkspace({kv,stateKey,id='demo',kind='financial',now=Date.now,leaseMs=240000,tempRoot=tmpdir()}={}) {
  safeId(id);if(!['financial','organic'].includes(kind))fail('product_workspace_invalid');
  if(typeof kv?.compareAndSet!=='function'||!Buffer.isBuffer(stateKey)||stateKey.length!==32)fail('product_durable_store_required');
  if(!Number.isSafeInteger(leaseMs)||leaseMs<1000||leaseMs>240000)fail('product_lease_invalid');
  const key=productStateKey(id,kind),aad=`${SCHEMA}:${id}:${kind}`;
  async function withState(fn) {
    const owner=randomBytes(24).toString('hex');let text=await kv.get(key),row=parse(text);
    if(row.lease&&row.lease.until>now())fail('product_busy_retry',429);
    const acquired={...row,lease:{owner,until:now()+leaseMs}},encoded=JSON.stringify(acquired);
    if(!await kv.compareAndSet(key,text,encoded))fail('product_busy_retry',429);
    text=encoded;row=acquired;
    const dir=mkdtempSync(join(tempRoot,'axp-product-'));let lost=false,saveTail=Promise.resolve(),closed=false;
    // The owner is checked inside the same CAS as the snapshot. No unlock DELETE.
    const checkpoint=reason=>{
      const save=saveTail.then(async()=>{
        if(closed||lost||row.lease?.owner!==owner||row.lease.until<=now()){lost=true;fail('product_lease_lost');}
        const snapshot=packDirectory(dir,stateKey,{aad});
        const next={...row,snapshot,revision:row.revision+1,lease:{owner,until:now()+leaseMs},updatedAt:new Date(now()).toISOString()};
        const encoded=JSON.stringify(next);
        if(!await kv.compareAndSet(key,text,encoded)){lost=true;fail('product_lease_lost');}
        text=encoded;row=next;
      });
      // Never silently resume persistence after an ambiguous/failed save.
      saveTail=save.catch(e=>{lost=true;throw e;});saveTail.catch(()=>{});return save;
    };
    try {
      if(row.snapshot)unpackDirectory(row.snapshot,dir,stateKey,{aad});
      const result=await fn({dir,checkpoint,revision:row.revision});
      await checkpoint('response');return result;
    } finally {
      await saveTail.catch(()=>{});closed=true;
      if(!lost&&row.lease?.owner===owner&&row.lease.until>now()) {
        const released={...row,lease:null};
        // CAS failure means another owner has taken over. Never delete its state.
        await kv.compareAndSet(key,text,JSON.stringify(released)).catch(()=>{});
      }
      rmSync(dir,{recursive:true,force:true});
    }
  }
  async function importDirectory(source) {
    // Operator-only migration; refuse a running local payment worker and refuse
    // replacement of any hosted state, including an empty initialized workspace.
    if(existsSync(join(source,'payment-worker.lock')))fail('product_local_worker_running');
    if(await kv.get(key)!==null)fail('product_workspace_already_exists',409);
    const dir=mkdtempSync(join(tempRoot,'axp-product-import-'));
    try {
      const allowed=new Set(['exchange.sqlite','exchange.sqlite-wal','exchange.sqlite-shm','payments.sqlite','payments.sqlite-wal','payments.sqlite-shm','native.sqlite','native.sqlite-wal','native.sqlite-shm','publisher-api-key','publisher-receipt.pem']);
      // Never import the wallet/secrets subdirectory or arbitrary operator files.
      for(const name of readdirSync(source))if(allowed.has(name))copyFileSync(join(source,name),join(dir,name));
      if(!existsSync(join(dir,'exchange.sqlite'))||!existsSync(join(dir,'publisher-receipt.pem'))||!existsSync(join(dir,'publisher-api-key')))fail('product_import_incomplete');
      if(kind==='organic') {
        // Preserve admission IDs/day counters from the local financial workspace
        // when separating the independent answer shard. No old answer is reissued.
        const db=new DatabaseSync(join(dir,'exchange.sqlite'));
        try{const present=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='product_answers'").get();if(present)db.prepare("UPDATE product_answers SET run='product-organic-v1'").run();}
        finally{db.close();}
      }
      const row={schemaVersion:SCHEMA,snapshot:packDirectory(dir,stateKey,{aad}),revision:1,lease:null,updatedAt:new Date(now()).toISOString()};
      if(!await kv.compareAndSet(key,null,JSON.stringify(row)))fail('product_workspace_already_exists',409);
      return {imported:true,workspaceId:id,kind,revision:1};
    } finally {rmSync(dir,{recursive:true,force:true});}
  }
  return {withState,importDirectory,key,inspect:async()=>{const row=parse(await kv.get(key));return {initialized:!!row.snapshot,revision:row.revision,busy:!!row.lease&&row.lease.until>now()};}};
}

function productWallet(config,root) {
  let text;
  if(config.AXP_PRODUCT_DEVNET_WALLET) {
    if(config.AXP_PRODUCT_DEVNET_WALLET.length>100000)fail('product_wallet_invalid');
    try{text=Buffer.from(config.AXP_PRODUCT_DEVNET_WALLET,'base64').toString('utf8');JSON.parse(text);}catch{fail('product_wallet_invalid');}
  } else if(!config.VERCEL) {
    const path=resolve(root,config.AXP_PRODUCT_DEVNET_WALLET_PATH??'local-state/product/secrets/devnet-wallet.json');
    // Validate permissions/key binding before reading an existing local key.
    walletIdentities(path);text=readFileSync(path,'utf8');
  } else fail('product_wallet_required');
  const dir=mkdtempSync(join(tmpdir(),'axp-product-wallet-')),path=join(dir,'wallet.json');
  try{writeFileSync(path,text,{mode:0o600,flag:'wx'});return {path,identities:walletIdentities(path),dispose:()=>rmSync(dir,{recursive:true,force:true})};}
  catch(e){rmSync(dir,{recursive:true,force:true});throw e;}
}
const send=(res,status,value)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...(status===429?{'retry-after':'2'}:{})});res.end(JSON.stringify(value));};
async function bufferedRequest(req) {
  if(req.method!=='POST')return req;
  if(!req.headers['content-type']?.startsWith('application/json'))fail('json_required',415);
  let bytes=0;const chunks=[];
  const read=(async()=>{for await(const c of req){const chunk=Buffer.from(c);bytes+=chunk.length;if(bytes>16384)fail('body_too_large',413);chunks.push(chunk);}})();
  let timer;try{await Promise.race([read,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(new Error('body_timeout'),{code:'body_timeout',status:408})),10000);timer.unref?.();})]);}finally{clearTimeout(timer);}
  return Object.assign(Readable.from([Buffer.concat(chunks)]),{method:req.method,url:req.url,headers:req.headers});
}
const responseBuffer=()=>({status:200,headers:{},body:null,writeHead(status,headers){this.status=status;this.headers=headers;return this;},end(body){if(this.body!==null)fail('product_response_duplicate');this.body=body;}});

/** Vercel handler: safe unconfigured health; durable financial and organic shards.
 * The independent DeepSeek shard has no payment capability. It can answer while
 * the financial shard is evaluating Jev or waiting for a chain operation. */
export async function createHostedProductAPI({config=process.env,root=repositoryRoot,kv,now=Date.now,serviceOptions={},retriever,workspaceFactory=createHostedProductWorkspace}={}) {
  const enabled=config.AXP_PRODUCT_ENABLED==='1',id=safeId(config.AXP_PRODUCT_WORKSPACE_ID??'demo'),mode=config.AXP_PRODUCT_FINANCIAL_MODE??'synthetic';
  const configured={enabled,financialMode:mode,store:null,modelKeys:{jev:!!(config.JEV_API_KEY||config.TYPESAFE_API_KEY||serviceOptions.transport),organic:!!(config.DEEPSEEK_API_KEY||serviceOptions.organicTransport)},wallet:false};
  let initError=null,financial,organic,stateKey;
  try {
    if(!['synthetic','devnet'].includes(mode))fail('financial_mode_invalid');
    const modelCap=Number(config.AXP_PRODUCT_JEV_DAILY_CAP??50);if(!Number.isInteger(modelCap)||modelCap<1||modelCap>200)fail('model_cap_invalid');
    kv??=createKVFromConfig(config,{root});configured.store=kv?.kind??null;
    if(!kv||(config.VERCEL&&kv.kind==='file'))fail('product_durable_store_required');
    stateKey=stateKeyFrom(config,{root,allowLocalKey:kv.kind==='file'&&!config.VERCEL});
    if(mode==='devnet'&&!serviceOptions.paymentOptions?.identities){const w=productWallet(config,root);w.dispose();configured.wallet=true;}else configured.wallet=mode==='synthetic'||!!serviceOptions.paymentOptions?.identities;
    financial=workspaceFactory({kv,stateKey,id,kind:'financial',now});organic=workspaceFactory({kv,stateKey,id,kind:'organic',now});
    if(!retriever)retriever=loadEvidence();
  } catch(e){initError=errorCode(e);}
  const csrf=stateKey?createHmac('sha256',stateKey).update(`axp-product-csrf:${id}`).digest('hex'):null;
  const sign=enabled&&mode==='devnet'&&config.AXP_PRODUCT_DEVNET_SIGN==='1';
  async function handler(req,res) {
    try {
      const path=new URL(req.url,'http://local').pathname.replace(/\/$/,'');
      if(req.method==='GET'&&path==='/api/product/health') {
        let state=null,storeReachable=!initError;
        if(financial)try{state=await financial.inspect();}catch{storeReachable=false;}
        return send(res,200,{schemaVersion:'axp.hosted-product-health.v1',enabled:enabled&&!initError&&storeReachable,configured:{...configured,storeReachable,...(initError?{error:initError}:{})},signingEnabled:sign&&!initError,state,caps:{jevDaily:Number(config.AXP_PRODUCT_JEV_DAILY_CAP??50),organicDaily:20,channels:8,aggregateDepositBaseUnits:'2000000'},passcodeRequired:!!config.AXP_PRODUCT_PASSCODE});
      }
      if(!enabled)fail('product_disabled');if(initError)fail(initError);
      if(!['GET','POST'].includes(req.method))fail('method_not_allowed',405);
      if(req.method==='POST') {
        const origin=req.headers.origin,host=req.headers.host;
        if(origin&&origin!==`https://${host}`&&origin!==`http://${host}`)fail('origin_invalid',403);
        if(req.headers['sec-fetch-site']==='cross-site')fail('origin_invalid',403);
        if(config.AXP_PRODUCT_PASSCODE&&!secretMatches(req.headers['x-axp-product-passcode'],config.AXP_PRODUCT_PASSCODE))fail('passcode_invalid',403);
      }
      const request=await bufferedRequest(req),answer=path==='/api/product/demo/answer',workspace=answer?organic:financial;
      const buffered=await workspace.withState(async({dir,checkpoint})=>{
        let wallet=null,service;
        try {
          if(!answer&&mode==='devnet'&&!serviceOptions.paymentOptions?.identities)wallet=productWallet(config,root);
          service=createProductService({...serviceOptions,stateDir:dir,runId:answer?'product-organic-v1':mode==='devnet'?'product-devnet-v1':'product-workspace-v1',now,publisherKey:config.AXP_PUBLISHER_API_KEY??serviceOptions.publisherKey,apiKey:config.JEV_API_KEY||config.TYPESAFE_API_KEY,organicApiKey:config.DEEPSEEK_API_KEY,retriever,dailyModelCap:Number(config.AXP_PRODUCT_JEV_DAILY_CAP??50),demoMode:config.AXP_PRODUCT_DEMO_MODE==='1',financialMode:answer?'synthetic':mode,signingEnabled:!answer&&sign,walletPath:wallet?.path,paymentOptions:{...serviceOptions.paymentOptions,lock:false,minimumDiskBytes:32*1024**2},checkpoint});
          // Persist generated receipt identity / keys before they can be observed.
          await checkpoint('initialized');
          const buffer=responseBuffer();await createProductAPI({service,csrf}).handler(request,buffer);
          // Quiesce and close SQLite (including WAL) before the final response save.
          service.close();service=null;return buffer;
        } finally {service?.close();wallet?.dispose();}
      });
      // createProductAPI may prepare success/error output, but neither reaches
      // the browser until withState has saved and fenced the complete result.
      if(res.destroyed||res.writableEnded)return;
      res.writeHead(buffered.status,buffered.headers);res.end(buffered.body);
    } catch(e){if(!res.headersSent&&!res.destroyed)send(res,e.status??503,{error:errorCode(e)});}
  }
  return {handler,financialWorkspace:financial,organicWorkspace:organic,configured,initError};
}
