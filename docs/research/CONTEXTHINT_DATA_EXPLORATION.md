# ContextHint targeting corpus: read-only exploration

Inspected 2026-09-30. This is a planning supplement, not an executed AXP targeting
benchmark or a claim that ContextHint's algorithm has been integrated here.
Existing upstream repositories, services and databases were not modified.

## Bottom line

Use the data, not merely a footer citation. The proprietary asset is observed
prompt-to-creative associations, with derived embeddings, intent clusters and
inferred targeting hypotheses. These can bootstrap campaign planning, relevant
examples and a data-backed DecisionEngine. They do not reveal ChatGPT's private
auction/ranking system, actual advertiser configurations, clicks or conversions.
Our advantage must be demonstrated by a held-out comparison, not promised as
the reason a hackathon will be won.

## Repository and source map

| Location | Inspected responsibility |
|---|---|
| /Users/akshat/platform-docs | canonical conceptual docs; architecture, dashboard boundary, mapping verification |
| /Users/akshat/ads-backend | collection adapters, canonical schema, BGE/BERTopic/hint generation and evaluation; HEAD 3d397d0 |
| /Users/akshat/openai-ads | library frontend and personalized intelligence read models; HEAD 6c2eef2e |
| /Users/akshat/contexthint | MCP/site/strategy; checked-out branch experiment/fable-part2, HEAD 27adb876 |
| /Users/akshat/contexthint-analyze-release | fused market retrieval implementation; HEAD c399c22e |
| /Users/akshat/ads-backend-prod | production checkout referenced in docs, not altered or executed |
| /Users/akshat/agentic-dsp | new AXP planning repository; no upstream code imports |

Worktree inventories were inspected to avoid treating one experimental checkout
as the deployed platform. No live deployment state was verified. This exploration
maps relevant docs/code and queries the local compute corpus; it is not a review
of every file in every Mac worktree or a raw-answer artifact audit.

Primary documentation read:
See also [the tool/API and newer v2 evaluation map](CONTEXTHINT_TOOL_API_MAP.md)
for the deeper follow-up inspection. The v1 evaluator below is not the only
existing implementation; newer flag-gated code has stronger contrastive pools.

- platform-docs/README.md and dashboard/README.md, dashboard/ARCHITECTURE.md.
- architecture/DATA-AND-PIPELINE-SOURCE-OF-TRUTH.md (dated 2026-08-19; historical totals).
- architecture/your-market-fused-assembly.md (2026-09-14 record, not new benchmark).
- ops/log/2026-07-23-campaign-studio-mapping-evidence-verification.md.
- product/context-v1-brief.md: aspirational connected-account optimization, not
  evidence that the shared scrape corpus contains conversions.

## Current local aggregate inventory

Queried Docker adsdb, database ads, with BEGIN READ ONLY, bounded statement
timeouts and no environment/credential dump. These are local compute counts,
not current public-site totals or validated unique companies worldwide.

| Entity | Rows / distinct count |
|---|---:|
| Advertiser records | 11,450 |
| Canonical ad creatives | 45,315 |
| Probe records | 154,474 |
| Distinct lowercased whitespace-normalized prompt strings | 146,438 |
| Ad appearance mappings | 420,541 |
| Distinct probes linked to an ad | 103,166 |
| Creatives linked to a probe | 45,315 |
| Inferred hints (MiniMax-M3@v1) | 62,130 |
| Embeddings, total | 259,358 |
| Prompt / ad / hint vectors | 146,438 / 45,315 / 67,605 |
| Prompt clusters, version 78 | 2,512 |
| Probe observation rows | 111,707 |

Probe status: 153,648 ok, 826 failed. These statuses are not automatically an
independent successful-run denominator for every historic appearance.

Appearance provenance: aws 353,110, verseodin 67,431. Both sources' appearance
rows have probe IDs. All aws rows have nonempty geo; verseodin rows have none.
The inspected aws-json.ts adapter takes geo from website.location, so validate
its meaning before claiming authenticated user location or uniform geo coverage.
No appearance rows in this local snapshot have request_id populated; that is not
permission to ingest private tenant data from other databases.

Repeated probe observations exist only for verseodin in this snapshot, including
52,131 zero-ad observations. Absence of an advertiser in other sources is unknown,
not an equally observed negative. Appearance unique keys include source_ref, so
these rows are not guaranteed repeated-exposure counts or real-user impressions.

Hint tiers: holdout 16,043; leave-one-out 13,828; sparse 32,259. Raw mean
reconstruction_auc 0.860 is descriptive only, not targeting accuracy. Sparse
hints use in-sample evidence and capped confidence. Multiple candidate selection
on a held-out slice means that slice is validation, not an untouched final test.

14,744 creatives have a nonempty utm_campaign. URL tags provide observed grouping
evidence, not confirmed advertiser account campaign IDs, bids or performance.

## Actual data relationships

probes stores prompt, niche/sub-niche, response text, status and capture metadata.
ads deduplicates advertiser/title/body by content_hash and stores creative copy,
destination, image and optional UTM/domain fields. ad_appearances joins ad_id to
probe_id, niche, source/source_ref and optional geo/request association.

embeddings stores model/dimension/kind/ref_hash. prompt_cluster_members connects
probes to versioned intent clusters. inferred_context_hints stores audience,
intent, topic, constraint, hint text, model version, evidence and reconstruction
score. Distinguish observed mappings from inferred hints and generated drafts.

Never reuse hint confidence as conversion probability. Never imply inferred
ad_group_key equals the advertiser's real configured ad group.

## Existing ML and targeting mechanics

1. embed.py: BAAI/bge-base-en-v1.5, 768 dimensions, ONNX/fastembed. Prompt
   normalization and hashed embed-once keys; cached corpus vectors.
2. cluster.py: BERTopic with UMAP, HDBSCAN and c-TF-IDF. Versioned clusters;
   noise can be soft-assigned by centroid cosine, not a proven intent label.
3. hints.py: advertiser/niche creatives plus linked triggering prompts feed an
   LLM hypothesis of audience/intent/topic/constraints. Candidates are compared
   by embedding reconstruction AUC against sampled prompts. Same-niche
   unobserved prompts are contrastive examples, not proven prohibited contexts.
4. generate_hint.py: product -> nearest ads/niche -> relevant corpus prompts ->
   candidate targeting descriptions -> reconstruction ranking. It is campaign
   assistance, not a real-time auction or a trained conversion model.
5. mcp_context_hint.py: prepare/evaluate functions expose retrieval and scoring;
   connected model authors hints. Its top-ranked product-similarity prompts form
   positives, so evaluation measures semantic agreement with this retrieval
   heuristic rather than independently labelled real serving accuracy.
6. market-brief/retrieval/resolution.ts: ad/prompt-shaped hypothetical queries,
   competitor-name lookup and weighted reciprocal rank fusion (k=60), breadth
   penalty and self-exclusion. Useful offline planning; hypothetical prompts
   are generated, not observations. Do not put multi-second planning on the
   exchange critical path or transfer past robustness numbers to AXP.
7. Campaign Studio documentation requires prompt-to-selected-creative mappings,
   evidence citations and separate observed/inferred/generated states. Inspected
   checkout code differs in generation granularity: pin a specific approved
   adapter/export before reuse, rather than importing an arbitrary branch.

No retraining, generators, hint APIs, scraper, model downloads, private account
tables or collector control routes were run for this exploration.

## Concrete MVP grounding

travel-hospitality has 850 mapping rows, 487 creatives and 232 linked probes.
Other travel niches exist but must not be summed as distinct advertisers/prompts
without deduplication. Inspected background examples include a Japan itinerary
with an Expedia Kyoto creative and Colosseum/Vatican ticket research with Viator.
These are observations, not endorsements or partnerships with those brands.

Use a narrow travel subset to support the existing owned travel demo. Keep buying
campaigns fictional. Display real historical evidence in a separate provenance
panel; do not run captured brands as live advertisers or copy third-party images
into sponsored placements automatically.

## How AXP should actually use it

Offline campaign preparation: map a fictional/operator-owned campaign to relevant
historical prompt neighborhoods and creatives; suggest targeting hints, exclusions
and human-reviewed examples. Freeze them with provenance IDs and dataset version.

Online: sanitize opportunity -> deterministic eligibility -> cached corpus
neighborhood lookup -> advertiser-scoped evidence features -> Jev/rules/embedding
decision -> deterministic bid policy -> auction. Historical advertisers are
evidence, never eligible bidders unless separately enrolled. No upstream DB
query or generative campaign planning inside the fast-path auction transaction.

Evaluate four matched arms: rules alone, embeddings without historical mappings,
history-informed retrieval, history-informed retrieval + Jev. Hold campaign,
auction and pricing policy constant. Report held-out relevance/ranking/skip and
latency differences. This isolates the data advantage from the model advantage.

Split by normalized prompt family and advertiser/creative groups; keep final
labels independent of the embeddings used to retrieve examples. Add a time split
only after timestamps have trustworthy capture provenance. Weight/cap prolific
advertisers and distinguish sparse from repeated evidence. Human labels assess
task fit; observed serving is a weak supervision signal, not ground truth quality.

## Safe data seam, not integration completed

Future bounded read-only export: selected public/background prompt/creative
mappings, source IDs, coarse category and curated inferred hints; no customer
profiles, chats, credentials, private requests or raw response HTML. Require
snapshot manifest, hashes, exact selection/dedupe criteria and model/version.
Save private corpus artifacts outside Git. Main backend consumes an explicit
export contract; it never imports @ads/db or writes upstream tables.

This phase produced aggregate evidence only, not a raw export or API adapter.

## Pitch wording

Use only once integrated: "AXP's targeting is informed by ContextHint's collected
ChatGPT ad observations: prompt-to-creative mappings and inferred intent patterns."
Until then: "AXP is designed to use this corpus; integration and comparative
targeting results are pending."

Do not say "we copied ChatGPT's targeting algorithm," "trained on all ChatGPT
ads," "predicts conversions," "these are live impressions," or "guaranteed moat."
Large scale is credible input coverage; held-out lift proves usefulness.

Public attribution: [ContextHint](https://www.contexthint.com/) and
[ChatGPT Ad Library methodology](https://www.chatgptadlibrary.com/methodology).
Public methodology uses a dated snapshot; its numbers differ from today's local
compute DB and should not be silently replaced. Apex contexthint.com could not
be fetched by the research browser; local code and platform docs were inspected.
