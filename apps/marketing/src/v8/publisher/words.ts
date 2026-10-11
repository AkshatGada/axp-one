// Local microcopy for the app's side specimen (scene C). Everything the page says about the
// product comes from the frozen v8/copy.ts and v8/story.ts; these are only the labels the
// illustration needs. Rules kept: outcomes are words, no figures, no payout language, no code.

/** What the network returned for this moment. */
export type Returned = "ad" | "none";

/** The category this one card belongs to, as the app would name it in its own settings. */
export const CARD_CATEGORY = "Hardware wallets";

export const RETURNS: { id: Returned; label: string }[] = [
  { id: "ad", label: "A qualifying ad" },
  { id: "none", label: "No qualifying ad" },
];

export const WORDS = {
  views: { advertiser: "Advertiser's side", app: "App's side" },
  returnsLegend: "The network returns",
  /** One sentence per state, read out when the state changes. */
  status: {
    shown: "A labelled card sits by the answer.",
    blocked: "You block this category. Nothing is shown.",
  },
  unchanged: "The answer has not changed.",
  /** The note pinned to the answer: at rest, and after the reader changes the slot. */
  pin: "Your answer",
  pinAfter: "Your answer, unchanged",
  rules: "You carry",
  /** The fictional app's own chrome. */
  chat: {
    title: "Hardware wallets, compared",
    fresh: "New chat",
    recent: "Recent",
    recents: ["Backing up a recovery phrase", "Moving coins off an exchange", "What self custody means"],
    composer: "Ask a follow up",
  },
} as const;
