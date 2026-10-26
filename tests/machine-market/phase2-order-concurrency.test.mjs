import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {setImmediate} from 'node:timers/promises';
import {setup,hex} from './native-trading-fixtures.test.mjs';
import {createNativeService} from '../../packages/machine-market/native/service.mjs';
function fixture(t){
 const f=setup(t,{mode:'native',disk:true});
 // Inject only the registered-Series fixture marker; no on-chain evidence claimed.
 const db=new DatabaseSync(f.filename);db.prepare('INSERT INTO native_registered VALUES(?,?,?)').run(f.series,'Series','1');db.close();let reads=0,signs=0;
 const rpc={async accounts(keys){reads++;await setImmediate();return {contextSlot:'2',accounts:keys.map(address=>({address,owner:'11111111111111111111111111111111',executable:false,data:Buffer.alloc(0),lamports:f.store.captureWallet(address).balance}))};},async rentForLength(){return '1000';},async slot(){return '2';}};
 const service=createNativeService({run:f.run,rpc,store:f.store,signers:new Map([[f.run.matcher,()=>{signs++;throw Error('NO_SIGNING_EXPECTED');}]]),operatorToken:'ephemeral-test-operator-capability-00000000'});
 return {...f,service,get reads(){return reads;},get signs(){return signs;}};
}
test('fresh concurrent identical signed orders with different HTTP keys share one admission and reservation',async t=>{
 const f=fixture(t),env=f.order('buyerA',{limit:'100'},'first');
 const [a,b]=await Promise.all([f.service.orders(env),f.service.orders({...env,idempotencyKey:'alias'})]);
 assert.equal(a.orderId,b.orderId);assert.equal(a.sequence,b.sequence);assert.equal(a.state,'Open');assert.equal(b.state,'Open');assert.equal(f.store.captureWallet(f.run.buyerA).held,'100');assert.equal(f.store.projectActor(f.run.buyerA).orders.length,1);assert.equal(f.reads,1);assert.equal(f.signs,0);
 assert.equal((await f.service.orders({...env,idempotencyKey:'third'})).orderId,a.orderId);assert.equal(f.store.captureWallet(f.run.buyerA).held,'100');
});
test('in-flight same nonce with changed signed price is rejected and cannot join the original request',async t=>{
 const f=fixture(t),env=f.order('buyerA',{limit:'100',nonce:hex(120)},'first'),changed=f.order('buyerA',{limit:'101',nonce:hex(120)},'changed');
 const result=await Promise.allSettled([f.service.orders(env),f.service.orders(changed)]);assert.equal(result[0].status,'fulfilled');assert.equal(result[1].reason.code,'NONCE_CONFLICT');assert.equal(f.store.captureWallet(f.run.buyerA).held,'100');assert.equal(f.store.projectActor(f.run.buyerA).orders.length,1);
});
test('duplicate coalescing still verifies each signature and binds HTTP keys against conflicting signed bodies',async t=>{
 const f=fixture(t),env=f.order('buyerA',{limit:'100'},'first'),bad=Buffer.from(env.signature,'base64');bad[0]^=1;
 const results=await Promise.allSettled([f.service.orders(env),f.service.orders({...env,signature:bad.toString('base64'),idempotencyKey:'forged'})]);assert.equal(results[0].status,'fulfilled');assert.equal(results[1].reason.code,'INVALID_AUTH');
 const conflict=f.order('buyerA',{limit:'200'},'first');await assert.rejects(f.service.orders(conflict),{code:'NONCE_CONFLICT'});assert.equal(f.store.captureWallet(f.run.buyerA).held,'100');assert.equal(f.store.projectActor(f.run.buyerA).orders.length,1);assert.equal(f.signs,0);
});
test('different signed orders retain wallet-version rejection and cannot over-reserve shared balance',async t=>{
 const f=fixture(t),a=f.order('buyerA',{limit:'600000'},'a'),b=f.order('buyerA',{limit:'600000'},'b'),results=await Promise.allSettled([f.service.orders(a),f.service.orders(b)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'STALE_CURSOR');assert.equal(f.store.captureWallet(f.run.buyerA).held,'600000');assert.equal(f.store.projectActor(f.run.buyerA).orders.length,1);
});

test('partial HTTP recovery preserves original failure/hold and resumes checkpointed cancellation without replaying completed requests',async t=>{
 const {mkdtempSync,rmSync}=await import('node:fs'),{tmpdir}=await import('node:os'),{join}=await import('node:path');
 const {openAcceptanceJournal}=await import('../../scripts/machine-market/phase2-acceptance-journal.mjs'),{recoverHttpReservations}=await import('../../scripts/machine-market/phase2-http-reservation-recovery.mjs'),{hash,stableIdentity}=await import('../../scripts/machine-market/phase2-acceptance-schedule.mjs'),{decodeAuthorization,ZERO_KEY}=await import('../../packages/machine-market/native/codec.mjs');
 const f=fixture(t),config={run:f.run,runId:'repair-fixture'},parent=mkdtempSync(join(tmpdir(),'axp-http-recovery-'));t.after(()=>rmSync(parent,{recursive:true,force:true}));
 const envelope=(caseId,stepId,actor,value)=>f.envelope(Object.entries(f.keys).find(([,v])=>v.key===actor)[0],{...value,nonce:stableIdentity(config.runId,caseId,stepId)},stableIdentity(config.runId,caseId,stepId));
 const bid=(name,amount,{tif=0}={})=>envelope('http-reservations',name,f.run.buyerA,{kind:'BookOrder',side:0,lane:0,series:f.series,refundFace:'0',exactUnit:ZERO_KEY,expectedCursor:'0',limit:amount,validUntilSlot:'900',minRemainingAfter:0,tif,quantity:1});
 const carried=bid('same-nonce','10000');await f.service.orders(carried);const id=decodeAuthorization(Buffer.from(carried.authorization,'base64')).orderId,path=join(parent,'journal.json'),identity={runId:config.runId};let journal=openAcceptanceJournal({path,privateRoot:parent,identity});journal.prepare('concrete:http-reservations',{kind:'http-concurrency-and-wallet-capture'});journal.stop('CASE_NEEDS_REVIEW');const before=journal.get('concrete:http-reservations'),originalJournalSha256=hash(journal.snapshot()),recovery={schema:'axp.market.http-reservation.recovery.v1',originalStepId:'concrete:http-reservations',originalJournalSha256,carriedOrderId:id,carriedOrderVersion:1,carriedHoldLamports:'10000'};journal.clearStopForExactRecovery();let paused=false,requests=0;
 const runtime={envelope,async http(route,env,{expected=[200,202]}={}){requests++;let value,status=200;try{value=await f.service[route==='/orders'?'orders':'cancel'](env);}catch(e){status=e.status;value={code:e.code};}assert.ok(expected.includes(status));return {value,evidence:{kind:'injected-http-fixture',status,requestHash:hash(env),responseHash:hash(value)}};},async step(id,intent,perform){if(journal.get(id)?.state==='Complete')return journal.get(id).result;journal.prepare(id,intent);const result=await perform();journal.complete(id,result);if(id==='recovery:http-carried-duplicate'&&!paused){paused=true;throw Error('SIMULATED_PAUSE');}return result;}};
 const context={store:f.store,rpc:{slot:async()=>'2'}};await assert.rejects(recoverHttpReservations({config,context,journal,runtime,recovery,bid}),/SIMULATED_PAUSE/);assert.equal(f.store.captureWallet(f.run.buyerA).held,'10000');assert.deepEqual(journal.get('concrete:http-reservations'),before);assert.deepEqual(journal.snapshot().stopHistory,[{code:'CASE_NEEDS_REVIEW',operationIds:[]}]);journal.close();journal=openAcceptanceJournal({path,privateRoot:parent,identity,resume:true});const result=await recoverHttpReservations({config,context,journal,runtime,recovery,bid});assert.equal(result.finalHeldLamports,'0');assert.equal(f.store.captureWallet(f.run.buyerA).held,'0');assert.equal(f.store.getOrder(id).state,'Cancelled');assert.deepEqual(journal.get('concrete:http-reservations'),before);const doneRequests=requests;await recoverHttpReservations({config,context,journal,runtime,recovery,bid});assert.equal(requests,doneRequests);assert.equal(f.signs,0);journal.close();
});
