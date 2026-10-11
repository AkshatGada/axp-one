# Tempo implementation contract

Branch: `codex/tempo-settlement`, based on main after PR #2. Existing native
execution remains `financialMode: devnet`; `settlementNetwork` independently
identifies `solana-devnet` or `tempo-testnet`. Missing native network means Solana.
Synthetic behavior and signed publisher receipt v1 stay compatible.

## Shared worker interface

The product facade routes `freeze(campaign)`, `open(channelId)`, `drain(channelId)`,
`authorize(channelId)`, `close(channelId)`, `reconcile(channelId)`,
`projection(channelId)`, `evidence(channelId)`, `sync(channelId)` and `dispose()`.
Tempo additionally provides `payout(channelId)`; calling it on Solana is rejected.
`status()` returns a Solana-compatible top level plus `networks`, keyed by network.
`identities` remains the Solana pair for old callers; `identitiesFor(network)`
returns the corresponding server-owned payer/payee pair.

Tempo factory: `createTempoProductPayments({exchange,stateDir,walletPath,
signingEnabled,identities,transportFactory,checkpoint,now,lock,...})` from
`packages/product/tempo-payments.mjs`. Disabled Tempo must not prevent Solana startup.
It owns `tempo-payments.sqlite`; keys live outside snapshots in ignored secrets.

## Financial evidence

Keep existing Solana evidence keys. Both rails expose `mode`, `network`,
`channelId`, `protocolChannelId`, `payer`, `payee`, `phase`, `openStatus`,
`closeStatus`, `depositBaseUnits`, `confirmedDepositBaseUnits`,
`acceptedBaseUnits`, `authorizedBaseUnits`, `settledBaseUnits`, `refundBaseUnits`,
`reconciliationRequired`, `canReconcile`, `canRetryOpen`, `canSettle`,
`canPayout`, `canClose`, `transactions`, `vouchers`, and token metadata
`tokenSymbol`, `decimals`, plus `token` and `chainId` for Tempo.
Base-unit values are canonical decimal strings. `canSettle` keeps its legacy
close meaning. Tempo payouts keep phase open and do not replenish spend capacity.
Transactions have operation `open|payout|close`, status, `transactionHash` for
Tempo (`signature` for Solana), verified `explorerURL`, finality, block number,
fee asset/amount and token deltas when known. Pending is never successful evidence.
Vouchers expose chargeId, status, sequence, incrementBaseUnits,
cumulativeAmountBaseUnits and payloadHash, never private signatures.

## API and SDK

Campaign drafts and opportunities accept optional `settlementNetwork`. Default
is Solana for native legacy callers. Network is approved/frozen with campaign.
Publisher settlement routes use a new table; original publisher record is retained.
Opportunities filter mismatched rails before model calls. Awards bind the channel's
network/token/payee. API adds `/campaigns/:id/payout` and `/campaigns/:id/close`;
existing `/settle` keeps final close semantics. All actions require existing
authentication/CSRF and an empty JSON object.
Bootstrap payment status includes `networks`; state includes
`summary.bySettlementNetwork`. Legacy numeric summaries represent Solana only
in a mixed native workspace. SDK adds optional opportunity network and centralized
chain-aware financial evidence helpers. No changes to receipt v1 signed bytes.

## Ownership and configuration

Lead owns this file, settlement-networks.mjs, publisher SDK, build packaging,
integration evidence, docs and branch/PR. Backend owns exchange/contracts,
product service/API/facade/hosted and backend tests. Adapter owns new Tempo
payment/transport/store/loader modules, tooling/tempo-sdk and adapter tests.
UI owns apps/product-ui components and UI tests; consume this contract, never sign.

Tempo configuration: `AXP_PRODUCT_TEMPO_ENABLED=1`,
`AXP_PRODUCT_TEMPO_SIGN=1`, `AXP_PRODUCT_TEMPO_WALLET_PATH` locally or
`AXP_PRODUCT_TEMPO_WALLET` base64 JSON in Preview; optional `AXP_TEMPO_RPC_URL`.
Wallet JSON: `{network:"tempo-testnet",sponsor:{address,privateKey},
publisher:{address,privateKey}}`, mode 0600. Payer authorizes vouchers; publisher
receives payouts and signs close/settle transactions. Do not print keys.
Hosted dependencies use a separate exact-pinned tooling/tempo-sdk installation,
flattened into local-state/tempo-sdk in the function. No mainnet or new escrow.

## Verified Phase 1 observations

Published mppx 0.13.4 and viem 2.57.4 installed in isolated feasibility directory.
RPC returned chain 42431. Published Session.Precompile.Chain.getChannelState on
canonical escrow 0x4d50500000000000000000000000000000000000 succeeded for zero ID.
Token 0x20c0000000000000000000000000000000000000 reported PathUSD. Token decimals,
typed-data domain and simulations must also pass before any signed transaction.
Baseline: 488 tests, 477 pass, 11 skip, 0 fail; both existing UI typechecks pass.
