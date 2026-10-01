# AXP V3 frontend specialist handoff

Final visuals/motion remain specialist-owned. The functional console uses the
existing PolySans fonts, neutral palette/spacing and restrained steel accents in
`design-system/`; provenance remains in DESIGN_SYSTEM.md and its asset register.
Do not transplant ContextHint components or duplicate auction/payment logic.

## Implemented routes and ownership

`packages/v3/client.mjs` and `client.d.mts` are the thin browser client and DTOs;
`docs/frontend/v3-openapi.json` documents the implemented route surface.
`apps/backend/v3.mjs` owns
the actual loopback routes. Launch `npm run demo:v3`, port8794. No wallet API.

| Route | Method | Meaning |
|---|---|---|
| /health | GET | Financial network, replay/model-enable status |
| /v3/bootstrap | GET | CSRF (runtime only), scenarios, limits, evidence manifest |
| /v3/state | GET | Drafts, frozen acceptance, organic waiting/completed, decisions, exchange and safe payment projections |
| /v3/evidence | GET | Frozen public catalogue; never vectors |
| /v3/retrieval?question=&campaignId= | GET | Bounded own-campaign cached-vector/lexical/unavailable evidence |
| /v3/events | GET | Saved event array with original sequence/timestamps |
| /v3/campaign | POST | New laboratory campaign version/approval/pause/caps |
| /v3/preview | POST | Deterministic preview; zero provider calls |
| /v3/turn/request | POST | Persist exact-question organic request; no fabricated completion |
| /v3/turn/run | POST | Requires exact completed organic answer and separately enabled bounded Jev transport |
| /v3/awards/:id/render | POST | Owned-app DOM/disclosure acknowledgement; server signs publisher receipt |
| /v3/awards/:id/fail | POST | Reject delivery; no accepted charge |
| /v3/replay/bootstrap, /run, /events | GET | Aliases for read-only saved replay |

All replay non-GET requests return405. Runtime POST requires x-axp-csrf from
bootstrap. Only local Host/origin accepted. Stable turnId/question bindings are
the retry identity. The client has no automatic retry or generic signing method.
Organic completion recording and payment freeze/open/authorize/close/reconcile
are terminal-only. Backend retains auction, signed receipts, budgets and signing.

## State-to-screen map

1. Foundation: immutable export counts/provenance; observations are not bidders.
2. Advertiser: fictional declared capabilities, approved copy/hints, immutable
   versions, bid/budget caps and pause. Later lab edits never change sandbox freeze.
3. Evidence chain: exact question -> method -> observed prompt/creative -> inferred
   hint -> compact actual model packet -> returned judgment, with source hashes.
4. Conversation: waiting/completed/unavailable and exact question/turn/inputHash;
   model completion provenance distinct from live or replay presentation.
5. Decision/auction: baseline/history differences, actual skip vs policy exclusion
   vs unavailable, measured timing, deterministic bid and winning reservation.
6. Delivery: independent organic text plus separate Sponsored card; charge only
   after accepted acknowledgement. Not attention or recommendation.
7. Accounting: deposit, reservation, accepted charge, cumulative authorization,
   pending/unknown/finalized payout and unused refund remain separate.
8. Scope: hosted sandbox vs recorded replay vs synthetic laboratory. Never show
   V1 payment as settlement for V3; only V3-correlated evidence qualifies.

Financial mode is `sandbox` or `synthetic`; execution is actual Jev/app-agent,
fixture, deterministic reference or unavailable. Presentation/replay is another
field. Never infer finalized payment from a submitted transaction signature.
Public payment evidence exposes hashes/identifiers, not signed spending vouchers.

## Current build acceptance

The completed `v3-wallet-acceptance` run contains 15 actual Jev responses,
four independent organic completions, two genuinely competing funded campaigns,
three accepted disclosed deliveries and two finalized native MPP channels.
ClearVault accumulates 4000→7000, pays7000 and refunds13000; KeyForge pays3000
and refunds17000, all in six-decimal test-USDC base units. Both live closes have
positive spending; zero-spend closure is unsigned simulation/fixture coverage.
`artifacts/v3/replay/run.json` is the hash-verified accepted-run state and evidence;
it is the real source for completed screens. `npm run demo:v3:replay` needs no
credentials or network. The captioned four-minute recording and narration are
under `artifacts/v3/recording/`. See `V3_RESULT.md` for acceptance and claim limits.
`v3-fixtures.json` supplies explicitly synthetic state fragments for layout work;
they are not a completed recorded run and must never enter acceptance artifacts.
