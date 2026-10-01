// Present mode beats: data only (no React), so scripts/beats-to-srt.mjs can read the same captions.
// Captions are computed from the projection; every number comes from the run.
import type { ProductRun } from "../data/types.ts";

export type Beat = {
  id: string;
  n: number;
  title: string;
  /** Number of reveal steps inside the beat (1 = static). */
  steps: number;
  durationMs: number;
  exploreHref: string;
  caption: (run: ProductRun, x?: BeatExtra) => string;
};
/** Facts from outside run.public.json, such as whether the Devnet re-settlement file exists. */
export type BeatExtra = { devnet?: boolean };

const u = (b: string | number) => {
  const s = String(b).padStart(7, "0");
  const whole = s.slice(0, -6).replace(/^0+(?=\d)/, "");
  let frac = s.slice(-6).replace(/0+$/, "");
  if (frac.length < 3) frac = frac.padEnd(3, "0");
  return `${whole}.${frac}`;
};
const two = (n: number) => n.toFixed(2);

function hist(run: ProductRun, n: number, campaignId: string, arm: "text_only" | "history") {
  const o = run.opportunities.find((x) => x.n === n)!;
  return o.decisions.find((d) => d.campaignId === campaignId && d.arm === arm)!;
}

export const BEATS: Beat[] = [
  {
    id: "problem",
    n: 1,
    title: "People ask AI apps what to buy",
    steps: 2,
    durationMs: 15000,
    exploreHref: "/",
    caption: () => "People ask AI apps what to buy. Advertisers want to be in that moment, but there is no honest, disclosed way to be there. This is one recorded run of an exchange built for it.",
  },
  {
    id: "chat",
    n: 2,
    title: "A question in an AI app",
    steps: 2,
    durationMs: 15000,
    exploreHref: "/opportunity/1/",
    caption: () => "A question is asked in an AI app: the cheapest hardware wallet. The answer is the app's own. The card below it is paid, and labelled Sponsored.",
  },
  {
    id: "run",
    n: 3,
    title: "One recorded run, three fictional advertisers",
    steps: 2,
    durationMs: 22000,
    exploreHref: "/",
    caption: (r) =>
      `The saved record of one run: ${r.counts.opportunities} questions, ${r.counts.decisions} agent decisions, ${r.counts.auctions} auctions, ${r.counts.receipts} signed deliveries. Two fictional hardware wallets funded ${u(r.channels[0].depositBaseUnits)} USDC each; LeatherGuard sells RFID-blocking wallets and is unfunded.`,
  },
  {
    id: "evidence",
    n: 4,
    title: "What the agents were shown",
    steps: 2,
    durationMs: 22000,
    exploreHref: "/opportunity/1/#evidence",
    caption: () => "ContextHint had seen this exact question before, next to a hardware-wallet listing. Agents get that history as evidence. Real brands are past observations, not bidders.",
  },
  {
    id: "decisions",
    n: 5,
    title: "What the agents decided",
    steps: 2,
    durationMs: 25000,
    exploreHref: "/opportunity/1/#decisions",
    caption: (r) => {
      const b = hist(r, 1, "v3-clearvault", "text_only");
      const h = hist(r, 1, "v3-clearvault", "history");
      const ob = hist(r, 2, "v3-clearvault", "text_only");
      return `Decided with Jev. With history, intent edged from ${two(b.scores.intent)} to ${two(h.scores.intent)}, crossing a rounding line: level ${b.commercialIntentLevel} to ${h.commercialIntentLevel}. On the offline question it stayed at level ${ob.commercialIntentLevel}. LeatherGuard's agent said no fit.`;
    },
  },
  {
    id: "auction",
    n: 6,
    title: "Code sets the price",
    steps: 2,
    durationMs: 25000,
    exploreHref: "/opportunity/1/#auction",
    caption: (r) =>
      `Code, not the model, sets the bid: 100% of the ${u(r.policy.maxBidBaseUnits)} USDC max at relevance 3 and intent 3. Both wallets got the same ratings, so a tie rule fixed in the exchange code decides: the lower campaign ID. ClearVault wins.`,
  },
  {
    id: "charge",
    n: 7,
    title: "Award, receipt, charge",
    steps: 3,
    durationMs: 25000,
    exploreHref: "/opportunity/1/#receipt",
    caption: (r) => `An award is not a charge. The app inserts the labelled card and signs a receipt; only then is ${u(r.opportunities[0].charge!.amountBaseUnits)} USDC charged. These checks run in your browser when you open Verify.`,
  },
  {
    id: "cap",
    n: 8,
    title: "A cap and a no-fill",
    steps: 2,
    durationMs: 22000,
    exploreHref: "/opportunity/3/",
    caption: (r) =>
      `Asked again, ClearVault's agent said bid, but the frequency cap kept it out: a rule, not the agent. KeyForge wins at ${u(r.opportunities[2].award!.priceBaseUnits)} USDC. A mobile-only request matched no one: zero calls, no ad, the answer still served.`,
  },
  {
    id: "settlement",
    n: 9,
    title: "Why Solana: paid once per channel",
    steps: 2,
    durationMs: 30000,
    exploreHref: "/settlement/",
    caption: (r, x) => {
      const cv = r.channels[0];
      return `A ${u(r.opportunities[1].charge!.amountBaseUnits)} USDC ad only works if each delivery is not its own transaction. Vouchers accumulate off-chain, ${u(cv.vouchers[0].cumulativeAmountBaseUnits)} then ${u(cv.vouchers[1].cumulativeAmountBaseUnits)} in total, and one close per channel pays ${u(r.totals.paidBaseUnits)} USDC in total on a hosted Solana sandbox${x?.devnet ? "; the same receipts were then re-settled on Solana Devnet, linked on Settlement" : ""}.`;
    },
  },
  {
    id: "verify",
    n: 10,
    title: "Check it yourself",
    steps: 2,
    durationMs: 25000,
    exploreHref: "/verify/",
    caption: (r) =>
      `Verify recomputes 48 checks in your browser; change one byte of a receipt and two of them fail. Restarted with models off: ${r.restart.newCalls === 0 ? "zero" : r.restart.newCalls} new calls, charges or signatures. Not mainnet, not attention, not targeting lift.`, // claim-ok: negation
  },
  {
    id: "claim",
    n: 11,
    title: "What the run shows",
    steps: 1,
    durationMs: 14000,
    exploreHref: "/",
    caption: () => "Disclosed. Decided in code. Paid on delivery.",
  },
];

export const TOTAL_MS = BEATS.reduce((n, b) => n + b.durationMs, 0);
