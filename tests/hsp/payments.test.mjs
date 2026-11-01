import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createProductService,PRESETS} from '../../packages/product/service.mjs';
import {createHspPayments} from '../../packages/hsp/service.mjs';
import {HspStore} from '../../packages/hsp/store.mjs';
import {fixtureConfig,fixtureModels,fixtureHsp} from '../../packages/hsp/fixtures.mjs';
import {schemaFingerprint,TOOLS} from '../../packages/hsp/config.mjs';
import {budgetProvider} from '../../packages/hsp/provider-budget.mjs';
import {connectHsp} from '../../packages/hsp/mcp.mjs';
const sig=`0x${'ab'.repeat(65)}`;
function fixture(t,options={}){
 const dir=mkdtempSync(join(tmpdir(),'axp-hsp-test-'));let clock=1800000000000,payments;const now=()=>clock;
 const config={...fixtureConfig,...options.config},transport=fixtureHsp(now);
 const service=createProductService({stateDir:dir,runId:'hsp-fixture',financialMode:'testnet',now,...fixtureModels,directOptions:{...config,ready:true,blocked:()=>payments?.blocked()??false}});
 service.saveAccount({name:'AXP fixture',websiteURL:'https://axp.example/'});
 const {id,label,exampleQuestion,...draft}=PRESETS[0];const c=service.saveCampaign({...draft,depositBaseUnits:'0',maxBidBaseUnits:'1000000',budgetCapBaseUnits:'3000000'}).campaign;service.approve(c.id);service.launch(c.id);
 const deps={exchange:service.exchange,config,transport,now,expiredAuthorizationUnused:async()=>true,verifySignature:async()=>true,balance:async()=> '9000000',verifyTransfer:async t=>({verified:true,fixture:true,logIndex:0,recipientRaw:t.principalRaw}),registry:{prepare:async()=>({chainId:177,sourceChainId:133}),verify:async()=>({verified:true,chainId:177,sourceChainId:133})},...options};
 let store=new HspStore(join(dir,'hsp.sqlite'));payments=createHspPayments({...deps,store});
 const f={service,transport,config,get payments(){return payments;},get store(){return store;},advance:ms=>clock+=ms,restart(){payments.close();store=new HspStore(join(dir,'hsp.sqlite'));payments=createHspPayments({...deps,store});},async ad(turn='one'){return service.opportunity({question:exampleQuestion,sessionId:`session-${turn}`,turnId:turn});},async accepted(turn='one'){const a=await f.ad(turn);assert.equal(a.status,'awarded');const body={creativeHash:a.award.creativeHash,domInserted:true,sponsoredLabelPresent:true};const r=await service.render(a.award.id,body,a.deliveryToken);return {a,r,id:r.charge.id};},async signed(id){const q=await payments.prepare(id);return payments.finalize(id,{quoteId:q.quote.id,signature:sig,signingApproved:true});},async submitted(id){const row=await f.signed(id);return payments.submit(id,{quoteId:row.quote.id,mandateId:row.mandateId,submissionApproved:true});}};
 t.after(()=>{payments.close();service.close();rmSync(dir,{recursive:true,force:true});});return f;
}
test('direct acceptance retains unpaid obligation, has no fake collateral, and deduplicates receipts',async t=>{
 const f=fixture(t),{a,r,id}=await f.accepted();const replay=await f.service.render(a.award.id,{creativeHash:a.award.creativeHash,domInserted:true,sponsoredLabelPresent:true},a.deliveryToken);
 assert.equal(replay.receiptHash,r.receiptHash);assert.equal(r.receipt.mode,'testnet');assert.equal(r.charge.amountBaseUnits,'1000000');assert.equal(f.service.exchange.all('charges').length,1);assert.equal(f.transport.calls.length,0);
 const c=f.service.state().campaigns[0];assert.equal(c.paymentModel,'direct');assert.equal(c.unpaidBaseUnits,'1000000');assert.equal(c.depositBaseUnits,'0');assert.equal(f.payments.lookup(id).stage,'accepted-unpaid');
 assert.throws(()=>f.service.campaignAction(c.id,'settle'),{code:'direct_payment_requires_charge'});
});
test('one payment survives restart, submission ambiguity and recovery without another send',async t=>{
 const f=fixture(t),{id}=await f.accepted();const original=f.transport.invoke;let send=0;f.transport.invoke=async(name,input)=>{if(name==='submit_payment'){send++;throw Error('response lost');}return original(name,input);};
 await assert.rejects(f.submitted(id));assert.equal(f.payments.blocked(),true);f.restart();await assert.rejects(f.ad('two'),{code:'payment_reconciliation_required'});
 const row=await f.payments.reconcile(id);assert.equal(row.stage,'finalized');assert.equal(send,1);assert.equal(f.service.state().campaigns[0].unpaidBaseUnits,'0');assert.equal(f.service.state().campaigns[0].settledBaseUnits,'1000000');
 await assert.rejects(f.payments.submit(id,{quoteId:row.quote.id,mandateId:row.mandateId,submissionApproved:true}),{code:'hsp_reconciliation_required'});assert.equal(send,1);
});
test('explicit approvals bind the saved quote and mandate; signatures are private',async t=>{
 const f=fixture(t),{id}=await f.accepted(),q=await f.payments.prepare(id);
 await assert.rejects(f.payments.finalize(id,{quoteId:q.quote.id,signature:sig,signingApproved:false}),{code:'hsp_signing_approval_required'});
 const signed=await f.payments.finalize(id,{quoteId:q.quote.id,signature:sig,signingApproved:true});assert.equal(signed.stage,'authorization-signed');assert.equal('signature' in signed,false);assert.equal('mandate' in signed,false);assert.equal('eip712' in signed.quote,false);
 await assert.rejects(f.payments.submit(id,{quoteId:q.quote.id,mandateId:'wrong',submissionApproved:true}),{code:'hsp_submission_approval_required'});
 await f.payments.submit(id,{quoteId:q.quote.id,mandateId:signed.mandateId,submissionApproved:true});assert.equal(f.transport.calls.filter(n=>n==='submit_payment').length,1);
});
test('concurrent preparation creates exactly one order and retains exact IDs',async t=>{const f=fixture(t),{id}=await f.accepted();const [a,b]=await Promise.all([f.payments.prepare(id),f.payments.prepare(id)]);assert.equal(a.flowId,b.flowId);assert.equal(f.transport.calls.filter(n=>n==='create_order').length,1);});
test('ambiguous order creation is never automatically repeated',async t=>{const f=fixture(t),{id}=await f.accepted();f.transport.invoke=async()=>{throw Error('timeout');};await assert.rejects(f.payments.prepare(id));f.restart();await assert.rejects(f.payments.prepare(id),{code:'hsp_reconciliation_required'});await assert.rejects(f.payments.reconcile(id),{code:'hsp_order_unknown'});});
for(const [name,mutate] of [
 ['payer',q=>q.payer=`0x${'44'.repeat(20)}`],['recipient',q=>q.pay_to=`0x${'44'.repeat(20)}`],['chain',q=>q.chainId=177],['token',q=>q.token=`0x${'44'.repeat(20)}`],['price',q=>q.merchantAmountUsd='2.000000'],['typed amount',q=>q.eip712.message.value='1'],['authorization expiry',q=>q.eip712.message.validBefore='9999999999'],['typed recipient',q=>q.eip712.message.to=`0x${'44'.repeat(20)}`],['expired quote',q=>q.quote_expires_at='2000-01-01T00:00:00Z'],['fee cap',q=>{q.token_total_raw='9000000';q.feeRaw='8000000';q.eip712.message.value=q.token_total_raw;}]
])test(`rejects changed ${name} before signing`,async t=>{const f=fixture(t),{id}=await f.accepted(),original=f.transport.invoke;f.transport.invoke=async(n,args)=>{const v=await original(n,args);if(n==='prepare_payment')mutate(v);return v;};await assert.rejects(f.payments.prepare(id));assert.equal(f.transport.calls.includes('finalize_payment'),false);});
test('invalid signature and insufficient balance block finalization',async t=>{const f=fixture(t,{verifySignature:async()=>false}),{id}=await f.accepted();await assert.rejects(f.signed(id),{code:'hsp_signature_invalid'});assert.equal(f.payments.lookup(id).stage,'quote-ready');});
test('safe is not finalized, failed payments remain owed, and query pacing is enforced',async t=>{const f=fixture(t),{id}=await f.accepted();await f.submitted(id);f.transport.setStatus('payment-safe');assert.equal((await f.payments.reconcile(id)).stage,'safe');assert.equal(f.service.state().campaigns[0].unpaidBaseUnits,'1000000');await assert.rejects(f.payments.anchorPrepare(id));await assert.rejects(f.payments.reconcile(id),{code:'hsp_poll_too_soon'});f.advance(15000);f.transport.setStatus('payment-failed');assert.equal((await f.payments.reconcile(id)).stage,'failed');assert.equal(f.service.state().campaigns[0].unpaidBaseUnits,'1000000');});
test('unknown statuses and failed attribution retain reconciliation requirement',async t=>{const f=fixture(t),{id}=await f.accepted();await f.submitted(id);f.transport.setStatus('invented-success');await assert.rejects(f.payments.reconcile(id),{code:'hsp_unknown_status'});assert.equal(f.payments.blocked(),true);});
test('three payments consume the cap; paid amounts never replenish campaign budgets',async t=>{const f=fixture(t);for(let i=0;i<3;i++){const {id}=await f.accepted(String(i));await f.submitted(id);await f.payments.reconcile(id);await f.payments.anchorPrepare(id);await f.payments.anchorReconcile(id,{transactionHash:`0x${'ab'.repeat(32)}`});}assert.equal(f.payments.list().length,3);assert.equal((await f.ad('four')).status,'no_fill');assert.equal(f.service.state().campaigns[0].remainingBaseUnits,'0');});
test('tool discovery is complete and cannot contact HSP before allowlisting',async()=>{assert.throws(()=>schemaFingerprint([]),{code:'hsp_tool_missing'});assert.equal(schemaFingerprint(TOOLS.map(name=>({name,inputSchema:{type:'object'}}))).length,64);await assert.rejects(connectHsp(),{code:'hsp_allowlisting_required'});});
test('unknown provider usage retains reserve and blocks total/attempt expansion',async()=>{const store=new HspStore(':memory:');try{const fn=budgetProvider({store,kind:'answer',reservationMicroUsd:'600000',provider:async()=>{throw Error('timeout');}});await assert.rejects(fn({}));assert.equal(store.meta('provider-admissions')[0].status,'unknown-usage');await assert.rejects(fn({}),{code:'hsp_provider_reconciliation_required'});}finally{store.close();}});

test('insufficient exact-token balance never reaches signing',async t=>{const f=fixture(t,{balance:async()=> '0'}),{id}=await f.accepted();await assert.rejects(f.payments.prepare(id),{code:'hsp_insufficient_balance'});assert.equal(f.transport.calls.includes('finalize_payment'),false);});
test('failed team attribution cannot settle a charge',async t=>{const f=fixture(t),{id}=await f.accepted();await f.submitted(id);const original=f.transport.invoke;f.transport.invoke=async(n,args)=>{const q=await original(n,args);if(n==='query_payment')q.attribution_verified=false;return q;};await assert.rejects(f.payments.reconcile(id),{code:'hsp_finality_evidence_missing'});assert.equal(f.service.state().campaigns[0].unpaidBaseUnits,'1000000');assert.equal(f.payments.blocked(),true);});
test('an RPC mismatch cannot settle or anchor a finalized Gateway claim',async t=>{const f=fixture(t,{verifyTransfer:async()=>({verified:false})}),{id}=await f.accepted();await f.submitted(id);await assert.rejects(f.payments.reconcile(id),{code:'hsp_transfer_unverified'});await assert.rejects(f.payments.anchorPrepare(id));assert.equal(f.service.state().campaigns[0].unpaidBaseUnits,'1000000');});

test('expired signed quote can refresh only the same never-submitted order with on-chain expiry proof',async t=>{const f=fixture(t),{id}=await f.accepted(),old=await f.signed(id);f.advance(301000);const q=await f.payments.reprepare(id,{quoteId:old.quote.id,refreshApproved:true});assert.equal(q.flowId,old.flowId);assert.notEqual(q.quote.id,old.quote.id);assert.equal('history' in q,false);assert.equal(f.transport.calls.filter(n=>n==='create_order').length,1);await assert.rejects(f.payments.finalize(id,{quoteId:old.quote.id,signature:sig,signingApproved:true}),{code:'hsp_signing_approval_required'});});
test('refresh refuses without finalized on-chain expiry/unused-authorization proof',async t=>{const f=fixture(t,{expiredAuthorizationUnused:async()=>false}),{id}=await f.accepted(),old=await f.signed(id);f.advance(301000);await assert.rejects(f.payments.reprepare(id,{quoteId:old.quote.id,refreshApproved:true}),{code:'hsp_authorization_not_expired_on_chain'});assert.equal(f.payments.lookup(id).stage,'authorization-signed');});
