# AXP V3 — frozen implementation and ownership packet

Approved 2026-10-01. Current user V3 plan overrides historical phase defaults.

## North Star

Make the data contribution inspectable, then demonstrate genuinely competing
advertiser agents and receipt-linked cumulative MPP settlement on the hosted
Solana sandbox. Preserve V1/V2; final frontend and public deployment are deferred.

## Fixed story

ClearVault and KeyForge declare hardware/offline Ethereum/Solana wallets. They
target straightforward and experienced self-custody respectively. LeatherGuard
declares physical RFID protection only. All are fictional declarations.
Two paired questions use existing V2 cached/lexical retrieval; a new turn repeats
the cached question. A mobile-only requirement must produce deterministic no-fill.
Do not manufacture winners, skips, prices or evidence improvement.

## Limits and boundaries

24 durable Jev admissions (12 paired, 3 repeat-history, 6 laboratory, 3 documented
transport/schema corrections). Six fresh gpt-6.1-sol low organic completions.
Two channels only, each deposit 20000 test-USDC base units; bid <=4000,
per-campaign accepted <=8000, aggregate <=12000; three paid deliveries maximum.
Aggregate fees/new rent <=20000000 test lamports. No top-ups/replacement channels.
Keep >=40 GiB free. Source DB, V1/V2 state/artifacts, live site untouched.

## Shared interfaces (main-owned)

- `packages/v3/config.mjs`: QUESTIONS, SCENARIOS, CAMPAIGNS, POLICY,
  `mlCampaign(c, hints)`, `makeOpportunity(task, {turnId, randomSessionId, now,
  mandatoryCapabilities})`. Monetary values are unsigned decimal strings.
- Decision builder exports `createV3Harness({stateDir,runId,retriever,apiKey,
  liveEnabled,transport,now})`: `runSlots({slots})`, `status()`, `results()`,
  `close()`. Slot: `{slotId,question,questionIndex,arm:'text_only'|'history',
  campaign:mlCampaign(...),opportunityId,category:'paired'|'repeat'|'laboratory'|
  'correction', correctionOf?}`. Return persisted records with exact input packet,
  its hash, retrieval/source bindings, validated decision, attempt status/timing.
  Same slot/input reuses outcome; changed body conflicts. Admission persists before
  calls, interrupted admissions become uncertain and never repeat automatically.
  No financial fields, competitors or credentials reach Jev. Provider failure is
  unavailable/abstain, not rules fallback. Only history results enter auctions.
- Payment builder exports `createV3Payments({stateDir,runId,getLedgerCharge,
  getLedgerObligations})`: terminal-only `freeze({campaigns})`, `open(channelId)`,
  `authorize(channelId)`, `close(channelId)`, `reconcile(channelId,operation)`,
  `status()` public projection. Coordinator uses existing native adapter/store;
  persisted unique salts and transaction identities; aggregate fee/rent guard.
  `status().channels` is compatible with Exchange networkState projection.
  Browser and agents cannot supply a charge amount or invoke payment signing.
- Organic bridge (main): request includes exact question, turn, inputHash,
  requestId and model; completion must bind all fields and app-agent identity.
  Only sponsor-free general guidance; waiting/unavailable is explicit.
- Main service/backend: separate synthetic laboratory and sandbox acceptance,
  immutable campaign versions, freeze before funding, accepted ledger authoritative.
  Laboratory edits cannot mutate acceptance terms. HTTP has no payment routes.

## Disjoint builder scopes

1. Sol6.1-high evidence/decision builder: packages/v3/agents.mjs,
   tests/v3/agents.test.mjs, docs/build/V3_DECISIONS.md only. Reuse V2 export and
   transport without altering V2 or its hash-pinned modules.
2. Sol6.1-high payment builder: packages/v3/payments.mjs,
   backward-compatible packages/payments native changes, tests/v3/payments*,
   docs/build/V3_PAYMENTS.md. No live funding/signing; main runs operator commands.
3. Main: config, organic bridge, service, API/client, functional console, launcher,
   run orchestration, sanitized bundle, recording and frontend handoff.

## Executable gate order

Contracts -> parallel builders plus console/organic bridge -> fixture integration
-> sandbox compatibility/balances and zero/positive-close preflight -> freeze
-> two finalized deposits -> fresh paired decisions/organic answers -> disclosed
browser deliveries -> native cumulative authorization -> both closes/refunds
-> restart/replay checks -> credential-free bundle and four-minute recording
-> suite/browser acceptance -> one fresh Sol6.1-high review, one bounded recheck.

Each stage reports actual evidence, pending gates and exact blockers. Completion
requires two funded valid competing bids, three accepted placements and finalized
settlement of both channels. Model/network failures are retained, not rerun for
preferred outcomes. Sandbox is not Devnet/mainnet; replay is not fresh execution.
