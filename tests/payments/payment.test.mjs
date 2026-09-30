import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SyntheticPaymentAdapter, SQLitePaymentStore, createMemoryPaymentStore, createSyntheticVoucher, verifySyntheticVoucher, amount, DEVNET_CONFIG, validateDevnetConfig } from '../../packages/payments/index.mjs';
import { checkDevnet } from '../../scripts/payment-spike/devnet-readonly.mjs';

const T0 = 2000000000;
const channelId = 'synthetic:channel-01';
const terms = { channelId, mode: 'synthetic', runId: 'c06-fixture-v1', advertiserId: 'adv-01', campaignVersionId: 'campaign-01',
  payer: 'synthetic:payer-01', payee: 'synthetic:pub-01', depositBaseUnits: '1000', voucherExpiresAt: T0 + 7200,
  applicationDeadlineAt: T0 + 1800, openSlot: '100' };
const charge = (n, value, extra = {}) => ({ channelId, chargeId: `charge-00${n}`, sequence: String(n), amountBaseUnits: value, accepted: true, ...extra });
function setup(options = {}) {
  let clock = T0;
  const adapter = new SyntheticPaymentAdapter({ ...options, now: () => clock });
  adapter.open(terms);
  return { adapter, setClock: value => { clock = value; } };
}
function two(adapter) { adapter.authorizeCumulative(charge(1, '100')); adapter.authorizeCumulative(charge(2, '250')); }
const error = code => e => e.reasonCode === code || e.message === code;
function validator(adapter, total = '350') {
  const c = adapter.store.get(channelId);
  return { voucher: createSyntheticVoucher({ channelId, cumulativeAmountBaseUnits: total, expiresAt: terms.voucherExpiresAt, termsHash: c.termsHash }),
    channelId, termsHash: c.termsHash, previousBaseUnits: '100', chargeAmountBaseUnits: '250', capBaseUnits: '1000', expiresAt: terms.voucherExpiresAt, now: T0 + 20 };
}

test('C06-F01: candidate/award/failed/expired/invalid receipt produce no authorization', () => {
  const { adapter } = setup();
  assert.equal(adapter.getChannel(channelId).authorizedBaseUnits, '0'); // read is free
  adapter.reserveAward({ channelId, reservationId: 'award-failed', amountBaseUnits: '100' });
  assert.equal(adapter.getChannel(channelId).authorizedBaseUnits, '0');
  adapter.releaseAward({ channelId, reservationId: 'award-failed' });
  adapter.reserveAward({ channelId, reservationId: 'award-expired', amountBaseUnits: '250' });
  adapter.releaseAward({ channelId, reservationId: 'award-expired' });
  for (const accepted of [false, undefined, 'true']) assert.throws(() => adapter.acceptCharge(charge(1, '100', { accepted })), error('charge_not_accepted'));
  assert.throws(() => adapter.authorizeCumulative({ channelId, chargeId: 'unaccepted' }), error('charge_not_accepted'));
  assert.equal(adapter.getChannel(channelId).syntheticSigningCalls, 0);
  assert.equal(adapter.getChannel(channelId).acceptedBaseUnits, '0');
});
test('C06-F02: first accepted charge authorizes exactly 100', () => {
  const { adapter } = setup();
  const result = adapter.authorizeCumulative(charge(1, '100'));
  assert.equal(result.previousBaseUnits, '0'); assert.equal(result.amountBaseUnits, '100');
  assert.equal(result.cumulativeAmountBaseUnits, '100'); assert.equal(result.protocolDeliveryId, 'charge-001');
  assert.equal(adapter.getChannel(channelId).syntheticSigningCalls, 1);
});
test('C06-F03: same channel accumulates 100 then 350, never 450', () => {
  const { adapter } = setup(); two(adapter);
  const c = adapter.getChannel(channelId);
  assert.equal(c.acceptedBaseUnits, '350'); assert.equal(c.authorizedBaseUnits, '350');
  assert.equal(c.availableBaseUnits, '650'); assert.equal(c.syntheticSigningCalls, 2);
});
test('C06-F04: concurrent and restart replay preserve exact result and payload', async () => {
  const { adapter } = setup(); const first = adapter.authorizeCumulative(charge(1, '100')); two(adapter);
  const retries = await Promise.all(Array.from({ length: 20 }, () => Promise.resolve().then(() => adapter.authorizeCumulative(charge(1, '100')))));
  for (const retry of retries) assert.deepEqual(retry, first);
  const restored = new SyntheticPaymentAdapter({ store: createMemoryPaymentStore(adapter.store.snapshot()), now: () => T0 + 30 });
  assert.deepEqual(restored.authorizeCumulative(charge(1, '100')), first);
  assert.equal(restored.getChannel(channelId).authorizedBaseUnits, '350');
  assert.equal(restored.getChannel(channelId).syntheticSigningCalls, 2);
  assert.throws(() => restored.authorizeCumulative(charge(1, '101')), error('authorization_conflict'));
});
test('C06-F05: lost signed/commit acknowledgement survives SQLite restart without signing more', () => {
  for (const fault of ['after_signed', 'after_commit']) {
    const dir = mkdtempSync(join(tmpdir(), 'c06-test-')); const path = join(dir, 'payments.sqlite');
    let store = new SQLitePaymentStore(path);
    try {
      let { adapter } = setup({ store });
      const uncertain = adapter.authorizeCumulative(charge(1, '100', { fault }));
      assert.equal(uncertain.status, 'unknown'); assert.equal(adapter.getChannel(channelId).authorizedBaseUnits, '0');
      assert.throws(() => adapter.authorizeCumulative(charge(2, '250')), error('reconciliation_required'));
      assert.throws(() => adapter.reserveAward({ channelId, reservationId: 'new', amountBaseUnits: '1' }), error('channel_unavailable'));
      store.close(); store = new SQLitePaymentStore(path);
      adapter = new SyntheticPaymentAdapter({ store, now: () => T0 + 30 });
      const recovered = adapter.reconcile({ channelId, chargeId: 'charge-001' });
      assert.equal(recovered.signedPayloadHash, uncertain.signedPayloadHash);
      assert.equal(recovered.protocolDeliveryId, 'charge-001');
      assert.equal(adapter.getChannel(channelId).syntheticSigningCalls, 1);
      adapter.authorizeCumulative(charge(2, '250'));
      assert.equal(adapter.getChannel(channelId).authorizedBaseUnits, '350');
      assert.equal(adapter.store.get(channelId).providerCommits.length, 2);
    } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
  }
});
test('C06-F06: valid synthetic signature undercommitting 249 against 250 is rejected', () => {
  const { adapter } = setup(); adapter.authorizeCumulative(charge(1, '100'));
  assert.throws(() => verifySyntheticVoucher(validator(adapter, '349')), error('charge_amount_mismatch'));
  assert.equal(adapter.getChannel(channelId).authorizedBaseUnits, '100');
});
test('C06-F07: overcommit 251 against 250 rejected with prior state retained', () => {
  const { adapter } = setup(); adapter.authorizeCumulative(charge(1, '100'));
  assert.throws(() => verifySyntheticVoucher(validator(adapter, '351')), error('charge_amount_mismatch'));
  assert.equal(adapter.getChannel(channelId).syntheticSigningCalls, 1);
});
test('C06-F08: wrong channel/signer/tamper/expiry/decrease/cap never advance', () => {
  const { adapter } = setup(); adapter.authorizeCumulative(charge(1, '100'));
  const good = validator(adapter);
  for (const mutation of [
    v => { v.payload.channelId = 'synthetic:wrong'; },
    v => { v.signer = 'synthetic:wrong-signer'; },
    v => { v.signature = Buffer.alloc(64, 1).toString('base64'); },
    v => { v.payload.cumulativeAmountBaseUnits = '351'; },
  ]) {
    const input = structuredClone(good); mutation(input.voucher);
    assert.throws(() => verifySyntheticVoucher(input), error('voucher_invalid'));
  }
  assert.throws(() => verifySyntheticVoucher({ ...good, now: terms.voucherExpiresAt }), error('voucher_expired'));
  assert.throws(() => verifySyntheticVoucher(validator(adapter, '99')), error('voucher_invalid'));
  assert.throws(() => verifySyntheticVoucher(validator(adapter, '1001')), error('cap_exceeded'));
  assert.equal(adapter.getChannel(channelId).authorizedBaseUnits, '100');
  const snapshot = adapter.store.snapshot(); snapshot.channels[0].finalVoucher.signature = Buffer.alloc(64).toString('base64');
  const corrupt = new SyntheticPaymentAdapter({ store: createMemoryPaymentStore(snapshot), now: () => T0 });
  assert.throws(() => corrupt.prepareClose({ channelId }), error('voucher_invalid'));
});
test('C06-F09: closure reuses saved 350 voucher, payout350/refund650, zero extra signing', () => {
  const { adapter } = setup(); two(adapter);
  const before = adapter.getChannel(channelId);
  const plan = adapter.prepareClose({ channelId });
  assert.equal(plan.finalVoucherHash, before.finalVoucherHash);
  const result = adapter.confirmClose({ channelId, planId: plan.id });
  assert.equal(result.publisherPayoutBaseUnits, '350'); assert.equal(result.unusedTokenRefundBaseUnits, '650');
  assert.equal(BigInt(result.publisherPayoutBaseUnits) + BigInt(result.unusedTokenRefundBaseUnits), 1000n);
  assert.equal(adapter.getChannel(channelId).syntheticSigningCalls, 2);
  assert.equal(result.finality, 'synthetic'); assert.equal(result.txSignature, null);
  assert.deepEqual(adapter.confirmClose({ channelId, planId: plan.id }), result);
  assert.equal(adapter.getChannel(channelId).syntheticCloseAttempts, 1);
  assert.equal(adapter.getChannel(channelId).settledBaseUnits, '350');
});
test('C06-F10: outstanding awards, accepted unpaid, unknown commit each block close', () => {
  for (const branch of ['award', 'unpaid', 'unknown']) {
    const { adapter } = setup(); adapter.authorizeCumulative(charge(1, '100'));
    if (branch === 'award') adapter.reserveAward({ channelId, reservationId: 'unresolved', amountBaseUnits: '250' });
    if (branch === 'unpaid') adapter.acceptCharge(charge(2, '250'));
    if (branch === 'unknown') adapter.authorizeCumulative(charge(2, '250', { fault: 'after_commit' }));
    assert.throws(() => adapter.prepareClose({ channelId }), error(branch === 'unknown' ? 'reconciliation_required' : 'close_not_drained'));
    assert.equal(adapter.getChannel(channelId).syntheticCloseAttempts, 0);
  }
});
test('C06-F11: both admission/freeze orderings conserve all charges', async () => {
  const { adapter } = setup(); adapter.authorizeCumulative(charge(1, '100'));
  adapter.reserveAward({ channelId, reservationId: 'awarded', amountBaseUnits: '250' });
  adapter.beginDrain({ channelId });
  assert.throws(() => adapter.prepareClose({ channelId }), error('close_not_drained'));
  adapter.authorizeCumulative(charge(2, '250', { reservationId: 'awarded' }));
  assert.equal(adapter.prepareClose({ channelId }).cumulativeAmountBaseUnits, '350');
  const next = setup().adapter; next.authorizeCumulative(charge(1, '100'));
  const outcomes = await Promise.allSettled([
    Promise.resolve().then(() => next.prepareClose({ channelId })),
    Promise.resolve().then(() => next.acceptCharge(charge(2, '250'))),
  ]);
  assert.equal(outcomes[0].status, 'fulfilled'); assert.equal(outcomes[1].status, 'rejected');
  assert.equal(next.getChannel(channelId).acceptedBaseUnits, '100');
});
test('C06-F12: lost close acknowledgement recovers same attempt after restart', () => {
  const { adapter } = setup(); two(adapter); const plan = adapter.prepareClose({ channelId });
  const uncertain = adapter.confirmClose({ channelId, planId: plan.id, fault: 'after_close' });
  assert.equal(uncertain.status, 'unknown');
  assert.throws(() => adapter.confirmClose({ channelId, planId: plan.id }), error('reconciliation_required'));
  const restored = new SyntheticPaymentAdapter({ store: createMemoryPaymentStore(adapter.store.snapshot()), now: () => T0 + 31 });
  const result = restored.reconcile({ channelId, planId: uncertain.attemptId });
  assert.equal(result.attemptId, plan.id); assert.equal(result.settledBaseUnits, '350');
  assert.equal(restored.getChannel(channelId).syntheticCloseAttempts, 1);
  assert.equal(restored.getChannel(channelId).syntheticSigningCalls, 2);
});
test('C06-F13: synthetic idle-close requests drain, cannot bypass obligations', () => {
  const { adapter } = setup(); adapter.authorizeCumulative(charge(1, '100'));
  adapter.reserveAward({ channelId, reservationId: 'slow-auction', amountBaseUnits: '250' });
  const result = adapter.requestIdleClose({ channelId });
  assert.equal(result.status, 'drain_requested'); assert.equal(result.phase, 'draining');
  assert.throws(() => adapter.prepareClose({ channelId }), error('close_not_drained'));
  assert.throws(() => adapter.reserveAward({ channelId, reservationId: 'new', amountBaseUnits: '1' }), error('channel_unavailable'));
  assert.equal(adapter.getChannel(channelId).syntheticCloseAttempts, 0);
});
test('C06-F14: near-expiry saved final voucher cannot be refreshed by another charge', () => {
  const { adapter, setClock } = setup(); two(adapter); setClock(terms.voucherExpiresAt - 60);
  assert.throws(() => adapter.prepareClose({ channelId }), error('voucher_expired'));
  assert.equal(adapter.getChannel(channelId).syntheticSigningCalls, 2);
  const fresh = setup(); fresh.adapter.acceptCharge(charge(1, '100')); fresh.setClock(terms.voucherExpiresAt - 60);
  assert.throws(() => fresh.adapter.authorizeCumulative({ channelId, chargeId: 'charge-001' }), error('voucher_expired'));
  assert.equal(fresh.adapter.getChannel(channelId).syntheticSigningCalls, 0);
  assert.equal(fresh.adapter.store.get(channelId).providerCommits.length, 0);
});
test('C06-F15: config/network/mint/payee/treasury rejects before any signing or broadcast', async () => {
  for (const patch of [{ rpc: 'https://api.mainnet-beta.solana.com' }, { network: 'mainnet' }, { mint: 'different' }, { tokenProgram: 'different' }]) assert.throws(() => validateDevnetConfig({ ...DEVNET_CONFIG, ...patch }), error('terms_mismatch'));
  assert.throws(() => validateDevnetConfig(DEVNET_CONFIG, { observedGenesisHash: 'mainnet-genesis' }), error('terms_mismatch'));
  assert.throws(() => validateDevnetConfig({ ...DEVNET_CONFIG, payee: 'bad' }, { expectedPayee: 'good' }), error('terms_mismatch'));
  assert.throws(() => validateDevnetConfig(DEVNET_CONFIG, { deployedTreasury: 'incompatible' }), error('terms_mismatch'));
  assert.equal(validateDevnetConfig(DEVNET_CONFIG).status, 'unverified');
  let calls = 0;
  await assert.rejects(() => checkDevnet({ rpc: 'https://api.mainnet-beta.solana.com', fetchImpl: () => { calls++; } }), error('terms_mismatch'));
  assert.equal(calls, 0);
  const report = await checkDevnet({ fetchImpl: async (_url, req) => { calls++; assert.equal(JSON.parse(req.body).method, 'getGenesisHash'); return new Response(JSON.stringify({ result: 'wrong-genesis' })); } });
  assert.equal(report.status, 'incompatible'); assert.equal(calls, 1);
  assert.equal(report.broadcasts, 0); assert.equal(report.signaturesCreated, 0); assert.equal(report.walletKeyReads, 0);
  const adapter = new SyntheticPaymentAdapter({ now: () => T0 });
  assert.throws(() => adapter.open({ ...terms, mode: 'devnet' }), error('mode_not_supported'));
  assert.throws(() => adapter.open({ ...terms, payee: 'actual-wallet-address' }), error('terms_mismatch'));
});
test('C06-F16: reclaim strict slot gate and approval; token refund separate from unmeasured rent', () => {
  const { adapter } = setup(); two(adapter); const close = adapter.prepareClose({ channelId }); adapter.confirmClose({ channelId, planId: close.id });
  assert.throws(() => adapter.prepareReclaim({ channelId, observedSlot: '1600', approved: true }), error('reclaim_not_eligible'));
  assert.throws(() => adapter.prepareReclaim({ channelId, observedSlot: '1601' }), error('approval_missing'));
  const plan = adapter.prepareReclaim({ channelId, observedSlot: '1601', approved: true });
  assert.equal(plan.additionalTokenRefundBaseUnits, '0'); assert.equal(plan.tokenRefundBaseUnits, '650');
  assert.equal(plan.rentLamports, null); assert.equal(plan.broadcasts, 0);
});
test('strict money, sequence, terms, caps, schema restore and detached projections', () => {
  for (const value of [1, 1.5, '-1', '1.2', '1e3', '01', '', '18446744073709551616']) assert.throws(() => amount(value));
  assert.equal(amount('18446744073709551615'), (1n << 64n) - 1n);
  const { adapter } = setup();
  assert.throws(() => adapter.authorizeCumulative(charge(2, '250')), error('charge_sequence_mismatch'));
  assert.throws(() => adapter.authorizeCumulative(charge(1, '100', { payee: 'synthetic:other' })), error('terms_mismatch'));
  adapter.reserveAward({ channelId, reservationId: 'reserve', amountBaseUnits: '900' });
  assert.throws(() => adapter.acceptCharge(charge(1, '101')), error('cap_exceeded'));
  adapter.authorizeCumulative(charge(1, '100'));
  assert.equal(adapter.getChannel(channelId).availableBaseUnits, '0');
  const projection = adapter.getChannel(channelId); projection.authorizedBaseUnits = '1000';
  assert.equal(adapter.getChannel(channelId).authorizedBaseUnits, '100');
  assert.ok(!JSON.stringify(projection).includes('signature')); // safe public projection
  assert.throws(() => createMemoryPaymentStore({ schemaVersion: 2, channels: [] }), /unsupported_payment_state_schema/);
  const snapshot = adapter.store.snapshot(); snapshot.channels[0].futureProviderField = { preserved: true };
  const restored = createMemoryPaymentStore(snapshot);
  restored.update(channelId, c => ({ ...c, idleCloseRequested: true }));
  assert.deepEqual(restored.get(channelId).futureProviderField, { preserved: true });
  assert.throws(() => restored.update(channelId, async c => c), /async_store_mutator_forbidden/);
});
