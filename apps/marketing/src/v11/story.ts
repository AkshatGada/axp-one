// FROZEN SHARED STORY DATA for the V5 landing (owner: the orchestrator). Builders import from here
// and never edit it; propose changes in your folder's NOTES.md.
//
// One question, followed from the moment it is asked. Everything is an illustration with fictional
// names. Rules every figure keeps:
//   1. Relevance and commercial intent are different. A question can be on topic and not be a
//      buying moment; a buying question can need something the advertiser does not offer.
//   2. A campaign has only what its advertiser listed. Nothing else is assumed for it.
//   3. No scores, prices, percentages, timings or any number that reads as fit, speed, profit,
//      attention or performance. Outcomes are words.
//   4. The Sponsored card sits BELOW the app's answer: after it, in the same column. Never beside
//      it, never inside it.
//   5. A receipt is an accepted insertion: a charge for the advertiser and an accrual for the app.
//      It is not a payout. Settlement comes later, when the campaign closes.
//   6. Answer independence is scoped: "In our integration, no advertiser material reaches the
//      answer path." The app's answer text is identical whether or not a card is shown.
//   7. No provider names, code, or auction arithmetic. No customers, partners or status claims.

/** The question the feature follows. */
export const QUESTION = "Which hardware wallet keeps my keys offline and works with Solana?";

/** The shift: what the same need looked like as a search, and as a question. */
export const SHIFT = {
  keywords: ["hardware wallet", "best", "solana"],
  question: QUESTION,
  /** What the question says that the keywords did not. Short phrases, in the asker's words. */
  says: ["keys offline", "works with Solana", "ready to choose"],
};

/** The AI app: a fictional assistant. */
export const APP = { name: "Conversational AI app", kind: "An AI assistant" };

/** The app's own answer. Identical in every state. */
export const ANSWER =
  "Look for a wallet that signs on the device itself and lists Solana among its networks. Compare how each one handles recovery, and whether its companion app works on your phone. Check what each one supports before you buy.";

/** The advertiser the feature follows. */
export const ADVERTISER = {
  name: "HarborKey",
  domain: "harborkey.example",
  /** What it sells, in its own words. */
  offer: "A hardware wallet for Ethereum and Solana self-custody",
  /** What it listed. The only facts the network may use about the product. */
  listed: ["Hardware device", "Offline keys", "Ethereum", "Solana"],
  /** Something it has not listed (used to show rule 2). */
  unlisted: "Bitcoin",
  /** The exact Sponsored words it approved. Shown character for character. */
  creative: "Keep your keys offline with HarborKey. A hardware wallet for Ethereum and Solana self-custody.",
  /** Its two limits. Settings, not results: never shown with figures. */
  limits: ["Most per placement", "Total budget"],
} as const;

/** Each advertiser's agent reads the moment (the main question). Words only. */
export const AGENTS: { name: string; verdict: "fits" | "sits out"; why: string }[] = [
  { name: "HarborKey", verdict: "fits", why: "A device, offline keys, Solana" },
  { name: "ClearVault", verdict: "sits out", why: "It makes a phone app" },
  { name: "ColdNest", verdict: "sits out", why: "Solana not listed" },
];

export type Outcome = "appears" | "left alone";
/** Nearby questions, for showing when an ad belongs. Same topic, different moments. */
export const MOMENTS: { id: string; question: string; choosing: boolean; outcome: Outcome; why: string; card: string | null }[] = [
  { id: "main", question: QUESTION, choosing: true, outcome: "appears", why: "Choosing, and it needs what you listed", card: "HarborKey" },
  { id: "phone", question: "Best wallet app for Solana? I don't want a device.", choosing: true, outcome: "left alone", why: "They ruled out a device", card: "ClearVault" },
  { id: "learn", question: "How does offline key storage work?", choosing: false, outcome: "left alone", why: "Learning, not choosing", card: null },
  { id: "bitcoin", question: "Cheapest hardware wallet for Bitcoin only?", choosing: true, outcome: "left alone", why: "Bitcoin not listed", card: "ColdNest" },
];

/** The other fictional advertisers' approved words, where a figure shows their card. */
export const OTHER_CREATIVES = {
  ClearVault: { domain: "clearvault.example", creative: "ClearVault. A wallet app for Solana that keeps your keys on your phone." },
  ColdNest: { domain: "coldnest.example", creative: "ColdNest. A hardware wallet for Bitcoin, and nothing else." },
} as const;

/** When nothing fits. */
export const NO_AD = {
  question: "How does offline key storage work?",
  /** The app's own answer to it. */
  answer: "The private key is created on the device and never leaves it. The device signs each transaction itself, so only the signature goes online.",
  line: "No ad. The answer stands alone.",
  receipt: "No receipt.",
};

/** The receipt. Exact wording, so no figure drifts into payout language. */
export const RECEIPT = {
  title: "Receipt",
  confirms: "The labelled card was inserted below the answer.",
  advertiser: { label: "Advertiser", state: "Charge accepted" },
  app: { label: "Conversational AI app", state: "Earnings accrued" },
  later: "Charges add up. Settlement comes later, when the campaign closes.",
  limit: "A receipt confirms insertion. It does not measure attention or conversions.", // claim-ok: limit
} as const;

/** The app's own rules. */
export const APP_RULES = { allow: "Hardware wallets", slot: "One Sponsored card, below the answer" };

/** The scoped independence claim. Exact. */
export const INDEPENDENCE = "In our integration, no advertiser material reaches the answer path.";

/** V5: the page is one flow. There are no controls in any figure (no switches, chips or buttons to
 *  operate) and the page does not dwell on moments where no ad is placed. Figures play on their
 *  own or with the reader's scroll. */
