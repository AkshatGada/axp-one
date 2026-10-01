// Typed access to the landing slice (src/data/run.landing.json: only what the page renders, written by
// scripts/extract-specimens.mjs with arithmetic asserts). Every run value on the page comes
// from here; nothing is hand-typed.
import { formatBaseUnits, shortHash } from "@axp/design-system/foundation";
import slice from "./run.landing.json";

export const RUN = slice;
export type Turn = (typeof slice.turns)[number];
export type Decision = Turn["decisions"][number];
export type Channel = (typeof slice.channels)[number];
export type Receipt = (typeof slice.receipts)[number];

/** 6-decimal base units to a display amount: "4000" -> "0.004". */
export const usdc = (base: string | number) => formatBaseUnits(base);
export { shortHash };

const turn = (id: string) => slice.turns.find((t) => t.id === id)!;
export const CACHED = turn("v3-cached");
export const OFFLINE = turn("v3-offline");
export const REPEAT = turn("v3-repeat");
export const MOBILE = turn("v3-mobile");

const channel = (c: string) => slice.channels.find((x) => x.campaign === c)!;
export const CV_CHANNEL = channel("v3-clearvault");
export const KF_CHANNEL = channel("v3-keyforge");
export const CV = slice.campaigns["v3-clearvault"];
export const KF = slice.campaigns["v3-keyforge"];
export const LG = slice.campaigns["v3-leatherguard"];

export const decision = (t: Turn, campaign: string, arm: "history" | "text_only") => t.decisions.find((d) => d.campaign === campaign && d.arm === arm)!;
export const receiptFor = (turnId: string) => slice.receipts.find((r) => r.turn === turnId)!;

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
/** A count as a capitalised word ("Two"); falls back to digits above ten. */
export const word = (n: number) => WORDS[n] ?? String(n);
export const lower = (n: number) => word(n).toLowerCase();

/** The cached answer from its helpful part on: the recorded second sentence, verbatim,
 *  marked as an excerpt with a leading ellipsis (the opening sentence is a caveat). */
export const HELPFUL_EXCERPT = `…${CACHED.organic.excerpt.split(/(?<=[.!?])\s+/)[1] ?? CACHED.organic.excerpt}`;

/** The recorded bid policy in plain arithmetic (max bid x level weight), for copy that says what a
 *  judgment would have bid. Mirrors packages/contracts computeBid; the extractor asserts parity. */
const BPS: Record<string, number> = { "2:2": 5000, "2:3": 7500, "3:2": 7500, "3:3": 10000 };
export const policyBid = (rel: number, intent: number, maxBid: string) => String((Number(maxBid) * (BPS[`${rel}:${intent}`] ?? 0)) / 10000);

/** The public Devnet re-settlement of the run's three receipts (explorer links read by the extractor). */
export const DEVNET = (slice as { devnet?: typeof slice.devnet }).devnet ?? null;
/** One real Jev judgment from the run (ClearVault, history arm, cached question). */
export const JEV_EXAMPLE = slice.jev;
