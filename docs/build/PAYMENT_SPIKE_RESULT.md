# C06 payment spike result — 2026-09-30

**Implemented and tested synthetic payment seam; SDK artifact and Devnet channel
compatibility remain blocked.** No real payment channel was opened or settled.
This is an isolated component result, not full-system integration/review evidence.
Only packages/payments, tests/payments, scripts/payment-spike and this report are
owned. Root manifests/shared contracts were not changed. No push/deployment,
wallet key/config read, token movement, paid API call or custom program occurred.

## Actual execution gates

| Gate | Result | Evidence |
|---|---|---|
| Pinned source acquisition | Passed; immutable source retrieved | `scripts/payment-spike/evidence/sdk-attempt.json` |
| Manifest/lockfile provenance | Both requested SHA-256 hashes matched | Same evidence, upstream MIT notice retained |
| Filtered SDK install/build/import | **Blocked by footprint limit breach**; filtered install executed, compiler/import not executed, no built archive/hash | Same evidence |
| AXP offline F01–F16 | **passed_synthetic**; 17 native node:test tests | `tests/payments/payment.test.mjs` |
| Pinned MPP reserve/commit/encoder/close handlers | **not_run**; no executable SDK artifact | Do not infer SDK support from AXP fixtures |
| SDK SessionStore/idle watchdog coexistence | **not_run**; synthetic guard only | F13 is not an SDK lifecycle test |
| Read-only Devnet genesis/program/program-data/mint | Executed; observations recorded | `scripts/payment-spike/evidence/devnet-readonly.json` |
| Devnet ABI/treasury/account compatibility | **blocked**; program presence and decimals are insufficient | Same report lists each missing gate |
| Open/settle/distribute/reclaim simulations | **not_run**; artifact/account gates unavailable | Zero simulations |
| Existing payer/payee public accounts | **blocked**; no explicit public address found in referenced prior acceptance document | No key/config files opened |
| Wallet signing/broadcast/finalized settlement | **not_run**, outside this no-value scope | Zero wallet key reads and broadcasts |

## SDK artifact attempt and deviation

Pin: PayKit `c294f8903f18efc746584e3cc2961d6033b8365c`,
`typescript/packages/mpp`, declared `@solana/mpp@0.11.0`. Node was `v25.5.0`.
Manifest SHA-256:
`906817cfd7e04994f9667d3a4b4d3bad676945a66c4aa78af978038d7d3b0b01`.
Lockfile SHA-256:
`58a00a82f021fdb06dbba0d8114f02c1770a19dfd92d26711741648429db749d`.

Retrieved a capped source archive and extracted TypeScript/license into the
projectless task's work directory. The filtered frozen-lock install, with scripts
disabled and task-local store/virtual-store, installed **668 packages** and
completed before footprint observation. Observed task footprint during completion
was **751,572 KiB (~734 MiB)**, breaching the approved **200 MiB** bound. This
attempt did not satisfy the bound. Stopped before compilation/import; removed the
task-local dependency store and virtual-store. Source/work returned to about
16 MiB. Free space after install was **53,990,188 KiB (~51.5 GiB)**, above the
50 GiB floor; after cleanup it was 54,434,656 KiB (~51.9 GiB).

The available pnpm initially reported 11.9.0. Its completed install reported
11.13.0 via automatic package-manager selection despite
`--config.manage-package-manager-versions=false`. No global install command or
global configuration edit was issued. This automatic selection is recorded rather
than described as a fully isolated exact-tooling success. Do not repeat the broad
closure or silently substitute npm 0.7.0/latest; an explicit smaller artifact
revision/preflight is needed. The SDK build/import/archive hash remain unavailable.

## Synthetic results and evidence limits

One fixture channel, deposit/cap **1000**, accepted charges **100 + 250**,
cumulative authorizations **100 → 350**, synthetic payout **350**, unused token
refund **650**, no fee/splits. Synthetic signing count remains **2** through close;
close uses the saved final voucher hash. `txSignature` is null and finality is
`synthetic`. Reclaim only prepares a labelled synthetic plan and does not invent
rent recovery or another token refund.

Tests cover free reads/award/failed/expired/invalid receipt paths, exact increment
checks (including the SDK's potential undercommit mismatch), concurrent replay,
SQLite restart after saved signing/unknown commit, signature and terms rejection,
drain/freeze orderings, unknown close recovery, idle drain guard, expiry margin,
configuration/genesis rejection and strict reclaim eligibility. Money parsing,
cap conservation, unsupported state schema, unknown field round-trip and detached
public projections are also checked. These tests run the **fresh AXP synthetic
adapter**, not upstream SDK protocol code. They do not prove Devnet A09/A11,
chain voucher compatibility, human attention or malicious-party fair exchange.

Runtime persistence: native Node SQLite; reopen injected store after restart, or
restore a private memory snapshot. Single worker, short synchronous transactions,
no signing/RPC under a writer lock. The test signer is a deterministic public
fixture Ed25519 key; the signed payload is AXP JSON, not MPP wire bytes. SDK durable
session state and application-to-SDK asynchronous mutator integration are absent.

## Read-only Devnet observation

RPC: `https://api.devnet.solana.com`, finalized observation on 2026-09-30
at 14:19:41 UTC (19:49:41 IST). Genesis:
`EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`.
Finalized slot **505932141**; later account observations at **505932143**.

Executable program: `CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX`.
Upgradeable-loader program-data:
`CghQXkmw2F6p1exMETiZdNeUx9QGraWsNZ4eom1Cuiw1`, deployment slot **480232051**.
Deployment bytes SHA-256:
`acdb3abfc818a7350e876db42253d465fe31f5d52da0259c7ef3806191b3cf8b`
(66,240 bytes, excluding loader metadata). Full program-data hash is also saved.
Test-USDC mint `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
is owned by `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` and has decimals **6**.

This refresh establishes presence/metadata only. Deployed ABI/voucher verifier,
treasury/ATA, public payer/payee and canonical accounts remain unverified. The
script accepts explicit public addresses; it never derives them from a wallet
key or reads configuration. Only allowlisted read RPC methods exist; no simulation
or broadcast surface. No mainnet/sandbox fallback is implemented. A first default
sandboxed-shell attempt could not connect; an elevated read-only retry succeeded. An
initial shortened local genesis constant was corrected to the complete public
RPC value before the retained report; this was not a mainnet/network substitution.

## Integration handoff

Import `SyntheticPaymentAdapter`, `SQLitePaymentStore` or
`createMemoryPaymentStore` from `packages/payments/index.mjs`. Full interface,
example, store contract and declarations: `packages/payments/README.md` and
`index.d.ts`. All methods are synchronous and can be awaited; `now` is Unix seconds.

- Constructor: `new SyntheticPaymentAdapter({store?, now?})`.
- `open` requires explicit `mode: synthetic`, channel/run/advertiser/campaign IDs,
  `synthetic:` payer/payee and decimal-string `depositBaseUnits`.
- After C05 durable receipt admission, call
  `authorizeCumulative({channelId, chargeId, amountBaseUnits, accepted:true,
  sequence?, acceptedReceiptHash?, reservationId?})`. Supplied run/campaign/payee/
  mint must match terms. Replay returns the original result and cumulative value.
- For stricter separate worker intake, use `acceptCharge(...)` then
  `authorizeCumulative({channelId, chargeId})`. The accepted marker is trusted
  synthetic intake, not receipt verification; C05 remains authoritative.
- Track obligations with `reserveAward/releaseAward`, or serialize C05 external
  drain/ledger with this worker. `beginDrain` prevents new awards; previously
  reserved obligations may complete. Close cannot freeze while local unpaid
  charges/reservations remain.
- `prepareClose({channelId})` returns `id`; pass it as `planId` to
  `confirmClose({channelId, planId})`. Both calls reuse the saved voucher.
- Unknown authorizations/closes require `reconcile({channelId, chargeId})` or
  `reconcile({channelId, planId})`; these use durable synthetic provider records.
- Public outputs contain IDs/totals/hashes, not signed payloads/signatures.
  Store snapshots are private. Never expose worker or test fault controls to
  browser, publisher-selected-price requests or buying agents.

No shared-schema or root-manifest changes requested. Main can integrate this seam
or retain its own explicitly synthetic adapter. Real MPP replacement requires an
available bounded artifact, SDK-handler/store/lifecycle tests, actual deployment
compatibility and separately approved transaction limits.

## Reproduction and acceptance state

From the repository root with Node 25:

```sh
node --test tests/payments/*.test.mjs
node scripts/payment-spike/synthetic-smoke.mjs
node scripts/payment-spike/devnet-readonly.mjs --rpc https://api.devnet.solana.com
```

The smoke projection is retained under scripts/payment-spike/evidence. Read-only
network failures return explicit blocked reports; incompatible configuration
returns nonzero. Successful metadata reads still return blocked compatibility.
A05/A07/A08/A09/A10/A11/A13/A15 have bounded **synthetic contributions** only.
A12 losing-channel integration, A14 frontend authority and full-system acceptance
remain main-owned/unverified here. Required actual Devnet A09/A11 are **blocked**.
Fresh independent connected-slice review and orchestrator integration remain to
be performed; no independent implementation review is claimed by builder tests.
