# DecisionEngine comparison: does Jev earn its place?

Status: frozen proposed experiment, no benchmark measurements yet. Do not label
vendor measurements or previous ContextHint reranking trials as AXP results.

## Arms and fair inputs

| Arm | Method | Main tradeoff |
|---|---|---|
| Rules | explicit intent/constraint weights | simplest/local/explainable; brittle semantics |
| Embeddings | cached campaign vectors + opportunity similarity | semantic matching, not constraint verification |
| Traditional ML | logistic classifier or small learned ranker | needs training labels; defer if insufficient |
| Jev | atomic typed relevance/intent/creative judgments | remote latency/cost; task calibration needed |
| Small LLM | constrained structured judgments | model/hosting tradeoffs and schema failures |
| Larger LLM | same output/rubric | quality reference, not ground truth; cost/latency |
| Hybrid | rules/embedding shortlist then fast judgment | fewer calls, shortlist misses must count |

Use the same sanitized opportunity, frozen eligibility, creative declarations,
score rubric and deterministic bid policy. No paid creative enters organic answer
generation. Record actual available model/version, hardware, provider and pricing.
Unavailable arms are unavailable, not scored as losers or silently substituted.
ML training must use a separate training split; the initial small fixture panel
cannot justify claiming a learned conversion predictor.

## Small execution sequence

1. Freeze 40 task cases: clear matches, ambiguous intent, low commercial intent,
   negation, mandatory feature mismatches, paraphrases and malicious creative text.
   Separate hard exclusion tests from scoring of eligible candidates.
2. Label relevance 0–3 and intent 0–3 with explicit criteria and acceptable
   creative IDs. Human review resolves ambiguous fixtures; model judges are
   supplementary, never automatic truth. Hold out intent/template families.
3. Rules and embeddings first; then Jev/small/larger LLM on identical cases.
   Three repetitions/case for a pilot; randomize arm order, freeze rubric before
   held-out evaluation, store raw valid/invalid output and all attempts.
4. Measure candidate sizes 3, 10 and 30, concurrency 1/4/16 with bounded request
   counts/provider limits. Keep the 40-case pilot separate from load timings.
   If cost/access unavailable, stop that arm and report missing evidence.
5. Summarize paired differences and uncertainty; do not turn 40 cases into a
   population/generalization or production-scale claim. Larger confirmation is
   only needed if the pilot justifies replacing the simple MVP baseline.

## Metrics

| Metric | Measurement |
|---|---|
| Latency | p50/p95/p99 for extraction, gate, engine, bid policy, auction and total decision; request/network included |
| Cost | tokens/API charges per attempted opportunity, per valid result and per filled slot; retries/fallback/local compute separately |
| Accuracy | ordinal intent/relevance error, bid/skip confusion, mandatory-constraint violations |
| Ranking | NDCG@3, top-1 acceptable creative, recall of shortlist, no-fit accuracy |
| Consistency | repeated rank agreement, score spread, paraphrase stability |
| Throughput | valid completed decisions/sec at stated concurrency/hardware/duration, with errors and queueing |
| Failure | timeout, invalid schema/IDs, transport errors, abstention, fallback rate |
| Debuggability | input/rubric version, field evidence, deterministic replay; explanation not accepted as truth |
| Deployment | dependencies, hosting/key requirements, cold start, availability, operational steps |

Measure warm/cold, cached/uncached separately; campaign embedding precomputation
is disclosed, opportunity embedding generation is timed. Include bypassed/no-ad
requests separately, not as artificially fast model decisions. Error requests
are retained in deadline-success and cost denominators. Do not exclude timeouts
from latency claims without stating censoring. p99 on tiny samples is exploratory;
timing sample count and uncertainty accompany every quantile.

## Latency suitability matrix

| Exchange deadline | Jev | Rules/embeddings/ML/LLMs |
|---|---|---|
| <50 ms | unmeasured | unmeasured |
| 50–100 ms | unmeasured | unmeasured |
| 100–250 ms | unmeasured | unmeasured |
| 250–500 ms | unmeasured | unmeasured |

Fill each with total-decision p95 and deadline success rate, not just model server
time. A target is provisionally viable if at least 95% of attempted decisions
finish valid within its upper bound in the stated environment, with no hard
policy violations. Report actual observed range; a 100-ms API call does not imply
a 100-ms full exchange. The prior 10-second real-agent demo budget is a different
mode, not evidence of real-time serving. Settlement is asynchronous and excluded
from decision latency, with its own end-to-end receipt timing reported.

## Predeclared decision rule

No adoption with policy violations or unexplained failure regression. Prefer
simple baseline unless Jev improves held-out NDCG@3 by at least 0.05 absolute at
the chosen deadline, or lowers p95 by at least 20% against a quality-equivalent
model arm (NDCG loss no more than 0.02), without exceeding a predeclared cost cap.
These are product thresholds, not scientific facts; freeze cost cap and target
deadline before paid trials. Report paired uncertainty: an inconclusive pilot
keeps the baseline. Jev being faster than a large LLM alone is insufficient if
rules/embeddings achieve comparable quality more simply.

## Deliverable

Benchmark JSON/CSV, frozen input/label hashes, run manifest and short conclusion:
recommended engine, measured latency bucket, tradeoffs and unavailable evidence.
No fake conversion labels, invented latency values or purchase/settlement tools
in test-agent contexts. One focused experiment, not an indefinite audit cycle.

## Data-advantage ablation

Add matched rules-only, embedding-only, history-informed and history+Jev arms
using the bounded ContextHint export proposed in
[the corpus exploration](research/CONTEXTHINT_DATA_EXPLORATION.md). Keep the auction
and financial policy constant. Freeze independent relevance labels and separate
normalized prompt families/creative groups across evaluation splits. No corpus
access means this comparison is pending, not passed with fabricated examples.
Historical serving associations are weak supervision, not conversions or proven
task fit. Measure the history contribution separately from the Jev contribution.
