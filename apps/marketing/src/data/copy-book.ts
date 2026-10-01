// Copy for the noindex brand book (/design) only: earlier landing blocks the book still documents.
// The landing itself reads src/data/copy.ts. Same rules: no dashes, no internal details.
import { LIBRARY } from "./library";
import { CACHED, CV, KF, LG, MOBILE, RUN, decision, lower, policyBid, usdc, word } from "./run";

const cvText = decision(CACHED, "v3-clearvault", "text_only");
const cvHist = decision(CACHED, "v3-clearvault", "history");

export const ROLES = {
  h3: "Six parties, one exchange.",
  roles: [
    { name: "Advertiser", body: "Sets the approved creative, what the product can do, a maximum bid and a budget.", kind: "party" as const },
    { name: "Buying agent", body: "Reads one moment with its own campaign and evidence. Says bid or skip. Never sees money.", kind: "agent" as const },
    { name: "Exchange", body: "Checks eligibility in code, turns judgment into a capped bid, runs a first price auction.", kind: "code" as const }, // claim-ok: auction type
    { name: "AI app", body: "Shows a separate card marked Sponsored, signs a receipt and gets paid.", kind: "party" as const },
    { name: "Person asking", body: "Gets an answer from an assistant that never saw the ad.", kind: "party" as const },
    { name: "Payment worker", body: "Pays only for accepted cards. Browsers and agents never sign.", kind: "code" as const },
  ],
  legend: "A filled square marks a step decided in code.",
};

export const RULE = {
  label: "The rule",
  h2: "Agents advise. Code decides the money.",
  body: `In the run, agents returned judgments. Policy set all ${lower(RUN.counts.auctions)} prices, a fixed tie rule settled both ties, and only signed receipts became charges.`,
  rules: [
    { rule: "Money cannot buy past eligibility.", run: `A mobile only question: all ${lower(MOBILE.excluded.length)} campaigns ruled out, ${lower(MOBILE.decisions.length)} model calls, no ad.` },
    { rule: "A cap holds, even when the agent wants in.", run: `On the repeat question ${CV.name}'s agent said bid. The exchange did not admit it: the card had already been shown ${lower(RUN.policy.frequencyCap)} times.` },
    { rule: "An award is not a charge.", run: `${word(RUN.counts.receipts)} awards became charges only after ${lower(RUN.counts.receipts)} signed receipts.` },
    { rule: "Losing bids cost nothing.", run: `${KF.name} lost ${lower(RUN.counts.ties)} ties and paid nothing for them.` },
    { rule: "Disclosure, always.", run: "Every delivered card carried the Sponsored label." },
    { rule: "A restart cannot double charge.", run: `The run replayed: ${lower(RUN.restart.newCalls)} new calls, charges or signatures.` },
  ],
};

export const CONTEXTHINT = {
  label: "ContextHint data",
  fieldNote: "Illustrative layout, counts actual.",
  dive: "One niche. One record. One agent.",
  source: `${LIBRARY.source}, as of ${LIBRARY.snapshotDate}. Placements observed ${LIBRARY.placementsWindow.from} to ${LIBRARY.placementsWindow.to}.`,
  chain: {
    prompt: "A recorded prompt",
    promptNote: "This exact question is in ContextHint's recorded prompts, so the lookup found a perfect match.",
    ad: "The ad shown beside it",
    adNote: "Observed listing text, quoted as recorded. Observed historical reference, not an axp.one advertiser.",
    hint: "The audience it implies",
    hintNote: "Inferred by ContextHint: a hypothesis, not an advertiser setting. Brands named are not axp.one advertisers.",
    handed: `Handed to ${CV.name}'s agent`,
    handedNote: "One example and one audience, beside its own campaign. No rival bids, budgets or wallets.",
  },
  payoff: {
    title: "What the evidence did, and what it could not do.",
    changed: { q: "On the first question", a: `With ContextHint's history, the agent was a little more sure the person wanted to buy, enough to bid the full ${usdc(policyBid(cvHist.relevanceLevel!, cvHist.intentLevel!, CV.maxBid))} instead of ${usdc(policyBid(cvText.relevanceLevel!, cvText.intentLevel!, CV.maxBid))}.` }, // claim-ok: ordinal, not a claim
    unchanged: { q: "On the second question", a: "History changed nothing." },
    leather: `${LG.name}'s evidence matched leather wallets. It was ruled out anyway, in code.`,
    note: "Each setting ran once: a demonstration, not a benchmark.",
  },
  context: "The library leans to the United States. Inferred audiences are hypotheses, not advertiser settings. Observed brands are not axp.one advertisers, and ContextHint's users are not axp.one users. We do not reproduce any platform's ad ranking and claim no targeting lift.", // claim-ok: negation
};

export const NEXT = {
  label: "Next",
  h2: "Working now. Building next.",
  now: [
    "Campaigns with approved creative, capabilities, caps and budgets.",
    "Buying agents that bid or skip on evidence.",
    "Eligibility, capped bids and a deterministic auction.",
    "Disclosed Sponsored cards with signed receipts.",
    "Payment channels settled with refunds.",
    "Replay that cannot double charge.",
  ],
  next: [
    "Campaign planning agents.",
    "A publisher SDK for any AI app.",
    "More categories.",
    "An x402 web payment adapter.", // claim-ok: planned
    "Tools for agents over MCP.",
    "Advertiser owned wallets.",
    "Devnet, then mainnet.", // claim-ok: planned
    "Viewability and fraud measurement.", // claim-ok: planned
  ],
  tiles: [
    { title: "For advertisers", body: "Be there when people decide, with an agent that knows when to sit out." },
    { title: "For AI apps", body: "Earn from disclosed cards without touching your answers." },
    { title: "For agent builders", body: "Bring your own buying agent. The exchange keeps it honest.", planned: true },
  ],
};
