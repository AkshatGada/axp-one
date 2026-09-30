# ContextHint plugin and backend reuse map

Read-only source exploration, 2026-09-30. No plugin/API requests, paid generation,
startup, mutations, secrets reads, installation or deployment performed.
An endpoint in code is not proof of current service health or activation.

## Actual call topology

```text
Connected assistant -> ContextHint /api/mcp tool registration
  -> Next.js auth/rate limits/cache/evidence envelope
  -> direct serving-DB intelligence queries OR hint-api HTTP client
  -> ads-backend Python retrieval/evaluation/generation
  -> local corpus/profile/vector pools
```

The plugin tools are registered in contexthint-main/src/app/api/mcp/route.ts,
not all in ads-backend. Their shared Python API client is src/lib/hint-api.ts.
SQL-backed helpers live in mcp-intel.ts and route helpers. Not every plugin tool
calls Python, and not every Python endpoint is a public plugin tool.

Compared the experimental contexthint checkout and contexthint-main: both
register the same 11 tool names in the inspected route. Also inspected the
ads-backend checkout (3d397d0) and ads-backend-prod checkout (76d9332).
The latter contains additional v2/sub-niche evaluation code; do not select a
reuse source solely by repo name or assume these heads match live deployments.

## Registered plugin tools

| Tool | Actual responsibility/path | AXP role |
|---|---|---|
| prepare_context_hint | HTTP /mcp/context-hint/prepare; product-ranked prompts, inferred peers, authoring contract | campaign setup and frozen evidence packet |
| evaluate_context_hint | HTTP /mcp/context-hint/evaluate; structured candidates, prompt fit and risks | campaign hint validation, not runtime conversion estimation |
| find_similar_advertisers | HTTP /similar-advertisers; observed creative-vector lookup | discover historical peer evidence, not enroll bidders |
| list_niches | serving corpus/rollup query and niche resolution | evidence taxonomy selection |
| get_niche_intel | SQL-backed advertiser/intent/hint summary | strategic planning/context coverage |
| get_advertiser_intel | SQL-backed cross-niche profile; raw creative fallback when no hints | evidence-backed advertiser profiles |
| get_niche_patterns | diversified inferred-hint sample and intent mix | campaign segmentation and hypothesis generation |
| get_ad_creatives | observed title/body, advertiser/niche samples, raw fallback | creative-reference evidence, not licensed active ad inventory |
| explain_context_hints | canonical guide text | operator guidance, not scoring model |
| explain_campaign_strategy | strategy playbook with provenance caveats | off-path planning; no measured conversion inference |
| plan_media_budget | scenario math with assumed/transferred inputs | planning reference only; never AXP spend authorization |

The prepare/evaluate loop uses the connected model to author candidates. Neither
endpoint should secretly invoke a generative server-side model. Website generation
is separate. Preserve the distinction when using Jev for typed buyer judgments:
Jev need not write targeting prose; a strategic LLM/operator can prepare that prose.

## Python routes beyond plugin tools

| Route | Implementation and boundary | Reuse recommendation |
|---|---|---|
| /generate-hint | generate_hint.generate; generative provider + embedding validator | optional offline drafting, not critical-path serving |
| /similar-advertisers | generate_hint.similar_advertisers; BGE + pgvector | peer recall or cached preparation |
| /mcp/context-hint/prepare | mcp_context_hint.prepare_context_hint | reuse evidence concepts and bounded response contract |
| /mcp/context-hint/evaluate | mcp_context_hint.evaluate_context_hint | reuse candidate evaluation concept after version check |
| /rank-similar-advertisers | similar_advertisers_with_evidence, clone-only connection | richer provenance recall; requires supported adapter |
| /rank-opportunities | generate_hint.rank_opportunities, clone-only | product-to-historical-prompt ranking, NOT ad auction ranking |
| /draft-opportunity-context | generate_for_opportunity, clone-only + generation telemetry | approved prompt-set campaign draft, offline |
| /generate-campaign-action | generate_campaign_action, clone-only + generative provider | evidence-grounded creative direction, offline |
| /track/prompt-evidence | track_prompt_evidence helpers, newer checkout route | narrow supporting prompt evidence; version availability must be pinned |
| /mcp-telemetry | authenticated telemetry DB writes | operational route; not corpus lookup or targeting evidence |
| /generation-stats, /health/* | usage/readiness/metrics | diagnostics only, not prediction quality |

In inspected code, phase2a_connection refuses remote hosts and databases other
than local ads_phase2a_dev. Do not repoint those endpoints to the live corpus or
remove their guards to serve AXP. A supported read-only export/adapter must be
explicitly scoped instead. A read-only-looking request can still write telemetry
or charge generation costs; this exploration only read source.

## Existing ranking features worth reusing

rank_opportunities embeds product and ranks niche prompt vectors by cosine. It
enriches with cluster/sub-niche metadata, advertiser/appearance counts and top
prompt examples; returns maximum and top-three mean fit. It currently labels a
probe with no appearance row zero_ad through NOT EXISTS. For AXP rename that
feature no_observed_ad unless verified successful comparable run evidence exists.
Do not treat missing appearance as reliable negative demand or cheap inventory.

similar_advertisers_with_evidence enriches creative similarity with observed
evidence. It searches historical advertiser records, not AXP-approved campaigns.
Resolve campaign identity separately and never equate a captured brand with a
paying participant.

Stored niche_embedding_profiles and newer sub_niche_embedding_profiles can
precompute candidate neighborhood retrieval. Shared prompt matrices and model
version caches are performance reuse candidates. No live latency was measured;
client comments saying fast or 1–2 seconds are not a sub-100-ms exchange result.

## Important newer evaluation path

ads-backend-prod/intelligence/mcp_pool_v2.py and subniche_unit.py add:

- Product-nearest segment prompts split into shown and scored subsets.
- Similarity-matched hard negatives from sibling sub-niches, adjacent niches and
  global ANN; disjoint pools and near-tie source-priority rules.
- Bootstrap 90% score intervals, unrelated-hint null panel, same-segment reference
  hints, original brief baseline and percentile comparisons.
- Buyer-fit margin against sibling profiles, broad/narrow matching flags and
  undercovered/false-positive examples.
- Thin evidence becomes directional instead of an overconfident validated claim.

Dispatch is flag-driven: HINT_EVAL_POOL=v2 and/or HINT_UNIT=sub; defaults and live
activation must be checked at integration time without dumping secret config.
The frontend types include optional v2 fields but some inspected caller paths
do not expose all evidence-ID/sub-niche features. Pin end-to-end request/response
schemas; do not assume every checkout supports the same contract.

Existing test_mcp_pool_v2.py covers AUC, seeded bootstrap, shown/scored splitting,
hard-negative matching, pool disjointness, thin pools and band boundaries. Tests
were inspected, not run; no fresh correctness or targeting-lift claim is made.
These remain semantic/proxy evaluation pools, not independent outcome labels or
measured conversion probabilities. Repeated hint revisions also need a final
untouched evaluation split for AXP performance claims.

## Maximum useful reuse without importing the whole platform

1. Strategic planning: taxonomy, peer/creative evidence, hint preparation and v2
   validation; do this before activation, not per auction.
2. Freeze a campaign evidence profile: provenance IDs, approved context hint,
   curated positive/contrastive examples, centroid, embedding/model version,
   sparse/pool-quality flags and operator-approved constraints.
3. Fast serving: opportunity embedding retrieves eligible campaign profiles;
   Jev evaluates bounded task/creative fit with these frozen examples. Keep
   unrelated historical brand counts out of financial bidding authority.
4. Benchmark: compare keyword/rule-only, embeddings, history-informed profiles
   and history+Jev. Ablate hints, observed mappings and hard negatives separately
   only if the first small comparison is promising; do not inflate the MVP scope.
5. Demo: show actual historical examples and why a buyer bids/skips, separate
   from fictional participating campaigns, receipts and payment settlement.

Use explicit HTTP/export contracts, not cross-repo source imports. Reuse the
data foundation and selected algorithms through AXP's DecisionEngine; do not copy
private MCP account management, collection writers, marketing-blog generators,
tenant runtime data or budget heuristics into the exchange.

## Minimal next implementation slice

Create a bounded background-corpus export contract and 3 fictional travel campaign
profiles, freeze the test panel, then implement rule and history-backed embedding
engines. Add Jev behind the same interface. The output should visibly demonstrate
how real corpus evidence changes candidate fit/skip decisions, while code alone
controls auction, cap and payment. No new production infrastructure is necessary.
