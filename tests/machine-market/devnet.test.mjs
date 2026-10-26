import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync,realpathSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {fixture} from './helpers/devnet-fixture.mjs';
function setup(t,options={}){const dir=realpathSync(mkdtempSync(join(tmpdir(),'axp-devnet-offline-')));t.after(()=>rmSync(dir,{recursive:true,force:true}));const f=fixture({filename:join(dir,'journal.sqlite'),...options});return f;}
test('offline finite driver deploys only fixture ELF and completes D0/D1/D2 with one aggregate journal',async t=>{const f=setup(t),r=f.create();t.after(()=>r.close());let result;try{result=await r.run();}catch(e){assert.fail(JSON.stringify({code:e.code,stack:e.stack,lastSent:f.sent.at(-1)?.id,fixtureFailure:f.faults.lastError}));}assert.equal(result.authority,'injected-offline-rpc');assert.equal(result.liveEvidence,false);assert.equal(result.summary.actions,33);assert.equal(result.summary.totals.gross,'60000');assert.equal(result.summary.totals.primary,'30000');assert.equal(result.summary.totals.fixture,'81000000');assert.equal(f.sent.filter(o=>/^D[012]:fund:/.test(o.id)).length,5);assert.equal(f.sent.filter(o=>o.id.startsWith('probe:')).length,4);assert.equal(result.summary.unresolved.length,0);assert.equal(f.signCalls.length>0,true);});

import {readFileSync,existsSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createDevnetPlan} from '../../packages/machine-market/devnet/plan.mjs';
import {createDevnetRunner} from '../../packages/machine-market/devnet/runner.mjs';
import {manifestTemplate,APPROVED_PAYER} from '../../packages/machine-market/devnet/manifest.mjs';
import {devnetEndpoint} from '../../packages/machine-market/devnet/manifest.mjs';
import {localEndpoint} from '../../packages/machine-market/native/rpc.mjs';
import {publicKeyBytes} from '../../packages/machine-market/native/codec.mjs';

test('full-size fixture upload has252 exact writes and all money stays inside the approved aggregate ceilings',async t=>{
 const f=setup(t,{elfBytes:241832}),r=f.create();t.after(()=>r.close());const result=await r.run();assert.equal(result.summary.actions,284);assert.equal(result.summary.signed,284);assert.equal(result.summary.totals.fee,'1535000');assert.equal(result.summary.totals.rent,'1276985000');assert.equal(result.summary.totals.fixture,'81000000');assert.equal(result.summary.totals.gross,'60000');assert.equal(f.sent.filter(x=>x.id.startsWith('write:')).length,252);assert.equal(f.sent.some(x=>Buffer.from(x.transaction,'base64').length===1232),true);assert.equal(BigInt(result.summary.peak)<=1400000000n,true);
 const calls=f.signCalls.length,sends=f.sent.length;await r.run();assert.equal(f.signCalls.length,calls);assert.equal(f.sent.length,sends);assert.equal(JSON.stringify(result).includes(f.content.toString()),false);assert.equal(f.raw.get(f.manifest.identities.buffer),undefined);for(const role of ['issuer','buyerA','buyerB','sponsor','collector'])assert.equal(f.raw.get(f.manifest.identities[role]).lamports,0);
});
test('placeholder identities, live-key fixture aliases and unapproved live manifests fail before a signer or network is used',t=>{
 const f=setup(t);assert.throws(()=>createDevnetPlan({manifest:manifestTemplate(),elf:f.elf,content:f.content}),{code:'PUBLIC_IDENTITIES_PENDING'});
 const changed=structuredClone(f.manifest);changed.identities.payer=APPROVED_PAYER;assert.throws(()=>createDevnetPlan({manifest:changed,elf:f.elf,content:f.content,allowFixture:true}),{code:'FIXTURE_PAYER'});
 assert.throws(()=>f.create({allowFixture:false}),{code:'ELF_IDENTITY'});assert.throws(()=>f.create({fetchImpl:globalThis.fetch}),{code:'OFFLINE_TRANSPORT_REQUIRED'});assert.equal(f.signCalls.length,0);assert.equal(f.sent.length,0);
});
test('Devnet allowlist and the original literal-loopback guard reject every cross-network spelling',()=>{
 for(const url of ['https://api.mainnet-beta.solana.com','https://api.devnet.solana.com/','https://api.devnet.solana.com?x=1','https://api.devnet.solana.com@evil.example','http://127.0.0.1:8899'])assert.throws(()=>devnetEndpoint(url));
 assert.equal(localEndpoint('http://127.0.0.1:8899'),'http://127.0.0.1:8899');for(const url of ['https://api.devnet.solana.com','http://localhost:8899'])assert.throws(()=>localEndpoint(url));
});
test('wrong genesis and null fees stop preparation before any ephemeral key is called',async t=>{
 const f=setup(t),r=f.create();t.after(()=>r.close());f.faults.genesis='wrong';await assert.rejects(r.execute('buffer:create'));assert.equal(r.journal.summary().actions,0);f.faults.genesis=undefined;f.faults.nullFee=true;await assert.rejects(r.execute('buffer:create'));assert.equal(f.signCalls.length,0);assert.equal(f.sent.length,0);
});
test('manifest and compiled actions remain immutable and undeclared or changed attempts cannot be signed',async t=>{
 const f=setup(t),r=f.create();t.after(()=>r.close());const op=await r.prepare('buffer:create');f.manifest.identities.buffer=f.manifest.identities.collector;assert.notEqual(r.plan.manifest.identities.buffer,f.manifest.identities.buffer);assert.throws(()=>{r.plan.manifest.identities.buffer='bad';});assert.throws(()=>r.journal.prepare('buffer:create',{...op.quote,blockhash:APPROVED_PAYER}),{code:'IMMUTABLE_ATTEMPT'});assert.throws(()=>r.journal.prepare('arbitrary-transfer',op.quote),{code:'UNDECLARED_ACTION'});const action=r.plan.get('fixture:fund:issuer');action.amount='999999999';assert.equal(r.plan.get(action.id).amount,'20000000');assert.equal(f.signCalls.length,0);
});
test('budget and resource boundaries reject before signing and preserve admission counts',async t=>{
 const f=setup(t),r=f.create();t.after(()=>r.close());const op=await r.prepare('buffer:create');assert.throws(()=>r.journal.prepare('fixture:fund:issuer',{...op.quote,fee:'50001'}),{code:'FEE_QUOTE'});assert.throws(()=>r.journal.prepare('series:issue',{...op.quote,rent:{...op.quote.rent,series:'1300000001'}}),{code:'BUDGET_RENT'});assert.equal(r.journal.summary().actions,1);assert.equal(f.signCalls.length,0);
 const other=setup(t,{resources:()=>({freeBytes:39999999999,totalTaskBytes:1,appBytes:0})});assert.throws(()=>other.create(),{code:'RESOURCE_CAP'});assert.equal(existsSync(other.options.filename),false);
});
test('gate denial is not implied by approved allocation and never invokes a key',async t=>{
 const f=setup(t),r=f.create();t.after(()=>r.close());f.faults.denyGate=true;await assert.rejects(r.signAction('buffer:create'),{code:'ACTION_TIME_APPROVAL_REQUIRED'});assert.equal(f.signCalls.length,0);assert.equal(f.sent.length,0);assert.equal(r.journal.get('buffer:create').state,'Prepared');
});
test('interrupted signer retains full reserves, quarantines and refuses a fresh signature on reopen',async t=>{
 const f=setup(t);let r=f.create();f.faults.signerThrows=true;await assert.rejects(r.signAction('buffer:create'));const op=r.journal.get('buffer:create');assert.equal(op.state,'Quarantined');assert.equal(op.attempt,null);assert.equal(r.journal.summary().totals.rent,op.cost.rent);const calls=f.signCalls.length;r.close();r=f.create();t.after(()=>r.close());await assert.rejects(r.signAction('buffer:create'),{code:'SIGNING_FENCE_UNCERTAIN'});assert.equal(f.signCalls.length,calls);assert.equal(f.sent.length,0);
});
test('lost finalized send response reconciles original durable bytes without new signing or repeat funding',async t=>{
 const f=setup(t);let r=f.create();f.faults.afterSend=true;await assert.rejects(r.execute('buffer:create'),{code:'PENDING_SETTLEMENT'});const signed=r.journal.get('buffer:create').attempt,calls=f.signCalls.length;assert.equal(r.journal.get('buffer:create').state,'Unknown');r.close();f.faults.afterSend=false;r=f.create();t.after(()=>r.close());assert.equal((await r.execute('buffer:create')).state,'FinalizedSuccess');assert.equal(r.journal.get('buffer:create').attempt.transaction,signed.transaction);assert.equal(f.signCalls.length,calls);assert.equal(f.sent.length,1);
});
test('unknown send blocks expansion; explicit valid same-byte resend uses the one original signature',async t=>{
 const f=setup(t),r=f.create();t.after(()=>r.close());f.faults.beforeSend=true;await assert.rejects(r.execute('buffer:create'));const original=r.journal.get('buffer:create').attempt,calls=f.signCalls.length;await assert.rejects(r.prepare('write:000'),{code:'UNRESOLVED_OUTCOME'});assert.equal(r.journal.summary().actions,1);f.faults.beforeSend=false;await r.resend('buffer:create');assert.equal(f.signCalls.length,calls);assert.equal(f.sent.length,2);assert(f.sent.every(x=>x.signature===original.signature&&x.transaction===original.transaction));
});
test('expired unresolved bytes cannot be re-signed, replaced or sent with a refreshed blockhash',async t=>{
 const f=setup(t),r=f.create();t.after(()=>r.close());f.faults.beforeSend=true;await assert.rejects(r.execute('buffer:create'));const op=r.journal.get('buffer:create'),calls=f.signCalls.length;f.faults.expired=true;await assert.rejects(r.resend(op.id),{code:'EXPIRED_OR_UNRESOLVED'});assert.throws(()=>r.journal.prepare(op.id,{...op.quote,lastValidBlockHeight:'999999'}),{code:'IMMUTABLE_ATTEMPT'});assert.equal(f.signCalls.length,calls);assert.equal(f.sent.length,1);
});
test('write/deploy authority changes and existing-program collisions stop before another signer',async t=>{
 const f=setup(t),r=f.create();t.after(()=>r.close());await r.execute('buffer:create');const calls=f.signCalls.length;publicKeyBytes(f.manifest.identities.collector).copy(f.raw.get(f.manifest.identities.buffer).data,5);await assert.rejects(r.signAction('write:000'),{code:'BUFFER_AUTHORITY'});assert.equal(f.signCalls.length,calls);
});
test('finalized metadata cannot change known costs or be downgraded to release a new obligation',async t=>{
 const f=setup(t),r=f.create();t.after(()=>r.close());const op=await r.execute('buffer:create');assert.throws(()=>r.journal.observe(op.id,{status:'success',contextSlot:op.watermark,transactionHash:op.attempt.transactionHash,fee:'0',rent:op.actual.rent,evidence:op.evidence}),{code:'TERMINAL_CONFLICT'});assert.throws(()=>r.journal.observe(op.id,{status:'unknown',contextSlot:'0'}),{code:'STALE_OBSERVATION'});assert.equal(r.journal.get(op.id).actual.fee,op.actual.fee);
});

test('four-write wave is fully admitted before sending; one unknown blocks the next wave and resumes exact old bytes',async t=>{
 const f=setup(t,{elfBytes:5000}),r=f.create();t.after(()=>r.close());f.faults.beforeSendId='write:001';await assert.rejects(r.run(),{code:'PENDING_SETTLEMENT'});const writes=f.signCalls.filter(x=>x.action?.startsWith('write:'));assert.equal(writes.length,4);assert.equal(f.sent.filter(x=>x.id.startsWith('write:')).length,4);await assert.rejects(r.prepare('write:004'),{code:'UNRESOLVED_OUTCOME'});const original=r.journal.get('write:001').attempt.transaction;for(const id of ['write:000','write:002','write:003'])await r.reconcile(id);f.faults.beforeSendId=null;await r.resend('write:001');assert.equal(r.journal.get('write:001').attempt.transaction,original);const result=await r.run();assert.equal(result.completedCases.length,3);assert.equal(f.signCalls.filter(x=>x.action==='write:001').length,1);
});
test('changed persisted message and wrong-key signatures are refused without publishing partial signatures',async t=>{
 const f=setup(t),r=f.create();t.after(()=>r.close());const op=await r.prepare('buffer:create'),db=new DatabaseSync(f.options.filename);const row=JSON.parse(db.prepare('SELECT data FROM actions WHERE id=?').get(op.id).data);row.message=Buffer.from('unapproved').toString('base64');db.prepare('UPDATE actions SET data=? WHERE id=?').run(JSON.stringify(row),op.id);db.close();await assert.rejects(r.signAction(op.id),{code:'PERSISTED_INTENT_CHANGED'});assert.equal(f.signCalls.length,0);assert.equal(f.sent.length,0);
 const other=setup(t),s=other.create();t.after(()=>s.close());const ready=await s.prepare('buffer:create');assert.throws(()=>s.journal.sign(ready.id,{expectedVersion:ready.version,signExact:()=>Buffer.alloc(64)}),{code:'SIGNATURE_MISMATCH'});assert.equal(s.journal.get(ready.id).state,'Quarantined');assert.equal(s.journal.get(ready.id).attempt,null);
});
test('a storage failure after the signer returns keeps the original fence and never submits bytes',async t=>{
 let exhausted=false;const f=setup(t,{resources:()=>({freeBytes:100000000000,totalTaskBytes:9000000000,appBytes:exhausted?51*1024**2:1000})});const capabilities=f.options.capabilities,original=capabilities.handles.get(f.manifest.identities.payer).signExact;capabilities.handles.get(f.manifest.identities.payer).signExact=request=>{const sig=original(request);exhausted=true;return sig;};let r=f.create();await assert.rejects(r.signAction('buffer:create'),{code:'RESOURCE_CAP'});exhausted=false;assert.equal(r.journal.get('buffer:create').state,'Signing');assert.equal(f.sent.length,0);const calls=f.signCalls.length;r.close();r=f.create();t.after(()=>r.close());assert.equal(r.journal.get('buffer:create').state,'Quarantined');await assert.rejects(r.signAction('buffer:create'));assert.equal(f.signCalls.length,calls);
});
test('tampered send policy cannot turn normal deployment bytes into a preflight-skipping probe',async t=>{
 const f=setup(t),r=f.create();t.after(()=>r.close());await r.signAction('buffer:create');const signed=r.journal.get('buffer:create'),intent=r.journal.markSend(signed.id,{expectedVersion:signed.version,blockHeight:String(f.slot)});await assert.rejects(r.rpc.submitOperation({...intent,kind:'probe'},{assertPersisted:()=>true}),{code:'SEND_POLICY_MISMATCH'});assert.equal(f.sent.length,0);
});
test('existing program identities are rejected before loading or signing any new deployment action',async t=>{
 const f=setup(t),oldProgram=f.manifest.identities.program;f.manifest.identities.program='BPFLoaderUpgradeab1e11111111111111111111111';f.options.capabilities.handles.delete(oldProgram);f.options.capabilities.handles.set(f.manifest.identities.program,{publicKey:f.manifest.identities.program,signExact(){throw Error('EXISTING_PROGRAM_MUST_NOT_SIGN');}});const r=f.create();t.after(()=>r.close());await assert.rejects(r.execute('buffer:create'),{code:'EXECUTION_IDENTITIES_NOT_FRESH'});assert.equal(f.signCalls.length,0);assert.equal(f.sent.length,0);
});

import {fork} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {writeFileSync} from 'node:fs';
for(const mode of ['native','authorization'])test('actual process death after '+mode+' signing fence retains quarantine without producing or retrying a signature',async t=>{
 const f=setup(t);let r=f.create();await r.prepare('buffer:create');const before=r.journal.get('buffer:create');r.close();const input=f.options.filename+'.public-fixture.json';writeFileSync(input,JSON.stringify({mode,manifest:f.manifest,elf:f.elf.toString('base64'),content:f.content.toString('base64'),filename:f.options.filename}),{mode:0o600});
 const child=fork(fileURLToPath(new URL('./helpers/devnet-fence-child.mjs',import.meta.url)),[input],{execArgv:[],stdio:'ignore',env:{PATH:process.env.PATH,NODE_NO_WARNINGS:'1'}});const result=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('CHILD_TIMEOUT'));},10000);child.once('error',reject);child.once('exit',(code,signal)=>{clearTimeout(timer);resolve({code,signal});});});assert.equal(result.signal,'SIGKILL');r=f.create({recoverStaleLock:true});t.after(()=>r.close());if(mode==='native'){assert.equal(r.journal.get(before.id).state,'Quarantined');assert.equal(r.journal.get(before.id).message,before.message);assert.equal(r.journal.get(before.id).attempt,null);await assert.rejects(r.signAction(before.id));}else await assert.rejects(r.signAction(before.id),{code:'UNRESOLVED_OUTCOME'});assert.equal(f.signCalls.length,0);assert.equal(f.sent.length,0);assert.equal(r.journal.summary().totals.rent,before.cost.rent);
});
test('W2 signatures are durably fenced, immutable and quarantined on an interrupted authorization',async t=>{
 const f=setup(t),r=f.create();t.after(()=>r.close());const id='D0:fund:0:ask';assert.throws(()=>r.journal.signAuthorization(id,()=>{throw Error('AUTH_INTERRUPTED');}),/AUTH_INTERRUPTED/);assert.throws(()=>r.journal.signAuthorization(id,()=>Buffer.alloc(64)),{code:'AUTH_QUARANTINED'});await assert.rejects(r.signAction('buffer:create'),{code:'UNRESOLVED_OUTCOME'});assert.equal(f.signCalls.length,0);
});
test('changed rent observations are refused before signing deployment or marketplace commitments',async t=>{
 const f=setup(t),r=f.create();t.after(()=>r.close());await r.execute('buffer:create');await r.execute('write:000');await r.prepare('deploy:new');const calls=f.signCalls.length;f.faults.rentDelta=1;await assert.rejects(r.signAction('deploy:new'),{code:'RENT_QUOTE_CHANGED'});assert.equal(f.signCalls.length,calls);assert.equal(f.sent.length,2);
});
test('sponsored consent cannot reach a beneficiary signer without the exact prior disclosure acknowledgement',async t=>{
 const f=setup(t),r=f.create();t.after(()=>r.close());const id='D2:fund:0:consent';assert.throws(()=>r.journal.signAuthorization(id,()=>{throw Error('SHOULD_NOT_SIGN');}),{code:'DISCLOSURE_REQUIRED'});assert.equal(r.journal.authorizationStatus(id),null);const ack={actor:f.manifest.identities.buyerA,packetHash:r.plan.packetHash,unit:r.plan.units[2].address,amount:'9999',assessment:1,disclosure:'Sponsored',accepted:true};r.journal.checkpoint('disclosure:'+id,ack);assert.throws(()=>r.journal.signAuthorization(id,()=>Buffer.alloc(64)),{code:'DISCLOSURE_REQUIRED'});assert.equal(f.signCalls.length,0);
});
test('foreign payer activity stops a new signature rather than treating shared balance as new allowance',async t=>{
 const f=setup(t),r=f.create();t.after(()=>r.close());await r.execute('buffer:create');f.raw.get(f.manifest.identities.payer).lamports+=1;const count=f.signCalls.length;await assert.rejects(r.signAction('write:000'),{code:'PAYER_BALANCE_CHANGED'});assert.equal(f.signCalls.length,count);
});
test('neither deployment order nor the four-write admission bound can be bypassed through the driver',async t=>{
 const f=setup(t,{elfBytes:5000}),r=f.create();t.after(()=>r.close());await assert.rejects(r.prepare('fixture:fund:issuer'),{code:'DEPLOYMENT_ORDER'});await r.execute('buffer:create');for(const id of r.plan.writeIds.slice(0,4))await r.prepare(id);await assert.rejects(r.prepare('write:004'),{code:'WRITE_WAVE_CAP'});await assert.rejects(r.prepare('deploy:new'),{code:'UPLOAD_NOT_COMPLETE'});assert.equal(f.signCalls.filter(s=>s.action?.startsWith('write:')).length,0);
});
test('declining exact sponsored disclosure releases only unsigned grant reservations and never creates a transaction',async t=>{
 const f=setup(t),r=f.create();t.after(()=>r.close());f.faults.declineDisclosure=true;await assert.rejects(r.run(),{code:'SPONSORED_DECLINED'});assert.equal(r.journal.get('D2:fund:0').state,'DeclinedUnsigned');assert.equal(r.journal.get('D2:fund:0').attempt,null);assert.equal(r.journal.authorizationStatus('D2:fund:0:consent'),null);assert.equal(r.journal.summary().sponsorship.consumedGross,'0');assert.equal(r.journal.summary().sponsorship.reservedGross,'0');assert.equal(r.journal.summary().sponsorship.availableGross,'10000');assert.equal(f.sent.some(x=>x.id==='D2:fund:0'),false);const count=f.signCalls.length;await assert.rejects(r.signAction('D2:fund:0'),{code:'ACTION_DECLINED'});assert.equal(f.signCalls.length,count);
});

import {createDevnetResourceProbe} from '../../packages/machine-market/devnet/resources.mjs';
import {mkdirSync,symlinkSync} from 'node:fs';
import {dirname} from 'node:path';
test('resource probe includes the whole task and run files without following outside symlinks',t=>{
 const f=setup(t),root=dirname(f.options.filename),run=join(root,'run');mkdirSync(run);writeFileSync(join(run,'data'),Buffer.alloc(8192));const outside=join(root,'outside-target');writeFileSync(outside,Buffer.alloc(1024*1024));const measure=createDevnetResourceProbe({taskStateRoot:root,runDirectory:run}),before=measure();symlinkSync(outside,join(run,'link'));const after=measure();assert.ok(after.freeBytes>40000000000);assert.ok(after.appBytes>=8192);assert.ok(after.appBytes-before.appBytes<65536);assert.ok(after.totalTaskBytes>=1024*1024);assert.throws(()=>createDevnetResourceProbe({taskStateRoot:run,runDirectory:root}),{code:'RESOURCE_PATH'});
});
test('real execution construction is disabled by allocation alone and does not open the operating key',t=>{
 const f=setup(t),live=structuredClone(f.manifest);live.provenance='reviewed-devnet-run';live.identities.payer=APPROVED_PAYER;assert.throws(()=>createDevnetRunner({...f.options,manifest:live}),{code:'ACTION_TIME_APPROVAL_REQUIRED'});live.authorization.financialRootGo=true;live.authorization.keyPreparationPending=false;live.authorization.rootGoReference='a JSON flag is not a capability';assert.throws(()=>createDevnetRunner({...f.options,manifest:live}),{code:'ACTION_TIME_APPROVAL_REQUIRED'});assert.equal(f.signCalls.length,0);assert.equal(f.sent.length,0);assert.equal(existsSync(f.options.filename),false);
});

import {chmodSync} from 'node:fs';
import {createHash} from 'node:crypto';
test('an unrelated private database is rejected without changing its bytes or schema',t=>{
 const f=setup(t),db=new DatabaseSync(f.options.filename);db.exec("CREATE TABLE legacy_money(amount TEXT);INSERT INTO legacy_money VALUES('preserve');");db.close();chmodSync(f.options.filename,0o600);const before=createHash('sha256').update(readFileSync(f.options.filename)).digest('hex');assert.throws(()=>f.create(),{code:'NOT_THIS_RUN_JOURNAL'});assert.equal(createHash('sha256').update(readFileSync(f.options.filename)).digest('hex'),before);const readonly=new DatabaseSync(f.options.filename,{readOnly:true});assert.deepEqual(readonly.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name),['legacy_money']);readonly.close();assert.equal(f.signCalls.length,0);
});
test('state aliases or incomplete scoped handles cannot receive fixture funding',t=>{
 const f=setup(t),m=structuredClone(f.manifest);m.identities.issuer=f.plan.programData;assert.throws(()=>createDevnetPlan({manifest:m,elf:f.elf,content:f.content,allowFixture:true}),{code:'STATE_ROLE_ALIAS'});f.options.capabilities.handles.delete(f.manifest.identities.issuer);assert.throws(()=>f.create(),{code:'SCOPED_HANDLE_REQUIRED'});assert.equal(existsSync(f.options.filename),false);assert.equal(f.sent.length,0);
});
test('a rejected finalized receipt is archived and quarantined without freeing reservations or signing another action',async t=>{
 const f=setup(t),r=f.create();t.after(()=>r.close());f.faults.corruptReceipt=true;await assert.rejects(r.execute('buffer:create'),{code:'LAMPORT_CONSERVATION'});const op=r.journal.get('buffer:create'),report=r.journal.archive();assert.equal(op.state,'Quarantined');assert.equal(op.actual,null);assert.equal(report.observedReceipts.length,1);assert.equal(report.observedReceipts[0].observation.verified,false);assert.equal(r.journal.summary().totals.rent,op.cost.rent);const count=f.signCalls.length;await assert.rejects(r.prepare('write:000'),{code:'UNRESOLVED_OUTCOME'});assert.equal(f.signCalls.length,count);f.faults.corruptReceipt=false;assert.equal((await r.reconcile('buffer:create')).state,'FinalizedSuccess');assert.equal(r.journal.archive().observedReceipts.length,2);
});
