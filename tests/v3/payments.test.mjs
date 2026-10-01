// Synthetic transport signers only. No RPC, wallets, funding or broadcast.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createV3Payments,projectV3NetworkState,paymentEvidenceV3} from '../../packages/v3/payments.mjs';
import {CAMPAIGNS,exchangeCampaign} from '../../packages/v3/config.mjs';
import {V3_NETWORK} from '../../packages/payments/v3-feasibility.mjs';
import {SQLitePaymentStore} from '../../packages/payments/store.mjs';
import {hashNetworkRecord} from '../../packages/payments/network-adapter.mjs';

const RUN='v3-wallet-acceptance',T0=2000000000,IDS=CAMPAIGNS.slice(0,2).map(c=>c.channelId);
const campaigns=()=>CAMPAIGNS.map(exchangeCampaign);
function harness(t,{signingEnabled=true}={}) {
  const root=mkdtempSync(join(tmpdir(),'axp-v3-payment-fixture-')),dir=join(root,'acceptance'),charges=[],calls=[],commits=new Map(),controls={};
  let reserved={},clock=T0,coordinator;
  const report={schemaVersion:'fake:feasibility',network:{...V3_NETWORK},observedAt:'synthetic fixture clock',status:'checked',
    compatible:true,signed:false,broadcast:false,funded:false,zeroCloseCompatibility:'passed_unsigned_simulation',balancesSufficient:true,
    programAccountHash:'fake:program',programDataHash:'fake:deployment',openReserveLamports:'1000',closeReserveLamports:'1000',
    balances:{payerBaseUnits:'40000',payerLamports:'20000000'}};
  const getLedgerCharge=id=>structuredClone(charges.find(c=>c.id===id));
  const getLedgerObligations=id=>({reservedBaseUnits:reserved[id]??'0',acceptedBaseUnits:charges.filter(c=>c.channelId===id).reduce((s,c)=>s+BigInt(c.amountBaseUnits),0n).toString(),charges:charges.filter(c=>c.channelId===id).map(get=>structuredClone(get))});
  const mark=(id,name)=>calls.push([id,name]);
  const transportFactory=async({terms,statePath})=>{
    assert.equal(statePath,join(dir,'native.sqlite'));const id=terms.channelId;
    const wire=kind=>({wireBase64:Buffer.from('FAKE_PRIVATE_WIRE').toString('base64'),txSignature:`fake:${id}:${kind}`,blockhash:'fake:block',lastValidBlockHeight:'999',estimatedFeeAndRentLamports:controls[`${id}:${kind}Fee`]??'1000'});
    const receipt=(input,kind)=>kind==='open'?{status:'finalized',finality:'finalized',txSignature:input.signed.txSignature,protocolChannelId:input.plan.protocolChannelId,depositBaseUnits:'20000',privateVoucherBytes:'MUST_NOT_EXPORT'}:
      {status:'finalized',finality:'finalized',txSignature:input.signed.txSignature,settledBaseUnits:input.plan.watermark.cumulativeAmountBaseUnits,
        publisherDeltaBaseUnits:input.plan.watermark.cumulativeAmountBaseUnits,refundBaseUnits:(20000n-BigInt(input.plan.watermark.cumulativeAmountBaseUnits)).toString(),feeAndRentLamports:'1000',privateVoucherBytes:'MUST_NOT_EXPORT'};
    return {
      evidenceLabel:'synthetic_transport_fake',
      async assertPlanFresh(){mark(id,'assertPlanFresh');if(controls.expired===id){const e=Error('unsigned_plan_expired');e.code='unsigned_plan_expired';throw e;}},
      async prepareOpen(input){mark(id,'prepareOpen');assert.equal(input.openSalt,terms.openSalt);return {protocolChannelId:`fake:native:${id}`,estimatedFeeAndRentLamports:controls[`${id}:openFee`]??'1000'};},
      async signOpen(){mark(id,'signOpen');return wire('open');},
      async submitOpen(input){mark(id,'submitOpen');if(controls.loseOpen===id)throw Error('fake lost ack');return receipt(input,'open');},
      async lookupOpen(input){mark(id,'lookupOpen');return receipt(input,'open');},
      async reserveDelivery({charge}){mark(id,'reserveDelivery');return {deliveryId:charge.id,amountBaseUnits:charge.amountBaseUnits};},
      async prepareVoucher({channel,intent}){mark(id,'prepareVoucher');return {signature:`FAKE_PRIVATE_VOUCHER:${intent.sequence}`,signatureType:'ed25519',signer:terms.payer,voucher:{channelId:channel.protocolChannelId,cumulativeAmount:intent.cumulativeAmountBaseUnits,expiresAt:terms.voucherExpiresAt}};},
      async commitVoucher(input){mark(id,'commitVoucher');const r={status:'authorized',deliveryId:input.intent.charge.id,incrementBaseUnits:input.intent.charge.amountBaseUnits,cumulativeAmountBaseUnits:input.intent.cumulativeAmountBaseUnits,payloadHash:input.intent.payloadHash};commits.set(r.deliveryId,r);if(controls.loseCommit===id)throw Error('fake lost ack');return r;},
      async lookupCommit(input){mark(id,'lookupCommit');return commits.get(input.intent.charge.id)??{status:'unknown'};},
      async prepareClose(input){mark(id,'prepareClose');if(input.watermark.cumulativeAmountBaseUnits==='0'){assert.equal(Object.hasOwn(input,'finalVoucher'),false);assert.equal(input.watermark.finalVoucherHash,null);}else assert.equal(input.finalVoucher.voucher.cumulativeAmount,input.watermark.cumulativeAmountBaseUnits);return {...input,estimatedFeeAndRentLamports:controls[`${id}:closeFee`]??'1000'};},
      async signClose(){mark(id,'signClose');return wire('close');},
      async submitClose(input){mark(id,'submitClose');if(controls.loseClose===id)throw Error('fake lost ack');return receipt(input,'close');},
      async lookupClose(input){mark(id,'lookupClose');return receipt(input,'close');},
    };
  };
  const options={stateDir:dir,runId:RUN,getLedgerCharge,getLedgerObligations,preflight:async options=>{calls.push(['preflight',options.simulate]);return structuredClone(report);},transportFactory,now:()=>clock,signingEnabled,feasibilityPath:join(root,'feasibility.json')};
  coordinator=createV3Payments(options);
  t.after(()=>{coordinator.dispose();rmSync(root,{recursive:true,force:true});});
  return {dir,report,controls,calls,charges,options,get p(){return coordinator;},count:(name,id)=>calls.filter(([channel,method])=>method===name&&(!id||channel===id)).length,
    setReserved:(id,n)=>{reserved[id]=n;},setClock:n=>{clock=n;},
    restart(overrides={}){coordinator.dispose();coordinator=createV3Payments({...options,...overrides});},
    add(id,n,channel=IDS[0],sequence){const campaign=CAMPAIGNS.find(c=>c.channelId===channel);charges.push({id,channelId:channel,runId:RUN,
      campaignVersionId:campaign.campaignVersionId,advertiserId:campaign.advertiserId,sequence:sequence??String(charges.filter(c=>c.channelId===channel).length+1),amountBaseUnits:n,
      awardId:`fake:award:${id}`,deliveryId:`fake:render:${id}`,acceptedReceiptHash:`fake:receipt:${id}`,acceptedAt:T0,status:'accepted'});},
    freeze:()=>coordinator.freeze({campaigns:campaigns()}),
    async openBoth(){assert.equal((await this.freeze()).status,'frozen');for(const id of IDS)assert.equal((await coordinator.open(id)).status,'finalized');},
  };
}

test('two competing channels freeze unique salts, same payer/payee and exact shared paths; idempotent restart',async t=>{
  const h=harness(t);await h.openBoth();const before=JSON.parse(readFileSync(join(h.dir,'terms.json')));
  assert.equal(new Set(before.channels.map(t=>t.openSalt)).size,2);assert.equal(new Set(before.channels.map(t=>t.payer)).size,1);
  assert.equal(new Set(before.channels.map(t=>t.payee)).size,1);h.restart();assert.equal((await h.freeze()).status,'already_frozen');
  assert.deepEqual(JSON.parse(readFileSync(join(h.dir,'terms.json'))),before);await h.p.open(IDS[0]);assert.equal(h.count('signOpen'),2);assert.equal(h.count('submitOpen'),2);
});

test('positive cumulative channel and zero-charge loser close without zero voucher; public projections',async t=>{
  const h=harness(t);await h.openBoth();h.add('first','3000');h.add('second','3000');
  const authorized=await h.p.authorize(IDS[0]);assert.deepEqual(authorized.authorizations.map(i=>i.cumulativeAmountBaseUnits),['3000','6000']);
  assert.equal((await h.p.close(IDS[0])).settledBaseUnits,'6000');const zero=await h.p.close(IDS[1]);
  assert.equal(zero.status,'finalized');assert.equal(zero.settledBaseUnits,'0');assert.equal(zero.refundBaseUnits,'20000');
  assert.equal(h.count('prepareVoucher',IDS[1]),0);assert.equal(h.count('reserveDelivery',IDS[1]),0);assert.equal(h.count('prepareVoucher'),2);
  const store=new SQLitePaymentStore(join(h.dir,'payments.sqlite'),{readOnly:true});
  try {
    assert.deepEqual(h.p.status().channels[0],projectV3NetworkState(store,IDS[0]));
    const publicData=JSON.stringify([h.p.status(),paymentEvidenceV3(store),zero]);
    for(const secret of ['FAKE_PRIVATE','MUST_NOT_EXPORT','wireBase64','finalVoucher','privateVoucherBytes','signatureType'])assert.equal(publicData.includes(secret),false);
  }finally{store.close();}
  h.restart();assert.equal((await h.p.close(IDS[1])).status,'finalized');assert.equal((await h.p.authorize(IDS[0])).status,'authorized');assert.equal(h.count('signClose'),2);
});

test('three paid charges on one channel are bounded, in injected exact sequence, campaign version immutable',async t=>{
  const h=harness(t);await h.openBoth();for(let i=1;i<=3;i++)h.add(`c${i}`,'2000');
  assert.equal((await h.p.authorize(IDS[0])).authorizations.at(-1).cumulativeAmountBaseUnits,'6000');
  h.charges[0].campaignVersionId='changed';assert.equal((await h.p.authorize(IDS[0])).reasonCode,'charge_terms_mismatch');assert.equal(h.count('prepareVoucher'),3);
});

test('lost zero-close/open/commit acknowledgements recover exact identities with lookup only',async t=>{
  const h=harness(t);await h.freeze();h.controls.loseOpen=IDS[0];assert.equal((await h.p.open(IDS[0])).status,'unknown');
  assert.equal((await h.p.open(IDS[1])).status,'blocked');assert.equal(h.count('signOpen',IDS[1]),0);
  h.restart();assert.equal((await h.p.reconcile(IDS[0],'open')).status,'finalized');
  // The second guard stopped before signing, retaining its prepared identity.
  assert.equal((await h.p.open(IDS[1])).status,'finalized');
  h.add('c1','100');h.controls.loseCommit=IDS[0];
  assert.equal((await h.p.authorize(IDS[0])).status,'unknown');assert.equal(h.count('prepareVoucher'),1);
  assert.equal((await h.p.reconcile(IDS[0],{chargeId:'c1'})).status,'authorized');
});

test('commit restart and zero-close restart lookup, without new signers or charge',async t=>{
  const h=harness(t);await h.openBoth();h.add('c1','100');h.controls.loseCommit=IDS[0];
  assert.equal((await h.p.authorize(IDS[0])).status,'unknown');
  assert.equal(h.p.status().channels[0].phase,'draining');h.restart();
  assert.equal((await h.p.reconcile(IDS[0],{chargeId:'c1'})).status,'authorized');assert.equal(h.count('prepareVoucher'),1);
  h.controls.loseClose=IDS[1];assert.equal((await h.p.close(IDS[1])).status,'unknown');h.setClock(T0+8000);h.restart();
  assert.equal((await h.p.reconcile(IDS[1],'close')).refundBaseUnits,'20000');assert.equal(h.count('signClose',IDS[1]),1);assert.equal(h.count('submitClose',IDS[1]),1);
});

test('default signing disabled; freeze saves salts/terms without ageing unsigned transactions',async t=>{
  const h=harness(t,{signingEnabled:false});assert.equal((await h.freeze()).status,'frozen');
  assert.equal((await h.p.open(IDS[0])).reasonCode,'signing_disabled');assert.equal(h.p.status().channels.length,0);assert.equal(h.count('prepareOpen'),0);assert.equal(h.count('signOpen'),0);
});

test('fresh balance/deployment failure prevents funding; unknown channel and changed campaign rejected',async t=>{
  const h=harness(t);await h.freeze();h.report.balances.payerBaseUnits='39999';assert.equal((await h.p.open(IDS[0])).status,'blocked');assert.equal(h.count('signOpen'),0);
  assert.equal(h.p.status().channels[0].openStatus,'prepared');h.report.balances.payerBaseUnits='40000';assert.equal((await h.p.open(IDS[0])).status,'finalized');
  assert.equal((await h.p.open('v3-leatherguard-channel')).reasonCode,'channel_not_allowed');
  const changed=campaigns();changed[0].maxBidBaseUnits='4001';assert.equal((await h.p.freeze({campaigns:changed})).reasonCode,'campaign_cap_exceeded');
});

test('combined channel fee/rent checked before open, voucher and close signing',async t=>{
  const h=harness(t);h.controls[`${IDS[0]}:openFee`]='12000000';h.controls[`${IDS[1]}:openFee`]='9000000';
  await h.freeze();assert.equal(h.count('prepareOpen'),0);assert.equal((await h.p.open(IDS[0])).status,'finalized');assert.equal((await h.p.open(IDS[1])).reasonCode,'aggregate_fee_cap_exceeded');assert.equal(h.count('signOpen',IDS[1]),0);
});

test('all accepted charges, not just candidate channel, enforce 12000 aggregate and 3 deliveries',async t=>{
  const h=harness(t);await h.openBoth();h.add('a','4000');h.add('b','4000');h.add('c','4000',IDS[1]);
  assert.equal((await h.p.authorize(IDS[0])).status,'authorized');h.add('d','1',IDS[1]);
  assert.equal((await h.p.authorize(IDS[1])).reasonCode,'aggregate_charge_cap_exceeded');assert.equal(h.count('prepareVoucher',IDS[1]),0);
});

test('close with reservation or accepted-but-unauthorized charge never signs; malformed sequence is not sorted/fixed',async t=>{
  const h=harness(t);await h.openBoth();h.setReserved(IDS[1],'1');assert.equal((await h.p.close(IDS[1])).reasonCode,'close_not_drained');
  assert.equal(h.count('signClose'),0);h.add('a','100',IDS[0],'2');
  assert.equal((await h.p.authorize(IDS[0])).reasonCode,'charge_sequence_mismatch');assert.equal(h.count('prepareVoucher'),0);
});

test('feasibility failure freezes nothing and never uses a signer; terms tampering rejected',async t=>{
  const h=harness(t);h.report.compatible=false;assert.equal((await h.freeze()).reasonCode,'native_feasibility_required');
  assert.equal(h.p.status().status,'unfrozen');assert.equal(h.count('prepareOpen'),0);
  h.report.compatible=true;await h.freeze();await h.p.open(IDS[0]);
  const store=new SQLitePaymentStore(join(h.dir,'payments.sqlite'));try{store.update(IDS[0],s=>({...s,termsHash:hashNetworkRecord({changed:true})}));}finally{store.close();}
  h.restart();assert.equal((await h.p.open(IDS[0])).reasonCode,'terms_mismatch');assert.equal(h.count('signOpen'),1); // only the earlier fixture opening, no additional signing
});
test('expired unsigned plan is rejected before wallet signing and never silently replaced',async t=>{
 const h=harness(t);await h.freeze();assert.equal(h.count('prepareOpen'),0);h.controls.expired=IDS[0];const r=await h.p.open(IDS[0]);assert.equal(r.reasonCode,'unsigned_plan_expired');assert.equal(h.count('signOpen'),0);assert.equal(h.p.status().channels[0].openStatus,'prepared');await h.p.open(IDS[0]);assert.equal(h.count('prepareOpen'),1);assert.equal(h.count('signOpen'),0);
});

test('onboarding-approved versions/copy/soft hints/lower ceilings freeze exactly; subsequent edits conflict',async t=>{
  const h=harness(t),changed=campaigns();
  changed[0].campaignVersionId='v3-clearvault-approved-2';changed[0].maxBidBaseUnits='3000';changed[0].budgetCapBaseUnits='7000';
  changed[0].declaredConstraints.push('recovery_guidance');changed[0].softFitTags=['experienced_users'];
  changed[0].creatives[0].creativeVersionId='operator-approved-copy-2';changed[0].creatives[0].approvedText='An operator-approved fictional hardware wallet for Ethereum and Solana.';
  assert.equal((await h.p.freeze({campaigns:changed})).status,'frozen');
  const frozen=JSON.parse(readFileSync(join(h.dir,'terms.json')));assert.deepEqual(frozen.campaigns,changed.slice(0,2));
  assert.equal(frozen.channels[0].campaignVersionId,changed[0].campaignVersionId);assert.equal(frozen.channels[0].chargeCapBaseUnits,'7000');
  h.restart();assert.equal((await h.p.freeze({campaigns:changed})).status,'already_frozen');
  const modified=structuredClone(changed);modified[0].creatives[0].approvedText+=' Changed after freeze.';
  assert.equal((await h.p.freeze({campaigns:modified})).reasonCode,'campaign_terms_mismatch');
  assert.equal((await h.p.open(IDS[0])).status,'finalized');h.add('a','3001');h.charges[0].campaignVersionId=changed[0].campaignVersionId;
  assert.equal((await h.p.authorize(IDS[0])).status,'blocked');assert.equal(h.count('prepareVoucher'),0);
});

test('funded identity/declaration/schema/caps cannot be changed under a new version',async t=>{
  const h=harness(t);
  for(const modify of [c=>{c.advertiserId='different';},c=>{c.declaredConstraints=c.declaredConstraints.filter(cap=>cap!=='solana');},c=>{c.budgetCapBaseUnits='8001';},c=>{c.contextHints='not an Exchange DTO';}]) {
    const invalid=campaigns();modify(invalid[0]);assert.equal((await h.p.freeze({campaigns:invalid})).status,'blocked');
  }
  assert.equal(h.count('prepareOpen'),0);
});

test('aggregate guard runs before voucher signer and close signer, including other channel plans',async t=>{
  const h=harness(t);await h.openBoth();h.add('a','100');
  const store=new SQLitePaymentStore(join(h.dir,'payments.sqlite'));
  try{store.update(IDS[1],s=>{s.open.signed.estimatedFeeAndRentLamports='19999000';return s;});}finally{store.close();}
  assert.equal((await h.p.authorize(IDS[0])).reasonCode,'aggregate_fee_cap_exceeded');assert.equal(h.count('prepareVoucher'),0);
  assert.equal((await h.p.close(IDS[0])).reasonCode,'close_not_drained');assert.equal(h.count('signClose'),0);
});

test('aggregate close estimate combines both channels before transaction signing',async t=>{
  const h=harness(t);await h.openBoth();h.controls[`${IDS[1]}:closeFee`]='19998000';
  assert.equal((await h.p.close(IDS[1])).reasonCode,'aggregate_fee_cap_exceeded');assert.equal(h.count('signClose'),0);
});
