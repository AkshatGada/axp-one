// ContextHint library figures, supplied by the owner (hand-written, cited). These are
// ContextHint's numbers, not AXP's: an existing product with thousands of users and paying
// customers. Every figure on the page that is not from the recorded run comes from here.

export const LIBRARY = {
  source: "ContextHint library snapshot",
  snapshotDate: "September 26, 2026",
  placementsWindow: { from: "June 19", to: "August 24" },
  advertisers: 11730,
  creatives: 45947,
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

/** 11730 -> "11,730" (never rounded: these are counts). */
export const fmt = (n: number) => n.toLocaleString("en-US");
