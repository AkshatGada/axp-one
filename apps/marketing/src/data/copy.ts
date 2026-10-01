// All landing copy, in one place so scripts/lint-copy.mjs can scan it.
// Rules: no em or en dashes; no partnership, enrollment, lift, attention, conversion, mainnet
// (outside limits and next), x402 (outside Planned) or ranking-replication claims. A line that
// states a negation or a limit carries a claim-ok comment. Every run number is interpolated
// from the extracted slice (run.ts) and every library number from library.ts.
import { LIBRARY, fmt } from "./library";
import { CACHED, CV, CV_CHANNEL, KF_CHANNEL, LG, MOBILE, RUN, decision, lower, usdc, word } from "./run";

const cvText = decision(CACHED, "v3-clearvault", "text_only");
const cvHist = decision(CACHED, "v3-clearvault", "history");
const bid = usdc(CACHED.bids[0]!.amount);
const cvVouchers = CV_CHANNEL.vouchers;

export const MVP_URL = process.env.NEXT_PUBLIC_MVP_URL || "/mvp/";
export const VIDEO_ANCHOR = "#video";

export const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#data", label: "Data" },
  { href: "#proof", label: "Proof" },
  { href: "#next", label: "Next" },
];

export const HEADER = { chip: "Hackathon MVP", cta: "See the MVP" };

export const HERO = {
  h1: "The advertising exchange for the agentic internet.",
  lede: "Advertiser agents bid for a disclosed place beside the answer in AI apps. Code decides who wins and what it costs. Publishers are paid in stablecoins for each card they deliver.",
  primary: "See the working MVP",
  video: "Watch the four minute video",
  skip: "Skip to the proof",
  status: "Working MVP on a hosted Solana sandbox with test USDC.",
  frameCaption: "A real question from our recorded run. The answer was written without any ad in view. The card was sold at auction.",
  appName: "Our demo AI app",
  pullBack: "Behind one Sponsored card, a whole exchange.",
  stackCaption: "Every value here comes from one recorded run. The motion is illustrative.",
  callouts: {
    answer: { title: "The answer.", body: "Written by an assistant that never saw an ad." },
    card: { title: "The card.", body: "Labelled Sponsored and kept apart from the answer." },
    auction: { title: "The auction.", body: `${word(CACHED.bids.length)} bids of ${bid} USDC. A fixed rule broke the tie.` },
    agents: { title: "The agents.", body: "Each judged the moment with its own campaign only. One said skip." },
    evidence: { title: "The evidence.", body: "A real prompt, the ad it drew and the audience it implies." },
    payment: { title: "The payment.", body: "Charged only on a signed receipt. Settled in one close." },
  },
};

export const SHIFT = {
  label: "The shift",
  h2: "Where does advertising go when the answer is a conversation?",
  body: "People now ask AI apps which wallet to buy, which tool to trust and what to do next. Those are moments of decision. Advertisers want to be there, and people deserve to know when they are. AI apps need a placement that sits beside the answer, never inside it, bought by agents that have to justify the fit.",
  for: [
    { who: "For the person asking", what: "An answer that stays independent, and a card that says Sponsored." },
    { who: "For the advertiser", what: "An agent that bids only where your product fits, inside limits you set." },
    { who: "For the AI app", what: "Revenue for every card it actually delivers." },
  ],
};

export const ROLES = {
  label: "The parties",
  h2: "Six parties. One rule: agents advise, code decides the money.",
  roles: [
    { name: "Advertiser", body: "Sets the approved creative, what the product can do, who it is for, a maximum bid and a budget.", kind: "party" as const },
    { name: "Buying agent", body: "Reads one opportunity with its own campaign and permitted evidence. Says bid, skip or abstain. Never sees money.", kind: "agent" as const },
    { name: "Exchange", body: "Checks eligibility in code, turns judgment into a bounded bid, runs a first price auction and reserves budget.", kind: "code" as const }, // claim-ok: auction type
    { name: "AI app", body: "Shows a separate card marked Sponsored, signs a receipt and gets paid.", kind: "party" as const },
    { name: "Person asking", body: "Gets an organic answer from an assistant that never saw the ad.", kind: "party" as const },
    { name: "Payment worker", body: "Authorizes only accepted charges. Browsers and agents never sign.", kind: "code" as const },
  ],
  legend: "A filled square marks a step decided in code.",
};

const cvExcl = CACHED.excluded.find((e) => e.campaign === "v3-leatherguard")!;

export const STAGE = {
  label: "How it works",
  h2: "What happens between the question and the card?",
  lede: "One real opportunity from our run, step by step. Values are actual. Motion is illustrative.",
  skip: "Skip the walkthrough",
  beats: [
    { title: "The app offers a moment.", body: "The publisher sends the task and what a product must be able to do. Here, store crypto." },
    { title: "Eligibility is decided in code.", body: `A campaign without a required capability cannot enter the auction, whatever it would pay. ${LG.name} sells a leather wallet. It was ruled out.` },
    { title: "Each agent gets its own evidence.", body: "ContextHint supplies real past prompts, the ads they drew and an inferred audience, aligned to one advertiser. No rival bids, no budgets, no wallets." },
    { title: "Agents judge the fit.", body: `Each agent returns bid, skip or abstain, with relevance and intent levels. With history, both wallet agents rated intent ${cvHist.intentLevel} instead of ${cvText.intentLevel}. Asked anyway, for comparison, ${LG.name}'s agent said skip.` },
    { title: "Code sets the price.", body: `Policy turns those levels into a bid, capped at the advertiser's maximum. ${word(CACHED.bids.length)} bids of ${bid} tied. A fixed rule chose ${CV.name} and reserved its budget.` },
    { title: "Delivered, disclosed, signed.", body: `The app shows the card beside the answer, labelled Sponsored, and signs a receipt. Only now is there a charge: ${usdc(CACHED.price!)} USDC.` },
    { title: "Settled once.", body: `${CV.name}'s voucher rose from ${usdc(cvVouchers[0]!.cumulative)} to ${usdc(cvVouchers[cvVouchers.length - 1]!.cumulative)} over ${lower(cvVouchers.length)} cards. One close paid the publisher ${usdc(CV_CHANNEL.settled)} and returned ${usdc(CV_CHANNEL.refund)}.` },
  ],
  exit: "Agents advise. Code decides the money.",
  excludedReason: cvExcl.reason,
};

export const PAYMENTS = {
  label: "Payments",
  h2: "Pay for each delivery without a transaction for each ad.",
  body: "An advertiser opens a stablecoin payment channel with a deposit. Each accepted card raises one signed voucher for the running total, off chain. A single close pays the publisher and returns what was not spent. One transfer per ad would put a network fee and a wait on every card. A channel keeps both out of the auction.",
  caption: `${CV.name}'s actual channel. Hosted Solana sandbox, test USDC.`,
  lane: "One transfer per ad",
  laneNote: "For comparison only.",
  x402: "An x402 payment adapter is planned, not part of this run.", // claim-ok: planned
};

export const CONTEXTHINT = {
  label: "Data",
  h2: "What does an advertiser's agent know?",
  h3: "Built on ContextHint.",
  lede: "ContextHint is our conversational ad intelligence product, already used by thousands of people, including paying customers. It records ads shown inside ChatGPT, the prompts that drew them and an inferred view of who each ad is after.",
  stats: [
    { value: fmt(LIBRARY.advertisers), label: "observed advertisers" },
    { value: fmt(LIBRARY.creatives), label: "unique ad creatives" },
    { value: fmt(LIBRARY.placements), label: "observed ad placements" },
    { value: fmt(LIBRARY.niches), label: "niches", sub: `${fmt(LIBRARY.nichesWithAds)} with ads` },
    { value: fmt(LIBRARY.subNiches), label: "sub niches", sub: `${fmt(LIBRARY.subNichesWithAds)} with ads` },
  ],
  source: `${LIBRARY.source}, ${LIBRARY.snapshotDate}. Placements observed ${LIBRARY.placementsWindow.from} to ${LIBRARY.placementsWindow.to}.`,
  dive: "One niche. One record. One agent.",
  fieldNote: `Illustrative layout, counts actual: ${fmt(LIBRARY.niches)} niches, ${fmt(LIBRARY.nichesWithAds)} with ads.`,
  chain: {
    prompt: "Observed prompt",
    ad: "Observed ad",
    hint: "Inferred audience",
    handed: `Handed to ${CV.name}'s agent`,
    result: `Intent rated ${cvHist.intentLevel}, not ${cvText.intentLevel}`,
    resultNote: `The score moved from ${cvText.intentScore} to ${cvHist.intentScore}, across the rounding line. Bid or skip did not change.`,
  },
  brandNote: "Observed historical reference, not an AXP advertiser.",
  funnelTitle: "Three numbers, kept apart.",
  funnel: [
    { title: "The library", value: fmt(LIBRARY.placements), unit: "placements", body: "What ContextHint has observed." },
    {
      title: "The screened slice",
      value: fmt(RUN.evidence.slice.associations),
      unit: "associations",
      body: `${fmt(RUN.evidence.slice.associations)} associations, ${fmt(RUN.evidence.slice.prompts)} prompts, ${fmt(RUN.evidence.slice.creatives)} creatives, ${fmt(RUN.evidence.slice.hints)} hints. What this MVP could draw on.`,
    },
    { title: "One packet", value: `${RUN.evidence.examples} + ${RUN.evidence.hints}`, unit: "example and hint", body: "One example and one hint. What one agent saw for one question." },
  ],
  moat: "An auction is code. A record of which ads appeared beside which questions has to be collected. ContextHint already collects it.",
  context: `The library leans to the United States: ${fmt(LIBRARY.usTaggedPlacements)} of ${fmt(LIBRARY.placements)} placements are US tagged and ${fmt(LIBRARY.noCountryPlacements)} have no country recorded. Fresh Ads now collects in ${LIBRARY.freshAdsCountries} countries. Inferred audiences are hypotheses, not advertiser settings. Observed brands are not AXP advertisers. We do not reproduce any platform's ad ranking and claim no targeting lift.`, // claim-ok: negation
  action: "Visit ContextHint",
};

const receiptsN = RUN.counts.receipts;
export const PRINCIPLES = {
  label: "Principles",
  h2: "Rules the money cannot break.",
  lede: "Each one held in the recorded run.",
  rows: [
    { rule: "Agents advise. Code decides the money.", run: `Agents returned levels and a creative. Policy set all ${lower(RUN.counts.auctions)} prices.`, kind: "policy" as const },
    { rule: "An award is not a charge.", run: `${word(receiptsN)} awards became charges only after ${lower(receiptsN)} signed receipts.`, kind: "actual" as const },
    { rule: "Losing bids cost nothing.", run: `${RUN.campaigns["v3-keyforge"].name} lost ${lower(RUN.counts.ties)} ties and paid nothing for them.`, kind: "policy" as const },
    { rule: "Disclosure, always.", run: "Every delivered card carried the Sponsored label, checked in the browser.", kind: "actual" as const },
    { rule: "Ads never rewrite the answer.", run: `${word(RUN.counts.organicAnswers)} organic answers came from assistants given no advertiser material.`, kind: "actual" as const },
    { rule: "Money cannot buy past eligibility.", run: `A mobile only request: all ${lower(MOBILE.excluded.length)} campaigns ruled out in code, ${lower(MOBILE.decisions.length)} model calls, no ad.`, kind: "policy" as const },
    { rule: "A restart cannot double charge.", run: `${word(RUN.restart.replayedTurns)} turns and ${lower(RUN.restart.replayedReceipts)} receipts replayed: ${lower(RUN.restart.newCalls)} new calls, charges or signatures.`, kind: "actual" as const },
  ],
};

export const PROOF = {
  label: "Proof",
  h2: "Does it actually run?",
  h3: "One recorded run, end to end.",
  lede: "Four real questions through the whole exchange on a hosted Solana sandbox with test USDC. Fictional advertisers, real decisions, real settlement.",
  stats: [
    { value: String(RUN.counts.questions), label: "real questions" },
    { value: String(RUN.counts.decisions), label: "agent decisions" },
    { value: String(RUN.counts.auctions), label: `auctions and ${lower(RUN.counts.noFill)} no fill` },
    { value: String(RUN.counts.receipts), label: "Sponsored cards with signed receipts" },
    { value: usdc(RUN.totals.paid), unit: "USDC", label: "paid to the publisher", mono: true },
    { value: usdc(RUN.totals.refunded), unit: "USDC", label: "refunded", mono: true },
  ],
  sheetTitle: "Run sheet",
  exhibitCard: "KeyForge's actual Sponsored card",
  exhibitReceipt: "Its signed receipt",
  settlementTitle: "Settlement",
  limitsTitle: "What this run does not show.",
  limits: [
    "The advertisers are fictional.",
    "One disposable test payer funded both channels.",
    "Sandbox, not mainnet.", // claim-ok: limit
    "One observation per agent setting is a demonstration, not a benchmark.",
    "A receipt proves the app delivered the card, not that a person looked.",
    "No conversions or targeting lift are claimed.", // claim-ok: limit
  ],
  action: "Open the MVP",
  publisherNote: "Our demo AI app is the owned reference publisher app; its recorded ID is a legacy name.",
};

export const VIDEO = {
  label: "Video",
  h2: "Watch the run.",
  caption: "Four minutes, silent, captioned. A recorded replay of the saved run. Nothing executes again.",
  title: "AXP recorded run, four minute walkthrough",
  chapters: [
    "What AXP is",
    "Fictional advertisers",
    "Evidence from ContextHint",
    "An uncached question",
    "Independent organic answers",
    "Agent decisions",
    "Auction and price",
    "Delivery and receipts",
    "Settlement",
    "Restart and limits",
  ],
};

export const NEXT = {
  label: "Next",
  h2: "Working now. Building next.",
  now: [
    "Campaigns with approved creative, capabilities, caps and budgets.",
    "Buying agents that bid, skip or abstain on evidence.",
    "Eligibility, bounded bids and a deterministic auction.",
    "Disclosed Sponsored cards with signed receipts.",
    "Receipt linked payment channels, settled with refunds.",
    "Replay that cannot double charge.",
  ],
  next: [
    "Campaign planning agents.",
    "A publisher SDK for any AI app.",
    "More categories.",
    "An x402 payment adapter.", // claim-ok: planned
    "MCP tools for agents.",
    "Advertiser owned wallets.",
    "Devnet, then mainnet.", // claim-ok: planned
    "Network fees.",
    "Viewability and fraud measurement.", // claim-ok: planned
  ],
  tiles: [
    { title: "For advertisers", body: "Be there when people decide, with an agent that knows when to sit out." },
    { title: "For AI apps", body: "Earn from disclosed cards without touching your answers." },
    { title: "For agent builders", body: "Bring your own buying agent. The exchange keeps it honest.", planned: true },
  ],
};

export const CLOSING = {
  h2: "Disclosed. Decided in code. Paid on delivery.",
  body: "See the exchange run, end to end.",
  primary: "See the working MVP",
  video: "Watch the video",
  contexthint: "Explore ContextHint",
};

export const FOOTER = {
  scope: [
    "Hackathon MVP, October 2026.",
    "Hosted Solana sandbox, test USDC.",
    `${CV.name}, ${RUN.campaigns["v3-keyforge"].name} and ${LG.name} are fictional.`,
    `ContextHint figures are from an owner supplied library snapshot dated ${LIBRARY.snapshotDate}.`,
  ],
  base: `Recorded run ${RUN.runId}. Manifest ${RUN.manifestHashShort}.`,
};

export const KF_CHANNEL_REF = KF_CHANNEL;
