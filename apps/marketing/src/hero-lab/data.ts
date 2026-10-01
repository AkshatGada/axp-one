// Hero lab data. Every question below is real: the prompt text exactly as observed by ContextHint
// (from the run's retrieval evidence, the evidence catalogue in artifacts/, and the observed prompts
// behind the ContextHint home wall). Only the question text is used: no advertisers, no counts, no IDs.
// The bidding drawn around them is illustrative; the one recorded question is the run's own.

export const LAB = {
  h1: "The advertising exchange for the agentic internet.",
  accent: "agentic internet.",
  lede: "Advertiser agents bid for a disclosed Sponsored slot beside the answer in AI apps. Code decides the price. Publishers are paid through Solana payment channels.",
  primary: "See the working MVP",
  wallNote: "Questions observed by ContextHint. Bidding shown is illustrative.",
  focalNote: "A real question from our recorded run, with an excerpt of the answer. ClearVault is a fictional advertiser.",
  rowNote: "From our recorded run. ClearVault, KeyForge and LeatherGuard are fictional advertisers.",
};

/** Observed buyer questions for the wall and the tape (real prompt text, lightly varied topics). */
export const PROMPTS: string[] = [
  "best ai video generator for horizontal and vertical formats",
  "Do I need a hardware wallet or is a mobile wallet enough?",
  "cheapest crm for solo management consultants under $50 month",
  "best all in one tool to manage remote team travel bookings",
  "hot wallet vs cold wallet which is safer for crypto",
  "Integration platform for connecting an LLM to internal tools",
  "best bookkeeping service for a restaurant under $300 a month",
  "How to back up a crypto wallet properly",
  "best online booking and management software for small tour operators",
  "best self custody wallet for solana and other altcoins",
  "What are the best API platforms for native app integrations?",
  "how do i securely back up my hardware wallet seed phrase",
  "top solutions for using AI to personalize tourism marketing",
  "best crypto exchange for people who want spot margin trading",
  "What are the risks associated with self-custody Bitcoin wallets?",
  "best way to manage corporate travel expenses and reimbursements for a remote team",
  "best cold storage wallet for large crypto holdings",
  "How do I distribute tokens to thousands of wallets on Solana?",
  "how to implement AI for revenue optimization in hotels",
  "best wallet for privacy preserving blockchains",
  "best on-chain analytics tool for tracking whale wallets in real time",
  "AI agent travel booking automation",
  "Is it better to buy crypto on an exchange or in a wallet app?",
  "How to spot a fake crypto wallet app",
  "best apps to coordinate company offsite travel and share itineraries with the team",
  "which platforms help users fund DeFi wallets from a credit card",
  "best hardware wallet for bitcoin in 2026",
  "Cheapest way to transfer crypto between wallets",
  "How can a neobank offer self-custody products with an institutional safety net",
  "best defi wallet for interacting with dapps safely 2026",
  "Best crypto wallet with a built in exchange",
  "Free crypto wallet apps that don't charge fees",
];

/** The one recorded opportunity (run v3, the cached question) and its card, verbatim. */
export const FOCAL = {
  question: "cheapest hardware wallet that still supports ethereum and solana",
  appName: "Our demo AI app",
  slotLine: "Answer, then one Sponsored slot",
  answerLabel: "Answer, excerpt",
  answer:
    "…For a budget choice, compare entry-level hardware wallets by total delivered cost, then confirm that the exact model supports both networks through wallet software you’re comfortable using.",
  gap: "Separate from the answer",
  card: {
    name: "ClearVault",
    text: "ClearVault is a fictional hardware wallet with offline key storage and declared Ethereum/Solana support.",
    destination: "clearvault.example",
  },
  /** For the order book: what the recorded opportunity needed and how it cleared. */
  needs: ["Hardware wallet", "Offline key storage", "Ethereum and Solana"],
  bids: [
    { name: "ClearVault", state: "bid" as const },
    { name: "KeyForge", state: "bid" as const },
    { name: "LeatherGuard", state: "out" as const },
  ],
  outLine: "Ruled out in code",
  tieLine: "Two equal bids. A fixed rule in code broke the tie.",
  paidLine: "Paid on a signed receipt, through a Solana payment channel.",
};

/** Illustrative capability tags for the tape (what a matching advertiser would need to declare). */
export const NEEDS: Record<string, string> = {
  video: "Video tool, both formats",
  wallet: "Wallet, self custody",
  crm: "CRM for one seat",
  travel: "Team travel booking",
  agent: "Agent tooling",
  books: "Bookkeeping, restaurants",
  api: "API platform",
  tokens: "Token distribution",
  hotel: "Hotel revenue tools",
  analytics: "On-chain analytics",
  exchange: "Exchange, margin",
};

/** The tape: real questions with an illustrative need and three bids (relative, no amounts). */
export const TAPE: { q: string; need: string; bids: [number, number, number]; win: 0 | 1 | 2 }[] = [
  { q: "Do I need a hardware wallet or is a mobile wallet enough?", need: NEEDS.wallet!, bids: [0.62, 0.88, 0.4], win: 1 },
  { q: "best ai video generator for horizontal and vertical formats", need: NEEDS.video!, bids: [0.9, 0.55, 0.7], win: 0 },
  { q: "best all in one tool to manage remote team travel bookings", need: NEEDS.travel!, bids: [0.48, 0.66, 0.92], win: 2 },
  { q: "Integration platform for connecting an LLM to internal tools", need: NEEDS.agent!, bids: [0.74, 0.96, 0.58], win: 1 },
  { q: "cheapest crm for solo management consultants under $50 month", need: NEEDS.crm!, bids: [0.86, 0.5, 0.64], win: 0 },
  { q: "How do I distribute tokens to thousands of wallets on Solana?", need: NEEDS.tokens!, bids: [0.58, 0.72, 0.9], win: 2 },
  { q: "best bookkeeping service for a restaurant under $300 a month", need: NEEDS.books!, bids: [0.66, 0.94, 0.42], win: 1 },
  { q: "best self custody wallet for solana and other altcoins", need: NEEDS.wallet!, bids: [0.92, 0.6, 0.76], win: 0 },
  { q: "What are the best API platforms for native app integrations?", need: NEEDS.api!, bids: [0.52, 0.7, 0.88], win: 2 },
  { q: "how to implement AI for revenue optimization in hotels", need: NEEDS.hotel!, bids: [0.8, 0.95, 0.5], win: 1 },
  { q: "best on-chain analytics tool for tracking whale wallets in real time", need: NEEDS.analytics!, bids: [0.94, 0.62, 0.7], win: 0 },
  { q: "best crypto exchange for people who want spot margin trading", need: NEEDS.exchange!, bids: [0.6, 0.78, 0.97], win: 2 },
];
