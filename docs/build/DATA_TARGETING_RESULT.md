# C01/C02 builder result

Date: 2026-09-30. State: built and tested in isolated `build/data-targeting`.
This is a builder handoff, not an independent audit or integration sign-off.
The user approved restarting Lane A under MVP_MASTER_PLAN and EXECUTION_LOOPS;
their planning-reset headers are older than that authorization.

## Preserved implementation

Native Node 25 ES modules; zero external dependencies, copied upstream code,
runtime sibling-repository imports, model downloads, database exports or paid
calls in this initial slice. All edits are under packages/ml and tests/ml.
The live-data follow-up is separately reported in DATA_LIVE_RESULT.md.

Public entry point: `packages/ml/index.mjs`.

| Export | Behavior |
|---|---|
| curateSnapshot(input) | Strict allowlisted JSON; approved travel-only caps; normalization, dedupe, provenance, exact-text compatible vectors, content/manifest hashes |
| groupedSplits(records) | Whole components joined by prompt family, advertiser, creative content and hint support; approximately 60/20/20; giant/insufficient partitions blocked |
| buildCampaignProfile(campaign,snapshot,selection) | Explicit example-only selection; max5 observed/3 contrasts/2 hints; bounded text; immutable hash; thin/history-unavailable labels |
| createExactIndex(snapshot) | Example-partition exact cosine lookup only |
| createCachedEmbeddingProvider(space,records) | Exact cached text only; unseen text unavailable; not a live embedding solution |
| RuleDecisionEngine | Approved deterministic default; soft conflict precedence, stable creative ties |
| EmbeddingDecisionEngine | Injected compatible task/creative vectors; optional frozen history formula |
| JevDecisionEngine | Injected transport; one four-question request; live calls denied by default; no credential reader or default HTTP client |
| scoreWithFallback(primary,fallback,request) | Returns original, fallback and effective records with original failure retained |
| freezeBenchmarkCases / runBenchmark | Input/label hashes, grouped case checks, bounded local/fixture attempts; refuses live paid arms |
| ndcgAt3 / summarizeAttempts / pairedFamilyBootstrap | Failure-inclusive denominators, unavailable timing excluded, unknown costs retained; family resampling |
| validateRequest / validateDecision / validateProfile | Strict fields, single-advertiser bindings, IDs, evidence, levels and provenance |

## Required request shape

Every engine exposes `await engine.scoreOpportunity(request)`:

```js
{
  schemaVersion: 'decision-request.v1', runId, mode,
  campaign: {
    campaignId, campaignVersionId, advertiserId, allowedIntents,
    declaredConstraints, softFitTags,
    creatives: [{creativeVersionId, approvedText, softFitTags, evidenceFieldIds}]
  },
  opportunity: {id, coarseIntent, destination, taskConstraints, softPreferences},
  profile: null, // or validated CampaignEvidenceProfileV1
  options: {deadlineAt, rubricVersion: 'fit-intent-v1', engineConfigVersion}
}
```

declaredConstraints/taskConstraints are bounded objects accepting destination,
freeCancellation, wheelchairAccessible, event, dates and travellers. The feature
booleans require booleans; travellers is an integer1..100; other fields accept
bounded strings/arrays. destination on Opportunity is a string or null. Intents:
hotel_booking, hotel_comparison, informational, blocked. softPreferences and tags
are supplied opaque IDs, not inferred demographics. Raw/private chat and all
financial/competitor fields are rejected. Main owns mapping from shared
declaration arrays to this module's declaration object.

AgentDecisionV1 binds opportunity/advertiser/campaignVersion/agentRun IDs;
decision is bid|skip|abstain, creative is a supplied approved ID or null. Integer
relevanceLevel/commercialIntentLevel0..3 normalize to level/3, and
conversionProbability is always null. There are no amount fields. Candidate
ordinal levels are optional engine-provenance diagnostics, not auction order.
Main owns hard eligibility and integer score-to-bid mapping.

## Executed validation

Command: `node --test tests/ml/*.test.mjs`, Node v25.5.0.
Latest initial-slice run: **33 tests passed, 0 failed**, 110.55ms reported runner
duration. This duration is test execution, not ad-serving latency.

Covered: strict exports, duplicates, paraphrase/advertiser split links, provenance
quality flags, incompatible vectors/text changes, unsafe omissions, infeasible
grouping, deterministic hashes/caps, held-out profile rejection, rules fit/soft
skip/comparison, response/privacy boundaries, deadlines, injection-like creative,
synthetic history formulas, compatible injected vectors, labelled fallback,
Jev transport fixtures, model/ID/probability/schema validation, blocked live calls,
no-fit/abstain, bounded benchmark and honest missing-label metrics.

D01-D12 are deterministic data coverage. T01/T02/T03/T04/T05/T11-T16 have
module-level deterministic coverage. Geography/hard mandatory gating and
T06-T10 financial fixtures belong to main's exchange integration, not this
nonfinancial module. T05's upstream no-invocation guarantee is also main-owned.

Jev docs checked through read-only public browsing on 2026-09-30:
[API](https://docs.typesafe.ai/api), [Score](https://docs.typesafe.ai/primitives/score),
[Choice](https://docs.typesafe.ai/primitives/choice),
[Noul](https://docs.typesafe.ai/primitives/noul).
Provider Score is zero-indexed and fractional; mapping is explicitly nearest
integer with Math.round (`zero-index-nearest-level-v1`), then level/3. Exact
model ID and probability/legend consistency are checked. Confidence is not a
conversion probability or rubric score. Batching support is documented, not
verified by an authenticated call in this slice.

## Remaining evidence gates

Real background ingestion, live unseen-task embedding, task-relevant profiles,
independent human labels, 40-case measured comparison, actual Jev bid/eligible
skip, shared contract integration and focused independent review are pending.
No training, lift, conversion, viewership, auction, payment or deployment result
is implied. Synthetic metric-unit labels are explicitly fixture assertions,
including tests that exercise the human-label API shape; they are not a reviewed
pilot. The module retains rules until actual comparative evidence supports
replacement. No root manifests/shared contracts or upstream files changed.
