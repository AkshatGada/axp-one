# AXP ML plan: data-backed advertiser buying decisions

Planning only, 2026-09-30. Scope: ML/data components, reuse boundaries, Mac Studio
runtime and experiments. No application code, exports, training, model calls or
new infrastructure have been executed. Final frontend and marketing are deferred.

## Objective

Given a sanitized conversational opportunity and an eligible advertiser campaign,
use ContextHint's historical prompt/ad evidence to recommend bid, skip or abstain
and an approved creative. Establish separately whether the corpus helps and
whether Jev improves on simpler decisions. Financial calculations and auctions
remain deterministic outside this ML layer.

## What is and is not reused

Use a bounded, versioned background-corpus snapshot: observed prompt-to-creative
mappings, curated inferred hints and compatible cached vector/profile data.
Build AXP-owned modules and contracts fresh. Do not import ContextHint product
services, UI/components, MCP authentication, billing, customer state, telemetry
writers, collector orchestration or whole API handlers.

The user permits exact copying of useful algorithm code, not transplanting the
product. Copy only small, isolated primitives after checking dependencies and
recording original repo/path/commit/function/hash and local changes. Existing
sources stay untouched. No runtime import from sibling repositories. Specific
copy candidates below are proposals, not copied assets or licensed provenance
already established. Fresh wrappers, retrieval SQL and API contracts are AXP-owned.

## Component map

| ID / AXP component | Input -> output | Source/reference to use | Fresh work and runtime |
|---|---|---|---|
| M01 Corpus snapshot adapter | selected background mappings/hints -> versioned evidence records | ads/probes/ad_appearances/inferred_context_hints; explicit export, not live UI API scraping | new read-only selector/export contract; offline Mac |
| M02 Evidence curator | rows -> deduplicated observed/inferred records with quality flags | source/ref IDs, sparse tiers, normalized prompts; no private request/account tables | new dedupe/filter/split logic; offline Mac |
| M03 Embedding adapter | task/profile/creative text -> compatible vector | existing BGE base English v1.5, 768-D corpus; fastembed as reference | fresh lazy model wrapper and bounded batches; Mac CPU/ONNX initially |
| M04 Evidence index | task vector -> historical prompt neighborhoods and supporting mappings | stored prompt/ad vectors and versioned niche/sub-niche metadata | new AXP-owned small snapshot index; exact NumPy search first, ANN only if needed |
| M05 Campaign evidence profile | approved campaign + historical neighbors -> frozen profile | prepare_context_hint concepts, curated positives/contrastive examples and hints | fresh compiler; offline before activation |
| M06 Targeting evaluator | hint/profile -> separation/fit/risk diagnostics | mcp_pool_v2 hard-negative/null/reference design; isolated AUC/cosine/buyer-fit primitives | fresh evaluation orchestration; offline Mac, no whole-service copy |
| M07 Opportunity feature adapter | sanitized task -> intent/features + missing/uncertain flags | intent taxonomy and prompt neighborhood evidence | fresh schema/feature extractor; no demographics or raw history |
| M08 RuleDecisionEngine | eligible campaign/features -> advisory bid/skip/creative | AXP policy fixture, not ContextHint budget optimizer | fresh deterministic baseline; local fast path |
| M09 EmbeddingDecisionEngine | eligible campaign profiles + task vector -> fit ranking/abstention | prompt/creative/profile similarity and contrastive margins | fresh engine through DecisionEngine; local fast path |
| M10 JevDecisionEngine | same eligible advertiser context + capped examples -> typed judgments | TypeSafe Score/Choice/Noul; ContextHint supplies evidence, not model weights | fresh server-side adapter; remote Jev call, timed from Mac |
| M11 Optional ML/LLM engines | identical task/features -> comparable decisions | logistic/ranker, small/larger LLM or shortlist hybrid | fresh experimental adapters; conditional, not MVP blockers |
| M12 Frozen benchmark harness | independent labels + engine outputs -> paired quality/latency/cost results | existing pool-test ideas, not product test framework | fresh CLI/manifests/results; local Mac |

Existing ContextHint tools remain upstream research/preparation references. AXP
does not need to invoke all 11 plugin tools to serve one ad. Full source map:
[tool/API exploration](research/CONTEXTHINT_TOOL_API_MAP.md).

## Candidate exact-code copies

| Primitive | Inspected source | Scope/boundary |
|---|---|---|
| cos_scores | ads-backend/intelligence/hints.py | isolated normalized cosine, replace module imports and test zero vectors |
| auc_scores | ads-backend-prod/intelligence/mcp_pool_v2.py | isolated tied-pair AUC; retain None for insufficient samples |
| bootstrap_ci | same module | seeded diagnostic interval, not confidence of conversion |
| buyer_fit | ads-backend-prod/intelligence/subniche_unit.py | own-centroid versus closest-sibling margin, adapt DTOs |
| match_negatives | mcp_pool_v2.py | optional bounded hard-negative selection; document near-tie semantics |

Do not copy embed.connect, environment loaders, pool/database initialization,
MCP request handlers, telemetry, campaign generation or feature-flag dispatch.
Weighted RRF from market-retrieval.ts is an optional later candidate for offline
recall only; the multi-query generative market resolver is not the hot path.
For a small MVP use standard NumPy/scikit-learn operations when less code suffices.

## Offline flow

```text
Read-only selected corpus -> curated snapshot + manifest
  -> split train/example, validation and final test families
  -> compatible cached vectors / small local index
  -> fictional campaign + approved targeting/creative
  -> relevant historical examples + hard contrasts
  -> frozen CampaignEvidenceProfile
```

Profile fields: campaign/version, declared audience/intent/constraints, approved
creative IDs, corpus/model/version hashes, profile vectors, bounded observed
example IDs, inferred-hint IDs/tier, contrastive examples, evidence count and
quality flags. Generated suggestions cannot activate campaigns or create offers.
Historical captured brands remain evidence, not fictional live bidders.

Only selected rows/vectors are exported. No whole database clone, raw answers,
customer context, browser sessions, credentials, image bulk downloads or sensitive
inferred targeting. First trial uses the existing travel demo, not a new vertical.

## Online ML flow

```text
Sanitized opportunity -> deterministic eligibility (outside ML)
  -> embed task once -> small evidence lookup
  -> each eligible advertiser's isolated profile + approved creatives
  -> configured DecisionEngine -> validated advisory decision
  -> deterministic bid policy/auction (outside ML)
```

Common result follows DECISION_ENGINE.md: relevance/intent rubric scores,
bid|skip|abstain recommendation, approved creative ID, evidence references,
engine/version/status/timing and conversionProbability=null. Jev chooses among
supplied options including no-fit; code owns bounds and score-to-bid mapping.

Use a bounded evidence packet, initially up to five curated observed examples
and three contrasts per advertiser, with capped text length. Candidate retrieval
misses count against the engine, not disappear from evaluation. No competitor
bids, wallets, untrusted tool instructions or full chat transcript reach the model.
An uncertainty flag yields abstain/no-ad or an explicitly labelled baseline.

Do not repeat offline hint generation, clustering, competitor discovery or null
bootstrap panels in every auction. Local vector time plus Jev network time are
both included in decision latency. Model output must not promote a hard-excluded
campaign. An organic answer model never receives paid creative as search evidence.

## Mac Studio execution layout

Proposed new packages/ml in this repo, with data_adapter, evidence, embeddings,
profiles, engines and evaluation modules; packages/contracts owns shared schemas.
Keep vector computation/evaluation in a small AXP-owned Python process on loopback
when needed; TypeScript backend calls its narrow typed scoring adapter. Engine
primitives may instead be local in TypeScript if simpler. No new distributed stack.

Use a supported existing Python/Node runtime, pin dependencies during implementation
and assess embedding cache compatibility before loading/downloading models. Corpus
copy and cache paths under ignored local-state/ml; private results ignored,
sanitized aggregate summaries exportable. Credentials remain server-side and
are never part of corpus profiles or agent inputs.

Do not share mutable model globals/processes with ContextHint or reload its PM2
services. Existing sources are read-only. Start small: travel subset only,
embedding concurrency one, bounded batches and candidate counts. Measure CPU,
memory and queueing; increase only if needed for the demo. Keep the existing
Mac free-space floor and buffer before downloads/exports. No GPU purchase,
cloud deployment, model fine-tuning or large index rebuild needed initially.

## Experiments: isolate data and model contributions

Core comparison on the same frozen tasks/campaigns/financial policy:

1. Rules only: no historical prompt/ad examples.
2. Embeddings only: approved campaign/creative text, no historical associations.
3. History-informed embeddings: curated profiles and observed mappings.
4. History-informed Jev: same packet plus typed task-fit judgment.

Optional Jev without history isolates the corpus contribution at a fixed model.
Traditional ML and small/larger LLM comparisons follow the same interface;
mark unavailable/insufficient-label arms honestly rather than delay the demo.
No tuning on final test labels. Historical ad presence is weak supervision, not
true user preference; never label every unobserved pair an actual negative.

Start with the 40-case pilot in JEV_BENCHMARK_PLAN.md, grouped by prompt family
and creative/advertiser identity across splits. Independent human-reviewed task-fit
labels grade relevance 0–3, commercial intent, acceptable creative and no-fit.
Synthetic boundary fixtures are labelled separately from historical examples.
Leave final test inputs out of profiles/examples; a random row split is insufficient.

Measure NDCG@3/top-choice fit, bid/skip errors, negative-constraint cases,
repeated-run agreement, retrieval recall, latency p50/p95/p99, deadline success,
throughput at stated concurrency, errors/fallback and attempted-decision cost.
Report <50, 50–100, 100–250 and 250–500 ms suitability from total measured time,
not marketing claims. Confidence intervals and sample size accompany pilot results.
Budget/cap correctness tests belong to the deterministic layer, not model accuracy.

Copying a few primitive functions does not imply ContextHint benchmark results
transfer to AXP. Reconstruction AUC, null percentile and buyer-fit margins are
diagnostics, not real serving probabilities, conversions or ad effectiveness.

## Minimal build order and outputs

1. Define snapshot/profile/result contracts and source-copy provenance register.
2. Curate one bounded travel snapshot and independent benchmark labels.
3. Implement rules and embedding engines, then evidence-profile retrieval.
4. Add Jev adapter behind the same interface; run the bounded comparison.
5. Choose baseline or Jev based on recorded quality/latency/cost tradeoffs.
6. Deliver stable ML contract, fixtures and evidence/decision explanation fields
   to the exchange builder; final frontend agent receives sanitized outputs later.

Required deliverables: snapshot manifest, provenance register for any actual code
copy, profile builder, replaceable engines, frozen case/label manifests, benchmark
results and recommendation. Current status: all are planned, not implemented.

Do not add conversion learning, automated campaign optimization, inference
subsidies, production telemetry, broad ML research rounds or marketing work to
this scope. A working, explainable data-backed decision is the MVP target.
