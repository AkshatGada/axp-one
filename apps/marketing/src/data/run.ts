// Typed access to the recorded-run slice (src/data/run.generated.json, written by
// scripts/extract-specimens.mjs with arithmetic asserts). Every run value on the page comes
// from here; nothing is hand-typed.
import { formatBaseUnits, shortHash } from "@axp/design-system/foundation";
import slice from "./run.generated.json";

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
