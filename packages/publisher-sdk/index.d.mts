import type {FinancialMetadata, NativePayment, PaymentAuthorization} from './financial.mjs';
export type {FinancialMode, FinancialMetadata, NativePayment, NativeTransaction, PaymentVoucher, PaymentAuthorization} from './financial.mjs';
export type Creative = { creativeVersionId?: string; approvedText: string; destinationURL: string; fictional?: boolean; softFitTags?: string[]; evidenceFieldIds?: string[] };
export type Award = { id: string; creativeHash: string; creative: Creative; brandName?: string; priceBaseUnits: string; expiresAt: number; campaignId?: string };
export type OpportunityInput = { question: string; sessionId: string; turnId: string; placementId?: string; requiredCapabilities?: string[]; excludedCategories?: string[] };
export type Trace = { engine?: string; bids?: unknown[]; rejections?: Array<{ reason?: string; campaignId?: string; [key: string]: unknown }>; decisions?: unknown[]; payment?: NativePayment; [key: string]: unknown };
export type OpportunityResult = FinancialMetadata & ({ status: 'awarded'; mode?: string; opportunityId: string; award: Award; deliveryToken: string; trace?: Trace; replayed?: boolean } | { status: 'no_fill'; mode?: string; opportunityId: string; trace?: Trace; replayed?: boolean });
export type AdResult = OpportunityResult | { status: 'error'; error: { code: string; status?: number } };
export type RenderObservation = { creativeHash: string; domInserted: boolean; sponsoredLabelPresent: boolean };
export type ReceiptResult = FinancialMetadata & { status: 'accepted'; receipt: Record<string, unknown>; signature: string; receiptHash: string; charge: { id: string; amountBaseUnits: string; [key: string]: unknown }; payment?: NativePayment; authorization?: PaymentAuthorization; replayed: boolean };
export class PublisherSDKError extends Error { code: string; status?: number; constructor(code: string, options?: { status?: number; cause?: unknown }); }
export class AXPPublisher {
  constructor(options: { apiKey: string; baseURL?: string; timeoutMs?: number; receiptTimeoutMs?: number; fetch?: typeof globalThis.fetch });
  requestAd(input: OpportunityInput): Promise<AdResult>;
  acknowledgeRender(input: { awardId: string; deliveryToken: string; observation: RenderObservation }): Promise<ReceiptResult>;
  failRender(input: { awardId: string; deliveryToken: string; reason?: string }): Promise<Record<string, unknown>>;
}
