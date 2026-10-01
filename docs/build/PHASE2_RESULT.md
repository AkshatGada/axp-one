# Phase 2 — executed decisions, not just retrieval

2026-10-01. Scope: Match/Decide, separate from financial placement. Built in
`/Users/akshat/agentic-dsp`; cached-profile builder integrated as c63f51a from
isolated builder edd9384. Shared seam c9d24ed. Old AXP, ContextHint, What AI Cites,
existing exchange history, disposable wallets and production remain untouched.

## What works

- Frozen own-campaign cached profiles, explicit historical creative selection,
  campaign/version/content hashes and actual source prompt/mapping/hint IDs.
- Common DecisionEngine: rules, existing-cache history heuristic, real Jev HTTP.
  Fictional travel-tool campaigns avoid passing business-tool evidence off as
  support for the legacy consumer hotel-stay fixtures.
- Actual read-only existing-DB decisions; missing exact query cache abstains,
  with no vector generation, source writes, code imports or database clone.
- Functional console comparison and API. No auction, reservation, charge,
  delivery, provider call or wallet operation from this comparison button.
- Clearly labelled replay of actual provider results alongside fresh local
  rules/cache decisions. Recorded evidence is not live execution.

## Frozen comparison and its limits

40 authored fixture cases = 10 task patterns × 4 exact repetitions. Three
fictional campaigns per case. Four selected families × 2 repeats × 3 advertisers
= 24 actual provider calls. Labels are authored declaration checks, not independent
human/historical fit, randomized traffic, conversions or ChatGPT ranking truth.

Immutable initial artifact:
`local-state/phase2/0a6e9676-91e5-4a62-9ed3-cc9ff26d3cb8/result.json`.
Public, reconciled vector/key-free summary: `artifacts/phase2/summary.json`.

| Initial arm | Attempts | Valid | Result |
|---|---:|---:|---|
| Rules | 120 | 120 | All authored declaration assertions matched, by construction |
| Cached history | 120 | 12 | One of ten task patterns cached; other108 abstained |
| Actual Jev, original question/parser | 24 | 0 | 18 invalid, 6 insufficient-evidence abstentions |

Cache engine has a real lookup path, not a fabricated similarity fallback. But
the approved existing-cache-only restriction does not cover arbitrary new
prompts. Its initial failure-inclusive p95 engine timing was2328ms, dominated
by cold reads; later repeated/memoized attempts are not independent cold latency
measurements. Preparation/lookup events are retained separately. No load or
throughput experiment occurred.

Initial Jev latency p50=336ms, p95=519ms across **all attempts, none valid**.
Those response times are not successful decision SLA evidence.

## One bounded corrective probe, four calls total

First diagnostic (`27eca203-a2ce-4ab1-8f7c-6edf487a913c.json`) found independent
hundredth rounding: reported intent1.72 versus rounded-distribution mean1.73.
The original parser tolerated only0.001 and rejected this. Separately, the
original sufficiency question confused a declaration-only provisional evaluation
with independently proven product performance; the diagnostic returned0.52.

Corrective versions: `zero-index-nearest-level-rounded-provider-v2` and
`declared-packet-completeness-v2`.

- Distribution error bounded by0.005 per probability; weighted score error
  bounded by0.005 × (1 + sum of level indices). Strict keys, model, ranges,
  option selection, rubric legends, no-fit consistency and money rejection stay.
- Packet completeness asks if supplied advertiser declarations permit fit **or
  no-fit**, not whether claimed product performance is proven. Threshold0.8 stays.
- This changes the evaluation question, not just the parser. It is a motivated
  revision on seen examples, **not an independent held-out retest**. Never combine
  its success rate with the failed initial comparison or claim resulting lift.

Three subsequent actual-provider calls passed the common engine:

| Task / own campaign | Actual decision | Fit / intent | Engine time |
|---|---|---|---:|
| Booking / TripDesk | bid | 3 / 2 | 522.5ms |
| Booking / AgentPass | eligible no-fit skip | 1 / 2 | 529.3ms |
| Educational / TripDesk | no-fit, low-intent skip | 1 / 0 | 512.3ms |

These are capability/demo evidence, not agent-examination research or
statistical ad-effectiveness results. Exact corrected payloads, replies, profile
hashes, usage and engine outputs are in `local-state/phase2/probes/`.
All three valid probes exceeded500ms; no suitability demonstrated for <50,
50–100,100–250 or250–500ms. Local sequential observations are not fleet capacity.

Total: **28 calls, 30789 input / 2450 output tokens**. Estimated provider-only
cost **$0.001293138** from the checked public input price. Not invoiced totals;
local compute unpriced. Initial and diagnostic artifacts preserved separately.
The authorized Phase2 call bound is exhausted. No more live calls in this slice.

## Architecture/adoption decision

**Inconclusive; keep deterministic rules as the default.** Jev is now functional
and replaceable, but this trial establishes neither quality nor latency advantage.
Cached associations remain grounding/inspection evidence, not calibrated fit.

No actual trained ranker, traditional ML, small/large LLM comparison, history-free
Jev ablation, calibrated conversion probability or independent historical test
was performed. Their absence is explicit, not filled with invented metrics.

## Focused review repair

Sol6.1 High reviewer found one integration blocker: preparation selected source
creatives by matching advertiser name. The compiler/engine numeric bindings were
strict, but automatic preparation could approve an unrelated same-brand creative.
Preparation now intersects actual evidence with frozen reviewed IDs: TripDesk
5441/26176, AgentPass7668, HotelOps3422. These are the exact IDs already present
in the recorded profiles; no provider trial was repeated or relabelled. New
regression substitutes an unapproved same-brand creative and requires unavailable
profile/abstention. Manifest now hashes the explicit source selection separately.
Historical brands still are not enrolled advertisers or independently verified
products. One bounded recheck passed: four focused tests and raw/public summary
reconciliation. No second broad audit round. Whole suite117 passed with6 opt-in
skips; focused actual read-only DB/API suite23 passed. Browser hit and cache-miss
paths both verified, historical8000 synthetic accepted units unchanged.
Screenshots: `/private/tmp/axp-phase2.png` and
`/private/tmp/axp-phase2-jev.png`. Local console server runs on8788.

## Reproduce without additional provider spend

```sh
cd /Users/akshat/agentic-dsp
node --test 'tests/**/*.test.mjs'
AXP_CACHED_CORPUS_LIVE=1 AXP_CACHED_CORPUS_TEST_TEXT='AI agent travel booking automation' node --test tests/demo/decisions.test.mjs tests/ml/cached-corpus.test.mjs
AXP_CORPUS_DB=ads node apps/backend/server.mjs
```

At localhost8788, choose **AI agent travel booking automation** in the advertiser
comparison, run it, inspect own campaign bid/skip + provenance. Choose the
deliberately uncached task to see explicit unavailable cache decisions. Actual
Jev cards are labelled recorded; `/v1/decisions/recorded` performs no call.

`node scripts/ml/phase2-benchmark.mjs` reruns only local arms. Do not use
`--live-jev` again under this exhausted packet. A future approved trial must
freeze its own call budget, question/code hashes and held-out/adoption criteria.

## Completion / next missing demo beat

Phase2 capability slice: implemented and executed; review/recheck recorded in
BUILD_PROGRESS.md. G2's full quality/adoption research is inconclusive, not passed
as improved targeting. No arbitrary unseen-task vectors silently introduced.

Phase3 remains: connect isolated actual buyers and an independent organic answer
to deterministic competition, disclosed rendered placement, receipt and charge.
Do not replay recorded model decisions as fresh live buyers. Actual channel
settlement remains Phase4; final frontend and demo recording are later work.

Provider schema/pricing references:
https://docs.typesafe.ai/api and https://docs.typesafe.ai/models .
