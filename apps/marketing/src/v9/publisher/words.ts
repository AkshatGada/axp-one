// Local microcopy for the app's side specimen (scene C, V3). Everything the page says about the
// product comes from the frozen v9/copy.ts and v9/story.ts; these are only the labels the
// illustration needs. Rules kept: outcomes are words, no figures, no payout language, no code.

/** The category this one card belongs to, as the app would name it in its own settings. */
export const CARD_CATEGORY = "Hardware wallets";

export const WORDS = {
  /** Spoken names for the two glyphs of the bridge marker (not printed). */
  views: { advertiser: "The advertiser's side", app: "The app's side, shown here" },
  network: "Network",
  qualifies: "Qualifying ad",
  rules: "You carry",
  /** Why nothing is shown. The no-ad sentence is PUBLISHER_SIDE.empty. */
  blocked: "You block this category. Nothing is shown.",
  /** Read out only (never printed): the state after a change. */
  shown: "A labelled card sits by the answer.",
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
