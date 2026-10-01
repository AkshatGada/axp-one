// Exchange policy, ported line for line from the recorded run's code so the explorer can show and re-check it:
//   computeBid  <- packages/contracts/index.mjs computeBid (fit_intent_bid_v1)
//   reason      <- packages/exchange/index.mjs Exchange.reason (rule order preserved)
//   rankBids    <- packages/exchange/index.mjs runAuction sort (amount desc, campaignId localeCompare asc)
//   validateDraft <- packages/v3/service.mjs saveCampaign limits
// Parity is tested in scripts/policy.test.mjs against the original modules.

export const BID_POLICY_VERSION = "fit_intent_bid_v1";

export const CAPABILITIES = [
  "crypto_storage",
  "hardware_wallet",
  "offline_key_storage",
  "mobile_software_wallet",
  "ethereum",
  "solana",
  "physical_wallet",
  "rfid_blocking",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

/** Basis points of maxBid by "relevance:intent" level pair. Anything else is below threshold. */
export const BID_TABLE: ReadonlyArray<{ levels: string; relevance: number; intent: number; bps: number }> = [
  { levels: "2:2", relevance: 2, intent: 2, bps: 5000 },
  { levels: "2:3", relevance: 2, intent: 3, bps: 7500 },
  { levels: "3:2", relevance: 3, intent: 2, bps: 7500 },
  { levels: "3:3", relevance: 3, intent: 3, bps: 10000 },
];

export type AgentDecision = { decision: "bid" | "skip" | "abstain"; relevanceLevel: number | null; commercialIntentLevel: number | null };

export type BidResult =
  | { status: "bid"; amountBaseUnits: string; bidPolicyVersion: string; bps: number }
  | { status: "no_bid"; reason: "agent_skip" | "agent_abstain" | "below_threshold" | "budget_unavailable" | "below_floor"; bps?: number };

function units(value: string): bigint {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) throw new Error("invalid_amount");
  const n = BigInt(value);
  if (n > (BigInt(1) << BigInt(64)) - BigInt(1)) throw new Error("amount_overflow");
  return n;
}

export function bpsFor(relevanceLevel: number | null, intentLevel: number | null): number | null {
  const row = BID_TABLE.find((r) => r.relevance === relevanceLevel && r.intent === intentLevel);
  return row ? row.bps : null;
}

export function computeBid(
  d: AgentDecision,
  c: { maxBidBaseUnits: string },
  availableCampaign: string,
  availableChannel: string,
  floor: string,
): BidResult {
  if (d.decision !== "bid") return { status: "no_bid", reason: d.decision === "skip" ? "agent_skip" : "agent_abstain" };
  const bps = bpsFor(d.relevanceLevel, d.commercialIntentLevel);
  if (!bps) return { status: "no_bid", reason: "below_threshold" };
  let amount = (units(c.maxBidBaseUnits) * BigInt(bps)) / BigInt(10000);
  for (const v of [availableCampaign, availableChannel]) {
    const n = units(v);
    if (n < amount) amount = n;
  }
  if (amount === BigInt(0)) return { status: "no_bid", reason: "budget_unavailable", bps };
  if (amount < units(floor)) return { status: "no_bid", reason: "below_floor", bps };
  return { status: "bid", amountBaseUnits: amount.toString(), bidPolicyVersion: BID_POLICY_VERSION, bps };
}

export type ExclusionReason =
  | "campaign_paused"
  | "policy_excluded"
  | "missing_constraint"
  | "channel_unavailable"
  | "below_floor"
  | "frequency_cap"
  | "budget_unavailable";

export type PolicyCampaign = {
  campaignId: string;
  status: string;
  allowedIntents: string[];
  destination: string;
  declaredConstraints: string[];
  maxBidBaseUnits: string;
};
export type PolicyOpportunity = {
  coarseIntent: string;
  destination: string;
  taskConstraints: string[];
  floorBaseUnits: string;
  publisherId: string;
};
export type PolicyContext = {
  channel: { publisherId: string; status: string };
  /** Awards (reserved or delivered) already held by this campaign in this session. */
  sessionAwards: number;
  available: { campaign: string; channel: string };
  ignoreFunding?: boolean;
  frequencyCap?: number;
};

export function missingCapabilities(taskConstraints: string[], declared: string[]): string[] {
  return taskConstraints.filter((k) => !declared.includes(k));
}

export function reason(c: PolicyCampaign, o: PolicyOpportunity, ctx: PolicyContext): ExclusionReason | null {
  if (c.status !== "active") return "campaign_paused";
  if (!c.allowedIntents.includes(o.coarseIntent) || c.destination !== o.destination) return "policy_excluded";
  if (o.taskConstraints.some((k) => !c.declaredConstraints.includes(k))) return "missing_constraint";
  if (ctx.channel.publisherId !== o.publisherId || (!ctx.ignoreFunding && ctx.channel.status !== "open")) return "channel_unavailable";
  if (units(c.maxBidBaseUnits) < units(o.floorBaseUnits)) return "below_floor";
  if (ctx.sessionAwards >= (ctx.frequencyCap ?? 2)) return "frequency_cap";
  if (units(ctx.available.campaign) < units(o.floorBaseUnits) || (!ctx.ignoreFunding && units(ctx.available.channel) < units(o.floorBaseUnits)))
    return "budget_unavailable";
  return null;
}

export type RankedBid = { campaignId: string; amountBaseUnits: string };

/** The auction order: highest amount first; equal amounts by campaign ID ascending. */
export function rankBids<T extends RankedBid>(bids: T[]): { ranked: T[]; tieBreakApplied: boolean } {
  let tie = false;
  const ranked = [...bids].sort((a, b) => {
    const x = units(a.amountBaseUnits);
    const y = units(b.amountBaseUnits);
    if (x === y) {
      tie = true;
      return a.campaignId.localeCompare(b.campaignId);
    }
    return x > y ? -1 : 1;
  });
  return { ranked, tieBreakApplied: tie };
}

/** First-price sealed auction over admitted decisions. Mirrors Exchange.runAuction without persistence. */
export function runAuction(
  o: PolicyOpportunity,
  entries: Array<{ campaign: PolicyCampaign; decision: AgentDecision | null; ctx: PolicyContext }>,
): {
  bids: Array<RankedBid & { bps: number }>;
  rejections: Array<{ campaignId: string; reason: string }>;
  winnerCampaignId: string | null;
  tieBreakApplied: boolean;
} {
  const rejections: Array<{ campaignId: string; reason: string }> = [];
  const bids: Array<RankedBid & { bps: number }> = [];
  for (const e of entries) {
    const r = reason(e.campaign, o, e.ctx);
    if (r) {
      rejections.push({ campaignId: e.campaign.campaignId, reason: r });
      continue;
    }
    if (!e.decision) continue;
    const bid = computeBid(e.decision, e.campaign, e.ctx.available.campaign, e.ctx.available.channel, o.floorBaseUnits);
    if (bid.status !== "bid") {
      rejections.push({ campaignId: e.campaign.campaignId, reason: bid.reason });
      continue;
    }
    bids.push({ campaignId: e.campaign.campaignId, amountBaseUnits: bid.amountBaseUnits, bps: bid.bps });
  }
  const { ranked, tieBreakApplied } = rankBids(bids);
  return { bids: ranked, rejections, winnerCampaignId: ranked[0]?.campaignId ?? null, tieBreakApplied };
}

// ---------- Draft limits (packages/v3/service.mjs saveCampaign) ----------
export const DRAFT_LIMITS = {
  businessName: 400,
  creative: 800,
  contextHints: 400,
  packet: 1200,
  packetOverhead: 34,
  maxBidBaseUnits: 4000,
  budgetCapBaseUnits: 8000,
} as const;
export const EMAIL_PATTERN = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu;

export type DraftInput = {
  businessName: string;
  creative: string;
  contextHints: string;
  maxBidBaseUnits: string;
  budgetCapBaseUnits: string;
  declaredConstraints: string[];
};

export type DraftError = { field: keyof DraftInput | "packet"; code: string; message: string };

export function validateDraft(d: DraftInput): DraftError[] {
  const errors: DraftError[] = [];
  const text: Array<["businessName" | "creative" | "contextHints", number]> = [
    ["businessName", DRAFT_LIMITS.businessName],
    ["creative", DRAFT_LIMITS.creative],
    ["contextHints", DRAFT_LIMITS.contextHints],
  ];
  for (const [k, max] of text) {
    const v = d[k];
    if (typeof v !== "string" || !v.trim()) errors.push({ field: k, code: "draft_invalid", message: "Required." });
    else if (v.length > max) errors.push({ field: k, code: "draft_invalid", message: `At most ${max} characters.` });
    else if (EMAIL_PATTERN.test(v)) errors.push({ field: k, code: "draft_invalid", message: "Email addresses are not allowed." });
  }
  for (const [k, max] of [
    ["maxBidBaseUnits", DRAFT_LIMITS.maxBidBaseUnits],
    ["budgetCapBaseUnits", DRAFT_LIMITS.budgetCapBaseUnits],
  ] as const) {
    const v = d[k];
    if (!/^(0|[1-9][0-9]*)$/.test(v)) errors.push({ field: k, code: "invalid_amount", message: "Whole base units only." });
    else if (BigInt(v) > BigInt(max)) errors.push({ field: k, code: "spend_cap", message: `At most ${max} base units.` });
  }
  const caps = d.declaredConstraints;
  if (caps.some((x) => !(CAPABILITIES as readonly string[]).includes(x)) || new Set(caps).size !== caps.length)
    errors.push({ field: "declaredConstraints", code: "capability_invalid", message: "Unknown or repeated capability." });
  if ((d.creative?.length ?? 0) + (d.contextHints?.length ?? 0) + DRAFT_LIMITS.packetOverhead > DRAFT_LIMITS.packet)
    errors.push({ field: "packet", code: "packet_too_large", message: "Creative plus hints plus 34 must stay within 1,200 characters." });
  return errors;
}
