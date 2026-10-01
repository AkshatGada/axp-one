// All landing copy, in one place so scripts/lint-copy.mjs can scan it.
// Rules: no em or en dashes; no internal details (IDs, hashes, policy names, model versions,
// level shorthands, base units); no partnership, enrollment, lift, attention, conversion,
// mainnet (outside limits and next) or x402 (outside Planned) claims. A line that states a
// negation or a limit carries a claim-ok comment. Run numbers come from run.ts, library numbers
// from library.ts.
import { FRESH_ADS, JEV, LIBRARY, TRACTION, fmt } from "./library";
import { CACHED, CV, CV_CHANNEL, LG, MOBILE, RUN, decision, lower, usdc, word } from "./run";

const cvText = decision(CACHED, "v3-clearvault", "text_only");
const cvHist = decision(CACHED, "v3-clearvault", "history");
const bid = usdc(CACHED.bids[0]!.amount);
const cvVouchers = CV_CHANNEL.vouchers;
const KF = RUN.campaigns["v3-keyforge"];

/** The MVP: the product-ui dev server in development, /mvp/ in the merged static build. */
export const MVP_URL = process.env.NEXT_PUBLIC_MVP_URL || (process.env.NODE_ENV === "development" ? "http://localhost:3420/" : "/mvp/");
export const MVP_VERIFY_URL = `${MVP_URL.replace(/\/$/, "")}/verify/`;
export const VIDEO_ANCHOR = "#video";
export const CH_URL = LIBRARY.url;

export const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#data", label: "ContextHint data" },
  { href: "#proof", label: "Proof" },
  { href: "#next", label: "Next" },
];

export const HEADER = { chip: "Hackathon MVP", cta: "See the MVP" };

export const HERO = {
  h1: "The advertising exchange for the agentic internet.",
  accent: "agentic internet.",
  lede: "Advertiser agents bid for a disclosed place beside the answer in AI apps. Code decides who wins and what it costs. Publishers are paid in stablecoins for each card they deliver.",
  primary: "See the working MVP",
  video: "Watch the four minute video",
  skip: "Skip to the proof",
  badge: "Built on ContextHint's ad intelligence",
  badgeLine: TRACTION.line,
  status: "Working MVP on a hosted Solana sandbox with test USDC.",
  frameCaption: "A real question from our recorded run, with an excerpt of the answer. The answer was written without any ad in view, and the card was sold at auction. Motion is illustrative.",
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
  stackCaption: "Values from one recorded run. Motion is illustrative.",
  brandNote: "Observed historical reference, not an axp.one advertiser.",
};

export const WHY = {
  label: "Why now",
  h2: "Where does advertising go when the answer is a conversation?",
  cols: [
    { title: "The moment", body: "People now decide inside AI apps: which wallet to buy, which tool to trust. An ad belongs beside that answer, disclosed, never inside it." },
    { title: "Who pays, who earns", body: "Advertisers pay only for cards that were delivered and disclosed. AI apps earn for every card they show, paid in stablecoins." },
    { title: "What the exchange earns", body: "A network fee on settled spend.", planned: true },
  ],
};

export const ROLES = {
  h3: "Six parties, one exchange.",
  roles: [
    { name: "Advertiser", body: "Sets the approved creative, what the product can do, a maximum bid and a budget.", kind: "party" as const },
    { name: "Buying agent", body: "Reads one moment with its own campaign and evidence. Says bid or skip. Never sees money.", kind: "agent" as const },
    { name: "Exchange", body: "Checks eligibility in code, turns judgment into a capped bid, runs a first price auction.", kind: "code" as const }, // claim-ok: auction type
    { name: "AI app", body: "Shows a separate card marked Sponsored, signs a receipt and gets paid.", kind: "party" as const },
    { name: "Person asking", body: "Gets an answer from an assistant that never saw the ad.", kind: "party" as const },
    { name: "Payment worker", body: "Pays only for accepted cards. Browsers and agents never sign.", kind: "code" as const },
  ],
  legend: "A filled square marks a step decided in code.",
};

export const STAGE = {
  label: "How it works",
  h2: "What happens between the question and the card?",
  lede: "One real moment from our run, step by step.",
  source: "Values from our recorded run. Motion is illustrative.",
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
      body: "ContextHint supplies a real recorded prompt, the ad shown beside it and an inferred audience, for one advertiser at a time. Here both wallet agents drew the same record. No rival bids, budgets or wallets.",
      facts: ["One real example per agent", "One inferred audience per agent", "Nothing about rivals"],
    },
    {
      title: "Agents judge the fit, with Jev.",
      body: `Each agent's judgment is made with Jev: bid or skip, how relevant, how strong the intent. With history, both wallet agents rated intent ${cvHist.intentLevel} instead of ${cvText.intentLevel} on this question. On the second question, history changed nothing. Asked anyway, for comparison, ${LG.name}'s agent said skip.`,
      facts: [`${CV.name}: bid`, `${KF.name}: bid`, `${LG.name}: skip, and not in the auction`],
    },
    {
      title: "Code sets the price.",
      body: `Policy turns those judgments into a bid, capped at the advertiser's maximum. ${word(CACHED.bids.length)} bids of ${bid} tied. A fixed tie rule chose ${CV.name} and reserved its budget.`,
      facts: [`${CV.name}: ${bid} USDC, won`, `${KF.name}: ${bid} USDC`, "Reserved, not yet charged"],
    },
    {
      title: "Delivered, disclosed, signed.",
      body: `The app shows the card beside the answer, labelled Sponsored, and signs a receipt. Only now is there a charge: ${usdc(CACHED.price!)} USDC.`,
      facts: ["Card shown, labelled Sponsored", "Receipt signed by the app", `Charge accepted: ${usdc(CACHED.price!)} USDC`],
    },
    {
      title: "Settled once.",
      body: `Over the run, ${CV.name}'s channel authorized ${usdc(cvVouchers[0]!.cumulative)}, then ${usdc(cvVouchers[cvVouchers.length - 1]!.cumulative)} in total. One close paid ${usdc(CV_CHANNEL.settled)} and refunded ${usdc(CV_CHANNEL.refund)}. No transaction for each ad.`,
      facts: [`Deposit ${usdc(CV_CHANNEL.deposit)} USDC`, `Paid ${usdc(CV_CHANNEL.settled)}`, `Refunded ${usdc(CV_CHANNEL.refund)}`],
    },
  ],
};

export const RULE = {
  label: "The rule",
  h2: "Agents advise. Code decides the money.",
  body: `In the run, agents returned judgments. Policy set all ${lower(RUN.counts.auctions)} prices, a fixed tie rule settled both ties, and only signed receipts became charges.`,
  rules: [
    { rule: "An award is not a charge.", run: `${word(RUN.counts.receipts)} awards became charges only after ${lower(RUN.counts.receipts)} signed receipts.` },
    { rule: "Losing bids cost nothing.", run: `${KF.name} lost ${lower(RUN.counts.ties)} ties and paid nothing for them.` },
    { rule: "Disclosure, always.", run: "Every delivered card carried the Sponsored label." },
    { rule: "Ads never rewrite the answer.", run: `${word(RUN.counts.organicAnswers)} answers came from assistants given no advertiser material.` },
    { rule: "Money cannot buy past eligibility.", run: `A mobile only question: all ${lower(MOBILE.excluded.length)} campaigns ruled out, ${lower(MOBILE.decisions.length)} model calls, no ad.` },
    { rule: "A restart cannot double charge.", run: `The run replayed: ${lower(RUN.restart.newCalls)} new calls, charges or signatures.` },
  ],
};

const fa = FRESH_ADS.rows;
export const CONTEXTHINT = {
  label: "ContextHint data",
  h2: "What does an advertiser's agent know?",
  h3: "Built on ContextHint.",
  lede: "ContextHint is our conversational ad intelligence product. It records the ads shown inside ChatGPT, the prompts they appeared beside and an inferred view of who each ad is after.",
  traction: TRACTION,
  tractionLabel: "marketers use ContextHint every day, including paying customers",
  wallLabel: "Ads observed by ContextHint inside ChatGPT. Not axp.one advertisers.",
  wallStats: [
    { value: fmt(LIBRARY.advertisers), label: "advertisers observed" },
    { value: fmt(LIBRARY.creatives), label: "unique ads" },
  ],
  dotsTitle: `${fmt(LIBRARY.placements)} times an ad was seen.`,
  dotsBody: "One dot is a hundred placements. Sorted by the country each was recorded in, the library leans hard to the United States, and many placements carry no country at all.",
  dotsCaption: "One dot per 100 placements. Layout illustrative, counts actual.",
  nichesTitle: `${fmt(LIBRARY.niches)} niches. ${fmt(LIBRARY.subNiches)} sub niches.`,
  nichesBody: `${fmt(LIBRARY.nichesWithAds)} niches and ${fmt(LIBRARY.subNichesWithAds)} sub niches have ads. One of them is the niche our run drew on: crypto hardware wallets and self custody.`,
  fieldNote: "Illustrative layout, counts actual.",
  dive: "One niche. One record. One agent.",
  countriesTitle: `Collecting in ${LIBRARY.freshAdsCountries} countries.`,
  countriesBody: `Fresh Ads collects new ads live. A call is one collection request; it counts when the answer carried at least one ad. In the United States, ${fa[0]!.withAds} of ${fa[0]!.calls} calls returned ads.`,
  countriesNote: `${FRESH_ADS.source} Not part of the ${fmt(LIBRARY.placements)} placements.`,
  source: `${LIBRARY.source}, ${LIBRARY.snapshotDate}. Placements observed ${LIBRARY.placementsWindow.from} to ${LIBRARY.placementsWindow.to}.`,
  chain: {
    prompt: "A recorded prompt",
    promptNote: "This exact question is in ContextHint's recorded prompts, so the lookup found a perfect match.",
    ad: "The ad shown beside it",
    adNote: "Observed listing text, quoted as recorded. Observed historical reference, not an axp.one advertiser.",
    hint: "The audience it implies",
    hintNote: "Inferred by ContextHint: a hypothesis, not an advertiser setting. Brands named are not axp.one advertisers.",
    handed: `Handed to ${CV.name}'s agent`,
    handedNote: "One example and one audience, beside its own campaign. No rival bids, budgets or wallets.",
  },
  payoff: {
    title: "Evidence an agent can show. Evidence that cannot buy a capability.",
    changed: { q: "On the cached question", a: `With history, intent ${cvText.intentLevel} became ${cvHist.intentLevel}.` },
    unchanged: { q: "On the second question", a: "With history, nothing changed." },
    leather: `${LG.name}'s evidence matched leather wallets. It was ruled out anyway, in code.`,
    note: "Each setting ran once: a demonstration, not a benchmark.",
  },
  funnelTitle: "Three numbers, kept apart.",
  funnel: [
    { title: "The library", value: fmt(LIBRARY.placements), unit: "placements", body: "What ContextHint has observed." },
    { title: "The screened slice", value: fmt(RUN.evidence.slice.associations), unit: "records", body: `${fmt(RUN.evidence.slice.associations)} ad and prompt records, ${fmt(RUN.evidence.slice.prompts)} prompts, ${fmt(RUN.evidence.slice.creatives)} ads, ${fmt(RUN.evidence.slice.hints)} inferred audiences. What this MVP could draw on.` },
    { title: "One packet", value: `${RUN.evidence.examples} + ${RUN.evidence.hints}`, unit: "example and audience", body: "What one agent saw for one question." },
  ],
  moat: "An auction is code. A record of which ads appeared beside which questions has to be collected. ContextHint already collects it.",
  context: "The library leans to the United States. Inferred audiences are hypotheses, not advertiser settings. Observed brands are not axp.one advertisers, and ContextHint's users are not axp.one users. We do not reproduce any platform's ad ranking and claim no targeting lift.", // claim-ok: negation
  action: "Visit ContextHint",
  textLink: "Explore the library on contexthint.com",
};

export const PROOF = {
  label: "Proof",
  h2: "Does it actually run?",
  h3: "One recorded run, end to end.",
  lede: `Four real questions through the whole exchange on a hosted Solana sandbox with test USDC. Fictional advertisers, real decisions, real settlement. The agents drew on a screened ContextHint slice of ${fmt(RUN.evidence.slice.associations)} ad and prompt records.`,
  stats: [
    { value: String(RUN.counts.questions), label: "real questions" },
    { value: String(RUN.counts.decisions), label: "agent decisions" },
    { value: String(RUN.counts.auctions), label: `auctions and ${lower(RUN.counts.noFill)} no fill` },
    { value: String(RUN.counts.receipts), label: "Sponsored cards with signed receipts" },
    { value: usdc(RUN.totals.paid), unit: "USDC", label: "paid to the AI app", mono: true },
    { value: usdc(RUN.totals.refunded), unit: "USDC", label: "refunded", mono: true },
  ],
  sheetTitle: "The run, question by question",
  exhibitCard: `${KF.name}'s actual Sponsored card`,
  exhibitReceipt: "Its delivery receipt",
  receiptNote: "Every signature and hash checks in your browser on the MVP's Verify page.",
  settlementTitle: "Settlement",
  limitsTitle: "What this run does not show.",
  limits: [
    "The advertisers are fictional.",
    "One disposable test payer funded both channels.",
    "Sandbox, not mainnet.", // claim-ok: limit
    "Each agent setting ran once: a demonstration, not a benchmark.",
    "A receipt proves the app delivered the card, not that a person looked.",
    "Answers came through an operator recorded bridge. Their inputs show no advertiser material; that is not a cryptographic proof.",
    "No conversions or targeting lift are claimed.", // claim-ok: limit
  ],
  action: "Open the MVP",
  verify: "Verify the receipts",
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

export const NEXT = {
  label: "Next",
  h2: "Working now. Building next.",
  now: [
    "Campaigns with approved creative, capabilities, caps and budgets.",
    "Buying agents that bid or skip on evidence.",
    "Eligibility, capped bids and a deterministic auction.",
    "Disclosed Sponsored cards with signed receipts.",
    "Payment channels settled with refunds.",
    "Replay that cannot double charge.",
  ],
  next: [
    "Campaign planning agents.",
    "A publisher SDK for any AI app.",
    "More categories.",
    "An x402 web payment adapter.", // claim-ok: planned
    "Tools for agents over MCP.",
    "Advertiser owned wallets.",
    "Devnet, then mainnet.", // claim-ok: planned
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
  source: "The card from our recorded run. Motion is illustrative.",
};

export const FOOTER = {
  scope: [
    "Hackathon MVP, October 2026.",
    "Hosted Solana sandbox, test USDC.",
    `${CV.name}, ${KF.name} and ${LG.name} are fictional.`,
    `ContextHint figures are from an owner supplied snapshot dated ${LIBRARY.snapshotDate}.`,
  ],
  contexthint: { title: "ContextHint", body: "Conversational ad intelligence: the data our agents draw on.", link: "contexthint.com" },
  jev: { text: "Agent decisions built with", name: JEV.name, url: JEV.url },
  base: "A recorded run, October 2026.",
};

/** The three pillars, once, right after the hero. Plain text, no logos. */
export const BUILT_ON = {
  label: "Built on",
  items: [
    { lead: "Data from ContextHint.", line: "Real ads and prompts recorded inside ChatGPT.", href: LIBRARY.url, link: "contexthint.com" },
    { lead: "Decisions with Jev.", line: "Each buying agent judges the moment with Jev by TypeSafe.", href: JEV.url, link: "docs.typesafe.ai" },
    { lead: "Settlement on Solana.", line: "Stablecoin payment channels: one close pays the AI app.", href: "https://solana.com", link: "solana.com" },
  ],
};

export const PAYMENTS = {
  label: "Payments",
  h2: "Settled through Solana payment channels.",
  body: "A deposit opens a channel on Solana. Each accepted card raises a running authorization, off chain. One close on Solana pays the AI app and refunds the rest. There is no Solana transaction for each ad.",
  facts: [
    { value: String(RUN.counts.channels), label: "channels opened and closed, both finalized" },
    { value: usdc(RUN.totals.paid), unit: "USDC", label: "paid to the AI app", mono: true },
    { value: usdc(RUN.totals.refunded), unit: "USDC", label: "refunded to the advertiser", mono: true },
  ],
  meterTitle: `${CV.name}'s Solana payment channel`,
  source: "Hosted Solana sandbox, test USDC. Values from our recorded run; the fill motion is illustrative.",
  perAd: "A transaction for each ad",
  perAdNote: "A network fee and a wait on every card.",
  channel: "One channel",
  channelNote: "Authorizations off chain, one close on Solana.",
};
