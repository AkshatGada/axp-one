# V2 shared interfaces — implementation contract

## Configuration (main-owned)
`packages/v2/config.mjs` exports `QUESTIONS`, `CAMPAIGNS`, `mlCampaign(c)`, `makeOpportunity(prompt, now)`, `organicReference(prompt)`. Campaigns use existing exchange DTOs. Crypto capabilities are declaration-only. Frozen questions express soft preferences; explicit mandatory capabilities are enforced separately by the exchange.

## Evidence builder ownership
Write only `packages/v2/evidence.mjs`, `scripts/demo/v2-evidence.mjs`, `tests/v2/evidence.test.mjs`, `docs/build/V2_EVIDENCE.md`, new `artifacts/v2/evidence/`. Export and execute read-only source queries; do not touch old catalogue or source objects.

`loadEvidence({directory})` verifies hashes and returns an `EvidenceRetriever` with `retrieve(task, campaign)` (sync or async), `publicCatalogue()` and `manifest`. Campaign passed here is ML DTO. `retrieve` returns `{method: 'vector'|'lexical_fallback'|'unavailable', fallback: boolean, sourceHash: string, examples: [], hints: [], profile: object|null, ...metadata}`. Maximum five distinct normalized prompts; profile maximum three aligned examples and two hints. Repeated mappings do not increase scores.

Profile schema `retrieved-campaign-profile.v1`: `profileId`, `profileHash`, `campaignId`, `campaignVersionId`, `campaignContentHash` (hash of ML DTO), `snapshotId`, `snapshotContentHash`, `retrievalMethod`, `historyStatus` (`ready`/`unavailable`), `observedExamples` max3 `{id,text}` (text≤600), `contrastExamples` empty, `inferredHints` max2 `{id,text,tier,qualityFlags}` (text≤600). No vectors. Profile hash is canonical hash of object without profileHash. Total example/hint text≤2400. Main adds validation branch in existing contract. Source IDs/bindings preserved in examples and public catalogue, not financial eligibility.

## Decision builder ownership
Write only `packages/v2/agents.mjs`, `tests/v2/agents.test.mjs`, `docs/build/V2_AGENTS.md`. No live provider calls until main freezes the connected run.

Export `createPairedHarness({stateDir,runId,retriever,apiKey,liveEnabled=false,transport?,now?})`. Expose `run({questions,campaigns,opportunityIds?})` returning paired results; `status()` durable allowance/state; `results()` saved outputs. `questions` string array; `campaigns` ML DTO array; optional opportunityIds array same length. Stable keys questionIndex/campaignVersionId/arm. Each result `{questionIndex,task,campaignId,campaignVersionId,arm:'text_only'|'history',retrieval,decision,callId,requestHash,status,...timing}`. Decision is existing validated decision DTO; preserve attempted failures. The harness admits before invocation and never repeats admitted/uncertain calls. Max12 calls, no automatic correction. Identical completed run returns saved outputs; changed inputs rejected. Use injected fixture transport for tests. Model input excludes budget/competitors/wallets; no automatic rule fallback. Use the existing Jev transport and strict validators, no new monetary algorithm.

## Main-owned integration
Main owns additive taxonomy/profile validator, campaign/onboarding/service/server/UI/replay/launcher/package/docs and integration tests. Decision outputs drive existing exchange auction with immutable opportunity binding. Model decisions and policy exclusions remain distinguishable. V2 synthetic payments and actual model execution are separate labels.
