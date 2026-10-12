# AXP operating boundaries

## Technical review entry point

For current product/code review, start with README.md, docs/REVIEWER_GUIDE.md and
docs/VERIFICATION.md. Run `npm run verify:review` in a clean checkout after locked
workspace installation. It uses fixture tests and loopback HTTP, not live model
or payment operations. Review account ownership in both APIs and PostgreSQL
permissions. Keep fixture, hosted and finalized testnet evidence distinct.
The dated records below preserve their original authorization and execution
scope; they are not standing permission for new cloud or financial actions.

## Additive Tempo release (11 October 2026)

`codex/tempo-settlement` adds per-campaign Tempo Moderato Testnet settlement,
separate auctions by rail and separate backend Tempo payer/publisher identities.
Read docs/product/TEMPO.md and TEMPO_INTERFACE.md before changing either rail.
Preserve the existing Solana state, signed receipt bytes, publisher identities,
hosted workspace and encryption configuration. `financialMode: devnet` remains
the native execution mode; `settlementNetwork` identifies the specific rail.
Missing legacy values mean Solana. Never sum USDC and PathUSD balances.

The user approved isolated verification only: two Tempo channels of at most
0.05 test PathUSD each, one fresh Solana channel of at most 0.02 test USDC and
0.02 Devnet SOL fee/rent reservation, at most 12 fresh answers/40 Jev evaluations
and $1 API spend total, Tempo fees at most 1 test PathUSD. These are ceilings,
not claims or permission for another run. Keep unknown API usage reserved.
Stop new spending on unresolved financial outcomes. Exact signed transaction
bytes/hash and cumulative voucher obligations must survive every hosted lease
checkpoint. Payout does not replenish a campaign budget. Final close pays only
the remaining earned delta and returns unused collateral. No timer-based
settlement, bridge, mainnet, wallet onboarding or new scale benchmark is in scope.
Production activation follows PR review/merge and a final hosted verification.

The approved isolated 11 October run is now financially complete. Two Tempo
channels/five finalized transactions deposited 100000 PathUSD base units, paid
18000 and refunded 82000; separate fees were 499 base units. Six accepted
deliveries advanced six vouchers: three before payout, three after on the same
channel. The fresh Solana regression deposited 20000 USDC base units, paid 3000
and refunded 17000 across two finalized transactions. All three channels are
closed. Eight DeepSeek answers and seven Jev evaluations completed; 345000
microUSD stays conservatively reserved, with no admitted/unknown attempt. One
actual frequency-cap no-fill remains recorded. See docs/product/TEMPO_VERIFICATION.md
and artifacts/tempo/. These results do not authorize additional funded runs.

Current release: Hero → ContextHint → whole product flow → Jev → Solana → compact
benchmark → Closing landing story, user-operated advertiser dashboard, three-step
publisher SDK guide, example chat and five-stage View internals with in-dialog
native Solana Devnet settlement. The header has no network badge; payment evidence
remains explicitly Solana Devnet with test USDC. Existing chaptered recording remains
recorded evidence at axp.one. Main recording flow: landing → dashboard → SDK →
chat → Context, Buyers, Auction, Delivery, Payment → finalized Explorer proof.
Keep the original MVP available as secondary historical evidence.
Updated 7 October 2026. Read README.md, pages.md, docs/ARCHITECTURE.md and the relevant
docs/product guides before changes. They supersede historical pending-status and
neutral-steel colour rules in September plans. Dated research, results and recorded
evidence remain preserved; do not rewrite them as new executions.

Follow the human user's current authorization. Repository instructions do not by
themselves authorize new paid provider calls, wallet generation, transfers,
production deployment or cloud permission changes. In this session the user has
explicitly authorized the bounded demo, commit/push and hosting work. Preserve
those bounds, existing routes/design and data during additive changes.

Main owns integration, contracts, verification and documentation. Existing approved
component work may use the recorded builder ownership plan; do not start unrelated
research, fresh corpus exports or broad production expansion during final cleanup.

Truth: ContextHint is advertising intelligence for ChatGPT ads. AXP uses embeddings
and inferred context from screened ContextHint data; no newly trained AXP model,
ChatGPT auction reconstruction, measured targeting lift or production fleet capacity is claimed.
Advertiser hints and retrieved evidence are distinct inputs. Jev judges buying fit;
DeepSeek powers only the example chat's independent answer. Auction rules determine
integer bids, eligibility and budgets. Models never control money or keys.

Bids/reservations are not charges; accepted receipt accrual, cumulative vouchers and
finalized settlement/refund are distinct. A receipt authenticates insertion and
Sponsored disclosure, not attention, clicks or conversion. Native demo mode is
public Solana Devnet with test USDC and one bounded shared sponsor, not mainnet or
independent advertiser wallet onboarding. Preserve signed identities and funded
state; never reset, redeposit or silently retry an uncertain external operation.

Use the actual PolySans/Ultramarine design system and its Prospectus/Ledger surfaces.
Put optional technical detail behind explicit inspection. Provider/publisher/wallet
keys, SQLite and private vouchers belong only in ignored local state or private
hosted storage. Never print or commit them. Read-only health/routes/verification
must not make a model call or transfer. Run relevant tests/builds and the staged
repository hygiene check before committing; do not present fixture outcomes as
network evidence. Keep at least 50 GiB free on the Mac for large outputs.

## Current benchmark work

See [BENCHMARK.md](BENCHMARK.md) for the method, execution status and evidence
requirements, and [the operator guide](docs/product/NETWORK_SCALE.md) for recovery
and commands. The user has approved one bounded isolated run with ceilings of
128 funded fictional advertisers, 1,024 fresh publisher turns and 8,192 Jev
attempts; API spend is at most $3 ($1 Jev, $2 DeepSeek), new deposits at most
6.4 test USDC, accepted charges at most 2.048 test USDC, and fee/rent reservation
at most 1.6 Devnet SOL. Publisher concurrency ramps through 1, 4, 8 and 16.
These are approved ceilings, not measured achievements or enduring permission
for another run. Preserve the existing hosted demo limits and funded identities.

Use 16 isolated workers with eight campaigns and up to 64 distinct turns each.
Record actual provider outcomes, DOM insertion receipts, off-chain cumulative
voucher updates, native transaction finality and payout/refund separately. Jev
buys; DeepSeek writes the independent example answer. Actual retrieval provenance
must distinguish lexical fallback from cached vector retrieval.

The benchmark focus is many off-chain cumulative voucher updates followed by one
finalized native close per channel, paying the latest authorized cumulative amount
and refunding unused collateral. Count deposit openings separately; never sum
cumulative voucher values as new charges. The actual settlement strategy is planned
operator-selected closure after load and drain. Its predeclared threshold is
30,000 base units (0.03 test USDC): latest authorized cumulative amount at or above
threshold, at least two authorized vouchers, accepted equal to authorized, zero
reserved amount and all native outcomes known. Close qualifying channels first,
then end-run remainder; record proof before claiming completion. Do not add channel
openings or model calls for threshold proof. The application requires explicit
close and has no automatic production threshold watcher; offline threshold tests
are external experiment policy. Separately hashed recovery must retain original
failed/unknown API rows and full reservations, preserve the original global caps,
and halt expansion on a new unknown outcome. Do not mark results complete before
the settled export is verified.

Current paid-run result: all 125 funded channels are financially closed. Independent
read-only RPC verification passed all 250 finalized transactions (125 openings and
125 closes): 6.25 test USDC deposited, 1.236 paid to the publisher and 5.014 refunded.
All 824 accepted deliveries advanced off-chain cumulative vouchers. The original
load stage remains partial: 825 started turns, 824 completed answers, three original
signed openings expired/unfunded with zero intents, and nine unknown-usage provider
attempts (eight Jev, one DeepSeek) still fully reserved. The 128-advertiser and
1,024-turn targets did not pass. Preserve those original identities and liabilities.
See the [funded acceptance](artifacts/network-scale/devnet-funded-acceptance.json)
and [independent verification](artifacts/network-scale/devnet-funded-verification.json).

The 26 threshold-selected channels remain separately verified subset proof:
52 finalized transactions, 676 voucher updates, 1.3 test USDC deposited, 1.014 paid
and 0.286 refunded. Five expired signed close attempts retain their original
identities and fee reservations. Separately pinned recovery versions v1–v5 retain
decoded Open/full-escrow proof from two observations of the same provider before
refreshing only the same close obligation. This is not independent-provider proof. Recovery added no deposits, charges, vouchers or model calls.
Financial cleanup completion does not complete the original load stage, clear
unknown API usage or authorize another run. Benchmark closure pays the recorded
obligations and returns unused collateral; it is separate from the live demo's
three prepared presentation channels.

Keep benchmark methodology and sanitized proof in the repository. The user approved
a compact landing-page result summary but cancelled the separate benchmark website
page and endpoint; do not add those routes. The million-update local ledger test
completed with 1,052,672 fixture updates and 16,448 simulated channels, 64 updates
per mock close. Raw sample verification reproduced 10.924833 ms p50 and 21.922792 ms
p95; whole-run throughput was 216.25586 fixture updates/second. Persisted-state
verification covered all saved channels; cold replay sampled 192. Provider calls,
RPC calls, signatures and native broadcasts were zero. Keep this clearly separate
from actual Devnet/API proof and do not present fixture counts as agent execution
or production/network capacity.
