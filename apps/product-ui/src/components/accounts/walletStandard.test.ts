import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEVNET_CHAIN, base58, bytesFromBase64, bytesToBase64, connectWallet, discoverWallets,
  signWalletMessage, signWalletTransaction, type StandardAccount, type StandardWallet,
} from './walletStandard.ts';

function fixture() {
  const publicKey = new Uint8Array(32).fill(7);
  const account: StandardAccount = { address: base58(publicKey), publicKey, chains: [DEVNET_CHAIN], features: ['solana:signMessage', 'solana:signTransaction'] };
  const calls: { kind: string; value?: unknown }[] = [];
  const wallet: StandardWallet = { name: 'Fixture wallet', chains: [DEVNET_CHAIN], accounts: [account], features: {
    'standard:connect': { async connect() { calls.push({ kind: 'connect' }); return { accounts: wallet.accounts }; } },
    'solana:signMessage': { async signMessage(input) { calls.push({ kind: 'message', value: input }); return [{ signedMessage: input.message, signature: new Uint8Array(64).fill(3), signatureType: 'ed25519' }]; } },
    'solana:signTransaction': { async signTransaction(input) { calls.push({ kind: 'transaction', value: input }); const wire = input.transaction.slice(); wire.fill(3, 1, 65); return [{ signedTransaction: wire }]; } },
  } };
  return { wallet, account, calls };
}
function wire(accounts: StandardAccount[], signatures?: Uint8Array[]) {
  const message = new Uint8Array(4 + accounts.length * 32 + 33);
  message.set([accounts.length, 0, 0, accounts.length]);
  accounts.forEach((account, i) => message.set(account.publicKey, 4 + i * 32));
  const result = new Uint8Array(1 + accounts.length * 64 + message.length);
  result[0] = accounts.length;
  signatures?.forEach((sig, i) => result.set(sig, 1 + i * 64));
  result.set(message, 1 + accounts.length * 64);
  return bytesToBase64(result);
}
test('standard discovery catches app-ready and late registration without wallet calls, then disposes', () => {
  const { wallet, calls } = fixture(), target = new EventTarget();
  let api: { register: (...wallets: StandardWallet[]) => () => void };
  target.addEventListener('wallet-standard:app-ready', event => { api = (event as CustomEvent).detail; api.register(wallet); });
  let discovered: readonly StandardWallet[] = [];
  const dispose = discoverWallets(target, wallets => { discovered = wallets; });
  assert.deepEqual(discovered, [wallet]); assert.equal(calls.length, 0);
  const other = { ...wallet, name: 'Second wallet' };
  const event = new Event('wallet-standard:register-wallet');
  Object.defineProperty(event, 'detail', { value: (ready: typeof api) => ready.register(other) });
  target.dispatchEvent(event); assert.deepEqual(discovered, [wallet, other]);
  dispose(); api!.register({ ...wallet, name: 'Ignored' }); target.dispatchEvent(event);
  assert.deepEqual(discovered, [wallet, other]); assert.equal(calls.length, 0);
});
test('connect requires exact expected returned address, Devnet and matching public key', async () => {
  const { wallet, account, calls } = fixture();
  assert.equal((await connectWallet(wallet, account.address)).address, account.address);
  assert.deepEqual(calls.map(c => c.kind), ['connect']);
  await assert.rejects(connectWallet(wallet, base58(new Uint8Array(32).fill(8))), /expected account/);
  await assert.rejects(connectWallet({ ...wallet, chains: ['solana:mainnet'] }, account.address), /Devnet wallet/);
  const wrong = { ...account, publicKey: new Uint8Array(32).fill(8) };
  await assert.rejects(connectWallet({ ...wallet, accounts: [wrong], features: { ...wallet.features, 'standard:connect': { connect: async () => ({ accounts: [wrong] }) } } }, account.address), /expected address/);
});
test('signMessage uses raw exact bytes and base58; prefixed messages are rejected', async () => {
  const { wallet, account } = fixture(), message = new TextEncoder().encode('one-use fixture challenge');
  assert.equal(await signWalletMessage(wallet, account, account.address, message), base58(new Uint8Array(64).fill(3)));
  const changed = { ...wallet, features: { ...wallet.features, 'solana:signMessage': { signMessage: async () => [{ signedMessage: new Uint8Array([1]), signature: new Uint8Array(64) }] } } };
  await assert.rejects(signWalletMessage(changed, account, account.address, message), /different message/);
});
test('account changes while a wallet prompt is pending fail before submission', async () => {
  const { wallet, account } = fixture();
  const switched: StandardWallet = { ...wallet, features: { ...wallet.features, 'solana:signMessage': { async signMessage(input) {
    Object.defineProperty(switched, 'accounts', { value: [] });
    return [{ signedMessage: input.message, signature: new Uint8Array(64).fill(2) }];
  } } } };
  await assert.rejects(signWalletMessage(switched, account, account.address, new Uint8Array([1])), /changed or disconnected/);
});
test('transaction signing receives serialized Uint8Array and solana:devnet, never send', async () => {
  const { wallet, account, calls } = fixture();
  const unsigned = wire([account]);
  const signed = await signWalletTransaction(wallet, account, account.address, unsigned);
  const input = calls[0].value as { transaction: Uint8Array; chain: string };
  assert.equal(input.chain, DEVNET_CHAIN); assert.ok(input.transaction instanceof Uint8Array);
  assert.deepEqual(input.transaction, bytesFromBase64(unsigned));
  assert.equal(bytesFromBase64(signed)[1], 3);
  assert.deepEqual(calls.map(c => c.kind), ['transaction']);
});
test('cooperative close retains the other wallet signature and rejects modified messages', async () => {
  const { wallet, account } = fixture();
  const publicKey = new Uint8Array(32).fill(8), other = { ...account, publicKey, address: base58(publicKey) };
  const unsigned = wire([account, other], [new Uint8Array(64), new Uint8Array(64).fill(9)]);
  const signed = await signWalletTransaction(wallet, account, account.address, unsigned);
  assert.deepEqual(bytesFromBase64(signed).slice(65, 129), new Uint8Array(64).fill(9));
  const modified: StandardWallet = { ...wallet, features: { ...wallet.features, 'solana:signTransaction': { async signTransaction(input) {
    const result = input.transaction.slice(); result[result.length - 1] ^= 1; return [{ signedTransaction: result }];
  } } } };
  await assert.rejects(signWalletTransaction(modified, account, account.address, unsigned), /modified the saved/);
  const erased: StandardWallet = { ...wallet, features: { ...wallet.features, 'solana:signTransaction': { async signTransaction(input) {
    const result = input.transaction.slice(); result.fill(4, 1, 65); result.fill(0, 65, 129); return [{ signedTransaction: result }];
  } } } };
  await assert.rejects(signWalletTransaction(erased, account, account.address, unsigned), /another cooperative signature/);
});
test('missing features, foreign signers, invalid raw transactions and noncanonical base64 fail closed', async () => {
  const { wallet, account } = fixture();
  await assert.rejects(signWalletTransaction({ ...wallet, features: { 'standard:connect': wallet.features['standard:connect'] } }, account, account.address, wire([account])), /lacks solana:signTransaction/);
  const other = fixture().account; const publicKey = new Uint8Array(32).fill(8);
  await assert.rejects(signWalletTransaction(wallet, account, account.address, wire([{ ...other, publicKey, address: base58(publicKey) }])), /not a required signer/);
  await assert.rejects(signWalletTransaction(wallet, account, account.address, 'AQID'), /serialized/);
  for (const invalid of ['', 'YQ', 'YQ===', 'YR==', '*===']) assert.throws(() => bytesFromBase64(invalid));
});
