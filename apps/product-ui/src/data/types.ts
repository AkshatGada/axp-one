// Types for the public projection (axp.product-run.v1) written by scripts/project-run.mjs.
// Unions mirror packages/v3/client.d.mts (Capability, RetrievalMethod) so the explorer and the backend agree.

export type Capability =
  | "crypto_storage"
  | "hardware_wallet"
  | "offline_key_storage"
  | "ethereum"
  | "solana"
  | "mobile_software_wallet"
  | "physical_wallet"
  | "rfid_blocking";
export type RetrievalMethod = "vector" | "lexical_fallback" | "unavailable";
export type Arm = "text_only" | "history";
export type AuctionRole = "research" | "competed" | "not_admitted" | "excluded" | "skipped";
export type Levels = Record<string, number>;

export interface Creative {
  approvedText: string;
  creativeVersionId: string;
  destinationURL: string;
  evidenceFieldIds: string[];
  fictional: boolean;
  softFitTags: string[];
}

export interface CampaignP {
  campaignId: string;
  slug: "clearvault" | "keyforge" | "leatherguard" | string;
  businessName: string;
  fictional: boolean;
  approved: boolean;
  version: number;
  campaignVersionId: string;
  status: string;
  allowedIntents: string[];
  destination: string;
  declaredConstraints: Capability[];
  contextHints: string;
  maxBidBaseUnits: string;
  budgetCapBaseUnits: string;
  channelId: string;
  policyVersion: string;
  creative: Creative;
  creativeHash: string;
  campaignHash: string | null;
  funded: boolean;
  channelStatus: string;
  depositBaseUnits: string;
}

export interface Retrieval {
  method: RetrievalMethod;
  fallback: boolean;
  model: string | null;
  dimension: number | null;
  revision: string;
  historyStatus: string;
  queryTextHash: string;
  examples: Array<{ id: string; similarity: number; hintIds: string[] }>;
  hintIds: string[];
  contrastIds: string[];
  neighbors: Array<{ similarity: number; associationIds: string[] }>;
  neighborCount: number;
  independentPromptCount: number;
  qualityFlags: string[];
  profileId: string | null;
}

export interface Decision {
  slotId: string;
  callId: string;
  campaignId: string;
  campaignVersionId: string;
  arm: Arm;
  category: string;
  callAdmitted: boolean;
  status: string;
  auctionRole: AuctionRole;
  decision: "bid" | "skip" | "abstain";
  relevanceLevel: number;
  commercialIntentLevel: number;
  scores: { relevance: number; intent: number };
  /** Jev's own confidence in each answer (0 to 1); creative is null in bundles that did not record it. */
  confidence: { relevance: number; intent: number; creative?: number | null };
  probabilities: { relevance: Levels; intent: Levels };
  legend: { relevance: Record<string, string>; intent: Record<string, string> };
  creative: { choice: string; probability: number | null; noFitProbability: number | null };
  sufficient: number | null;
  reasonCodes: string[];
  creativeVersionId: string | null;
  elapsedMs: number;
  usage: { inputTokens: number; outputTokens: number };
  engine: { engine: string; model: string; transportMode: string; rubricHash: string; outcome: string };
  timing: { admittedAt: number; startedAt: number; responseAt: number; completedAt: number };
  packet: unknown;
  packetHash: string;
  requestHash: string;
  rawOutputHash: string;
  inputHash: string;
  bindings: {
    questionHash: string;
    campaignHash: string;
    manifestHash: string;
    sourceHash: string | null;
    profileHash: string | null;
    retrievalHash: string | null;
  };
  retrieval: Retrieval | null;
}

export interface Bid {
  bidId: string;
  campaignId: string;
  amountBaseUnits: string;
  levels: string | null;
  bps: number | null;
  maxBidBaseUnits: string;
  availableCampaignBaseUnits: string;
  availableChannelBaseUnits: string;
  bidPolicyVersion: string;
}

export interface Award {
  id: string;
  campaignId: string;
  campaignVersionId: string;
  channelId: string;
  priceBaseUnits: string;
  creative: Creative;
  creativeHash: string;
  creativeVersionId: string;
  createdAt: number;
  expiresAt: number;
  status: string;
  winningBidId: string;
  payee: string;
}

export interface ReceiptFields {
  awardId: string;
  creativeHash: string;
  mode: string;
  nonce: string;
  opportunityId: string;
  publisherId: string;
  publisherKeyId: string;
  renderAcknowledgementHash: string;
  runId: string;
  schemaVersion: string;
}

export interface Opportunity {
  n: number;
  scenarioId: "cached" | "offline" | "repeat" | "mobile";
  turnId: string;
  questionIndex: number;
  paired: boolean;
  question: string;
  questionHash: string | null;
  turnInput: { scenario: unknown; turnId: string; question: string; mandatoryCapabilities: string[]; financialMode: string };
  turnInputHash: string;
  mandatoryCapabilities: Capability[];
  softPreferences: string[];
  floorBaseUnits: string;
  opportunityId: string;
  slotId: string;
  publisherId: string;
  randomSessionId: string;
  coarseIntent: string;
  destination: string;
  createdAt: number;
  expiresAt: number;
  requestedAt: number;
  completedAt: number;
  status: "awarded" | "no_fill";
  execution: string;
  organic: {
    answer: string;
    model: string;
    effort: string;
    requestId: string;
    requestedAt: number;
    completedAt: string;
    completionHash: string;
    inputHash: string;
    advertiserMaterialReceived: boolean;
    suppliedPrompt: string;
    attestation: string | null;
    engine: string | null;
    execution: string | null;
    toolUse: string | null;
  };
  eligibility: {
    eligible: string[];
    excluded: Array<{ campaignId: string; reason: string; missing: string[] }>;
    financialEligibilityCheckedAtAuction: boolean;
  };
  decisions: Decision[];
  auction: {
    status: string;
    bids: Bid[];
    rejections: Array<{ campaignId: string; reason: string }>;
    notAdmitted: Array<{ campaignId: string; reason: string; agentDecision: string | null; levels: string | null; sessionAwards: number; frequencyCap: number }>;
    winnerCampaignId: string | null;
    tieBreakApplied: boolean;
  };
  award: Award | null;
  delivery: {
    deliveryId: string;
    status: string;
    receivedAt: number;
    msAfterAward: number;
    acknowledgement: { awardId: string; creativeHash: string; domInserted: boolean; sponsoredLabelPresent: boolean };
    renderAcknowledgementHash: string;
  } | null;
  receipt: { chargeId: string; fields: ReceiptFields; receiptHash: string; signature: string; recordedOnReplay: boolean } | null;
  charge: {
    id: string;
    awardId: string;
    amountBaseUnits: string;
    sequence: number;
    status: string;
    acceptedAt: number;
    channelId: string;
    receiptHash: string;
    campaignId: string;
  } | null;
  voucher: {
    channelId: string;
    chargeId: string;
    sequence: number;
    status: string;
    incrementBaseUnits: string;
    cumulativeAmountBaseUnits: string;
    payloadHash: string;
    voucherRecordHash: string;
  } | null;
  runningTotalBaseUnits: string;
}

export interface EvidenceRecord {
  id: string;
  mappingId: number;
  promptId: number;
  promptText: string;
  normalizedHash: string;
  creativeId: number;
  creativeContentHash: string;
  advertiser: string;
  creativeText: string;
  hintIds: string[];
  source: { source: string | null; probeNiche: string | null; mappingNiche: string | null };
}
export interface EvidenceHint {
  id: string;
  text: string;
  tier: string;
  modelVersion: string;
  qualityFlags: string[];
  supportingCreativeCount: number;
}

export interface ChainTx {
  kind: "open" | "close";
  signature: string;
  slot: number;
  blockTime: number;
  finality: string;
  confirmationStatus: string | null;
  err: unknown;
  tokenDeltas: { payer: string; publisher: string; treasury: string };
  networkFeeLamports: string;
  newRentLamports: string;
  reclaimedRentLamports: string;
  logs: string[];
  /** Present only when the run's own network is Solana Devnet. */
  explorerUrl?: string;
}

export interface Voucher {
  sequence: number;
  chargeId: string;
  opportunityN: number | null;
  status: string;
  incrementBaseUnits: string;
  cumulativeAmountBaseUnits: string;
  payloadHash: string;
  voucherRecordHash: string;
}

export interface Channel {
  channelId: string;
  campaignId: string;
  network: string;
  phase: string;
  openStatus: string;
  closeStatus: string;
  reconciliationRequired: boolean;
  protocolChannelId: string;
  termsHash: string;
  genesisHash: string;
  program: string;
  mint: string;
  payer: string;
  payee: string;
  depositBaseUnits: string;
  authorizedBaseUnits: string;
  acceptedBaseUnits: string;
  settledBaseUnits: string;
  refundBaseUnits: string;
  estimatedGrossFeeAndRentLamports: string;
  escrowClosed: boolean;
  chainStatus: string;
  remainingChannelRentLamports: string;
  vouchers: Voucher[];
  open: ChainTx;
  close: ChainTx;
  /** Present only when the run's own network is Solana Devnet. */
  explorerUrl?: string | null;
}

export interface RunEvent {
  seq: number;
  type: string;
  at: number;
  turnId: string | null;
  opportunityId: string | null;
  data: Record<string, unknown>;
}

export interface ProductRun {
  schema: "axp.product-run.v1";
  source: {
    runId: string;
    runSchema: string;
    createdAt: string;
    runPath: string;
    runSha256: string;
    manifestPath: string;
    manifestSha256: string;
    manifestCreatedAt: string;
    financialMode: string;
    presentation: string;
    network: string;
    chainCheckedAt: string;
  };
  /** Where this run's own money moved. */
  network: { kind: "devnet" | "sandbox"; label: string; genesisHash: string | null; programExplorerUrl: string | null };
  /** Devnet runs only: the run's own explorer links for payers, the publisher and the funding transaction. */
  chainExtras: {
    funding: { signature: string; explorerUrl: string; slot: number; lamportsPerPayer: string; tokenBaseUnitsPerPayer: string; payers: string[] } | null;
    payers: Array<{ campaignId: string; address: string; explorerUrl: string }>;
    publisher: { address: string | null; explorerUrl: string | null };
  } | null;
  counts: {
    opportunities: number;
    decisions: number;
    auctions: number;
    noFill: number;
    receipts: number;
    events: number;
    channels: number;
    txs: number;
    inputTokens: number;
    outputTokens: number;
  };
  policy: {
    version: string;
    financialMode: string;
    auction: string;
    bidPolicy: string;
    frequencyCap: number;
    maxBidBaseUnits: string;
    totalCapBaseUnits: string;
    depositBaseUnits: string;
    aggregateChargeCapBaseUnits: string;
    aggregateFeeRentLamports: string;
    maxCalls: number;
    maxOrganic: number;
    maxPaidDeliveries: number;
    model: string;
    organicModel: string;
    organicReasoning: string;
    categoryLimits: Record<string, number>;
    floorBaseUnits: string;
    bidTable: Array<{ levels: string; relevance: number; intent: number; bps: number }>;
    tieBreak: string;
    reasonOrder: string[];
    rubric: { relevance: { instructions: string; criteria: string[] }; intent: { instructions: string; criteria: string[] } };
  };
  model: {
    version: string;
    frozen: boolean;
    freezeHash: string;
    policyHash: string;
    transportMode: string;
    maxCalls: number;
    admittedCalls: number;
    completedCalls: number;
    failedCalls: number;
    uncertainCalls: number;
    categories: Record<string, { limit: number; planned: number; admitted: number; remaining: number }>;
    usage: { inputTokens: number; outputTokens: number; unknownUsageCalls: number };
    organicAllowance: { limit: number; admitted: number; remaining: number };
  };
  freeze: { at: number; contentHash: string; campaignVersionsCreatedAt: Array<{ campaignId: string; campaignVersionId: string; at: number }> };
  dataset: {
    snapshotId: string;
    capturedAt: string;
    niche: string;
    manifestContentHash: string;
    catalogueContentHash: string;
    source: { readOnly: boolean; transaction: string; embeddingCalls: number; embeddingRevision: string };
    selection: { version: string; niches: string[]; promptPattern: string; limits: Record<string, number>; normalization: string };
    counts: { associations: number; normalizedPrompts: number; probes: number; creatives: number; hints: number; vectors: number; queryVectors: number; sources: Record<string, number> };
    omissions: Record<string, number>;
    hintTiers: Record<string, number>;
    limitations: string[];
  };
  campaigns: CampaignP[];
  publisher: {
    displayName: string;
    publisherId: string;
    legacyIdNote: string;
    publisherKeyId: string;
    publicKeyPEM: string;
    payee: string;
    slotId: string;
    floorBaseUnits: string;
  };
  opportunities: Opportunity[];
  evidence: { records: EvidenceRecord[]; hints: EvidenceHint[] };
  channels: Channel[];
  unfunded: Array<{ channelId: string; campaignId: string; status: string; depositBaseUnits: string }>;
  chainTxs: Array<{ slot: number; kind: "open" | "close"; channelId: string; campaignId: string; signature: string; blockTime: number; finality: string; explorerUrl?: string }>;
  fees: { networkFeeLamports: string; newRentLamports: string; reclaimedRentLamports: string; grossFeeAndRentLamports: string; capLamports: string };
  totals: { depositsBaseUnits: string; chargesBaseUnits: string; paidBaseUnits: string; refundedBaseUnits: string; aggregateChargeCapBaseUnits: string };
  events: RunEvent[];
  restart: {
    schemaVersion: string;
    runId: string;
    beforeHash: string;
    afterHash: string;
    newCalls: number;
    newCharges: number;
    newSignatures: number;
    newBroadcasts: number;
    duplicateReceipts: Array<{ chargeId: string; replayed: boolean }>;
    method: string;
    at: string;
  };
  limitations: { run: string[]; dataset: string[] };
}
