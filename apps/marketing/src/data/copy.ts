// All landing copy (v7), in one place so scripts/lint-copy.mjs can scan it.
// v7 rule: visual first, words are captions. One display line per section, at most one short
// sentence, then the visual. Whole page under 450 words.
// Standing rules: no em or en dashes; no internal details (IDs, hashes, policy names, model
// versions, level shorthands, base units); scale words for ContextHint's library, founder-reported
// usage distinguished from AXP adoption; no partnership, enrollment, lift, attention, conversion,
// mainnet or x402 claims (a planned item or a stated limit carries a claim-ok comment).
// Run numbers come from run.ts (written by scripts/extract-specimens.mjs with asserts).
import latestSettlement from "./settlement.latest.json";
import { JEV, LIBRARY } from "./library";
import { CACHED, CV, CV_CHANNEL, DEVNET, JEV_EXAMPLE, KF, KF_CHANNEL, LG, RUN, policyBid, usdc } from "./run";

/** The MVP: the product-ui dev server in development, /mvp/ in the merged static build. */
export const MVP_URL = process.env.NEXT_PUBLIC_MVP_URL || (process.env.NODE_ENV === "development" ? "http://localhost:3420/" : "/mvp/");
const mvp = (path: string) => `${MVP_URL.replace(/\/$/, "")}${path}`;
export const MVP_VERIFY_URL = mvp("/verify/");
export const CH_URL = LIBRARY.url;
export const JEV_URL = JEV.url;
export const SOLANA_URL = "https://solana.com";
/** A verified 7 October channel close that paid the example publisher. */
export const DEVNET_URL = latestSettlement.channels[0]?.closeUrl ?? null;
export const VIDEO_ANCHOR = "#video";
export const PUBLISHER_URL = "/publisher-demo/";
export const ADVERTISER_URL = "/advertiser-dashboard/";
export const PRODUCT_VIDEO_URL = "/demo/";

const bid = usdc(CACHED.bids[0]!.amount);

/** Header: the two audiences, the flow and billing; ContextHint is a link out, nothing more. */
export const NAV = [
  { href: "#advertisers", label: "For advertisers" },
  { href: "#publishers", label: "For AI apps" },
  { href: "#how", label: "How it works" },
  { href: "#billing", label: "Billing" },
];
export const HEADER = { chip: "", cta: "Try the test demo" };
/** The only ContextHint mention on the homepage: a header link with this description. */
export const CONTEXTHINT_LINK = { href: LIBRARY.url, label: "ContextHint", description: "The intelligence platform for running ChatGPT ads." };

export const HERO = {
  h1: "The advertising network for the agentic internet.",
  accent: "agentic internet.",
  lede: "Reach people when they ask a question your product can help answer. AI apps earn from clearly labelled ads beside their own answers.",
  primary: "Try the test demo",
  secondary: "Open the advertiser dashboard",
  status: "A test workspace today: fictional advertisers, test USDC.",
  wallNote: "Illustrative questions and bidding.",
  focalNote: "Product flow illustration.",
  /** Shown inside the focal tile. */
  appName: "Example chat",
  slotLine: "Answer, then one Sponsored slot",
  answerLabel: "Answer",
  gap: "Separate from the answer",
  delivered: "Delivered",
};

/** The exploded card: six plates behind the one Sponsored card. Two to four words each. */
export const STACK = {
  line: "One labelled card. A whole network behind it.",
  note: "What sits behind a placement.",
  plates: {
    answer: { name: "Answer", note: "the app's own" },
    card: { name: "Card", note: "labelled Sponsored" },
    auction: { name: "Auction", note: "fixed rules set the price" },
    agents: { name: "Agents", note: "judge fit and intent" },
    evidence: { name: "Context", note: "what each side declared" },
    payment: { name: "Payment", note: "per accepted delivery" },
  },
  price: "Highest valid bid wins; winner pays its bid",
  ruledOut: "ruled out",
};

/** For advertisers: problem, product action, outcome. The specimen values are an illustration. */
export const ADVERTISERS = {
  label: "For advertisers",
  h2: "Be there when the question is yours.",
  problem: "People now ask an AI what to buy. There is no keyword list to bid on.",
  points: [
    { k: "Describe", v: "Your offer and the conversations you want to appear beside, in your own words." },
    { k: "Approve", v: "The exact Sponsored text. Nothing runs until you approve it; an edit withdraws the approval." },
    { k: "Limit", v: "A maximum bid and a total budget. Pause the campaign whenever you want." },
    { k: "Inspect", v: "Every bid, skip and placement, each with its reason." },
  ],
  outcome: "An agent judges each question for fit and intent. Your limits decide what it may spend.",
  action: "Open the advertiser dashboard",
  sheet: {
    title: "Campaign",
    offerK: "Offer",
    offer: "Hardware wallet for Ethereum and Solana self-custody",
    wantK: "Conversations you want",
    wants: ["Comparing hardware wallets", "Offline key storage"],
    adK: "Sponsored text",
    approved: "Approved by you",
    limitsK: "Limits",
    limits: [{ k: "Maximum bid", v: "0.004" }, { k: "Total budget", v: "0.020" }],
    unit: "test USDC",
    pause: "Pause",
    running: "Running",
  },
  log: {
    title: "What happened",
    rows: [
      { q: "Compare hardware wallets with offline key storage", state: "Placed", why: "Highest valid bid" },
      { q: "Cheapest hardware wallet for Ethereum", state: "Bid", why: "Another advertiser bid higher" },
      { q: "Best mobile-only wallet app", state: "Skipped", why: "Not a fit for the offer" },
    ],
  },
  note: "Illustration with a fictional advertiser.",
};

/** For AI apps. The answer-independence line is scoped to our own integration. */
export const PUBLISHERS = {
  label: "For AI apps",
  h2: "Earn beside the answer, not inside it.",
  problem: "Answers cost money to serve. Ads written into the answer cost you trust.",
  points: [
    { k: "Keep your model", v: "Your app writes the answer. The ad request runs alongside it, on a separate path." },
    { k: "Request and render", v: "Ask for an ad, then render one separate card with the Sponsored label." },
    { k: "Restrict", v: "Declare what a placement requires and the categories you will not carry." },
    { k: "Confirm", v: "Report that the labelled card was inserted. No qualifying bid means no ad." },
  ],
  outcome: "In our integration, the answer path receives no advertiser material.",
  action: "Read the integration guide",
  chat: "Try the example chat",
  steps: [
    { n: "1", k: "Request", code: "const ad = await axp.requestAd({ question, sessionId, turnId })" },
    { n: "2", k: "Render", code: "const card = createSponsoredCard({ document, award: ad.award })" },
    { n: "3", k: "Acknowledge", code: "await acknowledge({ node: card, award, deliveryToken })" },
  ],
  sdkNote: "Source SDK in the repository. Publisher keys are issued by the workspace operator.",
  filled: "A qualifying bid",
  empty: "No qualifying bid",
  emptyLine: "No ad. The answer is unaffected.",
};

/** Trust and billing: what the product enforces, and what a receipt does and does not show. */
export const BILLING = {
  label: "Trust and billing",
  h2: "Pay for delivered cards. See every charge.",
  rules: [
    { k: "Labelled", v: "Every placement carries the word Sponsored, in a card separate from the answer." },
    { k: "Bounded", v: "A bid reserves budget. Only an accepted delivery becomes a charge." },
    { k: "Returned", v: "When a campaign closes, the app is paid and the unused deposit comes back." },
  ],
  receipt: "A receipt confirms an accepted, labelled insertion. It does not measure human attention.", // claim-ok: limit
  statement: {
    title: "Campaign statement",
    deposit: "Deposit",
    delivered: "Accepted deliveries",
    paid: "Paid to the app",
    refunded: "Returned to you",
    source: "A recorded test settlement, 7 October. Test USDC on Solana Devnet, no real value.", // claim-ok: limit
  },
  settle: "Charges add to one running total and settle in stablecoin when the campaign closes.",
};

/** What works in the test workspace, and directions that are not offered yet. */
export const STATUS = {
  label: "Where it stands",
  h2: "Working today, in a test workspace.",
  nowLabel: "Today",
  now: ["Advertiser dashboard", "Integration guide and source SDK", "Example chat with a separate Sponsored card", "Per delivery accounting and test settlement"],
  nextLabel: "Directions, not offered yet",
  next: ["Accounts for real advertisers and apps", "More categories", "A packaged SDK", "Sponsored access and inference funding", "Discovery for agents"], // claim-ok: planned
};

/** How it works: one rail, seven stations, the exchange's rules as captions. */
export const HOW = {
  label: "How it works",
  h2: "AI agents judge each moment. Fixed rules set the price.",
  steps: [
    "Someone asks an AI app a buying question.",
    "Jev judges if the moment fits each advertiser; a fixed rule makes it bid or skip.",
    "The auction engine checks budgets and picks the highest valid bid.",
    "A Sponsored card earns one charge after accepted delivery; the channel settles on Solana.",
  ],
  tagline: "Agents judge fit. Fixed auction rules control money. Recorded example shown.",
  mustStore: "must store crypto",
  evidence: "ContextHint evidence",
  withJev: "with Jev",
  bidWord: "bid",
  skipWord: "skip",
  outLine: "kept out by a fixed rule",
  tie: "ties: a fixed rule",
  beside: "beside the answer, never in it",
  receipt: "accepted receipt = one charge",
  oneClose: "one close on Solana",
};

/** ContextHint: existing audience and accumulated evidence, never AXP adoption. */
export const CONTEXTHINT = {
  label: "Our starting advantage",
  what: "We founded ContextHint, the ChatGPT ad intelligence platform.",
  moat: "Real ad data.",
  moatAccent: "Existing distribution.",
  advantages: [
    { label: "Distribution", big: "1,000+", small: "marketers use ContextHint daily", detail: "An existing audience for AXP." },
    { label: "Data", big: "Tens of thousands", small: "of observed ChatGPT ads", detail: "Hundreds of thousands of placements." },
  ],
  use: "AXP uses embeddings from ContextHint data to retrieve relevant ad context.",
  provenance: "ContextHint usage is founder-reported. Its users are not AXP customers.",
  wallLabel: "ChatGPT ads observed by ContextHint.",
  action: "Visit ContextHint",
};

const J = JEV_EXAMPLE;
const conf = (x: number) => `${Math.round(x * 100)}% confident`;
/** Jev: one real judgment from the run (ClearVault, the cached question). */
export const JEV_SECTION = {
  label: "Decisions with Jev",
  h2: "Evidence in. Buying judgment out.",
  note: "Recorded Jev judgment from our Devnet example.",
  inLabel: "In",
  inputs: ["The question", `${CV.name}'s campaign`, "Its ContextHint evidence"],
  outLabel: "Jev returns",
  outputs: [
    { k: "Relevance", v: "Direct fit", level: J.relevanceLevel, value: J.relevanceConfidence, conf: conf(J.relevanceConfidence) },
    { k: "Buying intent", v: "Ready to buy", level: J.intentLevel, value: J.intentConfidence, conf: conf(J.intentConfidence) },
    { k: "Creative", v: "Fits", level: 3, value: J.creativeConfidence, conf: conf(J.creativeConfidence) },
  ],
  rule: "Fixed rule: bid",
  codeLabel: "Auction engine sets the amount",
  bid: usdc(policyBid(J.relevanceLevel, J.intentLevel, CV.maxBid)),
  cap: "the cap",
  credit: "Built with Jev by TypeSafe",
};

/** Solana payment channels. The main run settled live on public Solana Devnet in Circle's Devnet USDC. */
export const SOLANA = {
  label: "Settlement on Solana",
  h2: "Paid per ad. Settled once.",
  lede: "Vouchers off chain, one close on chain: no transaction per ad, so ads costing a fraction of a cent can be paid per delivery.",
  onChain: "On Solana",
  offChain: "Off chain, signed",
  open: "Open",
  deposit: `${usdc(latestSettlement.channels[0]!.deposit)} deposit`,
  voucher: "Voucher",
  total: "total",
  close: "Close",
  paid: `${usdc(latestSettlement.channels[0]!.paid)} to the app`,
  refund: `${usdc(latestSettlement.channels[0]!.refunded)} refunded`,
  vouchers: latestSettlement.channels[0]!.vouchers.map((v) => usdc(v.cumulative)),
  devnetH: "Finalized today. Follow the money.",
  explorerChannels: latestSettlement.channels.map((ch) => ({ name: ch.name, ch })),
  openTx: "Open",
  closeTx: "Close",
  channel: "Channel",
  program: "Program",
  programUrl: latestSettlement.programUrl,
  live: "Recorded Devnet example",
  token: "Circle Devnet USDC",
  tokenUrl: latestSettlement.mintUrl,
  note: "Public Solana Devnet, test USDC, no real value.", // claim-ok: limit
  kfPaid: usdc(KF_CHANNEL.settled),
};

/** The story's spine: the same question, carried through the three pillar chapters. */
export const SPINE = {
  ch: { n: "1", state: "Evidence: past examples, an audience" },
  jev: { n: "2", state: "Judged: bid, a direct fit" },
  sol: { n: "3", state: "Settled on Solana, one close" },
} as const;

/** Inside the MVP: four framed captures, each linking to its page. */
export const MVP_TOUR = {
  label: "Inside the MVP",
  h2: "Open the whole run.",
  action: "Open the MVP",
  tiles: [
    { key: "overview", title: "The whole run", href: mvp("/"), alt: "The MVP overview: the demo AI app with its Sponsored card, the run's totals and the auctions." },
    { key: "opportunity", title: "One auction", href: mvp("/opportunity/1/"), alt: "The MVP opportunity page: every stage from the moment to the charge." },
    { key: "settlement", title: "Both Solana channels", href: mvp("/settlement/"), alt: "The MVP settlement page: deposits, payouts, refunds and each channel's vouchers." },
    { key: "verify", title: "Verify, then tamper", href: mvp("/verify/"), alt: "The MVP verify page after a one byte tamper: checks fail on the copy." },
  ],
};

export const PROOF = {
  label: "Proof",
  h2: "It ran. Check it.",
  run: `Replay of a live Solana Devnet run, ${RUN.runDate}.`,
  figures: [
    { n: RUN.counts.questions, k: "questions" },
    { n: RUN.counts.decisions, k: "agent decisions" },
    { n: RUN.counts.receipts, k: "signed deliveries" },
    { n: RUN.counts.channels, k: "Solana channels" },
  ],
  verify: "Verify it yourself",
  verifySub: `${RUN.mvp.verifyChecks ?? "All"} checks run in your browser`,
  video: "Watch the run",
  realSummary: "What's real, what's illustrative",
  real: `Real: the questions, answers, ${RUN.counts.decisions} judgments, auctions, receipts and channels.`,
  illustrative: "Illustrative: the motion, the wall's bidding and the advertisers, who are fictional.",
  limits: "Devnet test USDC, no real value. One run: a demonstration, not a benchmark.", // claim-ok: limit
};

/** Working now vs building next. Planned items are marked, never claimed. */
export const NEXT = {
  h3: "Working now. Building next.",
  now: ["Advertiser dashboard", "Publisher SDK", "Agent bids", "Eligibility in code", "Signed receipts", "Solana channels"],
  nextLabel: "Planned:",
  next: ["Planning agents", "More categories", "x402 adapter", "Mainnet, after Devnet", "Network fees", "Measurement"], // claim-ok: planned
};

export const VIDEO = {
  title: "axp.one live Devnet run, four minute walkthrough",
  caption: "From our live Devnet run.",
  chapters: ["People ask AI apps what to buy", "A question in an AI app", "One live run, three fictional advertisers", "What the agents were shown", "What the agents decided", "Code sets the price", "Award, receipt, charge", "A cap and a no-fill", "Why Solana: paid once per channel", "Check it yourself", "What the run shows"],
};

export const CLOSING = {
  h2: "Start from your side.",
  paths: [
    { who: "Advertisers", line: "Create a campaign in the test workspace.", action: "Open the advertiser dashboard", href: ADVERTISER_URL },
    { who: "AI apps", line: "Three steps: request, render, acknowledge.", action: "Read the integration guide", href: "/sdk/" },
    { who: "Everyone", line: "Ask a question and inspect the placement.", action: "Try the example chat", href: PUBLISHER_URL },
  ],
  video: "Watch the walkthrough",
  note: "The demo is a shared test workspace with fictional advertisers and test USDC.",
};

/** Verified local fixture workload, separate from the recorded Devnet execution. */
export const LEDGER_BENCHMARK = {
  label: "Local ledger benchmark",
  h2: "1M+ voucher updates",
  mode: "Offline fixtures. Simulated settlement.",
  channels: "16,448 simulated channels",
  updates: "64 updates",
  close: "1 close",
  note: "Per channel, a threshold close follows cumulative updates. No native transactions or provider calls.",
  action: "Read the methodology",
  href: "https://github.com/AkshatGada/axp-one/blob/main/BENCHMARK.md",
  native: {
    label: "Solana Devnet",
    h3: "125 channels settled",
    mode: "824 cumulative voucher updates.",
    updates: "Signed vouchers",
    close: "1 close per channel",
    note: "1.236 test USDC paid · 5.014 refunded.",
  },
};

export const FOOTER = {
  scope: ["A shared test workspace. Fictional advertisers.", "Test USDC on Solana Devnet. Not mainnet."], // claim-ok: limit
  evidenceLabel: "Technical evidence",
  evidence: [
    { label: "Original MVP and recorded runs", href: MVP_URL },
    { label: "Benchmark methodology", href: "https://github.com/AkshatGada/axp-one/blob/main/BENCHMARK.md", external: true },
  ],
  proof: "A finalized test settlement",
  base: "axp.one",
};

/** Shown on plates (short, from the run). */
export const RUNTEXT = { bid };
