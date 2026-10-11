// Local microcopy for the app's side specimen (scene C, V3). Everything the page says about the
// product comes from the frozen v9/copy.ts and v9/story.ts; these are only the labels the
// illustration needs. Rules kept: outcomes are words, no figures, no payout language, no code.

/** The category this one card belongs to, as the app would name it in its own settings. */
export const CARD_CATEGORY = "Hardware wallets";

export const WORDS = {
  /** The two-way choice: does a suitable ad exist for this answer. */
  fitLegend: "For this answer",
  fits: "An ad fits",
  noFit: "No ad fits",
  rules: "You allow",
  /** Why nothing is shown. The no-ad sentence is PUBLISHER_SIDE.empty. */
  blocked: "You do not allow this category. Nothing is shown.",
  /** Read out only (never printed): the state after a change. */
  shown: "A labelled card sits below the answer.",
  unchanged: "The answer has not changed.",
  /** The fictional app's own chrome. */
  chat: {
    title: "Hardware wallets, compared",
    search: "Search",
    fresh: "New chat",
    today: "Today",
    earlier: "Earlier",
    recents: ["Backing up a recovery phrase", "Moving coins off an exchange", "What self custody means"],
    composer: "Ask a follow up",
  },
} as const;
