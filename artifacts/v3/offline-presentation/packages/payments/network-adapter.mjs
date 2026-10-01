import { createHash } from 'node:crypto';

/**
 * Server-only Phase4 bridge; no SDK, RPC, key loading or signing implementation.
 * Main supplies {store, protocolTransport, getLedgerCharge, getLedgerObligations,
 * approvalTermsHash, now?}. Approval is a constructor capability, NEVER a request
 * boolean. Main must approve exact RPC/host/network/deployment before constructing.
 * Store: synchronous atomic get/list/update; one worker, no async SQL mutators.
 * Terms: channelId, mode=sandbox|devnet, runId, advertiserId, campaignVersionId,
 * rpc, network, genesisHash, program, mint, tokenProgram, payer, payee,
 * depositBaseUnits='20000', chargeCapBaseUnits='8000', voucherExpiresAt,
 * applicationDeadlineAt, compatibilityHash; authorizedSigner defaults to payer.
 * Times are integer Unix seconds. Optional settlementMarginSeconds defaults to60.
 * Main includes already-consumed preparation costs in priorFeeAndRentLamports
 * (default '0'); no other fee-bearing operations may run outside its run budget.
 * Authoritative charge: id, channelId, runId, advertiserId, campaignVersionId,
 * sequence (decimal string), amountBaseUnits, awardId, deliveryId,
 * acceptedReceiptHash, acceptedAt, status (accepted or a later charge phase).
 * Obligations: {reservedBaseUnits, acceptedBaseUnits, charges:[ordered full refs]}.
 * Provider must serialize receipt admission/drain/freeze in MAIN's ledger. This
 * adapter cannot lock that separate ledger; changed frozen obligations fail closed.
 * Transport (async): prepareOpen(terms); signOpen({terms,plan});
 * submitOpen/lookupOpen({terms,plan,signed}); reserveDelivery({terms,channel,charge});
 * prepareVoucher/commitVoucher/lookupCommit({terms,channel,intent,reservation,voucher?});
 * prepareClose({terms,channel,finalVoucher,watermark}); signClose({terms,plan});
 * submitClose/lookupClose({terms,plan,signed}). signClose signs a TX, not a voucher.
 * Open/close plans require an unsigned estimatedFeeAndRentLamports before signing.
 * Open plan requires protocolChannelId. Signed TX requires wireBase64, txSignature,
 * blockhash, lastValidBlockHeight, estimatedFeeAndRentLamports (decimal string).
 * Native voucher: {signature,signatureType:'ed25519',signer,voucher:{channelId,
 * cumulativeAmount,expiresAt}}. Optional payloadHash is MAIN's native-byte hash;
 * otherwise commit payloadHash MUST equal hashNetworkRecord(the signed object).
 * An independent voucherRecordHash always binds the exact persisted object.
 * Transport owns native encoding/signature validation and finalized chain/balance
 * verification. TX receipts status=submitted|finalized|failed|unknown; finalized
 * requires finality='finalized'. Open binds protocolChannelId/depositBaseUnits;
 * close binds settledBaseUnits/refundBaseUnits/publisherDeltaBaseUnits and
 * feeAndRentLamports (cost of this close attempt, NOT cumulative run cost).
 * Private plans/wires/vouchers stay in store. Method results are safe projections.
 * Tests use evidenceLabel='synthetic_transport_fake'; not native payment evidence.
 */

const VERSION = 'axp.network-payment-adapter.v1';
const U64 = (1n << 64n) - 1n;
const FEE_CAP = 20_000_000n;
const queues = new WeakMap();
const copy = value => structuredClone(value);
export class NetworkPaymentError extends Error {
  constructor(reasonCode) { super(reasonCode); this.name = 'NetworkPaymentError'; this.reasonCode = reasonCode; }
}
const fail = reason => { throw new NetworkPaymentError(reason); };
const check = (condition, reason) => { if (!condition) fail(reason); };
const text = value => typeof value === 'string' && value.length > 0;
function amount(value) {
  check(typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value), 'amount_invalid');
  const n = BigInt(value); check(n <= U64, 'amount_overflow'); return n;
}
function canonical(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') { check(Number.isSafeInteger(value), 'record_invalid'); return JSON.stringify(value); }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  check(value && Object.getPrototypeOf(value) === Object.prototype, 'record_invalid');
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
}
export const hashNetworkRecord = value => createHash('sha256').update(canonical(value)).digest('hex');
export const hashNetworkTerms = hashNetworkRecord;
function immutableCharge(charge) {
  const result = copy(charge); delete result.status; return result;
}
const chargeHash = charge => hashNetworkRecord(immutableCharge(charge));

export class NetworkPaymentAdapter {
  constructor({ store, protocolTransport, getLedgerCharge, getLedgerObligations, approvalTermsHash, beforeSigning = async () => {}, now = () => Math.floor(Date.now() / 1000) }) {
    check(store && ['get', 'list', 'update'].every(k => typeof store[k] === 'function'), 'durable_store_required');
    check(protocolTransport && ['prepareOpen', 'signOpen', 'submitOpen', 'lookupOpen', 'reserveDelivery', 'prepareVoucher', 'commitVoucher', 'lookupCommit', 'prepareClose', 'signClose', 'submitClose', 'lookupClose'].every(k => typeof protocolTransport[k] === 'function'), 'transport_required');
    check(typeof getLedgerCharge === 'function' && typeof getLedgerObligations === 'function', 'ledger_provider_required');
    check(typeof approvalTermsHash === 'string' && /^[a-f0-9]{64}$/.test(approvalTermsHash), 'approval_missing');
    this.store = store; this.transport = protocolTransport; this.getLedgerCharge = getLedgerCharge;
    this.getLedgerObligations = getLedgerObligations; this.approvalTermsHash = approvalTermsHash; this.now = now;
    this.evidenceLabel = protocolTransport.evidenceLabel ?? 'injected_transport';
    check(typeof beforeSigning === 'function', 'signing_guard_invalid'); this.beforeSigning = beforeSigning;
    if (!queues.has(store)) queues.set(store, new Map());
  }
  _queue(id, fn) {
    const q = queues.get(this.store), previous = q.get(id) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(fn); q.set(id, next);
    void next.finally(() => { if (q.get(id) === next) q.delete(id); }).catch(() => {});
    return next;
  }
  _read(id) {
    const s = this.store.get(id); check(s && s.adapterVersion === VERSION, 'channel_not_found');
    check(s.termsHash === hashNetworkTerms(s.terms) && s.termsHash === this.approvalTermsHash, 'terms_mismatch');
    return s;
  }
  _update(id, fn) { return this.store.update(id, s => { check(s?.adapterVersion === VERSION, 'channel_not_found'); fn(s); return s; }); }
  _time() { const n = this.now(); check(Number.isSafeInteger(n) && n >= 0, 'clock_invalid'); return n; }
  _signingAllowed(s) {
    check(this._time() < s.terms.applicationDeadlineAt, 'application_deadline');
    check(s.terms.voucherExpiresAt > this._time() + (s.terms.settlementMarginSeconds ?? 60), 'voucher_expired');
  }
  _terms(terms) {
    hashNetworkTerms(terms);
    check(['devnet', 'sandbox'].includes(terms.mode), 'network_not_allowed');
    for (const k of ['channelId', 'runId', 'advertiserId', 'campaignVersionId', 'rpc', 'network', 'genesisHash', 'program', 'mint', 'tokenProgram', 'payer', 'payee', 'compatibilityHash']) check(text(terms[k]), 'terms_invalid');
    const rpc = new URL(terms.rpc);
    check(rpc.protocol === 'https:' && !rpc.username && !rpc.password && !rpc.hash, 'network_not_allowed');
    check(terms.network !== 'mainnet' && terms.network !== 'mainnet-beta' && terms.payer !== terms.payee, 'network_not_allowed');
    check(terms.depositBaseUnits === '20000' && amount(terms.chargeCapBaseUnits) > 0n && amount(terms.chargeCapBaseUnits) <= 8000n, 'cap_exceeded');
    for (const k of ['voucherExpiresAt', 'applicationDeadlineAt']) check(Number.isSafeInteger(terms[k]) && terms[k] > this._time(), 'terms_invalid');
    check(terms.voucherExpiresAt > terms.applicationDeadlineAt, 'terms_invalid');
    if (terms.settlementMarginSeconds !== undefined) check(Number.isSafeInteger(terms.settlementMarginSeconds) && terms.settlementMarginSeconds >= 60, 'terms_invalid');
    if (terms.authorizedSigner !== undefined) check(text(terms.authorizedSigner), 'terms_invalid');
    if (terms.priorFeeAndRentLamports !== undefined) check(amount(terms.priorFeeAndRentLamports) <= FEE_CAP, 'fee_cap_exceeded');
    check(hashNetworkTerms(terms) === this.approvalTermsHash, 'approval_terms_mismatch');
    return copy(terms);
  }
  _operationResult(s, kind) {
    const op = s[kind];
    return { id: op.id, planId: op.id, channelId: s.channelId, protocolChannelId: s.protocolChannelId ?? null,
      mode: s.terms.mode, evidenceLabel: this.evidenceLabel, termsHash: s.termsHash,
      status: ['prepared', 'signed_persisted', 'submitted', 'finalized', 'failed'].includes(op.status) ? op.status : 'unknown',
      reasonCode: op.reasonCode ?? null, txSignature: op.signed?.txSignature ?? null,
      finality: op.receipt?.finality ?? null,
      ...(kind === 'close' && op.status === 'finalized' ? { settledBaseUnits: op.receipt.settledBaseUnits,
        refundBaseUnits: op.receipt.refundBaseUnits, publisherDeltaBaseUnits: op.receipt.publisherDeltaBaseUnits,
        feeAndRentLamports: op.receipt.feeAndRentLamports } : {}) };
  }
  getChannel(channelId) {
    const s = this._read(typeof channelId === 'object' ? channelId.channelId : channelId);
    return { channelId: s.channelId, protocolChannelId: s.protocolChannelId ?? null, runId: s.terms.runId,
      mode: s.terms.mode, evidenceLabel: this.evidenceLabel, phase: s.phase, termsHash: s.termsHash,
      depositBaseUnits: s.phase === 'pending_open' ? '0' : s.terms.depositBaseUnits,
      authorizedBaseUnits: s.authorizedBaseUnits, acceptedBaseUnits: s.acceptedBaseUnits,
      settledBaseUnits: s.close?.status === 'finalized' ? s.close.receipt.settledBaseUnits : '0',
      refundBaseUnits: s.close?.status === 'finalized' ? s.close.receipt.refundBaseUnits : '0',
      estimatedFeeAndRentLamports: s.feeReservedLamports,
      openStatus: s.open.status, closeStatus: s.close?.status ?? null,
      reconciliationRequired: ['unknown', 'submitted', 'signing', 'sign_unknown', 'submitting'].includes(s.open.status)
        || (s.close && ['unknown', 'submitted', 'signing', 'sign_unknown', 'submitting'].includes(s.close.status))
        || s.intents.some(i => i.status !== 'authorized') };
  }
  prepareOpen(terms) {
    return this._queue(terms.channelId, async () => {
      const frozen = this._terms(terms), id = terms.channelId, existing = this.store.get(id);
      if (existing) { const s = this._read(id); check(s.termsHash === hashNetworkTerms(frozen), 'terms_mismatch'); return this._operationResult(s, 'open'); }
      const termsHash = hashNetworkTerms(frozen);
      this.store.update(id, () => ({ schemaVersion: 1, adapterVersion: VERSION, channelId: id, terms: frozen, termsHash,
        phase: 'pending_open', authorizedBaseUnits: '0', acceptedBaseUnits: '0', feeReservedLamports: frozen.priorFeeAndRentLamports ?? '0', intents: [],
        open: { id: `open:${termsHash}`, status: 'preparing', plan: null, signed: null, receipt: null } }));
      try {
        const plan = copy(await this.transport.prepareOpen(copy(frozen))); hashNetworkRecord(plan);
        check(text(plan.protocolChannelId), 'plan_invalid');
        if (plan.estimatedFeeAndRentLamports !== undefined) check(amount(plan.estimatedFeeAndRentLamports) <= FEE_CAP, 'fee_cap_exceeded');
        this._update(id, s => { s.protocolChannelId = plan.protocolChannelId; s.open.plan = plan; s.open.status = 'prepared'; });
      } catch (e) { this._update(id, s => { s.open.status = 'unknown'; s.open.reasonCode = e.reasonCode ?? 'prepare_unknown'; }); }
      return this._operationResult(this._read(id), 'open');
    });
  }
  confirmOpen({ channelId, planId }) { return this._queue(channelId, () => this._confirmTx(channelId, 'open', planId)); }
  confirmClose({ channelId, planId }) { return this._queue(channelId, () => this._confirmTx(channelId, 'close', planId)); }
  _txInput(s, kind) { return { terms: copy(s.terms), plan: copy(s[kind].plan), signed: copy(s[kind].signed) }; }
  _validateSigned(s, signed) {
    check(text(signed.wireBase64) && Buffer.from(signed.wireBase64, 'base64').toString('base64') === signed.wireBase64 && text(signed.txSignature) && text(signed.blockhash), 'signed_transaction_invalid');
    check((Number.isSafeInteger(signed.lastValidBlockHeight) && signed.lastValidBlockHeight > 0)
      || (typeof signed.lastValidBlockHeight === 'string' && amount(signed.lastValidBlockHeight) > 0n), 'signed_transaction_invalid');
    check(amount(s.feeReservedLamports) + amount(signed.estimatedFeeAndRentLamports) <= FEE_CAP, 'fee_cap_exceeded');
  }
  async _confirmTx(id, kind, planId) {
    let s = this._read(id), op = s[kind]; check(op && op.id === planId, 'plan_mismatch');
    if (['finalized', 'failed'].includes(op.status)) return this._operationResult(s, kind);
    if (op.status !== 'prepared' && op.status !== 'signed_persisted') return this._lookupTx(id, kind);
    this._signingAllowed(s);
    if (kind === 'close') await this._assertFrozen(s);
    if (op.status === 'prepared') {
      // Unsigned expiry is a recoverable operator blocker, not a signing outcome.
      // Never refresh a signed or uncertain transaction identity automatically.
      if(typeof this.transport.assertPlanFresh==='function')await this.transport.assertPlanFresh({terms:copy(s.terms),plan:copy(op.plan),kind});
      // Fail closed before invoking a key-bearing signer, including prior costs.
      try { check(amount(s.feeReservedLamports) + amount(op.plan.estimatedFeeAndRentLamports) <= FEE_CAP, 'fee_cap_exceeded'); }
      catch (e) { this._update(id, r => { r[kind].status = 'unknown'; r[kind].reasonCode = e.reasonCode ?? 'fee_estimate_missing'; }); return this._operationResult(this._read(id), kind); }
      // An unsigned capability/budget failure must retain the prepared identity.
      await this.beforeSigning({ channelId: id, operation: kind });
      this._update(id, r => { r[kind].status = 'signing'; });
      try {
        const signed = copy(await this.transport[kind === 'open' ? 'signOpen' : 'signClose']({ terms: copy(s.terms), plan: copy(op.plan) }));
        hashNetworkRecord(signed);
        // Retain even a malformed signer result privately; never regenerate it.
        this._update(id, r => { r[kind].signed = signed; r[kind].signedRecordHash = hashNetworkRecord(signed); r[kind].status = 'signed_unchecked'; });
        this._validateSigned(s, signed);
        check(signed.estimatedFeeAndRentLamports === op.plan.estimatedFeeAndRentLamports, 'fee_estimate_changed');
        this._update(id, r => { r.feeReservedLamports = (amount(r.feeReservedLamports) + amount(signed.estimatedFeeAndRentLamports)).toString(); r[kind].status = 'signed_persisted'; });
      } catch (e) {
        this._update(id, r => { r[kind].status = 'sign_unknown'; r[kind].reasonCode = e.reasonCode ?? 'signature_unavailable'; });
        return this._operationResult(this._read(id), kind);
      }
    }
    s = this._read(id); this._signingAllowed(s);
    check(s[kind].signedRecordHash === hashNetworkRecord(s[kind].signed), 'transaction_identity_mismatch');
    if (kind === 'close') await this._assertFrozen(s);
    // The saved wire identity and attempt become durable BEFORE any submission.
    this._update(id, r => { r[kind].status = 'submitting'; r[kind].attempt = { txSignature: r[kind].signed.txSignature, signedRecordHash: r[kind].signedRecordHash }; });
    try { await this._txReceipt(id, kind, await this.transport[kind === 'open' ? 'submitOpen' : 'submitClose'](this._txInput(this._read(id), kind))); }
    catch (e) { this._update(id, r => { r[kind].status = 'unknown'; r[kind].reasonCode = e.reasonCode ?? 'submission_unknown'; }); }
    return this._operationResult(this._read(id), kind);
  }
  async _lookupTx(id, kind) {
    const s = this._read(id), op = s[kind];
    if (['finalized', 'failed'].includes(op.status)) return this._operationResult(s, kind);
    if (!op.attempt || !op.signed || op.status === 'sign_unknown') {
      return { ...this._operationResult(s, kind), status: 'unknown', reasonCode: op.reasonCode ?? 'signature_unavailable' };
    }
    try { await this._txReceipt(id, kind, await this.transport[kind === 'open' ? 'lookupOpen' : 'lookupClose'](this._txInput(s, kind))); }
    catch (e) { this._update(id, r => { r[kind].status = 'unknown'; r[kind].reasonCode = e.reasonCode ?? 'lookup_unknown'; }); }
    return this._operationResult(this._read(id), kind);
  }
  async _txReceipt(id, kind, receipt) {
    const s = this._read(id), op = s[kind]; hashNetworkRecord(receipt);
    check(['submitted', 'finalized', 'failed', 'unknown'].includes(receipt.status), 'receipt_invalid');
    if (receipt.txSignature !== undefined) check(receipt.txSignature === op.signed.txSignature, 'transaction_identity_mismatch');
    if (receipt.status !== 'unknown') check(receipt.txSignature === op.signed.txSignature, 'transaction_identity_mismatch');
    if (kind === 'open') {
      if (receipt.protocolChannelId !== undefined) check(receipt.protocolChannelId === s.protocolChannelId, 'terms_mismatch');
      if (receipt.depositBaseUnits !== undefined) check(receipt.depositBaseUnits === s.terms.depositBaseUnits, 'deposit_mismatch');
    }
    if (receipt.status === 'finalized') {
      check(receipt.finality === 'finalized', 'finality_unverified');
      if (kind === 'open') check(receipt.protocolChannelId === s.protocolChannelId && receipt.depositBaseUnits === s.terms.depositBaseUnits, 'deposit_mismatch');
      else {
        await this._assertFrozen(s);
        check(receipt.settledBaseUnits === s.watermark.cumulativeAmountBaseUnits && receipt.publisherDeltaBaseUnits === receipt.settledBaseUnits
          && amount(receipt.refundBaseUnits) + amount(receipt.settledBaseUnits) === amount(s.terms.depositBaseUnits), 'settlement_amount_mismatch');
        check(amount(receipt.feeAndRentLamports) <= amount(op.signed.estimatedFeeAndRentLamports), 'fee_cap_exceeded');
      }
    }
    this._update(id, r => { r[kind].receipt = copy(receipt); r[kind].status = receipt.status; r[kind].reasonCode = null;
      if (receipt.status === 'finalized') r.phase = kind === 'open' ? 'open' : 'finalized'; });
  }
  async _charge(s, id) {
    const charge = copy(await this.getLedgerCharge(id));
    check(charge && charge.id === id && ['accepted', 'authorization_pending', 'authorized', 'settlement_pending', 'settled'].includes(charge.status), 'charge_not_accepted');
    for (const k of ['channelId', 'runId', 'advertiserId', 'campaignVersionId']) check(charge[k] === s.terms[k], 'charge_terms_mismatch');
    for (const k of ['awardId', 'deliveryId', 'acceptedReceiptHash']) check(text(charge[k]), 'charge_not_accepted');
    check(charge.acceptedAt !== undefined && amount(charge.sequence) > 0n && amount(charge.amountBaseUnits) > 0n, 'charge_invalid');
    check(amount(charge.amountBaseUnits) <= amount(s.terms.maxBidBaseUnits ?? '4000'), 'cap_exceeded');
    for (const k of ['mode', 'mint', 'payee', 'payer']) if (charge[k] !== undefined) check(charge[k] === s.terms[k], 'charge_terms_mismatch');
    chargeHash(charge); return charge;
  }
  async _ledger(s) {
    const obligations = copy(await this.getLedgerObligations(s.channelId));
    check(obligations && Array.isArray(obligations.charges) && obligations.charges.length <= (s.terms.maxCharges ?? 2), 'ledger_invalid');
    const charges = []; let total = 0n;
    for (const ref of obligations.charges) {
      const charge = await this._charge(s, ref.id);
      check(charge.sequence === String(charges.length + 1) && chargeHash(ref) === chargeHash(charge), 'ledger_inconsistent');
      total += amount(charge.amountBaseUnits); charges.push(charge);
    }
    check(total === amount(obligations.acceptedBaseUnits), 'ledger_inconsistent');
    check(total + amount(obligations.reservedBaseUnits) <= amount(s.terms.chargeCapBaseUnits), 'cap_exceeded');
    for (const i of s.intents) check(charges.some(c => c.id === i.charge.id && chargeHash(c) === i.chargeHash), 'immutable_charge_changed');
    return { charges, acceptedBaseUnits: total.toString(), reservedBaseUnits: obligations.reservedBaseUnits };
  }
  _intentResult(s, i) {
    return { channelId: s.channelId, chargeId: i.charge.id, intentId: i.id, status: i.status === 'authorized' ? 'authorized' : 'unknown',
      mode: s.terms.mode, evidenceLabel: this.evidenceLabel, reasonCode: i.reasonCode ?? null,
      deliveryId: i.charge.id, sequence: i.sequence, incrementBaseUnits: i.charge.amountBaseUnits,
      previousAmountBaseUnits: i.previousAmountBaseUnits, cumulativeAmountBaseUnits: i.cumulativeAmountBaseUnits,
      payloadHash: i.payloadHash ?? null, voucherRecordHash: i.voucherRecordHash ?? null };
  }
  lookupAuthorization({ channelId, chargeId }) {
    const s = this._read(channelId), i = s.intents.find(i => i.charge.id === chargeId);
    return i ? this._intentResult(s, i) : { channelId, chargeId, status: 'absent', mode: s.terms.mode, evidenceLabel: this.evidenceLabel };
  }
  _intentUpdate(id, chargeId, fn) { return this._update(id, s => fn(s.intents.find(i => i.charge.id === chargeId), s)); }
  _commitInput(s, i) { return { terms: copy(s.terms), channel: { channelId: s.channelId, protocolChannelId: s.protocolChannelId }, intent: copy(i), reservation: copy(i.reservation), voucher: copy(i.voucher) }; }
  authorizeCumulative({ channelId, chargeId, amountBaseUnits }) {
    return this._queue(channelId, async () => {
      let s = this._read(channelId); const ledger = await this._ledger(s), charge = await this._charge(s, chargeId);
      const at = ledger.charges.findIndex(c => c.id === chargeId); check(at >= 0, 'charge_not_accepted');
      check(amountBaseUnits === undefined || amountBaseUnits === charge.amountBaseUnits, 'charge_amount_mismatch');
      let intent = s.intents.find(i => i.charge.id === chargeId);
      if (intent) return intent.status === 'authorized' ? this._intentResult(s, intent) : this._lookupCommit(channelId, chargeId);
      check(['open', 'draining'].includes(s.phase) && s.open.status === 'finalized', 'channel_unavailable');
      check(!s.close && s.intents.every(i => i.status === 'authorized'), 'reconciliation_required');
      check(at === s.intents.length, 'charge_sequence_mismatch'); this._signingAllowed(s);
      const target = (amount(s.authorizedBaseUnits) + amount(charge.amountBaseUnits)).toString();
      check(amount(target) <= amount(s.terms.chargeCapBaseUnits), 'cap_exceeded');
      await this.beforeSigning({ channelId, operation: 'voucher' });
      intent = { id: `voucher:${hashNetworkRecord({ termsHash: s.termsHash, chargeHash: chargeHash(charge) })}`, charge: copy(charge), chargeHash: chargeHash(charge),
        sequence: charge.sequence, status: 'prepared', previousAmountBaseUnits: s.authorizedBaseUnits,
        cumulativeAmountBaseUnits: target, expiresAt: s.terms.voucherExpiresAt, reservation: null, voucher: null };
      this._update(channelId, r => { r.acceptedBaseUnits = ledger.acceptedBaseUnits; r.intents.push(intent); });
      try {
        this._intentUpdate(channelId, chargeId, i => { i.status = 'reserving'; });
        const reservation = copy(await this.transport.reserveDelivery({ terms: copy(s.terms), channel: { channelId, protocolChannelId: s.protocolChannelId }, charge: copy(charge) }));
        hashNetworkRecord(reservation);
        check(reservation.deliveryId === chargeId && reservation.amountBaseUnits === charge.amountBaseUnits, 'reservation_mismatch');
        this._intentUpdate(channelId, chargeId, i => { i.reservation = reservation; i.status = 'signing'; });
        s = this._read(channelId); await this._ledger(s); this._signingAllowed(s);
        await this.beforeSigning({ channelId, operation: 'voucher' });
        const voucher = copy(await this.transport.prepareVoucher(this._commitInput(s, s.intents.at(-1))));
        const recordHash = hashNetworkRecord(voucher);
        this._intentUpdate(channelId, chargeId, i => { i.voucher = voucher; i.voucherRecordHash = recordHash; i.status = 'signed_unchecked'; });
        check(voucher.signatureType === 'ed25519' && text(voucher.signature) && voucher.signer === (s.terms.authorizedSigner ?? s.terms.payer)
          && voucher.voucher?.channelId === s.protocolChannelId && voucher.voucher?.cumulativeAmount === target
          && voucher.voucher?.expiresAt === s.terms.voucherExpiresAt, 'voucher_invalid');
        const payloadHash = voucher.payloadHash ?? recordHash;
        check(typeof payloadHash === 'string' && /^[a-f0-9]{64}$/.test(payloadHash), 'voucher_invalid');
        this._intentUpdate(channelId, chargeId, i => { i.payloadHash = payloadHash; i.status = 'signed_persisted'; });
        s = this._read(channelId); await this._ledger(s); this._signingAllowed(s);
        this._intentUpdate(channelId, chargeId, i => { i.status = 'commit_pending'; i.attempt = { intentId: i.id, deliveryId: chargeId, voucherRecordHash: i.voucherRecordHash }; });
        s = this._read(channelId);
        this._commitReceipt(channelId, chargeId, await this.transport.commitVoucher(this._commitInput(s, s.intents.at(-1))));
      } catch (e) { this._intentUpdate(channelId, chargeId, i => { i.status = 'unknown'; i.reasonCode = e.reasonCode ?? 'authorization_unknown'; }); }
      s = this._read(channelId); return this._intentResult(s, s.intents.find(i => i.charge.id === chargeId));
    });
  }
  _commitReceipt(id, chargeId, receipt) {
    const s = this._read(id), i = s.intents.find(i => i.charge.id === chargeId); hashNetworkRecord(receipt);
    check(receipt.status === 'authorized' && receipt.deliveryId === chargeId && receipt.incrementBaseUnits === i.charge.amountBaseUnits
      && receipt.cumulativeAmountBaseUnits === i.cumulativeAmountBaseUnits && receipt.payloadHash === i.payloadHash, 'commit_receipt_mismatch');
    check(i.voucherRecordHash === hashNetworkRecord(i.voucher), 'voucher_identity_mismatch');
    this._intentUpdate(id, chargeId, (intent, r) => { intent.status = 'authorized'; intent.reasonCode = null; intent.receipt = copy(receipt); r.authorizedBaseUnits = intent.cumulativeAmountBaseUnits; });
  }
  async _lookupCommit(id, chargeId) {
    let s = this._read(id), i = s.intents.find(i => i.charge.id === chargeId); check(i, 'authorization_not_found');
    if (i.status === 'authorized') return this._intentResult(s, i);
    await this._ledger(s);
    // Signing result lost or failed validation: no new signing, reserve or commit.
    if (!i.voucher || !i.reservation || !i.payloadHash) return this._intentResult(s, i);
    try { this._commitReceipt(id, chargeId, await this.transport.lookupCommit(this._commitInput(s, i))); }
    catch (e) { this._intentUpdate(id, chargeId, intent => { intent.status = 'unknown'; intent.reasonCode = e.reasonCode ?? 'commit_unknown'; }); }
    s = this._read(id); return this._intentResult(s, s.intents.find(i => i.charge.id === chargeId));
  }
  beginDrain({ channelId }) {
    return this._queue(channelId, () => { const s = this._read(channelId); check(['open', 'draining'].includes(s.phase), 'channel_unavailable');
      this._update(channelId, r => { r.phase = 'draining'; }); return this.getChannel(channelId); });
  }
  async _assertFrozen(s) {
    const ledger = await this._ledger(s);
    check(ledger.reservedBaseUnits === '0' && ledger.acceptedBaseUnits === s.watermark.cumulativeAmountBaseUnits
      && hashNetworkRecord(ledger.charges.map(chargeHash)) === s.watermark.orderedChargeCommitment, 'close_not_drained');
    const final = s.intents.at(-1);
    if (s.terms.zeroChargeClose === true && s.watermark.cumulativeAmountBaseUnits === '0') {
      check(ledger.charges.length === 0 && s.intents.length === 0 && s.authorizedBaseUnits === '0'
        && s.watermark.sequence === '0' && s.watermark.finalVoucherHash === null, 'voucher_identity_mismatch');
      return;
    }
    check(final?.status === 'authorized' && final.voucherRecordHash === s.watermark.finalVoucherHash
      && final.voucherRecordHash === hashNetworkRecord(final.voucher), 'voucher_identity_mismatch');
  }
  prepareClose({ channelId }) {
    return this._queue(channelId, async () => {
      const s = this._read(channelId); if (s.close) { await this._assertFrozen(s); return this._operationResult(s, 'close'); }
      check(s.phase === 'draining', 'close_not_drained'); this._signingAllowed(s);
      const ledger = await this._ledger(s), final = s.intents.at(-1);
      check(ledger.reservedBaseUnits === '0' && (ledger.charges.length > 0 || s.terms.zeroChargeClose === true) && ledger.charges.length === s.intents.length
        && s.intents.every(i => i.status === 'authorized') && ledger.acceptedBaseUnits === s.authorizedBaseUnits, 'close_not_drained');
      const watermark = { sequence: final?.sequence ?? '0', cumulativeAmountBaseUnits: s.authorizedBaseUnits,
        orderedChargeCommitment: hashNetworkRecord(ledger.charges.map(chargeHash)), finalVoucherHash: final?.voucherRecordHash ?? null };
      const planId = `close:${hashNetworkRecord({ termsHash: s.termsHash, watermark })}`;
      this._update(channelId, r => { r.watermark = watermark; r.phase = 'closing'; r.close = { id: planId, status: 'preparing', plan: null, signed: null, receipt: null }; });
      try {
        const plan = copy(await this.transport.prepareClose({ terms: copy(s.terms), channel: { channelId, protocolChannelId: s.protocolChannelId }, ...(final ? { finalVoucher: copy(final.voucher) } : {}), watermark: copy(watermark) }));
        hashNetworkRecord(plan);
        if (plan.protocolChannelId !== undefined) check(plan.protocolChannelId === s.protocolChannelId, 'terms_mismatch');
        if (plan.estimatedFeeAndRentLamports !== undefined) check(amount(s.feeReservedLamports) + amount(plan.estimatedFeeAndRentLamports) <= FEE_CAP, 'fee_cap_exceeded');
        this._update(channelId, r => { r.close.plan = plan; r.close.status = 'prepared'; });
      } catch (e) { this._update(channelId, r => { r.close.status = 'unknown'; r.close.reasonCode = e.reasonCode ?? 'prepare_unknown'; }); }
      return this._operationResult(this._read(channelId), 'close');
    });
  }
  reconcile({ channelId, chargeId, planId }) {
    return this._queue(channelId, async () => {
      const s = this._read(channelId);
      if (chargeId) return this._lookupCommit(channelId, chargeId);
      const kind = s.close && (!planId || planId === s.close.id) ? 'close' : 'open';
      check(!planId || planId === s[kind].id, 'plan_mismatch'); return this._lookupTx(channelId, kind);
    });
  }
}
