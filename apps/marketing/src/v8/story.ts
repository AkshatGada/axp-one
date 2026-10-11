// FROZEN SHARED STORY DATA for the V2 landing (owner: the integrator). Builders import from here
// and never edit it; propose changes in your folder's NOTES.md.
//
// One placement, seen from several sides. Everything here is an illustration with fictional
// advertisers. Rules the data obeys (and every scene must keep):
//   1. Relevance and commercial intent are different things. A question can be on topic and not
//      be a buying moment; a buying question can ask for something the advertiser does not offer.
//   2. A campaign only has the capabilities its advertiser declared. Nothing else, however
//      plausible, may be assumed for it.
//   3. No numeric fit, profit, attention or performance figures anywhere. Outcomes are words.
//   4. A receipt is an accepted insertion: a ledger charge for the advertiser and an accrual for
//      the app. It is not a finalized payout. Settlement happens later, when the campaign closes.

export type Outcome = "placed" | "outbid" | "skipped";

export const ADVERTISER = {
  name: "HarborKey",
  domain: "harborkey.example",
  /** What the advertiser says it sells, in its own words. */
  offer: "A hardware wallet for Ethereum and Solana self-custody",
  /** Declared capabilities: the only facts the network may use about the product. */
  capabilities: ["Hardware device", "Offline key storage", "Ethereum", "Solana"],
  /** Intended conversational contexts, written by the advertiser in plain language. */
  contexts: ["People comparing hardware wallets", "People moving their keys offline"],
  /** The exact Sponsored text the advertiser approved. Shown character for character. */
  creative: "Keep your keys offline with HarborKey. A hardware wallet for Ethereum and Solana self-custody.",
  /** Spend controls, as settings (not results). */
  limits: { maxBid: "0.004", budget: "0.020", unit: "USDC" },
} as const;

export const OTHER_ADVERTISERS = ["ClearVault", "KeyArc", "ColdNest"] as const;

export type Moment = {
  id: string;
  /** What the person asked. */
  question: string;
  /** What the question actually requires: the thing that decides participation. */
  requires: string;
  /** Is this person choosing something to buy, or learning? */
  buying: boolean;
  /** HarborKey's outcome in this moment. */
  outcome: Outcome;
  /** One plain sentence explaining the outcome, shown to the advertiser. */
  reason: string;
  /** Who was placed, if anyone. */
  placed: string | null;
};

/** Nearby questions that differ in the actual requirement. Same topic, different answers. */
export const MOMENTS: Moment[] = [
  {
    id: "compare",
    question: "Compare hardware wallets for Ethereum and Solana with offline key storage.",
    requires: "A hardware wallet, offline keys, Ethereum and Solana",
    buying: true,
    outcome: "placed",
    reason: "Choosing a hardware wallet, and it asks for what you declared.",
    placed: "HarborKey",
  },
  {
    id: "mobile",
    question: "Best mobile-only wallet for Solana? I don't want to carry a device.",
    requires: "A mobile app, no device",
    buying: true,
    outcome: "skipped",
    reason: "Ready to choose, but it rules out a device. HarborKey is a device.",
    placed: "ClearVault",
  },
  {
    id: "learn",
    question: "How does offline key storage actually work?",
    requires: "An explanation",
    buying: false,
    outcome: "skipped",
    reason: "On your topic, but learning, not choosing. No ad belongs here.",
    placed: null,
  },
  {
    id: "bitcoin",
    question: "Cheapest hardware wallet that only needs to hold Bitcoin?",
    requires: "A hardware wallet for Bitcoin",
    buying: true,
    outcome: "skipped",
    reason: "You did not declare Bitcoin. The network will not assume it for you.",
    placed: "ColdNest",
  },
  {
    id: "staking",
    question: "Which hardware wallet works for Solana staking with keys kept offline?",
    requires: "A hardware wallet, offline keys, Solana",
    buying: true,
    outcome: "outbid",
    reason: "A fit. Another advertiser bid more within its own limits.",
    placed: "KeyArc",
  },
];

/** The one placement the page follows: the "compare" moment, in an AI app. */
export const PLACEMENT = {
  moment: MOMENTS[0]!,
  /** The app's own answer. It is the same text whether or not an ad is shown. */
  answer:
    "Start with the networks you hold: not every hardware wallet supports both Ethereum and Solana. Then compare how each one signs offline, how you recover a lost device, and whether the companion app works on your phone. Buy from the maker directly.",
  /** An illustrative AI app: a fictional assistant, not a real product. */
  app: { name: "Tidewater", kind: "A fictional AI assistant" },
  /** The app's own placement rules. */
  appRules: { blocked: ["Trading and leverage", "Token sales"], slots: "One Sponsored card per answer" },
} as const;

/** Wording for the receipt, kept exact so no scene drifts into payout language. */
export const RECEIPT = {
  title: "Receipt",
  confirms: "The labelled card was inserted beside the answer.",
  advertiser: { label: "Advertiser", state: "Charge accepted", note: "Counts toward your budget." },
  app: { label: "AI app", state: "Earnings accrued", note: "Paid out when the campaign settles." },
  later: "Charges add up. Settlement comes later, when the campaign closes.",
  limit: "A receipt confirms insertion. It does not measure attention or conversions.", // claim-ok: limit
} as const;
