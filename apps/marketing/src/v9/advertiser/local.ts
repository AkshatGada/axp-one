// Local microcopy and the scripted rules of the advertiser specimen. Everything here is local to
// this scene: labels, short forms of the story's questions and reasons, and what each question
// asks for. It obeys the story rules in v8/story.ts: a campaign has only what its advertiser
// declared, relevance and commercial intent are different things, and outcomes are words.
import { ADVERTISER, MOMENTS, type Moment } from "../story";

export type CapId = "device" | "offline" | "eth" | "sol" | "btc";

/** The declared capabilities (from the story, in its order) plus one the advertiser did not declare. */
export const CAPS: { id: CapId; label: string; declared: boolean }[] = [
  { id: "device", label: ADVERTISER.capabilities[0], declared: true },
  { id: "offline", label: ADVERTISER.capabilities[1], declared: true },
  { id: "eth", label: ADVERTISER.capabilities[2], declared: true },
  { id: "sol", label: ADVERTISER.capabilities[3], declared: true },
  { id: "btc", label: "Bitcoin", declared: false },
];
export const DECLARED: CapId[] = CAPS.filter((c) => c.declared).map((c) => c.id);

/** The four questions the reader met in the previous scene, in a short recognisable form, with
 *  what each asks for as things an advertiser could declare. `rulesOut` is a declared capability
 *  the question excludes; `other` is something that cannot be declared in this illustration. */
type Ask = { short: string; needs: CapId[]; other?: string; rulesOut?: CapId; learning?: boolean };
const ASKS: Record<string, Ask> = {
  compare: { short: "Wallet for Ethereum and Solana?", needs: ["device", "offline", "eth", "sol"] },
  mobile: { short: "Mobile-only Solana wallet?", needs: [], other: "mobile app", rulesOut: "device" },
  learn: { short: "How do offline keys work?", needs: [], learning: true },
  bitcoin: { short: "Cheapest Bitcoin hardware wallet?", needs: ["device", "btc"] },
};
export const SHOWN = ["compare", "mobile", "learn", "bitcoin"] as const;

export type Gate = "running" | "paused" | "pending";
export type Verdict = "joined" | "may" | "left" | "held";
/** A line from a declared (or missing) capability to a question that asks for it or rules it out. */
export type Link = { cap: CapId; met: boolean; clash: boolean };
export type Decision = { id: string; question: string; full: string; verdict: Verdict; reason: string; links: Link[]; eligible: boolean };

export const VERDICT: Record<Verdict, string> = { joined: "Joined", may: "May join", left: "Left alone", held: "Held" };

export const L = {
  actorYou: "You",
  actorAgent: "The agent",
  declared: "declared",
  notDeclared: "not declared",
  reset: "Reset",
  approved: "Approved",
  pendingState: "Not approved",
  draft: "Draft",
  edit: "Edit",
  editLabel: "Change a word",
  approve: "Approve",
  undo: "Undo",
  ceiling: "per placement",
  budget: "budget",
  running: "Running",
  paused: "Paused",
  switchLabel: "Run this campaign",
  heldPaused: "Paused",
  heldPending: "Awaiting approval",
  spokenPaused: "Paused by you. Nothing joins until you resume.",
  spokenPending: "Your new words are not approved yet. Nothing runs.",
  spokenRunning: "Running.",
  noChange: "No decision changed.",
} as const;

/** The approved text from the story, and one scripted edit: a single word. */
export const WORDS = {
  a: ADVERTISER.creative,
  b: ADVERTISER.creative.replace(/^Keep/, "Take"),
  changed: { a: "Keep", b: "Take" },
} as const;

const label = (id: CapId) => CAPS.find((c) => c.id === id)!.label;

/** Reasons are two or three words in the slot they explain (the story's sentences are their source). */
function decide(m: Moment, has: Set<CapId>, gate: Gate): Decision {
  const ask = ASKS[m.id]!;
  const links: Link[] = ask.needs.map((cap) => ({ cap, met: has.has(cap), clash: false }));
  if (ask.rulesOut && has.has(ask.rulesOut)) links.push({ cap: ask.rulesOut, met: true, clash: true });
  const base = { id: m.id, question: ask.short, full: m.question, links, eligible: false };
  // Learning, not choosing: no ad belongs, whatever is declared.
  if (ask.learning) return { ...base, verdict: "left", reason: "Learning, not choosing" };
  // Asks for something that was never declared (a mobile app), and rules out a device.
  if (ask.other) return { ...base, verdict: "left", reason: ask.rulesOut && has.has(ask.rulesOut) ? "Device ruled out" : `No ${ask.other}` };
  const missing = ask.needs.filter((id) => !has.has(id)).map(label);
  if (missing.length) return { ...base, verdict: "left", reason: `${missing.join(", ")} not declared` };
  if (gate !== "running") return { ...base, eligible: true, verdict: "held", reason: gate === "paused" ? L.heldPaused : L.heldPending };
  if (m.outcome === "placed") return { ...base, eligible: true, verdict: "joined", reason: "" };
  // A question the story left alone only because of a missing declaration, now declared.
  return { ...base, eligible: true, verdict: "may", reason: "" };
}

export function decideAll(has: Set<CapId>, gate: Gate): Decision[] {
  return SHOWN.map((id) => decide(MOMENTS.find((m) => m.id === id)!, has, gate));
}

/** What a change did, for the live region: the questions whose decision moved, and to what. */
export function changeNote(before: Decision[], after: Decision[]): string {
  const changed = after.filter((d, i) => d.verdict !== before[i]!.verdict || d.reason !== before[i]!.reason);
  if (!changed.length) return L.noChange;
  return changed.map((d) => `${d.question} ${VERDICT[d.verdict]}${d.reason ? `: ${d.reason}` : ""}.`).join(" ");
}
