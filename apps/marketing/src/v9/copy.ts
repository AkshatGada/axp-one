// FROZEN SHARED COPY for the V3 landing (owner: the integrator). Builders import their chapter's
// block and never edit this file; propose wording changes in your folder's NOTES.md.
// Rules: no em or en dashes; no trial, MVP, test workspace, status or roadmap framing; no provider
// names, code, auction arithmetic or dataset numbers; no customers, performance or signup claims.
// Each chapter opens on the customer's own question.
import { ADVERTISER_URL, PRODUCT_VIDEO_URL, PUBLISHER_URL } from "@/data/copy";

export const ILLUSTRATION = "Interactive illustration";
export const ILLUSTRATION_STILL = "Illustration";

/** 1. The hero: the wall of conversations. */
export const HERO = {
  h1: "The advertising network for the agentic internet.",
  accent: "agentic internet.",
  lede: "Reach people when they ask a question your product can help answer. AI apps earn from clearly labelled ads beside their own answers.",
  primary: "Open the advertiser dashboard",
  secondary: "Try the example chat",
  wallNote: "Illustrative questions and bidding.",
  focalNote: "Product flow illustration.",
  appName: "Example chat",
  slotLine: "Answer, then one Sponsored slot",
  answerLabel: "Answer",
  gap: "Separate from the answer",
  delivered: "Delivered",
};

/** 2. The exploded card: what sits behind one placement. Two to four words per plate. */
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
};

/** 3. The moment: short, and new information. Same topic, different moments. */
export const MOMENT = {
  who: "The moment",
  question: "When does an ad belong in an answer?",
  lede: "Only when someone is choosing, and needs what you offer.",
  hint: "Pick a question",
  noAd: "No ad. The answer stands alone.",
};

/** 4. The advertiser's side: earning confidence in delegated buying. */
export const ADVERTISER_SIDE = {
  who: "For advertisers",
  question: "How do I trust an agent to buy for me?",
  lede: "You set the terms. It decides moment by moment, and shows you why.",
  beats: [
    { k: "Say where you belong", v: "Your offer, what it can do, and the conversations you want, in your own words." },
    { k: "See every decision", v: "Each question it joined, and each one it left alone, with the reason." },
    { k: "Approve what is said", v: "Your exact words, or nothing. An edit needs your approval again." },
    { k: "Bound what is spent", v: "A ceiling per placement and a total budget. Pause whenever you want." },
  ],
  action: { label: "Open the advertiser dashboard", href: ADVERTISER_URL },
};

/** 5. The app's side: the same placement, from where the answer is written. */
export const PUBLISHER_SIDE = {
  who: "For AI apps",
  question: "Can my app earn without the ad touching my answer?",
  lede: "Your model writes the answer. The ad sits beside it, in a slot you control.",
  bridge: "The same placement, from the app's side.",
  points: [
    { k: "Your answer path", v: "In our integration, no advertiser material reaches it." },
    { k: "Your rules", v: "Choose the categories you carry and where the slot sits." },
    { k: "Your earnings", v: "Each confirmed card accrues to your app." },
  ],
  empty: "No qualifying ad. Nothing is shown.",
  action: { label: "Read the integration guide", href: "/sdk/" },
  code: "Three calls: request, render, confirm.",
};

/** 6. Where they meet: one network, and the small truth about money. */
export const MEET = {
  who: "One network",
  question: "What makes it one network?",
  lede: "A card exists only when three things agree.",
  agree: [
    { k: "The advertiser's limits", v: "Declared offer, approved words, budget left." },
    { k: "The app's rules", v: "An open slot, in a category it carries." },
    { k: "The fit", v: "An agent's judgment that this moment suits this offer." },
  ],
  rule: "Agents judge fit. Fixed rules decide money.",
  proof: "See a recorded settlement",
  proofLabel: "Solana Devnet, test USDC, 7 October 2026",
};

/** 7. Two doors. Existing routes only; the commercial destination is an open handoff decision. */
export const DOORS = {
  h2: "Start from your side.",
  doors: [
    { who: "Advertisers", line: "Describe your offer and approve your ad.", action: "Open the advertiser dashboard", href: ADVERTISER_URL },
    { who: "AI apps", line: "Add a Sponsored slot beside your answer.", action: "Read the integration guide", href: "/sdk/" },
  ],
  also: [
    { label: "Try the example chat", href: PUBLISHER_URL },
    { label: "Watch the walkthrough", href: PRODUCT_VIDEO_URL },
  ],
};
