# Replaceable fast decision layer

Status: researched architectural option, not implemented or benchmarked.
Jev means TypeSafe AI Jev, not another similarly named service.
Detailed ML component/data/runtime mapping: [ML_PLAN.md](ML_PLAN.md).

## User-approved buyer behavior

Jev can power each advertiser's buying agent: examine a sanitized opportunity
against its own campaign, recommend bid or skip, and select an approved creative.
The publisher creates the opportunity; it is not the advertiser's bidder.
This role is approved for implementation and comparison, not default adoption
without evidence. A skip/abstain yields no bid; a bid recommendation proceeds
only through deterministic bid calculation and policy checks below.
Optional publisher-side ad-fit judgment does not replace publisher restrictions
and is deferred from the initial MVP.

## Three separate authorities

1. Strategic agents plan campaigns, discover publishers, allocate operator-approved
   budgets and propose strategy changes. They are off the per-opportunity critical
   path. Any activation or cap change still requires deterministic authorization.
2. A DecisionEngine scores already eligible candidates for a single opportunity.
   Rules are the MVP default; embeddings and models are replaceable experiments.
3. Code owns eligibility, frequency, floors, integer bid calculation, auction,
   reservations, wallet authority, receipt accounting and settlement. A model is
   never the auctioneer or signer.

```text
Conversation -> sanitized intent -> opportunity -> hard eligibility
  -> DecisionEngine -> deterministic bid policy -> first-price auction
  -> reserve -> sponsored card -> accepted delivery -> payment authorization
  -> accumulated settlement
```

## Common contract

```typescript
interface DecisionEngine {
  scoreOpportunity(
    opportunity: SanitizedOpportunity,
    campaign: EligibleOwnCampaign,
    options: { deadlineAt: string; policyVersion: string }
  ): Promise<DecisionResult>;
}
// Conceptual types; implementation follows review, not part of this phase.
// DecisionResult: ranked advisory candidates + engine/model/version/latency.
// Candidate: campaignId, creativeId, relevance [0,1], intent [0,1],
// recommendation bid|skip|abstain, evidenceFieldIds, reasonCodes,
// conversionProbability: null (MVP), scoreSemantics, status.
```

Implementations: RuleDecisionEngine, EmbeddingDecisionEngine, MLDecisionEngine,
JevDecisionEngine, SmallLLMDecisionEngine, LLMDecisionEngine and HybridDecisionEngine.
Each invocation contains one advertiser campaign and no monetary fields. Code
outside the model owns current capacity and bid calculation. Return only supplied
eligible campaign/creative IDs; reject NaN, out-of-range,
duplicate or missing IDs and unknown fields. Stable ties use campaign IDs. Ranking
is advice to the advertiser's bid policy, not the auction's winner order.
Invoke each advertiser with only its own eligible creatives and coarse task,
never competitor bids/policies; aggregate their validated advisory results.
An optional cross-campaign offline benchmark is not runtime data disclosure.

Decision deadline is configurable. Timeout/invalid/low-confidence -> explicit
abstain or labelled RuleDecisionEngine fallback, under the same policy. Never
let fallback overwrite the original failure metric or reopen a closed auction.
Engine configuration is versioned per run and switchable without ledger changes.

## Bidding without fabricated conversion value

Use a frozen operator policy table mapping fit/intent score bands to permitted
fractions of maxBid. Compute base-unit bids with integer arithmetic, clamp to
maxBid and available budget, then enforce floor/eligibility at auction time.
Reject/skip below thresholds. The table is a demo spending policy, not optimized
expected value. ML conversion estimates remain null until observed outcome data,
held-out calibration and objective definitions exist. Confidence is not conversion
probability. A strategic LLM cannot change this table during an auction.

## Jev mapping and limitations

Official docs expose Score for ordered descriptive levels, Choice for supplied
options, and Noul for binary judgments. Map relevance and commercial intent to
separate descriptive Score rubrics; normalize score by number of rubric intervals
in code. Choice may propose an approved creative including a no-fit option.
Noul may advise whether requirements are met; hard mandatory restrictions are
still checked in code. Questions are atomic, not a request to invent bids, do
financial arithmetic or determine the winner.

Jev probabilities describe its answer distribution; they are not measured
conversion rates or correctness guarantees. Typed API results still require
application validation and task-specific accuracy evaluation. Verify pinned model,
input limits, question count, candidate size and transport behavior in the spike.
Provider claims of low latency/parallel questions do not establish AXP p95 latency.

Sources checked 2026-09-30:
- [Introduction](https://docs.typesafe.ai/introduction)
- [Score and rubric semantics](https://docs.typesafe.ai/primitives/score)
- [Choice](https://docs.typesafe.ai/primitives/choice)
- [Confidence](https://docs.typesafe.ai/confidence)

## Current recommendation

Ship the rules-based vertical slice first. Run the bounded comparison in
[JEV_BENCHMARK_PLAN.md](JEV_BENCHMARK_PLAN.md) before choosing a fast model.
Jev is a plausible typed judgment adapter, not a selected dependency. No measured
AXP latency/quality advantage exists yet. Full conversion prediction and sustained
production load experiments are deferred; they must not block the MVP demo.
