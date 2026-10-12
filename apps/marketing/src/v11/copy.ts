// FROZEN SHARED COPY for the V5 landing (owner: the orchestrator). Builders import their movement's
// block and never edit this file; propose wording changes in your folder's NOTES.md.
// Rules: no em or en dashes; no trial, MVP, test, status or roadmap framing; no provider names,
// code, auction arithmetic or numbers that read as performance; no customers, partners or signup.
// Headlines are short. Words are headlines and captions; the pictures carry the story.
import latestSettlement from "@/data/settlement.latest.json";

export const ADVERTISER_URL = "/advertiser-dashboard/";
export const GUIDE_URL = "/sdk/";
export const CHAT_URL = "/publisher-demo/";
export const VIDEO_URL = "/demo/";
/** A real recorded settlement. Wherever this link appears it carries PROOF.label inside the link. */
export const PROOF = { href: latestSettlement.channels[0]?.closeUrl ?? null, text: "See a recorded settlement", label: "Solana Devnet, test USDC, 7 October 2026" };
export const CONTEXTHINT = { href: "https://contexthint.com", label: "ContextHint", description: "The intelligence platform for running ChatGPT ads." };

export const NAV = [
  { href: "#advertisers", label: "For advertisers" },
  { href: "#apps", label: "For conversational AI apps" },
  { href: "#payments", label: "Payments" },
];

/** 00 Cover. */
export const COVER = {
  h1: "The advertising network for the agentic internet.",
  accent: "agentic internet.",
  deck: "Reach people the moment they ask a conversational AI app what to buy. One labelled ad, below the answer, only when it fits.",
  primary: { label: "Open the advertiser dashboard", href: ADVERTISER_URL },
  secondary: { label: "Read the integration guide", href: GUIDE_URL },
  note: "Illustrative prompts.",
};

/** The companies that use the platform (the owner's list). Each logo is the company's own file
 *  from its official site, shown without its colours. `h` is the drawn height in px (optical);
 *  `tone: "grey"` keeps a mark's inner shading, the default draws it as one flat tone;
 *  `word` sets the name beside a mark that has no wordmark of its own. */
export const USERS: { label: string; logos: { name: string; src: string; h: number; tone?: "grey"; word?: boolean }[] } = {
  label: "Used by teams at",
  logos: [
    { name: "Bybit", src: "/customers/bybit.svg", h: 24 },
    { name: "Polygon", src: "/customers/polygon.svg", h: 25 },
    { name: "Sobha Realty", src: "/customers/sobha.svg", h: 38 },
    { name: "Miden", src: "/customers/miden.svg", h: 25 },
    { name: "Billions", src: "/customers/billions.svg", h: 24 },
    { name: "Infinity", src: "/customers/infinity.png", h: 26 },
    { name: "Merlin AI", src: "/customers/merlin.svg", h: 22 },
    { name: "Corsair", src: "/customers/corsair.png", h: 28, tone: "grey", word: true },
    { name: "Doe", src: "/customers/doe.svg", h: 25 },
    { name: "Conscious Engines", src: "/customers/conscious.svg", h: 38 },
    { name: "Metaborong", src: "/customers/metaborong.svg", h: 20, word: true },
  ],
};

/** 01 The shift. */
export const SHIFT_COPY = {
  no: "01",
  title: "The shift",
  before: "People used to search.",
  after: "Now they ask.",
  close: "A prompt says what a keyword never could.",
};

/** 02 One prompt: the film. One line per beat. */
export const FILM = {
  no: "02",
  title: "One prompt",
  h: "Follow one prompt.",
  beats: [
    { k: "Asked", line: "Someone asks." },
    { k: "Answered", line: "The conversational AI app answers, in its own words." },
    { k: "Judged", line: "Each advertiser's agent reads the moment." },
    { k: "Placed", line: "One card appears. Below the answer. Labelled." },
  ],
};

/** 03 For advertisers. */
export const ADVERTISERS = {
  no: "03",
  title: "For advertisers",
  h: "You set the terms.",
  verbs: [
    { k: "Describe", line: "What you sell, in your own words." },
    { k: "Approve", line: "The exact words. Nothing else runs." },
    { k: "Limit", line: "A ceiling, a budget, a pause." },
  ],
  see: { k: "See why", line: "Every placement comes with its reason." },
  action: { label: "Open the advertiser dashboard", href: ADVERTISER_URL },
};

/** 04 For conversational AI apps. */
export const APPS = {
  no: "04",
  title: "For conversational AI apps",
  h: "Your answer stays yours.",
  points: [
    { k: "Your model", line: "It writes the answer." },
    { k: "One slot", line: "Below the answer, labelled." },
    { k: "Your rules", line: "You choose what you allow." },
    { k: "You earn", line: "Each confirmed card accrues to you." },
  ],
  code: "Three calls: request, render, confirm.",
  action: { label: "Read the integration guide", href: GUIDE_URL },
};

/** 05 Agentic payments. The agent decides to buy; the payment follows on its own, inside limits
 *  the advertiser set. Truth: the agent judges and decides; fixed rules (the advertiser's ceiling
 *  and budget) bound every payment; a model never holds keys or chooses an amount. A charge is
 *  accepted per delivered card, charges add up, and settlement comes later in stablecoin. */
export const PAY = {
  no: "05",
  title: "Agentic payments",
  h: "The agent decides. The payment follows.",
  deck: "No insertion orders. No invoices. Each delivered card is paid for on its own, inside the limits you set.",
  steps: [
    { k: "Decide", line: "The advertiser's agent judges the moment a fit." },
    { k: "Deliver", line: "The labelled card is inserted below the answer." },
    { k: "Pay", line: "The delivery is charged, automatically, within your ceiling." },
    { k: "Settle", line: "Charges add up, then settle in stablecoin when the campaign closes." },
  ],
  principle: ["Agents judge fit.", "Fixed rules decide money."],
  /** Why each half is so. A prompt in plain language cannot be matched by static code; money can
   *  and must be. */
  why: [
    { k: "Why an agent", short: "Plain language. Only an agent can read it.", line: "A prompt arrives in plain language. No keyword list or fixed rule can read it. It takes an agent to judge it." },
    { k: "Why fixed rules", short: "Exact limits. Code enforces them.", line: "Money is the opposite. The ceiling and the budget are exact, so code enforces them, not a judgment." },
  ],
  sides: [
    { who: "Advertiser", state: "Charge accepted" },
    { who: "Conversational AI app", state: "Earnings accrued" },
  ],
  limit: "A receipt confirms insertion. It does not measure attention or conversions.", // claim-ok: limit
};

export const DOORS = {
  h: "Start from your side.",
  doors: [
    { who: "Advertisers", line: "Describe your offer. Approve your ad.", action: "Open the advertiser dashboard", href: ADVERTISER_URL },
    { who: "Conversational AI apps", line: "Add one slot below your answer.", action: "Read the integration guide", href: GUIDE_URL },
  ],
  also: [
    { label: "Try the example chat", href: CHAT_URL },
    { label: "Watch the walkthrough", href: VIDEO_URL },
  ],
};

export const FOOTER = { line: "The advertising network for the agentic internet" };
