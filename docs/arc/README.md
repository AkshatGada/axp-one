# AXP · Arc Nanopayments

New work for **ETHGlobal Mumbai — Arc Studio Continuity Track: Bring Your Project
to Arc**. AXP connects advertisers to independent AI apps. This branch adds
Circle Gateway Nanopayments on Arc Testnet in the payment role served by Solana
channels, while retaining the existing Solana and Tempo implementations.

**[Studio project](https://studio.arc.io/app/0c07e997-5564-4b38-94f9-099ea3e95393)** ·
**[Architecture](ARCHITECTURE.md)** · **[Diagram SVG](architecture.svg)** · **[Studio source provenance](STUDIO.md)** ·
**[Submission checklist](SUBMISSION.md)** · **[Video script](VIDEO.md)**

The Studio URL opens for its owner; anonymous judge access still needs resolution.
The read-only companion at `tooling/arc-preview` is included in the existing
Vercel site build at `/arc/`. The human authorized pushing this feature branch
to generate its Git-connected Preview deployment; production is not promoted.

## What works

The existing dashboard creates and approves an Arc campaign. Launch funds a
Gateway balance using exact USDC approval and deposit transactions. The existing
chat/SDK requests an ad, the deterministic auction reserves the winning bid, and
the browser observes a separate **Sponsored** card below the independent answer.
Only its accepted signed receipt accrues a charge. The official Circle SDK signs
one exact EIP-3009 authorization per charge. An explicit payment action submits
those saved authorizations to Circle's facilitator. Reconciliation looks up the
original transfer nonce and verifies reported batch transactions through Arc RPC.

The advertiser and publisher views show funding, accepted charges, signed
amounts, Gateway-accepted payments, batch-finalized amounts and unused allocation
separately. Gateway acceptance is not an onchain transaction. This rail uses
exact per-payment authorizations, not cumulative Solana/Tempo vouchers. Unused
allocation remains in the payer's Gateway balance; no automatic refund or wallet
cash-out is claimed. See [execution evidence](VERIFICATION.md).

## Reproduce

Requires Node **22.18+**, npm and pnpm **10.18.3**. This run used Node 22.23.4.
From the repository root:

```sh
pnpm install --frozen-lockfile --ignore-scripts
npm ci --ignore-scripts --no-audit --no-fund --prefix tooling/arc-sdk
npm run arc:test
npm run verify:review
```

The review and test commands use fixtures and loopback HTTP. They do not load a
wallet, fund anything or call paid model providers. SDK-specific cryptographic
checks explicitly skip if the optional Arc tooling dependencies are absent.

Install and authenticate Studio when continuing the Studio work:

```sh
npm install -g @circle-fin/arc-studio-cli
arc-studio login
arc-studio agent-guide
```

The human completes the browser login. Codex does not need the Claude Code skill
installation. Continue the existing project with `--session axp-arc-mumbai` on the
machine where that CLI session exists, or `--app` with the app ID in [STUDIO.md](STUDIO.md).
Never share `.env`, wallet files or private database/payment payloads.

## Local demo

The prepared workspace on this machine is `local-state/arc/product`; its Arc keys
are in ignored `local-state/arc/secrets/arc-wallet.json`. Do not delete/reset it.
It holds the actual funded state and original payment identities.

```sh
npm run arc:demo
```

Open:

- Advertiser: `http://127.0.0.1:3440/advertiser-dashboard/`
- Publisher: `http://127.0.0.1:3440/publisher-demo/?network=arc-testnet`

Startup is read-only with respect to providers and payments. It does not fund a
campaign or resubmit a transfer. The local origin serves the existing AXP frontend
and backend. Solana signing is disabled only in this isolated harness. Normal
shared-product configuration and all existing funded identities are untouched.

The harness explicitly uses fixture buying judgments and a prepared independent
answer. These are labelled in the UI. Auction, DOM insertion, Ed25519 receipt,
accounting, EIP-3009 authorization and Arc/Gateway operations are real. No new paid
Jev or DeepSeek calls are made. The original actual-provider implementation stays
available in normal product configuration.

### Only for a fresh, separately authorized test workspace

```sh
npm run arc:wallet
# Human: obtain Arc Testnet USDC for the printed PUBLIC payer address at faucet.circle.com
npm run arc:prepare
npm run arc:demo
```

`arc:wallet` refuses to overwrite the ignored wallet. `arc:prepare` creates one
fictional StackPilot campaign and funds **0.02 test USDC** to Gateway. It reuses an
existing campaign instead of creating another deposit. An unknown send blocks
expansion and must be reconciled; never delete state to retry.

The implementation caps development at two allocations / 0.04 test USDC deposits,
0.016 aggregate accepted obligations and 1 test USDC native fees. A campaign
payout does not replenish its spending limit. This does not authorize another
run on a new machine, mainnet or real funds.

## Demonstrate

1. Open the advertiser dashboard and its StackPilot Arc campaign. Inspect the
   funded Gateway deposit and separate campaign spending cap.
2. Open the publisher URL above. Choose **Explore developer tools** and send.
   Show the independent fixture answer and separate Sponsored card.
3. Open **View internals → Payment**. Observe one accepted delivery and exact
   signed authorization. The same receipt cannot charge twice.
4. Click **Send nanopayments** once. It submits saved signatures to Circle. Show
   **Gateway accepted · batch pending**, with no invented Explorer link.
5. Click **Check batch settlement**. Once Circle reports `completed` and the Arc
   RPC check passes, show the actual batch transaction link. Circle determines
   the batch schedule; do not claim pending payments are finalized.
6. Show the same spending/earnings record in the advertiser dashboard, then show
   Studio's generated protocol, reference backend and evidence preview.
7. End the campaign only at the end of the final take. It stops new placements
   and submits remaining authorizations; unused funds stay in Gateway.

Two actual 0.002 test-USDC deliveries have completed Gateway batch settlement in the
prepared campaign. Its original 0.008 campaign cap leaves 0.004 for two further
recording deliveries. Once the cap is exhausted, demonstrate saved records. Do
not add deposits or reset the funded workspace for a retake.

## Verify preserved evidence

```sh
node scripts/arc/verify-evidence.mjs artifacts/arc/batch-finalized.json
```

This command performs read-only Arc RPC/Gateway requests. It checks exact
funding calldata/amounts, native receipts/fees, transfer IDs/parties/amounts and
any completed batch receipt. It never reads a private wallet or signs/sends.
[Verification notes](VERIFICATION.md) separate fixture, Studio and actual network
results. `export-evidence.mjs` reads the private SQLite database using an explicit
public allowlist; it never exports EIP-3009 signatures, nonces or private keys.

The local SDK source on this branch accepts `settlementNetwork: 'arc-testnet'`.
The published npm SDK 0.2.1 predates Arc; no npm release is claimed. See the
[SDK guide](../../packages/publisher-sdk/README.md).

Normal local product configuration can opt in with `AXP_PRODUCT_ARC_ENABLED=1`,
`AXP_PRODUCT_ARC_SIGN=1` and `AXP_ARC_WALLET_PATH`, alongside existing devnet
configuration. The isolated harness above does not read `.env.local`. Hosted Arc
signing activation, production deployment and submission require separate approval.
Branch publication and its Vercel Git preview were authorized after the local
implementation was completed.

## Read-only evidence preview for later hosting

```sh
npm ci --ignore-scripts --no-audit --no-fund --prefix tooling/arc-preview
npm run build --prefix tooling/arc-preview
npm run dev --prefix tooling/arc-preview
```

This selected, reviewed Studio frontend displays the recorded run and optional
public Gateway status checks. It has no wallet, signer, backend or fund-moving
routes. The root site build installs its locked dependencies, builds with
`--base=/arc/` and copies only `dist` into the static output. No Arc keys or local
workspace are uploaded. A separate standalone Vercel project is also possible
using only `tooling/arc-preview`, but was not connected. See [provenance and
sharing limits](STUDIO.md).
