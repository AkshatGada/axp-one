// HTTP API for hosted live runs: one Node (req,res) handler for /api/*.
// Same code locally (scripts/hosted/dev-server.mjs) and as a Vercel function.
import {timingSafeEqual,createHash} from 'node:crypto';
import {localConfiguration,repositoryRoot} from '../config/local.mjs';
import {createKVFromConfig} from './kv.mjs';
import {stateKeyFrom,keyedId} from './vault.mjs';
import {loadWallets,publicWallets} from './wallets.mjs';
import {createRunner,publicRecord,TERMINAL,PUBLIC_FILES} from './runner.mjs';
import {payerHealth} from './live-run.mjs';

const fail=(code,status=400)=>{const e=new Error(code);e.code=code;e.status=status;throw e;};
const int=(v,d,min,max)=>{const n=Number(v);return Number.isInteger(n)&&n>=min&&n<=max?n:d;};
const day=now=>new Date(now).toISOString().slice(0,10);
const sameSecret=(a,b)=>{const x=createHash('sha256').update(String(a)).digest(),y=createHash('sha256').update(String(b)).digest();return timingSafeEqual(x,y);};

export function hostedSettings(config) {
  return {
    enabled:config.AXP_LIVE_ENABLED==='1',
    passcode:config.AXP_LIVE_PASSCODE||null,
    dailyCap:int(config.AXP_LIVE_DAILY_CAP,20,0,500),
    ipDailyCap:int(config.AXP_LIVE_IP_DAILY_CAP,3,0,100),
    maxActive:int(config.AXP_LIVE_MAX_ACTIVE,1,1,5),
    deliveryWindowSeconds:int(config.AXP_LIVE_DELIVERY_WINDOW_SECONDS,600,60,1500),
    staleSeconds:int(config.AXP_LIVE_STALE_SECONDS,3600,600,7200),
  };
}

export function createHostedAPI({config=localConfiguration(),root=repositoryRoot,kv,now=Date.now,log=(runId,event,detail)=>console.error(JSON.stringify({at:new Date().toISOString(),runId,event,...(detail??{})}))}={}) {
  // Each prerequisite degrades to "live runs off" instead of failing the whole API.
  const settings=hostedSettings(config);
  let storeError=null,stateKey=null,wallets=null,walletError=null;
  try{kv??=createKVFromConfig(config,{root});if(!kv)storeError='store_unconfigured';}catch(e){kv=null;storeError=e.code??'store_invalid';}
  if(kv){try{stateKey=stateKeyFrom(config,{root,allowLocalKey:kv.kind==='file'});}catch(e){storeError=e.code??'state_key_invalid';}}
  try{wallets=loadWallets(config,{root});}catch(e){walletError=e.code??'wallets_unavailable';}
  const store=kv&&stateKey?kv:null;
  const modelsConfigured=!!(config.JEV_API_KEY||config.TYPESAFE_API_KEY)&&!!config.DEEPSEEK_API_KEY;
  const live=settings.enabled&&!!wallets&&modelsConfigured&&!!store;
  const runner=wallets&&store?createRunner({kv:store,stateKey,wallets,config,signingEnabled:live,modelsEnabled:live,deliveryWindowSeconds:settings.deliveryWindowSeconds,log,now}):null;
  let health={at:0,value:null};
  async function payers(){if(!wallets)return null;if(now()-health.at<60000)return health.value;try{health={at:now(),value:await payerHealth(wallets)};}catch(e){health={at:now(),value:{error:e.code??'rpc_unavailable'}};}return health.value;}
  const isActive=r=>!TERMINAL.includes(r.phase)&&now()-Date.parse(r.updatedAt)<settings.staleSeconds*1000;

  async function liveConfig() {
    let used=0,recent=[],storeReachable=!!store;
    if(store){try{used=Number(await store.get(`axp:day:${day(now())}`)??0);recent=runner?await runner.list(20):[];}catch(e){storeReachable=false;log(null,'store_error',{code:e.code??'store_error'});}}
    const p=live?await payers():null,payersOk=!!p&&!p.error&&Object.values(p).every(x=>x.ok);
    return {schemaVersion:'axp.hosted-live-config.v1',network:'solana-devnet',enabled:live&&storeReachable&&payersOk,configured:{liveEnabled:settings.enabled,store:store?.kind??null,...(storeError?{storeError}:{}),storeReachable,modelKeys:modelsConfigured,wallets:!!wallets,...(walletError?{walletError}:{}),payersFunded:payersOk},
      passcodeRequired:!!settings.passcode,caps:{daily:settings.dailyCap,perIpDaily:settings.ipDailyCap,maxActive:settings.maxActive,deliveryWindowSeconds:settings.deliveryWindowSeconds},
      usedToday:used,activeRuns:recent.filter(isActive).map(r=>r.runId),wallets:wallets?publicWallets(wallets):null,payers:p,
      scenarios:['cached','offline','repeat','mobile'],models:{organic:'deepseek-flash',decisions:'jev-1.13.0'}};
  }

  async function start(body,{ip,idempotencyKey}) {
    if(!live)fail('live_runs_disabled',403);
    const allowed=['passcode'];for(const k of Object.keys(body))if(!allowed.includes(k))fail('unknown_field');
    if(settings.passcode&&(typeof body.passcode!=='string'||body.passcode.length>200||!sameSecret(body.passcode,settings.passcode)))fail('passcode_invalid',403);
    if(idempotencyKey!==undefined&&!/^[\w-]{8,80}$/.test(idempotencyKey))fail('idempotency_key_invalid');
    if(idempotencyKey){const prior=await kv.get(`axp:idem:${idempotencyKey}`);if(prior){const r=await runner.getRecord(prior);if(r)return {status:200,body:{run:publicRecord(r),runToken:null,replayed:true}};}}
    // Serialize admission so the active/daily checks and the counters agree.
    if(!await kv.set('axp:admission',String(now()),{ttlSeconds:15,nx:true}))fail('busy_retry',429);
    try {
      const recent=await runner.list(20);if(recent.filter(isActive).length>=settings.maxActive)fail('live_run_in_progress',429);
      const p=await payers();if(!p||p.error||!Object.values(p).every(x=>x.ok))fail('wallet_topup_needed',503);
      const ipHash=keyedId(stateKey,ip||'unknown'),d=day(now());
      if(Number(await kv.get(`axp:day:${d}`)??0)>=settings.dailyCap)fail('daily_cap_reached',429);
      if(Number(await kv.get(`axp:day:${d}:ip:${ipHash}`)??0)>=settings.ipDailyCap)fail('ip_daily_cap_reached',429);
      await kv.incr(`axp:day:${d}`,172800);await kv.incr(`axp:day:${d}:ip:${ipHash}`,172800);
      const {record,runToken}=await runner.create({ipHash});
      if(idempotencyKey)await kv.set(`axp:idem:${idempotencyKey}`,record.runId,{ttlSeconds:86400,nx:true});
      log(record.runId,'created',{});
      return {status:201,body:{run:publicRecord(record),runToken}};
    } finally {await kv.del('axp:admission');}
  }

  /** Advance stale runs (judge left): delivery window expiry, closing, finalizing. */
  async function sweep() {
    const out=[];if(!runner)return out;
    for(const r of await runner.list(50))if(!TERMINAL.includes(r.phase)&&now()-Date.parse(r.updatedAt)>30000){const x=await runner.advance(r.runId).catch(e=>({error:e.code}));out.push({runId:r.runId,phase:x.record?.phase??r.phase,busy:!!x.busy,error:x.error??null});}
    return out;
  }

  async function route(method,path,{body,ip,headers}) {
    const parts=path.replace(/^\/api\/?/,'').split('/').filter(Boolean);
    if(method==='GET'&&parts[0]==='health')return {status:200,body:{status:'ok',live,store:store?.kind??null}};
    if(method==='GET'&&parts[0]==='live'&&(parts.length===1||(parts.length===2&&parts[1]==='config')))return {status:200,body:await liveConfig()};
    if(parts[0]==='cron'&&parts[1]==='sweep'){
      if(!config.CRON_SECRET||!sameSecret(headers.authorization??'',`Bearer ${config.CRON_SECRET}`))fail('forbidden',403);
      return {status:200,body:{swept:await sweep()}};
    }
    if(parts[0]!=='runs')fail('not_found',404);
    if(!runner&&parts.length===1&&method==='GET')return {status:200,body:{runs:[]}};
    if(!runner)fail('live_runs_unconfigured',503);
    if(parts.length===1&&method==='GET')return {status:200,body:{runs:(await runner.list(25)).map(r=>{const {status,history,...x}=publicRecord(r);return {...x,charges:status?.charges?.length??0};})}};
    if(parts.length===1&&method==='POST')return start(body,{ip,idempotencyKey:headers['idempotency-key']});
    const runId=parts[1];if(!/^v3-devnet-live-[a-z0-9-]{1,48}$/.test(runId??''))fail('run_not_found',404);
    if(parts.length===2&&method==='GET'){const r=await runner.getRecord(runId);if(!r)fail('run_not_found',404);return {status:200,body:{run:publicRecord(r)}};}
    if(parts.length===3&&parts[2]==='advance'&&method==='POST'){
      if(Object.keys(body).length)fail('unknown_field');
      const {record,busy}=await runner.advance(runId);return {status:200,body:{run:publicRecord(record),busy:!!busy}};
    }
    if(parts.length===5&&parts[2]==='awards'&&parts[4]==='render'&&method==='POST'){
      if(!/^award-[a-f0-9-]{36}$/.test(parts[3]))fail('award_not_found',404);
      const fields=['domInserted','sponsoredLabelPresent','creativeHash'];
      if(Object.keys(body).some(k=>!fields.includes(k))||body.domInserted!==true||body.sponsoredLabelPresent!==true||!/^[a-f0-9]{64}$/.test(body.creativeHash??''))fail('render_ack_invalid');
      const token=(headers.authorization??'').replace(/^Bearer /,'');
      const {receipt,record}=await runner.acknowledge(runId,parts[3],body,token);
      return {status:200,body:{receipt,run:publicRecord(record)}};
    }
    if(parts[2]==='files'&&method==='GET'){
      const file=parts.slice(3).join('/');if(!PUBLIC_FILES.includes(file))fail('not_found',404);
      const text=await runner.file(runId,file);if(text===null||text===undefined)fail('not_found',404);
      const r=await runner.getRecord(runId);
      return {status:200,raw:text,contentType:'application/json',immutable:r?.phase==='completed'};
    }
    fail('not_found',404);
  }

  /** Node (req,res) handler. */
  async function handler(req,res) {
    const send=(status,payload,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(typeof payload==='string'?payload:JSON.stringify(payload));};
    try {
      const url=new URL(req.url,'http://local'),method=req.method;
      if(!['GET','POST'].includes(method))fail('method_not_allowed',405);
      let body={};
      if(method==='POST') {
        // Same-origin browser POSTs only (non-browser clients send no Origin).
        const origin=req.headers.origin,host=req.headers['x-forwarded-host']??req.headers.host;
        if(origin&&new URL(origin).host!==host)fail('origin_rejected',403);
        let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>16384)fail('body_too_large',413);}
        if(raw){try{body=JSON.parse(raw);}catch{fail('invalid_json');}}
        if(!body||typeof body!=='object'||Array.isArray(body))fail('invalid_json');
      }
      const ip=String(req.headers['x-real-ip']??req.headers['x-forwarded-for']??req.socket?.remoteAddress??'').split(',')[0].trim();
      const out=await route(method,url.pathname,{body,ip,headers:req.headers});
      if(out.raw!==undefined)return send(out.status,out.raw,{'Content-Type':out.contentType,'Cache-Control':out.immutable?'public, max-age=31536000, immutable':'no-store'});
      return send(out.status,out.body);
    } catch(e) {
      const status=e.status??(e.code?400:500);
      if(status>=500)log(null,'api_error',{code:e.code??'internal_error',message:String(e.message).slice(0,200)});
      return send(status,{error:status>=500&&!e.code?'internal_error':e.code??'internal_error'});
    }
  }
  return {handler,route,sweep,runner,settings,live};
}
