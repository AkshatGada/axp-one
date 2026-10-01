# ContextHint-informed simulation increment

## Implemented

The reference advertiser dashboard now uses actual exported ContextHint history
as a runtime decision input, rather than an attachment-only provenance badge.
`EvidenceDecisionEngine.scoreOpportunity` is shared by draft preview, paired
comparison and fresh simulation turns. It combines own approved copy/hints with
task-retrieved, campaign-aligned historical prompt/hint support, bounded by the
advertiser's declared capabilities. The existing deterministic auction, budgets,
delivery receipts and synthetic accounting remain authoritative and unchanged.

This is a small authored lexical heuristic, not trained ML, a calibrated model,
fresh Jev execution or ChatGPT's proprietary algorithm. It uses18 exported
associations /13 distinct prompts, not the entire ContextHint corpus. The
relevance weight and score thresholds are declared policy choices, not inferred
auction parameters or proven optimal values. Missing support falls back to
own text; a historical example never supplies a missing product capability.

`POST /v1/advertiser/compare` and the new **Data-informed decisions** screen
expose text-only and history-informed scores/bids, exact selected source IDs,
observed copy, inferred hints, hashes, coverage and fallback reasons. Comparison
creates no opportunity, reservation, delivery or charge. Closed/paused funding
prevents executable hypothetical bids even if the candidate score qualifies.
Existing turn IDs replay their original saved engine output, not new scores.

## What the small comparison actually found

The frozen authored12-case packet produced4 changed /8 unchanged pairs:
one participation change and three other bid-band changes. They demonstrate that
history can change this policy's output; they do not demonstrate better targeting,
accuracy, conversion lift or causal value. Cases were source-informed examples,
not independently labelled holdout tasks. Both arms share the same corpus-IDF
vocabulary, so this isolates adding historical packets, not all data influence.
See `EVIDENCE_COMPARISON.md` and the correlated JSON packet for full provenance.

## Browser acceptance

On the existing open AgentPass campaign, the developer/identity task showed:

- Own text: relevance2 / hypothetical bid0.002 test USDC.
- ContextHint support: relevance3 / hypothetical bid0.003, selected Auth0
  prompt55670 / creative7668 / mapping110136. Historical Auth0 is not enrolled.
- A fresh simulation turn used that same scorer, rendered a disclosed AgentPass
  card, and accepted one synthetic0.003 delivery charge. HotelOps skipped;
  finalized TripDesk funding was excluded. The organic reference text received
  no advertiser material. Retrying the turn replayed its receipt, not a charge.
- The finalized TripDesk comparison labelled funding unavailable and returned
  no executable bid. Its prior2 deliveries and0.006 synthetic spend remain.

Only the isolated advertiser simulation state gained the one new accepted
delivery. Original V1's real sandbox run was not changed or rerun.

## Verification / boundaries

The current repository suite passes261 of267 tests, with6 optional external-SDK
tests skipped and0 failures. Focused service/client tests verify zero-write
comparison, runtime/shared-scorer parity, replay and closed-channel behavior.
The10-test harness suite covers requirements/caps/provenance/fallback and
same-source packet reproduction without network, wallet or database operations.

Original V1 bundle hash remains
`eafd8a40088ace494a69bf04f0475a1f3fa23eaa1be6a6aee280ff061ce0781a`:
all27 preserved source/artifact files verify unchanged. Offline evidence hash
remains `89ed0c791e7860fbe26297aaedd1942f3cc338cd28810820a6cec854ddf9fe6c`.
No upstream query/write, embedding/model call, wallet operation, real payment,
push or deployment was performed for this increment. Final frontend design
remains with the specialist; this is functional reference UI only.

## Focused independent review

A fresh Sol6.1-high reviewer (Laplace) returned PASS with no substantive
algorithm, claim or integration blockers. It checked actual-catalogue
skip-to-bid / shared provenance, hard declarations/caps/closed funding,
zero-SQL-write comparisons, packet parity and all27 preserved Phase3/4 files.
Its18 focused offline checks passed; two HTTP checks were blocked by sandbox
listen permissions. Main separately ran the10 service/client/HTTP tests with
loopback authorization and verified the browser flow. No extra broad audit or
policy tuning was needed; limitations above remain explicit.

## Reproduce

```sh
npm run demo:advertiser
node scripts/demo/evidence-decision-comparison.mjs --check
node scripts/demo/advertiser-evidence.mjs --verify-only
node scripts/demo/phase5-bundle.mjs --verify-only
npm test
```

Open `http://127.0.0.1:8792/#matching`; exact steps and API/client handoff are in
`ADVERTISER_RUNBOOK.md` and `docs/frontend/ADVERTISER_SIMULATION.md`.
