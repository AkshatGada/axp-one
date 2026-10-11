// The sentence, derived from the frozen story data: which words were already in the search
// (they travel out of the field), which are new (they arrive), and which carry each thing the
// question says (they light). Nothing here is typed by hand except the line breaks and the clock.
import { SHIFT } from "../story";

const clean = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");

export type Word = {
  /** Position in the sentence. */
  i: number;
  text: string;
  /** A keyword that was already in the search: it travels from the field. */
  travels: boolean;
  /** It shared one keyword with another word ("hardware wallet"). */
  paired?: boolean;
  /** Order among the travellers, or among the arrivals. */
  order: number;
  /** Which of SHIFT.says this word carries (index), if any. */
  says?: number;
  /** Position inside its phrase, and the phrase length (for the left to right wipe). */
  sayAt?: number;
  sayOf?: number;
  /** The last underlined word of its phrase: the underline stops at the word. */
  sayEnd?: boolean;
};

const keywordWords = SHIFT.keywords.flatMap((k) => k.split(" ")).map(clean);
const raw = SHIFT.question.split(" ");
const lastRaw = raw[raw.length - 1] ?? "";
/** The closing mark of the question ("?"), set as its own glyph so it can arrive on its own. */
export const MARK = lastRaw.replace(/[A-Za-z0-9]/g, "");
const texts = raw.map((w, i) => (i === raw.length - 1 ? w.slice(0, w.length - MARK.length) : w));

let nTravel = 0;
let nArrive = 0;
export const WORDS: Word[] = texts.map((text, i) => {
  const travels = keywordWords.includes(clean(text));
  const paired = travels && SHIFT.keywords.some((k) => k.includes(" ") && k.split(" ").map(clean).includes(clean(text)));
  return { i, text, travels, paired, order: travels ? nTravel++ : nArrive++ };
});
/** The mark arrives last. */
export const MARK_ORDER = nArrive;
export const ARRIVALS = nArrive + 1;

/** A phrase found word for word in the sentence lights those words. A phrase that is not there
 *  ("ready to choose") is what the form of the question says: its first word and its mark. */
export let IMPLIED = -1;
SHIFT.says.forEach((phrase, n) => {
  const want = phrase.split(" ").map(clean);
  const at = WORDS.findIndex((_, i) => want.every((w, j) => clean(WORDS[i + j]?.text ?? "") === w));
  if (at < 0) {
    IMPLIED = n;
    const first = WORDS[0];
    if (first) Object.assign(first, { says: n, sayAt: 0, sayOf: 2, sayEnd: true });
    return;
  }
  want.forEach((_, j) => {
    const w = WORDS[at + j];
    if (w) Object.assign(w, { says: n, sayAt: j, sayOf: want.length, sayEnd: j === want.length - 1 });
  });
});

/** Keywords that never made it into the question ("best"): they are struck and fall away. */
export const DROPPED = SHIFT.keywords.filter((k) => !k.split(" ").some((w) => texts.map(clean).includes(clean(w))));

/** The search field, term by term, in the order typed. */
export const TERMS = SHIFT.keywords.map((k) => ({ text: k, dropped: DROPPED.includes(k), words: k.split(" ") }));

/** Line breaks: after these word positions. Wide: four lines that fill the measure. Narrow:
 *  seven short lines, so the type can be very large on a phone. */
export const BREAK_WIDE = new Set([1, 4, 7]);
export const BREAK_NARROW = new Set([0, 1, 3, 5, 7, 9]);

/** Where each marginal note sits (index into SHIFT.says), following the breaks above: beside
 *  line `row` (from 0), starting `x` ems of the question's size from the left margin. "below" hangs
 *  it under the end of the last line. A note sits next to the words that say it. */
export type Place = { row: number; x: number } | "below";
export const NOTE_WIDE: Place[] = [{ row: 2, x: 7.76 }, "below", { row: 0, x: 7.76 }];
export const NOTE_NARROW: Place[] = [{ row: 3, x: 4.0 }, { row: 6, x: 3.96 }, { row: 0, x: 3.1 }];

/** The clock. Every value is a point on the stage's 0 to 1 progress: [start, length]. */
export const CLOCK = {
  headOut: [0.02, 0.06], // "People used to search." leaves, word by word
  strike: [0.04, 0.06], // "best" is struck
  headIn: [0.115, 0.07], // "Now they ask." takes its place at the same size
  drop: [0.13, 0.06], // "best" falls away
  chrome: [0.13, 0.07], // lens, caret, key and the sides of the field let go
  travel: [0.17, 0.26], // the keywords leave the field, and its two hairlines part with them
  shrink: [0.19, 0.17], // the statement steps back to a running head as the question takes the stage
  arrive: [0.42, 0.085],
  arriveStep: 0.017,
  says: 0.67, // the first of three beats: each phrase holds the stage alone
  saysStep: 0.07,
  saysRamp: 0.022,
  light: 0.045, // how long a phrase takes to light inside its beat
  close: [0.885, 0.06],
  closeStep: 0.008,
} as const;
