# V2 evidence lane — executed and frozen

2026-10-01. User approved the full V2 plan and this bounded read-only export.
Evidence implementation and artifacts are **frozen** at main's explicit request;
only this handoff document was finished afterward. This lane made zero provider
calls, generated zero embeddings, accessed no wallet, and wrote no source object.
Dashboard integration and actual Jev execution are main-owned, separate gates.

## Owned files and artifacts

- `packages/v2/evidence.mjs`: offline loader, validators and `EvidenceRetriever`.
- `scripts/demo/v2-evidence.mjs`: fixed read-only Docker export and offline verify.
- `tests/v2/evidence.test.mjs`: 19 targeted evidence tests.
- `docs/build/V2_EVIDENCE.md`: this handoff.
- `artifacts/v2/evidence/catalogue.json`: sanitized public evidence, no vectors.
- `artifacts/v2/evidence/index.backend.json`: cached prompt vectors, mode `0600`;
  backend-only, never include in browser/model packets.
- `artifacts/v2/evidence/manifest.json`: counts, omissions, selection and hashes.
- `artifacts/v2/evidence/archive/v2-wallet-853e3ef3431149b593cf7c08/`:
  the initial 171-association snapshot's three files, copied unchanged before
  the explicitly approved expanded export replaced the default files.

No shared contract/config, dashboard, old 18-record catalogue, travel run,
payment artifact or upstream repository was edited by this lane. No commit,
push, deployment, source-service restart or dependency installation was made.

## Final actual export

Default directory is `artifacts/v2/evidence/`.
Snapshot ID: `v2-wallet:68183f606aea93992630a8ff`.
Catalogue canonical content hash:
`68183f606aea93992630a8ff134f4b897e02acde9d01954f79e85cfb62a3efc2`.
Manifest canonical content hash:
`18659a4a1fa194be7d741aef526ad72e8981c7864c12a49ec1a9f360e3f69fc7`.

| Measure | Actual |
|---|---:|
| Raw source associations retained | 1,178 |
| Distinct legacy-normalized prompt hashes | 241 |
| Source probe IDs | 266 |
| Creative IDs | 537 |
| Inferred hint IDs | 331 |
| Existing prompt vectors | 241 |
| Fixed-question cached query vectors | 1 |
| AWS associations, validated reclassification | 1,031 |
| VerseOdin associations | 147 |
| Default three-file total | 5,659,401 bytes |

All are within 1,500 associations / 512 normalized prompts / 16 MiB per export.
The user-approved disk floor for this export is 40 GiB. Archived initial files
are separate preservation evidence, not additional current associations.

| Current mapping niche | Associations |
|---|---:|
| `crypto-investing` | 1,003 |
| `crypto-hardware-wallets-self-custody` | 88 |
| `web3-infrastructure` | 47 |
| `crypto-tax-software-defi-accounting` | 5 |
| `privacy-preserving-blockchains-zk-compliance` | 35 |

The selector is exactly those five categories and prompt regex
`wallet|cold[[:space:]-]*storage|self[[:space:]-]*custody`.
The catalogue's legacy `niche` field identifies the wallet demonstration;
each record's `source.mappingNiche` preserves its actual category. This is not
a claim that all 1,178 records were classified into the hardware-wallet niche.

File SHA-256 values bound by the manifest:

- `catalogue.json`:
  `17227525a9e0f80febf5f4836cbd7fc8dd26e72b2293a8c78ae13fd0ccd588e0`.
- `index.backend.json`:
  `206b895f0ae73d3e204b9149e0dc29e022826c99cd015df967bd3506d62238fc`.

## Screening, provenance and omissions

The final source transaction inspected 1,186 matching associations: six had
failed probes, leaving the approved 1,180 successful-source pool; two unsafe
text associations were omitted, leaving 1,178. No row was fabricated to fill
the difference. The final manifest records zero unsupported-source,
request-associated, customer-generated, invalid-classification, capped,
JS-unsafe or unusable-vector omissions. Six retained creatives have no screened
hint. All 241 normalized prompts have a compatible cached vector; the authored
second fixed question does not have a cached vector.

The source process is fixed to Docker container `adsdb`, database `ads`, user
`postgres`; it reads no environment file or credentials and accepts no remote
connection override. It uses `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`,
15-second statement timeout, one-second lock timeout, a database/read-only
identity guard before source reads, one projected SELECT and `ROLLBACK`.
Process timeout is 20 seconds and output buffer is at most 16 MiB.

Only successful probes with `aws`/`verseodin` mappings and null appearance
`request_id` qualify. Customer-generated prompts are excluded using both stored
prompt hashes and hashes recomputed from customer prompt text. The customer
hash set is materialized once; no customer text is projected or saved.

AWS classifications must bind the probe's legacy normalized hash, the hash
recomputed from `source_b_classification.prompt`, method `llm`, and
`chosen_slug = current mapping niche` inside the approved category set. Native
probe niche may equal that niche or remain `source-b` after collision-safe
writeback. VerseOdin requires native probe niche = mapping niche. These bindings
are rechecked locally; neither classifications nor source rows are changed.

Raw mapping IDs remain individual records, including repeated prompt/creative
associations. Prompt/probe, creative and hint IDs are preserved. Records retain
source name, hashed source reference, actual mapping/probe niches, creative
content hash including its source `sha256:` prefix, and classification bindings.
Hints retain source ID, original text, generator version, tier and the actual
retained creative support IDs. Shared hint identities are not counted per row.
No raw hint evidence JSON or raw classification prompt is exported.

Private/sensitive/credential-like copy is rejected, not rewritten. No raw
probe objects, responses, HTML, URLs/images, customer data or geography is
exported. Source timestamps are intentionally omitted: inspected
`ads-backend/worker/src/ingest-source-b.ts` spreads import timestamps over 14
days. Export time is not an observation window; `observationWindow` is null.

Inspected read-only upstream references were `ads-backend/intelligence/embed.py`,
`classify_source_b.py`, `worker/src/ingest-source-b.ts`, and the source DB schema.
No upstream runtime imports or algorithm code copies were introduced. The
README's older `openai-ads/packages/db/src/schema.ts` path was absent here;
the actual Docker schema and current `ads-backend` source resolved the fields.

## Offline retrieval and compact profile

`loadEvidence({directory})` verifies total size, manifest/content/file hashes,
record identities, category/classification/hint bindings, counts, vector refs,
space, dimensions and finite nonzero vectors. It returns an immutable
`EvidenceRetriever` with `manifest`, `publicCatalogue()` returning `{records,
hints,...}`, and `retrieve(task, ownMlCampaign)`.

The source normalization is Python lower/Unicode-whitespace collapse, not NFKC
family folding. Existing model is `BAAI/bge-base-en-v1.5`, dimension 768;
artifact revision remains explicitly `unrecorded`. Exact normalized cached text
uses offline cosine. The exact first question's source embedding ID is
`127592`, ref hash
`3acee553405385dd7038c413d23bfee0cbbc77d43e6ba76b29cc99b8c4170778`.
Authored uncached text uses labelled lexical overlap, never generated vectors.
Missing aligned history returns `unavailable`, not a text-only history substitute.

Alignment uses the campaign's **declared** product category first, then ranks
only conservatively aligned associations into at most five distinct normalized
prompt neighbors. Repeated mappings do not increase cosine or lexical scores.
There is no enrichment of campaign capabilities from source text, appended
context hints or historical brands. Source text must affirm the actual product
category. Generic crypto software, tax/brokerage/exchange products, wallet
recovery and negated wallet-type claims are not mobile-wallet history.

The `retrieved-campaign-profile.v1` packet binds the exact caller ML DTO hash,
including its own appended context hint, campaign/version and snapshot hashes.
It has at most three distinct-prompt/creative examples, two aligned inferred
hints, no contrasts or vectors, max 600 characters per text and 2,400 total.
Overlong material is omitted, not cropped and rebound. Full source IDs/support
metadata remain outside the compact profile in retrieval/catalogue records.
The profile explicitly labels historical references/hypotheses as not campaign
declarations; its hash is the canonical hash excluding `profileHash`.

## Actual frozen six packets

Read-only inspection used main's current `CAMPAIGNS`, `QUESTIONS` and
`mlCampaign`, and main's shared profile validator accepted every packet.

| Question | Campaign | Method / history | Neighbors | Examples | Hints |
|---|---|---|---:|---:|---:|
| Cached Q1 | ClearVault | vector / ready | 5 | 1 | 1 |
| Cached Q1 | PocketKey | unavailable / unavailable | 0 | 0 | 0 |
| Cached Q1 | LeatherGuard | vector / ready | 5 | 3 | 1 |
| Authored Q2 | ClearVault | lexical_fallback / ready | 5 | 2 | 2 |
| Authored Q2 | PocketKey | unavailable / unavailable | 0 | 0 | 0 |
| Authored Q2 | LeatherGuard | lexical_fallback / ready | 3 | 3 | 1 |

ClearVault Q1: mapping `1836866`, hint `88501` (hardware-wallet reference).
ClearVault Q2 also has mapping `110300`, creative `21812` and hint `52391`
(OneKey Limited, from the actual source category in its record).
LeatherGuard Q1 mappings: `2521867`, `2478447`, `98747`;
Q2 mappings: `2531666`, `98747`, `2521867`; hint `42256`.
LeatherGuard's references are physical wallets and do not grant crypto storage.

PocketKey has **no affirmed mobile-wallet product copy** in this screened
snapshot. The apparent earlier match `216947` / creative `27845` / hint `14999`
was CoinLedger crypto tax software and is now `unknown`, never an aligned
mobile example. The taxonomy/selection still retains that real association in
the inspectable catalogue; it is not hidden or transformed into a wallet ad.
Regression tests cover this defect, generic software, recovery, unrelated
Phantom Flow/TradingView and negated capabilities. Main may admit ten actual
calls under the twelve-call allowance, with two unavailable PocketKey history
arms. Absent data is not a schema/transport defect and warrants no corrective
calls or fabricated history.

## Executed commands and verification

The first narrow export corrected a validator's bare-digest assumption to
preserve source creative hashes' `sha256:` prefix before any files were written.
An exploratory correlated-query count timed out read-only; the final export
uses one materialized customer-hash set. Neither failure changed source state.

Executed final export, with scoped Docker/filesystem escalation:

```sh
node scripts/demo/v2-evidence.mjs --refresh-approved
```

That command archived the initial V2 snapshot, validated staging content and
replaced only the three default V2 files. **Do not refresh after freeze.**
Ordinary invocation against an existing default directory is idempotent/offline
verification; it does not query the source again.

Safe offline verification commands:

```sh
node scripts/demo/v2-evidence.mjs --verify-only
node --test tests/v2/evidence.test.mjs tests/v2/agents.test.mjs
```

Latest lane verification: **33 passed, zero failed** (19 evidence tests plus
14 existing agent-lane fixture tests). Tests cover source/query guards,
classification binding, privacy, exact normalization, vector/lexical/missing
states, count inflation, duplicate/conflicting IDs, campaign/profile hashes,
product alignment, hints, hard byte/row/prompt/neighbor/packet bounds,
vector-free public packets, offline hash verification, actual final counts and
the archived initial snapshot. Provider calls in these tests are fixture-only.

These are evidence-lane/export results, not targeting accuracy, historical
held-out lift, all AI demand, viewership, conversion, deployed infrastructure
or proof of actual Jev decisions. Live execution remains main-owned.
