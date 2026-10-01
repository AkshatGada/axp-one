# Bounded advertiser evidence catalogue

Implemented locally on 2026-10-01. Main owns service/server/UI integration;
this component supplies only the offline catalogue, loader, search and exporter.
No upstream code, database, service, V1 or Phase3/4/5 artifact was modified.
No model/API/embedding calls, keys, external network requests, images or payments.

## Provider contract for Main

```js
import { loadEvidence, searchEvidence } from '../../packages/advertiser/evidence.mjs';

const catalogue = loadEvidence(); // synchronous; optional explicit path
const result = searchEvidence(catalogue, { query: 'corporate travel', limit: 12 });
const selectedRecords = result.records;
```

`loadEvidence(path)` performs bounded UTF-8 JSON reading (512 KiB maximum), strict
schema/ID/type/text validation and canonical content-hash verification. The loaded
catalogue is deeply frozen. Unknown fields, vector passthrough, duplicate mapping
IDs, conflicting prompt/creative/hint identities, invalid counts, unsafe markup,
credentials, private identifiers, phone-like text and sensitive targeting fail
closed. No database, Docker, service or model is contacted by either provider.

`searchEvidence(catalogue, {query, limit=12})` is pure deterministic token search.
It returns `{schemaVersion:'advertiser-evidence-search.v1',
method:'lexical_catalogue_search', sourceMode, contentHash, query, totalMatches,
records}`. `records` contains complete catalogue records, not synthetic creatives
or truncated snippets. Limit is an integer from 1 to 75. Query is required, at
most 2,000 characters, and subject to safe-text screening. Empty/whitespace query
browses all records. NFKC-normalized lowercase Unicode letter/number tokens match
exact tokens in prompt, advertiser, creative and hint text. OR matches rank by
distinct matching token count, then ascending numeric mapping ID. No substring,
semantic score, embeddings, model or ML ranking is used. Repeated query tokens
do not inflate ranking. Result records are cloned and frozen; inputs are unchanged.

Main should select by returned record ID and retain its full provenance. An
observed brand or creative must not automatically become an enrolled advertiser,
approved campaign, sponsored placement or bidder. Content remains untrusted
reference text and should be rendered with text nodes, never HTML.

## Export schema: advertiser-evidence.v1

Top-level fields are exactly:

```text
schemaVersion: 'advertiser-evidence.v1'
capturedAt: ISO UTC export-start timestamp, not historical observation time
sourceMode: 'cached_database_export' | 'recorded_profile_excerpt'
limitations: nonempty safe-text list
inventory: actual cached-corpus-inventory.v1 object | null
records: 1..75 records
contentHash: canonical SHA256 of all other top-level fields
```

Each record is `{id, promptId, promptText, creativeId, mappingId, advertiser,
creativeText, hint, source}`. Numeric source IDs are positive safe integers;
`id` is exactly `ads:mapping:${mappingId}`. Different mapping IDs are retained;
duplicates retrieved by multiple queries are merged, not counted as impressions.
Prompt/creative text is capped at 2,400 characters and advertiser at 160.
Creative text is actual observed copy or explicit `null`, never reconstructed
from a fictional campaign declaration. `hint` is null or
`{id,text,tier,modelVersion,reconstructionAuc,semantics}`. Hint semantics are
`inferred_targeting_not_advertiser_configuration`; diagnostics are not conversion
probabilities. Supported tiers: sparse, holdout, loo, leave-one-out, unknown.

`source` requires `{database:'ads',readOnly:true,sourceHash,
category:'travel-hospitality',revision:'unrecorded',
selectionVersion:'advertiser-travel-bounded-v1',creativeTextStatus}`.
Cached exports additionally carry `queryTextHashes` (1..5 unique hashes) and
`creativeTextStatus:'historical_observed_copy'`. Recorded excerpts instead carry
`profileHashes`, `recordedAt`, and
`creativeTextStatus:'unavailable_in_recorded_profile'`.
No raw vectors, vector IDs, response HTML, URLs/images, request/customer state or
credentials appear in record projections. Inventory's `vectors` holds only
aggregate counts, not embedding arrays.

Canonical hashing uses the existing ML core's recursive JSON serialization with
sorted object keys and order-preserved arrays. Cached sourceHash is the hash of
sorted unique public lookup-packet hashes for that mapping. Each packet hash
covers schemaVersion/status/database/readOnly/queryTextHash/matches, omitting
the vector identity arrays. Recorded sourceHash is the original saved file's
SHA256 byte hash. These hashes detect changes; they are not signed attestations
or independent proof of authenticity or reuse rights.

## Actual source access and default artifact

The initial sandbox Docker socket check was denied. The approved escalated
Docker check found `adsdb`; the bounded escalated exporter then succeeded.
Default `artifacts/advertiser/evidence.json` is actual `cached_database_export`,
not a fixture or recorded-only substitute.

- Export started: `2026-10-01T09:56:36.321Z`.
- Actual unique mapping records: **18**, across 13 prompts, 16 creatives and
  14 historical advertisers.
- All 18 records have observed creative text and an inferred hint; 14 distinct
  hint IDs. Multiple records can share creative/hint identities.
- Exactly one aggregate inventory plus five fixed lookups; zero failed lookups,
  one cache miss, two unsafe-association omissions by this exporter.
  The upstream adapter applies its own screening before projection.
- Four successful query hashes support retained records; a cache miss is
  unavailable evidence, not a measured zero-ad observation.
- Content hash: `89ed0c791e7860fbe26297aaedd1942f3cc338cd28810820a6cec854ddf9fe6c`.

Actual local compute inventory under the adapter's background selector:

| Scope | Count |
|---|---:|
| Cached BGE 768-D prompt vector rows | 146438 |
| Cached BGE 768-D creative vector rows | 45315 |
| Cached BGE 768-D hint vector rows | 67605 |
| Selected travel background probes | 200 |
| Selected travel background mappings | 421 |
| Selected travel background creatives | 288 |
| Travel inferred hints / hint vectors | 336 / 336 |

These are refreshed local `ads` compute inventory counts, not servingDB counts.
The user's Sep26 servingDB snapshot is separate and is not imported, replaced or
combined. The background selector excludes request-associated prompt matches,
requires successful travel probes and limits appearances to request-free aws or
verseodin mappings. Inventory is aggregate coverage, not a creative export total,
successful-run denominator, real-world demand or targeting quality metric.

## Bounded preparation

The exporter reuses `createCachedCorpus` and Main's existing
`createEvidenceService` public projection unchanged. Reads use fixed Docker
`adsdb`/`ads`, `psql -X`, repeatable-read read-only transactions ending in rollback,
8-second statement and 1-second lock limits, 12-second process timeout and
256-KiB output cap. No SQL or arbitrary source endpoint is exposed by this module.
Separate inventory/lookup transactions are not an atomic database-wide snapshot.

Fixed queries, derived only from existing Phase2 fixtures and hash-verified
Phase4 recorded profiles:

1. AI agent travel booking automation
2. best all in one tool to manage remote team travel bookings
3. AI-powered insights synthesis tool for travel insights teams
4. how to implement AI for revenue optimization in hotels
5. Find a tool for corporate travel booking and automatic expense capture.

Each lookup returns at most five neighbors and three mappings per neighbor.
The export therefore cannot exceed 75 mapping records before deduplication.
It is intentionally the narrow relevant corpus for onboarding travel-tool demo
advertisers, not a whole clone/export of all ContextHint intelligence. Some
neighbors concern adjacent software/marketing needs within the travel category;
association alone is not evidence of fit. Broader categories, privacy review,
full corpus export and any claim of predictive lift require separate scope.

## Recorded fallback, verified separately

If inventory access fails, no lookups/retries are made. If all five lookups yield
no safe records, do not publish the refreshed inventory as part of recorded
evidence. The recorded fallback contains four actual associations and two hints
from `artifacts/phase5/replay/source-profiles.json`, with creativeText and inventory
null. It is labelled `recorded_profile_excerpt`, not a refreshed source export.
No fictional offer text is used to fill unavailable creative copy.

The original source byte SHA256 is pinned and checked against its existing replay
manifest: `9c22053b9a79ddaf2f02bd00d795176566eb011fff7bea251ec147cbb8a3d772`.
Each `cached-campaign-profile.v1` profileHash, campaign binding and hint-to-creative
support are also validated with the existing profile validator. The source was
captured from the existing Phase4 public bootstrap at
`2026-10-01T09:05:20.496Z`; that is profile recording time, not source observation
time. Existing saved profiles and manifests remain untouched.

## Commands and verification

```sh
node scripts/demo/advertiser-evidence.mjs               # bounded source export
node scripts/demo/advertiser-evidence.mjs --verify-only # offline, no source read
node --test tests/demo/advertiser-evidence.test.mjs
```

The first command writes only the owned generated artifact and may require
approved Docker socket access. It does not start Docker, mutate source services
or retry failed queries. `--recorded-only` explicitly replaces the owned default
artifact with a recorded excerpt and labels source accessibility as unprobed;
do not use it to rehearse the actual-data default. Importing the script performs
no database reads or export writes.

Focused verification: **14 passed, zero failed or skipped**. Checks cover actual
saved-profile fallback, five-query/inventory bound, no retry on source outage,
source mismatch, cache misses, conflicting associations, unsafe row omission,
hash/size/UTF-8/type/ID/text validation, no vector passthrough, deterministic lexical
selection, null creative preservation and offline default-artifact loading.
Synthetic transport fixtures exist only in tests and are never the default data.
Service/server/UI integration is Main-owned and not certified by these checks.
