// Local microcopy for the meeting scene and the doors. Everything here obeys the story rules in
// v8/story.ts: outcomes are words, no figures, a receipt is an accepted insertion and never a
// payout. Frozen chapter copy stays in v8/copy.ts and v8/story.ts; this file only adds the small
// words the specimen needs to be operated and read.
export type Key = "adv" | "app" | "fit";

export const KEYS: Key[] = ["adv", "app", "fit"];

export const LOCAL = {
  hint: "Switch one off.",
  /** The word beside each switch: [agrees, does not]. Rules are met or not; a fit is judged. */
  state: {
    adv: ["Within limits", "Outside limits"],
    app: ["Within rules", "Outside rules"],
    fit: ["Judged a fit", "Judged not a fit"],
  } satisfies Record<Key, [string, string]>,
  /** Why there is no card, one plain sentence per released agreement. */
  reason: {
    adv: "The budget is used up.",
    app: "The app has no open slot.",
    fit: "The moment does not suit the offer.",
  } satisfies Record<Key, string>,
  none: "No card.",
  agreed: "All three agree. The card exists.",
  noReceipt: "No card, no receipt.",
} as const;

/** Illustrative questions for the closing wall. Texture only: dimmed and hidden from assistive
 *  technology. The one lit tile is the page's own placement, from the story data. */
export const WALL_QUESTIONS = [
  "Which note app syncs offline across laptop and phone?",
  "How do hardware wallets sign a transfer?",
  "Best running shoes for wide feet on trails?",
  "Compare standing desks under a small budget.",
  "What is a recovery phrase and where do I keep it?",
  "Which espresso grinder suits a small kitchen?",
  "Is a mobile wallet enough for everyday use?",
  "Plan three days in Lisbon with a toddler.",
  "Which accounting tool works for a two person studio?",
  "How do I move my keys offline safely?",
  "Quiet mechanical keyboard for a shared office?",
  "Which wallet supports both Ethereum and Solana?",
  "Help me pick a beginner road bike.",
  "What should I check before buying a used camera?",
  "Which language course fits twenty minutes a day?",
  "How does offline key storage actually work?",
  "Compare travel backpacks that fit under a seat.",
  "Best way to back up family photos?",
  "Which project tool is simplest for a small team?",
  "Lightweight tent for two in windy weather?",
] as const;
