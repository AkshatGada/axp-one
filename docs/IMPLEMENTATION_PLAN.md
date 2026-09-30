# Build sequence, harness and completion criteria

Current scope: implementation approved on 2026-09-30 after user review of the
expanded component package. Test-network spending retains bounded authorization.

Priority order: protocol feasibility -> correct auction/accounting -> ready test
agents -> complete basic demo -> final frontend handoff. Production-only work is
deferred. A06 uses an actual organic-answer run and card, not a user acquisition
or commercial effectiveness study. User requested one focused spec audit, not
continuous audit/optimization loops. DEMO_AND_AGENT_HARNESS.md owns the demo matrix.

## Phase 0 — Plan and independent audit

Deliver North Star, references, architecture, contracts, algorithms, payment
gates, flows, frontend handoff and acceptance matrix. Fresh gpt-6.1-sol high
reviewer reads repo without author conversation; identifies contradictions and
feasibility traps. Record raw findings, corrections and bounded recheck.
Stop for user review; no application source or package installation in this phase.

## Phase 1 — Protocol feasibility, before dashboards

Pin payment SDK and test-network configuration. Test PAYMENTS.md gates in a
small isolated spike; write a pass/fail artifact with actual network/program,
SDK version and source hashes. No network downgrade masked as Devnet success.
Inspect pinned AdCP discovery schemas and record the exact scope/unsupported
capabilities. Generate canonical schema/OpenAPI before the specialist starts.
If receipt-driven dynamic metering cannot be supported, revise spec and obtain
direction rather than constructing a custom payment channel program.

## Phase 2 — Deterministic backend vertical slice

SQLite migrations; campaign/publisher versioning; policy gate; first-price auction;
atomic reservations; render tokens; delivery receipts; durable charge/outbox;
synthetic payment adapter and recovery. Prove all ledger failures without tokens.
No final UI. Reference endpoints plus CLI demonstrate one complete synthetic cycle.

## Phase 3 — Real buying agents and publisher reference app

Three bounded contexts, one model family, frozen task matrix and deterministic
baseline. Record actual output/model/latency/error provenance. Basic campaign
forms, publisher settings, chat with separate card, event/receipt tables.
Real organic answer independent of sponsor material. Tool/CLI auth failures must
not be relabelled successful agents; validate actual available runtime first.

## Phase 4 — Channel integration

Replace only payment adapter after phase-1 evidence and fresh bounded authorization.
Open channels, reserve awards, accept real render receipts, sign cumulative
increments, close and verify balance deltas/refund/finality. Fault injection
offline; keep live transaction count and amounts minimal and preapproved.
No automated mainnet fallback, top-up, pooled custody or extra live purchases.

## Phase 5 — Handoff, targeted review and reproducible demo

Generate fixtures/client contract and basic integration examples for frontend
specialist. One fresh focused review of backend/receipt/payment claims, fix
substantive blockers only. Launch script, walkthrough, sanitized evidence bundle
and receipt-replay backup (labelled not live). Final frontend stays specialist-owned.

## Verification loop

Before each phase, check North Star -> identify its acceptance IDs -> implement
only that slice -> run deterministic tests -> preserve evidence -> list remaining
gaps. Record plan deviations explicitly before continuing. No broad production
hardening sprint or additional research rounds needed to pass unrelated criteria.

Required run manifest: run ID, mode/network, commit/source hashes, schema/policy
versions, SDK/model/effort, fixtures, signer authority boundary, timestamps,
attempt counts, all receipt IDs and transaction signatures. Synthetic/model/live
results are separate, never mixed into one implied successful end-to-end test.

## Acceptance matrix

| ID | Check | Required evidence |
|---|---|---|
| A01 | Campaign rules, cap and creative versions | schema + owner/auth tests |
| A02 | Off-target higher bid cannot win | frozen negative fixture + rejection trace |
| A03 | First-price winner and tie rule | deterministic auction tests |
| A04 | Real model bid and skip, 3 isolated buyers | actual recorded model calls + output validation |
| A05 | Concurrent awards never exceed budget/channel | SQLite race tests and conserved balances |
| A06 | Organic answer and sponsored card separated | actual model input provenance + browser test |
| A07 | Failed/expired/no-fill placements cost zero | receipts + ledger assertions |
| A08 | Receipt/key replay and different keys for same turn cannot double charge | business-unique opportunity + concurrent/restart tests |
| A09 | Two accepted charges on same channel advance cumulative voucher | protocol spike + actual integration evidence |
| A10 | Unknown signing/settlement reconciled without new spend | fault-injected restart/outbox tests |
| A11 | Channel payout + unused recovery finalized | chain receipt and token/fee/rent reconciliation |
| A12 | Losing campaign remains uncharged | before/after ledger and chain reconciliation |
| A13 | Mode/claim/privacy/auth boundaries | projection tests and focused independent review |
| A14 | Frontend is a client, never financial authority | client fixtures + contract integration test |
| A15 | Reproducible launch and labelled replay | operator runbook + sanitized demo manifest |
| A16 | AdCP discovery scope honest and validated | pinned schema tests or explicit unavailable status |

Done means these acceptance IDs have evidence, not that README says complete.
Phase 3 includes the bounded DecisionEngine comparison in JEV_BENCHMARK_PLAN.md;
Jev powers optional buyer bid/skip judgment, not financial authority. Missing
model access or inconclusive quality leaves the explicit rules baseline in place.
Test receipt admission at expiry and closure before freezing cumulative totals.
If A09/A11 cannot run on Devnet, report blocked rather than mark them passed by
synthetic or sandbox tests. Final visual polish is not an acceptance requirement
for the backend/basic UI owner; frontend handoff readiness is.
