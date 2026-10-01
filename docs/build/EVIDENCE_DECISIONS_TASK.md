# Evidence-informed advertiser decisions

2026-10-01. User approved the recommendation to make ContextHint an internal
decision input, not only a dashboard reference. Work in agentic-dsp only.

## Frozen slice

Main owns a replaceable deterministic DecisionEngine, service/API integration and
functional comparison UI. A builder owns a bounded offline comparison packet;
one fresh reviewer checks substantive algorithm/claim blockers at the end.
No new provider/embedding calls, upstream reads/writes, wallets or payments.
Use the existing hash-verified 18-association catalogue, preserve old run outcomes.

Pipeline: task → bounded historical prompt/hint retrieval → own-campaign profile
alignment → evidence-supported relevance prior → unchanged integer bid policy →
unchanged auction, render receipt and synthetic accounting. Organic inputs stay
independent. No historical advertiser enrollment or product capabilities inferred
from another advertiser's creative.

## Comparator and heuristic frozen before execution

Text-only arm: own approved creative, product description and context hints.
History arm: identical arm plus retrieved, campaign-aligned historical examples.
Use deterministic lexical features and smoothed IDF from distinct corpus prompts;
no fresh vectors, semantic-model or supervised-training claim. Remove common
function words; fixed modest normalization, not a tuned model.

Task coverage is weighted fraction of task features present in a packet.
A historical packet requires at least two matching content features, a declared
capability topic anchor and campaign-text affinity. Explicit selection does not
bypass alignment. Deduplicate by prompt/hint identity; use maximum support,
not impression frequency. Keep at most three packets per candidate.

Historical prior: max(text coverage, 0.5 text coverage + 0.5 best historical
coverage). Bands: coverage >=0.5 → level3, >=0.2 → level2, otherwise level1.
Actual declared-capability fit supplies an upper bound: complete level3, partial
level2, no recognized matching capability level0. Informational/unsupported tasks
still skip; required missing capabilities cannot bid. History cannot supply a
capability, hard authorization or conversion probability. Missing/nonaligned
evidence gives exactly the text-only result, with explicit fallback provenance.

These authored thresholds are an uncalibrated relevance-support policy. Text
coverage and historical association are not actual task-fit ground truth.

## Acceptance / stopping rule

- Two-arm compare has zero opportunities, reservations, charges or model calls.
- Runtime and comparison use the same scorer; source IDs/text/hash are inspectable.
- Wrong capability/hard requirement remains no-bid despite strong history.
- Unsupported/cache-missing contexts fall back, not labelled negative evidence.
- Repeated rows do not inflate scoring; ad text cannot instruct money changes.
- Preserve existing basic travel story and receipt/restart behavior.
- Small authored comparison packet reports changes, safety checks, latency and
  unavailable support. No independent lift claim, no forced history winner.
- Run local tests/browser walkthrough and one bounded review/recheck. Stop after
  connected behavior and handoff, not a broad ML/production-hardening project.

New inference/embedding experiments or a calibrated ranker are separate future
work. Full-corpus headline figures must not be represented as this 18-row
runtime subset or a supervised training set.
