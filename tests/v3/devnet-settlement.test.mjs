// Offline: recorded-receipt loading, Devnet terms, treasury retargeting and
// evidence sanitizing. Synthetic fake transport only; no RPC, keys or SDK.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {NetworkPaymentAdapter,hashNetworkTerms} from '../../packages/payments/network-adapter.mjs';
import {createMemoryPaymentStore} from '../../packages/payments/store.mjs';
import {NETWORK_ENVIRONMENTS,retargetDistributeTreasury} from '../../packages/payments/sdk-transport.mjs';
import {loadRecordedCharges,obligationsFor,chargeById,buildDevnetTerms,assertPublicEvidence,publicTransaction,
  DEVNET_CHANNEL_IDS,SOURCE_RUN_ID,explorerTx,explorerAddress} from '../../packages/v3/devnet-settlement.mjs';

const RUN=resolve('artifacts/v3/replay/run.json');
const HASH='a'.repeat(64),NOW=2_000_000_000;
const source=loadRecordedCharges(RUN);
const terms=id=>buildDevnetTerms({channelId:id,source,payer:'fake:payer',payee:'fake:payee',openSalt:'12345',now:NOW,
  programAccountHash:HASH,programDataHash:HASH,compatibilityHash:HASH});
function tampered(mutate) {
  const dir=mkdtempSync(join(tmpdir(),'axp-devnet-')),path=join(dir,'run.json'),run=JSON.parse(readFileSync(RUN,'utf8'));
  mutate(run);writeFileSync(path,JSON.stringify(run));
  try{return ()=>loadRecordedCharges(path);}finally{setTimeout(()=>rmSync(dir,{recursive:true,force:true}),0);}
}

test('recorded run yields exactly the three accepted, publisher-signed charges', () => {
  assert.equal(source.sourceRunId,SOURCE_RUN_ID);
  assert.deepEqual(obligationsFor(source,'v3-clearvault-channel').charges.map(c=>[c.sequence,c.amountBaseUnits]),[['1','4000'],['2','3000']]);
  assert.deepEqual(obligationsFor(source,'v3-keyforge-channel').charges.map(c=>[c.sequence,c.amountBaseUnits]),[['1','3000']]);
  assert.equal(obligationsFor(source,'v3-clearvault-channel').acceptedBaseUnits,'7000');
  for(const id of DEVNET_CHANNEL_IDS)for(const c of obligationsFor(source,id).charges) {
    assert.equal(c.publisherReceiptSignatureVerified,true);assert.match(c.acceptedReceiptHash,/^[a-f0-9]{64}$/);
    assert.equal(c.mode,undefined,'original sandbox settlement label is not projected');
    assert.deepEqual(chargeById(source,c.id),c);
  }
  assert.equal(chargeById(source,'charge-unknown'),undefined);
});

test('tampered receipts, amounts or extra charges fail closed', () => {
  assert.throws(tampered(r=>{r.receipts[0].signature=Buffer.alloc(64).toString('base64');}),/receipt_signature_invalid/);
  assert.throws(tampered(r=>{r.receipts[1].receipt.nonce='forged';}),/receipt_hash_mismatch/);
  assert.throws(tampered(r=>{r.state.exchange.charges[0].amountBaseUnits='3500';}),/recorded_charges_changed/);
  assert.throws(tampered(r=>{r.state.exchange.awards[0].creativeHash='0'.repeat(64);}),/receipt_award_mismatch/);
  assert.throws(tampered(r=>{r.runId='other-run';}),/source_run_mismatch/);
});

test('devnet terms bind the recorded run, devnet network and existing caps', () => {
  const t=terms('v3-clearvault-channel');
  assert.equal(t.mode,'devnet');assert.equal(t.network,'solana-devnet');assert.equal(t.rpc,'https://api.devnet.solana.com');
  assert.equal(t.runId,SOURCE_RUN_ID);assert.equal(t.settlementRunId,'v3-devnet-settlement');
  assert.equal(t.mint,'4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');assert.equal(t.depositBaseUnits,'20000');
  assert.equal(t.chargeCapBaseUnits,'8000');assert.equal(t.zeroChargeClose,false);assert.equal(t.voucherExpiresAt,NOW+7200);
  assert.throws(()=>buildDevnetTerms({...{channelId:'v3-leatherguard-channel'},source,payer:'a',payee:'b',openSalt:'1',now:NOW,programAccountHash:HASH,programDataHash:HASH,compatibilityHash:HASH}),/channel_not_allowed/);
  assert.throws(()=>buildDevnetTerms({channelId:'v3-keyforge-channel',source,payer:'a',payee:'a',openSalt:'1',now:NOW,programAccountHash:HASH,programDataHash:HASH,compatibilityHash:HASH}),/identity_invalid/);
});

test('adapter settles recorded charges cumulatively (fake transport): 4000->7000 and 3000', async () => {
  for(const [id,expected] of [['v3-clearvault-channel',['4000','7000']],['v3-keyforge-channel',['3000']]]) {
    const t=terms(id),store=createMemoryPaymentStore(),vouchers=[];
    const transport={evidenceLabel:'synthetic_transport_fake',
      prepareOpen:async()=>({protocolChannelId:'fake:native',estimatedFeeAndRentLamports:'1000'}),
      signOpen:async()=>({wireBase64:Buffer.from('o').toString('base64'),txSignature:'fake-open',blockhash:'b',lastValidBlockHeight:'9',estimatedFeeAndRentLamports:'1000'}),
      submitOpen:async i=>({status:'finalized',finality:'finalized',txSignature:i.signed.txSignature,protocolChannelId:'fake:native',depositBaseUnits:'20000'}),
      lookupOpen:async()=>({status:'unknown'}),
      reserveDelivery:async({charge})=>({deliveryId:charge.id,amountBaseUnits:charge.amountBaseUnits}),
      prepareVoucher:async({intent})=>{vouchers.push(intent.cumulativeAmountBaseUnits);return {signature:`fake-${intent.sequence}`,signatureType:'ed25519',signer:t.payer,voucher:{channelId:'fake:native',cumulativeAmount:intent.cumulativeAmountBaseUnits,expiresAt:t.voucherExpiresAt}};},
      commitVoucher:async i=>({status:'authorized',deliveryId:i.reservation.deliveryId,incrementBaseUnits:i.intent.charge.amountBaseUnits,cumulativeAmountBaseUnits:i.intent.cumulativeAmountBaseUnits,payloadHash:i.intent.payloadHash}),
      lookupCommit:async()=>({status:'absent'}),
      prepareClose:async({watermark,finalVoucher})=>{assert.equal(finalVoucher.voucher.cumulativeAmount,watermark.cumulativeAmountBaseUnits);return {estimatedFeeAndRentLamports:'1000'};},
      signClose:async()=>({wireBase64:Buffer.from('c').toString('base64'),txSignature:'fake-close',blockhash:'b',lastValidBlockHeight:'9',estimatedFeeAndRentLamports:'1000'}),
      submitClose:async i=>{const total=store.get(id).watermark.cumulativeAmountBaseUnits;return {status:'finalized',finality:'finalized',txSignature:i.signed.txSignature,settledBaseUnits:total,refundBaseUnits:(20000n-BigInt(total)).toString(),publisherDeltaBaseUnits:total,feeAndRentLamports:'1000'};},
      lookupClose:async()=>({status:'unknown'})};
    const adapter=new NetworkPaymentAdapter({store,protocolTransport:transport,getLedgerCharge:x=>chargeById(source,x),
      getLedgerObligations:x=>obligationsFor(source,x),approvalTermsHash:hashNetworkTerms(t),now:()=>NOW});
    await adapter.prepareOpen(t);assert.equal((await adapter.confirmOpen({channelId:id,planId:store.get(id).open.id})).status,'finalized');
    for(const c of obligationsFor(source,id).charges)assert.equal((await adapter.authorizeCumulative({channelId:id,chargeId:c.id})).status,'authorized');
    assert.deepEqual(vouchers,expected);
    await adapter.beginDrain({channelId:id});const plan=await adapter.prepareClose({channelId:id});
    const closed=await adapter.confirmClose({channelId:id,planId:plan.planId});
    assert.equal(closed.status,'finalized');assert.equal(closed.settledBaseUnits,expected.at(-1));
    assert.equal(closed.refundBaseUnits,(20000n-BigInt(expected.at(-1))).toString());
  }
});

test('treasury owner is per network; sandbox keeps the SDK owner, devnet retargets distribute', () => {
  assert.equal(NETWORK_ENVIRONMENTS.sandbox.treasuryOwner,'Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP');
  assert.equal(NETWORK_ENVIRONMENTS.devnet.treasuryOwner,'4zTeC5mVqWLruDexgU2mV66p9t5vCA9JyiZqdGDUspap');
  const accounts=Array.from({length:10},(_,i)=>({address:`acct${i}`,role:1}));
  const ix={programAddress:'p',accounts,data:new Uint8Array([7])};
  assert.equal(retargetDistributeTreasury({instruction:ix,sdkTreasuryAta:'acct6',treasuryAta:'acct6'}),ix);
  const out=retargetDistributeTreasury({instruction:ix,sdkTreasuryAta:'acct6',treasuryAta:'devnetTreasuryAta'});
  assert.equal(out.accounts[6].address,'devnetTreasuryAta');assert.equal(out.accounts[6].role,1);
  assert.deepEqual(out.accounts.filter((_,i)=>i!==6),accounts.filter((_,i)=>i!==6));assert.equal(ix.accounts[6].address,'acct6');
  assert.throws(()=>retargetDistributeTreasury({instruction:ix,sdkTreasuryAta:'other',treasuryAta:'x'}),/distribute_layout_mismatch/);
});

test('public evidence is an allowlist without private material', () => {
  const tx=publicTransaction({signature:'sig',role:'open',slot:1,wireBase64:'AAAA',plan:{x:1},explorerUrl:explorerTx('sig')});
  assert.deepEqual(Object.keys(tx).sort(),['explorerUrl','role','signature','slot']);
  assert.equal(explorerTx('abc'),'https://explorer.solana.com/tx/abc?cluster=devnet');
  assert.equal(explorerAddress('xyz'),'https://explorer.solana.com/address/xyz?cluster=devnet');
  assert.equal(assertPublicEvidence({transactions:[tx]}),true);
  assert.throws(()=>assertPublicEvidence({sponsor:{secret:[1]}}),/private/);
  assert.throws(()=>assertPublicEvidence({a:{wireBase64:'x'}}),/private/);
  assert.throws(()=>assertPublicEvidence({a:[{voucher:{cumulativeAmount:'1'}}]}),/private/);
  assert.throws(()=>assertPublicEvidence({a:{voucherSignature:'x'}}),/private/);
});
