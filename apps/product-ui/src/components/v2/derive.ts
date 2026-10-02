// Derived, display-ready views of the projection for Ledger v2 screens. Pure functions; every number from the run.
import { run, nameOf, usdc, channelFor } from "@/data/select";
import type { Opportunity } from "@/data/types";

export const SHORT: Record<string, string> = {
  cached: "Cheapest hardware wallet",
  offline: "Offline key storage",
  repeat: "Same question again",
  mobile: "Mobile-only wallets",
};
export const shortLabel = (o: Opportunity) => SHORT[o.scenarioId] ?? `Opportunity ${o.n}`;

export function outcomeTag(o: Opportunity): { label: string; tone: "brand" | "warning" | "outline" | "dashed" | undefined } {
  if (o.status === "no_fill") return { label: "No fill", tone: "dashed" };
  if (o.auction.notAdmitted.length) return { label: "Frequency cap", tone: "warning" };
  if (o.auction.tieBreakApplied) return { label: "Tie-break", tone: "brand" };
  return { label: "Filled", tone: "brand" };
}

export function auctionRow(o: Opportunity) {
  return {
    o,
    label: shortLabel(o),
    required: o.mandatoryCapabilities,
    eligible: o.eligibility.eligible.length,
    calls: o.decisions.length,
    bidders: o.auction.bids.length,
    winner: o.award ? nameOf(o.award.campaignId) : null,
    price: o.award ? usdc(o.award.priceBaseUnits) : null,
    tag: outcomeTag(o),
  };
}

export function campaignStats(campaignId: string) {
  const c = run.campaigns.find((x) => x.campaignId === campaignId)!;
  const opps = run.opportunities;
  const eligible = opps.filter((o) => o.eligibility.eligible.includes(campaignId)).length;
  const calls = opps.reduce((n, o) => n + o.decisions.filter((d) => d.campaignId === campaignId).length, 0);
  const bids = opps.reduce((n, o) => n + o.auction.bids.filter((b) => b.campaignId === campaignId).length, 0);
  const wins = opps.filter((o) => o.award?.campaignId === campaignId).length;
  const spend = opps.reduce((n, o) => n + (o.charge?.campaignId === campaignId ? Number(o.charge.amountBaseUnits) : 0), 0);
  const ch = channelFor(campaignId);
  return {
    c,
    eligible,
    calls,
    bids,
    wins,
    spend,
    cap: Number(c.budgetCapBaseUnits),
    deposit: ch ? Number(ch.depositBaseUnits) : 0,
    remaining: ch ? Number(ch.refundBaseUnits) : 0,
    funded: !!ch,
  };
}

const T = (ms: number) => ms;
export function activityLanes() {
  const ev = run.events;
  const pick = (types: string[]) => ev.filter((e) => types.includes(e.type));
  const title = (e: (typeof ev)[number]) => {
    const n = run.opportunities.find((o) => o.turnId === e.turnId)?.n;
    return `${e.type.replace(/_/g, " ")}${n ? `, opportunity ${n}` : ""} (event ${e.seq})`;
  };
  return [
    { key: "organic", label: "Organic answers", marks: pick(["v3_organic_completed"]).map((e) => ({ t: T(e.at), title: title(e) })) },
    { key: "opps", label: "Opportunities", marks: pick(["opportunity_created"]).map((e) => ({ t: e.at, title: title(e), tone: "ink" as const })) },
    { key: "decisions", label: "Bids admitted", marks: pick(["buyer_decision"]).map((e) => ({ t: e.at, title: title(e), tone: "ink" as const })) },
    { key: "awards", label: "Winners picked", marks: pick(["award_reserved"]).map((e) => ({ t: e.at, title: title(e), tone: "ink" as const })) },
    { key: "charges", label: "Paid deliveries", marks: pick(["charge_accepted"]).map((e) => ({ t: e.at, title: title(e), tone: "brand" as const })) },
  ];
}
/** Busy windows on the exchange clock. A gap of 10 minutes or more between events is drawn as an axis break. */
export function activitySegments() {
  const ts = run.events.filter((e) => e.type !== "channel_configuration_registered" && e.type !== "campaign_created" && e.type !== "v3_run_frozen").map((e) => e.at).sort((x, y) => x - y);
  const pad = 20_000;
  const out: Array<{ from: number; to: number }> = [];
  let start = ts[0];
  for (let i = 1; i < ts.length; i++)
    if (ts[i] - ts[i - 1] >= 10 * 60_000) {
      out.push({ from: start - pad, to: ts[i - 1] + pad });
      start = ts[i];
    }
  out.push({ from: start - pad, to: ts[ts.length - 1] + pad });
  return out.slice(0, 3);
}
/** The idle gap label ("70 min"), or undefined when the run had no break. */
export function activityGapLabel(): string | undefined {
  const seg = activitySegments();
  if (seg.length < 2) return undefined;
  return `${Math.round((seg[1].from - seg[0].to) / 60_000)} min`;
}
export const hhmm = (ms: number) => new Date(ms).toISOString().slice(11, 16) + " UTC";
export const hhmmss = (ms: number) => new Date(ms).toISOString().slice(11, 19);
export const u = (x: number | string) => usdc(x);
