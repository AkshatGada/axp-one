# Isolated AXP × HSK/HSP integration

This branch adds direct HSP payments to the existing product flow. It is separate
from account finance, Solana/Tempo escrow channels and axp.one production.
**Live acceptance has not run.** See [status](../../artifacts/hsp/STATUS.json).
The official [guide](https://dorahacks.io/hackathon/hskchainindia/agentic-payment-guide)
requires allowlisting before connecting. The [rules](https://dorahacks.io/hackathon/hskchainindia/detail)
require mainnet deployment; organizer confirmation of QA payments plus a mainnet
registry remains outstanding. Their deadline sections disagree; use the earlier
1 November 2026, 21:30 IST deadline until clarified.

## Isolation and installation

Work only on `codex/hsk-hsp-settlement` in its own worktree, based on `98a50b1`.
Never import a funded workspace, production environment file, wallet or publisher
identity. No account migration, production deployment, branch merge or npm release
is needed. Node.js 22.18+ and locked workspace dependencies are required:

```sh
pnpm install --frozen-lockfile --ignore-scripts
npm run verify:review
npm run test:hsp
node scripts/hsp/fixture-journey.mjs # terminal-only, fresh isolated fixtures
```

HSP tooling is a workspace package: exact-pinned official MCP client 2.4.0,
viem 2.57.4, solc 0.8.28 and Ganache 7.9.2. Ganache runs only an in-process test
chain. Native binding warnings use its JavaScript fallback; they do not signify
public-chain execution. No keys or network funds are required for tests.

## Run the fixture demonstration

```sh
npm run dev:hsp -- --fixtures
# http://127.0.0.1:3440/advertiser-dashboard/
# Fixture operator password: fixture-demo-password
```

The dashboard and example chat reuse the existing UI. Create a workspace, select
an example campaign, review its Sponsored text/limits, then launch. Open the chat,
ask a matching question, inspect the accepted delivery and open Payment. Confirm
the team, recipient and fixture payer; prepare, simulate signing, separately approve
submission, and query the same payment. The banner labels all fixture activity.
No real wallet signature or network proof is generated. The synthetic transaction
hash is never linked as chain evidence.

Live state uses `local-state/hsk-hsp/qa`; fixtures use `fixture`. Receipt signing
identities are independent of existing workspaces. The server uses a process lock,
SQLite WAL and durable admissions. It binds only 127.0.0.1, validates Host/Origin,
uses an HttpOnly operator session and CSRF, and exposes no account endpoints.
GETs read saved state. Only explicit operations contact HSP. Do not expose this
local service through a public tunnel.

## QA access and schema review

1. Submit the organizer's [QA access form](https://docs.google.com/forms/d/e/1FAIpQLScPgTst1_F8mBFrIo1M3tuXkkVODpVyrfc3i-KsXovHFt7Vcg/viewform)
   with the team name, contact email, actual outbound IP and connection environment.
   The user submits it; wait for organizer confirmation. Do not retry a blocked
   endpoint. If the outbound IP changes, request an update.
2. After confirmation, run `AXP_HSP_QA_ALLOWLIST_CONFIRMED=1 npm run hsp:discover`.
   This performs only MCP initialization, complete tool listing and get_chain_config.
3. Privately review the captured schemas and create
   `local-state/hsk-hsp/profile-input.json`. Do not mark guessed mappings reviewed.
4. Run `node scripts/hsp/review-profile.mjs`. It pins schema/configuration hashes.
   At each live startup the actual tool fingerprint and configuration must match.

There is deliberately **no committed pretend live profile**. These eight tools
must exist: get_chain_config, create_order, get_order, prepare_payment,
finalize_payment, estimate_fee, submit_payment and query_payment. Missing tools,
changed schemas/configuration or unsupported quote semantics block execution.
The official MCP SDK validates actual tool inputs/outputs; templates only map the
reviewed schema. HSP generates payment payloads and JWTs.

A reviewed profile contains `reviewed: true`, `config`, and `operations` keyed by
the seven payment tools. Config fields are network=`hsk-testnet`, chainId=133,
decimals=6, token, protocol (`eip3009` or `permit2`), merchantName, payer, payee,
networkValue and coin. Permit2 also requires its verifying contract and trusted
spender. Take network/token/protocol values from the live chain configuration.
Payer and recipient must be different, separately confirmed addresses.

Each operation has an `input` JSON template and `output` mapping from normalized
field names to dot paths in the actual response. Prefix a path with `?` only for a genuinely optional response field, such as status_reason. Template strings beginning `$`
reference saved `terms`, `row`, `quote`, `signature`, `mandate`, `amountUsd`, `order`
or `fee`. Returned values retain their JSON types. Do not include auth credentials.
Required normalized results are:

| Tool | Required result fields |
| --- | --- |
| create_order | flow_id, payment_request_id |
| get_order | flow_id, payment_request_id, merchant_name, pay_to, amountUsd |
| estimate_fee | Actual documented fee result; exposed to prepare template as fee |
| prepare_payment | chainId, token, protocol, payer, pay_to, payment_request_id, merchantAmountUsd, token_total_raw, principalRaw, feeRaw, quote_expires_at, cart_hash, payment_payload, payment_mandate_contents, eip712 |
| finalize_payment | payment_mandate_json, unchanged |
| submit_payment | status |
| query_payment | status, attribution_verified, flow_id, payment_request_id, merchant_name, payer_address, to_pay_address, chainId, token, tx_signature; status_reason when available |

This version requires exact six-decimal USD-stablecoin principal correspondence.
If the real Gateway's authorization recipient, fee split, price conversion or
schema cannot satisfy these checks, stop and implement/test the actual protocol
before enabling it. Do not weaken a binding or manufacture response fields.

## Live operator run

The user must manually fund the exact configured token and complete any Permit2
approval. The app checks its actual balance/decimals and validates signed typed
data. Browser wallet signatures never expose a signing key to the server or model.

Before running, confirm the manifest: identities/configuration, at most three
placements, $1 equivalent QA principal each/$3 aggregate, $3 equivalent QA fees,
up to six answer attempts/24 Jev attempts and $1 API spend. Fix a conservative
per-call reservation from current provider pricing; minimum reserve is $0.05.
Unknown provider outcomes retain reserves and block expansion. These bounds are
not authorization to spend. No paid test was run while implementing this branch.

Set only this worktree's process environment:

- `AXP_HSP_QA_ALLOWLIST_CONFIRMED=1`, `AXP_HSP_RUN_CONFIRMED=1`
- `AXP_HSP_PROFILE` pointing to the reviewed private profile
- `AXP_HSP_OPERATOR_PASSWORD` of at least 16 characters
- Optional `AXP_HSP_LIVE_MODELS=1`, JEV_API_KEY, DEEPSEEK_API_KEY and
  `AXP_HSP_MODEL_RESERVATION_MICRO_USD` after separate API run confirmation

Then run `npm run dev:hsp`. Without live model opt-in, no provider is available;
it never falls back to fixtures. Use three distinct sessions to respect frequency
caps. The answer path receives no advertiser material. Failed payments do not
restore accepted campaign spend, and payment never replenishes the limit.

## Recovery

One charge has one persisted cart, flow ID and payment request ID. Preparation,
finalization and submission persist their state before external operations.
No monetary operation is retried automatically. Query the original IDs after an
uncertain result; never create a replacement order. Lost create_order identifiers
require operator/HSP investigation. A crashed process's durable admission remains
unknown even after its dead process lease can be reclaimed.

Quotes expire at the returned timestamp. Do not reuse expired signatures. The explicit refresh action accepts only a known never-submitted signed quote after a finalized QA block proves its authorization expired and unused. It retains the old signature privately, prepares the same order and requires fresh signing/submission approvals. Submitted or ambiguous operations require reconciliation; they cannot be refreshed this way.

Query at 15-second intervals. The UI polls processing states and stops at safe,
failed or finalized. Safe is not final. After ten minutes it displays pending
confirmation and keeps the original IDs. Recheck safe explicitly for finality.
Finalized payment requires team attribution and an independently verified ERC-20
transfer in a finalized block. State is still private when storage fails.

## Mainnet evidence registry

`AXPDeliveryRegistry` is non-upgradeable and non-custodial with an immutable
registrar. It commits QA evidence, not payment promises or mainnet settlement.
Compile locally with `npm run hsp:compile`. It uses solc 0.8.28, Paris EVM and
optimizer runs=200. To prepare an **unsigned** deployment after the gas ceiling
is separately confirmed:

```sh
node scripts/hsp/deployment.mjs --registrar=0xCONFIRMED_ADDRESS --max-fee-wei=CONFIRMED_CAP
```

The user submits the exact generated deployment through their wallet. Verify it:

```sh
node scripts/hsp/deployment.mjs --registrar=0xCONFIRMED_ADDRESS --transaction=0xACTUAL_TX
```

Neither command broadcasts. The verifier matches constructor bytecode, registrar,
chain, successful receipt, finalized block and actual runtime code hash. Explorer
source verification uses the saved compiler input; it remains pending deployment.
Set AXP_HSP_REGISTRY, AXP_HSP_REGISTRAR and AXP_HSP_ANCHOR_MAX_FEE_WEI before restarting
the local QA server. The verified deployment file is required. For a finalized QA
payment, prepare an anchor, switch the user wallet to HSK mainnet, submit it and
verify the saved hash. Keep unconfirmed hashes across reloads. One deployment and
three records are the intended four successful mainnet transactions; uncertain
attempts remain separate.

## Evidence and static replay

Stop the isolated server before exporting a consistent checkpoint:

```sh
node scripts/hsp/export-evidence.mjs
node scripts/hsp/verify-evidence.mjs artifacts/hsp/qa-evidence.json
npm run hsp:replay -- artifacts/hsp/qa-evidence.json
```

The verifier only reads RPC data. It rejects fixtures and incomplete runs, verifies
receipt signatures, exact transfers and mainnet registry bindings. It does not
independently certify human attention or the HSP team's internal attribution.

The exporter excludes authorization signatures, mandates, questions, provider
payloads, sessions and secrets. Public delivery signatures cannot transfer funds.
`npm run hsp:replay` with no input builds a pending-verification preview. Its output
contains static pages/fonts only, with no JavaScript, forms, APIs or wallet access.
Upload only that directory to separate static hosting; never deploy the live local
service or the repository's ordinary Vercel function build. Existing production
hosting and deployment branch must remain untouched.
