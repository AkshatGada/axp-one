# Component execution and orchestration plan

Status: proposed for user review; planning only. No builders dispatched.

## North Star and ownership

Demonstrate a conversational advertising exchange: advertiser agents bid or skip,
deterministic rules select a winner, an owned publisher renders a disclosed card,
accepted delivery creates a charge, and repeated charges settle through a Solana
payment channel. ContextHint observations inform targeting, not conversion claims.

The main agent owns architecture, contracts, task assignments, integration and
the final demonstration. Component builders use gpt-6.1-sol with high reasoning,
subject to runtime availability; no silent model substitution. Fresh reviewers
do not review their own builds. The final frontend remains specialist-owned.

## Planning gate before implementation

For every component, prepare a packet containing:

1. Purpose and explicit non-goals.
2. Primary research references, unresolved questions and selected approach.
3. Versioned inputs, outputs, errors and state transitions.
4. Dependencies, assigned files and ownership boundaries.
5. Algorithm or protocol pseudocode, fixtures and acceptance tests.
6. Evidence required, focused reviewer checklist and handoff instructions.

The orchestrator resolves cross-component contradictions and presents the packets
and dependency graph for user review before authorizing implementation. Existing
research should be reused; do not repeat completed exploration without a concrete
missing decision. This document schedules work; it does not mean packets exist.

## Component assignments

| ID | Component and builder scope | Dependencies | Required demonstration |
|---|---|---|---|
| C01 | Data builder: bounded ContextHint export, deduplication, quality flags and leakage-safe splits | Approved export contract | Reproducible small dataset; upstream unchanged |
| C02 | Targeting builder: campaign profiles, rules/embedding engines and optional Jev adapter | C01; common DecisionEngine contract | Frozen relevance/latency comparison; explicit fallback |
| C03 | Agent builder: isolated advertiser bid/skip clients and bounded outputs | DecisionEngine and bid-intent contracts | Real eligible skip and bid; no financial authority |
| C04 | Exchange builder: campaigns, opportunities, eligibility, integer bids and first-price auction | Shared schemas; C02/C03 can initially use fixtures | Off-target high bid rejected; deterministic winner/tie/no-fill |
| C05 | Delivery builder: reservations, render tokens, receipt acceptance and ledger | C04; payment adapter contract | Failed delivery costs zero; duplicate/restart cannot double charge |
| C06 | Payment builder: MPP session feasibility spike, then replaceable Solana adapter | Spike first; integration depends on C05 | Two accepted charges on one channel; cumulative settlement and refund evidence |
| C07 | Demo builder: plain owned publisher app, campaign controls and event console | Frozen APIs; C04/C05 | Organic answer separate from sponsored card; actual event labels |
| C08 | Orchestrator: launch/run harness, evidence bundle, recording and frontend handoff | All components | Reproducible end-to-end run and labelled replay |

C06 feasibility tests dynamic auction amounts, post-receipt authorization, chosen
test network and SDK/program support before committing to the payment design.
Unsupported capability triggers a documented decision, not custom channel-program
development or a concealed network substitution. Funding requires separately
bounded authorization; planning does not authorize token movement.

## Build waves after planning approval

1. **Foundation:** orchestrator freezes schemas, fixtures, adapter interfaces and
   directory ownership. Payment builder runs the small feasibility spike; data
   builder prepares the bounded offline dataset in parallel.
2. **Synthetic vertical slice:** exchange and delivery builders connect one
   campaign to one opportunity, card, receipt and synthetic charge. Targeting
   builder works against frozen fixtures in parallel. Integrate now, not at end.
3. **Agent and data slice:** connect targeting and actual advertiser agents;
   benchmark with fixed cases. Demo builder starts against stable API fixtures.
4. **Network slice:** integrate the approved payment adapter, accumulate two
   accepted deliveries on one channel and reconcile actual settlement.
5. **Full demonstration:** orchestrator runs the complete story, packages evidence,
   requests one fresh focused system review, fixes blockers and hands over APIs
   and basic UI behavior to the final frontend specialist.

## Coordination and review rules

- At most three builders active concurrently; parallelize only independent work.
- Give each builder an isolated branch/worktree once implementation is approved.
- One owner per directory; shared contracts are orchestrator-owned. Builders
  propose contract changes rather than independently editing shared interfaces.
- Task prompts include the North Star, exact scope, acceptance IDs from
  IMPLEMENTATION_PLAN.md, fixtures, forbidden actions and reporting format.
- Every handoff reports changed files, commands/tests, actual evidence, unresolved
  issues and requested contract changes. Merge only compatible, tested slices.
- Each component gets builder tests, orchestrator integration checks and one
  bounded fresh review. Review connected small components together when sensible;
  do not create eight broad audit cycles. Fix material algorithm/protocol/demo
  blockers and perform one focused recheck.
- Review is not proof of model independence. Use fresh context and fixed criteria.
- Deferred: production scaling, commercial billing, managed deployment, mainnet,
  broad platform integrations and final visual design.

## Whole-system and demo gates

Preserve the existing acceptance matrix. Required evidence includes actual agent
bid/skip, relevance rejection, winner/no-fill, receipt-linked charges, untouched
losing budget, replay without duplicate payment, two cumulative charges on one
channel, settlement reconciliation and a successful recorded full flow. Show
synthetic, actual model and actual network execution separately.

Maintain a single progress register: planned -> spec ready -> approved -> building
-> tested -> reviewed -> integrated -> demo proven. Do not mark a component done
because its isolated tests pass while its integration remains unverified.
