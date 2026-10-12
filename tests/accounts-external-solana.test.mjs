import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync, createPublicKey, createHash, sign, verify} from 'node:crypto';
import {existsSync, mkdtempSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createExternalSolanaTransport} from '../packages/accounts/external-solana-transport.mjs';
import {loadNativeSDK} from '../packages/payments/sdk-loader.mjs';
import {NETWORK_ENVIRONMENTS} from '../packages/payments/sdk-transport.mjs';
import {NativeSessionStore} from '../packages/payments/native-store.mjs';

// Offline injection fixture, not chain evidence. Real Ed25519 keys exist only
// in memory. The fixture encodes standard v0 Solana wires (no JSON signatures).
const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58encode(bytes) {
  let n = BigInt(`0x${Buffer.from(bytes).toString('hex') || '0'}`), result = '';
  while (n) {result = alphabet[Number(n % 58n)] + result; n /= 58n;}
  let zeros = 0; while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  return '1'.repeat(zeros) + result;
}
function b58decode(value) {
  assert.equal(typeof value, 'string'); let n = 0n;
  for (const char of value) {assert.ok(alphabet.includes(char)); n = n * 58n + BigInt(alphabet.indexOf(char));}
  const hex = n.toString(16), body = n === 0n ? Buffer.alloc(0) : Buffer.from(hex.length % 2 ? `0${hex}` : hex, 'hex');
  let zeros = 0; while (value[zeros] === '1') zeros++;
  return Buffer.concat([Buffer.alloc(zeros), body]);
}
function identity() {
  const {privateKey, publicKey} = generateKeyPairSync('ed25519');
  return {privateKey, address: b58encode(Buffer.from(publicKey.export({format: 'jwk'}).x, 'base64url'))};
}
function messageDecode(bytes) {
  assert.equal(bytes[0], 0x80);
  const count = bytes[4], staticAccounts = [];
  for (let i = 0; i < count; i++) staticAccounts.push(b58encode(bytes.subarray(5 + i * 32, 37 + i * 32)));
  return {version: 0, header: {numSignerAccounts: bytes[1]}, staticAccounts,
    lifetimeToken: b58encode(bytes.subarray(5 + count * 32, 37 + count * 32)), addressTableLookups: []};
}
function transactionDecode(bytes) {
  const count = bytes[0], messageBytes = bytes.subarray(1 + count * 64), message = messageDecode(messageBytes);
  assert.equal(count, message.header.numSignerAccounts);
  const signatures = {};
  for (let i = 0; i < count; i++) {
    const bytesAt = bytes.subarray(1 + 64 * i, 65 + 64 * i);
    signatures[message.staticAccounts[i]] = bytesAt.some(byte => byte !== 0) ? bytesAt : null;
  }
  return {messageBytes, signatures};
}
function transactionEncode(transaction) {
  const count = transaction.messageBytes[1], addresses = messageDecode(transaction.messageBytes).staticAccounts.slice(0, count);
  return Buffer.concat([Buffer.from([count]), ...addresses.map(address => transaction.signatures[address] ?? Buffer.alloc(64)), transaction.messageBytes]).toString('base64');
}
function encodeVoucherMessageLoose(voucher) {
  const bytes = Buffer.alloc(50); bytes.set([0x56, 1]); bytes.set(b58decode(voucher.channelId), 2);
  bytes.writeBigUInt64LE(BigInt(voucher.cumulativeAmount), 34); bytes.writeBigInt64LE(BigInt(voucher.expiresAt), 42); return bytes;
}
const fixtureSDK = {
  kit: {
    getBase58Encoder: () => ({encode: b58decode}), getBase58Decoder: () => ({decode: b58encode}),
    getTransactionDecoder: () => ({decode: transactionDecode}),
    getCompiledTransactionMessageDecoder: () => ({decode: messageDecode}),
    getBase64EncodedWireTransaction: transactionEncode,
  },
  voucher: {
    encodeVoucherMessageLoose,
    async verifyVoucherSignature({signatureBase58, signerBase58, voucher}) {
      const bytes = b58decode(signatureBase58); if (bytes.length !== 64) return false;
      const key = createPublicKey({key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), b58decode(signerBase58)]), format: 'der', type: 'spki'});
      return verify(null, encodeVoucherMessageLoose(voucher), key, bytes);
    },
  },
  onChain: {
    transactionSignatureFromWire: wire => b58encode(Object.values(transactionDecode(Buffer.from(wire, 'base64')).signatures)[0]),
    async verifyOpenTx({openPayload, expected}) {
      assert.equal(openPayload.payer, expected.feePayer); assert.equal(openPayload.payee, expected.recipient);
      assert.equal(openPayload.authorizedSigner, expected.authorizedSigner);
      assert.equal(openPayload.mint, expected.mint); assert.equal(expected.network, 'devnet');
      return {channelId: openPayload.channelId, deposit: BigInt(openPayload.depositAmount)};
    },
  },
};
const program = 'CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX';
const token = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const blockhash = '11111111111111111111111111111111';
function unsignedWire(required, accounts = [], data = Buffer.from([0, 0])) {
  const all = [...required, ...accounts.filter(address => !required.includes(address))];
  const messageBytes = Buffer.concat([Buffer.from([0x80, required.length, 0, 0, all.length]),
    ...all.map(b58decode), b58decode(blockhash), data]);
  return transactionEncode({messageBytes, signatures: Object.fromEntries(required.map(address => [address, null]))});
}
function signedWire(wire, ...signers) {
  const transaction = transactionDecode(Buffer.from(wire, 'base64'));
  for (const signer of signers) transaction.signatures[signer.address] = sign(null, transaction.messageBytes, signer.privateKey);
  return transactionEncode(transaction);
}
function alterSignature(wire, address, bytes) {
  const transaction = transactionDecode(Buffer.from(wire, 'base64'));
  transaction.signatures[address] = bytes; return transactionEncode(transaction);
}
// Alternative valid Ed25519 signature for conflict testing ONLY. The nonce r=1
// is intentionally insecure; this uses an ephemeral fixture key and never ships
// in production code. Unlike bit-flipping, this exercises the valid/valid merge.
function alternativeFixtureSignature(message, privateKey) {
  const le = bytes => BigInt(`0x${Buffer.from(bytes).reverse().toString('hex')}`);
  const seed = Buffer.from(privateKey.export({format: 'jwk'}).d, 'base64url');
  const expanded = createHash('sha512').update(seed).digest().subarray(0, 32);
  expanded[0] &= 248; expanded[31] &= 63; expanded[31] |= 64;
  const scalar = le(expanded), order = (1n << 252n) + 27742317777372353535851937790883648493n;
  const R = Buffer.from(`58${'66'.repeat(31)}`, 'hex');
  const A = Buffer.from(createPublicKey(privateKey).export({format: 'jwk'}).x, 'base64url');
  const h = le(createHash('sha512').update(R).update(A).update(message).digest()) % order;
  const S = (1n + h * scalar) % order;
  return Buffer.concat([R, Buffer.from(S.toString(16).padStart(64, '0'), 'hex').reverse()]);
}
async function fixture({overrideTerms = {}, sdk = fixtureSDK, baseOptions = {}} = {}) {
  const payer = identity(), payee = identity(), foreign = identity(), protocolChannelId = identity().address;
  const environment = NETWORK_ENVIRONMENTS.devnet;
  const terms = {mode: 'devnet', network: 'devnet', settlementNetwork: 'solana-devnet', rpc: environment.rpc,
    genesisHash: environment.genesis, mint: environment.mint, program, tokenProgram: token, decimals: 6,
    channelId: 'account-channel', payer: payer.address, payee: payee.address, depositBaseUnits: '20000',
    chargeCapBaseUnits: '8000', maxBidBaseUnits: '4000', maxFeeAndRentLamports: '20000000', openSalt: '42',
    voucherExpiresAt: 2000007200, applicationDeadlineAt: 2000007100, zeroChargeClose: true, ...overrideTerms};
  let time = 2000000000, expiredBlockhash = false; const calls = [], commits = new Map();
  const plan = operation => ({protocolChannelId,
    latest: {value: {blockhash, lastValidBlockHeight: 1000}, context: {slot: 10}},
    unsignedWireBase64: unsignedWire(operation === 'open' ? [payer.address] : [payer.address, payee.address], [payee.address, terms.mint, program]),
    estimatedFeeAndRentLamports: '15000', simulation: {fee: '10000', cost: '15000', units: 100},
    before: {payerBaseUnits: '100000', publisherBaseUnits: '0'},
    ...(operation === 'open' ? {open: {channelId: protocolChannelId, payer: payer.address, payee: payee.address,
      mint: terms.mint, deposit: '20000', salt: '42', openSlot: '10', gracePeriod: 900}} : {})});
  const base = {
    async prepareOpen() {calls.push('prepareOpen'); return plan('open');},
    async prepareClose(input) {calls.push('prepareClose'); return {...plan('close'), ...input};},
    async assertPlanFresh() {calls.push('freshness'); if (expiredBlockhash) throw Error('unsigned_plan_expired'); return true;},
    async submitOpen(input) {calls.push('submitOpen'); return {status: 'submitted', txSignature: input.signed.txSignature};},
    async lookupOpen(input) {calls.push('lookupOpen'); return {status: 'finalized', txSignature: input.signed.txSignature};},
    async submitClose(input) {calls.push('submitClose'); return {status: 'submitted', txSignature: input.signed.txSignature};},
    async lookupClose(input) {calls.push('lookupClose'); return {status: 'finalized', txSignature: input.signed.txSignature};},
    async reserveDelivery(input) {calls.push('reserveDelivery'); return {deliveryId: input.charge.id, amountBaseUnits: input.charge.amountBaseUnits};},
    async commitVoucher(input) {calls.push('commitVoucher'); commits.set(input.intent.charge.id, input.voucher); return {status: 'authorized', payloadHash: input.voucher.payloadHash};},
    async lookupCommit(input) {calls.push('lookupCommit'); return {status: commits.has(input.intent.charge.id) ? 'authorized' : 'unknown'};},
    close() {calls.push('close');},
    ...baseOptions,
  };
  for (const method of ['signOpen', 'signClose', 'prepareVoucher', 'snapshot']) Object.defineProperty(base, method, {
    get() {throw Error(`forbidden_legacy_${method}`);},
  });
  const construct = async (overrides = {}) => createExternalSolanaTransport({terms, statePath: ':memory:', sdkProvider: async () => sdk,
    baseTransportFactory: async options => {assert.equal(options.walletPath, null); assert.equal(options.statePath, ':memory:'); return base;},
    now: () => time, ...overrides});
  const transport = await construct();
  const channel = {channelId: terms.channelId, protocolChannelId};
  const intent = {previousAmountBaseUnits: '0', cumulativeAmountBaseUnits: '3000', sequence: '1',
    charge: {id: 'charge-1', channelId: terms.channelId, amountBaseUnits: '3000', acceptedReceiptHash: 'offline-receipt'}};
  return {payer, payee, foreign, terms, channel, intent, transport, construct, plan, base, calls, commits,
    expireBlockhash: () => {expiredBlockhash = true;}, expireVoucher: () => {time = terms.voucherExpiresAt + 1;}};
}
const watermark = total => ({sequence: total === '0' ? '0' : '1', cumulativeAmountBaseUnits: total,
  finalVoucherHash: total === '0' ? null : 'fixture-hash', orderedChargeCommitment: 'fixture-commitment'});
async function voucher(f) {
  const prepared = await f.transport.prepareVoucher({channel: f.channel, intent: f.intent});
  const signature = b58encode(sign(null, Buffer.from(prepared.messageBase64, 'base64'), f.payer.privateKey));
  return {prepared, signed: await f.transport.acceptSignedVoucher({prepared, signature}), signature};
}
function emptyNativeState(f) {
  return {schemaVersion: 1, channelId: f.channel.protocolChannelId, payer: f.payer.address,
    authorizedSigner: f.payer.address, rentPayer: f.payer.address, deposit: BigInt(f.terms.depositBaseUnits),
    cumulative: 0n, spentAmount: 0n, settledOnChain: 0n, sealed: false, voucherSigner: 'client',
    pendingDeliveries: [], committedDeliveries: [], processedUses: [], nextDeliverySequence: 0n};
}
async function recoveryFixture() {
  const f = await fixture(); let state = emptyNativeState(f);
  const receipt = input => ({status: 'authorized', deliveryId: input.intent.charge.id,
    incrementBaseUnits: input.intent.charge.amountBaseUnits, cumulativeAmountBaseUnits: input.intent.cumulativeAmountBaseUnits,
    payloadHash: input.voucher.payloadHash});
  f.base.lookupCommit = async input => {
    f.calls.push('lookupCommit');
    const record = state?.committedDeliveries.find(row => row.deliveryId === input.intent.charge.id);
    return record && record.voucherSignature === input.voucher.signature
      && record.cumulative.toString() === input.intent.cumulativeAmountBaseUnits
      && record.amount.toString() === input.intent.charge.amountBaseUnits ? receipt(input) : {status: 'unknown'};
  };
  f.base.lookupOpen = async input => {f.calls.push('lookupOpen'); state ??= emptyNativeState(f);
    return {status: 'finalized', finality: 'finalized', txSignature: input.signed.txSignature, protocolChannelId: f.channel.protocolChannelId};};
  f.base.reserveDelivery = async input => {
    f.calls.push('reserveDelivery'); assert.ok(state); assert.equal(state.sealed, false);
    assert.equal(state.pendingDeliveries.some(row => row.deliveryId === input.charge.id), false);
    state.nextDeliverySequence++;
    state.pendingDeliveries.push({deliveryId: input.charge.id, amount: BigInt(input.charge.amountBaseUnits),
      expiresAt: BigInt(f.terms.voucherExpiresAt), sequence: state.nextDeliverySequence});
    return {deliveryId: input.charge.id, amountBaseUnits: input.charge.amountBaseUnits};
  };
  f.base.commitVoucher = async input => {
    f.calls.push('commitVoucher');
    assert.equal(await fixtureSDK.voucher.verifyVoucherSignature({signatureBase58: input.voucher.signature,
      signerBase58: f.payer.address, voucher: input.voucher.voucher}), true);
    const pending = state.pendingDeliveries.find(row => row.deliveryId === input.intent.charge.id);
    assert.ok(pending); const total = BigInt(input.voucher.voucher.cumulativeAmount), increment = total - state.cumulative;
    assert.equal(increment, pending.amount);
    state.committedDeliveries.push({deliveryId: pending.deliveryId, amount: increment, cumulative: total, voucherSignature: input.voucher.signature});
    state.pendingDeliveries = state.pendingDeliveries.filter(row => row.deliveryId !== pending.deliveryId);
    state.cumulative = total; state.spentAmount += increment;
    state.highestVoucherSignature = input.voucher.signature; state.highestVoucherExpiresAt = BigInt(f.terms.voucherExpiresAt);
    return receipt(input);
  };
  f.transport = await f.construct({nativeStoreFactory: async () => ({getChannel: async () => structuredClone(state), close() {}})});
  return {...f, state: () => structuredClone(state), changeState: mutate => {mutate(state);}, discardSQLite: () => {state = undefined;},
    async signedInput(intent = f.intent) {
      const prepared = await f.transport.prepareVoucher({channel: f.channel, intent});
      const signature = b58encode(sign(null, Buffer.from(prepared.messageBase64, 'base64'), f.payer.privateKey));
      return {channel: f.channel, intent, voucher: await f.transport.acceptSignedVoucher({prepared, signature})};
    }};
}

test('public assertPlanFresh validates saved open/close plans before forwarding an unchanged defensive copy', async () => {
  const f = await fixture(), open = await f.transport.prepareOpen();
  const close = await f.transport.prepareClose({channel: f.channel, watermark: watermark('0')});
  const forwarded = []; f.base.assertPlanFresh = async ({plan}) => {forwarded.push(plan); return true;};
  for (const plan of [open, close]) {
    assert.equal(await f.transport.assertPlanFresh({plan}), true);
    assert.deepEqual(forwarded.at(-1), plan); assert.notEqual(forwarded.at(-1), plan);
    const broken = structuredClone(plan); broken.simulation.cost = '1';
    await assert.rejects(f.transport.assertPlanFresh({plan: broken}), /unsigned_preflight_required/);
  }
  await assert.rejects(f.transport.assertPlanFresh({plan: {...open, external: {...open.external, kind: 'payout'}}}), /saved_plan_required/);
  assert.equal(forwarded.length, 2);
  f.base.assertPlanFresh = async () => {throw Error('unsigned_plan_expired');};
  await assert.rejects(f.transport.assertPlanFresh({plan: open}), /unsigned_plan_expired/);
});

test('unsigned voucher preparation resumes interruption BEFORE reservation using the same saved intent exactly once', async () => {
  const f = await recoveryFixture(), saved = {channel: f.channel, intent: f.intent}, original = structuredClone(saved);
  const reserve = f.base.reserveDelivery; let interrupted = false;
  f.base.reserveDelivery = async input => {
    if (!interrupted) {interrupted = true; throw Error('interrupted_before_reservation');}
    return reserve(input);
  };
  await assert.rejects(f.transport.resumeVoucherPreparation(saved), /interrupted_before_reservation/);
  assert.equal(f.state().pendingDeliveries.length, 0); assert.equal(f.state().nextDeliverySequence, 0n);
  const [first, repeat] = await Promise.all([f.transport.resumeVoucherPreparation(saved), f.transport.resumeVoucherPreparation(saved)]);
  assert.deepEqual(first, repeat); assert.deepEqual(saved, original);
  assert.deepEqual(first.prepared.intent, original.intent); assert.equal(first.prepared.voucher.cumulativeAmount, '3000');
  assert.equal(first.reservation.deliveryId, original.intent.charge.id); assert.equal(first.reservation.nativeDirective.sequence, 1);
  assert.deepEqual(first.reservation.nativeDirective.proof, {acceptedReceiptHash: original.intent.charge.acceptedReceiptHash});
  assert.deepEqual(first.prepared, await f.transport.prepareVoucher(saved));
  assert.equal(Object.hasOwn(first.prepared, 'signature'), false);
  assert.equal(f.state().pendingDeliveries.length, 1); assert.equal(f.state().nextDeliverySequence, 1n);
  assert.deepEqual(f.calls, ['reserveDelivery']);
});

test('unsigned voucher preparation resumes interruption AFTER reservation without reserving again or advancing intent/sequence', async () => {
  const f = await recoveryFixture(), saved = {channel: f.channel, intent: f.intent};
  const reserve = f.base.reserveDelivery;
  f.base.reserveDelivery = async input => {await reserve(input); throw Error('interrupted_after_reservation');};
  await assert.rejects(f.transport.resumeVoucherPreparation(saved), /interrupted_after_reservation/);
  const checkpoint = f.state(); assert.equal(checkpoint.pendingDeliveries.length, 1);
  const resumed = await f.transport.resumeVoucherPreparation(saved);
  assert.deepEqual(f.state(), checkpoint); assert.deepEqual(resumed.prepared.intent, f.intent);
  assert.equal(resumed.reservation.amountBaseUnits, '3000'); assert.equal(resumed.reservation.nativeDirective.sequence, 1);
  assert.deepEqual(await f.transport.resumeVoucherPreparation(saved), resumed);
  assert.deepEqual(f.calls, ['reserveDelivery']);
});

test('unsigned preparation and saved signed recovery share one channel queue and never duplicate the reservation', async () => {
  const f = await recoveryFixture(), signedInput = await f.signedInput();
  const [unsigned, authorized] = await Promise.all([
    f.transport.resumeVoucherPreparation({channel: f.channel, intent: f.intent}), f.transport.recoverVoucher(signedInput),
  ]);
  assert.equal(unsigned.reservation.deliveryId, signedInput.intent.charge.id); assert.equal(authorized.status, 'authorized');
  assert.equal(f.state().nextDeliverySequence, 1n); assert.equal(f.state().committedDeliveries.length, 1);
  assert.deepEqual(f.calls, ['reserveDelivery', 'lookupCommit', 'commitVoucher']);
});

test('unsigned preparation resume rejects expired, missing, wrong-predecessor and conflicting native state without mutation', async () => {
  const missing = await recoveryFixture(); missing.discardSQLite();
  await assert.rejects(missing.transport.resumeVoucherPreparation({channel: missing.channel, intent: missing.intent}), /native_recovery_session_missing/);
  const expired = await recoveryFixture(); expired.expireVoucher();
  await assert.rejects(expired.transport.resumeVoucherPreparation({channel: expired.channel, intent: expired.intent}), /voucher_expired/);
  assert.equal(expired.state().pendingDeliveries.length, 0);
  const predecessor = await recoveryFixture();
  await assert.rejects(predecessor.transport.resumeVoucherPreparation({channel: predecessor.channel,
    intent: {...predecessor.intent, previousAmountBaseUnits: '3000', cumulativeAmountBaseUnits: '6000'}}), /native_recovery_predecessor_mismatch/);
  assert.equal(predecessor.state().pendingDeliveries.length, 0);
  const conflict = await recoveryFixture();
  await conflict.transport.reserveDelivery({channel: conflict.channel, charge: conflict.intent.charge});
  conflict.changeState(state => {state.pendingDeliveries[0].amount = 2999n;}); conflict.calls.length = 0;
  const before = conflict.state();
  await assert.rejects(conflict.transport.resumeVoucherPreparation({channel: conflict.channel, intent: conflict.intent}), /native_recovery_reservation_mismatch/);
  assert.deepEqual(conflict.state(), before); assert.equal(conflict.calls.length, 0);
});

test('voucher recovery looks up first, reconstructs exact reservation and commits only the saved signature/total', async () => {
  const f = await recoveryFixture(), input = await f.signedInput(), original = structuredClone(input);
  const result = await f.transport.recoverVoucher(input);
  assert.equal(result.status, 'authorized'); assert.equal(result.payloadHash, input.voucher.payloadHash);
  assert.deepEqual(input, original);
  assert.deepEqual(f.calls, ['lookupCommit', 'reserveDelivery', 'commitVoucher']);
  assert.equal(f.state().cumulative, 3000n); assert.equal(f.state().committedDeliveries[0].voucherSignature, original.voucher.signature);
  f.expireVoucher(); f.changeState(state => {state.sealed = true;});
  assert.deepEqual(await f.transport.recoverVoucher(input), result);
  assert.deepEqual(f.calls, ['lookupCommit', 'reserveDelivery', 'commitVoucher', 'lookupCommit']);
});

test('voucher recovery reuses an exact pending reservation and serializes concurrent identical recovery', async () => {
  const f = await recoveryFixture(), input = await f.signedInput();
  await f.transport.reserveDelivery({channel: f.channel, charge: input.intent.charge}); f.calls.length = 0;
  const [a, b] = await Promise.all([f.transport.recoverVoucher(input), f.transport.recoverVoucher(input)]);
  assert.deepEqual(a, b); assert.deepEqual(f.calls, ['lookupCommit', 'commitVoucher', 'lookupCommit']);
  assert.equal(f.state().committedDeliveries.length, 1); assert.equal(f.state().nextDeliverySequence, 1n);
});

test('discarded native SQLite requires finalized-open restoration and ordered replay of exact durable predecessors', async () => {
  const f = await recoveryFixture(), first = await f.signedInput();
  await f.transport.recoverVoucher(first);
  const secondIntent = {...f.intent, previousAmountBaseUnits: '3000', cumulativeAmountBaseUnits: '6000',
    charge: {...f.intent.charge, id: 'charge-2', acceptedReceiptHash: 'offline-second-receipt'}};
  const second = await f.signedInput(secondIntent); await f.transport.recoverVoucher(second);
  f.discardSQLite(); f.calls.length = 0;
  await assert.rejects(f.transport.recoverVoucher(first), /native_recovery_session_missing/);
  const plan = await f.transport.prepareOpen();
  const signed = await f.transport.acceptSignedOpen({plan, wireBase64: signedWire(plan.unsignedWireBase64, f.payer)});
  await f.transport.lookupOpen({plan, signed}); f.calls.length = 0;
  await assert.rejects(f.transport.recoverVoucher(second), /native_recovery_predecessor_mismatch/);
  assert.deepEqual(f.calls, ['lookupCommit']);
  await f.transport.recoverVoucher(first); await f.transport.recoverVoucher(second);
  assert.equal(f.state().cumulative, 6000n); assert.equal(f.state().spentAmount, 6000n);
  assert.deepEqual(f.state().committedDeliveries.map(row => row.voucherSignature), [first.voucher.signature, second.voucher.signature]);
  assert.equal(f.calls.filter(call => call === 'reserveDelivery').length, 2);
  assert.equal(f.calls.filter(call => call === 'commitVoucher').length, 2);
  assert.equal(f.calls.includes('freshness'), false);
});

test('voucher recovery rejects foreign/corrupt state, wrong predecessor and conflicting reservations without rollback', async () => {
  for (const mutate of [state => {state.payer = identity().address;}, state => {state.authorizedSigner = identity().address;},
    state => {state.deposit = 19999n;}, state => {state.sealed = true;}, state => {state.closeRequestedAt = 1n;},
    state => {state.settledOnChain = 1n;}, state => {state.cumulative = 1n;}, state => {state.spentAmount = 1n;},
    state => {state.highestVoucherSignature = 'forged';}, state => {state.nextDeliverySequence = 1n;}]) {
    const f = await recoveryFixture(), input = await f.signedInput(); f.changeState(mutate); const snapshot = f.state();
    await assert.rejects(f.transport.recoverVoucher(input)); assert.deepEqual(f.state(), snapshot);
    assert.deepEqual(f.calls, ['lookupCommit']);
  }
  for (const mutate of [pending => {pending.deliveryId = 'foreign';}, pending => {pending.amount = 2999n;},
    pending => {pending.expiresAt++;}, pending => {pending.sequence++;}]) {
    const f = await recoveryFixture(), input = await f.signedInput();
    await f.transport.reserveDelivery({channel: f.channel, charge: input.intent.charge});
    f.changeState(state => {mutate(state.pendingDeliveries[0]);}); f.calls.length = 0; const snapshot = f.state();
    await assert.rejects(f.transport.recoverVoucher(input), /native_recovery_reservation_mismatch/);
    assert.deepEqual(f.calls, ['lookupCommit']); assert.deepEqual(f.state(), snapshot);
  }
});

test('voucher recovery validates saved signature/caps/proof and never recreates an expired absent obligation', async () => {
  const f = await recoveryFixture(), input = await f.signedInput();
  for (const mutate of [v => {v.voucher.signer = f.payee.address;}, v => {v.voucher.signature = b58encode(Buffer.alloc(64, 1));},
    v => {v.voucher.voucher.cumulativeAmount = '9000';}, v => {v.intent.previousAmountBaseUnits = '1';},
    v => {v.intent.charge.acceptedReceiptHash = '';}, v => {v.voucher.voucher.channelId = f.foreign.address;}]) {
    const invalid = structuredClone(input); mutate(invalid); await assert.rejects(f.transport.recoverVoucher(invalid));
  }
  assert.equal(f.calls.length, 0);
  f.expireVoucher(); await assert.rejects(f.transport.recoverVoucher(input), /voucher_expired/);
  assert.deepEqual(f.calls, ['lookupCommit']); assert.equal(f.state().pendingDeliveries.length, 0);
  f.base.lookupCommit = async () => ({status: 'authorized', deliveryId: 'foreign'});
  await assert.rejects(f.transport.recoverVoucher(input), /native_recovery_receipt_mismatch/);
});

test('external open accepts real Ed25519, derives fee-payer identity, and exposes only a sanitized signing payload', async () => {
  const f = await fixture(), plan = await f.transport.prepareOpen();
  assert.deepEqual(plan.requiredSigners, [f.payer.address]);
  assert.equal(plan.signingPayload.wireBase64, plan.unsignedWireBase64);
  assert.equal(Object.hasOwn(plan.signingPayload, 'before'), false);
  assert.equal(Object.hasOwn(f.transport, 'signOpen'), false); assert.equal(Object.hasOwn(f.transport, 'signClose'), false);
  const wireBase64 = signedWire(plan.unsignedWireBase64, f.payer);
  const signed = await f.transport.acceptSignedOpen({plan, wireBase64});
  assert.equal(signed.txSignature, fixtureSDK.onChain.transactionSignatureFromWire(wireBase64));
  assert.equal(signed.estimatedFeeAndRentLamports, '15000'); assert.deepEqual(f.calls, ['prepareOpen']);
  // Durable ownership and authorization belong to Main; no send on acceptance.
  await f.transport.submitOpen({plan, signed});
  assert.deepEqual(f.calls, ['prepareOpen', 'freshness', 'submitOpen']);
  f.transport.close(); assert.equal(f.calls.at(-1), 'close');
});

test('open rejects unsigned, garbage signatures, other-wallet signatures and message tampering', async () => {
  const f = await fixture(), plan = await f.transport.prepareOpen();
  await assert.rejects(f.transport.acceptSignedOpen({plan, wireBase64: plan.unsignedWireBase64}), /transaction_signature_missing/);
  const bad = alterSignature(plan.unsignedWireBase64, f.payer.address, Buffer.alloc(64, 7));
  await assert.rejects(f.transport.acceptSignedOpen({plan, wireBase64: bad}), /transaction_signature_invalid/);
  const wrong = alterSignature(plan.unsignedWireBase64, f.payer.address,
    sign(null, transactionDecode(Buffer.from(plan.unsignedWireBase64, 'base64')).messageBytes, f.foreign.privateKey));
  await assert.rejects(f.transport.acceptSignedOpen({plan, wireBase64: wrong}), /transaction_signature_invalid/);
  const tampered = unsignedWire([f.payer.address], [f.payee.address, f.terms.mint, program], Buffer.from([1, 0]));
  await assert.rejects(f.transport.acceptSignedOpen({plan, wireBase64: signedWire(tampered, f.payer)}), /transaction_message_mismatch/);
  for (const wireBase64 of ['a', '!!!!', `${plan.unsignedWireBase64}\n`, 'AAAA'.repeat(500)])
    await assert.rejects(f.transport.acceptSignedOpen({plan, wireBase64}), /wire_invalid/);
  assert.equal(f.calls.includes('submitOpen'), false);
});

test('saved plans bind frozen terms, signer set, preflight fee and exact opening deposit/salt', async () => {
  const f = await fixture(), plan = await f.transport.prepareOpen();
  for (const mutate of [p => {delete p.external;}, p => {p.external.termsHash = '0'.repeat(64);},
    p => {p.requiredSigners = [f.foreign.address];}, p => {p.simulation.cost = '1';},
    p => {p.estimatedFeeAndRentLamports = p.simulation.cost = '20000001';},
    p => {p.open.deposit = '20001';}, p => {p.open.payee = f.foreign.address;}, p => {p.open.salt = '43';},
    p => {p.latest.value.blockhash = f.foreign.address;}, p => {p.latest.value.lastValidBlockHeight = Number.MAX_SAFE_INTEGER + 1;}]) {
    const changed = structuredClone(plan); mutate(changed);
    await assert.rejects(f.transport.acceptSignedOpen({plan: changed, wireBase64: signedWire(plan.unsignedWireBase64, f.payer)}));
  }
  for (const required of [[f.foreign.address], [f.payer.address, f.foreign.address], [f.payee.address, f.payer.address]]) {
    const changed = structuredClone(plan); changed.unsignedWireBase64 = unsignedWire(required); changed.requiredSigners = required;
    await assert.rejects(f.transport.acceptSignedOpen({plan: changed, wireBase64: changed.unsignedWireBase64}), /required_signers_mismatch/);
  }
});

test('freshness fences broadcasts only; expired signed openings survive transport restart and reconciliation', async () => {
  const f = await fixture(), plan = await f.transport.prepareOpen();
  const signed = await f.transport.acceptSignedOpen({plan, wireBase64: signedWire(plan.unsignedWireBase64, f.payer)});
  f.expireBlockhash(); const restarted = await f.construct();
  assert.deepEqual(await restarted.acceptSignedOpen({plan, wireBase64: signed.wireBase64}), signed);
  assert.equal((await restarted.lookupOpen({plan, signed})).status, 'finalized');
  assert.deepEqual(f.calls, ['prepareOpen', 'lookupOpen']);
  await assert.rejects(restarted.submitOpen({plan, signed}), /unsigned_plan_expired/);
  assert.equal(f.calls.includes('submitOpen'), false);
  for (const [field, value] of [['txSignature', 'forged'], ['blockhash', 'forged'], ['lastValidBlockHeight', '1'], ['estimatedFeeAndRentLamports', '0']]) {
    await assert.rejects(restarted.lookupOpen({plan, signed: {...signed, [field]: value}}), /signed_transaction_metadata_mismatch/);
  }
});

test('strict Devnet, own-wallet configuration and canonical money checks precede base creation', async () => {
  const f = await fixture(); let created = 0;
  for (const override of [{mode: 'sandbox'}, {network: 'mainnet'}, {settlementNetwork: 'tempo-testnet'},
    {rpc: 'https://api.mainnet-beta.solana.com'}, {genesisHash: 'wrong'}, {mint: f.foreign.address}, {program: f.foreign.address},
    {tokenProgram: f.foreign.address}, {decimals: 9}, {payer: f.payee.address}, {authorizedSigner: f.foreign.address},
    {depositBaseUnits: '01'}, {depositBaseUnits: 20000}, {depositBaseUnits: '0'}, {depositBaseUnits: '18446744073709551616'},
    {chargeCapBaseUnits: '20001'}, {openSalt: '0'}, {openSalt: '-1'}, {maxFeeAndRentLamports: '20000001'},
    {voucherExpiresAt: Number.MAX_SAFE_INTEGER + 1}, {voucherExpiresAt: 1.5}, {applicationDeadlineAt: -1},
    {maxBidBaseUnits: '9000'}, {settlementMarginSeconds: -1}]) {
    await assert.rejects(f.construct({terms: {...f.terms, ...override}, baseTransportFactory: async () => {created++; return f.base;}}));
  }
  await assert.rejects(f.construct({walletPath: '/must-never-read'}), /external_wallet_path_forbidden/);
  assert.equal(created, 0);
  // Freeze a defensive copy: caller mutation cannot redirect this transport.
  const plan = await f.transport.prepareOpen(); f.terms.payee = f.foreign.address;
  assert.ok(await f.transport.acceptSignedOpen({plan, wireBase64: signedWire(plan.unsignedWireBase64, f.payer)}));
});

test('voucher uses exact native 50-byte message; real signatures commit and lookup without the legacy signer', async () => {
  const f = await fixture(); await f.transport.reserveDelivery({channel: f.channel, charge: f.intent.charge});
  const {prepared, signed} = await voucher(f), bytes = Buffer.from(prepared.signingPayload.messageBase64, 'base64');
  assert.equal(bytes.length, 50); assert.deepEqual(bytes.subarray(0, 2), Buffer.from([0x56, 1]));
  assert.deepEqual(bytes.subarray(2, 34), b58decode(f.channel.protocolChannelId));
  assert.equal(bytes.readBigUInt64LE(34), 3000n); assert.equal(bytes.readBigInt64LE(42), BigInt(f.terms.voucherExpiresAt));
  assert.equal(signed.signer, f.payer.address); assert.equal(Object.hasOwn(prepared.signingPayload, 'intent'), false);
  const input = {channel: f.channel, intent: f.intent, voucher: signed};
  assert.equal((await f.transport.commitVoucher(input)).status, 'authorized');
  f.expireVoucher(); const restarted = await f.construct();
  assert.equal((await restarted.lookupCommit(input)).status, 'authorized');
  await assert.rejects(restarted.commitVoucher(input), /voucher_expired/);
  assert.deepEqual(f.calls, ['reserveDelivery', 'commitVoucher', 'lookupCommit']);
});

test('voucher acceptance rejects wrong key, altered signed bytes, signer, channel, cumulative and expiry', async () => {
  const f = await fixture(), {prepared, signed, signature} = await voucher(f);
  const wrongSignature = b58encode(sign(null, Buffer.from(prepared.messageBase64, 'base64'), f.foreign.privateKey));
  await assert.rejects(f.transport.acceptSignedVoucher({prepared, signature: wrongSignature}), /native_voucher_signature_invalid/);
  for (const mutate of [p => {p.voucher.channelId = f.foreign.address;}, p => {p.voucher.cumulativeAmount = '3001';},
    p => {p.voucher.expiresAt++;}, p => {p.signer = f.payee.address;}, p => {p.messageBase64 = Buffer.alloc(50).toString('base64');},
    p => {p.payloadHash = 'wrong';}, p => {p.termsHash = 'wrong';}, p => {p.signatureType = 'fake';}]) {
    const changed = structuredClone(prepared); mutate(changed);
    await assert.rejects(f.transport.acceptSignedVoucher({prepared: changed, signature}), /voucher_payload_mismatch/);
  }
  for (const mutate of [v => {v.signer = f.payee.address;}, v => {v.voucher.channelId = f.foreign.address;},
    v => {v.voucher.cumulativeAmount = '3001';}, v => {v.voucher.expiresAt++;}, v => {v.payloadHash = 'wrong';}]) {
    const changed = structuredClone(signed); mutate(changed);
    await assert.rejects(f.transport.lookupCommit({channel: f.channel, intent: f.intent, voucher: changed}));
  }
  f.expireVoucher(); await assert.rejects(f.transport.acceptSignedVoucher({prepared, signature}), /voucher_expired/);
  assert.equal(f.calls.length, 0);
});

test('voucher rejects malformed, negative, noncanonical, overspend and inconsistent ledger inputs', async () => {
  const f = await fixture();
  for (const intent of [
    {...f.intent, previousAmountBaseUnits: '-1'}, {...f.intent, cumulativeAmountBaseUnits: '03000'},
    {...f.intent, cumulativeAmountBaseUnits: 3000}, {...f.intent, cumulativeAmountBaseUnits: '18446744073709551616'},
    {...f.intent, previousAmountBaseUnits: '1'}, {...f.intent, cumulativeAmountBaseUnits: '20001'},
    {...f.intent, previousAmountBaseUnits: '6000', cumulativeAmountBaseUnits: '9000'},
    {...f.intent, cumulativeAmountBaseUnits: '0', charge: {...f.intent.charge, amountBaseUnits: '0'}},
    {...f.intent, cumulativeAmountBaseUnits: '5000', charge: {...f.intent.charge, amountBaseUnits: '5000'}},
    {...f.intent, charge: {...f.intent.charge, channelId: 'foreign'}},
  ]) await assert.rejects(f.transport.prepareVoucher({channel: f.channel, intent}));
  await assert.rejects(f.transport.prepareVoucher({channel: {...f.channel, channelId: 'foreign'}, intent: f.intent}), /channel_identity_mismatch/);
  await assert.rejects(f.transport.reserveDelivery({channel: f.channel, charge: {...f.intent.charge, amountBaseUnits: '9000'}}));
  await assert.rejects(f.transport.reserveDelivery({channel: f.channel, charge: {...f.intent.charge, amountBaseUnits: '5000'}}));
  assert.equal(f.calls.length, 0);
});

test('cooperative zero-close requires both real signatures and carries no voucher; sequential owners merge without loss', async () => {
  const f = await fixture(), plan = await f.transport.prepareClose({channel: f.channel, watermark: watermark('0')});
  assert.deepEqual(plan.requiredSigners, [f.payer.address, f.payee.address]);
  assert.deepEqual(plan.signingPayload.requiredSigners, plan.requiredSigners);
  assert.equal(Object.hasOwn(plan, 'finalVoucher'), false); assert.equal(Object.hasOwn(plan.signingPayload, 'finalVoucher'), false);
  const payerWire = signedWire(plan.unsignedWireBase64, f.payer);
  const first = await f.transport.collectCloseSignature({plan, wireBase64: payerWire, signerAddress: f.payer.address});
  assert.equal(first.complete, false);
  await assert.rejects(f.transport.acceptSignedClose({plan, wireBase64: first.wireBase64}), /transaction_signature_missing/);
  const second = await f.transport.collectCloseSignature({plan, wireBase64: signedWire(plan.unsignedWireBase64, f.payee),
    previousWireBase64: first.wireBase64, signerAddress: f.payee.address});
  assert.equal(second.complete, true);
  const merged = transactionDecode(Buffer.from(second.wireBase64, 'base64'));
  assert.deepEqual(merged.signatures[f.payer.address], transactionDecode(Buffer.from(first.wireBase64, 'base64')).signatures[f.payer.address]);
  const signed = await f.transport.acceptSignedClose({plan, wireBase64: second.wireBase64});
  assert.equal(signed.txSignature, b58encode(merged.signatures[f.payer.address]));
  await f.transport.submitClose({plan, signed});
  f.expireBlockhash(); f.expireVoucher();
  assert.equal((await f.transport.lookupClose({plan, signed})).status, 'finalized');
  await assert.rejects(f.transport.submitClose({plan, signed}), /unsigned_plan_expired/);
  assert.equal(f.calls.filter(method => method === 'submitClose').length, 1);
});

test('close collection requires the actor own signature, validates every present/previous signature and rejects foreign parties/messages', async () => {
  const f = await fixture(), plan = await f.transport.prepareClose({channel: f.channel, watermark: watermark('0')});
  const payerWire = signedWire(plan.unsignedWireBase64, f.payer), payeeWire = signedWire(plan.unsignedWireBase64, f.payee);
  await assert.rejects(f.transport.collectCloseSignature({plan, wireBase64: payerWire, signerAddress: f.payee.address}), /transaction_signature_missing/);
  await assert.rejects(f.transport.collectCloseSignature({plan, wireBase64: payerWire, previousWireBase64: payeeWire,
    signerAddress: f.payee.address}), /transaction_signature_missing/);
  await assert.rejects(f.transport.collectCloseSignature({plan, wireBase64: payerWire, signerAddress: f.foreign.address}), /close_actor_mismatch/);
  const forgedOther = alterSignature(payerWire, f.payee.address, Buffer.alloc(64, 9));
  await assert.rejects(f.transport.collectCloseSignature({plan, wireBase64: forgedOther, signerAddress: f.payer.address}), /transaction_signature_invalid/);
  await assert.rejects(f.transport.collectCloseSignature({plan, wireBase64: payeeWire, previousWireBase64: forgedOther,
    signerAddress: f.payee.address}), /transaction_signature_invalid/);
  const wrongMessage = signedWire(unsignedWire([f.payer.address, f.payee.address], [], Buffer.from([1, 0])), f.payee);
  await assert.rejects(f.transport.collectCloseSignature({plan, wireBase64: wrongMessage, signerAddress: f.payee.address}), /transaction_message_mismatch/);
  await assert.rejects(f.transport.collectCloseSignature({plan, wireBase64: payeeWire, previousWireBase64: wrongMessage,
    signerAddress: f.payee.address}), /transaction_message_mismatch/);
  const repeat = await f.transport.collectCloseSignature({plan, wireBase64: payerWire, previousWireBase64: payerWire, signerAddress: f.payer.address});
  assert.equal(repeat.wireBase64, payerWire); assert.equal(repeat.complete, false);
  assert.equal(f.calls.includes('freshness'), false);
});

test('close signatures may arrive payee-first; a fully signed wire and partials survive restart', async () => {
  const f = await fixture(), plan = await f.transport.prepareClose({channel: f.channel, watermark: watermark('0')});
  const first = await f.transport.collectCloseSignature({plan, wireBase64: signedWire(plan.unsignedWireBase64, f.payee), signerAddress: f.payee.address});
  const restarted = await f.construct();
  const second = await restarted.collectCloseSignature({plan, wireBase64: signedWire(plan.unsignedWireBase64, f.payer),
    previousWireBase64: first.wireBase64, signerAddress: f.payer.address});
  assert.equal(second.complete, true);
  const full = await restarted.collectCloseSignature({plan, wireBase64: second.wireBase64,
    previousWireBase64: first.wireBase64, signerAddress: f.payer.address});
  assert.deepEqual(full, second);
  assert.ok(await restarted.acceptSignedClose({plan, wireBase64: full.wireBase64}));
});

test('cooperative close rejects conflicting individually VALID Ed25519 signatures without replacing prior consent', async () => {
  const f = await fixture(), plan = await f.transport.prepareClose({channel: f.channel, watermark: watermark('0')});
  const previousWireBase64 = signedWire(plan.unsignedWireBase64, f.payer);
  const message = transactionDecode(Buffer.from(plan.unsignedWireBase64, 'base64')).messageBytes;
  const alternate = alternativeFixtureSignature(message, f.payer.privateKey);
  assert.equal(verify(null, message, createPublicKey(f.payer.privateKey), alternate), true);
  const alternateWire = alterSignature(plan.unsignedWireBase64, f.payer.address, alternate);
  assert.equal((await f.transport.collectCloseSignature({plan, wireBase64: alternateWire, signerAddress: f.payer.address})).complete, false);
  const wireBase64 = signedWire(alternateWire, f.payee);
  await assert.rejects(f.transport.collectCloseSignature({plan, wireBase64, previousWireBase64,
    signerAddress: f.payee.address}), /close_signature_conflict/);
  assert.equal(f.calls.includes('submitClose'), false);
});

test('nonzero close binds exact final native voucher and ledger watermark; rejects no-voucher overspend/zero-voucher ambiguity', async () => {
  const f = await fixture(), {signed: finalVoucher} = await voucher(f);
  const plan = await f.transport.prepareClose({channel: f.channel, watermark: watermark('3000'), finalVoucher});
  assert.equal(Object.hasOwn(plan.signingPayload, 'finalVoucher'), false);
  const signed = await f.transport.acceptSignedClose({plan, wireBase64: signedWire(plan.unsignedWireBase64, f.payer, f.payee)});
  f.expireVoucher(); f.expireBlockhash();
  assert.equal((await f.transport.lookupClose({plan, signed})).status, 'finalized');
  await assert.rejects(f.transport.submitClose({plan, signed}), /voucher_expired/);
  const other = await fixture(), v = (await voucher(other)).signed;
  for (const input of [
    {channel: other.channel, watermark: watermark('0'), finalVoucher: v},
    {channel: other.channel, watermark: watermark('0'), finalVoucher: null},
    {channel: other.channel, watermark: watermark('3000')},
    {channel: other.channel, watermark: watermark('3001'), finalVoucher: v},
    {channel: other.channel, watermark: watermark('20001'), finalVoucher: v},
    {channel: other.channel, watermark: watermark('3000'), finalVoucher: {...v, signer: other.payee.address}},
  ]) await assert.rejects(other.transport.prepareClose(input));
  assert.equal(other.calls.includes('prepareClose'), false);
});

// Optional installed SDK, explicitly selected by operator; never install/fetch.
const sdkRoot = process.env.AXP_EXTERNAL_SOLANA_SDK_ROOT;
test('pinned SDK routes + SQLite: checkpoint discard, finalized-open restore, exact ordered voucher recovery and no duplicate commits (no RPC)',
  {skip: !sdkRoot || !existsSync(`${sdkRoot}/manifest.json`) ? 'requires explicit installed pinned SDK root; no auto-download' : false}, async t => {
    const native = await loadNativeSDK(sdkRoot), f = await fixture();
    const directory = mkdtempSync(join(tmpdir(), 'axp-external-recovery-')), path = join(directory, 'native.sqlite');
    let store = new NativeSessionStore(path);
    t.after(() => {store.close(); rmSync(directory, {recursive: true, force: true});});
    const {kit} = native, calls = [];
    const request = {amount: '1', currency: f.terms.mint, recipient: f.payee.address,
      methodDetails: {network: 'devnet', channelProgram: program, tokenProgram: token, recentBlockhash: blockhash,
        recentSlot: '10', feePayer: false, gracePeriodSeconds: 900, voucherSigner: 'client', distributionSplits: []}};
    const open = await native.paymentChannels.buildOpenPaymentChannelTransaction({request, payer: f.payer.address,
      signer: kit.createNoopSigner(kit.address(f.payer.address)), authorizedSigner: f.payer.address,
      deposit: '20000', salt: '42', programAddress: kit.address(program), tokenProgram: token});
    f.channel.protocolChannelId = open.channelId;
    const routes = () => native.sessionServer.session.routes({store, currency: f.terms.mint, network: 'devnet', settlementWindowSeconds: 60n});
    async function lookup(input) {
      calls.push('lookupCommit'); const state = await store.getChannel(open.channelId);
      const record = state?.committedDeliveries.find(row => row.deliveryId === input.intent.charge.id);
      if (!record || record.voucherSignature !== input.voucher.signature
        || record.amount.toString() !== input.intent.charge.amountBaseUnits
        || record.cumulative.toString() !== input.intent.cumulativeAmountBaseUnits) return {status: 'unknown'};
      return {status: 'authorized', deliveryId: record.deliveryId, incrementBaseUnits: record.amount.toString(),
        cumulativeAmountBaseUnits: record.cumulative.toString(), payloadHash: input.voucher.payloadHash};
    }
    const nativeBase = {
      async prepareOpen() {return {...f.plan('open'), protocolChannelId: open.channelId, open, unsignedWireBase64: open.transaction};},
      async lookupOpen(input) {
        calls.push('lookupOpen'); await store.updateChannel(open.channelId, current => current ?? emptyNativeState(f));
        return {status: 'finalized', finality: 'finalized', txSignature: input.signed.txSignature,
          protocolChannelId: open.channelId, depositBaseUnits: f.terms.depositBaseUnits};
      },
      async reserveDelivery(input) {
        calls.push('reserveDelivery');
        const response = await routes().deliveries(new Request('http://localhost/__402/session/deliveries', {method: 'POST',
          body: JSON.stringify({sessionId: open.channelId, deliveryId: input.charge.id, amount: input.charge.amountBaseUnits,
            expiresAt: f.terms.voucherExpiresAt, proof: {acceptedReceiptHash: input.charge.acceptedReceiptHash}})}));
        const directive = await response.json(); assert.equal(response.status, 200, JSON.stringify(directive));
        return {deliveryId: input.charge.id, amountBaseUnits: input.charge.amountBaseUnits, nativeDirective: directive};
      },
      async commitVoucher(input) {
        calls.push('commitVoucher');
        const response = await routes().commit(new Request('http://localhost/__402/session/commit', {method: 'POST',
          body: JSON.stringify({deliveryId: input.intent.charge.id, voucher: input.voucher})}));
        const receipt = await response.json(); assert.equal(response.status, 200, JSON.stringify(receipt));
        assert.equal(receipt.amount, input.intent.charge.amountBaseUnits); assert.equal(receipt.cumulative, input.intent.cumulativeAmountBaseUnits);
        return lookup(input);
      },
      lookupCommit: lookup, close() {},
      assertPlanFresh() {throw Error('recovery_must_not_call_rpc_freshness');},
    };
    for (const method of ['signOpen', 'signClose', 'prepareVoucher', 'submitOpen', 'submitClose'])
      Object.defineProperty(nativeBase, method, {get() {throw Error(`forbidden_${method}`);}});
    const construct = overrides => f.construct({statePath: path, sdkProvider: async () => native,
      baseTransportFactory: async options => {assert.equal(options.walletPath, null); return nativeBase;}, ...overrides});
    let transport = await construct(), plan = await transport.prepareOpen();
    const tx = kit.getTransactionDecoder().decode(Buffer.from(plan.unsignedWireBase64, 'base64'));
    const wireBase64 = kit.getBase64EncodedWireTransaction({...tx,
      signatures: {...tx.signatures, [f.payer.address]: sign(null, tx.messageBytes, f.payer.privateKey)}});
    const signedOpen = await transport.acceptSignedOpen({plan, wireBase64});
    await transport.lookupOpen({plan, signed: signedOpen});
    async function input(intent) {
      const prepared = await transport.prepareVoucher({channel: f.channel, intent});
      const signature = b58encode(sign(null, Buffer.from(prepared.messageBase64, 'base64'), f.payer.privateKey));
      return {channel: f.channel, intent, voucher: await transport.acceptSignedVoucher({prepared, signature})};
    }
    const first = await input(f.intent), second = await input({...f.intent, previousAmountBaseUnits: '3000', cumulativeAmountBaseUnits: '6000',
      charge: {...f.intent.charge, id: 'charge-2', acceptedReceiptHash: 'offline-native-second-proof'}});
    // Unsigned preparation can fail on either side of reservation. Resume the
    // SAME durable intent, with the actual pinned reservation/SQLite contracts.
    const reserveNative = nativeBase.reserveDelivery; let actualReservation;
    nativeBase.reserveDelivery = async () => {throw Error('native_interrupted_before_reservation');};
    await assert.rejects(transport.resumeVoucherPreparation({channel: f.channel, intent: first.intent}), /native_interrupted_before_reservation/);
    assert.equal((await store.getChannel(open.channelId)).pendingDeliveries.length, 0);
    nativeBase.reserveDelivery = async input => {
      actualReservation = await reserveNative(input); throw Error('native_interrupted_after_reservation');
    };
    await assert.rejects(transport.resumeVoucherPreparation({channel: f.channel, intent: first.intent}), /native_interrupted_after_reservation/);
    const nativePending = await store.getChannel(open.channelId);
    assert.equal(nativePending.pendingDeliveries.length, 1); assert.equal(nativePending.nextDeliverySequence, 1n);
    const resumed = await transport.resumeVoucherPreparation({channel: f.channel, intent: first.intent});
    assert.deepEqual(resumed.reservation, actualReservation);
    assert.deepEqual(await store.getChannel(open.channelId), nativePending);
    assert.deepEqual(resumed.prepared.voucher, first.voucher.voucher); assert.equal(Object.hasOwn(resumed.prepared, 'signature'), false);
    assert.deepEqual(await transport.resumeVoucherPreparation({channel: f.channel, intent: first.intent}), resumed);
    assert.equal(calls.filter(call => call === 'reserveDelivery').length, 1);
    nativeBase.reserveDelivery = reserveNative;
    // First authorization is in SQLite, but assume its hosted checkpoint failed.
    await transport.commitVoucher(first);
    store.close(); rmSync(path); store = new NativeSessionStore(path); transport = await construct(); calls.length = 0;
    await assert.rejects(transport.recoverVoucher(first), /native_recovery_session_missing/);
    await transport.lookupOpen({plan, signed: signedOpen});
    const receipt = await transport.recoverVoucher(first);
    assert.equal(receipt.status, 'authorized'); assert.equal((await store.getChannel(open.channelId)).highestVoucherSignature, first.voucher.signature);
    const commits = calls.filter(call => call === 'commitVoucher').length, reservations = calls.filter(call => call === 'reserveDelivery').length;
    assert.deepEqual(await transport.recoverVoucher(first), receipt);
    assert.equal(calls.filter(call => call === 'commitVoucher').length, commits);
    assert.equal(calls.filter(call => call === 'reserveDelivery').length, reservations);
    // An exact pending reservation must be reused; the SDK rejects duplicates.
    await transport.reserveDelivery({channel: f.channel, charge: second.intent.charge}); calls.length = 0;
    assert.equal((await transport.recoverVoucher(second)).status, 'authorized');
    assert.equal(calls.includes('reserveDelivery'), false);
    assert.equal((await store.getChannel(open.channelId)).cumulative, 6000n);
    // Lose the whole native snapshot again. Durable historical vouchers (without
    // reservations) rebuild it in order, even after the signing deadline.
    store.close(); rmSync(path); store = new NativeSessionStore(path);
    transport = await construct({now: () => f.terms.applicationDeadlineAt + 1});
    await transport.lookupOpen({plan, signed: signedOpen}); calls.length = 0;
    await assert.rejects(transport.recoverVoucher(second), /native_recovery_predecessor_mismatch/);
    assert.equal(calls.includes('commitVoucher'), false); assert.equal(calls.includes('reserveDelivery'), false);
    await transport.recoverVoucher(first); await transport.recoverVoucher(second);
    const restored = await store.getChannel(open.channelId);
    assert.equal(restored.cumulative, 6000n); assert.equal(restored.spentAmount, 6000n); assert.equal(restored.pendingDeliveries.length, 0);
    assert.deepEqual(restored.committedDeliveries.map(row => row.voucherSignature), [first.voucher.signature, second.voucher.signature]);
    assert.equal(calls.filter(call => call === 'commitVoucher').length, 2);
    // Native commit itself is exact-replay-idempotent, but recovery does not
    // invoke it again once its read-only receipt is already available.
    assert.equal((await nativeBase.commitVoucher(second)).status, 'authorized');
    const checkpoint = await store.getChannel(open.channelId);
    await transport.recoverVoucher(second); assert.deepEqual(await store.getChannel(open.channelId), checkpoint);
  });
test('pinned SDK: real unsigned open verification, voucher encoding/signature and native zero/positive close wires (no RPC)',
  {skip: !sdkRoot || !existsSync(`${sdkRoot}/manifest.json`) ? 'requires explicit installed pinned SDK root; no auto-download' : false}, async () => {
    const native = await loadNativeSDK(sdkRoot), f = await fixture();
    const {kit, paymentChannels, voucher: nativeVoucher, onChain} = native;
    const request = {amount: '1', currency: f.terms.mint, recipient: f.payee.address,
      methodDetails: {network: 'devnet', channelProgram: program, tokenProgram: token, recentBlockhash: blockhash,
        recentSlot: '10', feePayer: false, gracePeriodSeconds: 900, voucherSigner: 'client', distributionSplits: []}};
    const open = await paymentChannels.buildOpenPaymentChannelTransaction({request, payer: f.payer.address,
      signer: kit.createNoopSigner(kit.address(f.payer.address)), authorizedSigner: f.payer.address,
      deposit: '20000', salt: '42', programAddress: kit.address(program), tokenProgram: token});
    const nativeChannel = {channelId: f.terms.channelId, protocolChannelId: open.channelId};
    const nativePlan = {...f.plan('open'), open, protocolChannelId: open.channelId, unsignedWireBase64: open.transaction};
    const nativeBase = {...f.base, prepareOpen: async () => nativePlan,
      async prepareClose(input) {
        const seal = onChain.buildSettleAndSealInstructions({channelId: open.channelId,
          merchantSigner: kit.createNoopSigner(kit.address(f.payee.address)), programId: kit.address(program),
          ...(input.finalVoucher ? {voucher: {authorizedSigner: f.payer.address, signed: input.finalVoucher}} : {})});
        const distribute = await onChain.buildDistributeInstruction({channelState: {channelId: open.channelId,
          payer: f.payer.address, payee: f.payee.address}, mint: f.terms.mint, rentPayer: f.payer.address,
          tokenProgram: token, splits: [], programId: kit.address(program)});
        const message = kit.pipe(kit.createTransactionMessage({version: 0}), m => kit.setTransactionMessageFeePayer(f.payer.address, m),
          m => kit.setTransactionMessageLifetimeUsingBlockhash({blockhash, lastValidBlockHeight: 1000n}, m),
          m => kit.appendTransactionMessageInstructions([...seal.instructions, distribute], m));
        return {...f.plan('close'), ...input, protocolChannelId: open.channelId,
          unsignedWireBase64: kit.getBase64EncodedWireTransaction(kit.compileTransaction(message))};
      }};
    const transport = await f.construct({sdkProvider: async () => native, baseTransportFactory: async () => nativeBase});
    const nativeSign = (wire, ...signers) => {
      const transaction = kit.getTransactionDecoder().decode(Buffer.from(wire, 'base64')), signatures = {...transaction.signatures};
      for (const signer of signers) signatures[signer.address] = sign(null, transaction.messageBytes, signer.privateKey);
      return kit.getBase64EncodedWireTransaction({...transaction, signatures});
    };
    const plan = await transport.prepareOpen();
    const signed = await transport.acceptSignedOpen({plan, wireBase64: nativeSign(plan.unsignedWireBase64, f.payer)});
    assert.equal(signed.txSignature, onChain.transactionSignatureFromWire(signed.wireBase64));
    await assert.rejects(transport.acceptSignedOpen({plan, wireBase64: plan.unsignedWireBase64}), /transaction_signature_missing/);
    const prepared = await transport.prepareVoucher({channel: nativeChannel, intent: f.intent});
    assert.deepEqual(Buffer.from(prepared.messageBase64, 'base64'), Buffer.from(nativeVoucher.encodeVoucherMessageLoose(prepared.voucher)));
    const signature = b58encode(sign(null, Buffer.from(prepared.messageBase64, 'base64'), f.payer.privateKey));
    const finalVoucher = await transport.acceptSignedVoucher({prepared, signature});
    assert.equal(finalVoucher.signer, f.payer.address);
    const closePlan = await transport.prepareClose({channel: nativeChannel, watermark: watermark('0')});
    const first = await transport.collectCloseSignature({plan: closePlan, wireBase64: nativeSign(closePlan.unsignedWireBase64, f.payer), signerAddress: f.payer.address});
    await assert.rejects(transport.acceptSignedClose({plan: closePlan, wireBase64: first.wireBase64}), /transaction_signature_missing/);
    const second = await transport.collectCloseSignature({plan: closePlan, wireBase64: nativeSign(closePlan.unsignedWireBase64, f.payee),
      previousWireBase64: first.wireBase64, signerAddress: f.payee.address});
    assert.equal(second.complete, true); assert.ok(await transport.acceptSignedClose({plan: closePlan, wireBase64: second.wireBase64}));
    const tampered = kit.getTransactionDecoder().decode(Buffer.from(second.wireBase64, 'base64'));
    tampered.signatures[f.payee.address][0] ^= 1;
    await assert.rejects(transport.acceptSignedClose({plan: closePlan,
      wireBase64: kit.getBase64EncodedWireTransaction(tampered)}), /transaction_signature_invalid/);
    const positivePlan = await transport.prepareClose({channel: nativeChannel, watermark: watermark('3000'), finalVoucher});
    assert.equal((await transport.acceptSignedClose({plan: positivePlan,
      wireBase64: nativeSign(positivePlan.unsignedWireBase64, f.payer, f.payee)})).estimatedFeeAndRentLamports, '15000');
  });
