// Pure selectors over the build-time projection. Server Components import these; client islands get slices.
import data from "./run.public.json";
import meta from "./build-meta.json";
import type { CampaignP, Channel, Decision, EvidenceHint, EvidenceRecord, Opportunity, ProductRun } from "./types.ts";
import { formatBaseUnits } from "@axp/design-system/foundation";

export const run = data as unknown as ProductRun;
export const buildMeta = meta;


export function campaign(id: string): CampaignP {
  const c = run.campaigns.find((x) => x.campaignId === id);
  if (!c) throw new Error(`unknown campaign ${id}`);
  return c;
}
export function campaignBySlug(slug: string): CampaignP | undefined {
  return run.campaigns.find((x) => x.slug === slug);
}
export const nameOf = (id: string | null | undefined): string => (id ? campaign(id).businessName : "");

export function opportunity(n: number): Opportunity {
  const o = run.opportunities.find((x) => x.n === n);
  if (!o) throw new Error(`unknown opportunity ${n}`);
  return o;
}

export function decisionFor(o: Opportunity, campaignId: string, arm: "text_only" | "history"): Decision | undefined {
  return o.decisions.find((d) => d.campaignId === campaignId && d.arm === arm);
}

export function evidenceRecord(id: string): EvidenceRecord | undefined {
  return run.evidence.records.find((r) => r.id === id);
}
export function evidenceHint(id: string): EvidenceHint | undefined {
  return run.evidence.hints.find((h) => h.id === id);
}
export function channelFor(campaignId: string): Channel | undefined {
  return run.channels.find((c) => c.campaignId === campaignId);
}

export const usdc = (baseUnits: string | number) => formatBaseUnits(baseUnits);

/** Spine line per opportunity: who won, at what, or why nothing ran. */
export function outcomeLine(o: Opportunity): string {
  if (o.status === "no_fill") return "No fill, 0 calls";
  const w = nameOf(o.award!.campaignId);
  const cap = o.auction.notAdmitted.length ? ", cap" : "";
  return `${w} ${usdc(o.award!.priceBaseUnits)}${cap}`;
}

export const ARM_LABEL = { text_only: "Baseline", history: "With history" } as const;

const REASON_WORDS: Record<string, string> = {
  missing_constraint: "Missing a required capability",
  frequency_cap: "Frequency cap reached",
  policy_excluded: "Intent or destination not allowed",
  campaign_paused: "Campaign paused",
  channel_unavailable: "Payment channel unavailable",
  below_floor: "Below the floor price",
  budget_unavailable: "Budget unavailable",
  agent_skip: "Agent skipped",
};
export const reasonWords = (r: string) => REASON_WORDS[r] ?? r.replace(/_/g, " ");

const FLAG_WORDS: Record<string, string> = {
  association_not_fit_label: "An appearance is not a fit label",
  historical_cannot_add_campaign_capabilities: "History cannot add capabilities to a campaign",
  cached_exact_query: "This exact question was in the history",
  revision_unrecorded: "Embedding model revision not recorded",
  uncached_query: "This question was not in the history",
  lexical_not_vector_similarity: "Word overlap, not semantic similarity",
  inferred_not_observed: "Inferred, not observed",
  sparse_hint: "Sparse: few supporting creatives",
};
export const flagWords = (f: string) => FLAG_WORDS[f] ?? f.replace(/_/g, " ");

export function fmtUtc(ms: number): string {
  return new Date(ms).toISOString().slice(11, 19) + "Z";
}
export function fmtMs(ms: number): string {
  return `${Math.round(ms)} ms`;
}
export function fmtSeconds(ms: number): string {
  return `+${(ms / 1000).toFixed(1)} s`;
}
