# AXP V3 operator runbook

Work in `/Users/akshat/agentic-dsp`. The functional console is not final design.
V1/V2 are independent preserved examples. Never present their settlement as V3.

## Present the completed run (no spending)

The completed run has15 actual Jev responses,4 fresh isolated organic answers,
3 accepted deliveries and2 finalized native MPP channels. ClearVault payout0.007
/refund0.013; KeyForge payout0.003/refund0.017 testUSDC. Original network is
hosted Solana sandbox; presentation is recorded replay. Do not reopen channels,
reset admissions or rerun model/payment commands to present this saved evidence.

1. From this repository: `npm run demo:v3:replay`.
2. Open `http://127.0.0.1:8794`; use Previous/Next or the eight chapter links.
3. Follow `artifacts/v3/recording/narration.md`. The240-second captioned silent
   MP4 is `artifacts/v3/recording/axp-v3-four-minute-demo.mp4`; subtitles alongside.
4. No credentials, upstream service or extra spending. Every replay mutation
   is rejected405. Evidence hashes verified at launch.
5. Portable package: `artifacts/v3/offline-presentation/`, Node25+, run
   `npm run demo:v3:replay` without installing packages. If8794 is occupied,
   `AXP_V3_PORT=8795 npm run demo:v3:replay`. Stop this process withCtrl-C.

The first failed feasibility attempt remains saved. The separately approved
exact0.026 sandbox faucet exception funded the shortfall once; it is not ad
settlement. No automatic replenishment is approved. The commands below document
how the original acceptance was executed, not instructions to spend again.

## Local console and onboarding

1. `npm run demo:v3` starts only V3 on `127.0.0.1:8794`, models disabled.
2. Approve the three fictional campaigns in Advertiser; each save creates a
   version. Existing V3 approvals/freeze are preserved, not recreated on restart.
3. Evidence chain shows the cached vector query and uncached lexical fallback.
   It shows historical copy separately from campaign declarations.
4. `node scripts/demo/v3-operator.mjs freeze` freezes approved terms, questions,
   policy and evidence. Subsequent dashboard edits apply only to the laboratory.

## Organic answers

`node scripts/demo/v3-operator.mjs request cached` (or offline/repeat/mobile)
persists the exact `suppliedPrompt`, input hash and completion request.
Main spawns a fresh gpt-6.1-sol-low app agent **without history**, using that exact
prompt. No files, tools, ads, evidence, prices, bids or payment data are supplied.
Save its original JSON answer and actual agent ID in `artifacts/v3/organic/`.
`node scripts/demo/v3-operator.mjs complete artifacts/v3/organic/cached.json`
binds the response. It is an operator-recorded completion, not cryptographic
context proof. The prompt requests <=1600 characters; responses up to2000 are
retained verbatim with an explicit length-overrun flag, not silently truncated.
Four fresh answers have already been generated; two completion slots remain.

The `mobile` turn is deterministic no-fill and needs no model enablement or
funding: `node scripts/demo/v3-operator.mjs run mobile`. No replacement organic
answer is needed after restart.

## Original native payment acceptance procedure (already completed)

1. `node scripts/demo/v3-payment.mjs freeze` performs unsigned feasibility. Stop
   on any blocked result. Preserve the original attempt. No automatic retries,
   faucet calls, top-ups or network switches are implemented.
2. Only after a checked compatible environment, use terminal-only
   `AXP_V3_OPERATOR_SIGN=1 node scripts/demo/v3-payment.mjs open v3-clearvault-channel`
   and the same command for `v3-keyforge-channel`. Two channels, 20000 each; same
   disposable payer. Salts, signed transaction identities and fee allowances are
   saved before submission. Opening transactions are prepared at authorized open,
   not at freeze; native expiry is checked before signing. On unknown outcome use
   `reconcile`, not another open.
3. Restart **only** the V3 console with `AXP_V3_ENABLE_MODELS=1 npm run demo:v3`.
   Existing key is read server-side; never print it or paste it in the browser.
4. Run cached and offline guided turns in the console (or operator `run`). Each
   freezes six slots before calling Jev: own campaign × text-only/history.
   Only history decisions enter auctions. Failed/unavailable/uncertain slots
   remain recorded; no silent rules fallback or winner-seeking retry.
5. In Delivery, insert the disclosed card and accept the actual owned-app receipt.
   Authorize that winner using terminal-only
   `AXP_V3_OPERATOR_SIGN=1 node scripts/demo/v3-payment.mjs authorize <channelId>`.
   The worker reads exact immutable charges, not request-supplied money.
6. Run repeat as a distinct opportunity, accept its card, authorize its winning
   channel. Three paid deliveries maximum, frequency two per campaign/session.
   If competition or a third fill does not occur, record the missing gate.
7. Close both channels with
   `AXP_V3_OPERATOR_SIGN=1 node scripts/demo/v3-payment.mjs close <channelId>`.
   The command drains exchange reservations. A losing zero-spend channel uses
   native no-voucher seal/distribute. Closing creates no charge. Unknown outcomes
   use `node scripts/demo/v3-payment.mjs reconcile <channelId> close`.

Caps: 24 Jev attempts,6 organic completions,3 paid deliveries,4000 max bid,
8000 per advertiser,12000 aggregate charges,40000 deposit,20000000 aggregate
fees/new rent lamports. At least40 GiB free. No automatic replenishment,
replacement channels, mainnet, push or deployment.

## Packaging after actual acceptance

1. Run `node scripts/demo/v3-verify-chain.mjs`, separately retaining payout,
   token refund, fees and rent. Hosted sandbox explorer links are supplementary.
2. `node scripts/demo/v3-restart.mjs` verifies identical saved state and four
   completed-turn and original signed-receipt replays without enabling providers
   or payment transports.
3. `node scripts/demo/v3-export.mjs` creates only a complete hash-verified bundle.
   It fails instead of packaging unfinished/synthetic evidence as V3 settlement.
4. Stop only V3's interactive process and run `npm run demo:v3:replay`.
   No credentials, database, SDK, provider or RPC is required by replay.
5. Record actual browser navigation; captioned four-minute MP4 and subtitles
   belong under `artifacts/v3/recording/`. Do not record a claimed successful
   competing-payment story before acceptance. Preserve failed attempts too.

## Four-minute narration outline

- 0:00–0:35: AXP purpose; historical ContextHint observations, fictional campaigns.
- 0:35–1:15: Onboarding and actual source-linked prompt/creative/hint evidence.
- 1:15–2:10: Independent organic answer; paired model decisions; actual bids,
  genuine skips versus policy exclusion; unchanged results shown equally.
- 2:10–2:45: Disclosed cards, three owned-app receipts, immutable accepted charges.
- 2:45–3:35: Two channels; actual cumulative totals; final payout and unused refund;
  same payer, hosted sandbox, fees/rent separate.
- 3:35–4:00: Saved-outcome replay, mobile no-fill, limitations and product vision.

Final verification: `node scripts/demo/v3-replay-check.mjs` (no upstream calls),
`node scripts/demo/v3-preservation.mjs --check`, `npm test` and `git diff --check`.
Do not use Phase4/5 report flags that overwrite preserved reports. Packaging
only: `node scripts/demo/v3-package.mjs`; it never opens a service or wallet.

The frontend specialist receives `docs/frontend/V3_HANDOFF.md`, implemented
OpenAPI JSON, `packages/v3/client.mjs`/`client.d.mts`, and existing design tokens.
No second ledger, browser signing or invented API routes.
