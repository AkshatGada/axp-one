import { AccountApiError } from './client.ts';
import { bytesFromBase64 } from './walletStandard.ts';

/** Inject AccountsClient.financeRequest, never fetch/SDK credentials or session copies. */
export type FinancialRequest = (path: string, body?: object) => Promise<unknown>;
export type FinancialResource = 'campaigns' | 'apps';
export type FinancialRole = 'payer' | 'payee';
export type FinancialOperation = 'open' | 'voucher' | 'close';
export interface WalletBinding {
  id: string; resourceId: string; organizationId: string; ownerId: string;
  purpose: 'funding' | 'payout'; network: 'solana-devnet'; address: string; verifiedAt: number;
}
export interface WalletChallenge {
  challengeId: string; message: string; encoding: 'utf8'; signatureEncoding: 'base58';
  expiresAt: number; address: string; network: 'solana-devnet'; purpose: 'funding' | 'payout';
}
export interface FinancialChannel {
  id: string; campaignId: string; campaignVersion: number; appId: string;
  financialMode: 'devnet'; settlementNetwork: 'solana-devnet'; asset: 'USDC'; decimals: 6; signingMode: 'own_wallet';
  payer: string; payee: string; depositBaseUnits: string; chargeCapBaseUnits: string;
  termsHash: string; phase: string; protocolChannelId: string | null;
  authorizedBaseUnits: string; paidBaseUnits: string; refundBaseUnits: string; feeAndRentLamports: string;
  openStatus: string; closeStatus: string; openTransaction: string | null; closeTransaction: string | null;
  requiresReconciliation: boolean; servingEnabled: boolean; createdAt: number;
  pendingAuthorizationStatus: 'preparing' | 'prepared' | 'unknown' | null;
}
export interface TransactionSigning {
  kind: 'open' | 'close'; termsHash: string; wireBase64: string;
  requiredSigners: string[]; estimatedFeeAndRentLamports: string;
}
/** Only the payer's unsigned native message survives projection; never a private voucher. */
export interface VoucherSigning {
  kind: 'voucher'; termsHash: string; messageBase64: string; signer: string;
  chargeId: string; previousAmountBaseUnits: string; cumulativeAmountBaseUnits: string;
}
export type FinancialSigning = TransactionSigning | VoucherSigning;
export interface FinancialResult { channel: FinancialChannel; signing?: FinancialSigning | null }
function fail(status = 502, code = 'invalid_financial_response'): never { throw new AccountApiError(status, code); }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 160): string {
  if (typeof value !== 'string' || !value || value.length > max || /[\u0000-\u001f]/.test(value)) return fail();
  return value;
}
function id(value: unknown): string {
  const result = text(value);
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(result)) return fail(400, 'invalid_input');
  return result;
}
function address(value: unknown): string {
  const result = text(value, 44);
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(result)) return fail();
  return result;
}
function integer(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) return fail();
  return value;
}
function flag(value: unknown): boolean { if (typeof value !== 'boolean') return fail(); return value; }
function units(value: unknown): string {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]{0,19})$/.test(value)) return fail();
  return value;
}
function digest(value: unknown): string { if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) return fail(); return value; }
function nullable(value: unknown): string | null { return value === null ? null : text(value); }
const purpose = (kind: FinancialResource) => kind === 'campaigns' ? 'funding' as const : 'payout' as const;
export function financialChannelDTO(value: unknown): FinancialChannel {
  const v = object(value);
  if (v.financialMode !== 'devnet' || v.settlementNetwork !== 'solana-devnet' || v.asset !== 'USDC' || v.decimals !== 6 || v.signingMode !== 'own_wallet') fail();
  const pending = v.pendingAuthorizationStatus;
  if (pending !== null && pending !== 'preparing' && pending !== 'prepared' && pending !== 'unknown') fail();
  const channel: FinancialChannel = {
    id: id(v.id), campaignId: id(v.campaignId), campaignVersion: integer(v.campaignVersion), appId: id(v.appId),
    financialMode: 'devnet', settlementNetwork: 'solana-devnet', asset: 'USDC', decimals: 6, signingMode: 'own_wallet',
    payer: address(v.payer), payee: address(v.payee), depositBaseUnits: units(v.depositBaseUnits), chargeCapBaseUnits: units(v.chargeCapBaseUnits),
    termsHash: digest(v.termsHash), phase: text(v.phase), protocolChannelId: nullable(v.protocolChannelId),
    authorizedBaseUnits: units(v.authorizedBaseUnits), paidBaseUnits: units(v.paidBaseUnits), refundBaseUnits: units(v.refundBaseUnits),
    feeAndRentLamports: units(v.feeAndRentLamports), openStatus: text(v.openStatus), closeStatus: text(v.closeStatus),
    openTransaction: nullable(v.openTransaction), closeTransaction: nullable(v.closeTransaction),
    requiresReconciliation: flag(v.requiresReconciliation), servingEnabled: flag(v.servingEnabled), createdAt: integer(v.createdAt),
    pendingAuthorizationStatus: pending,
  };
  if (!['frozen', 'preparation_unknown', 'awaiting_open_signature', 'funded', 'authorization_unknown', 'draining', 'open_submitted', 'close_submitted', 'finalized'].includes(channel.phase) ||
    channel.payer === channel.payee || BigInt(channel.depositBaseUnits) < 1n || BigInt(channel.depositBaseUnits) > 200000n ||
    BigInt(channel.chargeCapBaseUnits) > BigInt(channel.depositBaseUnits) || BigInt(channel.authorizedBaseUnits) > BigInt(channel.chargeCapBaseUnits) ||
    BigInt(channel.paidBaseUnits) + BigInt(channel.refundBaseUnits) > BigInt(channel.depositBaseUnits)) fail();
  return channel;
}
function bindingDTO(value: unknown, org: string, kind: FinancialResource, resource: string): WalletBinding {
  const v = object(value);
  if (v.organizationId !== org || v.resourceId !== resource || v.purpose !== purpose(kind) || v.network !== 'solana-devnet') fail();
  return { id: id(v.id), organizationId: org, resourceId: resource, ownerId: id(v.ownerId),
    purpose: purpose(kind), network: 'solana-devnet', address: address(v.address), verifiedAt: integer(v.verifiedAt) };
}
function unchanged(next: FinancialChannel, previous: FinancialChannel) {
  for (const key of ['id', 'campaignId', 'campaignVersion', 'appId', 'termsHash', 'payer', 'payee', 'depositBaseUnits', 'chargeCapBaseUnits'] as const) {
    if (next[key] !== previous[key]) fail();
  }
}
function signingDTO(value: unknown, channel: FinancialChannel, operation: FinancialOperation, role: FinancialRole): FinancialSigning {
  const v = object(value);
  if (v.termsHash !== channel.termsHash) fail();
  if (operation === 'voucher') {
    if (role !== 'payer' || !['voucher', 'solana-voucher'].includes(String(v.kind)) || v.network !== 'solana-devnet' || v.signer !== channel.payer || v.signatureType !== 'ed25519') fail();
    const messageBase64 = text(v.messageBase64, 20000); bytesFromBase64(messageBase64);
    const previousAmountBaseUnits = units(v.previousAmountBaseUnits), cumulativeAmountBaseUnits = units(v.cumulativeAmountBaseUnits);
    if (previousAmountBaseUnits !== channel.authorizedBaseUnits || BigInt(cumulativeAmountBaseUnits) <= BigInt(previousAmountBaseUnits) ||
      BigInt(cumulativeAmountBaseUnits) > BigInt(channel.chargeCapBaseUnits)) fail();
    return { kind: 'voucher', termsHash: channel.termsHash, messageBase64, signer: channel.payer,
      chargeId: text(v.chargeId), previousAmountBaseUnits, cumulativeAmountBaseUnits };
  }
  const expected = operation === 'open' ? [channel.payer] : [channel.payer, channel.payee];
  const required = v.requiredSigners;
  if (v.kind !== operation || !Array.isArray(required) || required.length !== expected.length || !expected.every((signer, i) => required[i] === signer)) fail();
  const wireBase64 = text(v.wireBase64, 20000); bytesFromBase64(wireBase64);
  return { kind: operation, termsHash: channel.termsHash, wireBase64, requiredSigners: expected, estimatedFeeAndRentLamports: units(v.estimatedFeeAndRentLamports) };
}
/** Epoch fencing stops a pending wallet prompt from submitting after scope/unmount changes. */
export class FinancialScope {
  private epoch = 0;
  private pending = false;
  begin() {
    if (this.pending) return fail(409, 'financial_operation_pending');
    this.pending = true;
    const epoch = this.epoch;
    return { current: () => epoch === this.epoch, finish: () => { if (epoch === this.epoch) this.pending = false; } };
  }
  invalidate() { this.epoch++; this.pending = false; }
}
export class AccountFinancialClient {
  private readonly request: FinancialRequest;
  constructor(request: FinancialRequest) { this.request = request; }
  private resource(org: string, kind: FinancialResource, resource: string) {
    if (!['campaigns', 'apps'].includes(kind)) fail(400, 'invalid_input');
    return `/organizations/${id(org)}/${kind}/${id(resource)}`;
  }
  private channel(org: string, channel: FinancialChannel, action: string) { return `/organizations/${id(org)}/channels/${id(channel.id)}/${action}`; }
  async wallet(org: string, kind: FinancialResource, resource: string): Promise<WalletBinding | null> {
    const result = object(await this.request(`${this.resource(org, kind, resource)}/wallet`));
    return result.wallet === null ? null : bindingDTO(result.wallet, org, kind, resource);
  }
  async challenge(org: string, kind: FinancialResource, resource: string, expectedAddress: string): Promise<WalletChallenge> {
    address(expectedAddress);
    const v = object(await this.request(`${this.resource(org, kind, resource)}/wallet/challenge`, { address: expectedAddress, network: 'solana-devnet' }));
    if (v.address !== expectedAddress || v.network !== 'solana-devnet' || v.purpose !== purpose(kind) || v.encoding !== 'utf8' || v.signatureEncoding !== 'base58' ||
      typeof v.message !== 'string' || !v.message || v.message.length > 8000) fail();
    return { challengeId: id(v.challengeId), message: v.message, encoding: 'utf8', signatureEncoding: 'base58',
      expiresAt: integer(v.expiresAt), address: expectedAddress, network: 'solana-devnet', purpose: purpose(kind) };
  }
  async verifyWallet(org: string, kind: FinancialResource, resource: string, challenge: WalletChallenge, signature: string): Promise<WalletBinding> {
    if (!/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature) || challenge.expiresAt <= Date.now()) fail(400, 'wallet_challenge_expired');
    const v = object(await this.request(`${this.resource(org, kind, resource)}/wallet/verify`, { challengeId: id(challenge.challengeId), signature }));
    const binding = bindingDTO(v.wallet, org, kind, resource);
    if (binding.address !== challenge.address) fail();
    return binding;
  }
  async channels(org: string, kind: FinancialResource, resource: string): Promise<FinancialChannel[]> {
    const v = object(await this.request(`${this.resource(org, kind, resource)}/channels`));
    if (!Array.isArray(v.channels) || v.channels.length > 256) return fail();
    const channels = v.channels.map(financialChannelDTO);
    if (new Set(channels.map(c => c.id)).size !== channels.length || channels.some(c => (kind === 'campaigns' ? c.campaignId : c.appId) !== resource)) fail();
    return channels;
  }
  async freeze(org: string, campaignId: string, expectedVersion: number, appId: string, depositBaseUnits: string): Promise<FinancialChannel> {
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1 || !/^[1-9][0-9]{0,5}$/.test(depositBaseUnits) || BigInt(depositBaseUnits) > 200000n) fail(400, 'amount_invalid');
    const v = object(await this.request(`${this.resource(org, 'campaigns', campaignId)}/funding`, { expectedVersion, appId: id(appId), depositBaseUnits }));
    const channel = financialChannelDTO(v.channel);
    if (channel.campaignId !== campaignId || channel.campaignVersion !== expectedVersion || channel.appId !== appId || channel.depositBaseUnits !== depositBaseUnits || channel.phase !== 'frozen' || channel.servingEnabled) fail();
    return channel;
  }
  private result(value: unknown, previous: FinancialChannel, operation?: FinancialOperation, role: FinancialRole = 'payer'): FinancialResult {
    const v = object(value), channel = financialChannelDTO(v.channel); unchanged(channel, previous);
    if (v.signing != null && !operation) fail();
    return { channel, ...(v.signing === undefined ? {} : { signing: v.signing === null ? null : signingDTO(v.signing, channel, operation!, role) }) };
  }
  async prepare(org: string, channel: FinancialChannel, operation: FinancialOperation, role: FinancialRole): Promise<FinancialResult> {
    if (!['open', 'voucher', 'close'].includes(operation) || role === 'payee' && operation !== 'close') fail(403, 'not_found');
    return this.result(await this.request(this.channel(org, channel, `${operation}/prepare`), {}), channel, operation, role);
  }
  async submit(org: string, channel: FinancialChannel, signing: FinancialSigning, signed: string, role: FinancialRole): Promise<FinancialResult> {
    if (signing.termsHash !== channel.termsHash || role === 'payee' && signing.kind !== 'close') fail(403, 'not_found');
    const body = signing.kind === 'voucher' ? { signature: signed } : { wireBase64: signed };
    return this.result(await this.request(this.channel(org, channel, `${signing.kind}/sign`), body), channel, signing.kind, role);
  }
  async reconcile(org: string, channel: FinancialChannel): Promise<FinancialResult> {
    return this.result(await this.request(this.channel(org, channel, 'reconcile'), {}), channel);
  }
  async serving(org: string, channel: FinancialChannel, enabled: boolean, role: FinancialRole): Promise<FinancialResult> {
    if (role !== 'payer' || typeof enabled !== 'boolean') fail(403, 'not_found');
    const result = this.result(await this.request(this.channel(org, channel, 'serving'), { expectedVersion: channel.campaignVersion, enabled }), channel);
    if (result.channel.servingEnabled !== enabled) fail();
    return result;
  }
}
