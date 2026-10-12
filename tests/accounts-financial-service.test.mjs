import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createAccountStore} from '../packages/accounts/store.mjs';
import {createFixtureFinancialRepository} from '../packages/accounts/financial-repository.mjs';
import {createAccountNetworkService} from '../packages/accounts/network-service.mjs';
import {createAccountsAPI} from '../packages/accounts/api.mjs';
import {base58} from '../packages/hosted/wallets.mjs';
import {hash} from '../packages/contracts/index.mjs';
import {DatabaseSync} from 'node:sqlite';
import {createHostedProductWorkspace} from '../packages/product/hosted.mjs';
import {call,setup,users,origin,authFixture,providerFixture,input,accept} from './support/account-network-fixture.mjs';

const wallet=()=>{const k=generateKeyPairSync('ed25519');return {...k,address:base58(Buffer.from(k.publicKey.export({format:'jwk'}).x,'base64url'))};};
export function fakeExternalTransport(calls=[],states=new Map(),faults={}){
 const maybeLose=kind=>{if(faults[kind]){faults[kind]=false;throw Error('fixture_ack_lost');}};
 return async({terms:t})=>{
  let state=states.get(t.channelId);if(!state){state={authorized:'0',receipts:new Map()};states.set(t.channelId,state);}
  const signed=(kind,plan,wire)=>({wireBase64:wire,txSignature:`fixture-${kind}-${t.channelId}`,estimatedFeeAndRentLamports:plan.estimatedFeeAndRentLamports});
  const openReceipt=s=>({status:'finalized',finality:'finalized',txSignature:s.txSignature,protocolChannelId:`protocol-${t.channelId}`,depositBaseUnits:t.depositBaseUnits,evidence:{networkFeeLamports:'5000',newRentLamports:'1000'}});
  const closeReceipt=s=>({status:'finalized',finality:'finalized',txSignature:s.txSignature,settledBaseUnits:state.authorized,publisherDeltaBaseUnits:state.authorized,refundBaseUnits:(BigInt(t.depositBaseUnits)-BigInt(state.authorized)).toString(),feeAndRentLamports:'5000'});
  return {
   async assertPlanFresh(){if(faults.expired)throw Object.assign(Error('unsigned_plan_expired'),{code:'unsigned_plan_expired'});},
   async prepareOpen(){calls.push('prepareOpen');return {unsignedWireBase64:'fixture-unsigned-open',protocolChannelId:`protocol-${t.channelId}`,estimatedFeeAndRentLamports:'6000'};},
   async acceptSignedOpen({plan,wireBase64}){return signed('open',plan,wireBase64);},
   async submitOpen({signed:s}){calls.push('submitOpen');maybeLose('open');return openReceipt(s);},async lookupOpen({signed:s}){calls.push('lookupOpen');return openReceipt(s);},
   async reserveDelivery({charge}){maybeLose('beforeReservation');calls.push('reserve');assert.equal(state.pending,undefined);state.pending={...charge};maybeLose('afterReservation');return {deliveryId:charge.id};},
   async prepareVoucher({channel,intent}){return {messageBase64:Buffer.from(`fixture-voucher:${channel.protocolChannelId}:${intent.cumulativeAmountBaseUnits}`).toString('base64'),voucher:{channelId:channel.protocolChannelId,cumulativeAmount:intent.cumulativeAmountBaseUnits,expiresAt:t.voucherExpiresAt}};},
   async acceptSignedVoucher({prepared,signature}){return {...prepared,signature,signatureType:'ed25519',signer:t.payer,payloadHash:hash(prepared)};},
   async commitVoucher({intent,voucher}){calls.push('commitVoucher');state.authorized=intent.cumulativeAmountBaseUnits;delete state.pending;const r={status:'authorized',deliveryId:intent.charge.id,incrementBaseUnits:intent.charge.amountBaseUnits,cumulativeAmountBaseUnits:intent.cumulativeAmountBaseUnits,payloadHash:voucher.payloadHash};state.receipts.set(intent.charge.id,r);maybeLose('voucher');return r;},
   async lookupCommit({intent}){calls.push('lookupCommit');return state.receipts.get(intent.charge.id)??{status:'unknown'};},
   async resumeVoucherPreparation(input){assert.equal(state.authorized,input.intent.previousAmountBaseUnits);if(state.pending)assert.deepEqual(state.pending,input.intent.charge);const reservation=state.pending?{deliveryId:state.pending.id}:await this.reserveDelivery({charge:input.intent.charge});return {reservation,prepared:await this.prepareVoucher(input)};},
   async recoverVoucher(input){const old=await this.lookupCommit(input);if(old.status==='authorized')return old;await this.resumeVoucherPreparation(input);return this.commitVoucher(input);},
   async prepareClose({finalVoucher,watermark}){calls.push(finalVoucher?'preparePositiveClose':'prepareZeroClose');maybeLose('preparation');assert.equal(watermark.cumulativeAmountBaseUnits,state.authorized);return {unsignedWireBase64:'fixture-unsigned-close',estimatedFeeAndRentLamports:'5000'};},
   async collectCloseSignature({wireBase64,previousWireBase64}){return {wireBase64:previousWireBase64?`${previousWireBase64}+${wireBase64}`:wireBase64,complete:!!previousWireBase64};},
   async acceptSignedClose({plan,wireBase64}){return signed('close',plan,wireBase64);},
   async submitClose({signed:s}){calls.push('submitClose');maybeLose('close');return closeReceipt(s);},async lookupClose({signed:s}){calls.push('lookupClose');return closeReceipt(s);},close(){},
  };
 };
}
async function fixture(t,{broadcastEnabled=true,hosted=false}={}){
 const dir=mkdtempSync(join(tmpdir(),'axp-finance-test-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const store=createAccountStore({dir:join(dir,'accounts')}),repository=createFixtureFinancialRepository({path:join(dir,'financial.sqlite')}),calls=[],states=new Map(),faults={};
 const options={stateDir:join(dir,'network'),catalog:store,apiKey:'fixture-key',transport:providerFixture(),financialMode:'devnet',financialRepository:repository,origin,
  checkpoint:async event=>{if(event==='account_native_authorization_saved'&&faults.rollbackNative){faults.rollbackNative=false;states.clear();throw Error('fixture_hosted_checkpoint_failed');}},
  financialOptions:{broadcastEnabled,preflight:async()=>({compatible:true,programAccountHash:'a'.repeat(64),programDataHash:'b'.repeat(64)}),transportFactory:fakeExternalTransport(calls,states,faults)}};
 let service=hosted?null:createAccountNetworkService(options),clock=Date.now();
 const rows=new Map(),kv={failOnce:false,async get(k){return rows.get(k)??null;},async compareAndSet(k,old,next){if(this.failOnce){this.failOnce=false;return false;}if((rows.get(k)??null)!==old)return false;rows.set(k,next);return true;}};
 const workspace=hosted?createHostedProductWorkspace({kv,stateKey:Buffer.alloc(32,7),id:'account-fixture-checkpoint',kind:'accounts',now:()=>clock,tempRoot:dir}):null;
 // Unlike the ordinary ACK fixture, this native-state stand-in lives only in
 // the hosted scratch SQLite file. A failed checkpoint deletes it for real.
 const diskFactory=async args=>{
  const db=new DatabaseSync(args.statePath);db.exec('CREATE TABLE IF NOT EXISTS fixture_native(body TEXT NOT NULL)');
  const saved=db.prepare('SELECT body FROM fixture_native').get(),localStates=new Map();
  if(saved){const v=JSON.parse(saved.body);localStates.set(args.terms.channelId,{...v,receipts:new Map(v.receipts)});}
  const d=await fakeExternalTransport(calls,localStates)(args),persist=()=>{const s=localStates.get(args.terms.channelId);db.exec('DELETE FROM fixture_native');db.prepare('INSERT INTO fixture_native VALUES(?)').run(JSON.stringify({...s,receipts:[...s.receipts]}));};
  for(const method of ['lookupOpen','submitOpen','reserveDelivery','commitVoucher']){const original=d[method];d[method]=async function(...inputs){const r=await original.apply(d,inputs);persist();if(method==='commitVoucher'&&faults.hostedCheckpoint){faults.hostedCheckpoint=false;kv.failOnce=true;}return r;};}
  d.close=()=>db.close();return d;
 };
 const network={ready:true,withService:fn=>hosted?workspace.withState(async({dir:stateDir,checkpoint})=>{const current=createAccountNetworkService({...options,stateDir,checkpoint,financialOptions:{...options.financialOptions,transportFactory:diskFactory}});try{return await fn(current);}finally{current.close();}}):fn(service)},api=createAccountsAPI({store,provider:authFixture(),origin,network});
 const data=await setup(api);t.after(()=>{service?.close();store.close();repository.close?.();});
 return {api,...data,calls,repository,store,faults,get service(){return service;},restart(){if(hosted){clock+=240001;return;}service.close();service=createAccountNetworkService(options);},async prove(index,purpose,w=wallet()){
   const auth=data.auths[index],org=data.orgs[index],resource=index<2?data.campaigns[index].id:data.apps[index-2].id,base=`/organizations/${org}/${index<2?'campaigns':'apps'}/${resource}/wallet`;
   const c=await call(api,`${base}/challenge`,{...auth,method:'POST',body:{network:'solana-devnet',address:w.address}});assert.equal(c.status,200,JSON.stringify(c.body));
   const signature=base58(sign(null,Buffer.from(c.body.message),w.privateKey)),verified=await call(api,`${base}/verify`,{...auth,method:'POST',body:{challengeId:c.body.challengeId,signature}});assert.equal(verified.status,200,JSON.stringify(verified.body));return {w,challenge:c.body,signature,base,verified:verified.body.wallet};
  },async freeze(index=0,appIndex=0){const r=await call(api,`/organizations/${data.orgs[index]}/campaigns/${data.campaigns[index].id}/funding`,{...data.auths[index],method:'POST',body:{expectedVersion:1,appId:data.apps[appIndex].id,depositBaseUnits:'20000'}});assert.equal(r.status,200,JSON.stringify(r.body));return r.body.channel;},
  async op(index,id,action,body={}){return call(api,`/organizations/${data.orgs[index]}/channels/${id}/${action}`,{...data.auths[index],method:'POST',body});}};
}
test('separate accounts require actual wallet proof; foreign/replayed/stale-purpose proofs cannot rebind',async t=>{
 const f=await fixture(t),p=await f.prove(0,'funding');await f.prove(2,'payout');
 assert.equal(p.verified.address,p.w.address);
 const replay=await call(f.api,`${p.base}/verify`,{...f.auths[0],method:'POST',body:{challengeId:p.challenge.challengeId,signature:p.signature}});assert.equal(replay.status,200);assert.equal(replay.body.wallet.verifiedAt,p.verified.verifiedAt);
 const foreign=await call(f.api,`${p.base}/verify`,{...f.auths[1],method:'POST',body:{challengeId:p.challenge.challengeId,signature:p.signature}});assert.equal(foreign.status,404);
 const bad=await call(f.api,`${p.base}/challenge`,{...f.auths[0],method:'POST',body:{network:'tempo-testnet',address:p.w.address}});assert.equal(bad.status,503);
 const c=await f.freeze();assert.equal(c.payer,p.w.address);assert.equal(c.phase,'frozen');assert.equal(c.signingMode,'own_wallet');assert.equal(f.calls.length,0);
 const listed=await call(f.api,`/organizations/${f.orgs[2]}/apps/${f.apps[0].id}/channels`,{...f.auths[2]});assert.equal(listed.body.channels[0].id,c.id);
 const wrong=await f.op(1,c.id,'open/prepare');assert.equal(wrong.status,404);
 const publisherFunding=await f.op(2,c.id,'open/prepare');assert.equal(publisherFunding.status,404);
});
test('unsigned voucher preparation resumes exact admitted intent before or after reservation interruption',async t=>{
 for(const point of ['beforeReservation','afterReservation']){
  const f=await fixture(t);await f.prove(0,'funding');await f.prove(2,'payout');const c=await f.freeze();
  await f.op(0,c.id,'open/prepare');await f.op(0,c.id,'open/sign',{wireBase64:'fixture-open'});await f.op(0,c.id,'serving',{expectedVersion:1,enabled:true});
  await accept(f.sdks[0],await f.sdks[0].requestAd(input(point)));f.faults[point]=true;
  assert.equal((await f.op(0,c.id,'voucher/prepare')).status,503);const old=(await f.repository.get(`channel:${c.id}`)).value.pendingVoucher;
  assert.equal(old.status,'preparing');f.restart();const resumed=await f.op(0,c.id,'voucher/prepare');assert.equal(resumed.status,200,JSON.stringify(resumed.body));assert.equal(resumed.body.signing.chargeId,old.chargeId);assert.equal(resumed.body.signing.cumulativeAmountBaseUnits,'4000');
  assert.equal(f.calls.filter(v=>v==='reserve').length,1);assert.equal((await f.op(0,c.id,'voucher/sign',{signature:'fixture-saved'})).status,200);assert.equal(f.service.exchange.all('charges').length,1);
 }
});
test('hosted checkpoint rollback restores exact saved voucher, not a new authorization or charge',async t=>{
 const f=await fixture(t);await f.prove(0,'funding');await f.prove(2,'payout');const c=await f.freeze();
 await f.op(0,c.id,'open/prepare');await f.op(0,c.id,'open/sign',{wireBase64:'fixture-open'});await f.op(0,c.id,'serving',{expectedVersion:1,enabled:true});
 for(const turn of ['durable-first','rolled-back-second']){
  await accept(f.sdks[0],await f.sdks[0].requestAd(input(turn)));await f.op(0,c.id,'voucher/prepare');
  if(turn==='rolled-back-second')f.faults.rollbackNative=true;
  assert.equal((await f.op(0,c.id,'voucher/sign',{signature:`exact-saved-${turn}`})).status,turn==='durable-first'?200:503);
 }
 const before=await f.repository.get(`channel:${c.id}`),signature=before.value.pendingVoucher.voucher.signature;
 f.restart();const recovered=await f.op(0,c.id,'reconcile');assert.equal(recovered.status,200,JSON.stringify(recovered.body));assert.equal(recovered.body.channel.authorizedBaseUnits,'8000');
 const after=await f.repository.get(`channel:${c.id}`);assert.equal(after.value.vouchers.at(-1).voucher.signature,signature);assert.equal(after.value.vouchers.length,2);assert.equal(f.service.exchange.all('charges').length,2);
 assert.equal((await f.op(0,c.id,'close/prepare')).status,200);
});
test('actual hosted scratch deletion and failed KV checkpoint recover saved signed voucher on next invocation',async t=>{
 const f=await fixture(t,{hosted:true});await f.prove(0,'funding');await f.prove(2,'payout');const c=await f.freeze();
 await f.op(0,c.id,'open/prepare');await f.op(0,c.id,'open/sign',{wireBase64:'fixture-open'});await f.op(0,c.id,'serving',{expectedVersion:1,enabled:true});
 for(const turn of ['hosted-durable','hosted-rollback']){
  const award=await f.sdks[0].requestAd(input(turn));await accept(f.sdks[0],award);await f.op(0,c.id,'voucher/prepare');
  if(turn==='hosted-rollback')f.faults.hostedCheckpoint=true;
  assert.equal((await f.op(0,c.id,'voucher/sign',{signature:`saved-${turn}`})).status,turn==='hosted-rollback'?503:200);
 }
 const saved=await f.repository.get(`channel:${c.id}`);assert.equal(saved.value.pendingVoucher.voucher.signature,'saved-hosted-rollback');
 f.restart();const r=await f.op(0,c.id,'reconcile');assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.channel.authorizedBaseUnits,'8000');
 const report=await call(f.api,`/organizations/${f.orgs[0]}/campaigns/${f.campaigns[0].id}/report`,{...f.auths[0]});assert.equal(report.status,200,JSON.stringify(report.body));assert.equal(report.body.summary.acceptedBaseUnits,'8000');
 assert.equal((await f.op(0,c.id,'close/prepare')).status,200);
});
test('failed unsigned preparation retries and expired partial close refreshes without replacing a signed submission',async t=>{
 const f=await fixture(t);await f.prove(0,'funding');await f.prove(2,'payout');const c=await f.freeze();
 await f.op(0,c.id,'open/prepare');await f.op(0,c.id,'open/sign',{wireBase64:'fixture-open'});
 f.faults.preparation=true;assert.equal((await f.op(0,c.id,'close/prepare')).status,503);f.restart();assert.equal((await f.op(0,c.id,'close/prepare')).status,200);
 await f.op(0,c.id,'close/sign',{wireBase64:'old-partial'});f.faults.expired=true;
 assert.equal((await f.op(2,c.id,'close/sign',{wireBase64:'expired-second'})).status,503);
 let record=await f.repository.get(`channel:${c.id}`);assert.equal(record.value.close.signed,undefined);assert.equal(record.value.phase,'draining');
 assert.equal((await f.op(0,c.id,'close/prepare')).status,200);record=await f.repository.get(`channel:${c.id}`);assert.equal(record.value.close.history.length,1);assert.equal(record.value.close.history[0].partialWire,'old-partial');assert.equal(record.value.close.partialWire,undefined);
 f.faults.expired=false;await f.op(0,c.id,'close/sign',{wireBase64:'fresh-payer'});assert.equal((await f.op(2,c.id,'close/sign',{wireBase64:'fresh-payee'})).status,200);
 assert.equal((await f.op(0,c.id,'close/prepare')).status,409);assert.equal(f.calls.filter(v=>v==='submitClose').length,1);
});
test('two independently bound advertisers compete; accepted native-mode fixture charges drive cumulative vouchers and fixed payouts',async t=>{
 const f=await fixture(t);for(let i=0;i<4;i++)await f.prove(i,i<2?'funding':'payout');
 const a=await f.freeze(0,0),b=await f.freeze(1,0);
 for(const c of [a,b]){const owner=c.id===a.id?0:1;assert.equal((await f.op(owner,c.id,'open/prepare')).status,200);const signed=await f.op(owner,c.id,'open/sign',{wireBase64:'fixture-signature'});assert.equal(signed.status,200,JSON.stringify(signed.body));assert.equal(signed.body.channel.phase,'funded');assert.equal(signed.body.channel.servingEnabled,false);assert.equal((await f.op(owner,c.id,'serving',{expectedVersion:1,enabled:true})).status,200);}
 const turns=[];
 for(const turn of ['one','two']){const o=await f.sdks[0].requestAd(input(turn));assert.equal(o.status,'awarded',JSON.stringify(o));turns.push(o);const delivered=await accept(f.sdks[0],o);assert.equal(delivered.financialMode,'devnet');assert.equal(delivered.charge.amountBaseUnits,'4000');assert.equal((await accept(f.sdks[0],o)).replayed,true);
  const p=await f.op(0,a.id,'voucher/prepare');assert.equal(p.status,200,JSON.stringify(p.body));assert.equal(p.body.signing.cumulativeAmountBaseUnits,turn==='one'?'4000':'8000');const signed=await f.op(0,a.id,'voucher/sign',{signature:'fixture-native-voucher'});assert.equal(signed.status,200,JSON.stringify(signed.body));}
 assert.equal(f.service.exchange.all('charges').length,2);assert.equal(f.service.exchange.all('charges').filter(c=>c.channelId===b.id).length,0);
 f.restart();const prior=await f.sdks[0].requestAd(input('one'));assert.equal(prior.replayed,true);assert.equal(f.service.exchange.all('charges').length,2);
 const noFunds=await f.sdks[1].requestAd(input('unfunded-app'));assert.equal(noFunds.status,'no_fill');
 for(const [id,owner,paid] of [[a.id,0,'8000'],[b.id,1,'0']]){
  const p=await f.op(owner,id,'close/prepare');assert.equal(p.status,200,JSON.stringify(p.body));
  const partial=await f.op(owner,id,'close/sign',{wireBase64:'payer-partial'});assert.equal(partial.status,200);assert.equal(partial.body.channel.phase,'draining');
  const closed=await f.op(2,id,'close/sign',{wireBase64:'payee-partial'});assert.equal(closed.status,200,JSON.stringify(closed.body));assert.equal(closed.body.channel.phase,'finalized');assert.equal(closed.body.channel.paidBaseUnits,paid);assert.equal(closed.body.channel.refundBaseUnits,(20000n-BigInt(paid)).toString());
  assert.equal((await f.op(owner,id,'open/sign',{wireBase64:'duplicate'})).status,409);
 }
 assert.equal(f.calls.filter(c=>c==='submitOpen').length,2);assert.equal(f.calls.filter(c=>c==='submitClose').length,2);assert.equal(f.calls.filter(c=>c==='commitVoucher').length,2);assert.ok(f.calls.includes('prepareZeroClose'));
 const foreign=await f.op(3,a.id,'reconcile');assert.equal(foreign.status,404);
});
test('native broadcast is explicitly gated and profile payout is not wallet authority',async t=>{
 const f=await fixture(t,{broadcastEnabled:false});await f.prove(0,'funding');
 const config=await f.service.config(f.apps[0]);assert.equal(config.servingEnabled,false);assert.equal(config.payments.ready,false);assert.equal(config.reason,'app_funding_not_ready');
 const missing=await call(f.api,`/organizations/${f.orgs[0]}/campaigns/${f.campaigns[0].id}/funding`,{...f.auths[0],method:'POST',body:{expectedVersion:1,appId:f.apps[0].id,depositBaseUnits:'20000'}});assert.equal(missing.status,409);
 await f.prove(2,'payout');const c=await f.freeze();await f.op(0,c.id,'open/prepare');const r=await f.op(0,c.id,'open/sign',{wireBase64:'fixture-signature'});assert.equal(r.status,503);assert.equal(r.body.error,'account_payment_broadcast_disabled');assert.ok(!f.calls.includes('submitOpen'));
});
test('lost open, authorization and close acknowledgements reconcile saved attempts after restart without another purchase',async t=>{
 const f=await fixture(t);await f.prove(0,'funding');await f.prove(2,'payout');const c=await f.freeze();
 await f.op(0,c.id,'open/prepare');f.faults.open=true;assert.equal((await f.op(0,c.id,'open/sign',{wireBase64:'fixture-signed-open'})).status,503);
 f.restart();assert.equal((await f.op(0,c.id,'open/sign',{wireBase64:'replacement'})).status,409);
 let r=await f.op(0,c.id,'reconcile');assert.equal(r.body.channel.phase,'funded');await f.op(0,c.id,'serving',{expectedVersion:1,enabled:true});
 const o=await f.sdks[0].requestAd(input('lost-ack'));await accept(f.sdks[0],o);
 await f.op(0,c.id,'voucher/prepare');f.faults.voucher=true;assert.equal((await f.op(0,c.id,'voucher/sign',{signature:'fixture-voucher'})).status,503);
 f.restart();assert.equal((await f.op(0,c.id,'voucher/sign',{signature:'replacement'})).status,409);
 r=await f.op(0,c.id,'reconcile');assert.equal(r.body.channel.authorizedBaseUnits,'4000');
 await f.op(0,c.id,'close/prepare');await f.op(0,c.id,'close/sign',{wireBase64:'payer-partial'});f.faults.close=true;assert.equal((await f.op(2,c.id,'close/sign',{wireBase64:'payee-partial'})).status,503);
 f.restart();r=await f.op(2,c.id,'reconcile');assert.equal(r.body.channel.phase,'finalized');const cost=r.body.channel.feeAndRentLamports;
 assert.equal((await f.op(0,c.id,'reconcile')).body.channel.feeAndRentLamports,cost);
 assert.equal(f.calls.filter(v=>v==='submitOpen').length,1);assert.equal(f.calls.filter(v=>v==='commitVoucher').length,1);assert.equal(f.calls.filter(v=>v==='submitClose').length,1);
});
test('native campaign cap spans two app channels; profile edits never redirect existing terms',async t=>{
 const f=await fixture(t);await f.prove(0,'funding');await f.prove(2,'payout');await f.prove(3,'payout');
 const channels=[await f.freeze(0,0),await f.freeze(0,1)];
 for(const c of channels){await f.op(0,c.id,'open/prepare');await f.op(0,c.id,'open/sign',{wireBase64:'fixture-signed'});await f.op(0,c.id,'serving',{expectedVersion:1,enabled:true});}
 const first=await f.sdks[0].requestAd(input('cap-app-a')),second=await f.sdks[1].requestAd(input('cap-app-b'));assert.equal(first.status,'awarded');assert.equal(second.status,'awarded');
 await accept(f.sdks[0],first);await accept(f.sdks[1],second);assert.equal((await f.sdks[1].requestAd(input('over-cap'))).status,'no_fill');
 const oldPayee=channels[0].payee;await f.prove(2,'payout');
 const listed=await call(f.api,`/organizations/${f.orgs[2]}/apps/${f.apps[0].id}/channels`,{...f.auths[2]});assert.equal(listed.body.channels[0].payee,oldPayee);
 assert.equal(f.service.exchange.all('charges').reduce((n,c)=>n+BigInt(c.amountBaseUnits),0n),8000n);
 const raw=await f.repository.get(`channel:${channels[0].id}`);assert.equal(raw.value.terms.payee,oldPayee);
});
