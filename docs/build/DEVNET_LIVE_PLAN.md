# V3 fully live run on Solana Devnet: feasibility and plan

Status 2026-10-02: **rehearsal executed end to end** (`v3-devnet-live-rehearsal-20261002`,
see `artifacts/v3-devnet-live-rehearsal/RESULT.md`). Operator:
`scripts/demo/v3-devnet-live.mjs`. Owner decisions applied: Devnet signing
granted; organic answers via DeepSeek `deepseek-flash`; Jev mode-label quirk kept
(below). Recorded run `v3-wallet-acceptance` and `artifacts/v3/**` untouched.

## (a) Pipeline on Devnet: config/code

Changes (committed, tests green):

- `packages/v3/service.mjs`: `financialMode` option (`sandbox` default |
  `devnet`). Guided turns, exchange/session/channel mode, receipts and charges
  carry the run's mode; frozen policy = `v3RunPolicy(mode)`; devnet limitations.
- `packages/v3/payments.mjs`: `paymentEvidenceV3(store,{runId,mode})`; Devnet
  explorer link for settlement.
- `packages/v3/bundle.mjs`: replay bundle accepts `financialMode` sandbox|devnet
  (manifest + run). Integrity checks always throw; demo "story" gates
  (competition, exactly 3 placements, multiple increments, mobile no-fill) still
  throw for sandbox, but for devnet are reported in `manifest.storyGates.failed`.
  Recorded bundle re-validates with the same hash `e34448fa…`.
- `apps/backend/v3.mjs` + `apps/v3-ui/app.mjs`: console server/UI take the run's
  mode (bootstrap exposes `financialMode`; render posts it; labels say Devnet).
- `packages/v3/organic.mjs`: optional completion `engine` (`codex-cli-exec`),
  default unchanged (recorded hashes identical).
- `packages/dsp/codex.mjs`: returns the Codex `threadId` (used as agentId).
- `packages/payments/sdk-transport.mjs`: per-network treasury (already committed).
- `packages/v3/devnet-live.mjs`: pure helpers (terms, ledger mapping, caps).

Operator: `AXP_V3_LIVE_RUN=v3-devnet-live-<label>`, optional
`AXP_V3_LIVE_ARTIFACTS=artifacts/<dir>`; commands `init`, `fund`, `freeze`,
`open`, `organic`, `run`, `serve` (browser delivery), `deliver` (headless
fallback), `authorize`, `close`, `reconcile`, `verify`, `restart`, `export`.

Mapping to payments (same as `v3-devnet-settlement.mjs`, but ledger = the live
exchange): freeze campaigns → Devnet terms per channel (`zeroChargeClose:true`)
→ open both channels BEFORE auctions (bids need finalized deposits) → after each
accepted receipt `authorize <channel>` → `drainNetworkChannel` + `close`.
Payment state lives in `<run>/acceptance/payments.sqlite` so the service sees
deposits.

Label quirk (owner decision: keep): `packages/v3/agents.mjs` writes
`request.mode = POLICY.financialMode` (`'sandbox'`) into each Jev slot record.
Mode is not sent to Jev. The network label comes from the run: manifest/state
`financialMode: 'devnet'`, frozen policy, receipts and charges. Not fixed because
editing `agents.mjs`/`config.mjs` changes the harness implementation hash and
the recorded run's local-state console/restart/export would refuse to reopen.

## (b) Organic answers

**Owner decision: DeepSeek `deepseek-flash`** (key `DEEPSEEK_API_KEY` in
`.env.local`, location only). Provider `packages/v3/organic-providers.mjs`:
OpenAI-compatible chat completions at https://api.deepseek.com, model pinned to
`deepseek-flash` (pro rejected), temperature 0.2, 8000 max tokens, one user
message = the sponsor-free `organicPrompt`, no tools, JSON mode off (it padded to
the token limit), provenance engine `deepseek-flash-api`, execution
`actual-api-model`. The run's organic engine is frozen into its policy. Bound:
<=4 attempts per scenario, <=10 per run, failures logged. The Codex paths below
stay available (`init codex-cli-exec`).

Earlier finding (Codex):

Recorded: isolated gpt-6.1-sol (low) Codex app subagents, operator-recorded via
`organic.complete`. Now: the same model/effort is available on this Mac via the
Codex CLI bundled in ChatGPT.app
(`/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex`, 0.159.2;
the Homebrew `codex` wrapper is broken: missing native binary). Auth: ChatGPT
login in `~/.codex/auth.json` (location only). `~/.codex/models_cache.json`
lists `gpt-6.1-sol`. One smoke call through `runCodexJSON`
(ephemeral, read-only sandbox, user config ignored, web disabled, tool events
rejected) succeeded: model gpt-6.1-sol, effort low, 13408 input / 15 output
tokens, ~10 s, thread id returned. Same model, different bridge: label it
`codex-cli-exec` (provenance `execution:'actual-cli-agent'`). No substitution
needed. Owner decision 2 (minor): accept CLI-exec bridge vs app subagent.

## (c) Jev

`createJevHttpTransport`, model **jev-1.13.0**, key `TYPESAFE_API_KEY` in
`.env.local` (present; value never printed). Budget per run (POLICY): 24 calls
max (paired 12, repeat 3, laboratory 6, correction 3); a normal run uses
**15** (cached 6, offline 6, repeat 3, mobile 0). No Jev call was made today.

## (d) Publisher render + receipt

Receipts are signed server-side (`session.acknowledge`) with the run's own
`publisher-receipt.pem` after the owned-app page inserts the card and checks the
`Sponsored` label. Two ways: (1) preferred: start the console for the live run
dir and click "Display disclosed card and accept delivery" in a real browser
(Browser pane / Chrome; headless Chrome via the same page works); (2) fallback:
operator headless acknowledgement via `service.acknowledge` with
`domInserted/sponsoredLabelPresent/creativeHash`, labelled as headless (not a DOM
render). Awards expire 30 min after the opportunity.

## (e) Wallets / funding

Two payers are easy: native transport reads one wallet file per channel
(`sponsor` = that advertiser's payer, shared `publisher`). Fresh keys in
`local-state/v3-devnet-live/<run>/secrets/` (0600, gitignored). One funding tx
from existing disposable Devnet wallet `D7Gz…` (≈18.95 Devnet USDC left):
0.03 test SOL + ATA + 0.020 USDC per payer. Per run ≈ 5 Devnet txs (fund, 2
opens, 2 closes); fees+rent ≈ 0.01 test SOL; well below the 20M-lamport cap.

## (f) Variability and frontend outputs

Jev is stochastic: ties, levels, bid/skip and winners may differ from the
recorded run (recorded: ClearVault won cached+offline on ties, KeyForge won
repeat; 3 charges 4000/3000/3000). Possible live outcomes: fewer than 3
placements, a channel with zero charges (zero-spend close is supported),
no competition. These are reported as `storyGates`, never forced or retried to
fish for a winner. Mobile stays deterministic no-fill (0 calls).

Frontend gets the same schema as `artifacts/v3/replay/`: `replay/run.json` +
`manifest.json` (`financialMode:'devnet'`, `storyGates`), plus
`chain-check.json` (same shape as V3, Devnet explorer URLs), `restart.json`,
`organic/<scenario>.json`, `devnet-feasibility.json`. Apps switch runs by
replay directory; `createV3Server({replayDirectory})` already loads either.

## (g) Day-of runbook (≈ 60–75 min)

1. (5 min) `npm test`; set `AXP_V3_LIVE_RUN=v3-devnet-live-<date>`,
   `AXP_V3_LIVE_ARTIFACTS=artifacts/<run>`; init wallets.
2. (3 min) Fund (1 tx), wait finalized.
3. (3 min) Approve 3 campaigns, freeze; freeze Devnet terms.
4. (3 min) Open ClearVault and KeyForge channels (2 txs).
5. (5 min) Organic answers ×4 via Codex CLI (≈10–40 s each).
6. (10 min) `run cached`, `run offline` (6 Jev calls each); render/accept each
   award in the console; authorize the winning channel after each receipt.
7. (5 min) `run repeat` (3 calls), render/accept, authorize; `run mobile` (0).
8. (5 min) Drain + close both channels (2 txs), wait finalized.
9. (10 min) Verify chain, restart check (0 new calls/charges), export bundle,
   `npm test`, commit artifacts. Buffer 15–20 min for RPC/model latency.
Voucher terms expire 2 h after freeze: finish steps 3–8 within that window.

## Rehearsal lessons (2026-10-02)

- Public RPC 429s: one open's first broadcast never landed and one close's
  in-process lookup errored. Recovery was identity-preserving (same signed wire
  rebroadcast before expiry; lookup-only reconcile). `sdk-transport.mjs` now
  retries HTTP 429 with the identical request body.
- DeepSeek flash spends substantial hidden reasoning tokens (up to ~2.8k for
  the mobile question); JSON mode plus low max tokens truncated 4 attempts.
  Keep JSON mode off and 8000 max tokens.
- Delivery through the real console page (Browser pane) works; reload the
  page (new query string) after each `run` before clicking.
