# Specialist screen and state map

This maps current data to future screens; it is not final design or evidence of
implemented product routes. Main's replay UI is the plain fallback. Specialist
owns `apps/product-ui` and `apps/marketing`; no second auction, budget ledger or
payment signer belongs in either client.

Use existing `design-system/tokens.css`, `design-system/fonts.css` and eight
WOFF2 files in `design-system/fonts/`. Follow `docs/DESIGN_SYSTEM.md`: PolySans,
neutral paper/ink/steel, restrained edges and existing spacing ladder. Font
provenance/rights remain as documented; no new font family, asset copying,
animation system or marketing layout is introduced by this sidecar.

| Screen | Runtime source / replay key | Required presentation and boundaries |
|---|---|---|
| Campaigns | `state().campaigns` / `campaigns` | Approved fictional copy, immutable version, declared constraints, max bid/cap strings. Runtime create/pause only; replay has no actions. No activate route is claimed. |
| Publisher | `state().channels`, opportunities/awards / `deliveries`, `payment` | Read-only publisher/payee identities, channel binding and observed disclosure. No inventory/settings endpoint is claimed. |
| Chat | `turn()` / `turns` | Independent organic answer and separate Sponsored card. No-fill/failed ad does not erase the answer. Never call render/recovery while replaying. |
| Auction inspector | Turn attempts/outcome / `decisions`, `turns` | Actual bid/skip vs policy exclusion, integer first-price amounts, rejection reasons and engine timing/provenance. Phase4 has only one funded bidder. |
| Payment ledger | State charges + optional payments / `payment`, `chain`, `deliveries` | Deposit/reserved/accepted/authorized/settled/refund distinct. Exchange charge can remain accepted while separate payment is finalized. Never infer status progression by overwriting source records. |
| Evidence/research | Lookup/recorded summary / `evidence`, `research`, `restart`, `limitations` | Observed historical brands vs inferred hints vs fictional bidders; no proven targeting/latency/conversion lift. Restart evidence proves no new calls/charges for that replay, not universal production guarantees. |

Global header shows presentation **recorded evidence replay**, financial mode
**sandbox**, original recording timestamp, run ID and read-only state independently.
`financialMode` is not `presentationKind`. Runtime bootstrap uses `mode`, while
recorded results' `mode: recorded_results_not_fresh_execution` is a presentation
label, not a valid FinancialMode. `/health.realPayments` describes configured
runtime mode, not proof that the current request settled anything.

| State | Render behavior |
|---|---|
| Empty/loading | Explain what is loading and its source; do not insert zero amounts for missing evidence. |
| Error/unavailable | Readable error code/recovery guidance; no silent model fallback or automatic write retry. |
| awarded | Show winner/price and delivery state separately; award alone is not a charge. |
| no-fill | No sponsored region; preserve independent answer and no-charge explanation. |
| failed_delivery | Failed/expired label, released reservation, no accepted charge; no retry implying a new placement. |
| accepted_unpaid | Delivered assertion accepted, authorization missing; visibly unpaid inventory. |
| authorized | Cumulative authority, not payout. Never sum 3000 and6000 into9000. |
| pending/unknown | Obligations remain held; no finalized/refundable badge, no fresh payment/replacement channel. |
| finalized | Show sandbox payout6000/refund14000 from deposit20000; fees/rent in test lamports separately. |
| competing_bids | Prominent Hypothetical / synthetic test badge, two synthetic funded bidders. Never splice into original recorded event timeline. |

Accessibility baseline: visible Sponsored label, labelled controls, keyboard
operation, readable status/error text, no color-only status, sufficient contrast
and reduced-motion support for any later animation. Keep approved copy as text;
approved HTTPS links must not become HTML/scripts or automatic external fetches.
Use mono typography for exact IDs/amounts; formatting is display-only, never
financial computation in floating point.

Do not conflate the receipt with attention, endorsement, absorption or booking;
the owned application's insertion/disclosure is what it asserts. Preserve the
operator-recorded independent-answer bridge caveat, sandbox-not-Devnet label and
single-funded-bidder limitation on public-facing evidence screens.
