// Present mode beats: data only (no React), so scripts/beats-to-srt.mjs can read the same captions.
// Every caption and every conditional title is computed from the run through src/lib/narrative.ts, so a different run
// (the live Devnet run, or the perturbed fixture) gets different, still-true sentences.
import type { ProductRun } from "../data/types.ts";
import { DISCLAIMER, list, makeStory, numWord } from "../lib/narrative.ts";
import { expectedCheckCount } from "../lib/verify.ts";

export type Beat = {
  id: string;
  n: number;
  title: string | ((run: ProductRun) => string);
  /** Number of reveal steps inside the beat (1 = static). Later steps arrive about 3 s apart in autoplay. */
  steps: number;
  durationMs: number;
  exploreHref: string | ((run: ProductRun) => string);
  caption: (run: ProductRun, x?: BeatExtra) => string;
};
/** Facts from outside run.public.json, such as whether the Devnet re-settlement file exists. */
export type BeatExtra = { devnet?: boolean };

const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const BEATS: Beat[] = [
  {
    id: "problem",
    n: 1,
    title: "People ask AI apps what to buy",
    steps: 1,
    durationMs: 15000,
    exploreHref: "/",
    caption: () => "People ask AI apps what to buy. Advertisers want to be in that moment, but there is no honest, disclosed way to be there.",
  },
  {
    id: "chat",
    n: 2,
    title: "A question in an AI app",
    steps: 2,
    durationMs: 15000,
    exploreHref: (r) => `/opportunity/${makeStory(r).picks().paid?.n ?? 1}/`,
    caption: (r) => {
      const p = makeStory(r).picks().paid;
      return p
        ? `A question is asked in an AI app. The answer is the app's own. The card below it is labelled Sponsored, and it is paid through a Solana payment channel only after the app signs that it inserted it.`
        : "A question is asked in an AI app. The answer is the app's own; no card was placed in this run.";
    },
  },
  {
    id: "run",
    n: 3,
    title: (r) => `One ${r.network.kind === "devnet" ? "live" : "recorded"} run, ${numWord(r.campaigns.length)} fictional advertisers`,
    steps: 1,
    durationMs: 22000,
    exploreHref: "/",
    caption: (r) => {
      const s = makeStory(r);
      const funded = r.campaigns.filter((c) => c.funded);
      const unfunded = r.campaigns.filter((c) => !c.funded);
      const deps = Array.from(new Set(funded.map((c) => c.depositBaseUnits)));
      return `The saved record of one run: ${r.counts.opportunities} questions, ${r.counts.decisions} agent decisions, ${r.counts.auctions} auctions, ${r.counts.receipts} signed deliveries. ${cap1(list(funded.map((c) => c.businessName)))} funded ${deps.length === 1 ? `${s.usdc(deps[0])} USDC each` : "their channels"}${unfunded.length ? `; ${list(unfunded.map((c) => c.businessName))} ${unfunded.length === 1 ? "is" : "are"} unfunded` : ""}.`;
    },
  },
  {
    id: "evidence",
    n: 4,
    title: "What the agents were shown",
    steps: 1,
    durationMs: 22000,
    exploreHref: (r) => `/opportunity/${makeStory(r).picks().ev?.n ?? 1}/#evidence`,
    caption: (r) => {
      const { evMain } = makeStory(r).picks();
      const ex = evMain?.retrieval?.examples[0];
      const rec = ex ? r.evidence.records.find((x) => x.id === ex.id) : undefined;
      if (evMain?.retrieval?.method === "vector" && ex?.similarity === 1 && rec) return `ContextHint had seen this exact question before, next to an ad from ${rec.advertiser}. Agents get that history as evidence. Real brands are past observations, not bidders.`;
      return "Each agent gets ContextHint history: past prompts close to this one and the ads seen beside them. Real brands are past observations, not bidders.";
    },
  },
  {
    id: "decisions",
    n: 5,
    title: "What the agents decided",
    steps: 1,
    durationMs: 25000,
    exploreHref: (r) => `/opportunity/${makeStory(r).picks().hist?.o.n ?? 1}/#decisions`,
    caption: (r) => {
      const s = makeStory(r);
      const h = s.picks().hist;
      if (!h || !h.e) return "Decided with Jev, a judgment model: each agent rated relevance and intent; the model never names a price.";
      const name = s.nameOf(h.campaignId);
      if (h.e.changed && h.e.bidChanged) return `Decided with Jev. Without history ${name} would have bid ${s.usdc(h.e.bidB)} USDC; with ContextHint history its ${h.e.which} ${h.e.rose ? "rose" : "changed"} from level ${h.e.lb} to ${h.e.lh}, so it bid ${s.usdc(h.e.bidH)}. ${DISCLAIMER}`;
      if (h.e.changed) return `Decided with Jev. With ContextHint history ${name}'s ${h.e.which} moved from level ${h.e.lb} to ${h.e.lh}, but its bid stayed ${s.usdc(h.e.bidH)} USDC. ${DISCLAIMER}`;
      return `Decided with Jev. History moved ${name}'s scores but no level changed, so the bid stayed ${s.usdc(h.e.bidH)} USDC. ${DISCLAIMER}`;
    },
  },
  {
    id: "auction",
    n: 6,
    title: "Code sets the price",
    steps: 1,
    durationMs: 25000,
    exploreHref: (r) => `/opportunity/${makeStory(r).picks().auction?.n ?? 1}/#auction`,
    caption: (r) => {
      const s = makeStory(r);
      const o = s.picks().auction;
      return o ? `Code, not the model, turns levels into a bid from a fixed table. ${s.auctionSentence(o)}` : "Code, not the model, turns levels into a bid from a fixed table. No auction ran in this run.";
    },
  },
  {
    id: "charge",
    n: 7,
    title: "Award, receipt, charge",
    steps: 3,
    durationMs: 25000,
    exploreHref: (r) => `/opportunity/${makeStory(r).picks().paid?.n ?? 1}/#receipt`,
    caption: (r) => {
      const s = makeStory(r);
      const p = s.picks().paid;
      return p ? `An award is not a charge. The app inserts the labelled card and signs a receipt; only then is ${s.usdc(p.charge!.amountBaseUnits)} USDC charged. These checks run in your browser when you open Verify.` : "Nothing was awarded in this run, so nothing was charged.";
    },
  },
  {
    id: "cap",
    n: 8,
    title: (r) => {
      const { cap, nofill } = makeStory(r).picks();
      return cap && nofill ? "A cap and a no-fill" : cap ? "A cap kept a bidder out" : nofill ? "A question with no fill" : "Rules applied to every question";
    },
    steps: 1,
    durationMs: 22000,
    exploreHref: (r) => {
      const { cap, nofill } = makeStory(r).picks();
      return `/opportunity/${cap?.o.n ?? nofill?.n ?? 1}/`;
    },
    caption: (r) => {
      const s = makeStory(r);
      const { cap, nofill } = s.picks();
      const parts: string[] = [];
      if (cap) parts.push(`${s.earlierSameQuestion(cap.o) ? "Asked again, " : ""}${s.nameOf(cap.x.campaignId)}'s agent said bid, but the frequency cap kept it out: a rule, not the agent.${cap.o.award ? ` ${s.nameOf(cap.o.award.campaignId)} won at ${s.usdc(cap.o.award.priceBaseUnits)} USDC.` : ""}`);
      if (nofill) parts.push(nofill.decisions.length ? "One question drew no bid: no ad, and the answer still served." : "One question matched no campaign: zero agent calls, no ad, and the answer still served.");
      if (!parts.length) parts.push("No cap was reached and every question filled; eligibility, the floor and the bid table applied to each one.");
      return parts.join(" ");
    },
  },
  {
    id: "settlement",
    n: 9,
    title: "Why Solana: paid once per channel",
    steps: 1,
    durationMs: 30000,
    exploreHref: "/settlement/",
    caption: (r, x) => {
      const s = makeStory(r);
      const cv = r.channels.slice().sort((a, b) => b.vouchers.length - a.vouchers.length)[0];
      const vs = cv ? cv.vouchers.map((v) => s.usdc(v.cumulativeAmountBaseUnits)) : [];
      const live = r.network.kind === "devnet";
      return `Small ads only work if each delivery is not its own transaction. Vouchers accumulate off-chain${vs.length > 1 ? `, ${vs.join(" then ")} in total` : ""}, and one close per channel pays ${s.usdc(r.totals.paidBaseUnits)} USDC in total on ${live ? "Solana Devnet" : "a hosted Solana sandbox"}${!live && x?.devnet ? "; the same receipts were then re-settled on Solana Devnet, linked on Settlement" : ""}.`;
    },
  },
  {
    id: "verify",
    n: 10,
    title: "Check it yourself",
    steps: 1,
    durationMs: 25000,
    exploreHref: "/verify/",
    caption: (r) =>
      `Verify recomputes ${expectedCheckCount(r)} checks in your browser; change one byte of a receipt and two of them fail. Restarted with models off: ${r.restart.newCalls === 0 ? "zero" : r.restart.newCalls} new calls, charges or signatures. Not mainnet, not attention, not targeting lift.`, // claim-ok: negation
  },
  {
    id: "claim",
    n: 11,
    title: "What the run shows",
    steps: 1,
    durationMs: 14000,
    exploreHref: "/verify/",
    caption: () => "Open Verify on this site and check every number yourself.",
  },
];

export const TOTAL_MS = BEATS.reduce((n, b) => n + b.durationMs, 0);
