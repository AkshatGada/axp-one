# Phase 2 task card — evidence-informed advertiser decisions

2026-10-01. User explicitly requested Phase 2. Main owns contracts/integration;
Sol 6.1 High builder owns cached profile and engine. No payment, upstream writes,
clone, corpus embedding generation, installation, push, deployment or final UI.

## Goal and bounded scope

Advance Match/Decide: real cached ContextHint associations inform an advertiser's
own bid/skip/abstain evaluation. Preserve the rules comparator and run actual Jev
through the same DecisionEngine boundary. Code, not the model, owns money.

The current corpus is predominantly B2B travel tooling. Phase 2 uses separate
fictional travel-tool offers rather than pretending this evidence validates the
legacy hotel-stay fixtures. Existing hotel sessions/history remain unchanged.
Travel-tool taxonomy is a narrow additive contract extension, not a new vertical.

## Frozen seams

- Decision request v1 gains optional sanitized `opportunity.taskText` (max 1200),
  `travel_tools` intent and `requiredCapabilities` string-array constraints.
- Cached profile schema: `cached-campaign-profile.v1`, campaign ID/version/hash,
  profileHash, profileBuilderVersion, snapshotContentHash, approvedTargetingText,
  approvedCreativeVersionIds, sourceSeedHash, sourceVectorRevision=unrecorded,
  sourceCreativeIds, observedExamples, inferredHints, qualityFlags,
  historyStatus=ready|unavailable. No arrays of vectors or monetary values.
- Each observed example: id, promptId, creativeId, mappingId, text, advertiser,
  similarity. Each hint: id, creativeId, text, tier, modelVersion. Up to 5 examples
  and 2 hints; source IDs bind to actual mappings, not advertiser name alone.
- Profile compiler receives campaign, approved targeting text, a screened cached
  lookup result and explicit selected creative IDs. Frozen hash-bound profile
  contains only those selected source creatives. No automatic brand enrollment.
- Cached-history engine uses injected `lookup(taskText,{limit:5,signal})`, matches
  returned creative IDs to the frozen own profile, and emits standard validated
  agent-decision.v1. Unavailable query/profile -> abstain, not fabricated score.
  Association bands are a declared heuristic, not learned fit probabilities.
- Jev receives only own approved creatives, sanitized task and compact profile
  evidence. It has no wallet, budget, bid amounts, competitor contexts or tools.
- Nonfinancial `/v1/decisions/compare` shows attempts and evidence; no placement,
  budget reservation or payment is triggered by a comparison.

## Experiment and call bounds, frozen before outputs

Use 40 explicit authored fixture tasks (not human labels or ChatGPT algorithm
ground truth). Cases cover match, alternate task, low intent, exclusions, missing
cache, negation and prompt-injection content. Prescribed fixture labels, if any,
remain fixture assertions and never historical conversion/fit labels.

Initial actual-provider capability comparison: maximum 24 Jev calls plus at most
one 4-call corrective probe if a documented schema discrepancy requires it.
Maximum 8192 UTF-8 input bytes/call; sequential, no retries. Pinned jev-1.13.0.
Official listed input price checked 2026-10-01: $0.042 / million input tokens,
output free. Worst-case byte/token conservative estimate below $0.01 for 28 calls;
record actual usage/pricing and exclude no errors from attempted denominators.
User supplied the key for experiments and approved the Phase 2 build; no financial
wallet operation or background unbounded model loop is involved. Read key only
server-side from ignored mode-0600 .env.local; never echo/copy into artifacts.

All 40 cases run local comparator paths; actual-provider subset is bounded and
reported separately, never called the full 40-case live-model benchmark. No
training/calibration, historical held-out lift or conversion prediction claim.
No adoption based on these fixture-only results. Keep model replaceable; record
failure-inclusive latency/cost and actual <50/100/250/500ms completion rates.

## Acceptance / completion loop

1. Profile binds only own selected historical creative IDs and campaign version.
2. Rules and cached-history engines execute actual DB paths; cache misses explicit.
3. Actual Jev produces valid bid and eligible skip, or exact provider blocker.
4. Comparison route cannot mutate auction/accounting; model sees no money.
5. Frozen cases, attempts, hashes, provider and timings reproduce; label limitations
   visible. One focused review after integration, repair substantive issues once.
6. Update progress with completed/blocked evidence; do not call full MVP complete.

Official references: https://docs.typesafe.ai/api and
https://docs.typesafe.ai/models . Input pricing and schema are provider claims;
latency suitability must come from this run, not their marketing.
