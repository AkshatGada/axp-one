// FROZEN SHARED COPY for the V4 landing (owner: the orchestrator). Builders import their movement's
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
  { href: "#apps", label: "For AI apps" },
  { href: "#rule", label: "The rule" },
];

/** 00 Cover. */
export const COVER = {
  h1: "The advertising network for the agentic internet.",
  accent: "agentic internet.",
  deck: "People now ask AI what to buy. axp.one places one labelled ad below the answer, only when it fits.",
  primary: { label: "Open the advertiser dashboard", href: ADVERTISER_URL },
  secondary: { label: "Read the integration guide", href: GUIDE_URL },
  note: "Illustrative questions and brands.",
};

/** 01 The shift. */
export const SHIFT_COPY = {
  no: "01",
  title: "The shift",
  before: "People used to search.",
  after: "Now they ask.",
  close: "A question says what a keyword never could.",
};

/** 02 One question: the film. One line per beat. */
export const FILM = {
  no: "02",
  title: "One question",
  h: "Follow one question.",
  beats: [
    { k: "Asked", line: "Someone asks." },
    { k: "Answered", line: "The app answers, in its own words." },
    { k: "Judged", line: "Each advertiser's agent reads the moment." },
    { k: "Placed", line: "One card appears. Below the answer. Labelled." },
    { k: "Recorded", line: "A receipt is written." },
  ],
  coda: "And when nothing fits, nothing appears.",
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
  see: { k: "See why", line: "Every yes and every no comes with its reason." },
  action: { label: "Open the advertiser dashboard", href: ADVERTISER_URL },
};

/** 04 For AI apps. */
export const APPS = {
  no: "04",
  title: "For AI apps",
  h: "Your answer stays yours.",
  points: [
    { k: "Your model", line: "It writes the answer." },
    { k: "One slot", line: "Below the answer, labelled." },
    { k: "Your rules", line: "You choose what you allow." },
    { k: "You earn", line: "Each confirmed card accrues to you." },
  ],
  empty: "No ad fits. Nothing is shown.",
  code: "Three calls: request, render, confirm.",
  action: { label: "Read the integration guide", href: GUIDE_URL },
};

/** 05 The rule, and the doors. */
export const RULE = {
  no: "05",
  title: "The rule",
  lines: ["Agents judge fit.", "Fixed rules decide money."],
  agree: [
    { k: "The advertiser's limits", kind: "rule" as const, on: "Within limits", off: "Outside limits" },
    { k: "The app's rules", kind: "rule" as const, on: "Allowed", off: "Not allowed" },
    { k: "The fit", kind: "judgment" as const, on: "Judged a fit", off: "Judged not a fit" },
  ],
  none: "No card, no receipt.",
};

export const DOORS = {
  h: "Start from your side.",
  doors: [
    { who: "Advertisers", line: "Describe your offer. Approve your ad.", action: "Open the advertiser dashboard", href: ADVERTISER_URL },
    { who: "AI apps", line: "Add one slot below your answer.", action: "Read the integration guide", href: GUIDE_URL },
  ],
  also: [
    { label: "Try the example chat", href: CHAT_URL },
    { label: "Watch the walkthrough", href: VIDEO_URL },
  ],
};

export const FOOTER = { line: "The advertising network for the agentic internet" };
