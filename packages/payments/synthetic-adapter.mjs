import { createMemoryPaymentStore } from './store.mjs';
import { amount, createSyntheticVoucher, fail, hash, SYNTHETIC_SIGNER, verifySyntheticVoucher } from './voucher.mjs';

const VERSION = 'axp.payment-adapter.v1';
const clone = structuredClone;
const strict = (input, fields) => { if (Object.keys(input).some(key => !fields.includes(key))) fail('input_invalid'); };
const id = value => { if (typeof value !== 'string' || !value.trim()) fail('identity_invalid'); return value; };
const sum = values => values.reduce((total, value) => total + amount(value.amountBaseUnits), 0n);
const cap = terms => amount(terms.depositBaseUnits) < amount(terms.chargeCapBaseUnits) ? terms.depositBaseUnits : terms.chargeCapBaseUnits;
const envelope = (channel, recordId, now) => ({ schemaVersion: VERSION, id: recordId, channelId: channel.channelId, runId: channel.terms.runId, correlationId: channel.channelId, mode: 'synthetic', createdAt: new Date(now * 1000).toISOString() });

/** No SDK, network, wallet, broadcast or paid API capability. Trusted C05 worker only. */
export class SyntheticPaymentAdapter {
  constructor({ store = createMemoryPaymentStore(), now = () => Math.floor(Date.now() / 1000) } = {}) {
    this.store = store;
    this.now = now;
  }
  #time() { const n = this.now(); if (!Number.isSafeInteger(n) || n < 0) fail('clock_invalid'); return n; }
  #read(channelId) { const c = this.store.get(id(channelId)); if (!c) fail('channel_not_found'); return c; }
  #change(channelId, mutate) { return this.store.update(channelId, c => { if (!c) fail('channel_not_found'); return mutate(c); }); }
  #terms(input, frozen) {
    strict(input, ['channelId', 'mode', 'runId', 'advertiserId', 'campaignVersionId', 'network', 'mint', 'payer', 'payee', 'authorizedSigner', 'depositBaseUnits', 'chargeCapBaseUnits', 'voucherExpiresAt', 'applicationDeadlineAt', 'settlementMarginSeconds', 'idleTimeoutSeconds', 'openSlot', 'networkFeeBaseUnits']);
    if (input.mode !== 'synthetic') fail('mode_not_supported');
    const now = this.#time();
    const terms = {
      runId: id(input.runId), advertiserId: id(input.advertiserId), campaignVersionId: id(input.campaignVersionId),
      network: input.network ?? 'synthetic', mint: input.mint ?? 'synthetic:test-USDC',
      payer: id(input.payer), payee: id(input.payee), authorizedSigner: SYNTHETIC_SIGNER,
      depositBaseUnits: input.depositBaseUnits, chargeCapBaseUnits: input.chargeCapBaseUnits ?? input.depositBaseUnits,
      voucherExpiresAt: input.voucherExpiresAt ?? frozen?.voucherExpiresAt ?? now + 7200,
      applicationDeadlineAt: input.applicationDeadlineAt ?? frozen?.applicationDeadlineAt ?? now + 1800,
      settlementMarginSeconds: input.settlementMarginSeconds ?? 60,
      idleTimeoutSeconds: input.idleTimeoutSeconds ?? 3600,
      openSlot: input.openSlot ?? '0', networkFeeBaseUnits: '0',
    };
    if (terms.network !== 'synthetic' || terms.mint !== 'synthetic:test-USDC' || !terms.payer.startsWith('synthetic:') || !terms.payee.startsWith('synthetic:') || terms.payer === terms.payee || (input.authorizedSigner && input.authorizedSigner !== SYNTHETIC_SIGNER) || (input.networkFeeBaseUnits && input.networkFeeBaseUnits !== '0')) fail('terms_mismatch');
    if (amount(terms.depositBaseUnits) === 0n || amount(terms.chargeCapBaseUnits) === 0n || amount(terms.chargeCapBaseUnits) > amount(terms.depositBaseUnits)) fail('cap_exceeded');
    amount(terms.openSlot);
    for (const field of ['voucherExpiresAt', 'applicationDeadlineAt', 'settlementMarginSeconds', 'idleTimeoutSeconds']) if (!Number.isSafeInteger(terms[field]) || terms[field] <= 0) fail('terms_mismatch');
    if (!frozen && (terms.voucherExpiresAt <= now + terms.settlementMarginSeconds || terms.applicationDeadlineAt <= now)) fail('voucher_expired');
    return terms;
  }
  prepareOpen(input) {
    const channelId = id(input.channelId);
    const terms = this.#terms(input, this.store.get(channelId)?.terms);
    const termsHash = hash(terms);
    const now = this.#time();
    const c = this.store.update(channelId, current => {
      if (current) { if (current.termsHash !== termsHash) fail('terms_mismatch'); return current; }
      return { schemaVersion: 1, channelId, terms, termsHash, phase: 'pending_open',
        openPlan: { id: `synthetic-open:${hash({ channelId, termsHash })}`, status: 'prepared' },
        reservations: [], charges: [], intents: [], providerCommits: [],
        authorizedBaseUnits: '0', providerCumulativeBaseUnits: '0', finalVoucher: null,
        signingCalls: 0, closeAttempts: 0, closePlan: null, providerSettlement: null, idleCloseRequested: false,
        createdAt: now };
    });
    return { ...envelope(c, c.openPlan.id, c.createdAt), status: 'prepared', termsHash, depositBaseUnits: terms.depositBaseUnits };
  }
  confirmOpen({ channelId, planId }) {
    const c = this.#change(channelId, current => {
      if (planId !== current.openPlan.id) fail('authorization_conflict');
      if (current.phase === 'pending_open') { current.phase = 'open'; current.openPlan.status = 'opened'; }
      return current;
    });
    return this.getChannel(c.channelId);
  }
  open(input) { const plan = this.prepareOpen(input); return this.confirmOpen({ channelId: input.channelId, planId: plan.id }); }
  getChannel(channelId) {
    const c = this.#read(channelId);
    const accepted = sum(c.charges), reserved = sum(c.reservations);
    return { ...envelope(c, channelId, c.createdAt), status: c.phase, phase: c.phase,
      network: 'synthetic', mint: c.terms.mint, payee: c.terms.payee, termsHash: c.termsHash,
      depositBaseUnits: c.terms.depositBaseUnits, acceptedBaseUnits: accepted.toString(),
      reservedBaseUnits: reserved.toString(), authorizedBaseUnits: c.authorizedBaseUnits,
      availableBaseUnits: (amount(cap(c.terms)) - accepted - reserved).toString(),
      settledBaseUnits: c.phase === 'finalized' ? c.providerSettlement.publisherPayoutBaseUnits : '0',
      refundableBaseUnits: c.phase === 'finalized' ? c.providerSettlement.unusedTokenRefundBaseUnits : '0',
      pendingAuthorizationCount: c.charges.filter(charge => charge.status !== 'authorized' && charge.status !== 'settled').length,
      reconciliationRequired: c.phase === 'unknown' || c.intents.some(intent => intent.status === 'unknown'),
      idleCloseRequested: c.idleCloseRequested, syntheticSigningCalls: c.signingCalls,
      syntheticCloseAttempts: c.closeAttempts, finalVoucherHash: c.finalVoucher ? hash(c.finalVoucher) : null,
      finality: c.phase === 'finalized' ? 'synthetic' : null };
  }
  reserveAward({ channelId, reservationId, amountBaseUnits }) {
    id(reservationId); const value = amount(amountBaseUnits); if (value === 0n) fail('amount_invalid');
    this.#change(channelId, c => {
      if (c.phase !== 'open' || this.#time() >= c.terms.applicationDeadlineAt || c.intents.some(i => i.status === 'unknown')) fail('channel_unavailable');
      const existing = c.reservations.find(r => r.reservationId === reservationId);
      if (existing) { if (existing.amountBaseUnits !== amountBaseUnits) fail('authorization_conflict'); return c; }
      if (c.charges.some(charge => charge.reservationId === reservationId)) fail('authorization_conflict');
      if (sum(c.charges) + sum(c.reservations) + value > amount(cap(c.terms))) fail('cap_exceeded');
      c.reservations.push({ reservationId, amountBaseUnits }); return c;
    });
    return this.getChannel(channelId);
  }
  releaseAward({ channelId, reservationId }) {
    this.#change(channelId, c => { c.reservations = c.reservations.filter(r => r.reservationId !== reservationId); return c; });
    return this.getChannel(channelId);
  }
  /** C05 worker intake. accepted=true is fixture trust, not independent receipt validation. */
  acceptCharge(input) {
    strict(input, ['channelId', 'chargeId', 'amountBaseUnits', 'accepted', 'sequence', 'runId', 'campaignVersionId', 'payee', 'mint', 'reservationId', 'acceptedReceiptHash']);
    if (input.accepted !== true) fail('charge_not_accepted');
    const { channelId, chargeId, amountBaseUnits } = input;
    id(chargeId); const value = amount(amountBaseUnits); if (value === 0n) fail('amount_invalid');
    const c = this.#change(channelId, current => {
      for (const field of ['runId', 'campaignVersionId', 'payee', 'mint']) if (input[field] !== undefined && input[field] !== current.terms[field]) fail('terms_mismatch');
      const existing = current.charges.find(charge => charge.chargeId === chargeId);
      if (existing) {
        if (existing.amountBaseUnits !== amountBaseUnits || (input.sequence !== undefined && input.sequence !== existing.sequence) || (input.reservationId !== undefined && input.reservationId !== existing.reservationId) || (input.acceptedReceiptHash !== undefined && input.acceptedReceiptHash !== existing.acceptedReceiptHash)) fail('authorization_conflict');
        return current;
      }
      const reservation = current.reservations.find(r => r.reservationId === input.reservationId);
      if (current.phase !== 'open' && !(current.phase === 'draining' && reservation)) fail('channel_unavailable');
      if (!reservation && this.#time() >= current.terms.applicationDeadlineAt) fail('channel_unavailable');
      if (reservation && reservation.amountBaseUnits !== amountBaseUnits) fail('charge_amount_mismatch');
      const sequence = (BigInt(current.charges.length) + 1n).toString();
      if (input.sequence !== undefined && input.sequence !== sequence) fail('charge_sequence_mismatch');
      if (sum(current.charges) + sum(current.reservations) - (reservation ? value : 0n) + value > amount(cap(current.terms))) fail('cap_exceeded');
      const charge = { chargeId, amountBaseUnits, sequence, reservationId: input.reservationId ?? null,
        acceptedReceiptHash: input.acceptedReceiptHash ?? hash({ synthetic: true, channelId, chargeId }), status: 'accepted' };
      charge.ledgerHash = hash({ ...charge, runId: current.terms.runId, campaignVersionId: current.terms.campaignVersionId, termsHash: current.termsHash });
      current.charges.push(charge);
      if (reservation) current.reservations = current.reservations.filter(r => r.reservationId !== reservation.reservationId);
      return current;
    });
    return clone(c.charges.find(charge => charge.chargeId === chargeId));
  }
  authorizeCumulative(input) {
    const { channelId, chargeId } = input;
    // For direct integration with C05, accepted marker registers the immutable fixture charge.
    strict(input, ['channelId', 'chargeId', 'amountBaseUnits', 'accepted', 'sequence', 'runId', 'campaignVersionId', 'payee', 'mint', 'reservationId', 'acceptedReceiptHash', 'fault']);
    if (input.fault !== undefined && !['after_signed', 'after_commit'].includes(input.fault)) fail('input_invalid');
    if (input.accepted !== undefined) { const { fault, ...acceptedCharge } = input; this.acceptCharge(acceptedCharge); }
    let c = this.#read(channelId);
    let charge = c.charges.find(item => item.chargeId === chargeId);
    if (!charge) fail('charge_not_accepted');
    if (input.amountBaseUnits !== undefined && input.amountBaseUnits !== charge.amountBaseUnits) fail('charge_amount_mismatch');
    let intent = c.intents.find(item => item.chargeId === chargeId);
    if (intent?.status === 'committed') return clone(intent.result);
    if (c.phase !== 'open' && c.phase !== 'draining') fail('channel_unavailable');
    if (c.intents.some(item => item.status === 'unknown')) fail('reconciliation_required');
    if (c.charges.find(item => item.status === 'accepted')?.chargeId !== chargeId && !intent) fail('charge_sequence_mismatch');
    if (!intent) {
      c = this.#change(channelId, current => {
        const target = amount(current.authorizedBaseUnits) + amount(charge.amountBaseUnits);
        if (target > amount(cap(current.terms))) fail('cap_exceeded');
        const orderedCharges = current.charges.filter(item => BigInt(item.sequence) <= BigInt(charge.sequence));
        if (sum(orderedCharges) !== target) fail('charge_sequence_mismatch');
        const created = { id: `synthetic-auth:${hash({ channelId, chargeId, ledgerHash: charge.ledgerHash })}`,
          chargeId, protocolDeliveryId: chargeId, sequence: charge.sequence,
          previousBaseUnits: current.authorizedBaseUnits, cumulativeAmountBaseUnits: target.toString(),
          amountBaseUnits: charge.amountBaseUnits, orderedChargeCommitment: hash(orderedCharges.map(item => item.ledgerHash)),
          termsHash: current.termsHash, expiresAt: current.terms.voucherExpiresAt, status: 'prepared', voucher: null, result: null,
          createdAt: this.#time() };
        current.intents.push(created);
        current.charges.find(item => item.chargeId === chargeId).status = 'authorization_pending';
        return current;
      });
      intent = c.intents.find(item => item.chargeId === chargeId);
    }
    if (!intent.voucher) {
      if (intent.expiresAt <= this.#time() + c.terms.settlementMarginSeconds) fail('voucher_expired');
      // Signing is outside the persistence transaction; a private saved voucher is reused.
      const voucher = createSyntheticVoucher({ channelId, cumulativeAmountBaseUnits: intent.cumulativeAmountBaseUnits, expiresAt: intent.expiresAt, termsHash: intent.termsHash });
      this.#validate(c, intent, voucher);
      c = this.#change(channelId, current => {
        const saved = current.intents.find(item => item.chargeId === chargeId);
        saved.voucher = voucher; saved.status = 'signed_persisted'; current.signingCalls += 1; return current;
      });
    }
    if (input.fault === 'after_signed') {
      this.#change(channelId, current => { current.intents.find(item => item.chargeId === chargeId).status = 'unknown'; return current; });
      return this.lookupAuthorization({ channelId, chargeId });
    }
    return this.#commitSaved(channelId, chargeId, input.fault === 'after_commit');
  }
  #validate(c, intent, voucher) {
    return verifySyntheticVoucher({ voucher, channelId: c.channelId, termsHash: c.termsHash,
      previousBaseUnits: intent.previousBaseUnits, chargeAmountBaseUnits: intent.amountBaseUnits,
      capBaseUnits: cap(c.terms), expiresAt: c.terms.voucherExpiresAt, now: this.#time() });
  }
  #commitSaved(channelId, chargeId, loseAcknowledgement = false) {
    let c = this.#read(channelId);
    const intent = c.intents.find(item => item.chargeId === chargeId);
    if (!intent?.voucher) fail('reconciliation_required');
    this.#validate(c, intent, intent.voucher);
    c = this.#change(channelId, current => {
      const saved = current.intents.find(item => item.chargeId === chargeId);
      let receipt = current.providerCommits.find(item => item.chargeId === chargeId);
      if (!receipt) {
        if (current.providerCumulativeBaseUnits !== saved.previousBaseUnits) fail('authorization_conflict');
        receipt = { chargeId, channelId, amountBaseUnits: saved.amountBaseUnits, cumulativeAmountBaseUnits: saved.cumulativeAmountBaseUnits, voucherHash: hash(saved.voucher) };
        current.providerCommits.push(receipt); current.providerCumulativeBaseUnits = receipt.cumulativeAmountBaseUnits;
      }
      if (receipt.channelId !== channelId || receipt.amountBaseUnits !== saved.amountBaseUnits || receipt.cumulativeAmountBaseUnits !== saved.cumulativeAmountBaseUnits || receipt.voucherHash !== hash(saved.voucher)) fail('authorization_conflict');
      if (loseAcknowledgement) { saved.status = 'unknown'; return current; }
      saved.status = 'committed';
      saved.result = { ...envelope(current, saved.id, saved.createdAt), status: 'authorized',
        chargeId, protocolDeliveryId: chargeId, sequence: saved.sequence, amountBaseUnits: saved.amountBaseUnits,
        previousBaseUnits: saved.previousBaseUnits, cumulativeAmountBaseUnits: saved.cumulativeAmountBaseUnits,
        signedPayloadHash: receipt.voucherHash, orderedChargeCommitment: saved.orderedChargeCommitment,
        voucherKind: 'axp.synthetic-voucher.v1' };
      current.authorizedBaseUnits = saved.cumulativeAmountBaseUnits;
      current.finalVoucher = saved.voucher;
      current.charges.find(item => item.chargeId === chargeId).status = 'authorized';
      return current;
    });
    return this.lookupAuthorization({ channelId, chargeId });
  }
  lookupAuthorization({ channelId, chargeId }) {
    const c = this.#read(channelId), intent = c.intents.find(item => item.chargeId === chargeId);
    if (!intent) return { ...envelope(c, chargeId, c.createdAt), status: 'absent', chargeId };
    if (intent.status === 'committed') return clone(intent.result);
    return { ...envelope(c, intent.id, intent.createdAt), status: intent.status, reasonCode: 'reconciliation_required', chargeId,
      protocolDeliveryId: chargeId, cumulativeAmountBaseUnits: intent.cumulativeAmountBaseUnits,
      signedPayloadHash: intent.voucher ? hash(intent.voucher) : null };
  }
  beginDrain({ channelId }) {
    this.#change(channelId, c => { if (c.phase === 'open') c.phase = 'draining'; return c; });
    return this.getChannel(channelId);
  }
  requestIdleClose({ channelId }) {
    this.#change(channelId, c => { c.idleCloseRequested = true; if (c.phase === 'open') c.phase = 'draining'; return c; });
    return { ...this.getChannel(channelId), status: 'drain_requested', reasonCode: 'close_not_drained' };
  }
  prepareClose({ channelId }) {
    this.beginDrain({ channelId });
    let c = this.#read(channelId);
    if (c.closePlan) return clone(c.closePlan);
    if (c.phase === 'unknown' || c.intents.some(i => i.status === 'unknown')) fail('reconciliation_required');
    if (c.phase !== 'draining' || c.reservations.length || c.charges.some(item => item.status !== 'authorized') || sum(c.charges).toString() !== c.authorizedBaseUnits || c.authorizedBaseUnits !== c.providerCumulativeBaseUnits) fail('close_not_drained');
    if (!c.finalVoucher) fail('final_voucher_missing');
    if (c.finalVoucher.payload.expiresAt <= this.#time() + c.terms.settlementMarginSeconds) fail('voucher_expired');
    const last = c.intents.at(-1);
    this.#validate(c, last, c.finalVoucher);
    c = this.#change(channelId, current => {
      current.phase = 'closing';
      current.closePlan = { ...envelope(current, `synthetic-close:${hash({ channelId, total: current.authorizedBaseUnits, voucherHash: hash(current.finalVoucher) })}`, this.#time()),
        status: 'prepared', frozenSequence: current.charges.at(-1).sequence,
        cumulativeAmountBaseUnits: current.authorizedBaseUnits, finalVoucherHash: hash(current.finalVoucher),
        expectedPublisherPayoutBaseUnits: current.authorizedBaseUnits,
        expectedUnusedTokenRefundBaseUnits: (amount(current.terms.depositBaseUnits) - amount(current.authorizedBaseUnits)).toString(),
        action: 'close_saved_synthetic_voucher' };
      return current;
    });
    return clone(c.closePlan);
  }
  confirmClose({ channelId, planId, fault }) {
    let c = this.#read(channelId);
    if (!c.closePlan || c.closePlan.id !== planId) fail('authorization_conflict');
    if (c.phase === 'finalized') return clone(c.providerSettlement);
    if (c.phase === 'unknown') fail('reconciliation_required');
    if (c.phase !== 'closing') fail('close_not_drained');
    if (c.finalVoucher.payload.expiresAt <= this.#time() + c.terms.settlementMarginSeconds) fail('voucher_expired');
    if (hash(c.finalVoucher) !== c.closePlan.finalVoucherHash || c.finalVoucher.payload.cumulativeAmountBaseUnits !== c.closePlan.cumulativeAmountBaseUnits) fail('settlement_amount_mismatch');
    this.#validate(c, c.intents.at(-1), c.finalVoucher);
    c = this.#change(channelId, current => {
      current.closeAttempts += 1;
      current.providerSettlement = { ...envelope(current, planId, this.#time()), status: 'finalized', finality: 'synthetic',
        synthetic: true, txSignature: null, attemptId: planId, finalVoucherHash: current.closePlan.finalVoucherHash,
        settledBaseUnits: current.closePlan.cumulativeAmountBaseUnits,
        publisherPayoutBaseUnits: current.closePlan.expectedPublisherPayoutBaseUnits,
        unusedTokenRefundBaseUnits: current.closePlan.expectedUnusedTokenRefundBaseUnits,
        feeBaseUnits: '0', rentRecovery: 'not_observed_synthetic' };
      current.phase = fault === 'after_close' ? 'unknown' : 'finalized';
      if (current.phase === 'finalized') current.charges.forEach(item => { item.status = 'settled'; });
      return current;
    });
    return c.phase === 'unknown' ? { ...envelope(c, planId, this.#time()), status: 'unknown', reasonCode: 'reconciliation_required', attemptId: planId } : clone(c.providerSettlement);
  }
  reconcile({ channelId, chargeId, planId }) {
    const c = this.#read(channelId);
    if (chargeId) {
      const intent = c.intents.find(item => item.chargeId === chargeId);
      if (intent?.status === 'committed') return clone(intent.result);
      if (!intent || intent.status !== 'unknown' || !intent.voucher) fail('reconciliation_required');
      return this.#commitSaved(channelId, chargeId);
    }
    if (!c.closePlan || c.closePlan.id !== planId || !c.providerSettlement || c.providerSettlement.attemptId !== planId || c.providerSettlement.finalVoucherHash !== c.closePlan.finalVoucherHash || c.providerSettlement.settledBaseUnits !== c.authorizedBaseUnits || c.providerSettlement.publisherPayoutBaseUnits !== c.authorizedBaseUnits || amount(c.providerSettlement.unusedTokenRefundBaseUnits) + amount(c.providerSettlement.publisherPayoutBaseUnits) !== amount(c.terms.depositBaseUnits)) fail('reconciliation_required');
    this.#change(channelId, current => { current.phase = 'finalized'; current.charges.forEach(item => { item.status = 'settled'; }); return current; });
    return clone(c.providerSettlement);
  }
  prepareReclaim({ channelId, observedSlot, approved = false }) {
    const c = this.#read(channelId);
    if (c.phase !== 'finalized' || amount(observedSlot) <= amount(c.terms.openSlot) + 1500n) fail('reclaim_not_eligible');
    if (approved !== true) fail('approval_missing');
    return { ...envelope(c, `synthetic-reclaim:${hash({ channelId, observedSlot })}`, this.#time()), status: 'prepared',
      action: 'synthetic_reclaim_plan_only', observedSlot, tokenRefundBaseUnits: c.providerSettlement.unusedTokenRefundBaseUnits,
      additionalTokenRefundBaseUnits: '0', rentLamports: null, rentRecovery: 'simulation_only_unmeasured', broadcasts: 0 };
  }
}
