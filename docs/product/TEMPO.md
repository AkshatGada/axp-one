# Tempo settlement operator guide

AXP supports a second settlement rail alongside the existing Solana payment
channels. A campaign selects its rail before approval and funding. ContextHint,
Jev, the auction and accepted-delivery accounting stay shared; payment keys and
channel state remain specific to the selected network.

The isolated 11 October acceptance run is complete: funding, cumulative vouchers,
payout while open, continued delivery, final refund and a fresh Solana regression
passed independent readback. See [the results and evidence](TEMPO_VERIFICATION.md).
The procedure below describes operation; it does not authorize another funded run.

## Network and protocol

| Setting | Value |
| --- | --- |
| Network selector | `tempo-testnet` |
| Chain | Tempo Moderato Testnet, chain ID `42431` |
| Public RPC | `https://rpc.moderato.tempo.xyz` |
| Explorer | `https://explore.testnet.tempo.xyz` |
| Test payment token | PathUSD, 6 decimals |
| Token address | `0x20c0000000000000000000000000000000000000` |
| Sessions v2 escrow | `0x4d50500000000000000000000000000000000000` |
| Pinned dependencies | `mppx` `0.13.4`, `viem` `2.57.4` |

The adapter uses the canonical TIP-1034 Sessions v2 precompile. A funded channel
accepts cumulative off-chain vouchers and permits on-chain payouts while it stays
open. Final closure pays any outstanding earned amount and returns the unused
collateral. AXP does not deploy a replacement escrow or bridge existing funds.

Use the low-level session/channel primitives after AXP accepts a delivery. Do not
wrap chat or opportunity routes with default MPP paid HTTP middleware: HTTP
request admission is earlier than AXP's billable accepted insertion receipt.
See the [Sessions implementation](https://github.com/wevm/mppx/blob/main/src/tempo/session/README.md)
and [protocol specification](https://paymentauth.org/draft-tempo-session-00.html).

Preflight must confirm the chain, token decimals, canonical escrow behavior,
typed-data domain and operation simulation before signing. Never substitute
mainnet, a different token or a legacy session contract after a failed check.
Tempo sessions have no intrinsic voucher expiry; the existing Solana voucher
expiry rules are not transferred to Tempo.

## Configure an isolated local or Preview workspace

Native financial execution remains `AXP_PRODUCT_FINANCIAL_MODE=devnet` for both
rails. `settlementNetwork` identifies the individual campaign's chain. Preserve
the existing Solana wallet, publisher receipt identity and encrypted state key.
Use a separate verification workspace when running lifecycle acceptance.

| Variable | Purpose |
| --- | --- |
| `AXP_PRODUCT_TEMPO_ENABLED=1` | Enable Tempo alongside Solana |
| `AXP_PRODUCT_TEMPO_SIGN=1` | Explicitly enable bounded testnet signing |
| `AXP_PRODUCT_TEMPO_WALLET_PATH` | Local ignored wallet JSON path |
| `AXP_PRODUCT_TEMPO_WALLET` | Hosted base64 wallet JSON, server-only secret |
| `AXP_TEMPO_RPC_URL` | Optional Moderato RPC override |
| `AXP_PRODUCT_STATE_DIR` | Local workspace directory; use isolated verification state |
| `AXP_PRODUCT_WORKSPACE_ID` | Stable hosted workspace identity |

The Tempo wallet has distinct sponsor and publisher accounts:

```json
{
  "network": "tempo-testnet",
  "sponsor": {"address": "<payer address>", "privateKey": "<server-only key>"},
  "publisher": {"address": "<payee address>", "privateKey": "<server-only key>"}
}
```

Store the local file in ignored secrets with mode `0600`. Keys stay outside
financial snapshots and browser bundles. The payer funds the channel and signs
vouchers; the publisher receives payouts and signs payout/close transactions.
Both accounts require the configured testnet fee asset for their operations.
Test tokens and transaction fees are accounted for separately.

For hosted verification, configure these secrets in **Preview only** and use a
dedicated verification workspace. Reuse its state encryption key across Preview
restarts. Do not change Production variables, the existing live workspace or
funded Solana identities as part of this branch's verification.

The Tempo SQLite state is included in the existing encrypted financial snapshot.
The shared financial lease and durable checkpoints fence mutations across Vercel
cold starts. Keys are materialized privately for the invocation and removed with
scratch state. There is no in-memory timer or automatic background payout watcher.

## Run the product lifecycle

1. Open the advertiser dashboard. Create the offer, hints and approved Sponsored
   creative. In **Spend**, choose **Tempo Testnet · test PathUSD** and set bid,
   campaign cap and deposit. Review the rail and values, approve and launch.
2. Wait for the channel opening to finalize. The shared server-held sponsor funds
   this demo campaign; it is not an independent advertiser wallet connection.
   Approval binds the rail. A funded campaign cannot switch networks.
3. Open the publisher chat. Under **Chat settings**, select Tempo; switching rails
   starts a fresh session. Only Tempo campaigns enter that auction, before Jev
   evaluates them. The dashboard's campaign link also selects its matching rail.
4. Submit a fresh question. The example answer comes from DeepSeek independently.
   An awarded card must render with Sponsored disclosure before its observation
   is accepted. One accepted receipt creates one charge and advances the channel's
   cumulative voucher. Reservations and losing bids are not charges.
5. Open **View internals → Payment**. Inspect Fund → Vouchers → Payout → Refund.
   Use **Pay out** when enabled. After finality, the publisher receives the newly
   earned delta and the campaign stays open. New accepted deliveries continue to
   advance the same channel's cumulative total.
6. Use **Close & refund** at the end. It drains outstanding delivery obligations,
   pays the remaining earned delta and returns unused collateral. New placements
   end. Expand the transaction record and open its Tempo testnet Explorer link.

Payout does not replenish the campaign cap. Never add cumulative voucher values
together as if each value were a new payment. Workspace totals keep PathUSD and
Solana test USDC separate; no cross-chain aggregate balance is shown.

## Explicit payment actions

All routes are beneath `/api/product`. Browser actions use the existing workspace
session and `x-axp-csrf` header; each payment POST body is `{}`. The publisher SDK
key does not grant campaign-management authority.

| Route | Behavior |
| --- | --- |
| `POST /campaigns/:id/launch` | Open the approved campaign's funded channel |
| `POST /campaigns/:id/authorize` | Process accepted ledger charges into cumulative authorization |
| `POST /campaigns/:id/payout` | Tempo-only payout while keeping the channel open |
| `POST /campaigns/:id/close` | Final closure and unused-deposit refund |
| `POST /campaigns/:id/settle` | Backward-compatible final-close semantics |
| `POST /campaigns/:id/reconcile` | Reconcile the saved payment operation |

UI capability flags (`canPayout`, `canClose`, `canSettle`, `canReconcile`) project
backend authority. The browser cannot choose a payment amount, token, escrow,
recipient or private signing key. Refreshing records is read-only.

## Unknown results and verification

Before broadcasting, persist the exact signed bytes, transaction hash and operation
intent. A lost acknowledgement or uncertain chain result blocks further spending
on that channel. Reconcile the saved hash and obligation; do not create a replacement
channel, fresh deposit, nonce or voucher increment merely to retry the HTTP request.
Nonce allocation is serialized for each signing account. Receipt retries reuse the
original award and charge identity.

For acceptance, use two isolated Tempo channels: a delivery channel and a
zero-delivery refund channel. On the first, obtain three real accepted deliveries,
confirm voucher advancement, pay out, then obtain three more accepted deliveries
on the still-open channel and close it. If an auction returns no fill or a provider
fails, retain that actual outcome. Close the second channel without deliveries and
verify its full deposit refund. Stay within the run's approved API/token/fee bounds.

Independently read finalized receipts, channel state and token balances. Check:

```text
deposit = total publisher payouts + final refund
```

Track transaction fees separately, including when their token is also PathUSD.
Verify repeated receipt acknowledgement, repeated payout, restart recovery and
same-hash reconciliation without an extra charge. A transaction hash, successful
fixture test or wallet balance alone is not finalized financial proof.

Keep sanitized hashes, public identities, amounts and verification results with
the acceptance artifacts. Never commit keys, signed voucher material or private
SQLite snapshots. Repeat the Solana lifecycle regression in isolated state before
merging. See [the SDK guide](SDK.md), [interface contract](TEMPO_INTERFACE.md) and
[hosting storage guide](HOSTING.md) for the shared integration boundaries.

## Bounded Preview packaging

`scripts/tempo/prepare-preview-verification.mjs` packages a **stopped**, isolated
verification workspace into a prebuilt Preview function. It requires the explicit
`--authorized=tempo-preview-phase4` flag, Preview configuration, the expected run
identity and the three predeclared campaigns. It encrypts both financial and
organic shards; wallets remain in server environment secrets. Do not run the local
writer after transferring ownership to Preview.

The operator wrapper is excluded from ordinary builds. It fixes the verification
namespace, freezes campaign creation/edits, preserves the original package marker
across cold starts and applies one durable provider budget across both shards.
`GET /api/product/verification` exists **only in that wrapper** and exposes
sanitized usage counters, limits and shard revisions. Reads do not trigger models,
signing or transfers. A changed package or missing committed state fails closed.
Do not copy this wrapper or its encrypted bootstrap artifact into production.
