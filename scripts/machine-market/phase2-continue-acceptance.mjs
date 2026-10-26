/** Explicit same-run continuation after the reviewed duplicate-order repair. */
import {readFileSync,writeFileSync,existsSync,openSync,closeSync,fsyncSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {createLocalAcceptanceRunner} from './phase2-local-acceptance.mjs';
import {runAcceptance} from './phase2-acceptance.mjs';
import {assertPublicEvidence} from './phase2-acceptance-evidence.mjs';
import {stableIdentity} from './phase2-acceptance-schedule.mjs';
import {phase2Resources,checkPhase2Resources} from './phase2-resources.mjs';
const root=resolve(import.meta.dirname,'../..'),state=join(root,'local-state/machine-market'),directory=join(state,'phase2-run'),artifacts=join(root,'artifacts/machine-market/phase2'),proofFile=join(artifacts,'http-order-repair-initial-state.json');
const sha=value=>createHash('sha256').update(value).digest('hex');
const save=(path,value)=>{const bytes=Buffer.isBuffer(value)?value:Buffer.from(JSON.stringify(value,null,2)+'\n'),fd=openSync(path,'wx',path.startsWith(artifacts)?0o644:0o600);try{writeFileSync(fd,bytes);fsyncSync(fd);}finally{closeSync(fd);}const parent=openSync(resolve(path,'..'),'r');try{fsyncSync(parent);}finally{closeSync(parent);}};
assert.equal(process.argv.length,3);assert(['--prepare','--execute'].includes(process.argv[2]));
let proof;
if(!existsSync(proofFile)){
 const journalBytes=readFileSync(join(directory,'acceptance-journal.json')),journal=JSON.parse(journalBytes),config=JSON.parse(readFileSync(join(directory,'acceptance-config.json'))),db=new DatabaseSync(join(directory,'native.sqlite'),{readOnly:true});
 try{
  assert.equal(journal.stopped.code,'CASE_NEEDS_REVIEW');assert.equal(journal.attempts.length,19);assert.equal(journal.successfulTradeIds.length,0);assert.equal(journal.steps['concrete:http-reservations'].state,'Prepared');
  const ops=db.prepare('SELECT state FROM native_outbox').all();assert.equal(ops.length,13);assert(ops.every(r=>r.state==='ResolvedSuccess'));assert.equal(db.prepare('SELECT count(*) AS n FROM matches').get().n,0);
  const orders=db.prepare('SELECT id,state,version,data FROM orders').all(),open=orders.filter(r=>r.state==='Open');assert.equal(open.length,1);const order=JSON.parse(open[0].data);assert.equal(order.nonce,stableIdentity(config.runId,'http-reservations','same-nonce'));assert.equal(order.limit,'10000');assert.equal(open[0].version,1);
  const holds=db.prepare("SELECT amount FROM principal_holds").all();assert.equal(holds.length,1);assert.equal(holds[0].amount,'10000');
  const oldRequests=db.prepare('SELECT actor,key,body_hash,result FROM requests ORDER BY actor,key').all().map(r=>({actor:r.actor,key:r.key,bodyHash:r.body_hash,resultHash:sha(r.result)}));
  proof={schema:'axp.market.http-reservation.recovery.v1',originalStepId:'concrete:http-reservations',originalJournalSha256:sha(journalBytes),originalStop:journal.stopped,carriedOrderId:open[0].id,carriedOrderVersion:1,carriedHoldLamports:'10000',originalRequestRows:oldRequests,initialSignedAttempts:19,initialTrades:0};
  save(join(directory,'acceptance-journal.before-order-repair.json'),journalBytes);save(proofFile,proof);
 }finally{db.close();}
}else{proof=JSON.parse(readFileSync(proofFile));assert.equal(sha(readFileSync(join(directory,'acceptance-journal.before-order-repair.json'))),proof.originalJournalSha256);}
if(process.argv[2]==='--prepare'){console.log(JSON.stringify({prepared:true,originalJournalSha256:proof.originalJournalSha256,carriedOrderId:proof.carriedOrderId,originalRequests:proof.originalRequestRows.length}));process.exit(0);}
try{
 assert(checkPhase2Resources(phase2Resources()).passed);
 const runner=createLocalAcceptanceRunner({acceptance:args=>runAcceptance({...args,context:{...args.context,httpReservationRecovery:proof}})});
 const result=await runner.run({execute:true,resume:true,directory,readinessPath:join(state,'validator-ready.json'),recoverStaleLock:true});assertPublicEvidence(result);save(join(artifacts,'native-acceptance-after-order-repair.json'),result);console.log(JSON.stringify({complete:result.complete,evidenceHash:result.evidenceHash,budget:result.budget,pending:result.checks.filter(r=>r.status!=='passed')}));
}catch(error){const failure={stopped:true,code:error.code??error.message,safeCode:error.safeCode??null,evidence:error.evidence??null,operationId:error.operationId??null,observedAt:new Date().toISOString()};save(join(artifacts,'order-repair-stop-'+Date.now()+'.json'),failure);console.error(JSON.stringify(failure));process.exitCode=1;
}finally{
 try{const db=new DatabaseSync(join(directory,'native.sqlite'),{readOnly:true});try{for(const old of proof.originalRequestRows){const now=db.prepare('SELECT body_hash,result FROM requests WHERE actor=? AND key=?').get(old.actor,old.key);assert.equal(now.body_hash,old.bodyHash);assert.equal(sha(now.result),old.resultHash);}console.log(JSON.stringify({originalRequestsPreserved:true,count:proof.originalRequestRows.length}));}finally{db.close();}}
 finally{const p=JSON.parse(readFileSync(join(state,'phase2-validator-process.json'))),lock=join(state,'phase2-validator-running.lock');if(existsSync(lock)&&Number(readFileSync(lock,'utf8'))===p.supervisorPid){try{process.kill(p.supervisorPid,'SIGINT');}catch{}}}
}
