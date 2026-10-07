# Network benchmark operator guide

The benchmark's methodology, approved ceilings and evidence are in
[BENCHMARK.md](../../BENCHMARK.md). A compact landing-page summary links local
fixture scale and actual Devnet proof; there is no separate benchmark page or
endpoint. The harness uses isolated product workers and does not widen deployed
product admission limits.

## Recorded verification status

All **125 funded channels are financially complete**, with **250 independently
verified finalized transactions**: 125 openings and 125 closes. The
[funded acceptance record](../../artifacts/network-scale/devnet-funded-acceptance.json)
and [verification](../../artifacts/network-scale/devnet-funded-verification.json)
record 824 accepted deliveries/off-chain cumulative vouchers, 6.25 test USDC
deposited, 1.236 paid and 5.014 refunded. The builder cryptographically verified
all 824 vouchers offline; the independent RPC verifier checked every opening
and close for finality/slots, program/mint binding, token deltas, fees and
conservation. Verification loaded no wallet, called no model, signed nothing
and broadcast no transaction. It used one configured RPC provider, not
independent-provider consensus.

The original load stage remains partial: 825 started publisher turns, 824 completed
answers, three original expired/unfunded signed openings and nine unknown-usage
provider attempts (eight Jev, one DeepSeek) still fully reserved. Neither the
128-advertiser nor the 1,024-turn target passed. Cleanup completion does not clear
those liabilities or authorize more paid execution.

The unchanged threshold subset of 26 channels has 676 off-chain voucher updates
and **52 verified finalized transactions**. It deposited 1.3 test USDC, paid 1.014
and refunded 0.286. Its [acceptance record](../../artifacts/network-scale/devnet-threshold-acceptance.json)
and [verification](../../artifacts/network-scale/devnet-threshold-verification.json)
remain subset proof included in the full funded totals.

End-run cleanup paid each channel's latest authorized cumulative obligation and
returned unused collateral. Five expired signed close attempts retain their
original identities and fee reservations, separate from finalized counts. Pinned
recovery versions v1–v5 preserve failed/unknown API rows and full liabilities;
two decoded Open/full-escrow observations from the same provider precede any
refresh of the same close obligation. Cleanup made no new deposit, charge, voucher or model call. The
sanitized proof and public operator sources retain this recovery provenance.
The benchmark workspace is separate from the live demo's three prepared channels.

The separate [million-update result](../../artifacts/network-scale/offline-million.json)
completed with 1,052,672 synthetic updates, 16,448 mock closes and four successful
workers. Raw latency verification reproduces 10.924833 ms p50 / 21.922792 ms p95;
whole-run throughput is 216.25586 local fixture updates/second. Persisted-state
verification covers every saved snapshot; cold replay samples 192 channels.
Provider/RPC calls, wallet access, signatures, native broadcasts and real payouts
are zero. These results do not enlarge the paid run's authorization or prove
production throughput.

The [public operator sources](../../artifacts/network-scale/operator/), including
the [full acceptance builder](../../artifacts/network-scale/operator/build-full-native-acceptance.mjs.txt)
and [read-only verifier](../../artifacts/network-scale/operator/verify-full-native-acceptance.mjs.txt),
are saved as `.mjs.txt` evidence, not a deployed execution surface. Original scripts use the
retained operator workspace layout and private RPC configuration. Full SQLite and
raw latency records stay local, bound by recorded hashes. Do not recreate a paid
run to verify the proof.

## Operator execution

The harness is not a public API. Importing or building it performs no execution.
Keep the wallet and configuration in ignored private state, mode 600. Never place
an RPC key, provider key, signed voucher or SQLite database in the public artifact.
The operator must explicitly authorize external effects before enabling them.

Configure `AXP_NETWORK_OPERATOR_AUTHORIZED=1`, `AXP_NETWORK_DEVNET_RPC_URL`,
`AXP_NETWORK_WALLET_PATH`, `JEV_API_KEY` and `DEEPSEEK_API_KEY` in a private env file.
Run from the repository with Node 22.18+; use an existing wallet, never a replacement
for unresolved funded channels. The trusted benchmark profile raises only isolated
worker admission caps and does not widen the hosted product's caps.

```sh
node scripts/network-scale/cli.mjs plan
node scripts/network-scale/cli.mjs preflight --env-file /private/path/network.env
node scripts/network-scale/cli.mjs open --advertisers 16 --enable-paid --env-file /private/path/network.env
node scripts/network-scale/cli.mjs run --turns 16 --concurrency 1 --enable-paid --env-file /private/path/network.env
```

The run phase serves a loopback browser control. Start execution through its visible
button; wait for all in-flight operations before stopping the server. Verify each
smoke stage before increasing cumulative funded advertisers to 64 and then 128.
The deposit stages are cumulative, not additional deposits of 16 + 64 + 128.

`drain` releases undelivered reservations and pauses channels. `settle` reconciles
all channel identities before closure, including interrupted launches. An uncertain
transaction is looked up by its saved signature. Never create another deposit to
repair it or refresh a signed transaction while its outcome is unknown. An
operator-proven expired close may be refreshed only under the separately reviewed,
pinned recovery policy for the same obligation, retaining the original identity
and reservations plus two decoded Open/full-escrow observations from the same
provider. Resolve any pending state before declaring the run settled. `replay` checks the saved identities without new calls or charges.

Export with `node scripts/network-scale/cli.mjs export`; the sanitized default is
`artifacts/network-scale/run.json`. Keep this recorded proof in the repository,
with the run source commit and profile hash. Review measurements, finality,
accounting and partial/complete status before updating BENCHMARK.md or committing
the artifact. Never copy private execution state into the proof directory.

The completed million-update local ledger experiment is a separate synthetic
workload. Its compact result, raw latency hash/percentile verification, persisted
snapshot verification, specimen and sampled cold replay are in
`artifacts/network-scale/offline-million*.json`. Never add these fixture counts to
actual provider or Devnet totals. Closure thresholds are external experiment
policy; no automatic production threshold watcher is implemented.
