// All landing copy (v7), in one place so scripts/lint-copy.mjs can scan it.
// v7 rule: visual first, words are captions. One display line per section, at most one short
// sentence, then the visual. Whole page under 450 words.
// Standing rules: no em or en dashes; no internal details (IDs, hashes, policy names, model
// versions, level shorthands, base units); scale words for ContextHint's library (exact figures
// live on contexthint.com and in the MVP); no partnership, enrollment, lift, attention, conversion,
// mainnet or x402 claims (a planned item or a stated limit carries a claim-ok comment).
// Run numbers come from run.ts (written by scripts/extract-specimens.mjs with asserts).
import { JEV, LIBRARY, TRACTION } from "./library";
import { CACHED, CV, CV_CHANNEL, DEVNET, JEV_EXAMPLE, KF, KF_CHANNEL, LG, RUN, policyBid, usdc } from "./run";

/** The MVP: the product-ui dev server in development, /mvp/ in the merged static build. */
export const MVP_URL = process.env.NEXT_PUBLIC_MVP_URL || (process.env.NODE_ENV === "development" ? "http://localhost:3420/" : "/mvp/");
const mvp = (path: string) => `${MVP_URL.replace(/\/$/, "")}${path}`;
export const MVP_VERIFY_URL = mvp("/verify/");
export const CH_URL = LIBRARY.url;
export const JEV_URL = JEV.url;
export const SOLANA_URL = "https://solana.com";
/** The ClearVault channel's close on Solana Devnet: the transaction that paid the AI app. */
export const DEVNET_URL = DEVNET?.channels[0]?.closeUrl ?? null;
export const VIDEO_ANCHOR = "#video";

const bid = usdc(CACHED.bids[0]!.amount);

export const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#data", label: "ContextHint data" },
  { href: "#jev", label: "Jev" },
  { href: "#solana", label: "Solana" },
  { href: "#mvp", label: "The MVP" },
];
export const HEADER = { chip: "Hackathon MVP", cta: "See the MVP" };

export const HERO = {
  h1: "The advertising exchange for the agentic internet.",
  accent: "agentic internet.",
  lede: "Advertiser agents bid for a disclosed slot beside AI answers. Code sets the price; Solana pays the app.",
  primary: "See the working MVP",
  status: "Live on public Solana Devnet, test USDC.",
  devnet: "View on Explorer",
  trio: [
    { k: "", name: "ContextHint", rest: ", the intelligence platform for ChatGPT ads", href: LIBRARY.url, tone: "ch" },
    { k: "Decisions", name: "Jev", rest: "", href: JEV.url, tone: "jev" },
    { k: "Settlement", name: "Solana", rest: "", href: SOLANA_URL, tone: "sol" },
  ],
  wallNote: "Questions observed by ContextHint. Bidding illustrative.",
  focalNote: "From our live Devnet run. ClearVault is fictional.",
  /** Shown inside the focal tile (the run's own records). */
  appName: "Our demo AI app",
  slotLine: "Answer, then one Sponsored slot",
  answerLabel: "Answer, excerpt",
  gap: "Separate from the answer",
};

/** The exploded card: six plates behind the one Sponsored card. Two to four words each. */
export const STACK = {
  line: "Behind one Sponsored card, a whole exchange.",
  note: "From our live Devnet run.",
  plates: {
    answer: { name: "Answer", note: "written without ads" },
    card: { name: "Card", note: "labelled Sponsored" },
    auction: { name: "Auction", note: "decided in code" },
    agents: { name: "Agents", note: "judged with Jev" },
    evidence: { name: "Evidence", note: "from ContextHint" },
    payment: { name: "Payment", note: "settled on Solana" },
  },
  price: "Highest bid wins; price set in code",
  ruledOut: "ruled out",
};

/** How it works: one rail, seven stations, the exchange's rules as captions. */
export const HOW = {
  label: "How it works",
  h2: "AI agents judge each moment. Fixed rules set the price.",
  steps: [
    "Someone asks an AI app a buying question.",
    "Jev judges if the moment fits each advertiser; a fixed rule makes it bid or skip.",
    "Code sets the price, checks the rules, picks the winner.",
    "One Sponsored card beside the answer, paid only after delivery, settled on Solana.",
  ],
  tagline: "Agents advise. Code decides the money.",
  mustStore: "must store crypto",
  evidence: "ContextHint evidence",
  withJev: "with Jev",
  bidWord: "bid",
  skipWord: "skip",
  outLine: "kept out by a fixed rule",
  tie: "ties: a fixed rule",
  beside: "beside the answer, never in it",
  receipt: "signed receipt = the charge",
  oneClose: "one close on Solana",
};

/** ContextHint: the data chapter. Scale words only. */
export const CONTEXTHINT = {
  label: "Data from ContextHint",
  what: "ContextHint is the intelligence platform for ChatGPT ads.",
  moat: "An auction is code. Evidence must be collected;",
  moatAccent: "ContextHint collects it.",
  scale: [
    { big: "Thousands", small: "of advertisers" },
    { big: "Tens of thousands", small: "of ads" },
    { big: "Hundreds of thousands", small: "of placements" },
    { big: "A dozen", small: "countries" },
  ],
  traction: TRACTION.line,
  use: "Agents get a few real past examples and an inferred audience.",
  wallLabel: "Real ads observed in ChatGPT. Not axp.one advertisers; no relationship implied.",
  action: "Visit ContextHint",
};

const J = JEV_EXAMPLE;
const conf = (x: number) => `${Math.round(x * 100)}% confident`;
/** Jev: one real judgment from the run (ClearVault, the cached question). */
export const JEV_SECTION = {
  label: "Decisions with Jev",
  h2: "One real judgment.",
  inLabel: "In",
  inputs: ["The question", `${CV.name}'s campaign`, "Its ContextHint evidence"],
  outLabel: "Jev returns",
  outputs: [
    { k: "Relevance", v: "Direct fit", level: J.relevanceLevel, value: J.relevanceConfidence, conf: conf(J.relevanceConfidence) },
    { k: "Buying intent", v: "Ready to buy", level: J.intentLevel, value: J.intentConfidence, conf: conf(J.intentConfidence) },
    { k: "Creative", v: "Fits", level: 3, value: J.creativeConfidence, conf: conf(J.creativeConfidence) },
  ],
  rule: "Fixed rule: bid",
  codeLabel: "Code sets the amount",
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
  deposit: `${usdc(CV_CHANNEL.deposit)} deposit`,
  voucher: "Voucher",
  total: "total",
  close: "Close",
  paid: `${usdc(CV_CHANNEL.settled)} to the app`,
  refund: `${usdc(CV_CHANNEL.refund)} refunded`,
  vouchers: CV_CHANNEL.vouchers.map((v) => usdc(v.cumulative)),
  devnetH: "Settled on Solana. Check it yourself.",
  explorerChannels: [
    { name: CV.name, ch: DEVNET?.channels.find((c) => c.campaign === "v3-clearvault") ?? null },
    { name: KF.name, ch: DEVNET?.channels.find((c) => c.campaign === "v3-keyforge") ?? null },
  ],
  openTx: "Open",
  closeTx: "Close",
  channel: "Channel",
  program: "Program",
  programUrl: DEVNET?.programUrl ?? null,
  live: "Live on Solana Devnet",
  token: "Circle Devnet USDC",
  tokenUrl: DEVNET?.mintUrl ?? null,
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
  h2: "Disclosed. Decided in code. Paid on delivery.",
  primary: "See the working MVP",
  video: "Watch the video",
  contexthint: "Explore ContextHint",
};

export const FOOTER = {
  scope: ["Live on Solana Devnet, test USDC. Not mainnet.", `${CV.name}, ${KF.name} and ${LG.name} are fictional.`], // claim-ok: limit
  contexthint: "contexthint.com",
  jev: { text: "Built with", name: JEV.name, url: JEV.url },
  solana: "Settled on Solana",
  base: "axp.one",
};

/** Shown on plates (short, from the run). */
export const RUNTEXT = { bid };
