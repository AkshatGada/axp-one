/** Lead-only continuation of the original preserved localhost run; never creates a run. */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {createLocalRpc} from '../../packages/machine-market/native/rpc.mjs';
import {createTradingStore} from '../../packages/machine-market/native/trading.mjs';
import {createNativeService} from '../../packages/machine-market/native/service.mjs';
import {createNativeObserver} from '../../packages/machine-market/native/observations.mjs';
import {createBootstrapDriver} from './phase2-bootstrap.mjs';
import {createLocalAcceptanceRunner} from './phase2-local-acceptance.mjs';
import {captureNativeEvidence} from './phase2-acceptance-runtime.mjs';
import {runAcceptance} from './phase2-acceptance.mjs';
import {assertPublicEvidence} from './phase2-acceptance-evidence.mjs';
import {phase2Resources,checkPhase2Resources} from './phase2-resources.mjs';
const root=resolve(import.meta.dirname,'../..'),state=join(root,'local-state/machine-market'),directory=join(state,'phase2-run'),artifacts=join(root,'artifacts/machine-market/phase2');
const opId='469db1bfe94b44bf475934739f5da8b876a499f50fd11d30c87ca90f4ade5f95';
const signature='3teaFchGbwHM6UAk4nwB7fr5xv286qsqP73PjiJYdYwHf37fMzEYeBLFYdmeTkcrk8mu3FhVtSymQq78cyPHVcsj';
const hash=b=>createHash('sha256').update(b).digest('hex');
const save=(name,value)=>writeFileSync(join(artifacts,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
let store,session;
try{
 assert.deepEqual(process.argv.slice(2),['--execute']);assert(checkPhase2Resources(phase2Resources()).passed);
 const manifest=JSON.parse(readFileSync(join(directory,'bootstrap-config.json'))),ready=JSON.parse(readFileSync(join(state,'validator-ready.json')));
 assert.equal(manifest.runId,'phase2-run');assert.equal(manifest.endpoint,'http://127.0.0.1:18899');assert.equal(ready.verified,true);assert.equal(ready.genesis,manifest.run.genesis);assert.equal(ready.programSha256,manifest.programSha256);
 const rpc=createLocalRpc({endpoint:manifest.endpoint,run:manifest.run,programBytes:readFileSync(join(directory,'program.so')),programDeployment:manifest.programDeployment}),observer=createNativeObserver({rpc,run:manifest.run});
 store=createTradingStore({filename:join(directory,'native.sqlite'),run:manifest.run,mode:'native',recoverStaleLock:true});
 let original=store.native.get(opId);assert.equal(original.attempt.signature,signature);const originalHash=hash(Buffer.from(original.attempt.transaction,'base64'));
 const service=createNativeService({run:manifest.run,rpc,store,observer,signers:new Map(),operatorToken:'local-reconciliation-without-signers-000000000'});
 let outcome=await service.reconcile(opId);console.log(JSON.stringify({milestone:'original-signature-reconciled',state:outcome.state,nativeEvidence:outcome.nativeEvidence,operatingFeesKnown:outcome.operatingFeesKnown}));
 let resent=false;
 if(outcome.state!=='ResolvedSuccess'){
  const validity=await rpc.blockhashValid(original.attempt.blockhash);
  save('original-registration-observation.json',{operationId:opId,signature,transactionHash:originalHash,outcome,blockhashValidity:validity,observedAt:new Date().toISOString()});
  if(outcome.state==='ResolvedFailure'||!validity.valid)throw Object.assign(Error('ORIGINAL_REGISTRATION_UNRESOLVED'),{code:'ORIGINAL_REGISTRATION_UNRESOLVED'});
  await service.resend(opId);resent=true;
  for(let n=0;n<80;n++){outcome=await service.reconcile(opId);if(outcome.state==='ResolvedSuccess'&&outcome.operatingFeesKnown)break;await new Promise(r=>setTimeout(r,500));}
 }
 assert.equal(outcome.state,'ResolvedSuccess');assert.equal(outcome.operatingFeesKnown,true);original=store.native.get(opId);assert.equal(original.attempt.signature,signature);assert.equal(hash(Buffer.from(original.attempt.transaction,'base64')),originalHash);
 const captured=await captureNativeEvidence({operation:original,rpc,observer,run:manifest.run});assert.equal(captured.evidence.status,'finalized-success');save('original-registration-recovery.json',{operationId:opId,signature,transactionHash:originalHash,sameBytesResent:resent,evidence:captured.evidence});
 store.close();store=null;
 session=await createBootstrapDriver().resume({directory,execute:true,recoverStaleLock:true});const bootstrap=session.inspect();assert.equal(bootstrap.complete,true);save('bootstrap-native-result.json',bootstrap);console.log(JSON.stringify({milestone:'bootstrap-complete',attempts:session.bootstrapAttempts.length,proof:session.bootstrapProof}));session.close();session=null;
 const firstAcceptance=!existsSync(join(directory,'acceptance-journal.json'));
 if(firstAcceptance){
  assert.equal(existsSync(join(directory,'acceptance-native-probes.sqlite')),false);
  const db=new DatabaseSync(join(directory,'native.sqlite'),{readOnly:true});let proof;
  try{const rows=db.prepare('SELECT state,data FROM native_outbox').all();assert.equal(rows.length,13);assert(rows.every(r=>r.state==='ResolvedSuccess'&&['Init','IssueSeries','RegisterUnit'].includes(JSON.parse(r.data).instruction.type)));const counts=Object.fromEntries(['orders','matches','campaigns','authorizations','requests'].map(table=>[table,db.prepare('SELECT count(*) AS n FROM '+table).get().n]));assert(Object.values(counts).every(n=>n===0));const native=await rpc.inspectRun();assert.equal(native.marketAccount.fundedMatches,0);proof={sameRun:true,bootstrapOnlyOperations:13,counts,nativeMarketFundedMatches:0,firstAcceptance:true,observedAt:new Date().toISOString()};}finally{db.close();}
  save('first-acceptance-entry-proof.json',proof);
 }
 const runner=createLocalAcceptanceRunner({acceptance:args=>runAcceptance({...args,resume:!firstAcceptance})});
 const result=await runner.run({execute:true,resume:true,directory,readinessPath:join(state,'validator-ready.json'),recoverStaleLock:true});assertPublicEvidence(result);save('native-acceptance.json',result);console.log(JSON.stringify({milestone:'native-acceptance-result',complete:result.complete,evidenceHash:result.evidenceHash,checks:result.checks,budget:result.budget}));
}catch(error){const code=error.code??error.message;console.error(JSON.stringify({stopped:true,code,operationId:error.operationId??null}));const name='recovery-stop-'+Date.now()+'.json';save(name,{stopped:true,code,operationId:error.operationId??null,observedAt:new Date().toISOString()});process.exitCode=1;
}finally{
 session?.close();store?.close();const p=JSON.parse(readFileSync(join(state,'phase2-validator-process.json')));const lock=join(state,'phase2-validator-running.lock');if(existsSync(lock)&&Number(readFileSync(lock,'utf8'))===p.supervisorPid){try{process.kill(p.supervisorPid,'SIGINT');}catch{}}
}
