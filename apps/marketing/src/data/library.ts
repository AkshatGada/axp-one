// ContextHint figures, supplied by the owner (hand-written, cited). These are ContextHint's
// numbers, not axp.one's: an existing product with its own users and paying customers. Every
// figure on the page that is not from the recorded run comes from here. Never call any of
// these axp.one advertisers, traffic or reach.

export const LIBRARY = {
  source: "ContextHint data",
  snapshotDate: "September 26, 2026",
  placementsWindow: { from: "June 19", to: "August 24" },
  advertisers: 11730,
  creatives: 45947,
  /** Times an ad was seen. */
  placements: 420540,
  niches: 983,
  nichesWithAds: 970,
  subNiches: 7121,
  subNichesWithAds: 5991,
  usTaggedPlacements: 330777,
  noCountryPlacements: 67430,
  freshAdsCountries: 12,
  url: "https://contexthint.com",
} as const;

/** ContextHint's traction (owner-supplied, 2026-10-02). ContextHint's, not axp.one's. */
export const TRACTION = {
  figure: "1,000+",
  line: "More than a thousand marketers use ContextHint every day, including paying customers.",
  source: "owner-supplied",
} as const;

/** Library placements by recorded country (owner-supplied). One dot on the page = 100 placements.
 *  Ads by country overlap and are not additive: never sum them. */
export const LIBRARY_BY_COUNTRY = {
  source: "ContextHint data, as of September 26, 2026.",
  rows: [
    { country: "United States", placements: 330777, ads: 23600 },
    { country: "No country recorded", placements: 67430, ads: 26893 },
    { country: "Australia", placements: 16944, ads: 1745 },
    { country: "South Korea", placements: 5373, ads: 332 },
  ],
  othersNote: "India, Switzerland and Bangladesh: a handful each.",
} as const;

/** Fresh Ads live collection by country (owner-supplied). A call is one collection request to
 *  the answers provider; "with ads" counts calls whose answer carried at least one ad.
 *  Not part of the 420,540 library placements. */
export const FRESH_ADS = {
  source: "Fresh Ads collection by country, ContextHint data, October 2026.",
  rows: [
    { country: "United States", calls: 311, withAds: 207 },
    { country: "India", calls: 230, withAds: 112 },
    { country: "Canada", calls: 133, withAds: 86 },
    { country: "Germany", calls: 133, withAds: 88 },
    { country: "Japan", calls: 130, withAds: 83 },
    { country: "Australia", calls: 116, withAds: 55 },
    { country: "United Kingdom", calls: 105, withAds: 70 },
    { country: "Brazil", calls: 102, withAds: 65 },
    { country: "South Korea", calls: 99, withAds: 52 },
    { country: "Mexico", calls: 97, withAds: 56 },
    { country: "France", calls: 84, withAds: 52 },
    { country: "New Zealand", calls: 75, withAds: 26 },
  ],
} as const;

/** Jev credit (owner: modest, only where relevant). */
export const JEV = { name: "Jev by TypeSafe", url: "https://docs.typesafe.ai" } as const;

/** 11730 -> "11,730" (never rounded: these are counts). */
export const fmt = (n: number) => n.toLocaleString("en-US");
/** 207 of 311 -> "67%". */
export const pct = (a: number, b: number) => `${Math.round((a / b) * 100)}%`;
