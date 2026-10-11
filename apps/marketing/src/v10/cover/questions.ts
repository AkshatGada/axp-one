// Local picture data for the cover. Everything here is an illustration: everyday questions,
// short answers in the app's own voice, and invented brands on reserved .example domains.
// Story rules kept: the card is only ever below an answer; outcomes are words; no numbers.
import { ADVERTISER, ANSWER, MOMENTS, NO_AD, QUESTION } from "../story";

export type Moment = {
  q: string;
  /** The words of the question that carry what the asker wants. Set in ink in the field. */
  hi: string;
  a: string;
  /** The Sponsored card, when the moment fits an advertiser. Otherwise nothing is shown. */
  ad: { name: string; text: string; domain: string } | null;
};

/** The first sentence of the story's own answer (an excerpt, word for word). */
const MAIN_ANSWER = ANSWER.slice(0, ANSWER.indexOf(".") + 1);

/** The moments the sheet follows. A card lands only under the wallet questions, and only the
 *  story's own fictional advertisers appear. Everything else is left alone. */
export const THREAD: Moment[] = [
  { q: QUESTION, hi: "keys offline", a: MAIN_ANSWER, ad: { name: ADVERTISER.name, text: ADVERTISER.creative, domain: ADVERTISER.domain } },
  { q: "How do I get red wine out of a wool rug?", hi: "red wine", a: "Blot, do not rub. Cold water first, then a little mild soap, working from the edge of the stain inward.", ad: null },
  { q: MOMENTS[1]!.question, hi: "I don't want a device.", a: "Look for an app that keeps the keys on your phone, not on a server, and lists Solana among its networks.", ad: { name: "ClearVault", text: "ClearVault. A wallet app for Solana that keeps your keys on your phone.", domain: "clearvault.example" } },
  { q: NO_AD.question, hi: "offline key storage", a: "The keys are made and kept on a device that never goes online. It signs, and only the signature leaves.", ad: null },
  { q: "Why does my sourdough starter smell so sharp?", hi: "sourdough starter", a: "It is hungry. Feed it more often, or keep it somewhere a little cooler.", ad: null },
  { q: "Which running shoes suit wide feet and long road runs?", hi: "wide feet", a: "Choose a wide fitting with a roomy toe box and steady cushioning. Try them on late in the day.", ad: null },
  { q: MOMENTS[3]!.question, hi: "Bitcoin only", a: "Devices made for one network tend to be the simplest. Compare how each one handles recovery first.", ad: { name: "ColdNest", text: "ColdNest. A hardware wallet for Bitcoin, and nothing else.", domain: "coldnest.example" } },
  { q: "What is a good first tent for two people who only camp in summer?", hi: "first tent", a: "Look for one that a single person can pitch, with a full rain cover and room inside for your bags.", ad: null },
];

/** The line shown when nothing fits. */
export const NONE = NO_AD.line;

export type Ask = { t: string; hi?: string; id?: number };
const T = (id: number): Ask => ({ t: THREAD[id]!.q, hi: THREAD[id]!.hi, id });

/** The field: other people, asking. Five rows of very large type; every row carries some of the
 *  sheet's own questions, so the one being followed can be seen leaving the field. */
export const FIELD: Ask[][] = [
  [T(1), { t: "Which laptop is light enough to carry all day?", hi: "light enough" }, T(4), { t: "Can I learn the piano as an adult?" }, T(6), { t: "What goes with a navy suit?", hi: "navy suit" }],
  [T(0), { t: "How do I fix a dripping tap?" }, T(5), { t: "Where should we go in October with a toddler?", hi: "with a toddler" }, T(3), { t: "Which bike lock is hardest to cut?" }],
  [T(2), { t: "What should I cook for six when one of us is vegan?", hi: "one of us is vegan" }, T(7), { t: "Which coffee grinder is quiet enough for mornings?" }, T(1), { t: "Which paint hides uneven walls?", hi: "uneven walls" }],
  [T(4), { t: "Is a standing desk worth it in a small flat?", hi: "small flat" }, T(0), { t: "How long should I rest between runs?" }, T(7), { t: "Which houseplants survive a north window?", hi: "a north window" }],
  [T(5), { t: "What do I feed a puppy in its first week?" }, T(2), { t: "How do I split a bill fairly with flatmates?" }, T(6), { t: "How do I keep basil alive indoors?", hi: "alive indoors" }, T(3)],
];
