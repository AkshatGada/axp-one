// Server-only, external-wallet sidecar. Main owns authorization, saved plans,
// partial wires and the durable checkpoint BEFORE submit*. No keys or signing.
import {createHash, createPublicKey, verify} from 'node:crypto';
import {loadNativeSDK} from '../payments/sdk-loader.mjs';
import {createNativeTransport, NETWORK_ENVIRONMENTS} from '../payments/sdk-transport.mjs';
import {hashNetworkTerms} from '../payments/network-adapter.mjs';
import {NativeSessionStore} from '../payments/native-store.mjs';

const VERSION = 'axp.external-solana.v1';
const PROGRAM = 'CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX';
const TOKEN = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const U64 = (1n << 64n) - 1n;
const recoveryQueues = new Map();
function queueRecovery(key, operation) {
  const previous = recoveryQueues.get(key) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(operation); recoveryQueues.set(key, next);
  void next.finally(() => {if (recoveryQueues.get(key) === next) recoveryQueues.delete(key);}).catch(() => {});
  return next;
}
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const copy = value => structuredClone(value);
const check = (ok, code) => {if (!ok) throw Object.assign(Error(code), {code, reasonCode: code});};
const freeze = value => {
  if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);}
  return value;
};
function amount(value) {
  check(typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value), 'amount_invalid');
  const n = BigInt(value); check(n <= U64, 'amount_overflow'); return n;
}
function base64(value, maximum) {
  check(typeof value === 'string' && value.length > 0 && value.length <= Math.ceil(maximum / 3) * 4
    && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value), 'wire_invalid');
  const bytes = Buffer.from(value, 'base64');
  check(bytes.length <= maximum && bytes.toString('base64') === value, 'wire_invalid'); return bytes;
}

/**
 * now() returns integer Unix seconds. maxFeeAndRentLamports is an optional
 * frozen per-attempt ceiling (default and absolute maximum: 20,000,000).
 * Plans/prepared vouchers are PRIVATE server records; project signingPayload
 * to the authenticated wallet owner. Voucher signatures use native base58.
 * Inject sdkProvider/baseTransportFactory for offline use; no SDK installation
 * or wallet fallback is performed by this sidecar.
 * nativeStoreFactory is an optional read-view injection; its close() must close
 * only that view. Recovery never writes/rewinds session records itself. Main
 * holds the financial writer lease, restores a verified finalized open via
 * lookupOpen, replays saved predecessors in order, then checkpoints the native
 * state BEFORE committing its financial CAS/authorized projection.
 */
export async function createExternalSolanaTransport(options) {
  const {terms: inputTerms, statePath, sdkProvider = loadNativeSDK,
    baseTransportFactory = createNativeTransport, nativeStoreFactory = path => new NativeSessionStore(path),
    rpcURL, now = () => Math.floor(Date.now() / 1000)} = options;
  check(!Object.hasOwn(options, 'walletPath'), 'external_wallet_path_forbidden');
  const terms = freeze(copy(inputTerms)), environment = NETWORK_ENVIRONMENTS.devnet;
  check(terms?.mode === 'devnet' && ['devnet', 'solana-devnet'].includes(terms.network)
    && (terms.settlementNetwork === undefined || terms.settlementNetwork === 'solana-devnet')
    && terms.rpc === environment.rpc && terms.genesisHash === environment.genesis
    && terms.mint === environment.mint && terms.program === PROGRAM && terms.tokenProgram === TOKEN
    && terms.decimals === 6, 'frozen_environment_mismatch');
  check(typeof terms.channelId === 'string' && terms.channelId.length > 0, 'channel_identity_invalid');
  check(terms.payer !== terms.payee && (terms.authorizedSigner === undefined || terms.authorizedSigner === terms.payer), 'frozen_party_mismatch');
  const deposit = amount(terms.depositBaseUnits), cap = amount(terms.chargeCapBaseUnits);
  check(deposit > 0n && deposit <= 10000000n && cap <= deposit, 'deposit_cap_invalid');
  check(amount(terms.openSalt) > 0n, 'open_salt_invalid');
  const feeCap = amount(terms.maxFeeAndRentLamports ?? '20000000');
  check(feeCap > 0n && feeCap <= 20000000n, 'fee_cap_invalid');
  check(Number.isSafeInteger(terms.voucherExpiresAt) && terms.voucherExpiresAt > 0, 'voucher_expiry_invalid');
  check(terms.applicationDeadlineAt === undefined || (Number.isSafeInteger(terms.applicationDeadlineAt)
    && terms.applicationDeadlineAt > 0 && terms.applicationDeadlineAt <= terms.voucherExpiresAt), 'application_deadline_invalid');
  check(terms.settlementMarginSeconds === undefined || (Number.isSafeInteger(terms.settlementMarginSeconds)
    && terms.settlementMarginSeconds >= 0), 'settlement_margin_invalid');
  if (terms.maxBidBaseUnits !== undefined) check(amount(terms.maxBidBaseUnits) > 0n && amount(terms.maxBidBaseUnits) <= cap, 'bid_cap_invalid');
  const termsHash = hashNetworkTerms(terms);
  const sdk = await sdkProvider(), {kit, onChain, voucher: voucherSDK} = sdk;
  const publicBytes = address => {
    check(typeof address === 'string', 'address_invalid');
    const bytes = Buffer.from(kit.getBase58Encoder().encode(address));
    check(bytes.length === 32 && kit.getBase58Decoder().decode(bytes) === address, 'address_invalid'); return bytes;
  };
  publicBytes(terms.payer); publicBytes(terms.payee);
  const verifySignature = (address, signature, message) => {
    check(signature?.length === 64 && signature.some(byte => byte !== 0), 'transaction_signature_missing');
    const key = createPublicKey({key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), publicBytes(address)]), format: 'der', type: 'spki'});
    check(verify(null, message, key, signature), 'transaction_signature_invalid');
  };
  // Explicit null prevents createNativeTransport's default wallet-path resolver.
  // Only unsigned/verify/submit/lookup methods of this object are ever called.
  const base = await baseTransportFactory({terms: copy(terms), statePath, walletPath: null, ...(rpcURL === undefined ? {} : {rpcURL})});
  function decode(wire) {
    const bytes = base64(wire, 1232), transaction = kit.getTransactionDecoder().decode(bytes);
    check(kit.getBase64EncodedWireTransaction(transaction) === wire, 'wire_noncanonical');
    return transaction;
  }
  function inspectPlan(plan, kind) {
    check(plan?.external?.version === VERSION && plan.external.kind === kind
      && plan.external.termsHash === termsHash, 'saved_plan_required');
    publicBytes(plan.protocolChannelId);
    const cost = amount(plan.estimatedFeeAndRentLamports);
    check(plan.simulation && plan.simulation.cost === plan.estimatedFeeAndRentLamports
      && amount(plan.simulation.fee) <= cost && cost <= feeCap
      && (plan.simulation.err === undefined || plan.simulation.err === null), 'unsigned_preflight_required');
    check(typeof plan.latest?.value?.blockhash === 'string', 'blockhash_invalid');
    const height = String(plan.latest.value.lastValidBlockHeight);
    check(amount(height) > 0n && Number.isSafeInteger(Number(height)), 'blockheight_invalid');
    const transaction = decode(plan.unsignedWireBase64);
    const message = kit.getCompiledTransactionMessageDecoder().decode(transaction.messageBytes);
    const required = message.staticAccounts.slice(0, message.header.numSignerAccounts);
    const expected = kind === 'open' ? [terms.payer] : [terms.payer, terms.payee];
    check(message.staticAccounts[0] === terms.payer && required.length === expected.length
      && new Set(required).size === required.length && expected.every(address => required.includes(address))
      && Object.keys(transaction.signatures).length === required.length
      && required.every(address => Object.hasOwn(transaction.signatures, address)), 'required_signers_mismatch');
    check(!(message.addressTableLookups?.length) && message.lifetimeToken === plan.latest.value.blockhash, 'native_message_invalid');
    check(Object.values(transaction.signatures).every(signature => signature === null || signature.every(byte => byte === 0)), 'plan_not_unsigned');
    check(Array.isArray(plan.requiredSigners) && plan.requiredSigners.length === required.length
      && plan.requiredSigners.every((address, index) => address === required[index]), 'required_signers_mismatch');
    if (kind === 'open') {
      check(plan.open?.channelId === plan.protocolChannelId && plan.open.payer === terms.payer
        && plan.open.payee === terms.payee && plan.open.mint === terms.mint
        && String(plan.open.deposit) === terms.depositBaseUnits && String(plan.open.salt) === terms.openSalt, 'open_terms_mismatch');
    } else {
      const total = amount(plan.watermark?.cumulativeAmountBaseUnits);
      check(total <= cap && total <= deposit, 'voucher_cap_exceeded');
      check(total === 0n ? terms.zeroChargeClose === true && plan.finalVoucher === undefined
        : plan.finalVoucher?.voucher?.channelId === plan.protocolChannelId
          && plan.finalVoucher.voucher.cumulativeAmount === total.toString(), 'close_voucher_mismatch');
    }
    return {transaction, required};
  }
  function signingPayload(plan, kind) {
    const {transaction, required} = inspectPlan(plan, kind);
    // This is the only transaction projection intended for an owner client.
    // In particular: no balance snapshot, final signed voucher or session state.
    return {kind: 'solana-transaction', network: 'solana-devnet', wireBase64: plan.unsignedWireBase64,
      messageBase64: Buffer.from(transaction.messageBytes).toString('base64'), requiredSigners: [...required],
      blockhash: plan.latest.value.blockhash, lastValidBlockHeight: String(plan.latest.value.lastValidBlockHeight),
      estimatedFeeAndRentLamports: plan.estimatedFeeAndRentLamports};
  }
  function decorate(raw, kind) {
    const plan = copy(raw), message = kit.getCompiledTransactionMessageDecoder().decode(decode(plan.unsignedWireBase64).messageBytes);
    plan.external = {version: VERSION, kind, termsHash};
    plan.requiredSigners = message.staticAccounts.slice(0, message.header.numSignerAccounts);
    plan.signingPayload = signingPayload(plan, kind); return plan;
  }
  function checkWire(plan, wireBase64, kind, complete) {
    const {transaction: unsigned, required} = inspectPlan(plan, kind), transaction = decode(wireBase64);
    check(Buffer.from(transaction.messageBytes).equals(Buffer.from(unsigned.messageBytes)), 'transaction_message_mismatch');
    check(Object.keys(transaction.signatures).length === required.length
      && required.every(address => Object.hasOwn(transaction.signatures, address)), 'required_signers_mismatch');
    for (const address of required) {
      const signature = transaction.signatures[address];
      if (signature && signature.some(byte => byte !== 0)) verifySignature(address, signature, transaction.messageBytes);
      else check(!complete, 'transaction_signature_missing');
    }
    return transaction;
  }
  async function verifyOpen(plan, wireBase64) {
    const result = await onChain.verifyOpenTx({
      openPayload: {...plan.open, depositAmount: terms.depositBaseUnits, gracePeriodSeconds: plan.open.gracePeriod,
        transaction: wireBase64, authorizedSigner: terms.payer},
      expected: {authorizedSigner: terms.payer, channelProgram: PROGRAM, currency: terms.mint,
        feePayer: terms.payer, minimumDeposit: deposit, mint: terms.mint, network: 'devnet',
        openSlot: BigInt(plan.open.openSlot), recentBlockhash: plan.latest.value.blockhash,
        recipient: terms.payee, rentPayer: terms.payer, splits: [], tokenProgram: TOKEN},
    });
    check(result.channelId === plan.protocolChannelId && result.deposit === deposit, 'open_terms_mismatch');
  }
  async function acceptTransaction({plan, wireBase64}, kind) {
    // No freshness check here: saved signatures must remain verifiable on restart,
    // including after blockhash expiry. Only submit* checks current RPC freshness.
    checkWire(plan, wireBase64, kind, true);
    if (kind === 'open') await verifyOpen(plan, wireBase64);
    else if (plan.finalVoucher) await verifyVoucher(plan.finalVoucher, plan.protocolChannelId, plan.watermark.cumulativeAmountBaseUnits, false);
    const txSignature = onChain.transactionSignatureFromWire(wireBase64);
    const transaction = decode(wireBase64);
    check(txSignature === kit.getBase58Decoder().decode(transaction.signatures[terms.payer]), 'transaction_identity_mismatch');
    return {wireBase64, txSignature, blockhash: plan.latest.value.blockhash,
      lastValidBlockHeight: String(plan.latest.value.lastValidBlockHeight),
      estimatedFeeAndRentLamports: plan.estimatedFeeAndRentLamports, simulation: copy(plan.simulation)};
  }
  async function transactionOperation(input, kind, broadcast) {
    const plan = copy(input.plan), submitted = copy(input.signed);
    const signed = await acceptTransaction({plan, wireBase64: submitted?.wireBase64}, kind);
    for (const field of ['txSignature', 'blockhash', 'lastValidBlockHeight', 'estimatedFeeAndRentLamports'])
      check(submitted[field] === signed[field], 'signed_transaction_metadata_mismatch');
    if (broadcast) {
      if (kind === 'close' && plan.finalVoucher)
        await verifyVoucher(plan.finalVoucher, plan.protocolChannelId, plan.watermark.cumulativeAmountBaseUnits, true);
      await base.assertPlanFresh({plan});
    }
    // Main must already have persisted this exact plan and signed wire.
    return base[`${broadcast ? 'submit' : 'lookup'}${kind === 'open' ? 'Open' : 'Close'}`]({plan, signed});
  }
  function channelIdentity(channel) {
    check(channel?.channelId === terms.channelId, 'channel_identity_mismatch');
    publicBytes(channel.protocolChannelId);
    if (terms.protocolChannelId !== undefined) check(channel.protocolChannelId === terms.protocolChannelId, 'channel_identity_mismatch');
    for (const field of ['payer', 'payee', 'mint']) if (channel[field] !== undefined) check(channel[field] === terms[field], 'frozen_party_mismatch');
    return channel.protocolChannelId;
  }
  function freshVoucher() {
    const time = now(); check(Number.isSafeInteger(time) && time >= 0, 'clock_invalid');
    check(terms.voucherExpiresAt > time + (terms.settlementMarginSeconds ?? 60), 'voucher_expired');
    if (terms.applicationDeadlineAt !== undefined) check(time < terms.applicationDeadlineAt, 'application_deadline');
  }
  function intentAmounts(intent) {
    const previous = amount(intent?.previousAmountBaseUnits), total = amount(intent?.cumulativeAmountBaseUnits);
    const increment = amount(intent?.charge?.amountBaseUnits);
    check(increment > 0n && total === previous + increment, 'voucher_increment_invalid');
    check(total <= deposit && total <= cap, 'voucher_cap_exceeded');
    if (terms.maxBidBaseUnits !== undefined) check(increment <= amount(terms.maxBidBaseUnits), 'bid_cap_exceeded');
    check(typeof intent.charge.id === 'string' && intent.charge.id.length > 0, 'charge_identity_invalid');
    if (intent.charge.channelId !== undefined) check(intent.charge.channelId === terms.channelId, 'channel_identity_mismatch');
    return total.toString();
  }
  async function verifyVoucher(signed, channelId, total, fresh) {
    check(signed?.signatureType === 'ed25519' && signed.signer === terms.payer
      && signed.voucher?.channelId === channelId && signed.voucher.cumulativeAmount === total
      && signed.voucher.expiresAt === terms.voucherExpiresAt, 'native_voucher_terms_mismatch');
    check(amount(total) > 0n && amount(total) <= cap && amount(total) <= deposit, 'voucher_cap_exceeded');
    if (fresh) freshVoucher();
    const bytes = voucherSDK.encodeVoucherMessageLoose(signed.voucher), payloadHash = sha(bytes);
    if (signed.payloadHash !== undefined) check(signed.payloadHash === payloadHash, 'voucher_payload_mismatch');
    check(await voucherSDK.verifyVoucherSignature({signatureBase58: signed.signature, signerBase58: terms.payer, voucher: signed.voucher}), 'native_voucher_signature_invalid');
    return {signature: signed.signature, signatureType: 'ed25519', signer: terms.payer,
      voucher: copy(signed.voucher), payloadHash};
  }
  function voucherPrepared(input, fresh) {
    const {channel, intent} = input, channelId = channelIdentity(channel), total = intentAmounts(intent);
    if (fresh) freshVoucher();
    const voucher = {channelId, cumulativeAmount: total, expiresAt: terms.voucherExpiresAt};
    const bytes = voucherSDK.encodeVoucherMessageLoose(voucher);
    return {kind: 'solana-voucher', network: 'solana-devnet', termsHash, signatureType: 'ed25519', signer: terms.payer,
      voucher, messageBase64: Buffer.from(bytes).toString('base64'), payloadHash: sha(bytes),
      channel: {channelId: terms.channelId, protocolChannelId: channelId}, intent: copy(intent)};
  }
  async function nativeState(channelId) {
    // Separate read view of the base transport's store; do not initialize a
    // channel, set a watermark, clear pending/close state or bypass SDK routes.
    const view = await nativeStoreFactory(statePath);
    try {return copy(await view.getChannel(channelId));} finally {await view.close?.();}
  }
  function recoveryReceipt(receipt, saved) {
    if (receipt?.status !== 'authorized') {
      check(['unknown', 'absent'].includes(receipt?.status), 'native_recovery_lookup_invalid'); return false;
    }
    check(receipt.deliveryId === saved.intent.charge.id && receipt.incrementBaseUnits === saved.intent.charge.amountBaseUnits
      && receipt.cumulativeAmountBaseUnits === saved.intent.cumulativeAmountBaseUnits
      && receipt.payloadHash === saved.voucher.payloadHash, 'native_recovery_receipt_mismatch');
    return true;
  }
  async function recoveryPredecessor(state, saved) {
    const previous = amount(saved.intent.previousAmountBaseUnits), channelId = saved.channel.protocolChannelId;
    check(state, 'native_recovery_session_missing');
    check(state.schemaVersion === 1 && state.channelId === channelId && state.payer === terms.payer
      && state.rentPayer === terms.payer && state.authorizedSigner === terms.payer && state.voucherSigner === 'client'
      && state.deposit === deposit, 'native_recovery_session_mismatch');
    check(state.sealed === false && state.closeRequestedAt === undefined && state.settledOnChain === 0n, 'native_recovery_session_closed');
    check(state.cumulative === previous && state.spentAmount === previous
      && Array.isArray(state.committedDeliveries) && Array.isArray(state.pendingDeliveries), 'native_recovery_predecessor_mismatch');
    // This account namespace uses only ordered reserve/commit operations. Bind
    // the native predecessor to its exact signed cumulative history, not merely
    // a mutable numeric watermark. Missing older history must be replayed first.
    let cumulative = 0n; const ids = new Set();
    for (const record of state.committedDeliveries) {
      check(typeof record.deliveryId === 'string' && !ids.has(record.deliveryId)
        && record.deliveryId !== saved.intent.charge.id && typeof record.amount === 'bigint' && record.amount > 0n,
      'native_recovery_history_mismatch');
      ids.add(record.deliveryId); cumulative += record.amount;
      check(record.cumulative === cumulative && cumulative <= previous, 'native_recovery_history_mismatch');
      await verifyVoucher({signature: record.voucherSignature, signatureType: 'ed25519', signer: terms.payer,
        voucher: {channelId, cumulativeAmount: cumulative.toString(), expiresAt: terms.voucherExpiresAt}},
      channelId, cumulative.toString(), false);
    }
    check(cumulative === previous, 'native_recovery_history_mismatch');
    const last = state.committedDeliveries.at(-1);
    check(previous === 0n ? state.highestVoucherSignature === undefined && state.highestVoucherExpiresAt === undefined
      : state.highestVoucherSignature === last?.voucherSignature && state.highestVoucherExpiresAt === BigInt(terms.voucherExpiresAt),
    'native_recovery_history_mismatch');
    check(state.pendingDeliveries.length <= 1
      && state.nextDeliverySequence === BigInt(state.committedDeliveries.length + state.pendingDeliveries.length),
    'native_recovery_reservation_mismatch');
    const pending = state.pendingDeliveries[0];
    if (pending) check(pending.deliveryId === saved.intent.charge.id && pending.amount === amount(saved.intent.charge.amountBaseUnits)
      && pending.expiresAt === BigInt(terms.voucherExpiresAt) && pending.sequence === state.nextDeliverySequence,
    'native_recovery_reservation_mismatch');
    return Boolean(pending);
  }
  async function recoverSavedVoucher(input) {
    const saved = copy(input), expected = voucherPrepared(saved, false);
    check(typeof saved.intent.charge.acceptedReceiptHash === 'string' && saved.intent.charge.acceptedReceiptHash.length > 0,
      'charge_identity_invalid');
    saved.voucher = await verifyVoucher(saved.voucher, expected.voucher.channelId, expected.voucher.cumulativeAmount, false);
    // The lookup is first, before reading/restoring reservations. Even an expired
    // or sealed, already-authorized delivery returns its existing receipt only.
    const receipt = await base.lookupCommit(saved);
    if (recoveryReceipt(receipt, saved)) return receipt;
    const pending = await recoveryPredecessor(await nativeState(expected.voucher.channelId), saved);
    // Recovery of an existing obligation is not new signing/admission: an
    // application deadline must not prevent it. Native expiry/window still do.
    const time = now(); check(Number.isSafeInteger(time) && time >= 0, 'clock_invalid');
    check(terms.voucherExpiresAt > time + Math.max(60, terms.settlementMarginSeconds ?? 60), 'voucher_expired');
    if (!pending) {
      // SDK reservation is NOT idempotent. Recreate only when none exists and
      // the exact predecessor has been established above; never erase a record.
      const reservation = await base.reserveDelivery({channel: copy(saved.channel), charge: copy(saved.intent.charge)});
      check(reservation?.deliveryId === saved.intent.charge.id && reservation.amountBaseUnits === saved.intent.charge.amountBaseUnits,
        'native_recovery_reservation_mismatch');
      saved.reservation = reservation;
    }
    check(await recoveryPredecessor(await nativeState(expected.voucher.channelId), saved), 'native_recovery_reservation_mismatch');
    // No prepareVoucher, fresh total, signing or chain broadcast. The SDK checks
    // the exact predecessor/delta/signature again inside its commit mutator.
    const committed = await base.commitVoucher(saved);
    recoveryReceipt(committed, saved); return committed;
  }
  async function prepareVoucher(input) {
    const prepared = voucherPrepared(copy(input), true);
    prepared.signingPayload = {kind: prepared.kind, network: prepared.network, signatureType: prepared.signatureType,
      signer: prepared.signer, voucher: copy(prepared.voucher), messageBase64: prepared.messageBase64, payloadHash: prepared.payloadHash};
    return prepared;
  }
  async function resumeSavedVoucherPreparation(saved) {
    const expected = voucherPrepared(saved, false), channelId = expected.voucher.channelId;
    check(typeof saved.intent.charge.acceptedReceiptHash === 'string' && saved.intent.charge.acceptedReceiptHash.length > 0,
      'charge_identity_invalid');
    const pending = await recoveryPredecessor(await nativeState(channelId), saved);
    freshVoucher();
    if (!pending) {
      const reserved = await base.reserveDelivery({channel: copy(saved.channel), charge: copy(saved.intent.charge)});
      check(reserved?.deliveryId === saved.intent.charge.id && reserved.amountBaseUnits === saved.intent.charge.amountBaseUnits,
        'native_recovery_reservation_mismatch');
    }
    const state = await nativeState(channelId);
    check(await recoveryPredecessor(state, saved), 'native_recovery_reservation_mismatch');
    const record = state.pendingDeliveries[0];
    // The SDK persists delivery id/amount/expiry/sequence, not the directive.
    // Reconstruct its pinned route projection with the SAME saved charge proof;
    // no new delivery id, amount, sequence, signature or mutable URL is chosen.
    const reservation = {deliveryId: record.deliveryId, amountBaseUnits: record.amount.toString(), nativeDirective: {
      amount: record.amount.toString(), commitUrl: '/__402/session/commit', currency: terms.mint,
      deliveryId: record.deliveryId, expiresAt: Number(record.expiresAt),
      proof: {acceptedReceiptHash: saved.intent.charge.acceptedReceiptHash}, sequence: Number(record.sequence), sessionId: channelId,
    }};
    return {reservation, prepared: await prepareVoucher(saved)};
  }
  return {
    evidenceLabel: 'native_mpp_test_network_external_wallet',
    async assertPlanFresh({plan: inputPlan}) {
      const plan = copy(inputPlan), kind = plan?.external?.kind;
      check(['open', 'close'].includes(kind), 'saved_plan_required');
      inspectPlan(plan, kind);
      if (kind === 'close' && plan.finalVoucher)
        await verifyVoucher(plan.finalVoucher, plan.protocolChannelId, plan.watermark.cumulativeAmountBaseUnits, false);
      return base.assertPlanFresh({plan});
    },
    async prepareOpen() {return decorate(await base.prepareOpen(), 'open');},
    acceptSignedOpen: input => acceptTransaction(copy(input), 'open'),
    submitOpen: input => transactionOperation(input, 'open', true),
    lookupOpen: input => transactionOperation(input, 'open', false),
    async reserveDelivery(input) {
      const channelId = channelIdentity(input.channel), charge = copy(input.charge);
      check(typeof charge?.id === 'string' && charge.id.length > 0 && typeof charge.acceptedReceiptHash === 'string'
        && charge.acceptedReceiptHash.length > 0, 'charge_identity_invalid');
      const increment = amount(charge.amountBaseUnits);
      check(increment > 0n && increment <= cap && increment <= deposit, 'voucher_cap_exceeded');
      if (terms.maxBidBaseUnits !== undefined) check(increment <= amount(terms.maxBidBaseUnits), 'bid_cap_exceeded');
      if (charge.channelId !== undefined) check(charge.channelId === terms.channelId, 'channel_identity_mismatch');
      freshVoucher();
      return base.reserveDelivery({channel: {channelId: terms.channelId, protocolChannelId: channelId}, charge});
    },
    prepareVoucher,
    resumeVoucherPreparation({channel, intent}) {
      const saved = {channel: copy(channel), intent: copy(intent)}, channelId = channelIdentity(saved.channel);
      return queueRecovery(`${statePath}:${channelId}`, () => resumeSavedVoucherPreparation(saved));
    },
    async acceptSignedVoucher({prepared: input, signature}) {
      const prepared = copy(input), expected = voucherPrepared(prepared, true);
      check(prepared.kind === expected.kind && prepared.network === expected.network && prepared.termsHash === termsHash
        && prepared.signer === terms.payer && prepared.signatureType === 'ed25519'
        && prepared.messageBase64 === expected.messageBase64 && prepared.payloadHash === expected.payloadHash
        && hashNetworkTerms(prepared.voucher) === hashNetworkTerms(expected.voucher), 'voucher_payload_mismatch');
      return verifyVoucher({signature, signatureType: 'ed25519', signer: terms.payer,
        voucher: expected.voucher, payloadHash: expected.payloadHash}, expected.voucher.channelId, expected.voucher.cumulativeAmount, true);
    },
    async commitVoucher(input) {
      const saved = copy(input), expected = voucherPrepared(saved, true);
      saved.voucher = await verifyVoucher(saved.voucher, expected.voucher.channelId, expected.voucher.cumulativeAmount, true);
      return base.commitVoucher(saved);
    },
    async lookupCommit(input) {
      const saved = copy(input), expected = voucherPrepared(saved, false);
      saved.voucher = await verifyVoucher(saved.voucher, expected.voucher.channelId, expected.voucher.cumulativeAmount, false);
      return base.lookupCommit(saved);
    },
    recoverVoucher(input) {
      const saved = copy(input), channelId = channelIdentity(saved.channel);
      return queueRecovery(`${statePath}:${channelId}`, () => recoverSavedVoucher(saved));
    },
    async prepareClose(input) {
      const saved = copy(input), channelId = channelIdentity(saved.channel), total = saved.watermark?.cumulativeAmountBaseUnits;
      check(amount(total) <= cap && amount(total) <= deposit, 'voucher_cap_exceeded');
      if (total === '0') check(terms.zeroChargeClose === true && saved.finalVoucher === undefined, 'close_voucher_mismatch');
      else saved.finalVoucher = await verifyVoucher(saved.finalVoucher, channelId, total, true);
      const plan = decorate(await base.prepareClose(saved), 'close');
      check(plan.protocolChannelId === channelId && hashNetworkTerms(plan.watermark) === hashNetworkTerms(saved.watermark), 'close_terms_mismatch');
      return plan;
    },
    async collectCloseSignature({plan: inputPlan, wireBase64, previousWireBase64 = null, signerAddress}) {
      // signerAddress MUST come from Main's authenticated actor wallet binding,
      // never from an untrusted request body or an SDK credential.
      const plan = copy(inputPlan);
      check([terms.payer, terms.payee].includes(signerAddress), 'close_actor_mismatch');
      const current = checkWire(plan, wireBase64, 'close', false);
      const actorSignature = current.signatures[signerAddress];
      verifySignature(signerAddress, actorSignature, current.messageBytes);
      const previous = previousWireBase64 === null ? null : checkWire(plan, previousWireBase64, 'close', false);
      const signatures = {...current.signatures};
      for (const address of plan.requiredSigners) {
        const old = previous?.signatures[address], next = signatures[address];
        if (!old?.some(byte => byte !== 0)) continue;
        if (next?.some(byte => byte !== 0)) check(Buffer.from(old).equals(Buffer.from(next)), 'close_signature_conflict');
        signatures[address] = old;
      }
      const merged = kit.getBase64EncodedWireTransaction({...current, signatures});
      checkWire(plan, merged, 'close', false);
      return {wireBase64: merged, complete: plan.requiredSigners.every(address => signatures[address]?.some(byte => byte !== 0))};
    },
    acceptSignedClose: input => acceptTransaction(copy(input), 'close'),
    submitClose: input => transactionOperation(input, 'close', true),
    lookupClose: input => transactionOperation(input, 'close', false),
    close: () => base.close(),
  };
}
