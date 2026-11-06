// Fixture transport tests: real AXP campaign/auction/receipt/accounting, no RPC,
// model calls, private keys, signatures of chain transactions or external spend.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createProductService, PRESETS} from '../../packages/product/service.mjs';
import {ARC_NETWORK as N} from '../../packages/arc/network.mjs';
import {hash} from '../../packages/contracts/index.mjs';
import {jevResponse} from '../ml/fixtures.mjs';
const ids = {payer: `0x${'11'.repeat(20)}`, payee: `0x${'22'.repeat(20)}`};
function fixture(t, overrides = {}) {
  const stateDir = mkdtempSync(join(tmpdir(), 'axp-arc-fixture-'));
  const calls = [], checkpoints = [], transfers = new Map(); let serial = 0, unknown = false, service;
  const transport = {
    inspect: async () => ({compatible: true, chainId: N.chainId, token: N.token, decimals: 6, codeHash: 'fixture-code'}),
    signNative: async input => {calls.push(`sign:${input.kind}`); return {...input, transactionHash: `0x${hash(input)}`, wire: 'fixture-only', feeReservationAttoUSD: '1000'};},
    submitNative: async signed => {calls.push(`submit:${signed.kind}`); assert.ok(checkpoints.includes('arc_signed_native_bytes')); return {status: 'finalized', finality: 'finalized', transactionHash: signed.transactionHash, feeAttoUSD: '100'};},
    lookupNative: async signed => ({status: 'finalized', finality: 'finalized', transactionHash: signed.transactionHash, feeAttoUSD: '100'}),
    balances: async () => ({walletBaseUnits: '1000000', gatewayAvailableBaseUnits: '40000'}),
    signPayment: async input => {calls.push('sign:payment'); return {nonce: `fixture-${++serial}`, payloadHash: hash(input), requirements: {amount: input.amountBaseUnits, payTo: ids.payee}, payload: {fixture: true}};},
    verifyPayment: async () => ({isValid: true, payer: ids.payer}),
    settlePayment: async signed => {
      calls.push(`settle:${signed.nonce}`); assert.equal(checkpoints.at(-1), 'arc_before_gateway_submission');
      if (unknown) throw Error('fixture disconnect after potential acceptance');
      const result = {success: true, network: N.caip2, payer: ids.payer, transaction: `gateway-${signed.nonce}`};
      transfers.set(signed.nonce, {status: 'accepted', transferId: result.transaction, transferStatus: 'received', batchProof: null});
      return result;
    },
    lookupPayment: async signed => transfers.get(signed.nonce) ?? {status: 'unknown'},
    ...overrides,
  };
  const start = () => service = createProductService({stateDir, financialMode: 'devnet', arcEnabled: true, arcSigningEnabled: true,
    signingEnabled: false, paymentOptions: {identities: {payer: 'disabled-solana-payer', payee: 'disabled-solana-payee'}},
    arcOptions: {identities: ids, transportFactory: () => transport}, checkpoint: async reason => {checkpoints.push(reason);},
    transport: async packet => jevResponse(packet, 3, 3), publisherKey: 'fixture-publisher'});
  start(); service.saveAccount({name: 'Arc fixture', websiteURL: 'https://example.test/'});
  t.after(() => {service.close(); rmSync(stateDir, {recursive: true, force: true});});
  return {get service() {return service;}, calls, transfers, checkpoints, setUnknown: value => {unknown = value;},
    restart() {service.close(); start();},
    async campaign() {const {id, label, exampleQuestion, ...draft} = PRESETS[0]; const c = service.saveCampaign({...draft, settlementNetwork: N.network}).campaign; service.approve(c.id); return (await service.launch(c.id)).campaign;},
    ad(turn = 'one') {return service.opportunity({question: PRESETS[0].exampleQuestion, sessionId: 'arc-fixture', turnId: turn, settlementNetwork: N.network});},
    render(ad) {return service.render(ad.award.id, {creativeHash: ad.award.creativeHash, domInserted: true, sponsoredLabelPresent: true}, ad.deliveryToken);},
  };
}

test('Arc funds Gateway, signs one exact payment per accepted receipt, and keeps batch finality distinct', async t => {
  const f = fixture(t), c = await f.campaign();
  assert.equal(c.status, 'active'); assert.equal(c.payment.fundingKind, 'gateway_balance_allocation');
  assert.deepEqual(f.calls, ['sign:approve', 'submit:approve', 'sign:deposit', 'submit:deposit']);
  const ad = await f.ad(); assert.equal(ad.award.settlementNetwork, N.network); assert.equal(ad.award.token, N.token);
  assert.equal(f.service.exchange.all('charges').length, 0);
  const receipt = await f.render(ad); assert.equal(receipt.authorization.status, 'authorized');
  assert.equal(receipt.receipt.mode, 'devnet'); assert.equal('settlementNetwork' in receipt.receipt, false);
  assert.equal(f.service.exchange.all('charges').length, 1); assert.equal(f.calls.filter(c => c === 'sign:payment').length, 1);
  const replay = await f.render(ad); assert.equal(replay.signature, receipt.signature); assert.equal(replay.receiptHash, receipt.receiptHash);
  assert.equal(f.calls.filter(c => c === 'sign:payment').length, 1);
  const paid = await f.service.campaignAction(c.id, 'payout'); assert.equal(paid.paymentOperation.status, 'accepted');
  assert.equal(paid.campaign.settledBaseUnits, '0'); assert.equal(paid.campaign.payment.submittedBaseUnits, ad.award.priceBaseUnits);
  assert.equal(paid.campaign.payment.vouchers.length, 0);
  await f.service.campaignAction(c.id, 'payout'); assert.equal(f.calls.filter(c => c.startsWith('settle:')).length, 1);
  const state = f.service.state(); assert.equal(state.summary.spendBaseUnits, '0');
  assert.equal(state.summary.bySettlementNetwork[N.network].spendBaseUnits, ad.award.priceBaseUnits);
  assert.equal(JSON.stringify(state).includes('fixture-only'), false); assert.equal(JSON.stringify(state).includes('"payload":'), false);
  assert.equal(JSON.stringify(state).includes('fixture-1'), true); // public transfer ID only
  f.restart(); const count = f.calls.length; const found = f.service.lookupDelivery(ad.award.id, ad.deliveryToken);
  assert.equal(found.status, 'accepted'); assert.equal(found.result.signature, receipt.signature); assert.equal(f.calls.length, count);
  const second = await f.ad('two'); await f.render(second); assert.equal(f.calls.filter(c => c === 'sign:payment').length, 2);
  const closed = await f.service.campaignAction(c.id, 'close'); assert.equal(closed.campaign.status, 'settling');
  assert.equal(closed.campaign.refundBaseUnits, '0'); assert.equal(closed.campaign.payment.closeStatus, 'pending_batch');
  for (const [nonce, transfer] of f.transfers) f.transfers.set(nonce, {...transfer, status: 'finalized', transferStatus: 'completed', batchProof: {transactionHash: `0x${'a'.repeat(64)}`, status: 'finalized', finality: 'finalized', network: N.network, chainId: N.chainId}});
  const final = await f.service.campaignAction(c.id, 'reconcile'); assert.equal(final.campaign.status, 'settled');
  assert.equal(final.campaign.settledBaseUnits, String(BigInt(ad.award.priceBaseUnits) + BigInt(second.award.priceBaseUnits)));
  assert.equal(final.campaign.refundBaseUnits, '0'); assert.equal(final.campaign.payment.unusedAllocationBaseUnits, '12000');
});

test('uncertain Gateway submission survives restart, blocks expansion and reconciles original nonce without retry', async t => {
  const f = fixture(t), c = await f.campaign(), ad = await f.ad(); await f.render(ad); f.setUnknown(true);
  const result = await f.service.campaignAction(c.id, 'payout'); assert.equal(result.paymentOperation.status, 'unknown');
  const count = f.calls.length, saved = f.service.exchange.all('arc_payment_channels')[0].payments[0];
  f.restart();
  assert.equal((await f.service.campaignAction(c.id, 'payout')).paymentOperation.reason, 'arc_reconciliation_required');
  assert.equal(f.calls.length, count);
  assert.equal((await f.ad('after-unknown')).status, 'no_fill');
  await f.service.campaignAction(c.id, 'reconcile'); assert.equal(f.calls.length, count);
  assert.equal(f.service.exchange.all('arc_payment_channels')[0].payments[0].signed.nonce, saved.signed.nonce);
  f.transfers.set(saved.signed.nonce, {status: 'accepted', transferStatus: 'received', transferId: 'original-identity', batchProof: null});
  await f.service.campaignAction(c.id, 'reconcile');
  assert.equal(f.service.state().campaigns[0].payment.reconciliationRequired, false);
  assert.equal(f.calls.length, count);
});

test('Arc amount tampering and open reservations prevent signatures or Gateway submission', async t => {
  const f = fixture(t), c = await f.campaign(), ad = await f.ad();
  const result = await f.service.campaignAction(c.id, 'payout'); assert.equal(result.paymentOperation.reason, 'arc_outstanding_deliveries');
  assert.equal(f.calls.filter(c => c.startsWith('settle:')).length, 0);
  await f.render(ad); const charge = f.service.exchange.all('charges')[0], count = f.calls.length;
  f.service.exchange.tx(() => f.service.exchange.put('charges', charge.id, {...charge, amountBaseUnits: '1'}));
  assert.equal((await f.service.campaignAction(c.id, 'payout')).paymentOperation.reason, 'arc_charge_changed');
  assert.equal(f.calls.length, count);
});

test('Arc disabled is fail closed; synthetic and legacy Solana behavior remains explicit', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'axp-arc-disabled-')); t.after(() => rmSync(dir, {recursive: true, force: true}));
  const service = createProductService({stateDir: dir}); t.after(() => service.close());
  assert.throws(() => service.saveCampaign({settlementNetwork: N.network}), e => e.code === 'native_payments_required');
  await assert.rejects(service.opportunity({question: 'Compare tools', sessionId: 'one', turnId: 'one', settlementNetwork: N.network}), e => e.code === 'native_payments_required');
  assert.equal(service.payments().mode, 'synthetic');
});
