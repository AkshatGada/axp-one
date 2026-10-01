# Advertiser dashboard — functional simulation completed

Completed 2026-10-01 in `/Users/akshat/agentic-dsp`. No push/deployment or final
visual frontend. Run with `npm run demo:advertiser`; loopback port 8792.

## Delivered

- Fictional business onboarding and five-step campaign wizard; persisted drafts,
  approval, preview without spend, launch and pause/reactivation.
- Bounded offline ContextHint catalogue: 18 real historical associations,
  13 prompts, 16 unique creatives and 14 historical advertisers. Each observed
  association includes creative copy and an inferred hint. No full DB clone,
  new embedding generation or ContextHint production mutation.
- Selectable references and inferred hints copied as editable hypotheses;
  separate operator-authored fictional Sponsored creative. Inferred data never
  enrolls a historical advertiser or proves targeting/conversion lift.
- Editable conversational simulation with deterministic buyer bid/skip,
  integer first-price auction, capabilities, floors, campaign caps and frequency.
- Actual owned-browser card insertion/acknowledgement and receipt-correlated
  synthetic charges. Organic reference text gets no advertiser material.
- Separate deposit/reserved/accepted/authorized/settled/refund states. Budget
  changes remain server-owned; browser has no signing/native payment authority.
- Launcher, operator runbook, separate implemented-route handoff, typed browser
  client and screenshot evidence. Final visual layouts/motion remain deferred.

## Verification evidence

`npm test`: **257 tests, 251 passed, 0 failed, 6 skipped**. Skips are existing
explicit opt-in pinned-SDK checks. Ten advertiser service/client tests and
14 evidence tests pass. Browser journey used actual UI controls, not supplied
acknowledgement values from a shell.

Manual browser verification:

- Saved business → selected Navan historical reference → previewed → approved
  and launched fictional TripDesk. Added separate AgentPass/HotelOps campaigns.
- Travel task produced one bid, two skips and a disclosed 0.003 placement.
- Same-turn retry replayed the receipt with no new charge.
- Second travel turn produced a second 0.003 charge: accepted total 0.006.
- Synthetic authorize/close finalized 0.006 and refunded 0.014 of 0.020 deposit.
  The two contrasting campaigns retained zero charges.
- Identity task with failed delivery released reservation and charged zero.
- Informational task produced no-fill and no additional charge.
- Copied an Auth0 inferred hint into a new fictional draft, edited copy and
  confirmed approval cleared; saved/reloaded the unapproved draft and evidence.
- Narrow layout overflow fixed and rechecked: viewport 700px, document 693px.
  Responsive navigation scrolls locally; long IDs wrap, not page overflow.
- Browser console reported no warnings/errors during the delivery walkthrough.

Screenshots: `artifacts/advertiser/onboarding.png`, `campaigns.png`, `simulator.png`.
They show new simulation only, not real wallet transactions or final visual design.

Fresh Sol6.1-high review found two issues: stale selected-evidence checkboxes and
retained approval after edits. Both were fixed; seven bounded DOM-stub rechecks
passed. Main additionally verified real-browser approval/draft restoration.
One focused review/recheck, not a new production-hardening audit cycle.

## Preservation and honest scope

V1 bundle hash:
`eafd8a40088ace494a69bf04f0475a1f3fa23eaa1be6a6aee280ff061ce0781a`.
Phase5 verify-only confirmed 27 original Phase3/4 files unchanged; original
six decisions/two deliveries and 240-second recording hashes still validate.

New catalogue hash:
`89ed0c791e7860fbe26297aaedd1942f3cc338cd28810820a6cec854ddf9fe6c`.
Catalogue loader/search run offline without a DB/provider. Existing vectors
were reused only in bounded read-only export preparation.

New decisions and accounting are **fresh deterministic simulation**. There were
no fresh Jev/LLM calls, wallet operations, native vouchers, blockchain transfers,
deployments or automatic top-ups. Historical evidence informs preparation and
provides traceable references; fit/bids use declared-capability heuristics, not
a learned ranking system. Render receipts do not prove attention or endorsement.

For real payment evidence, V1 remains a separate **recorded sandbox replay** at
port 8790. Linking to it does not make this new campaign financially connected.
Frontend specialist starts with `docs/frontend/ADVERTISER_SIMULATION.md`;
operator starts with `docs/build/ADVERTISER_RUNBOOK.md`.
