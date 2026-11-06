// AXP campaign allocations over Circle Gateway Nanopayments. These are NOT
// onchain channels: Gateway's shared balance and exact per-receipt payments
// replace collateralized channel vouchers for this rail only.
import {hash, baseUnits} from '../contracts/index.mjs';
import {ARC_NETWORK as N, ARC_LIMITS, arcCheck as check, sameAddress as same} from '../arc/network.mjs';
import {arcWalletIdentities} from '../arc/wallet.mjs';
import {createArcTransport} from '../arc/transport.mjs';
const VERSION = 'axp.arc-nanopayments.v1';
const immutableCharge = ({status, ...charge}) => hash(charge);
const unresolved = row => row.operations.some(o => !['finalized', 'failed'].includes(o.status)) || row.payments.some(p => ['signing', 'submitting', 'unknown', 'failed'].includes(p.status));
const safeReason = e => /^[a-z_0-9]+$/.test(e?.code ?? '') ? e.code : 'arc_operation_blocked';

export function createArcProductPayments({exchange, walletPath, signingEnabled = false, identities,
  transportFactory = createArcTransport, checkpoint, limits: overrides = {}, rpcURL, now = Date.now} = {}) {
  check(exchange?.mode === 'devnet', 'arc_payment_mode_conflict');
  const limits = Object.freeze({...ARC_LIMITS, ...overrides});
  const ids = identities ?? (walletPath ? arcWalletIdentities(walletPath) : null);
  if (ids) check(/^0x[0-9a-f]{40}$/i.test(ids.payer) && /^0x[0-9a-f]{40}$/i.test(ids.payee) && !same(ids.payer, ids.payee), 'arc_identity_invalid');
  exchange.db.exec('CREATE TABLE IF NOT EXISTS arc_payment_channels(run TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(run,id))');
  let native, disposed = false, tail = Promise.resolve();
  const transport = () => {check(signingEnabled && ids, 'arc_signing_disabled'); return native ??= transportFactory({walletPath, rpcURL, limits});};
  const all = () => exchange.all('arc_payment_channels');
  const read = id => {
    const row = exchange.require('arc_payment_channels', id);
    check(row.adapterVersion === VERSION && row.termsHash === hash(row.terms), 'arc_terms_changed');
    check(ids && same(row.terms.payer, ids.payer) && same(row.terms.payee, ids.payee), 'arc_identity_changed');
    return row;
  };
  const save = (id, mutate) => exchange.tx(() => {
    const row = exchange.get('arc_payment_channels', id);
    return exchange.put('arc_payment_channels', id, mutate(row ? structuredClone(row) : null));
  });
  const persist = async reason => {if (checkpoint) await checkpoint(`arc_${reason}`);};
  const queued = fn => {
    const result = tail.catch(() => {}).then(async () => {
      try {check(!disposed, 'arc_worker_disposed'); return await fn();}
      catch (e) {return {status: 'blocked', reason: safeReason(e), reasonCode: safeReason(e)};}
    }); tail = result; return result;
  };
  function ledger(id) {
    const s = read(id), t = s.terms, channel = exchange.require('channels', id);
    check(channel.settlementNetwork === N.network && same(channel.payee, t.payee) && same(channel.token, N.token), 'arc_channel_binding');
    const charges = exchange.all('charges').filter(c => c.channelId === id).sort((a, b) => a.sequence - b.sequence);
    const totals = exchange.totals({channelId: id});
    check(charges.length <= limits.maxCharges && totals.accepted + totals.reserved <= baseUnits(t.chargeCapBaseUnits), 'arc_campaign_payment_cap');
    let total = 0n;
    for (const [i, charge] of charges.entries()) {
      const award = exchange.require('awards', charge.awardId), record = exchange.require('receipt_records', charge.id);
      check(charge.runId === t.runId && charge.mode === 'devnet' && charge.campaignVersionId === t.campaignVersionId && charge.sequence === i + 1 && award.settlementNetwork === N.network && same(award.payee, t.payee) && charge.receiptHash === record.receiptHash && hash(record.receipt) === record.receiptHash, 'arc_charge_binding');
      check(baseUnits(charge.amountBaseUnits) > 0n && baseUnits(charge.amountBaseUnits) <= baseUnits(t.maxBidBaseUnits), 'arc_charge_invalid');
      const prior = s.payments.find(p => p.chargeId === charge.id);
      check(!prior || prior.chargeHash === immutableCharge(charge), 'arc_charge_changed'); total += baseUnits(charge.amountBaseUnits);
    }
    check(total === totals.accepted, 'arc_ledger_mismatch');
    const aggregate = all().reduce((n, s) => {const t = exchange.totals({channelId: s.channelId}); return n + t.accepted + t.reserved;}, 0n);
    check(aggregate <= baseUnits(limits.aggregateChargeBaseUnits), 'arc_aggregate_charge_cap');
    return {charges, accepted: total, reserved: totals.reserved};
  }
  function beforeSigning(id) {
    check(signingEnabled && ids, 'arc_signing_disabled');
    for (const s of all()) check(!unresolved(s), 'arc_reconciliation_required');
    if (id) ledger(id);
  }
  async function verifyEnvironment(id) {
    const report = await transport().inspect(), terms = read(id).terms;
    check(report.compatible && report.chainId === N.chainId && report.decimals === 6 && same(report.token, N.token) && report.codeHash === terms.gatewayCodeHash && same(report.payer,terms.payer) && same(report.payee,terms.payee), 'arc_frozen_network_changed');
  }
  function feeUsed() {
    return all().reduce((sum, s) => sum + s.operations.reduce((n, o) => n + BigInt(o.receipt?.feeAttoUSD ?? o.signed?.feeReservationAttoUSD ?? (o.status === 'signing' ? limits.maxTransactionFeeAttoUSD : '0')), 0n), 0n);
  }
  async function observeNative(id, index, submit = false) {
    const op = read(id).operations[index]; check(op.signed, 'arc_native_signature_unavailable');
    let result;
    try {result = await transport()[submit ? 'submitNative' : 'lookupNative'](op.signed);}
    catch {result = {status: 'unknown', reasonCode: 'arc_native_outcome_unknown'};}
    save(id, s => {const op=s.operations[index];op.observations=[...(op.observations??[]),{at:now(),previousStatus:op.status,previousReceipt:op.receipt,result}];Object.assign(op, {status: result.status, receipt: result}); return s;});
    await persist('native_outcome'); return result;
  }
  async function nativeOperation(id, kind) {
    let s = read(id), index = s.operations.findIndex(o => o.kind === kind);
    if (index >= 0) {
      const op = s.operations[index];
      if (op.status === 'finalized') return op.receipt;
      // Never automatically replace, re-sign or rebroadcast an uncertain native op.
      return op.signed ? observeNative(id, index) : {status: 'blocked', reason: 'arc_native_signature_unavailable'};
    }
    beforeSigning(id); await verifyEnvironment(id); check(feeUsed() + BigInt(limits.maxTransactionFeeAttoUSD) <= BigInt(limits.aggregateFeeAttoUSD), 'arc_aggregate_fee_cap');
    index = s.operations.length;
    save(id, row => {row.operations.push({kind, status: 'signing', signed: null, receipt: null}); return row;});
    await persist('before_native_sign');
    let signed;
    try {signed = await transport().signNative({kind, amountBaseUnits: s.terms.depositBaseUnits});}
    catch (e) {
      save(id, row => {row.operations[index].status = 'failed'; row.operations[index].reason = safeReason(e); return row;});
      await persist('native_sign_failed'); throw e;
    }
    check(feeUsed() - BigInt(limits.maxTransactionFeeAttoUSD) + BigInt(signed.feeReservationAttoUSD) <= BigInt(limits.aggregateFeeAttoUSD), 'arc_aggregate_fee_cap');
    save(id, row => {Object.assign(row.operations[index], {status: 'signed', signed, signedHash: hash(signed)}); return row;});
    await persist('signed_native_bytes');
    check(read(id).operations[index].signedHash === hash(signed), 'arc_native_identity_mismatch');
    save(id, row => {row.operations[index].status = 'submitting'; return row;});
    await persist('before_native_broadcast');
    return observeNative(id, index, true);
  }
  function sync(id) {
    const s = exchange.get('arc_payment_channels', id); if (!s) return;
    exchange.syncNetworkChannel(id);
    exchange.tx(() => {
      for (const payment of s.payments) {
        if (!payment.signed) continue;
        const charge = exchange.require('charges', payment.chargeId);
        const status = payment.status === 'finalized' ? 'settled' : 'authorized';
        if (charge.status !== status) exchange.put('charges', charge.id, {...charge, status});
      }
    });
  }
  async function refreshFunding(id) {
    const s = read(id), deposit = s.operations.find(o => o.kind === 'deposit');
    if (deposit?.status !== 'finalized') return false;
    const balances = await transport().balances();
    // Each open allocation retains its entire accepted/reserved liability. Do
    // not reuse another campaign's deposit, even on the same Gateway address.
    const availableNeeded = all().reduce((n, row) => n + (row.channelId === id || row.funded ? baseUnits(row.terms.depositBaseUnits) - row.payments.filter(p => ['accepted', 'finalized'].includes(p.status)).reduce((x, p) => x + baseUnits(p.amountBaseUnits), 0n) : 0n), 0n);
    check(BigInt(balances.gatewayAvailableBaseUnits) >= availableNeeded, 'arc_gateway_deposit_pending');
    save(id, row => {row.funded = true; row.phase = row.closeRequested ? 'draining' : 'open'; row.lastBalances = balances; return row;});
    await persist('gateway_funding_observed'); sync(id); return true;
  }
  const freeze = campaign => queued(async () => {
    const id = campaign.channelId, old = exchange.get('arc_payment_channels', id);
    if (old) {read(id); check(old.terms.campaignVersionId === campaign.campaignVersionId, 'arc_terms_changed'); return {status: 'frozen', replayed: true};}
    beforeSigning(); const channel = exchange.require('channels', id);
    check(channel.settlementNetwork === N.network && same(channel.payee, ids.payee) && same(channel.token, N.token), 'arc_channel_binding');
    check(baseUnits(channel.depositBaseUnits) > 0n && baseUnits(channel.depositBaseUnits) <= baseUnits(limits.maxDepositBaseUnits) && baseUnits(campaign.budgetCapBaseUnits) > 0n && baseUnits(campaign.budgetCapBaseUnits) <= baseUnits(limits.maxBudgetBaseUnits) && baseUnits(campaign.budgetCapBaseUnits) <= baseUnits(channel.depositBaseUnits) && baseUnits(campaign.maxBidBaseUnits) <= baseUnits(limits.maxBidBaseUnits), 'arc_campaign_limit');
    check(all().length < limits.maxChannels && all().reduce((n, s) => n + baseUnits(s.terms.depositBaseUnits), 0n) + baseUnits(channel.depositBaseUnits) <= baseUnits(limits.aggregateDepositBaseUnits), 'arc_aggregate_deposit_cap');
    const report = await transport().inspect();
    check(report.compatible && report.chainId === N.chainId && report.decimals === 6 && same(report.token, N.token) && same(report.payer,ids.payer) && same(report.payee,ids.payee), 'arc_preflight_failed');
    const terms = {...N, runId: exchange.runId, channelId: id, advertiserId: campaign.advertiserId,
      campaignVersionId: campaign.campaignVersionId, payer: ids.payer, payee: ids.payee,
      depositBaseUnits: channel.depositBaseUnits, chargeCapBaseUnits: campaign.budgetCapBaseUnits,
      maxBidBaseUnits: campaign.maxBidBaseUnits, gatewayCodeHash: report.codeHash, createdAt: now()};
    save(id, () => ({channelId: id, adapterVersion: VERSION, terms, termsHash: hash(terms), phase: 'pending_open', funded: false, closeRequested: false, operations: [], payments: []}));
    await persist('terms_frozen'); return {status: 'frozen'};
  });
  const open = id => queued(async () => {
    if (read(id).funded) return {status: 'finalized', replayed: true};
    for (const kind of ['approve', 'deposit']) {const result = await nativeOperation(id, kind); if (result.status !== 'finalized') return result;}
    await refreshFunding(id); return {status: 'finalized', operation: 'gateway_deposit'};
  });
  const authorize = id => queued(async () => {
    beforeSigning(id); check(['open', 'draining'].includes(read(id).phase), 'arc_campaign_not_open');
    const {charges} = ledger(id);
    for (const charge of charges) {
      const old = read(id).payments.find(p => p.chargeId === charge.id); if (old?.signed) continue;
      check(!old, 'arc_payment_signature_unavailable');
      save(id, s => {s.payments.push({chargeId: charge.id, chargeHash: immutableCharge(charge), receiptHash: charge.receiptHash,
        amountBaseUnits: charge.amountBaseUnits, status: 'signing', signed: null}); return s;});
      await persist('before_payment_sign');
      await verifyEnvironment(id);
      const signed = await transport().signPayment({amountBaseUnits: charge.amountBaseUnits, receiptHash: charge.receiptHash});
      check(signed.requirements.amount === charge.amountBaseUnits && same(signed.requirements.payTo, ids.payee), 'arc_payment_binding');
      save(id, s => {Object.assign(s.payments.find(p => p.chargeId === charge.id), {status: 'authorized', signed, signedHash: hash(signed)}); return s;});
      await persist('signed_payment');
    }
    sync(id); return {status: 'authorized', authorizationCount: read(id).payments.length};
  });
  async function submitPayments(id) {
    beforeSigning(id); await verifyEnvironment(id); const s = read(id), totals = ledger(id);
    check(totals.reserved === 0n && s.payments.length === totals.charges.length, 'arc_outstanding_deliveries');
    for (const payment of s.payments) {
      if (['accepted', 'finalized'].includes(payment.status)) continue;
      check(payment.status === 'authorized' && payment.signedHash === hash(payment.signed), 'arc_payment_changed');
      const verified = await transport().verifyPayment(payment.signed);
      check(verified.isValid && (!verified.payer || same(verified.payer, ids.payer)), 'arc_payment_verification_failed');
      save(id, row => {row.payments.find(p => p.chargeId === payment.chargeId).status = 'submitting'; return row;});
      await persist('before_gateway_submission');
      let result;
      try {
        result = await transport().settlePayment(payment.signed);
        check(result.success === true && result.network === N.caip2 && same(result.payer, ids.payer), 'arc_gateway_acceptance_invalid');
        save(id, row => {Object.assign(row.payments.find(p => p.chargeId === payment.chargeId), {status: 'accepted', gatewayResult: result}); return row;});
      } catch {
        save(id, row => {row.payments.find(p => p.chargeId === payment.chargeId).status = 'unknown'; return row;});
        await persist('gateway_submission_unknown'); sync(id); return {status: 'unknown', reason: 'arc_reconciliation_required'};
      }
      await persist('gateway_accepted');
    }
    sync(id); return {status: 'accepted', operation: 'gateway_nanopayments', batchFinality: 'pending'};
  }
  const payout = id => queued(() => submitPayments(id));
  const drain = id => queued(async () => {
    check(['open', 'draining'].includes(read(id).phase), 'arc_campaign_not_open');
    save(id, s => {s.phase = 'draining'; return s;}); await persist('draining'); sync(id); return {status: 'draining'};
  });
  const close = id => queued(async () => {
    const result = await submitPayments(id); if (result.status !== 'accepted') return result;
    save(id, s => {s.closeRequested = true; s.phase = 'draining'; return s;}); await persist('campaign_drained');
    sync(id); return {status: 'accepted', operation: 'campaign_close', batchFinality: 'pending', unusedFunds: 'remain_in_payer_gateway_balance'};
  });
  const reconcile = id => queued(async () => {
    ledger(id); let s = read(id);
    for (let i = 0; i < s.operations.length; i++) if (!['finalized', 'failed'].includes(s.operations[i].status)) await observeNative(id, i);
    s = read(id);
    if (!s.funded && s.operations.find(o => o.kind === 'deposit')?.status === 'finalized') await refreshFunding(id);
    for (const payment of read(id).payments) {
      if (!payment.signed || !['submitting', 'unknown', 'accepted'].includes(payment.status)) continue;
      check(payment.signedHash === hash(payment.signed), 'arc_payment_changed');
      const result = await transport().lookupPayment(payment.signed);
      save(id, row => {Object.assign(row.payments.find(p => p.chargeId === payment.chargeId), {status: result.status, lookup: result}); return row;});
      await persist('payment_reconciled');
    }
    s = read(id);
    if (s.closeRequested && !unresolved(s) && s.payments.every(p => p.status === 'finalized')) {
      save(id, row => {row.phase = 'finalized'; return row;}); await persist('batch_close_finalized');
    }
    sync(id); return {status: 'reconciled', reconciliationRequired: unresolved(read(id))};
  });
  function projection(id) {
    const s = exchange.get('arc_payment_channels', id); if (!s) return null;
    const sum = status => s.payments.filter(p => status.includes(p.status)).reduce((n, p) => n + baseUnits(p.amountBaseUnits), 0n).toString();
    return {channelId: id, runId: s.terms.runId, mode: 'devnet', network: N.network, token: N.token, payee: s.terms.payee,
      phase: s.phase, openStatus: s.funded ? 'finalized' : s.operations.find(o => o.kind === 'deposit')?.status ?? 'not_prepared',
      closeStatus: s.closeRequested ? s.phase === 'finalized' ? 'finalized' : 'pending_batch' : null,
      depositBaseUnits: s.funded ? s.terms.depositBaseUnits : '0', authorizedBaseUnits: s.payments.filter(p => p.signed).reduce((n, p) => n + baseUnits(p.amountBaseUnits), 0n).toString(),
      submittedBaseUnits: sum(['accepted', 'finalized']), settledBaseUnits: sum(['finalized']), refundBaseUnits: '0',
      acceptedBaseUnits: exchange.totals({channelId: id}).accepted.toString(), protocolChannelId: null,
      aggregateRemainingBaseUnits: (baseUnits(limits.aggregateChargeBaseUnits) - all().reduce((n,row)=>{const t=exchange.totals({channelId:row.channelId});return n+t.accepted+t.reserved;},0n)).toString(),
      termsHash: s.termsHash, reconciliationRequired: all().some(unresolved)};
  }
  function evidence(id) {
    const s = exchange.get('arc_payment_channels', id); if (!s) return null;
    const p = projection(id), t = exchange.totals({channelId: id}), safe = s.funded && !unresolved(s) && t.reserved === 0n && p.authorizedBaseUnits === t.accepted.toString();
    const payments = s.payments.map(row => ({chargeId: row.chargeId, receiptHash: row.receiptHash, amountBaseUnits: row.amountBaseUnits,
      status: row.status, payloadHash: row.signed?.payloadHash, transferId: row.lookup?.transferId ?? row.gatewayResult?.transaction ?? null,
      transferStatus: row.lookup?.transferStatus ?? null, batchProof: row.lookup?.batchProof ?? null}));
    return {...p, ...N, payer: s.terms.payer, payee: s.terms.payee, gatewayCodeHash: s.terms.gatewayCodeHash,
      settlementMethod: 'circle_gateway_nanopayments', fundingKind: 'gateway_balance_allocation',
      depositBaseUnits: s.terms.depositBaseUnits, confirmedDepositBaseUnits: p.depositBaseUnits,
      unusedAllocationBaseUnits: (baseUnits(s.terms.depositBaseUnits) - t.accepted).toString(),
      canReconcile: s.funded || s.operations.some(o => o.signed), canPayout: safe && !s.closeRequested && BigInt(p.authorizedBaseUnits) > BigInt(p.submittedBaseUnits),
      canClose: safe && !s.closeRequested, canSettle: safe && !s.closeRequested,
      canRetryOpen: !s.funded && !s.operations.some(o => !['finalized'].includes(o.status)),
      payments, vouchers: [], transactions: [
        ...s.operations.map(o => ({operation: o.kind === 'deposit' ? 'open' : 'approve', status: o.status,
          transactionHash: o.signed?.transactionHash, ...o.receipt, network: N.network, chainId: N.chainId})),
        ...payments.filter(p => p.batchProof).map(p => ({operation: 'batch', ...p.batchProof})),
      ], limitations: ['Gateway acceptance is not onchain finality.', 'Unused campaign allocation remains in the payer Gateway balance; no channel refund is performed.']};
  }
  return {identities: ids, freeze, open, authorize, payout, drain, close, reconcile, sync, projection, evidence,
    status: () => ({mode: 'devnet', ...N, ready: signingEnabled && !!ids, signingEnabled, ...ids,
      reason: signingEnabled && ids ? null : 'arc_signing_disabled', settlementMethod: 'circle_gateway_nanopayments', limits}),
    dispose: () => {disposed = true;}};
}
