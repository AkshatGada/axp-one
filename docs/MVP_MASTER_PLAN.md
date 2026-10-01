# AXP MVP master plan

Date: 2026-09-30. Status: reviewed by user; phase-by-phase implementation restarted.
This is the build entry point. Existing component packets supply detailed
contracts; they are not evidence that the integrated product works.

User-approved existing-data reuse update:
[DB_REUSE_PHASES.md](DB_REUSE_PHASES.md) overrides fresh corpus embedding proposals.
Reuse local `ads` vectors/hints/mappings through bounded read-only preparation;
no PostgreSQL clone, upstream edits or corpus re-embedding. An unrecorded vector
artifact revision remains explicit. Existing demo algorithms are preserved.

Execution policy: [demo-first verification and completion loops](EXECUTION_LOOPS.md)
defines fixed versus experimental parts, parallel lanes, drift checks and final gates.

## 1. The concept, before the components

**AXP.one is an advertising exchange for conversational AI applications.**
An advertiser configures a campaign. Its buying agent decides whether a relevant
conversation is worth bidding on and which approved ad fits. A participating AI
app offers a sponsored-card slot. AXP filters candidates, runs a deterministic
auction, returns a separate disclosed ad, and charges only for accepted delivery.
Repeated charges accumulate toward a capped stablecoin channel settlement.

The advertiser buys a placement, not an organic recommendation, a citation or
proof that the research assistant absorbed the ad. The publisher in this MVP is
the AI-app operator, not a paywalled-report owner. The older sponsored-access
prototype is a reference, not the transaction being demonstrated here.

ContextHint data is intended to inform targeting: historical prompt-to-ad
associations, creative text, inferred hints and compatible vectors. It does not
give us observed conversion probabilities or ChatGPT's proprietary ranking.
We must test whether using that evidence improves decisions over declared
campaign text alone; its existence is not proof of an algorithmic advantage.

## 2. What the complete demonstration must prove

One owned travel assistant, three fictional advertisers, isolated buying-agent
contexts, approved creatives and one sponsored-card format:

- A relevant advertiser bids; another eligible advertiser genuinely skips a
  poorly fitting creative. A deterministic exclusion is not that agent skip.
- Two relevant candidates can compete; a higher-paying off-target advertiser
  cannot buy its way past eligibility.
- The organic answer is generated separately from the ad decision.
- Accepted rendering produces one correlated charge. Failed rendering produces none.
- Two placements accumulate on the same channel, with losing budgets untouched.
- Actual settlement and unused-funds recovery use the explicitly identified
  network and protocol, or are reported blocked rather than called completed.
- The targeting comparison shows measured quality, latency and failures with
  provenance. No fabricated training, performance or conversion claims.
- A launcher, evidence bundle and recorded walkthrough reproduce this story.

Final visual design belongs to the frontend specialist. Backend behavior,
functional screens, publisher integration and demo evidence belong to this build.

## 3. System and dependency map

```text
Read-only ContextHint export
  -> curated, versioned snapshot -> vectors/index -> campaign evidence profiles
                                                        |
Advertiser campaign -> approved creative + rules + budget |
                                                        v
Publisher task -> sanitized opportunity -> hard eligibility
  -> isolated advertiser DecisionEngines -> validated bid/skip/abstain
  -> code-computed bids -> deterministic auction -> reservation + award
  -> separate Sponsored card -> publisher render receipt -> accepted charge
  -> capped cumulative authorization -> channel settlement + refund

Organic-answer model ----------------------------------> independent answer
Every stage --------------------------------------------> correlated event console
```

Strategic campaign-planning agents are not required in the live auction. The
fast model suggests task fit and creative choice. Deterministic code alone owns
eligibility, bid amounts, budgets, auction outcomes and payment authorization.

## 4. Component-by-component build contract

For each row: research/spec first, then build, then tests plus a focused review
of the connected slice. Do not start a dependent component before its seam is
frozen. Main owns interfaces and integration; Sol 6.1 High builders own narrow
directories. No silent model substitutions.

| Component | Inputs and outputs | Research/spec decisions to close | Completion evidence |
|---|---|---|---|
| C00 Contracts and coordinator | Versioned campaign/opportunity/decision/award/receipt/payment DTOs | Reconcile existing ML and exchange DTOs, time units, IDs, errors and mode labels; select supported runtime | Executable schemas, API fixtures and one integration seam test |
| C01 ContextHint data adapter | Approved background corpus -> small snapshot + manifest | Exact read-only source/query, allowed fields, provenance, export caps and grouped split viability | Real bounded travel snapshot, reconciled counts/hashes, upstream unchanged; no private chats/customer state |
| C02 Embeddings, retrieval and profiles | Snapshot + approved campaign -> versioned vectors/index/profile | Cached BGE revision compatibility; live embedding provider for unseen tasks; positive/contrast retrieval; sparse-data behavior | Actual unseen task embedded, neighbors retrieved, evidence-backed profile produced; no fixture vectors presented as real embeddings |
| C03 Decision engines and targeting evaluation | Same opportunity/campaign/profile -> relevance, intent, creative, bid/skip/abstain | Rule, text-embedding, history-embedding and Jev arms; actual provider transport/model, output mapping, deadlines/call limits; labels | Frozen held-out cases, measured quality/latency/cost/failures, engine recommendation; actual model bid and eligible skip |
| C04 Advertiser campaign/DSP controls | Operator settings -> immutable campaign versions + isolated buyer requests | Campaign lifecycle, declarations vs evidence, creative approval, max bid/cap, engine configuration | Create/pause/version campaign; buyer sees its own non-financial context only; invalid model output cannot bid |
| C05 Publisher opportunity and organic answer | User task -> minimal opportunity + independent answer | Taxonomy, missing constraints, private-text removal, one opportunity per turn; actual answer-model runtime | Publisher submits real task, organic answer unaffected by ad failure, duplicate turn does not create another purchase |
| C06 Auction and reservations | Eligible decisions -> executable bids -> award/no-fill | Frozen integer score-to-bid policy, first-price/tie rule, deadline, frequency and cap behavior | Explainable winning bid; higher off-target rejected; ties/no-fill/budget branches and losing spend reconciled |
| C07 Publisher delivery SDK and ledger | Award -> DOM render -> authenticated receipt -> charge | Receipt binding, expiry boundary, rejected/failed render, replay and reservation release | Actual disclosed card rendered; receipt accepted once; failed/expired render zero charge; restart preserves outcome |
| C08 Payment channel adapter | Accepted charges -> cumulative authorization -> settle/refund | Bounded usable MPP SDK artifact; deployed ABI/treasury/accounts; existing Devnet wallet identity/mint; exact increments and saved final voucher | Two actual receipt-linked increments on one channel; finalized payout/refund and explorer evidence, no duplicate authorization |
| C09 Local API and reference console | All components -> advertiser/publisher/operator views + event stream | Freeze HTTP/SSE responses, server-only keys, distinction between ad price/accrual/authorization/settlement | Functional campaign editor, chat/card, decision comparison, auction trace and payment timeline against actual backend |
| C10 Run harness and evidence | Frozen fixtures + runtime configuration -> reproducible run/recording | Launch/reset without destroying history, model/network preflight, replay fallback, four-minute script | Complete recorded run, correlated manifests/receipts/results, exact runbook; replay clearly read-only |
| C11 Frontend handoff | Stable API/state map/design tokens -> specialist package | Empty/loading/error/no-ad/pending/settled states and safe projections | Schemas, fixtures, SDK client, screen map, fonts/styles/steel accents and working reference UI; no second frontend ledger |

These identifiers extend the older C01–C08 packet grouping. Existing acceptance
IDs A01–A15 remain unchanged; use component names when cross-referencing older
packets to avoid confusing old C06 payments with this table's C06 auction.

## 5. ML is a deliverable, not just an adapter

Required execution path:

1. Read-only export of the approved ContextHint travel background subset.
2. Curate duplicates, distinguish observed mappings from inferred hints, and
   assign grouped example/validation/test partitions before tuning.
3. Reuse vectors only with matching model revision, dimensions and exact text;
   provide a bounded real embedding runtime for new tasks. A cache that only
   accepts already-known text is not a complete live embedding solution.
4. Build each fictional campaign's profile from task-relevant background evidence,
   not by pretending historical real brands are participating advertisers.
5. Compare rules, creative-text embeddings, history-informed embeddings and
   history-informed Jev on identical tasks and deterministic financial policy.
6. Freeze 40 pilot cases and reviewed fit labels. Unobserved ad pairs are not
   automatically negatives. If grouped historical splits are infeasible, separate
   a labelled fictional task-fit benchmark from historical corpus diagnostics;
   do not claim historical held-out lift.
7. Implement and exercise actual Jev HTTP transport with server-side credentials,
   a pinned model and explicit bounded-call configuration. The key alone does
   not supply a usable provider integration or a measured latency result.
8. Record top-choice fit/NDCG where labels support them, bid/skip errors, repeated
   agreement, retrieval misses, p50/p95/p99 total decision time, throughput at
   stated concurrency, failure rate and attempted-decision cost.
9. Assess <50, 50–100, 100–250 and 250–500 ms from measured end-to-end latency.
   Recommend an engine based on results; retain Jev as replaceable.

No training claim is required for embedding retrieval or Jev inference. A small
traditional classifier/ranker and small/large LLM arms need a documented
feasibility assessment; implement only if labels/runtime fit the pilot. Report
unavailable arms explicitly. Do not train a showpiece model on invented labels.

## 6. Protocol and payment decisions

- AXP adds the opportunity/offer/award/delivery/charge exchange. It does not
  redefine a payment protocol or claim an adopted advertising standard.
- MPP session channels remain the proposed repeated-payment rail. Native voucher
  encoding and settlement must come from a compatible pinned SDK/program.
- x402 exact is a separate future fixed-payment adapter; an old successful x402
  transfer does not prove this channel demo. Do not quietly swap it in.
- AdCP/OpenRTB are explicit mapping references; actual adapters require pinned
  schema/capability scope. MCP is optional tool transport. WebMCP is a browser
  adapter, not a Cloudflare payment standard. None are completion claims here.
- Two accepted charges add to one cumulative total. Settlement closes against
  the saved final authorization, not another newly invented placement.
- Real payment remains gated on usable artifact, network compatibility and
  bounded transaction terms. No mainnet, custom channel program or hidden
  sandbox-for-Devnet substitution.

## 7. Build waves and exit gates

| Wave | Work | Exit before advancing |
|---|---|---|
| P0 Planning reset | Review this concept, component matrix, required ML path and demo; reconcile old status docs | User reviews master plan; unresolved decisions listed, not hidden |
| P1 Foundations/feasibility | Main freezes shared seams; data builder produces real bounded snapshot; payment builder resolves artifact/network feasibility | Snapshot available, interfaces compatible, actual payment route classified ready/blocked |
| P2 Data-backed decisions | Embedding runtime + profiles + live Jev transport + frozen benchmark + isolated buyer runner | Actual data-backed decisions; real bid/skip; measured baseline/model comparison |
| P3 Connected exchange | Campaign controls, publisher/organic answer, auction, delivery SDK, ledger and local API | One complete rendered placement produces one accepted charge; no-fill/failed render work |
| P4 Network accounting | Connect accepted charges to compatible channel adapter | Two charges same channel, actual settlement/refund, restart/replay reconciliation |
| P5 Full demo/handoff | Reference screens, launcher, recording, evidence and focused fresh review | Complete reproducible flow; blockers fixed; frontend specialist package ready |

Independent data/payment feasibility can run in parallel. Do not build polished
screens while missing data/runtime/payment decisions remain unresolved. A
synthetic slice is useful development evidence, not the final completed demo.

## 8. Demo case matrix

| Case | What the audience learns | Required source of evidence |
|---|---|---|
| Singapore/Marina Bay hotel, free cancellation | Relevant candidates compete; highest off-target bid rejected | Actual eligible decisions, rule trace and auction amounts |
| Solo traveller vs eligible group-only creative | Agent can decide not to buy, even when hard policy permits it | Actual model skip, not pre-filter or supplied answer |
| Same prompt, baseline vs history engine | What data changes and whether the change improves fit | Frozen labels, retrieved evidence and side-by-side measured results |
| Legitimate second turn | Per-placement prices accumulate, not charged twice | Two correlated receipt/charge IDs, one channel total |
| Informational/no-fit task | Exchange can return no ad while still answering | Organic answer and no-charge outcome |
| Render failure, duplicate, restart | Advertiser pays only for accepted delivery | Labelled test evidence plus ledger replay |
| Channel close | Publisher payout and unused budget recovery | Actual network receipts; synthetic fallback clearly labelled |

## 9. Current evidence and gaps — not completion claims

- Main contracts/rule buyer/exchange: 17 local tests passed on 2026-09-30;
  synthetic behavior only, not connected UI or real payment.
- Data worktree: curator/profile/embedding-engine/Jev-adapter/benchmark code
  exists; 12 data tests passed at inspection. Real export, live unseen-task
  embeddings, actual Jev calls and quality/latency comparison remain unverified.
- Payment worktree commit 805c06c: synthetic adapter and read-only network
  observations. Builder reports 17 synthetic tests. Devnet program presence and
  mint metadata are not ABI/treasury compatibility or settlement.
- Payment SDK dependency attempt exceeded its bounded footprint and was stopped;
  need a smaller usable artifact plan, not repeated broad installation.
- CLI real-agent preflight rejected the requested model for the current login;
  the actual runnable client/model seam remains unresolved. App builder model
  availability does not prove standalone demo-client availability.
- No integrated full run, final recording, actual channel transaction, production
  deployment or completed ML superiority result exists.

## 10. Workflow, ownership and stopping rule

Keep at most three builders active with separate worktrees and disjoint owned
paths. Main owns contracts, merge decisions and end-to-end evidence. Assign a
component only with its packet, dependencies, acceptance IDs and exact handoff.
Progress states: planned -> spec ready -> approved -> built -> tested ->
integrated -> demo proven. Fixture-only work never advances to demo proven.

Use builder tests and main integration checks, then one focused fresh review
per connected slice. Final review checks algorithms, claims and real demo
evidence. No broad production-security/scaling audit loops.

Before each wave, check: does this directly enable the stated story, does it
complete a required component, and what observable artifact proves success?
If not, defer it. If a required runtime/network capability is blocked, report
the exact decision needed; do not silently lower the definition of done.

Implementation restarted by user instruction after the planning reset. Preserve
existing partial code/worktree results. No paid calls, transactions, push,
deployment or global installation/configuration change follows from this restart.
