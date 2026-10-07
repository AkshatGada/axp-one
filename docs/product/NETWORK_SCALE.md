# Measured network run

The read-only surface is https://axp.one/network/. It shows exported records of
an actual execution, or a clearly empty state until that execution is available.
Replay does not call Jev, DeepSeek or Solana. Targets are never measured results.

## Method

One local coordinator operates 16 isolated ProductService workers, each with eight
fictional hardware-wallet advertisers and up to 64 distinct publisher questions.
The workers reuse the product eligibility, retrieval, Jev inference, deterministic
first-price auction, accepted-charge ledger and native Solana channel implementation.
This measures the bounded coordinator and local workers; it does not measure the
single hosted demo workspace or establish production fleet capacity.

DeepSeek creates the example app's independent answer for each admitted fresh turn.
It receives no advertiser material. Jev evaluates buying fit using advertiser hints
and screened ContextHint evidence. Retrieval method and provider execution are
recorded; lexical fallback is not described as fresh embedding inference.

The private browser driver inserts the actual approved card with the publisher SDK
and observes connected DOM insertion, exact copy, destination and Sponsored label.
It forwards that observation before a charge is accepted. An insertion receipt is
distinct from human attention or conversion. Stable identities prevent replay from
creating another provider attempt or charge.

Each campaign's channel is funded on Devnet. Accepted charges advance cumulative
signed vouchers off-chain. Finalized close transactions establish publisher payout
and unused collateral refund. Deposits, accepted charges, authorized totals and
settlements remain separate in the exported accounting.

## Approved limits

| Boundary | Maximum |
|---|---:|
| Funded fictional advertisers | 128 |
| Fresh publisher turns | 1,024 |
| Jev evaluations | 8,192 |
| API spend | $3 total: $1 Jev, $2 DeepSeek |
| New deposits | 6.4 test USDC |
| Accepted delivery charges | 2.048 test USDC |
| SOL fee/rent reservation | 1.6 Devnet SOL |
| Publisher concurrency ramp | 1, 4, 8, 16 |

A private SQLite journal reserves API liability before sending a request. Unknown
usage retains the conservative reservation. Exported DeepSeek usage costs use
peak cache-miss rates as a conservative upper bound, rather than verified billing.
Native admissions, estimated fees and
accepted-charge liability also have global durable limits. One exclusive coordinator
and serial native queue use the existing demo wallet, with separate channel state.
Production demo caps and funded presentation channels remain unchanged.

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
transaction is looked up by its saved signature; it is never repaired with another
deposit or replacement transaction. Resolve any pending state before declaring the
run settled. `replay` checks the saved identities without new calls or charges.

Export with `node scripts/network-scale/cli.mjs export`; the sanitized default is
`artifacts/network-scale/run.json`. Copy it to
`apps/marketing/src/data/network-scale.json` before `npm run build:site`.
Review measurements, finality, accounting and partial/complete status before
publishing. The public page has no wallet, provider credentials or signing controls.
