// Generated from schema.mjs by generate.mjs; do not edit.
export type JsonValue = null | boolean | number | string | Array<JsonValue> | { [key: string]: JsonValue; };
export type JsonObject = { [key: string]: JsonValue; };
export type FinancialMode = "synthetic" | "sandbox" | "devnet";
export type PresentationKind = "recorded_evidence_replay";
export type SourceKind = "recorded_run" | "synthetic_test";
export type AmountBaseUnits = string;
export type Error = { "error": string; };
export type Creative = { "creativeVersionId": string; "approvedText": string; "destinationURL": string; "fictional": boolean; "softFitTags"?: Array<string>; "evidenceFieldIds"?: Array<string>; };
export type Campaign = { "campaignId": string; "campaignVersionId": string; "advertiserId": string; "status": "active" | "paused"; "allowedIntents": Array<string>; "destination": string; "declaredConstraints": Array<string>; "creatives": Array<Creative>; "softFitTags"?: Array<string>; "maxBidBaseUnits": AmountBaseUnits; "budgetCapBaseUnits": AmountBaseUnits; "channelId": string; "policyVersion"?: string; };
export type Decision = { "schemaVersion"?: string; "opportunityId": string; "advertiserId": string; "campaignVersionId": string; "agentRunId": string; "decision": "bid" | "skip" | "abstain"; "creativeVersionId": string | null; "relevanceLevel": 0 | 1 | 2 | 3 | null; "commercialIntentLevel": 0 | 1 | 2 | 3 | null; "relevance"?: number | null; "commercialIntent"?: number | null; "conversionProbability": null; "evidenceFieldIds": Array<string>; "reasonCodes": Array<string>; "scoreSemantics"?: string; "engineProvenance": JsonObject; };
export type Bid = { "id": string; "status": "bid"; "opportunityId": string; "campaignId": string; "campaignVersionId": string; "advertiserId": string; "creativeVersionId": string; "agentRunId": string; "amountBaseUnits": AmountBaseUnits; "bidPolicyVersion": string; };
export type Award = { "id": string; "runId": string; "mode": FinancialMode; "opportunityId": string; "campaignId": string; "campaignVersionId": string; "advertiserId": string; "publisherId": string; "randomSessionId": string; "channelId": string; "creativeVersionId": string; "creativeHash": string; "creative": Creative; "priceBaseUnits": AmountBaseUnits; "payee": string; "winningBidId": string; "status": "reserved" | "delivered" | "failed" | "expired"; "expiresAt": number; "createdAt": number; "renderTokenHash"?: string; };
export type Outcome = { "status": "awarded" | "no_fill" | "expired"; "award"?: Award; "bids": Array<Bid>; "rejections": Array<JsonObject>; };
export type Receipt = { "schemaVersion": string; "runId": string; "mode": FinancialMode; "publisherId": string; "publisherKeyId": string; "awardId": string; "opportunityId": string; "creativeHash": string; "nonce": string; "renderAcknowledgementHash": string; };
export type Delivery = { "id": string; "awardId": string; "status": "accepted"; "receivedAt": number; "receiptHash": string; };
export type Charge = { "id": string; "runId": string; "mode": FinancialMode; "awardId": string; "deliveryId": string; "campaignId": string; "campaignVersionId": string; "channelId": string; "amountBaseUnits": AmountBaseUnits; "acceptedAt": number; "sequence": number; "status": "accepted" | "authorized" | "settled"; "receiptHash": string; "delivery": Delivery; };
export type DeliveryResult = { "delivery": Delivery; "charge": Charge; "replayed": boolean; };
export type RenderAcknowledgement = { "domInserted": boolean; "sponsoredLabelPresent": boolean; "creativeHash": string; };
export type Channel = { "channelId": string; "advertiserId": string; "publisherId": string; "payee": string; "mode": FinancialMode; "status": "pending_open" | "open" | "draining" | "finalized"; "depositBaseUnits": AmountBaseUnits; "authorizedBaseUnits": AmountBaseUnits; "settledBaseUnits": AmountBaseUnits; "refundBaseUnits": AmountBaseUnits; "txSignature": string | null; "protocolChannelId"?: string; "termsHash"?: string; "closeStatus"?: string; };
export type RuntimeEvent = { "seq": number; "type": string; "at": number; "data": JsonObject; };
export type RuntimeState = { "schemaVersion": "axp.runtime.v1"; "runId": string; "mode": FinancialMode; "campaigns": Array<Campaign>; "channels": Array<Channel>; "opportunities": Array<JsonObject>; "awards": Array<Award>; "charges": Array<Charge>; "events": Array<RuntimeEvent>; "payments"?: JsonValue; };
export type RuntimeBootstrap = { "csrf": string; "runId": string; "mode": FinancialMode; "demo": JsonObject | null; "evidenceSource": { "enabled": boolean; "database": "ads" | null; "readOnly": true; "embeddingGeneration": false; }; "engines": Array<{ "id": string; "label": string; }>; "limitations": Array<string>; };
export type Health = { "status": "ok"; "mode": FinancialMode; "realPayments": boolean; };
export type TurnRequest = { "prompt": string; "engine"?: string; "turnId"?: string; "randomSessionId"?: string; };
export type RecoveryRequest = { "turnId": string; "randomSessionId": string; };
export type TurnResult = { "runId": string; "mode": FinancialMode; "engine": string; "opportunityId": string; "organic": JsonObject; "outcome": Outcome; "attempts": Array<{ "campaignId": string; "status": "completed" | "unavailable"; "decision"?: Decision; "reason"?: string; "elapsedMs": number; }>; "eligibility"?: JsonObject; "replayed": boolean; "originalOrganic"?: JsonObject; "organicRecovery"?: JsonObject; };
export type RecordedResults = { "runId": string; "mode": "recorded_results_not_fresh_execution"; "results": Array<TurnResult>; };
export type Cases = { "manifest": JsonObject; "cases": Array<JsonObject>; "liveEnabled": false; "sourceEnabled": boolean; };
export type CompareRequest = { "caseId": string; };
export type LookupRequest = { "prompt": string; };
export type EvidenceResult = { "schemaVersion": "cached-corpus-result.v1"; "status": "ready" | "query_vector_unavailable" | "source_unconfigured"; "matches": Array<JsonObject>; "provenance"?: JsonObject; "limitations": Array<string>; };
export type ComparisonResult = { "schemaVersion": "phase2-comparison.v1"; "runId": string; "mode": "nonfinancial_comparison"; "task": JsonObject; "caseManifest": JsonObject; "preparationElapsedMs": number; "totalElapsedMs": number; "preparationError": string | null; "lookupEvents": Array<JsonObject>; "profiles": Array<JsonObject>; "attempts": Array<JsonObject>; "providerUsage": JsonValue; "limitations": Array<string>; };
export type EmptyRequest = {  };
export type ResetResult = { "runId": string; "mode": "synthetic"; "historyPreserved": true; };
export type ReplayBootstrap = { "schemaVersion": "axp.replay.v1"; "presentationKind": PresentationKind; "financialMode": "sandbox"; "runId": string; "originalRecordedAt": string; "readOnly": true; "bundleHash": string; "steps": Array<{ "id": string; "title": string; }>; };
export type ReplayRun = { "campaigns": JsonValue; "turns": JsonValue; "evidence": JsonValue; "decisions": JsonValue; "deliveries": JsonValue; "payment": JsonValue; "chain": JsonValue; "restart": JsonValue; "research": JsonValue; "limitations": JsonValue; [key: string]: JsonValue; };
export type ReplayEvent = RuntimeEvent;
export type ReplayFixtures = JsonValue;
export type FrontendFixture = { "schemaVersion": "axp.frontend-fixture.v1"; "id": string; "sourceKind": SourceKind; "financialMode": FinancialMode; "description": string; "source": JsonObject | null; "response": JsonValue; "limitations": Array<string>; };

export type ClientSurface = 'runtime' | 'replay';
export interface ClientOptions { baseURL: string; surface?: ClientSurface; fetch?: typeof globalThis.fetch; EventSource?: typeof globalThis.EventSource; }
export interface EventHandlers { onEvent(event: JsonObject, message: MessageEvent): void; onReset?(): void; onError?(event: Event): void; }
export interface AxpClient {
  readonly surface: ClientSurface;
  health(): Promise<Health>;
  bootstrap(): Promise<RuntimeBootstrap>;
  state(): Promise<RuntimeState>;
  results(): Promise<RecordedResults>;
  decisionCases(): Promise<Cases>;
  recordedDecisions(): Promise<JsonObject>;
  lookupEvidence(body: LookupRequest): Promise<EvidenceResult>;
  compareDecisions(body: CompareRequest): Promise<ComparisonResult>;
  turn(body: TurnRequest): Promise<TurnResult>;
  recoverOrganic(body: RecoveryRequest): Promise<TurnResult>;
  reset(): Promise<ResetResult>;
  createCampaign(body: Campaign): Promise<Campaign>;
  pauseCampaign(id: string): Promise<Campaign>;
  acknowledgeRender(id: string, body: RenderAcknowledgement): Promise<DeliveryResult>;
  failAward(id: string): Promise<Award>;
  replayBootstrap(): Promise<ReplayBootstrap>;
  replayRun(): Promise<ReplayRun>;
  replayFixtures(): Promise<ReplayFixtures>;
  replayEvents(lastEventId?: string): Promise<Array<{id: string; event: string; data: JsonObject}>>;
  openEvents(handlers: EventHandlers): EventSource;
}
export declare class ClientError extends Error { code: string; status: number; constructor(code: string, status?: number); }
export declare function createClient(options: ClientOptions): AxpClient;
