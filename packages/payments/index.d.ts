/** Native Node 25 ESM; synchronous methods may also be awaited. */
export interface PaymentStore {
  get(channelId: string): any;
  list(): any[];
  update(channelId: string, mutator: (current: any) => any): any;
  /** Private state, including synthetic signatures. Never a public evidence projection. */
  snapshot(): { schemaVersion: 1; channels: any[] };
}
export interface SyntheticOpenInput {
  channelId: string; mode: 'synthetic'; runId: string; advertiserId: string; campaignVersionId: string;
  payer: `synthetic:${string}`; payee: `synthetic:${string}`; depositBaseUnits: string;
  chargeCapBaseUnits?: string; network?: 'synthetic'; mint?: 'synthetic:test-USDC';
  voucherExpiresAt?: number; applicationDeadlineAt?: number; settlementMarginSeconds?: number;
  idleTimeoutSeconds?: number; openSlot?: string; authorizedSigner?: string; networkFeeBaseUnits?: '0';
}
export interface AcceptedChargeInput {
  channelId: string; chargeId: string; amountBaseUnits: string; accepted: true; sequence?: string;
  runId?: string; campaignVersionId?: string; payee?: string; mint?: string;
  reservationId?: string; acceptedReceiptHash?: string;
}
export interface AuthorizationResult {
  schemaVersion: 'axp.payment-adapter.v1'; id: string; channelId: string; runId: string;
  correlationId: string; mode: 'synthetic'; createdAt: string; status: string; chargeId: string;
  protocolDeliveryId?: string; cumulativeAmountBaseUnits?: string; signedPayloadHash?: string | null;
  sequence?: string; amountBaseUnits?: string; previousBaseUnits?: string; reasonCode?: string;
  orderedChargeCommitment?: string; voucherKind?: 'axp.synthetic-voucher.v1';
}
export class SyntheticPaymentAdapter {
  constructor(options?: { store?: PaymentStore; now?: () => number });
  store: PaymentStore;
  prepareOpen(input: SyntheticOpenInput): any;
  confirmOpen(input: { channelId: string; planId: string }): any;
  open(input: SyntheticOpenInput): any;
  getChannel(channelId: string): any;
  reserveAward(input: { channelId: string; reservationId: string; amountBaseUnits: string }): any;
  releaseAward(input: { channelId: string; reservationId: string }): any;
  acceptCharge(input: AcceptedChargeInput): any;
  authorizeCumulative(input: (AcceptedChargeInput | { channelId: string; chargeId: string; amountBaseUnits?: string }) & { fault?: 'after_signed' | 'after_commit' }): AuthorizationResult;
  lookupAuthorization(input: { channelId: string; chargeId: string }): AuthorizationResult;
  beginDrain(input: { channelId: string }): any;
  requestIdleClose(input: { channelId: string }): any;
  prepareClose(input: { channelId: string }): any;
  confirmClose(input: { channelId: string; planId: string; fault?: 'after_close' }): any;
  reconcile(input: { channelId: string; chargeId?: string; planId?: string }): any;
  prepareReclaim(input: { channelId: string; observedSlot: string; approved?: boolean }): any;
}
export class SQLitePaymentStore implements PaymentStore {
  constructor(path: string);
  get(channelId: string): any; list(): any[]; update(channelId: string, mutator: (current: any) => any): any;
  snapshot(): { schemaVersion: 1; channels: any[] }; close(): void;
}
export function createMemoryPaymentStore(snapshot?: { schemaVersion: 1; channels: any[] }): PaymentStore;
export class PaymentError extends Error { reasonCode: string; }
export const SYNTHETIC_SIGNER: string;
export function amount(value: string): bigint;
export function createSyntheticVoucher(input: { channelId: string; cumulativeAmountBaseUnits: string; expiresAt: number; termsHash: string }): any;
export function verifySyntheticVoucher(input: { voucher: any; channelId: string; termsHash: string; previousBaseUnits: string; chargeAmountBaseUnits: string; capBaseUnits: string; expiresAt: number; now: number }): string;
export const DEVNET_CONFIG: Readonly<{ mode: 'devnet'; network: 'devnet'; rpc: string; genesisHash: string; program: string; mint: string; tokenProgram: string; decimals: number; sdkTreasury: string }>;
export function validateDevnetConfig(config: any, options?: { observedGenesisHash?: string; expectedPayee?: string; deployedTreasury?: string }): { status: 'unverified'; mode: 'devnet'; reasonCode: string };
