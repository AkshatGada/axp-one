// Inline glossary (Term). Plain words; no claims beyond the run. Examples come from the run's own data.
import { run } from "./select";
import { formatBaseUnits } from "@axp/design-system/foundation";

const cap = run.policy.frequencyCap;
const capWord = cap === 1 ? "once" : cap === 2 ? "twice" : `${cap} times`;
const devnetRun = run.network.kind === "devnet";
const chain = devnetRun ? "Solana Devnet" : "the sandbox chain";
// The first tie in the run names the campaigns that actually tied (none when no tie happened).
const firstTie = run.opportunities.find((o) => o.auction.tieBreakApplied && o.auction.bids.length > 1);
const tied = firstTie ? firstTie.auction.bids.map((b) => b.campaignId).sort() : [];
const nameOf = (id: string) => run.campaigns.find((c) => c.campaignId === id)?.businessName ?? id;
// Excluded campaigns whose agents were still asked: for the paired research comparison, or (unpaired) only for the record.
const excludedAsked = run.opportunities.filter((o) => o.eligibility.excluded.some((x) => x.reason !== "frequency_cap" && o.decisions.some((d) => d.campaignId === x.campaignId)));
const pairedAsked = excludedAsked.filter((o) => o.decisions.some((d) => d.arm === "text_only")).map((o) => o.n);
const unpairedAsked = excludedAsked.filter((o) => !o.decisions.some((d) => d.arm === "text_only")).map((o) => o.n);
const nums = (ns: number[]) => (ns.length === 1 ? `opportunity ${ns[0]}` : `opportunities ${ns.slice(0, -1).join(", ")} and ${ns[ns.length - 1]}`);
const askedNote = [
  pairedAsked.length ? `On ${nums(pairedAsked)} every agent was asked, even when excluded, for the research comparison.` : "",
  unpairedAsked.length ? `On ${nums(unpairedAsked)} an excluded agent was still asked; its answer could never count.` : "",
]
  .filter(Boolean)
  .join(" ");
export const GLOSSARY = {
  opportunity: { term: "Opportunity", def: "One chance to show one Sponsored card beside one answer in the app. The app sends only a coarse intent, required capabilities and a floor price." },
  eligibility: { term: "Eligibility", def: `A rule in code that decides who can enter the auction: a campaign must declare every capability the moment requires.${askedNote ? ` ${askedNote}` : ""} An excluded campaign can never bid.` },
  frequencyCap: { term: "Frequency cap", def: `A campaign may be placed at most ${capWord} in one session. Another decision after that is not admitted to the auction.` },
  firstPrice: { term: "First price", def: "The winner pays its own bid. There is no second-price discount." },
  floor: { term: "Floor", def: `The lowest bid the app will accept for this slot: ${formatBaseUnits(run.publisher.floorBaseUnits)} test USDC here.` },
  baseUnits: { term: "Base units", def: "USDC has six decimals. 4000 base units are 0.004 USDC. Amounts are kept as whole base units, never floats." },
  channel: { term: "Payment channel", def: `A deposit locked once on ${chain}. Deliveries are paid by off-chain vouchers; one close transaction settles the final total.` },
  voucher: { term: "Voucher", def: "A signed off-chain authorization for the channel. Each one states the cumulative total owed so far." },
  cumulative: { term: "Cumulative authorization", def: "Each voucher states the total, not an increment. Voucher 2 at 0.007 replaces voucher 1 at 0.004; it does not add to it." },
  lamports: { term: "Lamports", def: "The smallest unit of SOL. Network fees and account rent are paid in test SOL and are never mixed with USDC." },
  rent: { term: "Rent", def: `SOL locked to keep an account open on ${chain}. New rent is paid when accounts are created; some is reclaimed when they close.` },
  finalized: { term: "Finalized", def: `The strongest confirmation level on ${chain}, read back from the chain for each transaction.` },
  receipt: { term: "Signed receipt", def: "The app's Ed25519-signed statement that it inserted the awarded card with its Sponsored label. It is not proof that a person read it." },
  arm: { term: "With and without history", def: "For paired questions each agent was asked twice: once with the question and campaign only (for comparison, never bid), once with ContextHint history added. Only the answer with history competed." },
  cosine: { term: "Cosine similarity", def: "How close two prompt embeddings are, from 0 to 1. Used only when the exact question already had a stored vector." },
  lexical: { term: "Lexical fallback", def: "When no stored vector exists, retrieval ranks prompts by shared words. It is an overlap score, not semantic similarity." },
  inferred: { term: "Inferred hint", def: "A ContextHint hypothesis about who an observed ad targeted. A hypothesis, never an advertiser setting." },
  jev: { term: "Jev", def: "The judgment model each advertiser's agent used. Jev returns scores with probabilities; the exchange rounds them to levels 0 to 3 for relevance and buying intent. It never names a price; code does." },
  contexthint: { term: "ContextHint", def: "ContextHint is the intelligence platform for ChatGPT ads (contexthint.com). It records real prompts and the ads seen beside them; agents get past examples and an inferred audience from it as evidence." },
  tieRule: { term: "Tie rule", def: `Fixed in the exchange code before the run: when bids are equal, the campaign with the lower campaign ID wins.${firstTie && tied.length > 1 ? ` In opportunity ${firstTie.n}, ${nameOf(tied[0])} (${tied[0]}) sorts before ${nameOf(tied[1])} (${tied[1]}).` : ""}` },
  devnet: { term: "Solana Devnet", def: "Solana's public test network. Anyone can open its transactions in the Solana explorer. Test tokens only, no real value; not mainnet." },
  solanaSandbox: { term: "Hosted Solana sandbox", def: "A hosted test network that runs Solana programs. Test USDC and test SOL only; not Devnet or mainnet." },
} as const;
