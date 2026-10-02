// Hosted live-run state machine. One step per advance() under a KV lease:
// restore the encrypted run directory into a private temp dir, perform one step
// of the live-run engine, save the directory and any new public files, release.
import {mkdtempSync,rmSync,readdirSync,readFileSync,existsSync} from 'node:fs';
import {join,relative,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {createLiveRunEngine,SCENARIO_IDS} from './live-run.mjs';
import {materializeWalletFiles} from './wallets.mjs';
import {packDirectory,unpackDirectory} from './vault.mjs';
import {LIVE_CHANNEL_IDS} from '../v3/devnet-live.mjs';

export const PHASES=Object.freeze(['queued','opening','auctions','delivery','closing','finalizing','completed','aborted','needs_operator']);
export const TERMINAL=Object.freeze(['completed','aborted','needs_operator']);
export const PUBLIC_FILES=Object.freeze(['replay/run.json','replay/manifest.json','chain-check.json','restart.json','devnet-feasibility.json',...SCENARIO_IDS.map(s=>`organic/${s}.json`)]);
const MAX_ATTEMPTS=4,LEASE_SECONDS=290,RECORD_TTL=60*60*24*90;
const fail=(code,status=400)=>{const e=new Error(code);e.code=code;e.status=status;throw e;};
const K={run:id=>`axp:run:${id}`,state:id=>`axp:run:${id}:state`,file:(id,p)=>`axp:run:${id}:file:${p}`,lease:id=>`axp:run:${id}:lease`,runs:'axp:runs'};
const sha=v=>createHash('sha256').update(v).digest('hex');

export function newRunId(now=new Date()) {
  const d=now.toISOString().slice(0,10).replace(/-/g,''),r=randomBytes(5).toString('hex');
  return `v3-devnet-live-h${d}-${r}`;
}
export const tokenMatches=(token,hashHex)=>{if(typeof token!=='string'||!/^[a-f0-9]{48}$/.test(token)||typeof hashHex!=='string')return false;const a=Buffer.from(sha(token),'hex'),b=Buffer.from(hashHex,'hex');return a.length===b.length&&timingSafeEqual(a,b);};

export function createRunner({kv,stateKey,wallets,config,signingEnabled,modelsEnabled,deliveryWindowSeconds=600,log=()=>{},now=Date.now,engineFactory=createLiveRunEngine}) {
  const getRecord=async id=>{const t=await kv.get(K.run(id));return t?JSON.parse(t):null;};
  const putRecord=r=>kv.set(K.run(r.runId),JSON.stringify(r),{ttlSeconds:RECORD_TTL});

  async function create({ipHash}) {
    const runId=newRunId(new Date(now())),runToken=randomBytes(24).toString('hex'),t=new Date(now()).toISOString();
    const record={schemaVersion:'axp.hosted-run.v1',runId,network:'solana-devnet',phase:'queued',createdAt:t,updatedAt:t,tokenHash:sha(runToken),ipHash,attempts:{},history:[{phase:'queued',at:t}],
      error:null,deliveryDeadline:null,files:[],status:null,steps:0};
    await putRecord(record);await kv.lpush(K.runs,runId,200);
    return {record,runToken};
  }

  /** Run fn with the run's directory restored, under the lease; saves afterwards. */
  async function withRun(runId,fn,{save=true}={}) {
    const owner=randomBytes(8).toString('hex');
    // Cheap read first: a busy poll should not cost a store write.
    if(await kv.get(K.lease(runId))||!await kv.set(K.lease(runId),owner,{ttlSeconds:LEASE_SECONDS,nx:true}))return {busy:true};
    const work=mkdtempSync(join(tmpdir(),'axp-run-')),liveDir=join(work,'live'),artifactDir=join(work,'public');
    const w=materializeWalletFiles(wallets,runId);
    try {
      const record=await getRecord(runId);if(!record)fail('run_not_found',404);
      const snapshot=await kv.get(K.state(runId));if(snapshot)unpackDirectory(snapshot,liveDir,stateKey,{aad:runId});
      const engine=engineFactory({runId,liveDir,artifactDir,wallets,walletPaths:w.paths,config,signingEnabled,modelsEnabled,log:(e,d)=>log(runId,e,d)});
      let result,error=null;
      try{result=await fn({engine,record});}catch(e){error=e;}
      // Persist whatever happened (including partial progress before an error).
      if(save){
        await kv.set(K.state(runId),packDirectory(liveDir,stateKey,{aad:runId}),{ttlSeconds:RECORD_TTL});
        const files=existsSync(artifactDir)?listFiles(artifactDir):[];
        for(const f of files){if(!PUBLIC_FILES.includes(f))continue;await kv.set(K.file(runId,f),readFileSync(join(artifactDir,f),'utf8'),{ttlSeconds:RECORD_TTL});if(!record.files.includes(f))record.files.push(f);}
        try{record.status=engine.publicStatus();}catch{}
      }
      return {record,result,error};
    } finally {
      w.dispose();rmSync(work,{recursive:true,force:true});
      if(await kv.get(K.lease(runId))===owner)await kv.del(K.lease(runId));
    }
  }
  const listFiles=dir=>{const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(d,e.name)):[relative(dir,join(d,e.name)).split(sep).join('/')]);return walk(dir);};
  function move(record,phase,extra={}) {const at=new Date(now()).toISOString();record.phase=phase;record.updatedAt=at;record.history.push({phase,at,...extra});}

  async function step({engine,record}) {
    const p=record.phase;
    if(p==='queued'){await engine.prepare();move(record,'opening');return;}
    if(p==='opening'){
      const [opens,organic]=await Promise.all([
        (async()=>{const out={};for(const id of LIVE_CHANNEL_IDS){out[id]=await engine.openChannel(id);if(out[id].status!=='finalized')break;}return out;})(),
        engine.organicAll()]);
      const terminal=organic.find(o=>o.terminal);if(terminal){const e=new Error(terminal.reason);e.code=terminal.reason;e.terminal=true;throw e;}
      const opened=LIVE_CHANNEL_IDS.every(id=>opens[id]?.status==='finalized'),answered=organic.every(o=>['completed','already_completed'].includes(o.status));
      if(opened&&answered){move(record,'auctions');return;}
      const e=new Error(!opened?'channel_open_pending':'organic_pending');e.code=e.message;e.retry=true;throw e;
    }
    if(p==='auctions'){
      for(const id of SCENARIO_IDS)await engine.runScenario(id);
      record.deliveryDeadline=new Date(now()+deliveryWindowSeconds*1000).toISOString();move(record,'delivery');return;
    }
    if(p==='delivery'){
      await engine.authorizePending();
      const status=engine.publicStatus(),pending=status.awards.filter(a=>a.status==='reserved');
      const expired=now()>Date.parse(record.deliveryDeadline)||record.abortReason;
      if(pending.length&&!expired)return;// waiting for the judge's browser
      for(const a of pending)await engine.failAward(a.awardId);
      move(record,'closing',pending.length?{failedAwards:pending.length}:{});return;
    }
    if(p==='closing'){
      if(record.abortReason)for(const a of (engine.publicStatus()?.awards??[]).filter(a=>a.status==='reserved'))await engine.failAward(a.awardId);
      await engine.authorizePending();
      const out={};for(const id of LIVE_CHANNEL_IDS)out[id]=await engine.closeChannel(id);
      const states=engine.channelStates();
      // Done when nothing of this run remains on chain: closed, or never broadcast.
      const done=LIVE_CHANNEL_IDS.every(id=>!states[id]||states[id].close==='finalized'||['prepared','failed'].includes(states[id].open));
      if(!done){const e=new Error('channel_close_pending');e.code=e.message;e.retry=true;throw e;}
      if(record.abortReason){move(record,'aborted',{reason:record.abortReason});return;}
      move(record,'finalizing');return;
    }
    if(p==='finalizing'){
      await engine.verify();await engine.restart();const r=await engine.exportBundle();
      record.bundle={bundleHash:r.bundleHash,storyGates:r.storyGates,charges:r.charges};move(record,'completed');return;
    }
  }

  async function advance(runId) {
    const current=await getRecord(runId);if(!current)fail('run_not_found',404);
    if(TERMINAL.includes(current.phase))return {record:current};
    const out=await withRun(runId,step);if(out.busy)return {record:current,busy:true};
    const {record,error}=out;record.steps++;record.updatedAt=new Date(now()).toISOString();
    if(error){
      const phase=record.phase,n=(record.attempts[phase]=(record.attempts[phase]??0)+1);
      record.error={code:String(error.code??error.message??'step_failed').slice(0,200),phase,at:record.updatedAt,attempt:n};
      log(runId,'step_error',record.error);
      const exhausted=error.terminal||n>=MAX_ATTEMPTS*(error.retry?3:1);
      if(exhausted){
        // Before settlement: abort = fail reserved awards (no charge) and close with refunds.
        if(['queued','opening','auctions','delivery'].includes(phase)){record.abortReason=record.error.code;move(record,'closing',{abort:record.error.code});}
        else move(record,'needs_operator',{reason:record.error.code});
      }
    } else record.error=null;
    await putRecord(record);
    return {record};
  }

  /** Browser delivery acknowledgement (requires the run token). */
  async function acknowledge(runId,awardId,body,token) {
    const current=await getRecord(runId);if(!current)fail('run_not_found',404);
    if(!tokenMatches(token,current.tokenHash))fail('run_token_invalid',403);
    if(current.phase!=='delivery')fail('not_accepting_delivery',409);
    if(now()>Date.parse(current.deliveryDeadline))fail('delivery_window_closed',409);
    const out=await withRun(runId,async({engine})=>{const r=await engine.acknowledge(awardId,body);await engine.authorizePending().catch(e=>log(runId,'authorize_deferred',{code:e.code??e.message}));return r;});
    if(out.busy)fail('run_busy_retry',409);
    if(out.error){const e=out.error;fail(['render_ack_invalid','award_not_found','already_delivered','aggregate_charge_cap','award_expired'].includes(e.code)?e.code:'delivery_rejected',e.status??409);}
    out.record.updatedAt=new Date(now()).toISOString();await putRecord(out.record);
    return {receipt:out.result,record:out.record};
  }

  /** Operator: reconcile channel lookups without new signing (e.g. needs_operator). */
  async function reconcile(runId) {
    const out=await withRun(runId,async({engine})=>{const r={};for(const id of LIVE_CHANNEL_IDS)r[id]=await engine.reconcileChannel(id).catch(e=>({status:'error',code:e.code??e.message}));return r;});
    if(out.busy)fail('run_busy_retry',409);
    await putRecord(out.record);return out.result;
  }
  async function reopen(runId,phase) {const r=await getRecord(runId);if(!r)fail('run_not_found',404);if(!['closing','finalizing'].includes(phase))fail('phase_invalid');r.attempts[phase]=0;move(r,phase,{operator:true});await putRecord(r);return r;}

  const file=(runId,path)=>PUBLIC_FILES.includes(path)?kv.get(K.file(runId,path)):null;
  async function list(limit=25){const ids=await kv.lrange(K.runs,0,limit-1);return (await Promise.all(ids.map(getRecord))).filter(Boolean);}
  return {create,advance,acknowledge,reconcile,reopen,getRecord,file,list};
}

/** Public projection of a run record (no token hash, no IP hash). */
export function publicRecord(r) {
  if(!r)return null;
  const {tokenHash,ipHash,...rest}=r;
  return {...rest,terminal:TERMINAL.includes(r.phase),
    pendingAwards:(r.status?.awards??[]).filter(a=>a.status==='reserved'&&r.phase==='delivery').map(a=>a.awardId),
    links:{bundle:r.phase==='completed'?`/api/runs/${r.runId}/files/replay/run.json`:null}};
}
