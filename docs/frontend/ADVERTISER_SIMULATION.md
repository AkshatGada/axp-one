# Advertiser simulation — implemented extension

This is a separate surface, not a replacement for V1's frozen runtime/replay
contracts. Entry point: `npm run demo:advertiser`, http://127.0.0.1:8792.
Reference files: `apps/advertiser-ui/`; browser client/types:
`packages/advertiser/client.mjs` and `client.d.mts`.

## Implemented API

All bodies are strict JSON. Bootstrap supplies a local operator CSRF token;
POST requires `X-AXP-CSRF`. Errors are `{error: code}` with HTTP status.
Amounts are integer strings in six-decimal test-USDC base units, not floats.

| Method and route | Input | Result / ownership |
|---|---|---|
| GET /v1/advertiser/bootstrap | none | Synthetic mode, presets, taxonomy, evidence provenance, local CSRF |
| GET /v1/advertiser/state | none | Account, drafts, campaigns, channels, awards, receipts, charges, events, summaries |
| GET /v1/advertiser/evidence?q= | bounded text | Offline lexical catalogue search, full observed copy and inferred hints |
| POST /v1/advertiser/account | AccountInput | Local fictional business, no sign-in/KYC/enrollment |
| POST /v1/advertiser/drafts | DraftInput | Persisted draft, known evidence IDs; launched drafts immutable |
| POST /v1/advertiser/preview | draftId, prompt | Decision and bid preview; zero opportunities/reservations/charges |
| POST /v1/advertiser/compare | exactly one draftId/campaignId, prompt | Text-only vs evidence-informed decisions and hypothetical bids; previewOnly; fundingEligibility; no state writes |
| POST /v1/advertiser/drafts/{id}/launch | {} | Campaign + synthetic channel; same draft replays launch |
| POST /v1/advertiser/campaign-status | campaignId, active/paused | New active campaign version or pause; closed funding cannot reactivate |
| POST /v1/advertiser/turn | prompt, turnId, randomSessionId | Fresh deterministic simulation; stable IDs replay, changed prompt conflicts |
| POST /v1/awards/{id}/render | RenderAcknowledgement | Existing publisher receipt and accepted charge; no human-attention claim |
| POST /v1/awards/{id}/fail | {} | Release reservation, zero accepted charge |
| POST /v1/advertiser/channels/{id}/authorize | {} | Authorize server-owned accepted total, synthetic only |
| POST /v1/advertiser/channels/{id}/close | {} | Synthetic settlement/refund, no native voucher or transaction |

No model, wallet, live payment or production database endpoint is exposed by
this server. The client owns no ledger and accepts no arbitrary payment amount.
`packages/publisher/client.mjs` performs the existing DOM/disclosure check before
render acknowledgement. Browser insertion is not proof of viewability/attention.

## State-to-screen mapping

- Business: account fields are fictional declarations, not verified identities.
- Wizard: product/capabilities → historical evidence → own creative/context
  hints → max bid/cap/deposit → approval/preview/launch. Editing invalidates
  approval. Inferred hints may be copied as editable hypotheses, never activated
  as a historical brand's campaign. Saving a draft does not fund or launch it.
- Campaigns: accepted and available budget, delivered count, pause/activate,
  approved copy, hard declarations and attached evidence. Channel status is
  distinct from campaign active/paused; a finalized channel cannot buy again.
- Simulator: separate organic reference response and Sponsored card; actual
  deterministic bid/skip traces, price, browser receipt. Fail/hold/no-fill are
  real simulated state transitions, not pre-recorded animation.
- Accounting: deposit, reservation, accepted spend, cumulative authorization,
  settled amount and refund stay separate. Synthetic accounting has no explorer
  link. V1 real sandbox evidence opens a separate read-only replay surface.

The export is 18 relevant observed associations, not a full database clone.
Inferred hints and creatives support campaign preparation and a bounded runtime
relevance prior. `EvidenceDecisionEngine.scoreOpportunity` is shared by preview,
comparison and fresh simulation turns. It retrieves task-relevant historical
prompt/hint records, aligns them to own copy and matched declared capabilities,
and combines lexical support with a declaration ceiling. Missing support falls
back to own text; attached IDs alone do not make a record support the decision.
Each decision exposes selected source IDs/text/hashes, coverage, policy version,
and fallback reasons in engineProvenance. Legacy turn replays retain their
original engine output. Comparison computes no auction or financial obligation;
paused campaigns and finalized channels have no executable hypothetical bid.
The reference #matching screen renders both arms plus actual supporting records.
No trained model, conversion calibration, targeting lift or proprietary ChatGPT
replication is claimed. Both arms share corpus-derived IDF; the comparison
isolates added historical packets, not every source-data influence.

Main owns domain logic, auction, receipts, budgets and authority. Specialist
owns final layout/motion. Reuse the existing `design-system/` PolySans families,
spacing, neutral colors and restrained steel accents; provenance remains in
the existing design-system handoff. Do not change ContextHint production code,
V1 bundles/manifests or `apps/product-ui`/`apps/marketing` in this slice.
