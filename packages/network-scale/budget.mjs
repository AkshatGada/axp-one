import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync,existsSync,readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {hash,ContractError} from '../contracts/index.mjs';
import {BENCHMARK_PROFILE as P,PROFILE_HASH} from './profile.mjs';
import {inheritProviderExecution} from '../product/provider-provenance.mjs';
const fail=code=>{throw new ContractError(code,code,409);};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export class RunJournal {
  constructor({path,runId,sourceCommit='unknown',now=Date.now,execution='actual-api-model/native-devnet'}){
    mkdirSync(dirname(path),{recursive:true,mode:0o700});this.lockPath=join(dirname(path),'coordinator.lock');
    if(existsSync(this.lockPath)){const owner=JSON.parse(readFileSync(this.lockPath,'utf8'));let live=true;try{process.kill(owner.pid,0);}catch(e){if(e.code==='ESRCH')live=false;}if(live)fail('benchmark_coordinator_already_running');unlinkSync(this.lockPath);}
    writeFileSync(this.lockPath,JSON.stringify({pid:process.pid,runId}),{flag:'wx',mode:0o600});
    this.db=new DatabaseSync(path);chmodSync(path,0o600);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS records(kind TEXT,id TEXT,data TEXT,PRIMARY KEY(kind,id)); CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT,at TEXT,type TEXT,data TEXT);');
    this.db.exec("CREATE INDEX IF NOT EXISTS attempt_input ON records(json_extract(data,'$.inputHash')) WHERE kind='attempt'; CREATE INDEX IF NOT EXISTS attempt_provider ON records(json_extract(data,'$.provider')) WHERE kind='attempt';");
    this.now=now;this.inflight={jev:0,deepseek:0};this.peak={jev:0,deepseek:0};this.rate=[];
    const old=this.get('meta','run');if(old&&(old.runId!==runId||old.profileHash!==PROFILE_HASH||old.execution!==execution))fail('benchmark_run_conflict');
    if(!old)this.put('meta','run',{runId,sourceCommit,profileHash:PROFILE_HASH,execution,status:'planned',startedAt:null,createdAt:this.stamp(),updatedAt:this.stamp(),authorization:{approved:true,builderExecution:false,bounds:P}});
    this.restartedPending=this.all('attempt').filter(a=>a.status==='pending').length;
    this.peak=this.get('meta','peak')??this.peak;
    this.rate=this.all('attempt').filter(a=>a.provider==='jev'&&this.now()-Date.parse(a.admittedAt)<1000).map(a=>({at:Date.parse(a.admittedAt),tokens:a.estimatedInputTokens}));
    if(this.restartedPending)this.update({haltReason:'provider_attempt_uncertain_after_restart',status:'partial'});
  }
  stamp(){return new Date(this.now()).toISOString();}
  get(kind,id){const row=this.db.prepare('SELECT data FROM records WHERE kind=? AND id=?').get(kind,id);return row?JSON.parse(row.data):null;}
  all(kind){return this.db.prepare('SELECT data FROM records WHERE kind=? ORDER BY id').all(kind).map(row=>JSON.parse(row.data));}
  put(kind,id,data){this.db.prepare('INSERT INTO records VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data').run(kind,id,JSON.stringify(data));return data;}
  tx(fn){this.db.exec('BEGIN IMMEDIATE');try{const value=fn();this.db.exec('COMMIT');return value;}catch(e){this.db.exec('ROLLBACK');throw e;}}
  event(type,data={}){this.db.prepare('INSERT INTO events(at,type,data) VALUES(?,?,?)').run(this.stamp(),type,JSON.stringify(data));}
  events(){return this.db.prepare('SELECT * FROM events ORDER BY seq').all().map(e=>({seq:e.seq,at:e.at,type:e.type,...JSON.parse(e.data)}));}
  update(data){const meta={...this.get('meta','run'),...data,updatedAt:this.stamp()};this.put('meta','run',meta);return meta;}
  canAdmit(){const meta=this.get('meta','run');if(meta.stopAt&&this.now()>=Date.parse(meta.stopAt)){this.update({haltReason:meta.haltReason??'operator_stop_deadline_reached',status:'partial'});fail('benchmark_stop_deadline');}if(meta.haltReason)fail('benchmark_halted');}
  providerTotals(provider){return {...this.db.prepare("SELECT COUNT(*) attempts,COALESCE(SUM(json_extract(data,'$.usage.inputTokens')),0) inputTokens,COALESCE(SUM(json_extract(data,'$.usage.outputTokens')),0) outputTokens,COALESCE(SUM(json_extract(data,'$.actualNanos')),0) knownNanos,COALESCE(SUM(json_extract(data,'$.liabilityNanos')),0) reservedNanos,COALESCE(SUM(json_extract(data,'$.usage') IS NULL),0) unknownAttempts,COALESCE(SUM(json_extract(data,'$.status')='pending'),0) pendingAttempts,COALESCE(SUM(json_extract(data,'$.status')!='pending' AND json_extract(data,'$.usage') IS NULL),0) terminalUnknownAttempts FROM records WHERE kind='attempt' AND json_extract(data,'$.provider')=?").get(provider)};}
  reserve(provider,input,inputTokens,outputTokens){
    this.canAdmit();
    const key=hash([provider,input]);
    const cap=provider==='jev'?8192:1024,limit=provider==='jev'?1e9:2e9;
    const liabilityNanos=provider==='jev'?inputTokens*42:inputTokens*300+outputTokens*1200;
    return this.tx(()=>{if(this.db.prepare("SELECT 1 FROM records WHERE kind='attempt' AND json_extract(data,'$.inputHash')=?").get(key))fail('provider_attempt_not_replayable');const totals=this.providerTotals(provider),combined=this.db.prepare("SELECT COALESCE(SUM(json_extract(data,'$.liabilityNanos')),0) total FROM records WHERE kind='attempt'").get().total;
      if(totals.attempts>=cap||totals.reservedNanos+liabilityNanos>limit||combined+liabilityNanos>3e9)fail('provider_global_budget_cap');
      const id=hash([this.get('meta','run').runId,provider,key,randomUUID()]),row={id,provider,inputHash:key,status:'pending',admittedAt:this.stamp(),estimatedInputTokens:inputTokens,maxOutputTokens:outputTokens,liabilityNanos,actualNanos:null,usage:null};
      this.put('attempt',id,row);this.event('provider_admitted',{attemptId:id,provider});return row;});
  }
  finish(row,result,error){
    let usage=row.provider==='jev'?result?.usage&&{inputTokens:result.usage.input_tokens,outputTokens:result.usage.output_tokens}:result?.usage;
    if(!Number.isSafeInteger(usage?.inputTokens)||usage.inputTokens<0||!Number.isSafeInteger(usage?.outputTokens)||usage.outputTokens<0)usage=null;
    const actualNanos=usage?(row.provider==='jev'?usage.inputTokens*42:usage.inputTokens*300+usage.outputTokens*1200):null;
    const violation=actualNanos!==null&&(actualNanos>row.liabilityNanos||usage.inputTokens>row.estimatedInputTokens||usage.outputTokens>row.maxOutputTokens);
    this.tx(()=>{this.put('attempt',row.id,{...row,status:error?'failed':'completed',completedAt:this.stamp(),reason:error?.code??(error?'provider_transport_failure':null),usage,actualNanos,liabilityNanos:actualNanos??row.liabilityNanos});this.event('provider_completed',{attemptId:row.id,provider:row.provider,status:error?'failed':'completed',elapsedMs:this.now()-Date.parse(row.admittedAt)});if(violation)this.update({haltReason:'provider_reservation_exceeded',status:'partial'});});
  }
  async acquire(provider,tokens){
    if(provider!=='jev'){this.inflight.deepseek++;this.peak.deepseek=Math.max(this.peak.deepseek,this.inflight.deepseek);return ()=>this.inflight.deepseek--;}
    if(tokens>P.jevTokensPerSecondMax)fail('jev_token_rate_item_limit');
    while(true){const time=this.now();this.rate=this.rate.filter(r=>time-r.at<1000);this.canAdmit();
      if(this.inflight.jev<P.jevInflightMax&&this.rate.length<P.jevRequestsPerSecondMax&&this.rate.reduce((s,r)=>s+r.tokens,0)+tokens<=P.jevTokensPerSecondMax){this.rate.push({at:time,tokens});this.inflight.jev++;this.peak.jev=Math.max(this.peak.jev,this.inflight.jev);return ()=>this.inflight.jev--;}
      await delay(25);
    }
  }
  wrap(provider,source){const journal=this;const transport=async(input,options)=>{
    // UTF-8 bytes upper-bound text tokens; 512 covers provider envelope overhead.
    const bytes=Buffer.byteLength(JSON.stringify(input)),inputTokens=bytes+512,outputTokens=provider==='jev'?65536:1600;
    if(provider==='jev'&&bytes>8192)fail('jev_payload_limit');
    const release=await journal.acquire(provider,inputTokens);let row,result;
    try{row=journal.reserve(provider,input,inputTokens,outputTokens);result=await source(input,options);journal.finish(row,result,null);return result;}
    catch(error){if(row)journal.finish(row,result,error);throw error;}finally{release();journal.put('meta','peak',{...journal.peak});}
  };return inheritProviderExecution(transport,source);}
  reserveNative(id){return this.tx(()=>{const prior=this.get('native',id);if(prior)return prior;const rows=this.all('native');if(rows.length>=128||rows.reduce((s,r)=>s+BigInt(r.depositBaseUnits),0n)+50000n>6400000n||rows.reduce((s,r)=>s+BigInt(r.feeReserveLamports),0n)+10000000n>1600000000n)fail('native_global_cap');const row={id,depositBaseUnits:'50000',feeReserveLamports:'10000000',at:this.stamp()};this.put('native',id,row);this.event('native_admitted',{channelId:id});return row;});}
  reserveNativeFee(id,estimate){const prior=this.get('native',id);if(!prior)fail('native_admission_missing');if(BigInt(estimate)<=BigInt(prior.feeReserveLamports))return prior;return this.tx(()=>{const row=this.get('native',id),amount=BigInt(estimate);if(this.all('native').filter(r=>r.id!==id).reduce((s,r)=>s+BigInt(r.feeReserveLamports),0n)+amount>1600000000n)fail('native_global_fee_cap');return this.put('native',id,{...row,feeReserveLamports:amount.toString()});});}
  reserveCharge(id,amountBaseUnits){return this.tx(()=>{const prior=this.get('charge',id);if(prior){if(prior.amountBaseUnits!==amountBaseUnits)fail('charge_admission_conflict');return prior;}const amount=BigInt(amountBaseUnits);if(amount>2000n||amount<=0n||this.all('charge').reduce((s,r)=>s+BigInt(r.amountBaseUnits),0n)+amount>2048000n)fail('native_global_charge_cap');return this.put('charge',id,{id,amountBaseUnits,at:this.stamp(),status:'reserved'});});}
  close(){this.db.close();if(existsSync(this.lockPath))unlinkSync(this.lockPath);}
}
