# AXP Arc Nanopayments integration

Target: **Arc Studio Continuity Track: Bring Your Project to Arc**, ETHGlobal Mumbai.
Clean starting commit: `88c9bfbb9ce5d3b532e1a4bff2a276d4c1c1baa4` on `main`.
Branch: `feature/arc-integration`. The human authorized branch publication and the
existing Vercel Git Preview deployment after implementation. Mainnet, AXP production
promotion, submission and activation of a hosted Arc signer require separate approval.

## Product decision

Use **Circle Gateway Nanopayments**, via the official `@circle-fin/x402-batching`
SDK, in the payment role served by Solana channels. Add optional `arc-testnet`
routing to AXP's existing campaign → auction → Sponsored insertion → signed
receipt flow. Preserve Solana, Tempo, historical signed receipt bytes and
account-owned synthetic serving. Missing legacy rail values remain Solana.

An advertiser deposits test USDC into the Gateway Wallet on Arc. AXP allocates a
bounded portion of that balance to a campaign. The allocation is a local spending
cap, **not a separate onchain escrow/channel**. Each accepted signed insertion
receipt permits exactly one amount-bound EIP-3009 authorization to the publisher.
Circle's facilitator verifies and accepts it without per-payment gas; Gateway
later batches settlement onchain. The original cumulative Solana/Tempo voucher
protocol must not be applied to Gateway's exact per-payment authorizations.

Accepted delivery, signed authorization, Gateway acceptance, batch finality and
wallet withdrawal are separate facts. A Gateway transfer identifier is not an
EVM transaction hash. Stop uncertain sends and reconcile the original nonce;
never create a replacement authorization to retry an unknown outcome. Local
campaign completion does not replenish its budget. Unused allocations remain in
the payer's Gateway balance until explicitly withdrawn; do not label release as
a finalized refund transaction.

## Authority and implementation

The existing deterministic exchange selects integer bids and caps. Jev judges
fit; DeepSeek only writes the independent example answer. Models never sign or
choose transfer amounts. No new paid model calls are needed: an isolated demo
can use explicitly labelled fixture provider responses with real auction,
DOM-insertion acknowledgement, receipt signatures and Arc/Gateway operations.

Freeze payer, publisher, campaign version, chain, token and Gateway contract.
Keep signer files and private authorization payloads in ignored private state.
Use distinct disposable Arc payer/publisher identities; preserve existing keys
and funded state. Persist exact authorization/nonce before submission, and exact
native transaction bytes/hash before any funding broadcast. Read-only routes do
not call models or transfer funds. Use no automatic uncertain-send retries.

Development validation envelope: at most two isolated campaign allocations,
0.02 test USDC each, aggregate accepted publisher obligations <=0.016 test USDC;
new Gateway deposits <=0.04 test USDC, testnet gas <=1 test USDC. These ceilings
are not claimed executions. No mainnet or real funds.

## Arc Studio boundary

Studio project app ID: `0c07e997-5564-4b38-94f9-099ea3e95393`.
Thread ID: `0261dd3b-d6b0-4a63-b4c1-fa0b52538762`.
Workspace: https://studio.arc.io/app/0c07e997-5564-4b38-94f9-099ea3e95393
Session: `axp-arc-mumbai` (CLI 1.2.2).

Studio receives this public specification and selected interfaces only. Never
upload environment files, keys, SQLite, private payment payloads or the whole
repository. Studio authors a substantive nanopayments adapter/reference app and
tests. Review artifacts before applying. Confirm judge access separately from an
owner-authenticated workspace link. Record actual outputs and verification in
the evidence guide.

## Current official configuration

Verified from current official docs and SDK metadata on 7 November 2026:

| Item | Testnet value |
| --- | --- |
| Chain | Arc Testnet, 5042002, `eip155:5042002`, Gateway domain 26 |
| RPC | `https://rpc.testnet.arc.io` |
| USDC ERC-20 | `0x3600000000000000000000000000000000000000`, 6 decimals |
| Native USDC gas | 18 decimals; never mix with payment base units |
| Gateway Wallet | `0x0077777d7EBA4688BDeF3E311b846F25870A19B9` |
| Gateway Minter | `0x0022222ABE238Cc2C7Bb1f21003F0a260052475B` |
| SDK | `@circle-fin/x402-batching` 4.0.0 (isolated exact-pinned package) |
| EIP-712 domain | `GatewayWalletBatched`, version `1`; use SDK types unchanged |

Live chain ID, contract code, token decimals and supported facilitator network
must be checked before signing. The current Arc EVM guidance states a 20 Gwei
fee floor. Configure native transactions accordingly and cap fees. Preserve
unknown outcomes instead of silently increasing fee/nonce.

Sources:
- https://ethglobal.com/events/mumbai/prizes/arc
- https://ethglobal.com/rules
- https://developers.circle.com/gateway-nanopayments
- https://developers.circle.com/sdks/gateway-nanopayments-sdk
- https://developers.circle.com/gateway-nanopayments/concepts/batched-settlement
- https://developers.circle.com/gateway-nanopayments/howtos/x402-seller-reconciliation
- https://docs.arc.io/arc/references/contract-addresses
- https://docs.arc.io/arc/references/evm-differences

## Delivery and eligibility

Deliver working frontend/backend, Studio project judges can open, architecture
diagram, reproducible setup/demo, concise video script/recording checklist and
submission checklist with old/new code disclosure and repository link.
User must confirm approved Continuity registration and ownership, disclose the
pre-existing work to ETHGlobal, approve publication and perform submission.

Baseline `npm run verify:review` passed after locked workspace installation and
loopback permission. Initial sandbox-only execution failed solely on denied
loopback sockets; it was rerun with that capability. All baseline evidence is
fixture verification, not a new payment or model execution.
