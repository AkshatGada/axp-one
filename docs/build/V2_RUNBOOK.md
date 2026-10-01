# AXP V2 operator runbook

## Present without credentials or spending

From `/Users/akshat/agentic-dsp`, run `npm run demo:v2:replay` and open `http://127.0.0.1:8793/`. Node22.13+ is required. No database server, Docker, provider connection, key file or payment network is required. The saved bundle's hashes and receipt signatures are checked at startup. Previous/Next and browsing are read-only; every POST returns405. The old8792 advertiser simulation and V1 replay remain separate.

This presents the original `v2-wallet-acceptance` run, not new execution. Show ContextHint evidence, the approved fictional campaigns, cached/fallback retrieval, recorded actual model outputs, disclosed placements and synthetic accounting. V1’s actual MPP payment is a separate sandbox example with its original run identity and timestamps.

## What actually ran

Three campaigns were approved through the browser. Ten actual `jev-1.13.0` calls completed successfully. Two PocketKey history slots lacked aligned mobile-wallet evidence and were unavailable before invocation. Twelve slots were planned, not twelve successful model calls. No corrective batch was used.

ClearVault's history outputs won at4000 and3000 base units. Both Sponsored cards were actually inserted into the owned publisher DOM, inspected by the client and acknowledged. The signed receipts created two synthetic charges totaling7000. Cumulative simulated authorization reached4000 then7000; final simulated payout7000/refund13000. Losing campaigns had no charges and their20000 deposits were fully refunded synthetically. No token operations occurred.

The paired demonstration has four comparable complete pairs and two incomplete pairs. It does not prove targeting accuracy, conversion lift or the effect of history. One stochastic output per arm is not a controlled causal estimate.

## Inspect and reproduce checks

- `node scripts/demo/v2-evidence.mjs --verify-only` — verify offline source manifest and cached-vector coverage.
- `node scripts/demo/v2-preservation.mjs` — check old travel/dashboard/V1 artifact hashes.
- `node scripts/demo/v2-check.mjs` — check running replay; repeated reads and rejected mutations do not alter outcomes.
- `npm test` — isolated fixtures; opt-in upstream/provider tests remain skipped.

The original provider-disabled interactive state can be opened with `npm run demo:v2` instead of replay, on the same port. It recovers saved outcomes without calling a model. Do not run both launchers on8793 simultaneously. Live calls require the explicit server flag `AXP_V2_ENABLE_MODELS=1`; the completed frozen matrix cannot use spare allowance to repeat missing/uncertain slots. Do not delete its state or create another run to bypass the call ceiling.

## Presentation assets

`artifacts/v2/replay/` contains the sanitized run and manifest. `artifacts/v2/recording/` contains the four-minute captioned MP4, SRT, narration and browser-frame capture manifest. `artifacts/v2/frontend/states.json` and `docs/frontend/V2_HANDOFF.md` are the specialist's functional contract packet. Final visual design is not part of this slice.
