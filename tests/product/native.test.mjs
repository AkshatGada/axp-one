// OFFLINE SYNTHETIC TRANSPORT FIXTURES. These assertions exercise the Devnet
// product state machine, not native signing, RPC execution or chain evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createProductService, PRESETS} from '../../packages/product/service.mjs';
import {jevResponse} from '../ml/fixtures.mjs';

test.beforeEach(t => {
  // The production guard remains enabled; disk capacity is a supplied offline
  // environment observation. No test needs to allocate 50 GiB to open a fixture.
  t.mock.method(fs, 'statfsSync', () => ({bavail: 100, bsize: 1024 ** 3}));
  syncBuiltinESMExports();
  t.after(() => {t.mock.restoreAll(); syncBuiltinESMExports();});
});

function fixture(t, {controls = {}, signingEnabled = true} = {}) {
  const stateDir = fs.mkdtempSync(join(tmpdir(), 'axp-product-native-offline-'));
  const calls = [], commits = new Map(); let service, modelCalls = 0;
  const record = (name, terms, extra = {}) => calls.push({name, channelId: terms.channelId, ...structuredClone(extra)});
  const count = name => calls.filter(c => c.name === name).length;
  const report = () => ({compatible: true, simulation: {err: null}, programAccountHash: 'a'.repeat(64), programDataHash: 'b'.repeat(64), balances: {payerBaseUnits: controls.payerBaseUnits ?? '20000000', payerLamports: controls.payerLamports ?? '5000000000'}});
  const factory = async ({terms}) => {
    const protocolChannelId = `offline-fixture-channel:${terms.channelId}`;
    const wire = operation => ({wireBase64: Buffer.from(`offline-${operation}-${terms.channelId}`).toString('base64'), txSignature: `offline-fixture-${operation}:${terms.channelId}`, blockhash: 'offline-fixture-blockhash', lastValidBlockHeight: '12345', estimatedFeeAndRentLamports: controls[`${operation}Fee`] ?? '1000'});
    const openReceipt = input => ({status: controls.lookupOpenStatus ?? 'finalized', finality: 'finalized', txSignature: input.signed.txSignature, protocolChannelId, depositBaseUnits: terms.depositBaseUnits, evidence: {slot: 1, blockTime: 123, networkFeeLamports: '500', newRentLamports: '100', reclaimedRentLamports: '0', tokenDeltas: {payer: `-${terms.depositBaseUnits}`, publisher: '0', treasury: '0'}}});
    const closeReceipt = input => {
      const total = service.paymentWorker.store.get(terms.channelId).watermark.cumulativeAmountBaseUnits;
      const refund = String(BigInt(terms.depositBaseUnits) - BigInt(total));
      return {status: controls.lookupCloseStatus ?? 'finalized', finality: 'finalized', txSignature: input.signed.txSignature, settledBaseUnits: total, refundBaseUnits: refund, publisherDeltaBaseUnits: total, feeAndRentLamports: '1000', evidence: {slot: 2, blockTime: 124, networkFeeLamports: '500', newRentLamports: '0', reclaimedRentLamports: '100', tokenDeltas: {payer: refund, publisher: total, treasury: '0'}}, ...controls.closeReceipt};
    };
    return {
      evidenceLabel: 'synthetic_transport_fake',
      async prepareOpen(input) {record('prepareOpen', terms, {deposit: input.depositBaseUnits}); return {protocolChannelId, estimatedFeeAndRentLamports: controls.openFee ?? '1000'};},
      async signOpen() {record('signOpen', terms); assert.equal(service.paymentWorker.store.get(terms.channelId).open.status, 'signing'); if (controls.loseOpenSign) throw Error('offline lost signer result'); return wire('open');},
      async submitOpen(input) {record('submitOpen', terms, {signature: input.signed.txSignature}); assert.deepEqual(service.paymentWorker.store.get(terms.channelId).open.signed, input.signed); if (controls.loseOpenAck) throw Error('offline lost open acknowledgement'); if (controls.waitOpen) await controls.waitOpen; return controls.openSubmitted ? {...openReceipt(input), status: 'submitted', finality: null} : openReceipt(input);},
      async lookupOpen(input) {record('lookupOpen', terms, {signature: input.signed.txSignature}); return openReceipt(input);},
      async reserveDelivery({charge}) {record('reserveDelivery', terms, {chargeId: charge.id, amount: charge.amountBaseUnits}); return {deliveryId: charge.id, amountBaseUnits: charge.amountBaseUnits};},
      async prepareVoucher({intent}) {record('prepareVoucher', terms, {chargeId: intent.charge.id, cumulative: intent.cumulativeAmountBaseUnits}); assert.equal(service.paymentWorker.store.get(terms.channelId).intents.at(-1).status, 'signing'); return {signature: `offline-fixture-voucher:${intent.sequence}`, signatureType: 'ed25519', signer: terms.payer, voucher: {channelId: protocolChannelId, cumulativeAmount: intent.cumulativeAmountBaseUnits, expiresAt: terms.voucherExpiresAt}};},
      async commitVoucher(input) {record('commitVoucher', terms, {chargeId: input.intent.charge.id}); assert.deepEqual(service.paymentWorker.store.get(terms.channelId).intents.at(-1).voucher, input.voucher); const receipt = {status: 'authorized', deliveryId: input.intent.charge.id, incrementBaseUnits: input.intent.charge.amountBaseUnits, cumulativeAmountBaseUnits: input.intent.cumulativeAmountBaseUnits, payloadHash: input.intent.payloadHash}; commits.set(input.intent.charge.id, receipt); if (controls.loseCommitAck) throw Error('offline lost commit acknowledgement'); return receipt;},
      async lookupCommit(input) {record('lookupCommit', terms, {chargeId: input.intent.charge.id}); return controls.commitAbsent ? {status: 'absent'} : commits.get(input.intent.charge.id) ?? {status: 'absent'};},
      async prepareClose(input) {record('prepareClose', terms, {watermark: input.watermark, finalVoucher: input.finalVoucher ?? null}); assert.equal(input.watermark.cumulativeAmountBaseUnits, input.finalVoucher?.voucher.cumulativeAmount ?? '0'); return {protocolChannelId, estimatedFeeAndRentLamports: controls.closeFee ?? '1000'};},
      async signClose() {record('signClose', terms); assert.equal(service.paymentWorker.store.get(terms.channelId).close.status, 'signing'); return wire('close');},
      async submitClose(input) {record('submitClose', terms, {signature: input.signed.txSignature}); assert.deepEqual(service.paymentWorker.store.get(terms.channelId).close.signed, input.signed); if (controls.loseCloseAck) throw Error('offline lost close acknowledgement'); return closeReceipt(input);},
      async lookupClose(input) {record('lookupClose', terms, {signature: input.signed.txSignature}); return closeReceipt(input);},
    };
  };
  const start = () => service = createProductService({stateDir, financialMode: 'devnet', signingEnabled, publisherKey: 'offline-publisher-key', transport: async packet => {modelCalls++; return jevResponse(packet, 3, 2);}, organicTransport: async () => ({answer: 'Offline organic fixture', model: 'fixture'}), paymentOptions: {identities: {payer: 'offline-payer', payee: 'offline-payee'}, lock: false, preflight: async () => report(), transportFactory: factory}});
  start();
  t.after(() => {service.close(); fs.rmSync(stateDir, {recursive: true, force: true});});
  service.saveAccount({name: 'Offline native product fixture', websiteURL: 'https://fixture.example/'});
  const f = {get service() {return service;}, controls, calls, count, modelCalls: () => modelCalls,
    restart() {service.close(); start();},
    draft(overrides = {}) {const {id, label, exampleQuestion, ...input} = PRESETS[0]; const result = service.saveCampaign({...input, name: `Offline campaign ${service.state().campaigns.length + 1}`, budgetCapBaseUnits: '8000', depositBaseUnits: '20000', ...overrides}); service.approve(result.campaign.id); return result.campaign;},
    view(id) {return service.state().campaigns.find(c => c.id === id);},
    ad(turnId = 'turn-1', sessionId = 'session-1') {return service.opportunity({question: PRESETS[0].exampleQuestion, sessionId, turnId});},
    render(ad, overrides = {}) {return service.render(ad.award.id, {creativeHash: ad.award.creativeHash, domInserted: true, sponsoredLabelPresent: true, ...overrides}, ad.deliveryToken);},
  };
  return f;
}

test('offline native launch waits for finalized deposit; allocations are frozen at 20000 and 200000 base units', async t => {
  for (const depositBaseUnits of ['20000', '200000']) {
    const f = fixture(t), c = f.draft({depositBaseUnits});
    let release; f.controls.waitOpen = new Promise(resolve => {release = resolve;});
    const launch = f.service.launch(c.id);
    for (let attempt = 0; !f.count('submitOpen') && attempt < 100; attempt++) await new Promise(resolve => setImmediate(resolve));
    assert.equal(f.count('submitOpen'), 1, 'launch reaches the held offline submission');
    assert.equal(f.view(c.id).status, 'opening');
    assert.equal(f.view(c.id).payment.confirmedDepositBaseUnits, '0');
    assert.equal((await f.ad()).status, 'no_fill'); assert.equal(f.modelCalls(), 0);
    release(); const result = await launch;
    assert.equal(result.campaign.status, 'active'); assert.equal(result.campaign.payment.confirmedDepositBaseUnits, depositBaseUnits);
    assert.equal(result.campaign.payment.transactions[0].status, 'finalized');
    assert.equal(f.calls.find(x => x.name === 'prepareOpen').deposit, depositBaseUnits);
    await f.service.launch(c.id); assert.equal(f.count('signOpen'), 1); assert.equal(f.count('submitOpen'), 1);
  }
});

test('offline receipt-controlled cumulative vouchers deduplicate concurrent DOM acknowledgements and exact replay', async t => {
  const f = fixture(t), c = f.draft(); await f.service.launch(c.id);
  const ad = await f.ad(); assert.equal(ad.status, 'awarded'); assert.equal(ad.mode, 'devnet');
  await assert.rejects(f.render(ad, {domInserted: false}), error => error.code === 'render_ack_invalid');
  await assert.rejects(f.render(ad, {sponsoredLabelPresent: false}), error => error.code === 'render_ack_invalid');
  await assert.rejects(f.render(ad, {creativeHash: '0'.repeat(64)}), error => error.code === 'render_ack_invalid');
  await assert.rejects(f.render(ad, {amountBaseUnits: '9999', recipient: 'browser-selected-payee'}));
  assert.equal(f.count('prepareVoucher'), 0);
  const receipts = await Promise.all([f.render(ad), f.render(ad)]);
  assert.equal(receipts[0].charge.id, receipts[1].charge.id); assert.ok(receipts.some(r => r.replayed));
  assert.equal(f.count('reserveDelivery'), 1); assert.equal(f.count('prepareVoucher'), 1); assert.equal(f.count('commitVoucher'), 1);
  const second = await f.ad('turn-2'); await f.render(second);
  const view = f.view(c.id), accepted = String(BigInt(ad.award.priceBaseUnits) + BigInt(second.award.priceBaseUnits));
  assert.equal(view.spendBaseUnits, accepted); assert.equal(view.authorizedBaseUnits, accepted); assert.equal(view.settledBaseUnits, '0');
  assert.deepEqual(view.payment.vouchers.map(v => v.sequence), ['1', '2']);
  assert.deepEqual(view.payment.vouchers.map(v => v.cumulativeAmountBaseUnits), [ad.award.priceBaseUnits, accepted]);
  assert.equal(f.service.state().deliveries.length, 2);
  await f.render(ad); assert.equal(f.count('prepareVoucher'), 2); assert.equal(f.count('commitVoucher'), 2);
});

test('offline positive close pays only receipt spend and refunds exact unused collateral once', async t => {
  const f = fixture(t), c = f.draft(); await f.service.launch(c.id);
  const ad = await f.ad(); await f.render(ad);
  const result = await f.service.campaignAction(c.id, 'settle'), payment = result.campaign.payment;
  assert.equal(result.campaign.status, 'settled'); assert.equal(payment.closeStatus, 'finalized');
  assert.equal(payment.settledBaseUnits, ad.award.priceBaseUnits);
  assert.equal(payment.refundBaseUnits, String(20000n - BigInt(ad.award.priceBaseUnits)));
  assert.equal(BigInt(payment.settledBaseUnits) + BigInt(payment.refundBaseUnits), 20000n);
  assert.equal(payment.transactions[1].finality, 'finalized');
  assert.equal(f.service.state().deliveries[0].status, 'settled');
  await f.service.campaignAction(c.id, 'settle'); assert.equal(f.count('signClose'), 1); assert.equal(f.count('submitClose'), 1);
});

test('offline zero-charge close refunds the full allocation without signing a voucher', async t => {
  const f = fixture(t), c = f.draft(); await f.service.launch(c.id);
  const result = await f.service.campaignAction(c.id, 'settle');
  assert.equal(result.campaign.payment.settledBaseUnits, '0'); assert.equal(result.campaign.payment.refundBaseUnits, '20000');
  assert.equal(f.count('prepareVoucher'), 0); assert.equal(f.count('commitVoucher'), 0);
  assert.equal(f.calls.find(x => x.name === 'prepareClose').finalVoucher, null);
  assert.equal(f.count('signClose'), 1);
});

test('offline restart preserves closed economics; reads and replay never sign or submit again', async t => {
  const f = fixture(t), c = f.draft(); await f.service.launch(c.id); const ad = await f.ad(); const delivered = await f.render(ad); await f.service.campaignAction(c.id, 'settle');
  const before = f.calls.length, modelCalls = f.modelCalls(); f.restart();
  const view = f.view(c.id); assert.equal(view.status, 'settled'); assert.equal(view.payment.settledBaseUnits, ad.award.priceBaseUnits);
  assert.equal((await f.service.launch(c.id)).replayed, true); assert.equal((await f.service.campaignAction(c.id, 'settle')).replayed, true);
  const replay = await f.render(ad); assert.equal(replay.charge.id, delivered.charge.id); assert.equal(replay.replayed, true);
  assert.equal(f.calls.length, before); assert.equal(f.modelCalls(), modelCalls);
});

test('offline uncertain open stays ineligible; restart recovery looks up the exact saved signature without new broadcast', async t => {
  const f = fixture(t, {controls: {loseOpenAck: true, lookupOpenStatus: 'unknown'}}), c = f.draft();
  const opened = await f.service.launch(c.id); assert.equal(opened.campaign.status, 'opening'); assert.equal(opened.campaign.payment.reconciliationRequired, true);
  assert.equal((await f.ad()).status, 'no_fill'); assert.equal(f.modelCalls(), 0);
  const signature = f.calls.find(x => x.name === 'submitOpen').signature;
  f.restart(); await f.service.launch(c.id); assert.equal(f.count('lookupOpen'), 1);
  f.controls.lookupOpenStatus = 'finalized'; const recovered = await f.service.campaignAction(c.id, 'reconcile');
  assert.equal(recovered.campaign.status, 'active'); assert.equal(f.count('signOpen'), 1); assert.equal(f.count('submitOpen'), 1);
  assert.equal(f.calls.filter(x => x.name === 'lookupOpen').every(x => x.signature === signature), true);
  assert.equal((await f.ad('recovered-turn')).status, 'awarded');
});

test('offline uncertain voucher preserves accepted receipt; lookup after restart resolves it without a second economic operation', async t => {
  const f = fixture(t, {controls: {loseCommitAck: true, commitAbsent: true}}), c = f.draft(); await f.service.launch(c.id);
  const ad = await f.ad(), result = await f.render(ad);
  assert.equal(result.status, 'accepted'); assert.equal(result.authorization.status, 'unknown'); assert.equal(result.charge.status, 'accepted');
  assert.equal(result.payment.authorizedBaseUnits, '0'); assert.equal(result.payment.reconciliationRequired, true);
  assert.equal((await f.ad('blocked-turn')).status, 'no_fill'); assert.equal(f.modelCalls(), 1);
  f.restart(); f.controls.commitAbsent = false;
  const replay = await f.render(ad); assert.equal(replay.replayed, true); assert.equal(replay.charge.id, result.charge.id); assert.equal(replay.authorization.status, 'authorized');
  assert.equal(f.count('reserveDelivery'), 1); assert.equal(f.count('prepareVoucher'), 1); assert.equal(f.count('commitVoucher'), 1); assert.equal(f.count('lookupCommit'), 1);
  assert.equal(f.view(c.id).authorizedBaseUnits, ad.award.priceBaseUnits);
});

test('offline signing and financial caps reject before key-bearing transport methods', async t => {
  const disabled = fixture(t, {signingEnabled: false}), c = disabled.draft();
  await assert.rejects(disabled.service.launch(c.id), error => error.code === 'devnet_signing_disabled'); assert.equal(disabled.calls.length, 0);
  assert.throws(() => disabled.draft({maxBidBaseUnits: '4001'}), error => error.code === 'spend_limit_exceeded');
  assert.throws(() => disabled.draft({budgetCapBaseUnits: '100001'}), error => error.code === 'spend_limit_exceeded');
  assert.throws(() => disabled.draft({depositBaseUnits: '200001'}), error => error.code === 'spend_limit_exceeded');
  const fee = fixture(t, {controls: {openFee: '20000001'}}), feeCampaign = fee.draft();
  const rejected = await fee.service.launch(feeCampaign.id); assert.equal(rejected.campaign.status, 'opening'); assert.equal(fee.count('prepareOpen'), 1); assert.equal(fee.count('signOpen'), 0); assert.equal(fee.count('submitOpen'), 0);
  const sol = fixture(t, {controls: {payerLamports: '0'}}), solCampaign = sol.draft();
  const blocked = await sol.service.launch(solCampaign.id); assert.equal(blocked.paymentOperation.reason, 'insufficient_devnet_sol'); assert.equal(sol.count('signOpen'), 0);
});

test('offline pause/resume keeps the frozen campaign version and receipt-to-voucher binding', async t => {
  const f = fixture(t), c = f.draft(); await f.service.launch(c.id);
  const version = f.service.exchange.require('campaigns', c.id).campaignVersionId;
  f.service.campaignAction(c.id, 'pause'); assert.equal((await f.ad()).status, 'no_fill'); assert.equal(f.modelCalls(), 0);
  f.service.campaignAction(c.id, 'resume'); assert.equal(f.service.exchange.require('campaigns', c.id).campaignVersionId, version);
  const ad = await f.ad('resumed-turn'), receipt = await f.render(ad);
  assert.equal(receipt.authorization.status, 'authorized'); assert.equal(receipt.charge.campaignVersionId, version); assert.equal(f.count('signOpen'), 1);
});

test('offline aggregate channel cap remains effective after all existing campaigns are paused', async t => {
  const f = fixture(t);
  for (let i = 0; i < 8; i++) {const c = f.draft(); await f.service.launch(c.id); f.service.campaignAction(c.id, 'pause');}
  const ninth = f.draft(), rejected = await f.service.launch(ninth.id);
  assert.equal(rejected.paymentOperation.status, 'blocked'); assert.equal(rejected.paymentOperation.reason, 'aggregate_deposit_cap');
  assert.equal(f.count('signOpen'), 8); assert.equal(f.count('submitOpen'), 8);
  assert.equal(f.view(ninth.id).payment, undefined);
});

test('offline outstanding delivery blocks closure and leaves a durable draining campaign', async t => {
  const f = fixture(t), c = f.draft(); await f.service.launch(c.id);
  const ad = await f.ad();
  const result = await f.service.campaignAction(c.id, 'settle');
  assert.equal(result.paymentOperation.reason, 'outstanding_deliveries');
  assert.equal(f.count('signClose'), 0); assert.equal(f.count('prepareClose'), 0);
  assert.equal(result.campaign.status, 'settling');
  assert.equal(result.campaign.payment.phase, 'draining');
  assert.throws(() => f.service.campaignAction(c.id, 'resume'), error => error.code === 'campaign_not_paused');
  assert.equal((await f.ad('after-drain')).status, 'no_fill');
  f.restart(); assert.equal(f.view(c.id).status, 'settling'); assert.equal(f.view(c.id).payment.phase, 'draining');
  f.service.failAward(ad.award.id, {reason: 'offline-card-omitted'}, ad.deliveryToken);
  const closed = await f.service.campaignAction(c.id, 'settle');
  assert.equal(closed.campaign.payment.refundBaseUnits, '20000'); assert.equal(f.count('signClose'), 1);
});

test('offline uncertain close reports no payout/refund until saved-signature lookup finalizes after restart', async t => {
  const f = fixture(t, {controls: {loseCloseAck: true, lookupCloseStatus: 'unknown'}}), c = f.draft(); await f.service.launch(c.id);
  const ad = await f.ad(); await f.render(ad);
  const closing = await f.service.campaignAction(c.id, 'settle');
  assert.equal(closing.campaign.status, 'settling'); assert.equal(closing.campaign.payment.settledBaseUnits, '0'); assert.equal(closing.campaign.payment.refundBaseUnits, '0');
  const signature = f.calls.find(x => x.name === 'submitClose').signature;
  f.restart(); f.controls.lookupCloseStatus = 'finalized';
  const result = await f.service.campaignAction(c.id, 'reconcile');
  assert.equal(result.campaign.status, 'settled'); assert.equal(result.campaign.payment.settledBaseUnits, ad.award.priceBaseUnits);
  assert.equal(f.count('signClose'), 1); assert.equal(f.count('submitClose'), 1);
  assert.equal(f.calls.find(x => x.name === 'lookupClose').signature, signature);
});

test('offline malformed finalized close amount never becomes payment evidence or settled spend', async t => {
  const f = fixture(t, {controls: {closeReceipt: {refundBaseUnits: '20000'}}}), c = f.draft(); await f.service.launch(c.id);
  const ad = await f.ad(); await f.render(ad);
  const result = await f.service.campaignAction(c.id, 'settle');
  assert.equal(result.campaign.payment.closeStatus, 'unknown'); assert.equal(result.campaign.payment.settledBaseUnits, '0'); assert.equal(result.campaign.payment.refundBaseUnits, '0');
  assert.equal(result.campaign.payment.reason, 'settlement_amount_mismatch');
  assert.equal(f.service.state().deliveries[0].status, 'authorized');
  assert.equal(f.count('signClose'), 1); assert.equal(f.count('submitClose'), 1);
});

test('offline lost signer result never signs or broadcasts again and blocks another channel signer', async t => {
  const f = fixture(t, {controls: {loseOpenSign: true}}), c = f.draft();
  const result = await f.service.launch(c.id); assert.equal(result.campaign.payment.openStatus, 'sign_unknown');
  f.restart(); await f.service.campaignAction(c.id, 'reconcile'); await f.service.launch(c.id);
  assert.equal(f.count('signOpen'), 1); assert.equal(f.count('submitOpen'), 0); assert.equal(f.count('lookupOpen'), 0);
  const other = f.draft(), blocked = await f.service.launch(other.id);
  assert.equal(blocked.paymentOperation.reason, 'payment_reconciliation_required');
  assert.equal(f.count('signOpen'), 1); assert.equal(f.count('submitOpen'), 0);
  assert.equal((await f.ad()).status, 'no_fill'); assert.equal(f.modelCalls(), 0);
});

test('offline insufficient test USDC blocks the signer even when an injected feasibility report says compatible', async t => {
  const f = fixture(t, {controls: {payerBaseUnits: '19999'}}), c = f.draft();
  const result = await f.service.launch(c.id);
  assert.equal(result.paymentOperation.reason, 'insufficient_test_usdc'); assert.equal(f.count('signOpen'), 0); assert.equal(f.count('submitOpen'), 0);
  assert.equal((await f.ad()).status, 'no_fill'); assert.equal(f.modelCalls(), 0);
});

test('offline low disk observation refuses funding before preparing or signing any transport operation', async t => {
  const f = fixture(t), c = f.draft();
  t.mock.method(fs, 'statfsSync', () => ({bavail: 49, bsize: 1024 ** 3})); syncBuiltinESMExports();
  const result = await f.service.launch(c.id);
  assert.equal(result.paymentOperation.reason, '50gib_disk_floor'); assert.equal(f.calls.length, 0);
  assert.equal((await f.ad()).status, 'no_fill'); assert.equal(f.modelCalls(), 0);
});
