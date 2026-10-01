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
  caption: (run: ProductRun) => string;
};

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
    id: "chat",
    n: 1,
    title: "A question in an AI app",
    steps: 2,
    durationMs: 15000,
    exploreHref: "/opportunity/1/",
    caption: () => "Someone asks an AI app for a cheap hardware wallet. The answer is independent. The card below it is paid, and labelled.",
  },
  {
    id: "numbers",
    n: 2,
    title: "One recorded run",
    steps: 1,
    durationMs: 20000,
    exploreHref: "/",
    caption: (r) =>
      `This is the saved record of one run: ${r.counts.opportunities} questions, ${r.counts.decisions} agent decisions, ${r.counts.auctions} auctions, ${r.counts.noFill} no-fill, ${r.counts.receipts} signed deliveries. Hosted Solana sandbox, test USDC.`,
  },
  {
    id: "advertisers",
    n: 3,
    title: "Three fictional advertisers",
    steps: 1,
    durationMs: 20000,
    exploreHref: "/advertisers/",
    caption: (r) => `Three fictional advertisers. Two hardware wallets funded ${u(r.channels[0].depositBaseUnits)} USDC each. LeatherGuard sells RFID-blocking wallets and is unfunded.`,
  },
  {
    id: "evidence",
    n: 4,
    title: "What the agents were shown",
    steps: 2,
    durationMs: 25000,
    exploreHref: "/opportunity/1/#evidence",
    caption: () => "ContextHint had seen this exact question before, next to a hardware-wallet listing. Agents get that history as evidence. Real brands are past observations, not bidders.",
  },
  {
    id: "decisions",
    n: 5,
    title: "What the agents decided",
    steps: 2,
    durationMs: 30000,
    exploreHref: "/opportunity/1/#decisions",
    caption: (r) => {
      const b = hist(r, 1, "v3-clearvault", "text_only");
      const h = hist(r, 1, "v3-clearvault", "history");
      const ob = hist(r, 2, "v3-clearvault", "text_only");
      return `With history, intent edged from ${two(b.scores.intent)} to ${two(h.scores.intent)}, crossing a rounding line: level ${b.commercialIntentLevel} to ${h.commercialIntentLevel}. On the offline question both arms stayed at level ${ob.commercialIntentLevel}: unchanged. LeatherGuard's agent said no fit.`;
    },
  },
  {
    id: "auction",
    n: 6,
    title: "Code sets the price",
    steps: 2,
    durationMs: 25000,
    exploreHref: "/opportunity/1/#auction",
    caption: (r) => {
      const o = r.opportunities[0];
      return `Code, not the model, sets the bid: 100% of the ${u(r.policy.maxBidBaseUnits)} USDC max at levels 3 and 3. Both wallets got the same ratings, so a published tie rule decides: the lower campaign ID. ${o.award ? "ClearVault" : ""} wins.`;
    },
  },
  {
    id: "charge",
    n: 7,
    title: "Award, receipt, charge",
    steps: 3,
    durationMs: 25000,
    exploreHref: "/opportunity/1/#receipt",
    caption: (r) => `An award is not a charge. The app inserts the labelled card, signs a receipt, and only then is ${u(r.opportunities[0].charge!.amountBaseUnits)} USDC charged. These checks run in your browser.`,
  },
  {
    id: "cap",
    n: 8,
    title: "A cap and a no-fill",
    steps: 2,
    durationMs: 25000,
    exploreHref: "/opportunity/3/",
    caption: (r) =>
      `Asked again, ClearVault hits its frequency cap: a rule, not the agent. KeyForge wins at ${u(r.opportunities[2].award!.priceBaseUnits)} USDC. A mobile-only request matched no one: zero calls, no ad, the answer still served.`,
  },
  {
    id: "settlement",
    n: 9,
    title: "Settled once per channel",
    steps: 2,
    durationMs: 30000,
    exploreHref: "/settlement/",
    caption: (r) => {
      const cv = r.channels[0];
      return `Vouchers accumulate: ${u(cv.vouchers[0].cumulativeAmountBaseUnits)}, then ${u(cv.vouchers[1].cumulativeAmountBaseUnits)} in total. One close each on the Solana sandbox: ${u(r.totals.paidBaseUnits)} USDC to the publisher, ${u(r.totals.refundedBaseUnits)} refunded. Fees in lamports, kept separate.`;
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
      `Restarted with models off: ${r.restart.newCalls === 0 ? "zero" : r.restart.newCalls} new calls, charges or signatures. Not mainnet, not attention, not targeting lift. Explore every hash yourself.`, // claim-ok: negation
  },
];

export const TOTAL_MS = BEATS.reduce((n, b) => n + b.durationMs, 0);
