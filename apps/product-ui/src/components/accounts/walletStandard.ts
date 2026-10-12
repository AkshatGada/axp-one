/** Dependency-free Wallet Standard subset. Discovery never connects or signs.
 * References: wallet-standard/core/app wallets.ts; anza-xyz/wallet-standard
 * core/features signMessage.ts and signTransaction.ts. No send feature is used.
 */
export const DEVNET_CHAIN = 'solana:devnet' as const;
export interface StandardAccount {
  readonly address: string;
  readonly publicKey: Uint8Array;
  readonly chains: readonly string[];
  readonly features: readonly string[];
}
export interface StandardWallet {
  readonly name: string;
  readonly chains: readonly string[];
  readonly accounts: readonly StandardAccount[];
  readonly features: {
    readonly 'standard:connect'?: { connect: () => Promise<{ accounts: readonly StandardAccount[] }> };
    readonly 'solana:signMessage'?: { signMessage: (...inputs: { account: StandardAccount; message: Uint8Array }[]) => Promise<readonly { signedMessage: Uint8Array; signature: Uint8Array; signatureType?: 'ed25519'; account?: StandardAccount }[]> };
    readonly 'solana:signTransaction'?: { signTransaction: (...inputs: { account: StandardAccount; transaction: Uint8Array; chain: typeof DEVNET_CHAIN }[]) => Promise<readonly { signedTransaction: Uint8Array; account?: StandardAccount }[]> };
  };
}
export class WalletStandardError extends Error {
  constructor(message: string) { super(message); this.name = 'WalletStandardError'; }
}
function fail(message: string): never { throw new WalletStandardError(message); }
const equal = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((byte, i) => byte === b[i]);
const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function base58(bytes: Uint8Array): string {
  let value = 0n;
  for (const byte of bytes) value = value * 256n + BigInt(byte);
  let encoded = '';
  while (value) { encoded = alphabet[Number(value % 58n)] + encoded; value /= 58n; }
  for (const byte of bytes) { if (byte !== 0) break; encoded = '1' + encoded; }
  return encoded;
}
export function bytesFromBase64(value: string): Uint8Array {
  if (!value || value.length > 20000 || value.length % 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) fail('Invalid saved signing bytes. Reload the saved plan.');
  const bytes = Uint8Array.from(atob(value), char => char.charCodeAt(0));
  if (bytesToBase64(bytes) !== value) fail('Invalid saved signing bytes. Reload the saved plan.');
  return bytes;
}
export function bytesToBase64(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
}
function compatible(value: unknown): value is StandardWallet {
  if (!value || typeof value !== 'object') return false;
  const wallet = value as StandardWallet;
  return typeof wallet.name === 'string' && wallet.name.length > 0 && wallet.name.length <= 100 &&
    Array.isArray(wallet.chains) && wallet.chains.includes(DEVNET_CHAIN) && Array.isArray(wallet.accounts) &&
    typeof wallet.features?.['standard:connect']?.connect === 'function' &&
    typeof wallet.features?.['solana:signMessage']?.signMessage === 'function';
}
/** Install the standard register-wallet listener BEFORE dispatching app-ready. */
export function discoverWallets(target: EventTarget, changed: (wallets: readonly StandardWallet[]) => void): () => void {
  const wallets = new Set<StandardWallet>();
  let active = true;
  const publish = () => { if (active) changed([...wallets]); };
  const api = Object.freeze({ register: (...candidates: unknown[]) => {
    if (!active) return () => {};
    const added = candidates.filter(compatible).filter(wallet => !wallets.has(wallet));
    added.forEach(wallet => wallets.add(wallet)); publish();
    return () => { added.forEach(wallet => wallets.delete(wallet)); publish(); };
  } });
  const listener = (event: Event) => {
    const callback: unknown = (event as CustomEvent<unknown>).detail;
    if (typeof callback === 'function') { try { callback(api); } catch { /* A broken extension cannot break discovery. */ } }
  };
  target.addEventListener('wallet-standard:register-wallet', listener);
  const event = new Event('wallet-standard:app-ready');
  Object.defineProperty(event, 'detail', { value: api });
  target.dispatchEvent(event); publish();
  return () => { active = false; wallets.clear(); target.removeEventListener('wallet-standard:register-wallet', listener); };
}
function validAccount(wallet: StandardWallet, account: StandardAccount, expectedAddress: string, feature: string) {
  if (!wallet.chains.includes(DEVNET_CHAIN) || account.address !== expectedAddress ||
    !(account.publicKey instanceof Uint8Array) || account.publicKey.length !== 32 || base58(account.publicKey) !== expectedAddress ||
    !account.chains.includes(DEVNET_CHAIN) || !account.features.includes(feature)) {
    fail('The wallet account must match the expected address and support Solana Devnet and this signing feature.');
  }
}
function currentAccount(wallet: StandardWallet, account: StandardAccount, expectedAddress: string, feature: string) {
  validAccount(wallet, account, expectedAddress, feature);
  const current = wallet.accounts.find(candidate => candidate.address === expectedAddress && equal(candidate.publicKey, account.publicKey));
  if (!current) fail('Wallet account changed or disconnected. Connect the expected address again.');
  validAccount(wallet, current, expectedAddress, feature);
}
export async function connectWallet(wallet: StandardWallet, expectedAddress: string): Promise<StandardAccount> {
  if (!compatible(wallet) || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(expectedAddress)) fail('Choose a Devnet wallet and enter the expected wallet address.');
  const result = await wallet.features['standard:connect']!.connect();
  const account = result.accounts.find(candidate => candidate.address === expectedAddress);
  if (!account) fail('The wallet did not return the expected account. Select it in your wallet and connect again.');
  currentAccount(wallet, account, expectedAddress, 'solana:signMessage');
  return account;
}
export async function signWalletMessage(wallet: StandardWallet, account: StandardAccount, expectedAddress: string, message: Uint8Array): Promise<string> {
  currentAccount(wallet, account, expectedAddress, 'solana:signMessage');
  const feature = wallet.features['solana:signMessage'];
  if (!feature || !message.length) fail('This wallet cannot sign the saved message.');
  const original = message.slice();
  const results = await feature.signMessage({ account, message: message.slice() });
  currentAccount(wallet, account, expectedAddress, 'solana:signMessage');
  const result = results[0];
  if (results.length !== 1 || !result || !(result.signature instanceof Uint8Array) || result.signature.length !== 64 ||
    !(result.signedMessage instanceof Uint8Array) || !equal(result.signedMessage, original) ||
    (result.signatureType !== undefined && result.signatureType !== 'ed25519')) fail('Wallet returned a different message or an invalid Ed25519 signature. Nothing was submitted.');
  if (result.account) validAccount(wallet, result.account, expectedAddress, 'solana:signMessage');
  return base58(result.signature);
}
/** Read wire framing only; native semantic/signature verification remains server-owned. */
function transactionParts(wire: Uint8Array) {
  if (!wire.length || wire.length > 1232) fail('Invalid serialized Solana transaction.');
  // A packet can hold fewer than 128 signatures, so canonical shortvec is one byte.
  const count = wire[0], offset = 1 + count * 64;
  if (!count || count >= 128 || offset + 4 > wire.length) fail('Invalid serialized Solana transaction.');
  const message = wire.slice(offset);
  const versioned = (message[0] & 0x80) !== 0;
  if (versioned && message[0] !== 0x80) fail('Unsupported Solana transaction version.');
  const header = versioned ? 1 : 0;
  if (message[header] !== count || message[header + 3] < count || message[header + 3] >= 128) fail('Invalid Solana signer header.');
  const keys = header + 4;
  if (message.length < keys + message[header + 3] * 32 + 33) fail('Invalid Solana transaction message.');
  return { count, offset, message, keys };
}
export async function signWalletTransaction(wallet: StandardWallet, account: StandardAccount, expectedAddress: string, wireBase64: string): Promise<string> {
  currentAccount(wallet, account, expectedAddress, 'solana:signTransaction');
  const feature = wallet.features['solana:signTransaction'];
  if (!feature) fail('This wallet lacks solana:signTransaction. Choose a wallet that signs without broadcasting.');
  const wire = bytesFromBase64(wireBase64), before = transactionParts(wire);
  let own = -1;
  for (let i = 0; i < before.count; i++) if (equal(before.message.slice(before.keys + i * 32, before.keys + (i + 1) * 32), account.publicKey)) own = i;
  if (own < 0) fail('The expected account is not a required signer of this saved transaction.');
  const results = await feature.signTransaction({ account, transaction: wire.slice(), chain: DEVNET_CHAIN });
  currentAccount(wallet, account, expectedAddress, 'solana:signTransaction');
  const result = results[0];
  if (results.length !== 1 || !result || !(result.signedTransaction instanceof Uint8Array)) fail('Wallet returned an invalid transaction. Nothing was submitted.');
  if (result.account) validAccount(wallet, result.account, expectedAddress, 'solana:signTransaction');
  const signed = result.signedTransaction, after = transactionParts(signed);
  if (after.count !== before.count || !equal(before.message, after.message)) fail('Wallet modified the saved transaction message. Nothing was submitted.');
  for (let i = 0; i < before.count; i++) {
    const start = 1 + i * 64, signature = signed.slice(start, start + 64);
    if (i === own && signature.every(byte => byte === 0)) fail('Wallet did not add the expected signature.');
    if (i !== own && !equal(wire.slice(start, start + 64), signature)) fail('Wallet changed another cooperative signature. Nothing was submitted.');
  }
  return bytesToBase64(signed);
}
