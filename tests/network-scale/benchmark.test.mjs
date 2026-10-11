// Offline injected models/native fixtures. Never network or achievement evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {RunJournal} from '../../packages/network-scale/budget.mjs';
import {createBenchmarkCoordinator} from '../../packages/network-scale/coordinator.mjs';
import {createProductService} from '../../packages/product/service.mjs';
import {createProductDecisions} from '../../packages/product/decisions.mjs';
import {Exchange} from '../../packages/exchange/index.mjs';
import {BENCHMARK_PROFILE,PROFILE_HASH} from '../../packages/network-scale/profile.mjs';
import {jevResponse} from '../ml/fixtures.mjs';
const temporary=t=>{const path=mkdtempSync(join(tmpdir(),'axp-scale-offline-'));t.after(()=>rmSync(path,{force:true,recursive:true}));return path;};
test('approved profile cannot be enabled by JSON/browser values and production caps stay bounded',t=>{
  const exchange=new Exchange();t.after(()=>exchange.close());
  assert.throws(()=>createProductDecisions({exchange,dailyCap:512,benchmarkProfile:{...BENCHMARK_PROFILE}}),e=>e.code==='model_cap_invalid');
  const decisions=createProductDecisions({exchange,dailyCap:512,benchmarkProfile:BENCHMARK_PROFILE});assert.equal(decisions.status().dailyCap,512);assert.equal(PROFILE_HASH.length,64);
});
test('global provider budget is durable; unknown attempt never reissues and another coordinator is rejected',async t=>{
  const path=join(temporary(t),'coordinator.sqlite'),options={path,runId:'offline-run',execution:'offline-fixture'};let journal=new RunJournal(options),calls=0;
  assert.throws(()=>new RunJournal(options),e=>e.code==='benchmark_coordinator_already_running');
  const row=journal.reserve('deepseek',{fresh:'one'},1000,1600);assert.equal(journal.providerTotals('deepseek').reservedNanos,2220000);
  journal.close();journal=new RunJournal(options);t.after(()=>journal.close());
  assert.equal(journal.restartedPending,1);assert.equal(journal.get('meta','run').haltReason,'provider_attempt_uncertain_after_restart');
  const wrapped=journal.wrap('deepseek',async()=>{calls++;return {usage:{inputTokens:100,outputTokens:10}};});
  await assert.rejects(wrapped({fresh:'one'}),e=>e.code==='benchmark_halted');assert.equal(calls,0);assert.equal(journal.get('attempt',row.id).status,'pending');
});
test('combined conservative spend bound, exact known usage release, and global native charge replay',async t=>{
  const journal=new RunJournal({path:join(temporary(t),'coordinator.sqlite'),runId:'offline-money',execution:'offline-fixture'});t.after(()=>journal.close());
  const row=journal.reserve('deepseek',{fresh:'one'},1000,1600);journal.finish(row,{usage:{inputTokens:100,outputTokens:40}},null);assert.equal(journal.providerTotals('deepseek').reservedNanos,78000);
  const unknown=journal.reserve('jev',{fresh:'two'},1000,65536);journal.finish(unknown,null,{code:'fixture_failure'});assert.equal(journal.providerTotals('jev').reservedNanos,42000);
  assert.throws(()=>journal.reserve('deepseek',{fresh:'oversized'},10000000,1600),e=>e.code==='provider_global_budget_cap');
  journal.reserveCharge('stable-award','2000');journal.reserveCharge('stable-award','2000');assert.equal(journal.all('charge').length,1);
  assert.throws(()=>journal.reserveCharge('stable-award','1000'),e=>e.code==='charge_admission_conflict');
  for(let i=0;i<128;i++)journal.reserveNative(`channel-${i}`);assert.equal(journal.all('native').length,128);
  assert.throws(()=>journal.reserveNative('extra-channel'),e=>e.code==='native_global_cap');
  journal.reserveNativeFee('channel-0','330000000');assert.throws(()=>journal.reserveNativeFee('channel-1','20000000'),e=>e.code==='native_global_fee_cap');
});
test('global Jev limiter enforces32 in flight and32 starts per rolling second',async t=>{
  const journal=new RunJournal({path:join(temporary(t),'coordinator.sqlite'),runId:'offline-rate',execution:'offline-fixture'});t.after(()=>journal.close());
  let inflight=0,peak=0;const starts=[];
  const transport=journal.wrap('jev',async()=>{starts.push(Date.now());inflight++;peak=Math.max(peak,inflight);await new Promise(resolve=>setTimeout(resolve,20));inflight--;return {usage:{input_tokens:10,output_tokens:1}};});
  await Promise.all(Array.from({length:34},(_,index)=>transport({index})));
  assert.ok(peak<=32);for(const time of starts)assert.ok(starts.filter(t=>t>=time&&t<time+1000).length<=32);assert.equal(journal.providerTotals('jev').attempts,34);
});
test('stop deadline prohibits new paid admissions while native finish reservations remain usable',t=>{
  let time=1000;const journal=new RunJournal({path:join(temporary(t),'coordinator.sqlite'),runId:'offline-deadline',execution:'offline-fixture',now:()=>time});t.after(()=>journal.close());
  journal.reserveNative('already-open');journal.update({stopAt:new Date(2000).toISOString()});time=2001;
  assert.throws(()=>journal.reserve('jev',{fresh:true},100,65536),e=>e.code==='benchmark_stop_deadline');
  journal.reserveNativeFee('already-open','11000000');assert.equal(journal.get('native','already-open').feeReserveLamports,'11000000');
});
test('injected fixture factories cannot label a benchmark as actual network execution',()=>{
  assert.throws(()=>createBenchmarkCoordinator({stateDir:'/not-created',jevFactory:()=>async()=>({})}),e=>e.code==='benchmark_fixture_mode_required');
});
function fixture(t,{holdOrganicWorker=null}={}){
  const stateDir=temporary(t),services=new Map(),commits=new Map(),calls={jev:0,organic:0,open:0,close:0,voucher:0};let coordinator;
  const factory=async({terms})=>{
    const service=services.get(terms.runId),protocolChannelId=`offline-fixture:${terms.channelId}`,
      wire=kind=>({wireBase64:Buffer.from(`offline-${kind}`).toString('base64'),txSignature:`offline-signature-${kind}-${terms.channelId}`,blockhash:'offline-blockhash',lastValidBlockHeight:'12345',estimatedFeeAndRentLamports:'1000'}),
      openReceipt=input=>({status:'finalized',finality:'finalized',txSignature:input.signed.txSignature,protocolChannelId,depositBaseUnits:terms.depositBaseUnits,evidence:{slot:1,blockTime:123,networkFeeLamports:'500',newRentLamports:'100',reclaimedRentLamports:'0',tokenDeltas:{payer:`-${terms.depositBaseUnits}`,publisher:'0',treasury:'0'}}}),
      closeReceipt=input=>{const amount=service.paymentWorker.store.get(terms.channelId).watermark.cumulativeAmountBaseUnits,refund=(BigInt(terms.depositBaseUnits)-BigInt(amount)).toString();return {status:'finalized',finality:'finalized',txSignature:input.signed.txSignature,settledBaseUnits:amount,refundBaseUnits:refund,publisherDeltaBaseUnits:amount,feeAndRentLamports:'1000',evidence:{slot:2,blockTime:124,networkFeeLamports:'500',newRentLamports:'0',reclaimedRentLamports:'100',tokenDeltas:{payer:refund,publisher:amount,treasury:'0'}}};};
    return {evidenceLabel:'synthetic_transport_fake',prepareOpen:async()=>({protocolChannelId,estimatedFeeAndRentLamports:'1000'}),
      signOpen:async()=>{calls.open++;return wire('open');},submitOpen:async input=>openReceipt(input),lookupOpen:async input=>openReceipt(input),
      reserveDelivery:async({charge})=>({deliveryId:charge.id,amountBaseUnits:charge.amountBaseUnits}),
      prepareVoucher:async({intent})=>{calls.voucher++;return {signature:`offline-voucher-${intent.sequence}`,signatureType:'ed25519',signer:terms.payer,voucher:{channelId:protocolChannelId,cumulativeAmount:intent.cumulativeAmountBaseUnits,expiresAt:terms.voucherExpiresAt}};},
      commitVoucher:async input=>{const value={status:'authorized',deliveryId:input.intent.charge.id,incrementBaseUnits:input.intent.charge.amountBaseUnits,cumulativeAmountBaseUnits:input.intent.cumulativeAmountBaseUnits,payloadHash:input.intent.payloadHash};commits.set(input.intent.charge.id,value);return value;},lookupCommit:async input=>commits.get(input.intent.charge.id)??{status:'absent'},
      prepareClose:async()=>({protocolChannelId,estimatedFeeAndRentLamports:'1000'}),signClose:async()=>{calls.close++;return wire('close');},submitClose:async input=>closeReceipt(input),lookupClose:async input=>closeReceipt(input)};
  };
  const options={stateDir,runId:'offline-scale',sourceCommit:'offline-test-source',execution:'offline-fixture',signingEnabled:true,
    serviceFactory:options=>{const service=createProductService(options);services.set(options.runId,service);return service;},
    jevFactory:()=>async(packet,options)=>{assert.equal(options.signal,undefined,'provider deadline begins after trusted limiter');calls.jev++;return jevResponse(packet,3,3);},organicFactory:worker=>async()=>{calls.organic++;if(holdOrganicWorker&&worker===holdOrganicWorker.worker)await holdOrganicWorker.promise;return {answer:'Independent offline fixture answer.',model:'fixture',usage:{inputTokens:100,outputTokens:20},elapsedMs:1};},
    paymentOptions:{identities:{payer:'offline-payer',payee:'offline-payee'},lock:false,minimumDiskBytes:0,preflight:async()=>({compatible:true,simulation:{err:null},programAccountHash:'a'.repeat(64),programDataHash:'b'.repeat(64),balances:{payerBaseUnits:'20000000',payerLamports:'5000000000'}}),transportFactory:factory}};
  coordinator=createBenchmarkCoordinator(options);t.after(()=>coordinator.close());return {get coordinator(){return coordinator;},calls,restart(){coordinator.close();coordinator=createBenchmarkCoordinator(options);return coordinator;}};
}
test('offline actual product path opens16, observes receipt input, deduplicates replay, and drains unrendered award',async t=>{
  const f=fixture(t),c=f.coordinator;try{await c.open(16);}catch(e){assert.fail(JSON.stringify(c.journal.events().filter(e=>e.type==='native_open')));}assert.equal(f.calls.open,16);assert.equal(c.workers[0].service.engine().execution,'fixture');
  assert.throws(()=>c.verifyStage(16),e=>e.code==='benchmark_stage_not_verified');
  const first=c.allocate(),result=await c.turn(first.id);assert.equal(result.opportunityError,null);assert.equal(result.opportunity.status,'awarded');assert.equal(result.answer.advertiserMaterialIncluded,false);assert.equal(f.calls.jev,8);
  const observation={creativeHash:result.opportunity.award.creativeHash,domInserted:true,sponsoredLabelPresent:true};
  await c.render(first.id,observation);const before={...f.calls};const replayed=await c.render(first.id,observation);assert.equal(replayed.replayed,true);assert.deepEqual(f.calls,before);assert.equal(c.journal.all('charge').length,1);
  const second=c.allocate();await c.turn(second.id);await c.drain();assert.equal(c.workers.flatMap(w=>w.service.exchange.all('awards')).filter(a=>a.status==='reserved').length,0);
  const settled=await c.settle();assert.equal(settled.status,'partial');assert.equal(f.calls.close,16);
  const report=c.export();assert.equal(report.execution,'offline-fixture');assert.equal(report.status,'partial');assert.equal(report.measured.fundedAdvertisers,16);assert.equal(report.measured.acceptedDeliveries,1);assert.equal(report.accounting.depositBaseUnits,'800000');assert.equal(report.accounting.settledBaseUnits,'2000');assert.equal(report.accounting.refundBaseUnits,'798000');assert.equal(report.specimen.receipt.observedAt.length,24);
  const serialized=JSON.stringify(report);for(const key of ['deliveryToken','wireBase64','publisher-api-key','Authorization','secret','privateKey','rawOutput'])assert.ok(!serialized.includes(key),key);
  const counts={...f.calls};await c.replay();assert.deepEqual(f.calls,counts);f.restart();assert.equal(f.coordinator.export().measured.acceptedDeliveries,1);
});
test('concurrent turn completion does not mistake another live pending provider admission for uncertainty',async t=>{
  let release;const promise=new Promise(resolve=>{release=resolve;}),f=fixture(t,{holdOrganicWorker:{worker:1,promise}}),c=f.coordinator;await c.open(16);
  const first=c.allocate(),second=c.allocate(),slow=c.turn(second.id),fast=await c.turn(first.id);
  assert.ok(fast.answer);assert.equal(c.journal.providerTotals('deepseek').pendingAttempts,1);assert.equal(c.journal.providerTotals('deepseek').terminalUnknownAttempts,0);assert.equal(c.journal.get('meta','run').haltReason,undefined);
  release();assert.ok((await slow).answer);assert.equal(c.journal.providerTotals('deepseek').pendingAttempts,0);assert.equal(c.journal.get('meta','run').haltReason,undefined);
  await c.settle();assert.equal(c.export().status,'partial');
});
