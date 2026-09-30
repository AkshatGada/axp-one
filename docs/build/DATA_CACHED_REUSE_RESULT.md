# Cached corpus reuse — builder handoff

Date: 2026-09-30. State: implemented and locally verified on build/data-targeting.
This is the approved existing-DB reuse path, replacing fresh corpus re-embedding
as the intended integration approach. Main owns backend/index integration; the
older preparation files are preserved and were not executed or changed here.
Separate review is main-owned and is not claimed completed by this handoff.

## Owned changes

- packages/ml/data_adapter/cached-corpus.mjs
- scripts/ml/cached-corpus-demo.mjs
- tests/ml/cached-corpus.test.mjs
- docs/build/DATA_CACHED_REUSE_RESULT.md

No index, root manifest, shared contract, old embedding worker, upstream repo,
schema or corpus file changed. This phase generated no embeddings and persisted
no corpus. Existing Docker adsdb/database ads is the sole default source;
the serving mirror, which lacks vectors, is not used.

## Exact public API

```js
import { createCachedCorpus } from './packages/ml/data_adapter/cached-corpus.mjs';

const corpus = createCachedCorpus();
const inventory = await corpus.inventory();
const result = await corpus.lookup(text, { limit: 5, signal });
```

The returned object exposes only lookup and inventory. Construction optionally
accepts `{query: async (sql,{signal}) => parsedResult}` as a trusted injected test
seam; it does not expose a SQL method or arbitrary database configuration.
Unknown constructor/lookup options are rejected. Limit is an integer 1–5;
there are at most three distinct creative mappings per prompt. Every public
text field is capped at 2,400 characters and screened. Unsafe fields/records
are omitted, not redacted while retaining their vector provenance.

lookup uses the legacy lowercase/trim/whitespace SHA-256 prompt key. It preserves
the legacy distinction between Straße and strasse and handles Python whitespace
differences for NEL/BOM. Only the resulting fixed-length hash and a validated
count enter generated lookup SQL; caller text is never an SQL literal.

Exact cache hit yields:

```js
{
  schemaVersion: 'cached-corpus-result.v1', status: 'ready',
  provenance: {
    database: 'ads', readOnly: true,
    model: 'BAAI/bge-base-en-v1.5', dimension: 768, revision: 'unrecorded',
    queryVectorId, queryTextHash,
    sourceVectors: [{kind, entityId, vectorId, model, dimension, revision}],
    qualityFlags, screening, embeddingCalls: 0, fallback: null
    // plus normalization/category and bounded-query metadata
  },
  matches: [{promptId, promptText, similarity, mappings: [{
    mappingId, creativeId, advertiser, creativeText,
    hint: {id, text, tier, modelVersion, reconstructionAuc} // or null
  }]}]
}
```

Cache miss yields status query_vector_unavailable, queryVectorId null and
matches []. There is no generation, download, alternate model or hidden fallback.
A ready result can contain no matches after screening or background restriction;
this remains distinct from a missing query vector. All results are vector-free.

sourceVectors retains only IDs and metadata for accepted prompt/ad/hint records.
No vector arrays export. The model revision is honestly unrecorded. No artifact
revision from the earlier fresh worker is substituted for historical DB metadata.
reconstructionAuc is an original proxy diagnostic; hint confidence never exports
as conversion probability or ground truth. Sparse hints remain explicitly sparse
and inferred. Historical advertisers remain evidence sources, not buying agents.

inventory returns schemaVersion cached-corpus-inventory.v1 with provenance,
aggregate vector counts and travel counts only; no prompt/creative/hint text,
raw vectors or private-table values.

## Read-only source boundary

Default execution uses fixed argv for docker exec -i adsdb psql against ads as
the local postgres role, with no shell/config/secrets loader. Queries use
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY and ROLLBACK, an 8-second
statement timeout, 1-second lock timeout, 12-second process/cancellation bound,
256KiB maxBuffer and no retries. Injected queries also receive a bounded abort
signal and cannot leave lookup waiting indefinitely after cancellation.

Source prompt/mapping restrictions: travel-hospitality, successful probes,
aws/verseodin observations, null appearance request_id, and no request-associated
generated prompt matching the text or legacy hash. Only an EXISTS guard is used
for request association; no customer/request values or raw answers are selected.
Raw answer/HTML, image/URL, auth, account and conversation fields never export.
Email/credential, selected sensitive-content and private-identifier patterns
are screened in SQL and again before public projection. This conservative
screening is not a comprehensive semantic privacy classifier.

Creative vectors join the actual content hash. Hints join only when
evidence.adIds includes the selected creative ID and the matching cached hint
vector exists. The public projection rechecks the supported creative binding.
The newest eligible supported hint is chosen by generated_at then hint ID;
this is a deterministic retrieval choice, not an accuracy ranking. Existing
source tiers, including loo, are retained. Missing/unusable hints return null.

## Executed tests and real cached example

`node --test tests/ml/cached-corpus.test.mjs` initially passed 11 injected-query
tests, with the opt-in live case skipped. Tests cover vector-free projection,
legacy keys, explicit cache miss, safe SQL construction, fixed background/hint
support, strict options/limits, screening, source/schema/ID bindings, cancellation,
sanitized errors and aggregate-only inventory.

After the targeted cancellation/Unicode-key correction:
`node --test tests/ml/*.test.mjs` — **44 passed, 0 failed, 1 skipped** (45 total).
The existing fixture tests do not run a real embedding runtime. Syntax and
git diff --check passed. Test-run duration is not serving latency.

Executed live command:

```sh
node scripts/ml/cached-corpus-demo.mjs
```

Exit 0. Four bounded read-only transactions: one background example selection,
one aggregate inventory, one cached lookup with limit 2 and one missing-text
lookup with limit 1. The demo prints only aggregate/ID evidence and writes no
files. An optional `--text 'reviewed public task'` uses the provided text and
skips the background-example selection transaction.

Observed aggregate inventory:

| Cached vectors | Count |
|---|---:|
| prompt | 146,438 |
| ad | 45,315 |
| hint | 67,605 |
| travel hints / travel hints with cached vector | 336 / 336 |

Restricted background travel counts: **200 probes, 421 mappings, 288 creatives**.
These differ from total/unrestricted travel counts because request-associated
observations and prompts are excluded. They are current local aggregate counts,
not public-site inventory, measured relevance or advertiser enrollment.

The builder's live cached example used source prompt **522**, existing query
vector **1507**, legacy text SHA-256
`32056381015730e7025a56f7f447378dc4b1d84ef59d4c6fdac2992a71cb8167`.
It returned prompt 522 at cosine 1 with supported holdout hint 18834, and prompt
1543895 at cosine approximately 0.72265 with supported holdout hint 19196.
Both had one connected creative mapping; six source-vector metadata records
were retained. No source text or vector array was persisted in this report.

The missing-text request returned query_vector_unavailable, null queryVectorId
and zero matches. The demonstrated cache miss invoked no embedding or fallback.
Main separately reported a successful cached lookup for its travel-automation
task; that is main's integration evidence, not another builder execution.

Opt-in live test command, requiring a reviewed existing cached text:

```sh
AXP_CACHED_CORPUS_LIVE=1 AXP_CACHED_CORPUS_TEST_TEXT='reviewed existing cached text' \
  node --test tests/ml/cached-corpus.test.mjs
```

This opt-in case was not enabled in the builder test run; the live CLI run above
provides the actual DB hit/miss evidence. No human labels, embedding generation,
model calls, quality comparison or targeting lift are implied.

## Handoff and remaining limitations

Main should import the new module directly and adapt its result into the backend
evidence projection. No index/shared-contract integration was performed here.
The API is deliberately limited to cached prompt keys; unseen text remains
unavailable. Historical revision metadata is absent. Semantic paraphrase/alias
review, task-fit labels, final evaluation and actual model decisions remain
separate gates. SQL prompt-key normalization is suitable for the verified
English corpus; database Unicode casing/whitespace edge cases can leave a
neighbor uncoupled and must not trigger generation or a different-vector fallback.

No DB writes, migrations, clone, upstream edits, service startup, installation,
secret reads, embedding generation, authenticated model calls, payments, push
or deployment occurred in this phase. No corpus output file was written or
committed. The prior ignored snapshot artifacts were preserved untouched.
