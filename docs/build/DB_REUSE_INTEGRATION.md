# Phase 1 — existing-DB reuse integration

2026-09-30. Local integrated phase complete; full MVP remains incomplete.

## What now works

- Main imported only cached-adapter commit 0c861c2 as 7bdfd36. Earlier fresh
  corpus preparation remains in the isolated builder worktree, not the runtime.
- `AXP_CORPUS_DB=ads node apps/backend/server.mjs` enables the fixed read-only
  Docker adsdb / ads source. It does not start or reconfigure source services.
- `POST /v1/evidence/lookup` and the plain reference UI return existing prompt
  neighbors, observed creative mappings and creative-supported inferred hints.
- The public projection exposes vector IDs/model/dimension with unrecorded
  artifact revision, never vector arrays or arbitrary source-row fields.
- Source-off, unavailable exact vector and successful empty neighborhood are
  distinct states. No query triggers corpus embedding generation or a clone.

## Executed evidence

Real cached example: `AI agent travel booking automation`. Query vector 14180;
exact background prompt 57933 at cosine 1, with hints 7593 (sparse) and 39119
(holdout). A second neighbor 10851 had cosine approximately 0.792 with hint 9295.
The CLI limited results to two; the browser retrieved five. These are historical
associations and inferred targeting, not campaign enrollment or validated fit.

Current read-only inventory: 146438 prompt vectors, 45315 ad vectors, 67605 hint
vectors. Restricted travel source: 200 background probes, 421 mappings, 288
creatives and 336 hints / 336 cached hint vectors. Not public serving-DB totals.

Verification commands:

```sh
node --test
AXP_CACHED_CORPUS_LIVE=1 \
  AXP_CACHED_CORPUS_TEST_TEXT='AI agent travel booking automation' \
  node --test tests/demo/evidence.test.mjs tests/ml/cached-corpus.test.mjs
node scripts/ml/cached-corpus-demo.mjs --text 'AI agent travel booking automation'
```

Full suite: **92 passed, 0 failed, 5 skipped**. Skips are two live-DB opt-ins
and three pinned payment-codec checks requiring their explicit dependency root.
Focused suite with the actual DB opt-in enabled: **17 passed, 0 failed**.
The HTTP live test retrieves cached evidence, requests a missing vector and
asserts exact equality of exchange state before/after both requests.

In-app browser at http://127.0.0.1:8788 verified enabled-source status, five real
neighborhoods and observed/inferred labels. Existing local synthetic history was
preserved on preview restart. Snapshot: /private/tmp/axp-cached-evidence.jpg.

One fresh Sol 6.1 High reviewer inspected only read-only transport, private-source
exclusion, supported hint binding, cached reuse, projection and financial
separation. No demonstrable static blockers found. Main executed the live tests;
the review itself did not query the DB or establish decision quality.

## Next phase / non-claims

Connect approved historical evidence to versioned advertiser-owned profiles and
the common DecisionEngine, then run actual bounded bid/skip comparisons. Preserve
inferred-hint diagnostics rather than treating them as fit/conversion labels.

This phase is retrieval, not a trained ranker, OpenAI's live ad algorithm, actual
Jev execution, independently generated organic answers or Solana settlement.
Unseen task embedding remains a separately explicit runtime decision. The source
is mainly B2B travel/hospitality software; don't equate it with consumer hotel
booking fit. No upstream code, source DB, plugin or configuration was modified;
no push, deployment, payment, installation or corpus regeneration occurred.
