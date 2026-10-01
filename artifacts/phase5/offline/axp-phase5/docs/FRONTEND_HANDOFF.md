# Final frontend specialist handoff

Brand line: **AXP.one — The advertising exchange for the agentic internet.**
The conversational AI ad marketplace is the first product wedge. Do not imply
this new repo has already replaced the public AXP website.

User intends to replace the axp.one site at release, with Vercel changes later.
Use shared design-system/tokens.css and fonts.css plus DESIGN_SYSTEM.md; exact
PolySans family, neutral paper/ink/steel palette and restrained metallic accents.
Do not reintroduce purple/green or choose new font families. Marketing homepage
and final product client have separate app roots; see REPOSITORY_MAP.md.

## Main builder owns

Backend/domain algorithms, persistence, protocol adapters, signer policy, APIs,
generated schemas/client types, mock fixtures, basic forms/tables/chat, tests,
reference sponsored-card renderer/acknowledgement and demo launch/evidence tooling.
Plain functional UI is required; final visual polish/animation is not.

## Specialist owns

Final design system, layouts, visual hierarchy, responsive treatment, polished
campaign/accounting screens, motion and final production-quality components.
Specialist consumes existing APIs and preserves receipt/disclosure semantics.
Never implement financial authority or auction arithmetic in browser code.

## Required screens

1. Campaigns: approved creative, targeting/exclusions, budget, max bid, activate/pause.
2. Publisher: slot policy, floor, allowed category, payout identity (read-only
   during active channel), opportunity/delivery records.
3. Demo chat: organic answer and independently labelled sponsored card; no-ad
   and failed-ad branches do not block answer.
4. Auction inspector: eligibility reasons, actual bid/skip, winner, price,
   agent model/runtime and measured latency.
5. Payment ledger: deposit, reservations, accepted unpaid charges, cumulative
   authorization, pending/unknown settlement, finalized payout, unused refund.
6. Evidence: live/synthetic/sandbox/Devnet/replay badges, receipt correlations,
   explorer only when actual network/signature exist, concise research limitations.

## Implemented contract handoff package

The specialist can start from `docs/frontend/SETUP.md` and `SCREEN_MAP.md`.
`packages/client/schema.mjs` is the frozen implemented-route registry;
`openapi.json` is OpenAPI3.1 and `index.d.mts` contains TypeScript DTOs.
`index.mjs` is a thin fetch/EventSource client, not another ledger. Nine fixtures
live in `artifacts/phase5/frontend/fixtures.json`, with recorded versus synthetic
provenance. Error/retry/SSE/local-CSRF semantics and setup commands are documented.
Tests cover real temporary reference-runtime responses and main's actual replay
routes. No independently invented mock API becomes the source of truth.

Read-only replay launcher: `npm run demo:replay` at127.0.0.1:8790. Financial mode
is sandbox; presentation kind is recorded_evidence_replay. All replay POSTs are
405, and client writes fail before fetch. Do not use runtime payment or provider
routes to rehearse. Final website/layout/motion and public release remain separate.
Older contracts and demo packets are labelled historical planning. They are not
permission to assume inventory/bids/payment-session routes exist.

Accessibility floor for basic and final UI: visible Sponsored label, keyboard
operation, associated form labels, readable errors/status text, no reliance on
color alone and reduced-motion support where animation is later added.

The specialist does not need wallets, private config, signing keys, raw model
transcripts or customer data. Use sanitized fixtures; read-only replay must
contain no funding or transaction routes. A displayed signed assertion is not
proof of human attention. Do not promote unaudited creative claims as fact.
