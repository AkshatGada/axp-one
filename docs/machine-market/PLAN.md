# AXP machine market — implementation plan

26 October 2026. Lead research/architecture plan; local build and scoped local commits authorized. No push.

## Product decision and demonstration

“Google built AdSense for the web. We are building the advertising market for AI.”
The wider foundation is payable machine access. Build an operational market, not a
price-chart mock: publishers issue bounded access rights, agents discover and buy
or bid, owners can transfer eligible unused rights, a gateway enforces ownership,
and sponsors can fund access without buying a favorable answer. Keep existing
conversational Sponsored-card exchange intact as the second inventory category.

The substantial MVP is **AXP Market**, additive `/market/`: Discover, Portfolio,
Publisher issuance, Sponsor desk, Agent procurement, and Activity/receipts. One
connected scenario crosses publisher, buyer A, buyer B, and sponsor roles. All
market money and actors in this build are explicitly local synthetic fixtures.
Actual state transitions are durable and authoritative on the local server.

## Repository/release map and coherent base

Fresh `git fetch origin` succeeded; main is 98a50b1c00f97c02e84cfa5194fb5aff692e2302.
Frontend 9e110a3 is 4 ahead/17 behind with duplicated landing patches. Its final
marketing tree differs from main only in Masthead.tsx and shell.module.css.
New branch `codex/axp-machine-market` is based on fetched main; those two frontend
files are preserved verbatim to retain the user's current landing design.
Original checkout, brand files, research notes, and all registered worktrees are
untouched. No pruning of missing worktrees. Worktree location:
`/Users/akshat/Documents/Codex/2026-10-26/task-3/axp-machine-market`.

- `apps/marketing/src/v11`: current landing; preserve.
- `apps/product-ui`: Next/React + PolySans, Ultramarine, Ledger/Prospectus surfaces.
- `packages/accounts`: ownership, Supabase profiles, exact campaign approvals,
  scoped SDK resources, synthetic network accounting, isolated finance bindings.
- `packages/product`, `packages/dsp`, `packages/ml`: current auction, Jev bounded
  decisions and independent-answer flow; no model can control money.
- `packages/publisher-sdk`: published 0.2.1 request/render/ack/recovery contract.
- `packages/payments`: Solana Devnet and Tempo testnet channel/voucher adapters.
- `packages/hosted`, `scripts/build-site`: current hosting composition, unchanged.
- `docs/VERIFICATION.md`, `docs/REVIEWER_GUIDE.md`, `docs/SUBMISSION_CHECKLIST.md`:
  hackathon evidence map. Historical 811 tests/23 skips/90 component checks are
  dated evidence, not this build's results.
- Existing routes `/account/`, `/advertiser-dashboard/`, `/publisher-demo/`,
  `/sdk/`, `/demo/`, `/mvp/` remain intact. New market has an isolated local server;
  adding it to deployed API/tenant infrastructure is a later readiness gate.

## Research and conclusions (primary sources checked 26 October)

1. Cloudflare Monetization Gateway closed beta describes paid websites, APIs,
   MCP tools and datasets: https://blog.cloudflare.com/monetization-gateway-beta/ .
   This validates resource breadth, not an AXP integration or availability to us.
2. Pay per crawl describes 402 discovery and price-capped requests, with aggregate
   billing: https://blog.cloudflare.com/introducing-pay-per-crawl/ . A paid request
   is not itself a transferable ownership instrument.
3. x402 defines HTTP resource payment and settlement, and has discovery and
   idempotency extensions: https://docs.x402.org/introduction . It does not alone
   enforce a publisher's secondary transfer agreement. Our local 402 gateway is
   an entitlement demo, not a claim of x402 wire compatibility.
4. Solana tokens record ownership and transfer under token programs:
   https://solana.com/docs/core/tokens . Token transfer does not force a publisher
   to deliver bytes or prohibit an earlier buyer retaining downloaded content.
5. Local protocol `axp-agent-ad-experiments/protocol/src/exchange.mjs` binds grants
   to beneficiary, resource hash, expiry and delivery count. October 11 WebMCP
   report documents one 0.001 test-USDC finalized payment and repeat retrieval.
   That protocol selects by policy, not sponsor auction; its exact-match checks
   do not establish attention/comprehension. Reuse the binding and recovery ideas,
   not its secrets, data stores, or one-run spending authorization.
6. `docs/research/AGENT_FACING_ADS_RESEARCH_AND_WEBMCP_HANDOFF.md` and
   `axp-pitch/docs/evolution/cloudflare-integration/README.md` distinguish source
   procurement from advertising. Cloudflare routing differentiation is a hypothesis.

Novelty claim: one inspectable workflow combines priced access, publisher-authorized
secondary transfer, sponsor-funded procurement and independent outputs. Do not
claim invention of tradable ads, proof of demand, a prediction market, or betting.

## Precise instruments and issuer obligations

| Instrument | Sold unit and obligation | Transfer policy |
| --- | --- | --- |
| Versioned report access credit | One successful retrieval of exact content hash before expiry; publisher reserves supply and must honor it or refund under stated failure policy | Issuer opt-in, unredeemed only, one owner, maximum transfers specified; revocation of old owner's authority is atomic |
| Bounded API/dataset access | One immutable sample/query-result entitlement, explicit format and version; MVP uses owned fixture resources | Same mechanics when issuer opts in; no arbitrary third-party API resale |
| Sponsored resource access | Sponsor funds the same resource path after disclosed consent; separate immutable sponsor packet and honest assessment | Non-transferable by default to prevent sponsor subsidy arbitrage |
| Sponsored chat placement | Existing approved exact creative insertion opportunity below independent answer | Non-transferable, tied to request/app/award; existing exchange only |

No resale of already delivered information, copyrights, attention, endorsements,
user data, subscriptions, future unknown capacity, or arbitrary fungible tokens.
Finite supply is an issuer commitment recorded at issuance, not fake scarcity.
MVP primary supply supports posted price and bounded first-price auction; secondary
supply is a seller's single-credit ask. No AMM, derivatives, leverage, shorting,
price forecasts, speculative ticker or invented market activity.

## Domain model and invariants

Actor (publisher/buyer/sponsor/operator fixture); Resource (issuer, content hash,
version, title, category, content type, supply cap, expiry, delivery policy);
Credit (resource, owner, state, transfer count, policy, funding source);
Listing (credit, ask, version, expiry, state); Auction (one unit, floor, deadline,
validated bids and deterministic tie order); Operation (actor+key+payload hash,
state/result); Ledger entries (balanced integer synthetic microcredits);
SettlementIntent (immutable intent/hash, pending/confirmed/failed/unknown);
SponsorCampaign (budget, cap, eligibility, exact packet hash); Consent/Assessment;
Delivery (credit, beneficiary, resource hash, receipt); AuditEvent (sequence,
previous event hash and canonical event hash; tamper-evident, not chain finality).

1. One credit has one authoritative owner; issued plus remaining supply never
   exceeds cap. Only issuer creates supply; mutation roles are enforced server-side.
2. Safe nonnegative integers only; every debit has matching credit/escrow/fee.
   No mixing units or rails; no payout replenishes sponsor budget.
3. Purchase/transfer/hold/receipt commit in one SQLite transaction. Conditional
   state/version checks prevent double sale, stale ask acceptance and redemption races.
4. Actor-scoped idempotency binds the entire command payload; exact retries return
   saved results, changed payload returns conflict. Restart preserves outcomes.
5. Retrieval requires current owner, matching immutable version, unexpired credit,
   settled purchase and unused allowance. Old-owner denial precedes replay lookup.
6. Successful delivery permanently disables transfer. Same authorized delivery key
   may recover the same response before expiry; new keys cannot consume twice.
7. Unknown settlement preserves funds/reservation and freezes dependent transitions;
   no automatic rebroadcast/new payment or refund until explicit reconciliation.
8. Sponsor consent binds resource/amount/packet/campaign. Negative or insufficient
   assessment is acceptable; endorsement, favorable answer, citation are never gates.
9. Only public catalog fields appear in discovery. Protected bytes never appear in
   snapshot, error, audit or public route. Receipt proves delivery at the gateway,
   not cognition, human attention, correctness or finalized external payment.

## Architecture and implementation contract

New `packages/machine-market/` isolates market domain from production account
network. SQLite (`node:sqlite`, already used here) supplies durable transaction and
crash recovery without dependencies, cloud migrations or credentials. Server binds
127.0.0.1, ignores existing .env, and accepts only predefined demo actor identities.
Actor switching is prominently a demo capability, not production authentication.

Core exported API: `createMarket({filename, now})` -> `snapshot(actorId)`,
`dispatch(actorId, {type, idempotencyKey, payload})`, `readResource(actorId,
creditId, idempotencyKey)`, `close()`. `:memory:` supports tests. Errors have
`code` and `status`. Export `DEMO_ACTORS` and `seedMarket(market)` from fixtures.
Commands: `issue`, `purchase`, `list`, `cancelListing`, `buyListing`, `redeem`,
`createAuction`, `bid`, `closeAuction`, `createSponsor`, `sponsorAccess`,
`reconcile`, `expire`. Core owner finalizes payload schema in CONTRACT.md before
other workers couple to it. Read projections include resources, credits, listings,
auctions, balances, campaigns, operations, events and mode; secret content omitted.

Local HTTP API `/api/market/state`, `/api/market/commands`,
`/api/market/resources/:id`, `/api/market/credits/:id/retrieve`, `/api/market/health`.
Actor header `x-axp-demo-actor`, mutation idempotency required. Resource probe gives
402 plus available offers without bytes. No external fetch URLs or wallet inputs.
Strict request body limit, same-origin/loopback guard, bounded pagination, safe
JSON errors, readonly health. Standalone server serves exported `/market/` UI and
assets with safe path resolution. Agent SDK exercises the same HTTP contract.

UX: editorial exchange prospectus, warm paper, ink, Ultramarine, existing PolySans.
Catalog cards show the right purchased, issuer, price, supply, expiry, transferability
and “local synthetic” provenance. Portfolio exposes list/transfer/redeem actions.
Publisher can issue explicit inventory. Sponsor desk shows policy and budget.
Agent procurement compares paid/sponsored/decline and budgets; deterministic local
agent is labeled, never presented as a fresh LLM run. Evidence drawer shows intent,
trade, ownership, delivery and settlement separately. Responsive accessible layout,
keyboard controls, loading/error/pending states. Avoid decorative financial charts.

## Lifecycles and recovery

Resource draft -> issued -> exhausted/expired. Credit available -> owned -> listed
-> owned by successor OR owned -> redeeming -> redeemed; terminal expiry/refund.
Listing open -> filled/cancelled/expired. One open listing per credit; cancel/redeem
and concurrent purchase serialize. Auction open -> closed winner/no-fill; bids
reserve funds, replacement adjusts reservation, losers release, closing is idempotent.
Purchase admitted -> funds held -> confirmed -> ownership; failure releases hold;
unknown keeps hold and blocks delivery. Simulated unknown/failed adapter outcomes
are explicit fault-injection fixture controls, never network claims.
Delivery content is checked before committing consumption. Known unavailable or
hash mismatch returns failure and retains usable entitlement (or explicit refund
and terminal invalidation); never both refund and deliver. Once response is persisted,
interrupted transport is recovered by same key. Expiry blocks protected bytes and
new trades; release open holds; refund only according to stated issuance terms.
MVP expiry policy: a confirmed, activated unused credit expires without refund.
Each primary or secondary trade retains its FULL gross consideration in its own
escrow bucket until successful delivery or expiry. No seller proceeds or fees are
spendable before that terminal event. On success/ordinary expiry each bucket pays
its recorded seller gross minus fee and the fee account floor(gross / 100).
On issuer delivery failure, atomically invalidate the right and refund EACH bucket
to its original payer; no seller proceeds and no fees are earned. This unwinds the
entire resale chain without double credit, including falling resale prices. Example:
A pays 100, B pays 150, C pays 80; escrow is 330. Failure refunds A=100, B=150, C=80.
Success pays the issuer and previous owners from their respective independent
buckets. The holder cannot receive both bytes and a failure refund.

Unknown settlement is a separate pending hold, never an activated trade. Freeze
the reserved supply/credit/listing and funds, including across expiry and restart.
Explicit failed reconciliation releases the same hold; confirmed reconciliation
activates the SAME intent only if its right is still usable. If expiry has passed,
refund its payer and terminally cancel that pending acquisition rather than paying
a seller for an unusable right. A blocked secondary trade must release the original
credit lock before settling its existing confirmed chain under ordinary expiry.
Do not let an arbitrary caller select a settlement result: local fault injection
and reconciliation belong to the explicit operator fixture role.

Sponsor funding is nontransferable. Consent binds beneficiary, exact resource,
price, campaign version and immutable packet hash. Keep budget consumed and
refunded totals distinct; a delivery refund returns money to the sponsor payer
but does not replenish its campaign allowance. A negative assessment may be stored
without changing funding eligibility or protected resource bytes.

## Chain choice and truth boundary

Solana is the intended first settlement rail, because AXP already has Devnet payment
channels and the hackathon product is Solana-based. Keep Tempo intact but do not
add a second market rail. This session implements a deterministic settlement adapter
with immutable intent and unknown-outcome reconciliation; **no new chain broadcasts**.
Existing finalized Devnet evidence remains linked and dated separately.

Today: catalog, ownership, transfer policy, order book, escrow, sponsor selection,
redemption and audit are local SQLite; nothing new lives onchain. A future scoped
Devnet release can bind intent hashes and settle balances using existing adapters.
Permissionless onchain transferable ownership would need a program with atomic
transfer/redemption locks and a cooperating gateway; an NFT plus offchain mutable
owner is insufficient. Defer deployment/program/token issuance until reviewed and
separately authorized. No false “onchain ownership” badge in this MVP.

## Threat/privacy model

Protect against actor spoofing outside local demo, IDOR, cross-owner replay,
malformed/unsafe integer amounts, duplicate requests, stale listings, double spends,
concurrent redemption/transfer, expiry/replay ordering, data tampering, forged
settlement receipts, prompt-injection in sponsor content, and response loss.
All sponsor packets are untrusted data; never executable instructions. Task text is
optional/minimized and excluded from public audit; never log credentials. Server is
loopback only and not deployable tenant auth. Local operator owns its DB and can
rewrite state; hash-linked events are not independent trust. Production requires
Supabase RLS/atomic procedures, authenticated ownership/wallet proofs, key custody,
rate limits, abuse controls, independent settlement reconciliation, issuer contracts,
data rights and commercial validation. None is inferred from fixture success.

## Phases, owners and readiness gates

0. Lead: inspect/read/base, review saved research, this plan, north star and status. Gate:
   defensible units, exclusions, lifecycle, acceptance and disk budget documented.
1. Sol 6.1 High core worker: transactional store/domain, catalog issuance, wallets,
   primary purchases, resale, auctions, escrow/refunds, expiry, receipts, sponsor
   budgets and fault adapter; meaningful domain/concurrency/restart tests. Own
   `packages/machine-market/{core,fixtures,contract}*`, core tests, CONTRACT.md.
2. Sol 6.1 High transport worker: HTTP boundary, local server, agent client and
   scripted procurement, end-to-end API tests, local runbook. Own api/client and
   `scripts/machine-market/`, API tests. Start against core's published contract.
3. Sol 6.1 High UI worker: new `/market/` route/components/CSS and typed client,
   six functional views and evidence drawer. Own only additive market UI files.
   Use existing dependencies/design. No broad rewrites, external APIs or mock
   frontend state as final authority. No concurrent heavyweight build.
4. Lead integrates, performs adversarial review, full repository regression,
   component tests/typecheck, one serial build, desktop/mobile browser QA and
   interrupted/repeated flow verification. Additional Sol review if needed.
5. Lead writes readiness matrix, demo script, limitations and current status.
   Local deliverable only; push/deploy/payment activation requires future authority.

## Acceptance matrix

| Case | Required observed outcome |
| --- | --- |
| Primary purchase | One debit, one supply decrement, exact unit/hash/owner; balanced escrow; restart retains it |
| A->B resale | One open ask, one fill, atomic owner change; A cannot retrieve, B can; seller proceeds backed |
| Double sale / concurrent buy | Exactly one succeeds; loser has no debit or right |
| Redemption | Correct owner/version/expiry; exact bytes hash; transfer then blocked |
| Duplicate command/delivery | Same payload/key returns same IDs, no duplicate fee/debit/delivery; changed payload conflicts |
| Expiry | No new trade/protected bytes even for cached retrieval; holds release according to policy |
| Cancellation | Owner-only open ask cancellation; race resolves once; buyer funds intact |
| Insufficient funds | Whole transaction rejected with no partial ownership/supply/budget mutation |
| Auction | Floor/cap enforced; deterministic first-price winner; losers released; no-fill available; close once |
| Delivery failure | No consumption on pre-delivery fault; explicit refund invalidates right and balances escrow |
| Uncertain settlement | Hold survives restart; no redeem/transfer/refund; positive reconciliation resolves same intent |
| Sponsor accepted | Exact consent/disclosure, eligible budget, sponsor pays once; direct access remains available |
| Sponsor rejected | No sponsor charge or access; buyer can choose direct; negative assessment does not block consented funding |
| Isolation | Public projections contain no protected bytes; wrong actor cannot mutate another's resources |
| UI | Complete issue/buy/list/buy/redeem and sponsor flow through UI; reload recovers; mobile no overflow; keyboard usable |
| Regression | Existing tests/routes preserved; failures distinguished from environment baseline |

## Polished demonstration (8–10 minutes)

1. Show vision and two inventory categories, with persistent local synthetic label.
2. Publisher issues a versioned research brief and bounded dataset sample; inspect
   obligation, remaining supply, expiry and transfer policy.
3. Buyer agent discovers offers under a hard budget, compares direct/sponsored and
   enters a primary auction. Show exact winner and released losing reservation.
4. Buyer A buys a report right, changes task, lists its unused right. Buyer B buys.
   Show ownership history and A's denied gateway request. B redeems exact version.
5. Retry B's retrieval and reload the app: same receipt, no extra charge. Attempt
   second sale: blocked because the right is consumed.
6. Sponsor desk approves exact packet and cap. Agent accepts funding, records
   “insufficient evidence” assessment, retrieves and sees separate disclosure.
   Demonstrate decline/direct option without changing independent resource text.
7. Inject uncertain settlement in a separate fixture purchase; funds remain held,
   no access. Reconcile the same intent, then deliver. Show a failed delivery refund.
8. Evidence drawer separates local ownership, delivery and settlement. Link the
   existing chat placement journey and historical Devnet proof with accurate dates.

## Disk/budget and stopping rules

Current free disk: 146,618,008 KiB (~139.8 GiB), directly checked 26 October; above user hard minimum 40 GB. Recheck before
large installs/builds and at phase boundaries. Allocate <=3 GiB source/worktree,
<=2 GiB build outputs, <=50 MiB market DB/logs. Shared existing locked dependencies
via read-only symlinks when compatible; never run install through shared link.
No new dependency needed for core/API. One UI build at a time. Stop new disk writes
with large projected growth before 40 GB; do not delete user files or caches.
Provider/RPC/payment/cloud spend budget = zero; no credentials, pushes, deployment,
external messages or writes to reference repos. Existing paid-run approvals do not
carry forward. All worker scopes share one isolated integration worktree with
exclusive file ownership to avoid duplicate dependencies and cherry-pick churn.

## Current orchestration and permission gate

The local lead is chat 01a17697-6b60-7d10-b3f8-678237905ad9. The requested lead
configuration is gpt-6-astra/high; parent dispatch reported acceptance. Goal was
created using the supported create_goal tool and get_goal returned active on
26 October. The registered local project is 2813a49b-a2fa-4d30-9363-efbe34267291.
Use ordinary local desktop builder chats with gpt-6.1-sol/high; no native
collaboration workers or cloud-executed substitutes. This existing Git worktree
is not app-managed (attach_worktree rejected attachment), so use its explicit
absolute working directory. Respect each chat's folder sandbox; request required
access rather than rebuilding in the original frontend checkout.

Phase 0 is complete when these amendments and NORTH_STAR.md are saved. Core must
publish CONTRACT.md before transport/UI couple to fields. Lead owns integration,
root scripts, dependency setup, all Git staging/commits and serial heavyweight
build. Builders own disjoint files and do not commit. Every phase records actual
checks and limitations in STATUS.md; no historical counts are reused.

The inherited masthead changes remove Sign in and change the responsive breakpoint
to match the user's frontend checkout. Preserve them as existing work pending
review; they are outside market implementation commits. Account routes remain
accessible directly and through existing product navigation.

## Reuse, adapt and new implementation matrix

Sources were selectively inspected read-only on 26 October. Historical results
below describe their original runs; this build must earn its own acceptance.

| Source | Treatment in this build | Prior working evidence and limits / lesson |
| --- | --- | --- |
| `packages/contracts/index.mjs` | Reuse compatible pure canonical hashing/validation; new market amount/role schemas | Existing contracts bind exact creative and receipt fields. Old placement schemas cannot describe transferable access. |
| `packages/exchange/index.mjs` | Adapt BEGIN IMMEDIATE, deterministic first-price selection, reservation/charge distinction, payload-bound idempotency | Existing exchange is operational source with fixture and dated hosted evidence. Its award remains nontransferable; do not repurpose its funded campaign state. |
| `packages/publisher-sdk/index.mjs`, `receipt.mjs` | Adapt strict response validation, stable operation identifiers, separate saved-result recovery and receipt binding | Published0.2.1 and historical acceptance are existing evidence, not new market SDK validation. New HTTP client uses the market contract. |
| `packages/product/payments.mjs`, native/Tempo adapters | Preserve existing code; adapt immutable intent, unknown-outcome quarantine and reconciliation invariants into local simulator | Recorded finalized testnet settlement proves identified channel runs only. No adapter invocation, key import, new payment or onchain-ownership claim. |
| `apps/product-ui`, `design-system` | Reuse PolySans, Ultramarine, Ledger/Prospectus tokens, fonts and app shell; add scoped market route/components | Existing design/routes remain intact. New connected workflow needs its own mobile/keyboard/reload QA. |
| `axp-agent-ad-experiments/protocol/src/exchange.mjs` (external read-only reference) | Adapt402 direct/sponsored choice, explicit consent, immutable separate packet, beneficiary/version/expiry binding and private retrieval recovery | October11 report documents one0.001testUSDC native WebMCP payment and same-receipt retry. Previous selector was policy, not auction; no secondary rights enforcement. |
| Same protocol `src/agent-adapter.mjs`, `src/mcp-server.mjs` | Adapt bounded typed actions, serialized stable operation recovery, manual redirect rejection and sanitized tool errors | Existing MCP/WebMCP are distinct transport implementations. Current market first exposes HTTP/CLI; native MCP/WebMCP integration remains a later adapter gate. Never copy cloud default origins or credentials. |
| `docs/research/AGENT_FACING_ADS_RESEARCH_AND_WEBMCP_HANDOFF.md` in original checkout | Preserve lessons and cited experiment provenance; do not import raw corpus/operational state | Exact-span checks do not prove comprehension/entailment. Genuine quotes supported false conclusions in constructed cases. Negative/insufficient assessment must not penalize consented funding. Transport failures, opt-out, missing disclosure and unrun cells remain distinct. |
| `axp-pitch/docs/evolution/cloudflare-integration/README.md` | Strategic reference for bounded task procurement and resource selection | Procurement advantage and Cloudflare integration are hypotheses. No managed gateway, wallet or production issuer integration exists in this MVP. |
| `cloudflare/browser-run-kitesurf-trial/README.md` | Read-only infrastructure/measurement reference; no execution or copied cloud client | Browser rendering/extraction is not purchase/delivery/attention evidence. Runtime failures must not become model-quality conclusions. |
| New `packages/machine-market` | New issuer-authorized unused access ownership, finite supply, secondary transfer locks, per-trade gross escrow/full-chain failure unwind, owner-before-replay redemption | These guarantees are not supplied by HTTP payment, NFT transfer or previous ad receipts. Require new domain/API/UI proofs, including rising/falling resale prices and unknown+expiry. |

Reference repositories remain untouched. No prior paid-run ceilings are reused.
The MVP's deterministic agent demonstrates procurement plumbing and budgets, not
fresh LLM judgment, targeting lift or commercial demand.
