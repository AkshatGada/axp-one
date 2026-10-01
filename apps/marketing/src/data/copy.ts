// All landing copy, in one place so scripts/lint-copy.mjs can scan it.
// Rules: no em or en dashes; no internal details (IDs, hashes, policy names, model versions,
// level shorthands, base units); no exact ContextHint library counts (scale words only: the exact
// figures live on contexthint.com and in the MVP); no partnership, enrollment, lift, attention,
// conversion, mainnet or x402 claims. A line that states a negation or a limit carries a claim-ok
// comment. Run numbers come from run.ts.
import { JEV, LIBRARY, TRACTION } from "./library";
import { CACHED, CV, CV_CHANNEL, DEVNET, JEV_EXAMPLE, KF, LG, RUN, lower, policyBid, usdc, word } from "./run";

const bid = usdc(CACHED.bids[0]!.amount);
const cvVouchers = CV_CHANNEL.vouchers;

/** The MVP: the product-ui dev server in development, /mvp/ in the merged static build. */
export const MVP_URL = process.env.NEXT_PUBLIC_MVP_URL || (process.env.NODE_ENV === "development" ? "http://localhost:3420/" : "/mvp/");
const mvp = (path: string) => `${MVP_URL.replace(/\/$/, "")}${path}`;
export const MVP_VERIFY_URL = mvp("/verify/");
export const VIDEO_ANCHOR = "#video";
export const CH_URL = LIBRARY.url;
export const SOLANA_URL = "https://solana.com";
/** The ClearVault channel's close on Solana Devnet: the transaction that paid the AI app. */
export const DEVNET_URL = DEVNET?.channels[0]?.closeUrl ?? null;

export const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#data", label: "ContextHint" },
  { href: "#solana", label: "Solana" },
  { href: "#mvp", label: "The MVP" },
  { href: "#proof", label: "Proof" },
];

export const HEADER = { chip: "Hackathon MVP", cta: "See the MVP" };

export const HERO = {
  h1: "The advertising exchange for the agentic internet.",
  accent: "agentic internet.",
  lede: "Advertiser agents bid for a disclosed place beside the answer in AI apps. Code decides who wins and what it costs. Publishers are paid in stablecoins for each card they deliver.",
  primary: "See the working MVP",
  video: "Watch the four minute video",
  badge: "Built on ContextHint's ad intelligence",
  badgeLine: TRACTION.line,
  status: "Recorded on a hosted Solana sandbox with test USDC.",
  devnet: "Settled on Solana Devnet, view on Explorer",
  frameCaption: "A real question from our recorded run, with an excerpt of the answer. The answer was written without any ad in view, and the card was sold at auction.",
  appName: "Our demo AI app",
  answerLabel: "Answer, excerpt",
  pullBack: "Behind one Sponsored card, a whole exchange.",
  callouts: {
    answer: { title: "The answer.", body: "Written by an assistant that never saw an ad." },
    card: { title: "The card.", body: "Labelled Sponsored and kept apart from the answer." },
    auction: { title: "The auction.", body: `${word(CACHED.bids.length)} bids of ${bid} USDC tied. A fixed rule, decided in code, broke the tie.` },
    agents: { title: "The agents.", body: "Each judged the moment with Jev, using its own campaign only. One was ruled out in code; asked anyway, its agent said skip." },
    evidence: { title: "The evidence.", body: "A real recorded prompt, the ad shown beside it and the audience it implies. From ContextHint." },
    payment: { title: "The payment.", body: "Charged only on a signed receipt. Settled in one close on Solana." },
  },
  stackCaption: "Values from one recorded run.",
  brandNote: "Observed historical reference, not an axp.one advertiser.",
};

/** The three pillars, once, right after the hero. Each in its own colour; plain text, no logos. */
export const PILLARS = {
  why: "People now decide inside AI apps. axp.one puts a disclosed ad beside the answer, on three pillars.",
  items: [
    { key: "ch", name: "ContextHint", lead: "The data.", line: "Real ads and prompts recorded inside ChatGPT, so every agent bids on evidence.", href: LIBRARY.url, link: "contexthint.com" },
    { key: "jev", name: "Jev", lead: "The judgment.", line: "Each advertiser's agent judges the moment with Jev: relevance, buying intent, the right creative.", href: JEV.url, link: "docs.typesafe.ai" },
    { key: "sol", name: "Solana", lead: "The money.", line: "Payment channels on Solana: one close pays the AI app for every delivered card.", href: SOLANA_URL, link: "solana.com" },
  ],
};

export const STAGE = {
  label: "How it works",
  h2: "What happens between the question and the card?",
  lede: "One real moment from our run, step by step.",
  source: "Values from our recorded run.",
  skip: "Skip the walkthrough",
  dataLink: "See the ContextHint data",
  beats: [
    {
      title: "The app offers a moment.",
      body: "The AI app sends the question and what a product must be able to do. Here: store crypto.",
      facts: [`Question: ${CACHED.question}`, "Must be able to store crypto"],
    },
    {
      title: "Eligibility is decided in code.",
      body: `A campaign without a required capability cannot enter the auction, whatever it would pay. ${LG.name} sells a physical card wallet. It was ruled out.`,
      facts: [`${CV.name}: eligible`, `${KF.name}: eligible`, `${LG.name}: ruled out`],
    },
    {
      title: "Each agent gets its own evidence, from ContextHint.",
      body: "ContextHint supplies a real recorded prompt, the ad shown beside it and an inferred audience, for one advertiser at a time. No rival bids, budgets or wallets.",
      facts: ["One real example per agent", "One inferred audience per agent", "Nothing about rivals"],
    },
    {
      title: "Agents judge the fit, with Jev.",
      body: `Each agent's judgment is made with Jev: bid or skip, how relevant, how strong the intent. Asked anyway, for comparison, ${LG.name}'s agent said skip.`,
      facts: [`${CV.name}: bid`, `${KF.name}: bid`, `${LG.name}: skip, and not in the auction`],
    },
    {
      title: "Code sets the price.",
      body: `Both wallet campaigns got the same ratings, so policy gave both the same bid: ${bid}, the advertiser's maximum. A fixed, published tie rule chose ${CV.name}.`,
      facts: [`${CV.name}: ${bid} USDC, won`, `${KF.name}: ${bid} USDC`, "Reserved, not yet charged"],
    },
    {
      title: "Delivered, disclosed, signed.",
      body: `The app shows the card beside the answer, labelled Sponsored, and signs a receipt. Only now is there a charge: ${usdc(CACHED.price!)} USDC.`,
      facts: ["Card shown, labelled Sponsored", "Receipt signed by the app", `Charge accepted: ${usdc(CACHED.price!)} USDC`],
    },
    {
      title: "Settled once.",
      body: `${CV.name}'s channel authorized ${usdc(cvVouchers[0]!.cumulative)}, then ${usdc(cvVouchers[cvVouchers.length - 1]!.cumulative)} in total. One close paid ${usdc(CV_CHANNEL.settled)} and refunded ${usdc(CV_CHANNEL.refund)}. No transaction for each ad.`,
      facts: [`Deposit ${usdc(CV_CHANNEL.deposit)} USDC`, `Paid ${usdc(CV_CHANNEL.settled)}`, `Refunded ${usdc(CV_CHANNEL.refund)}`],
    },
  ],
};

/** ContextHint: one section. Scale words only, never the exact library counts. */
export const CONTEXTHINT = {
  label: "Data from ContextHint",
  scale: ["Thousands of advertisers.", "Tens of thousands of ads.", "Hundreds of thousands of ad placements."],
  lede: "ContextHint is our conversational ad intelligence product. It records the ads shown inside ChatGPT, the prompts they appeared beside and who each ad seems to be after. Before an agent judges a moment, it gets one real example and one inferred audience from here.",
  more: "Nearly a thousand niches and thousands of sub-niches, collected live in a dozen countries. More than a thousand marketers use ContextHint every day.",
  wallLabel: "Real ads observed by ContextHint inside ChatGPT, shown as data. Observed historical references, not axp.one advertisers; no relationship with these brands is implied.",
  moat: ["An auction is code.", "A record of which ads appeared beside which questions has to be collected.", "ContextHint already collects it."],
  action: "Visit ContextHint",
  note: "Inferred audiences are hypotheses, not advertiser settings. ContextHint's users are not axp.one users. We do not reproduce any platform's ad ranking and claim no targeting lift.", // claim-ok: negation
};

const J = JEV_EXAMPLE;
const pctOf = (x: number) => `${Math.round(x * 100)}%`;
/** Jev: one real decision from the run, shown as inputs, outputs and the bid code made of them. */
export const JEV_SECTION = {
  label: "Decisions with Jev",
  h2: "One real judgment, in and out.",
  lede: `Every advertiser's agent judges a moment with Jev. Here is ${CV.name}'s, on the question from the top of this page.`,
  inLabel: "Goes in",
  inputs: [
    { k: "The moment", v: `“${CACHED.question}”`, sub: "Must be able to store crypto." },
    { k: "Its own campaign", v: `${CV.name}, a fictional hardware wallet`, sub: `Offline key storage, Ethereum and Solana. Maximum bid ${usdc(CV.maxBid)} USDC.` },
    { k: "Its evidence, from ContextHint", v: "One real prompt and the ad shown beside it", sub: "Plus one inferred audience. Nothing about rivals." },
  ],
  outLabel: "Jev returns",
  decision: J.decision === "bid" ? "Bid" : "Skip",
  outputs: [
    { k: "Relevance", v: "Top level, a direct fit", conf: J.relevanceConfidence },
    { k: "Buying intent", v: "Top level, ready to buy", conf: J.intentConfidence },
    { k: "Creative", v: `${CV.name}'s approved card fits`, conf: J.creativeProbability },
  ].map((o) => ({ ...o, confText: `${pctOf(o.conf)} confident` })),
  codeLabel: "Code decides",
  bid: usdc(policyBid(J.relevanceLevel, J.intentLevel, CV.maxBid)),
  code: "Top relevance and top intent earn the full maximum, never more. Jev advises; the exchange's code sets the bid.",
  credit: "Built with Jev by TypeSafe",
  creditUrl: JEV.url,
  note: "One recorded judgment, as returned. A demonstration, not a benchmark.",
};

/** Solana payment channels. The recorded run settled on a hosted Solana sandbox; Devnet is a public
 *  re-settlement of the same three signed receipts. */
export const SOLANA = {
  label: "Settlement on Solana",
  h2: "Paid per ad. Settled once.",
  lede: "A deposit opens a payment channel on Solana. Each signed delivery raises a running total, signed off chain. One close on Solana pays the AI app and refunds the rest. No transaction for each ad: that is what makes ads costing a fraction of a cent workable.",
  onChain: "On Solana",
  offChain: "Off chain, signed",
  open: { k: "Open", v: `${usdc(CV_CHANNEL.deposit)} USDC deposited`, sub: "One transaction" },
  vouchers: cvVouchers.map((v, i) => ({ k: `Delivery ${i + 1}`, v: `${usdc(v.cumulative)} in total`, sub: i === 0 ? "A signed voucher" : "Replaces the last voucher" })),
  close: { k: "Close", v: `${usdc(CV_CHANNEL.settled)} to the AI app`, sub: `${usdc(CV_CHANNEL.refund)} refunded. One transaction.` },
  meterTitle: `${CV.name}'s channel, from our recorded run`,
  devnetH: "Settled on Solana. Check it yourself.",
  devnetBody: "The three signed receipts from our recorded run, settled through two payment channels on Solana Devnet with test USDC. No real value, no new auctions.", // claim-ok: limit
  devnetNote: "The recorded run itself settled on a hosted Solana sandbox; Devnet is a public re-settlement of the same receipts.",
  openTx: "Open on Explorer",
  closeTx: "Close on Explorer",
  channel: "Channel on Explorer",
  program: "The channel program on Explorer",
};

/** Inside the MVP: four framed captures of the working MVP, each linking to its page. */
export const MVP_TOUR = {
  label: "Inside the MVP",
  h2: "The whole run, open to inspect.",
  lede: "The MVP replays our recorded run from its saved record. Every page links to the evidence behind it.",
  action: "Open the MVP",
  tiles: [
    { key: "overview", title: "Overview", body: `The run on one screen: ${lower(RUN.counts.questions)} questions, ${RUN.counts.decisions} agent decisions, ${lower(RUN.counts.receipts)} paid deliveries.`, href: mvp("/"), alt: "The MVP overview: the demo AI app with its Sponsored card, the run's totals and the auctions." },
    { key: "opportunity", title: "One opportunity, step by step", body: "Eligibility, evidence, each agent's judgment, the auction, delivery and the charge.", href: mvp("/opportunity/1/"), alt: "The MVP opportunity page: a nine stage stepper from the moment to the charge." },
    { key: "settlement", title: "Solana settlement", body: "Both payment channels: the deposit, the running vouchers and one close each.", href: mvp("/settlement/"), alt: "The MVP settlement page: deposits, payouts, refunds and each channel's vouchers." },
    { key: "verify", title: "Verify, and tamper", body: "Your browser re-checks every hash and signature. Change one byte and watch it fail.", href: mvp("/verify/"), alt: "The MVP verify page after a one byte tamper: two checks fail on the copy." },
  ],
};

export const PROOF = {
  label: "Proof",
  h2: "Does it actually run?",
  counts: `${word(RUN.counts.questions)} questions, ${RUN.counts.decisions} agent decisions, ${lower(RUN.counts.receipts)} signed deliveries, ${lower(RUN.counts.channels)} payment channels.`,
  money: `${usdc(RUN.totals.paid)} USDC paid to the AI app and ${usdc(RUN.totals.refunded)} refunded, in test USDC.`,
  verifyLine: `Verify it yourself: ${RUN.mvp.verifyChecks ?? "all"} checks run in your browser`,
  devnet: HERO.devnet,
  limits: [
    "The advertisers are fictional.",
    "Test USDC on a hosted sandbox and on Devnet; no real value.", // claim-ok: limit
    "Each agent setting ran once: a demonstration, not a benchmark.",
    "A receipt proves the app delivered the card, not that a person looked.",
    "No conversions or targeting lift are claimed.", // claim-ok: limit
  ],
  action: "Open the MVP",
};

export const VIDEO = {
  label: "Video",
  h2: "Watch the run.",
  caption: "Four minutes, silent, captioned. A recorded replay of the saved run. Nothing executes again.",
  title: "axp.one recorded run, four minute walkthrough",
  chapters: [
    "What axp.one is",
    "Fictional advertisers",
    "Evidence from ContextHint",
    "A question with no exact match",
    "Independent answers",
    "Agent decisions",
    "Auction and price",
    "Delivery and receipts",
    "Settlement",
    "Restart and limits",
  ],
};

/** One compact panel in Proof. */
export const REAL = {
  title: "What's real, what's illustrative.",
  real: {
    title: "Real, from the recorded run",
    items: [
      `The ${lower(RUN.counts.questions)} questions and their answers, written with no advertiser material.`,
      `All ${RUN.counts.decisions} agent judgments, made with Jev.`,
      "Eligibility, prices and the auction, decided in code.",
      `${word(RUN.counts.receipts)} Sponsored cards, each with a receipt signed by the app.`,
      `${word(RUN.counts.channels)} Solana payment channels, opened and closed.`,
      "ContextHint's ads, prompts and inferred audiences.",
    ],
  },
  illustrative: {
    title: "Illustrative",
    items: ["All motion and animation on this page.", "The channel filling as you scroll (its amounts are real).", "The tilt and drift of the ad wall."],
  },
  notShown: { title: "What this run does not show", items: PROOF.limits },
};

export const CLOSING = {
  slogan: "Agents advise. Code decides the money.",
  h2: "Disclosed. Decided in code. Paid on delivery.",
  body: "See the exchange run, end to end.",
  primary: "See the working MVP",
  video: "Watch the video",
  contexthint: "Explore ContextHint",
  source: "The card from our recorded run.",
};

export const FOOTER = {
  scope: [
    "Hackathon MVP, October 2026.",
    "Recorded on a hosted Solana sandbox, re-settled on Solana Devnet. Test USDC.",
    `${CV.name}, ${KF.name} and ${LG.name} are fictional.`,
    "ContextHint figures are rounded; exact numbers on contexthint.com.",
  ],
  contexthint: { title: "ContextHint", body: "Conversational ad intelligence: the data our agents draw on.", link: "contexthint.com" },
  jev: { text: "Agent decisions built with", name: JEV.name, url: JEV.url },
  base: "A recorded run, October 2026.",
};
