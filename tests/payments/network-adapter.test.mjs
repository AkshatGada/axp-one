// SYNTHETIC TRANSPORT FAKES ONLY: no native encoder, crypto signing, RPC or keys.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NetworkPaymentAdapter, hashNetworkTerms, hashNetworkRecord } from '../../packages/payments/network-adapter.mjs';
import { createMemoryPaymentStore, SQLitePaymentStore } from '../../packages/payments/store.mjs';

const T0 = 2_000_000_000;
const TERMS = {
  channelId: 'fake:application-channel', mode: 'sandbox', runId: 'fake:run',
  advertiserId: 'fake:advertiser', campaignVersionId: 'fake:campaign-v1',
  rpc: 'https://fake-sandbox.example:8899', network: 'sandbox', genesisHash: 'fake:genesis',
  program: 'fake:program', mint: 'fake:mint', tokenProgram: 'fake:token-program',
  payer: 'fake:payer', payee: 'fake:payee', authorizedSigner: 'fake:session-signer',
  depositBaseUnits: '20000', chargeCapBaseUnits: '8000',
  applicationDeadlineAt: T0 + 1800, voucherExpiresAt: T0 + 7200, compatibilityHash: 'fake:compatibility',
};
const clone = value => structuredClone(value);
function charge(id, amountBaseUnits, sequence, terms = TERMS) {
  return { id, amountBaseUnits, sequence, channelId: terms.channelId, runId: terms.runId,
    advertiserId: terms.advertiserId, campaignVersionId: terms.campaignVersionId,
    awardId: `fake:award:${id}`, deliveryId: `fake:render:${id}`, acceptedReceiptHash: `fake:receipt-hash:${id}`,
    acceptedAt: T0 + Number(sequence), status: 'accepted' };
}
function harness({ store = createMemoryPaymentStore(), terms = clone(TERMS), controls = {} } = {}) {
  const calls = [], records = [], commits = new Map(); let clock = T0, reserved = '0', inMutator = false;
  // Same wrapper instance is retained across adapter restart, like one local worker.
  const guarded = { get: id => store.get(id), list: () => store.list(), update(id, fn) {
    return store.update(id, state => { inMutator = true; try { return fn(state); } finally { inMutator = false; } });
  } };
  const recordCall = name => { assert.equal(inMutator, false, 'no transport call inside SQLite mutator'); calls.push(name); };
  const wire = kind => ({ wireBase64: Buffer.from(`fake-wire-${kind}`).toString('base64'), txSignature: `fake-tx-${kind}`,
    blockhash: 'fake:blockhash', lastValidBlockHeight: '12345',
    estimatedFeeAndRentLamports: controls[`${kind}Fee`] ?? '1000' });
  const openReceipt = input => ({ status: controls.openLookupStatus ?? 'finalized', finality: 'finalized', txSignature: input.signed.txSignature,
    protocolChannelId: input.plan.protocolChannelId, depositBaseUnits: terms.depositBaseUnits, ...controls.openReceipt });
  const closeReceipt = input => {
    const s = guarded.get(terms.channelId), total = s.watermark.cumulativeAmountBaseUnits;
    return { status: 'finalized', finality: 'finalized', txSignature: input.signed.txSignature, settledBaseUnits: total,
      refundBaseUnits: (20000n - BigInt(total)).toString(), publisherDeltaBaseUnits: total,
      feeAndRentLamports: '1000', ...controls.closeReceipt };
  };
  const transport = {
    evidenceLabel: 'synthetic_transport_fake',
    async prepareOpen(input) { recordCall('prepareOpen'); assert.equal(input.channelId, terms.channelId); return { protocolChannelId: 'fake:native-channel', privatePlan: 'fake-private-open-plan', estimatedFeeAndRentLamports:controls.openFee??'1000' }; },
    async signOpen() {
      recordCall('signOpen'); assert.equal(guarded.get(terms.channelId).open.status, 'signing');
      if (controls.loseOpenSign) throw Error('fake lost signing result'); return wire('open');
    },
    async submitOpen(input) {
      recordCall('submitOpen'); const saved = guarded.get(terms.channelId).open;
      assert.deepEqual(saved.signed, input.signed); assert.equal(saved.attempt.txSignature, input.signed.txSignature);
      assert.equal(saved.status, 'submitting');
      if (controls.loseOpenAck) throw Error('fake lost broadcast ack');
      return { ...openReceipt(input), ...(controls.openSubmitted ? { status: 'submitted', finality: null } : {}) };
    },
    async lookupOpen(input) { recordCall('lookupOpen'); return openReceipt(input); },
    async reserveDelivery({ charge: c }) { recordCall('reserveDelivery'); return { deliveryId: c.id, amountBaseUnits: c.amountBaseUnits, ...controls.reservation }; },
    async prepareVoucher({ intent }) {
      recordCall('prepareVoucher'); const saved = guarded.get(terms.channelId).intents.at(-1);
      assert.equal(saved.status, 'signing'); assert.equal(saved.id, intent.id);
      if (controls.loseVoucherSign) throw Error('fake lost voucher signing result');
      return { signature: `fake-voucher-signature-${intent.sequence}`, signatureType: 'ed25519', signer: terms.authorizedSigner ?? terms.payer,
        voucher: { channelId: 'fake:native-channel', cumulativeAmount: intent.cumulativeAmountBaseUnits, expiresAt: terms.voucherExpiresAt },
        ...controls.voucher };
    },
    async commitVoucher(input) {
      recordCall('commitVoucher'); const saved = guarded.get(terms.channelId).intents.at(-1);
      assert.equal(saved.status, 'commit_pending'); assert.deepEqual(saved.voucher, input.voucher);
      assert.equal(saved.attempt.voucherRecordHash, hashNetworkRecord(input.voucher));
      const receipt = { status: 'authorized', deliveryId: input.reservation.deliveryId, incrementBaseUnits: input.intent.charge.amountBaseUnits,
        cumulativeAmountBaseUnits: input.intent.cumulativeAmountBaseUnits, payloadHash: input.intent.payloadHash, ...controls.commitReceipt };
      commits.set(input.intent.charge.id, clone(receipt));
      if (controls.loseCommitAck) throw Error('fake lost commit ack'); return receipt;
    },
    async lookupCommit(input) { recordCall('lookupCommit'); return controls.commitLookup ?? commits.get(input.intent.charge.id) ?? { status: 'absent' }; },
    async prepareClose(input) {
      recordCall('prepareClose'); assert.deepEqual(input.finalVoucher, guarded.get(terms.channelId).intents.at(-1).voucher);
      assert.equal(input.watermark.cumulativeAmountBaseUnits, input.finalVoucher.voucher.cumulativeAmount);
      return { protocolChannelId: 'fake:native-channel', savedFinalVoucher: clone(input.finalVoucher), privatePlan: 'fake-private-close-plan', estimatedFeeAndRentLamports:controls.closeFee??'1000' };
    },
    async signClose({ plan }) {
      recordCall('signClose'); assert.equal(guarded.get(terms.channelId).close.status, 'signing');
      assert.deepEqual(plan.savedFinalVoucher, guarded.get(terms.channelId).intents.at(-1).voucher);
      if (controls.loseCloseSign) throw Error('fake lost tx signing result'); return wire('close');
    },
    async submitClose(input) {
      recordCall('submitClose'); const saved = guarded.get(terms.channelId).close;
      assert.deepEqual(saved.signed, input.signed); assert.equal(saved.attempt.txSignature, input.signed.txSignature);
      if (controls.loseCloseAck) throw Error('fake lost close ack'); return closeReceipt(input);
    },
    async lookupClose(input) { recordCall('lookupClose'); return closeReceipt(input); },
  };
  const options = { store: guarded, protocolTransport: transport, approvalTermsHash: hashNetworkTerms(terms), now: () => clock,
    getLedgerCharge: async id => clone(records.find(c => c.id === id)),
    getLedgerObligations: async () => ({ reservedBaseUnits: reserved,
      acceptedBaseUnits: records.reduce((n, c) => n + BigInt(c.amountBaseUnits), 0n).toString(), charges: clone(records) }) };
  let adapter = new NetworkPaymentAdapter(options);
  const h = { terms, controls, calls, records, transport, options, guarded,
    get adapter() { return adapter; }, restart() { adapter = new NetworkPaymentAdapter(options); return adapter; },
    setClock: n => { clock = n; }, setReserved: n => { reserved = n; }, count: name => calls.filter(n => n === name).length,
    add: (id, value, sequence) => { const c = charge(id, value, sequence, terms); records.push(c); return c; },
    async open() { const p = await adapter.prepareOpen(terms); return adapter.confirmOpen({ channelId: terms.channelId, planId: p.id }); },
    async authorize(id) { return adapter.authorizeCumulative({ channelId: terms.channelId, chargeId: id }); },
    async two() { await h.open(); h.add('c1', '100', '1'); h.add('c2', '250', '2'); await h.authorize('c1'); await h.authorize('c2'); },
    async close() { await adapter.beginDrain({ channelId: terms.channelId }); const p = await adapter.prepareClose({ channelId: terms.channelId }); return adapter.confirmClose({ channelId: terms.channelId, planId: p.id }); },
  };
  return h;
}
const rejects = (fn, code) => assert.rejects(fn, error => error.reasonCode === code);

test('two receipt-bound increments, exact replay, drained saved-voucher close; sanitized fake evidence', async () => {
  const h = harness(); await h.two();
  assert.equal(h.adapter.getChannel(h.terms.channelId).authorizedBaseUnits, '350');
  const first = await h.authorize('c1'); assert.equal(first.cumulativeAmountBaseUnits, '100');
  const closed = await h.close(); assert.equal(closed.status, 'finalized');
  assert.equal(closed.settledBaseUnits, '350'); assert.equal(closed.refundBaseUnits, '19650');
  assert.equal(closed.evidenceLabel, 'synthetic_transport_fake'); assert.equal(h.count('prepareVoucher'), 2);
  assert.deepEqual(await h.close().catch(() => h.adapter.reconcile({ channelId: h.terms.channelId })), closed);
  assert.equal(h.count('submitClose'), 1); assert.equal(h.count('signClose'), 1);
  const publicData = JSON.stringify([closed, first, h.adapter.getChannel(h.terms.channelId)]);
  for (const privateText of ['fake-voucher-signature', 'fake-wire', 'fake-private', 'wireBase64', 'savedFinalVoucher']) assert.equal(publicData.includes(privateText), false);
});

test('request accepted:true is not authority; missing/rejected/full-record failures never sign', async () => {
  const h = harness(); await h.open();
  await rejects(() => h.adapter.authorizeCumulative({ channelId: h.terms.channelId, chargeId: 'forged', accepted: true, amountBaseUnits: '100' }), 'charge_not_accepted');
  const c = h.add('c1', '100', '1'); c.status = 'rejected';
  await rejects(() => h.authorize('c1'), 'charge_not_accepted'); c.status = 'accepted'; delete c.acceptedReceiptHash;
  await rejects(() => h.authorize('c1'), 'charge_not_accepted'); assert.equal(h.count('prepareVoucher'), 0);
});

test('authoritative immutable bindings and request amounts cannot change on replay', async () => {
  const h = harness(); await h.open(); h.add('c1', '100', '1'); await h.authorize('c1');
  await rejects(() => h.adapter.authorizeCumulative({ channelId: h.terms.channelId, chargeId: 'c1', amountBaseUnits: '101' }), 'charge_amount_mismatch');
  h.records[0].acceptedReceiptHash = 'fake:changed'; await rejects(() => h.authorize('c1'), 'immutable_charge_changed');
  assert.equal(h.count('prepareVoucher'), 1);
});

test('per-channel async queue serializes concurrent duplicates and two ordered charges', async () => {
  const h = harness(); await h.open(); h.add('c1', '100', '1'); h.add('c2', '250', '2');
  const outcomes = await Promise.all([h.authorize('c1'), h.authorize('c1'), h.authorize('c2')]);
  assert.deepEqual(outcomes[0], outcomes[1]); assert.equal(outcomes[2].cumulativeAmountBaseUnits, '350');
  assert.equal(h.count('prepareVoucher'), 2); assert.equal(h.count('commitVoucher'), 2);
});

test('later charge cannot bypass ordered acceptance', async () => {
  const h = harness(); await h.open(); h.add('c1', '100', '1'); h.add('c2', '250', '2');
  await rejects(() => h.authorize('c2'), 'charge_sequence_mismatch'); assert.equal(h.count('prepareVoucher'), 0);
});

test('SQLite restart after lost commit acknowledgement recovers exact saved identity using lookup only', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'network-payment-fakes-')), dbPath = join(directory, 'private.sqlite');
  let store = new SQLitePaymentStore(dbPath); t.after(() => { store.close(); rmSync(directory, { recursive: true }); });
  const controls = { loseCommitAck: true }, h = harness({ store, controls }); await h.open(); h.add('c1', '100', '1');
  const unknown = await h.authorize('c1'); assert.equal(unknown.status, 'unknown');
  const saved = store.get(h.terms.channelId).intents[0]; assert.equal(saved.voucherRecordHash, hashNetworkRecord(saved.voucher));
  store.close(); store = new SQLitePaymentStore(dbPath);
  const restored = new NetworkPaymentAdapter({ ...h.options, store });
  const recovered = await restored.reconcile({ channelId: h.terms.channelId, chargeId: 'c1' });
  assert.equal(recovered.status, 'authorized'); assert.equal(recovered.voucherRecordHash, unknown.voucherRecordHash);
  assert.equal(h.count('prepareVoucher'), 1); assert.equal(h.count('commitVoucher'), 1); assert.equal(h.count('lookupCommit'), 1);
});

test('unknown/absent commit blocks further spend and close; never re-commit', async () => {
  const h = harness({ controls: { loseCommitAck: true, commitLookup: { status: 'absent' } } });
  await h.open(); h.add('c1', '100', '1'); h.add('c2', '250', '2'); await h.authorize('c1');
  assert.equal((await h.authorize('c1')).status, 'unknown'); h.restart();
  assert.equal((await h.authorize('c1')).status, 'unknown');
  await rejects(() => h.authorize('c2'), 'reconciliation_required');
  await h.adapter.beginDrain({ channelId: h.terms.channelId });
  await rejects(() => h.adapter.prepareClose({ channelId: h.terms.channelId }), 'close_not_drained');
  assert.equal(h.count('prepareVoucher'), 1); assert.equal(h.count('commitVoucher'), 1);
});

test('lost voucher signing result remains unknown across restart; no replacement signing', async () => {
  const h = harness({ controls: { loseVoucherSign: true } }); await h.open(); h.add('c1', '100', '1');
  assert.equal((await h.authorize('c1')).status, 'unknown'); h.controls.loseVoucherSign = false; h.restart();
  assert.equal((await h.authorize('c1')).status, 'unknown'); assert.equal(h.count('prepareVoucher'), 1);
  assert.equal(h.count('commitVoucher'), 0); assert.equal(h.count('lookupCommit'), 0);
});

test('lost open acknowledgement and submitted open use same signed transaction lookup only', async () => {
  for (const controls of [{ loseOpenAck: true }, { openSubmitted: true }]) {
    const h = harness({ controls }); const first = await h.open(); assert.ok(['unknown', 'submitted'].includes(first.status));
    h.restart(); const recovered = await h.adapter.confirmOpen({ channelId: h.terms.channelId, planId: first.id });
    assert.equal(recovered.status, 'finalized'); assert.equal(h.count('signOpen'), 1); assert.equal(h.count('submitOpen'), 1);
    assert.equal(h.count('lookupOpen'), 1); assert.equal(recovered.txSignature, first.txSignature);
  }
});

test('lost transaction signing result cannot broadcast or create replacement on retry', async () => {
  const h = harness({ controls: { loseOpenSign: true } }); const result = await h.open(); assert.equal(result.status, 'unknown');
  h.controls.loseOpenSign = false; h.restart();
  assert.equal((await h.adapter.confirmOpen({ channelId: h.terms.channelId, planId: result.id })).status, 'unknown');
  assert.equal(h.count('signOpen'), 1); assert.equal(h.count('submitOpen'), 0); assert.equal(h.count('lookupOpen'), 0);
});

test('lost close acknowledgement restarts and looks up same transaction, even after expiry', async () => {
  const h = harness({ controls: { loseCloseAck: true } }); await h.two(); const result = await h.close();
  assert.equal(result.status, 'unknown'); h.setClock(T0 + 8000); h.restart();
  const recovered = await h.adapter.reconcile({ channelId: h.terms.channelId, planId: result.id });
  assert.equal(recovered.status, 'finalized'); assert.equal(recovered.txSignature, result.txSignature);
  assert.equal(h.count('signClose'), 1); assert.equal(h.count('submitClose'), 1); assert.equal(h.count('prepareVoucher'), 2);
});

test('lost close signing result holds watermark; no re-signing or broadcast', async () => {
  const h = harness({ controls: { loseCloseSign: true } }); await h.two(); const result = await h.close();
  assert.equal(result.status, 'unknown'); h.controls.loseCloseSign = false; h.restart();
  assert.equal((await h.adapter.confirmClose({ channelId: h.terms.channelId, planId: result.id })).status, 'unknown');
  assert.equal(h.count('signClose'), 1); assert.equal(h.count('submitClose'), 0); assert.equal(h.count('prepareVoucher'), 2);
});

test('close requires drain, no reservations, all authorizations and unchanged frozen ledger', async () => {
  const h = harness(); await h.two();
  await rejects(() => h.adapter.prepareClose({ channelId: h.terms.channelId }), 'close_not_drained');
  await h.adapter.beginDrain({ channelId: h.terms.channelId }); h.setReserved('10');
  await rejects(() => h.adapter.prepareClose({ channelId: h.terms.channelId }), 'close_not_drained');
  h.setReserved('0'); const plan = await h.adapter.prepareClose({ channelId: h.terms.channelId });
  h.records[1].awardId = 'fake:tampered-award';
  await rejects(() => h.adapter.confirmClose({ channelId: h.terms.channelId, planId: plan.id }), 'immutable_charge_changed');
  assert.equal(h.count('signClose'), 0); assert.equal(h.count('submitClose'), 0);
});

test('fee/rent aggregate including prior preparation costs checked before either signer', async () => {
  const h = harness({ controls: { openFee: '15000000', closeFee: '6000000' } }); await h.two();
  const result = await h.close(); assert.equal(result.status, 'unknown'); assert.equal(result.reasonCode, 'fee_cap_exceeded');
  assert.equal(h.count('submitClose'), 0); h.restart();
  await h.adapter.confirmClose({ channelId: h.terms.channelId, planId: result.id }); assert.equal(h.count('signClose'), 0);
  const prior = harness({ terms: { ...TERMS, priorFeeAndRentLamports: '19999999' } });
  assert.equal((await prior.open()).reasonCode, 'fee_cap_exceeded'); assert.equal(prior.count('submitOpen'), 0); assert.equal(prior.count('signOpen'),0);
});

test('missing unsigned cost estimate never invokes a signer', async()=>{
  const h=harness();const original=h.transport.prepareOpen;h.transport.prepareOpen=async input=>{const plan=await original(input);delete plan.estimatedFeeAndRentLamports;return plan;};
  assert.equal((await h.open()).status,'unknown');assert.equal(h.count('signOpen'),0);assert.equal(h.count('submitOpen'),0);
});

test('wrong reservation/native voucher fields and exact undercommit/overcommit receipts fail closed', async () => {
  const cases = [
    { reservation: { amountBaseUnits: '99' } }, { reservation: { deliveryId: 'other' } },
    { voucher: { signer: 'wrong-signer' } },
    { voucher: { voucher: { channelId: 'wrong-channel', cumulativeAmount: '100', expiresAt: TERMS.voucherExpiresAt } } },
    { voucher: { voucher: { channelId: 'fake:native-channel', cumulativeAmount: '101', expiresAt: TERMS.voucherExpiresAt } } },
    { voucher: { voucher: { channelId: 'fake:native-channel', cumulativeAmount: '100', expiresAt: T0 } } },
    { commitReceipt: { incrementBaseUnits: '99' } }, { commitReceipt: { incrementBaseUnits: '101' } },
    { commitReceipt: { cumulativeAmountBaseUnits: '101' } }, { commitReceipt: { payloadHash: 'bad' } },
  ];
  for (const controls of cases) {
    const h = harness({ controls }); await h.open(); h.add('c1', '100', '1');
    assert.equal((await h.authorize('c1')).status, 'unknown'); assert.equal(h.adapter.getChannel(h.terms.channelId).authorizedBaseUnits, '0');
    if (controls.voucher || controls.reservation) assert.equal(h.count('commitVoucher'), 0);
  }
});

test('finalized label alone is insufficient: tx identity, deposit, finality and settlement conservation checked', async () => {
  for (const openReceipt of [{ txSignature: 'wrong' }, { depositBaseUnits: '19999' }, { finality: 'confirmed' }]) {
    const h = harness({ controls: { openReceipt } }); assert.equal((await h.open()).status, 'unknown');
    assert.equal(h.adapter.getChannel(h.terms.channelId).phase, 'pending_open');
  }
  for (const closeReceipt of [{ settledBaseUnits: '351' }, { refundBaseUnits: '19649' }, { publisherDeltaBaseUnits: '349' }, { feeAndRentLamports: '1001' }]) {
    const h = harness({ controls: { closeReceipt } }); await h.two(); assert.equal((await h.close()).status, 'unknown');
    assert.equal(h.adapter.getChannel(h.terms.channelId).settledBaseUnits, '0');
  }
});

test('frozen approval rejects changed RPC/recipient/compatibility; no mainnet mode or oversized caps', async () => {
  const h = harness();
  for (const change of [{ rpc: 'https://different.example' }, { payee: 'different' }, { compatibilityHash: 'different' }]) {
    await rejects(() => h.adapter.prepareOpen({ ...h.terms, ...change }), 'approval_terms_mismatch');
  }
  const mainnet = harness({ terms: { ...TERMS, mode: 'mainnet' } }); await rejects(() => mainnet.adapter.prepareOpen(mainnet.terms), 'network_not_allowed');
  const large = harness({ terms: { ...TERMS, depositBaseUnits: '20001' } }); await rejects(() => large.adapter.prepareOpen(large.terms), 'cap_exceeded');
  assert.equal(h.calls.length, 0);
});

test('charge count, per-placement ceiling, arithmetic and immutable channel bindings are bounded', async () => {
  const huge = harness(); await huge.open(); huge.add('c1', '4001', '1'); await rejects(() => huge.authorize('c1'), 'cap_exceeded');
  const extra = harness(); await extra.two(); extra.add('c3', '1', '3'); await rejects(() => extra.authorize('c3'), 'ledger_invalid');
  const mismatch = harness(); await mismatch.open(); mismatch.add('c1', '100', '1').campaignVersionId = 'other';
  await rejects(() => mismatch.authorize('c1'), 'charge_terms_mismatch');
  const malformed = harness(); await malformed.open(); malformed.add('c1', '1.2', '1');
  await assert.rejects(() => malformed.authorize('c1')); assert.equal(malformed.count('prepareVoucher'), 0);
});

test('expiry/deadline prevents new signing; no voucher refresh at close', async () => {
  const h = harness(); await h.two(); h.setClock(TERMS.applicationDeadlineAt);
  await h.adapter.beginDrain({ channelId: h.terms.channelId });
  await rejects(() => h.adapter.prepareClose({ channelId: h.terms.channelId }), 'application_deadline');
  assert.equal(h.count('prepareVoucher'), 2); assert.equal(h.count('signClose'), 0);
});

test('failed transaction is terminal; duplicate prepares and wrong plan IDs never re-sign', async () => {
  const h = harness({ controls: { openReceipt: { status: 'failed' } } }); const failed = await h.open();
  assert.equal(failed.status, 'failed'); assert.equal((await h.adapter.prepareOpen(h.terms)).id, failed.id);
  assert.equal((await h.adapter.confirmOpen({ channelId: h.terms.channelId, planId: failed.id })).status, 'failed');
  await rejects(() => h.adapter.confirmOpen({ channelId: h.terms.channelId, planId: 'wrong' }), 'plan_mismatch');
  assert.equal(h.count('prepareOpen'), 1); assert.equal(h.count('signOpen'), 1); assert.equal(h.count('submitOpen'), 1);
});

test('optional native payload hash retained separately from exact signed-object identity', async () => {
  const nativeHash = 'a'.repeat(64), h = harness({ controls: { voucher: { payloadHash: nativeHash } } });
  await h.open(); h.add('c1', '100', '1'); const result = await h.authorize('c1');
  assert.equal(result.payloadHash, nativeHash); assert.notEqual(result.voucherRecordHash, nativeHash);
  assert.equal(result.status, 'authorized');
});
