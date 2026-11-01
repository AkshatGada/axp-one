import type {FinancialMetadata, NativePayment, PaymentAuthorization} from './financial.mjs';
export type {FinancialMode, FinancialMetadata, NativePayment, NativeTransaction, PaymentVoucher, PaymentAuthorization} from './financial.mjs';
export type Creative = { creativeVersionId?: string; approvedText: string; destinationURL: string; fictional?: boolean; softFitTags?: string[]; evidenceFieldIds?: string[] };
export type Award = FinancialMetadata & { id: string; creativeHash: string; creative: Creative; brandName?: string; priceBaseUnits: string; /** Unix epoch milliseconds. */ expiresAt: number; campaignId?: string };
export type OpportunityInput = { question: string; sessionId: string; turnId: string; placementId?: string; requiredCapabilities?: string[]; excludedCategories?: string[]; settlementNetwork?: 'solana-devnet' | 'tempo-testnet' | 'hsk-testnet' };
export type Trace = { engine?: string; bids?: unknown[]; rejections?: Array<{ reason?: string; campaignId?: string; [key: string]: unknown }>; decisions?: unknown[]; payment?: NativePayment; [key: string]: unknown };
export type OpportunityResult = FinancialMetadata & ({ status: 'awarded'; mode?: string; opportunityId: string; award: Award; deliveryToken: string; trace?: Trace; replayed?: boolean } | { status: 'no_fill'; mode?: string; opportunityId: string; trace?: Trace; replayed?: boolean });
export type AdResult = OpportunityResult | { status: 'error'; error: { code: string; status?: number } };
export type RenderObservation = { creativeHash: string; domInserted: boolean; sponsoredLabelPresent: boolean };
export type AcceptedReceipt = {awardId: string; creativeHash: string; schemaVersion?: 'publisher-receipt.v1'; mode?: string; [key: string]: unknown};
export type ReceiptResult = FinancialMetadata & { status: 'accepted'; receipt: AcceptedReceipt; signature: string; receiptHash: string; charge: { id: string; amountBaseUnits: string; awardId?: string; receiptHash?: string; mode?: string; [key: string]: unknown }; payment?: NativePayment; authorization?: PaymentAuthorization; replayed: boolean };
export type OpportunityLookupInput = {sessionId: string; turnId: string};
export type DeliveryLookupInput = {awardId: string; deliveryToken: string};
export type AwardStatus = 'reserved' | 'expired' | 'failed' | 'delivered';
export type OpportunityStatusResult = {schemaVersion: 'publisher-opportunity-status.v1'} & (
  | {status: 'not_found' | 'pending' | 'unknown'; result?: never; awardStatus?: never}
  | {status: 'resolved'; result: Extract<OpportunityResult, {status: 'awarded'}>; awardStatus?: AwardStatus}
  | {status: 'resolved'; result: Extract<OpportunityResult, {status: 'no_fill'}>; awardStatus?: never}
);
export type DeliveryStatusResult = {schemaVersion: 'publisher-award-status.v1'; awardId: string; financialMode: import('./financial.mjs').FinancialMode} & (
  | {status: 'reserved' | 'expired' | 'failed'; /** Unix epoch milliseconds. */ expiresAt: number; result?: never}
  | {status: 'accepted'; result: ReceiptResult}
);
export type FailRenderResult = {status: 'failed'; award: {id: string; [key: string]: unknown}};
export class PublisherSDKError extends Error { code: string; status?: number; constructor(code: string, options?: { status?: number; cause?: unknown }); }
export class AXPPublisher {
  constructor(options: { apiKey: string; baseURL?: string; timeoutMs?: number; receiptTimeoutMs?: number; fetch?: typeof globalThis.fetch });
  requestAd(input: OpportunityInput): Promise<AdResult>;
  /** Authenticated read only; transport, input and validation errors throw PublisherSDKError. */
  lookupOpportunity(input: OpportunityLookupInput): Promise<OpportunityStatusResult>;
  /** Authenticated read only, using the original delivery token; errors throw PublisherSDKError. */
  lookupDelivery(input: DeliveryLookupInput): Promise<DeliveryStatusResult>;
  acknowledgeRender(input: { awardId: string; deliveryToken: string; observation: RenderObservation }): Promise<ReceiptResult>;
  failRender(input: { awardId: string; deliveryToken: string; reason?: string }): Promise<FailRenderResult>;
}
