# Account-owned payment implementation result

12 October 2026 · isolated `codex/account-owned-network` worktree.
Baseline `0e00aac0d27a5a1eacbf7877b565439cdcfecb31`.

## Outcome

Locally implemented and verified: account-bound wallet ownership, frozen
campaign/app channels, externally signed native MPP openings, cumulative
receipt-linked vouchers, cooperative payout/refund, separate serving activation,
and a functional account console. **Not a live funding/settlement acceptance.**

The user selected **own-wallet signatures**. The old generated demo payer and
publisher wallets are not reused or imported. Automated tests generate ephemeral
fixture keys and inject payment outcomes. Real accounts must separately prove
their campaign funding and app payout addresses and sign their own requests.

## What changed

- Domain/resource/purpose/nonce/expiry-bound Ed25519 ownership challenges, with
  one-way consumption and no replay-based authority renewal.
- Additive private Supabase financial repository with fixed backend RPC, CAS,
  actual resource-owner graph checks, immutable channel terms and app recipient
  pinning. Human sessions and SDK keys cannot read private voucher records.
- Own-wallet Solana Devnet transport over the existing pinned MPP SDK. Exact
  transaction messages/signatures and native voucher bytes are verified; no
  managed signer, key-file fallback or new channel program.
- One channel per campaign/app pair; fixed campaign version/payer/payee/asset;
  explicit finalized funding and activation. Aggregate campaign caps span apps.
- Accepted exchange charges, not browser-supplied amounts, determine cumulative
  signing requests. Losing/duplicate/non-delivered awards add no accepted charge.
- Saved partial cooperative-close signatures, native zero-spend closure and
  separate deposit/authorization/payout/refund/fee/rent statuses.
- Wallet Standard discovery/connect/sign helpers and the existing account
  cookie/CSRF client. No wallet connection or signature occurs on rendering,
  browsing resources, previewing or sign-out. SDK keys have no signing authority.
- SDK readiness reports missing app funding rather than treating native mode
  configuration as evidence of a finalized deposit.

## Recovery fixes and independent review

One fresh Sol6.1-high review identified interrupted/expired unsigned preparation
and hosted native-state rollback hazards. Substantive fixes and bounded rechecks:

1. Interrupted unsigned open/close preparation retries the same frozen
   obligation. Expired unsigned plans refresh while retaining old partials and
   history; signed/possibly submitted transactions are never replaced here.
2. Saved signed voucher recovery restores the verified finalized open and
   replays exact durable predecessor vouchers, then the pending saved signature.
   Native state is checkpointed before advancing the public authorized total.
3. Interrupted unsigned voucher preparation resumes its exact saved ledger
   intent and reuses/reconstructs only its matching native reservation.

The reviewer confirmed all reported recovery blockers resolved: **34/34 targeted
tests passed, zero skips**, including actual pinned-SDK SQLite resume. This is
offline correctness evidence, not real wallet/network lifecycle evidence.

## Verification performed

| Check | Result and boundary |
| --- | --- |
| Repository `npm test` | **743 total; 720 passed; 0 failed; 23 skipped.** Existing optional native/environment checks remain skipped. Loopback networking allowed for local HTTP tests. |
| Explicit account/client/wallet/panel command | **49 passed, 0 failed/skipped.** Includes actual account API contract tests and fixture Wallet Standard interactions. |
| Account finance integration | **9 passed, 0 failed/skipped.** Four identities, two funded-competitor fixture channels, global caps, positive/zero close, lost ACKs, actual hosted scratch deletion/KV checkpoint failure, before/after reservation faults. Payment finality/balances are injected. |
| External transport, explicit installed pinned SDK | **25 passed, 0 failed/skipped.** Actual SDK routes, native messages, real cryptographic signatures, SQLite-discard recovery and reservation resume; **no RPC**. |
| Repository persistence | **15 passed.** Fixture and Supabase request/CAS/identity/immutable-field validation. Included in repository suite, not additive totals. |
| Isolated SQL | Migration + ownership/RLS/ACL/CAS/immutability acceptance passed in network-disabled disposable PostgreSQL. Test transaction rolled back to zero financial records; container/volume removed. |
| Product UI | TypeScript passed and final Next optimized static build passed, including account/dashboard/publisher routes. No deployment. |
| Browser | Fictional advertiser A saw only Campaign A; app A saw only Chat 2 and payee controls. Broadcast disabled, no wallet registered, waiting/unavailable states visible. Resource reads and both sign-outs worked. No signing/funding was attempted. |
| Scope | Main tracked checkout remained unchanged at `ddba8fabc8a2f8776cd5f8545aad80bad17d3e11`. No marketing, existing demo, shared payment adapter, provider configuration or private environment edits. Other agents' untracked files were preserved. |
| Disk | Approximately 71 GiB available; above the requested 40 GiB floor. |

Finance migration SHA-256:
`d2beb9f1e99efa274ad3bdf2f6488d6519e412ec60f70d97d424698dbb70ccd6`.
It has **not** been applied to the dedicated AXP cloud project.

Local QA logs:
`/private/tmp/axp-account-finance-final-suite.log` and
`/private/tmp/axp-account-finance-ui-build.log`.
Temporary build output was retained outside the checkout under
`/private/tmp/axp-finance-qa.TxDdQx`. Borrowed dependency symlinks were removed;
they are not runtime dependencies or committed files.

## Still open — do not claim complete production rollout

- Cloud finance migration/configuration, real wallet extension compatibility,
  real Devnet deposits/authorizations/settlement, and hosted independent-owner
  acceptance. Each needs its appropriate explicit approval.
- Advertiser must sign cumulative increments; there is no unattended delegated
  spending authority. Cooperative closure requires both frozen wallet owners.
- Signed expired/failed/unknown transactions are not automatically replaced.
  No unilateral timeout/force-exit UI is added. An absent RPC result is not
  nonexecution proof. Native voucher expiry can block absent authorization
  recovery; complete bounded pilot runs inside their frozen window.
- Own-wallet Tempo support, reusable/replacement channels and payout changes for
  existing app identities are not implemented in this first slice.
- Account statements/funnel reporting, password recovery, account-specific SDK
  onboarding, exact release artifact verification and submission assets remain
  the next functional work. See `FINAL_ROLLOUT_CHECKLIST.md`.

No live models, airdrops, wallet funding, transfers, signatures, broadcasts,
cloud apply, merge, push or deployment were performed. Existing synthetic and
historical native runs remain separate; nothing converts their accounting mode.

## Reproduce

```sh
npm test
node --experimental-strip-types --test apps/product-ui/src/components/accounts/client.test.ts apps/product-ui/src/components/accounts/api-contract.test.mjs apps/product-ui/src/components/accounts/financialClient.test.ts apps/product-ui/src/components/accounts/walletStandard.test.ts apps/product-ui/src/components/accounts/financialResources.test.mjs
node scripts/accounts/verify-finance-sql.mjs --isolated-fixture
AXP_ACCOUNT_BROWSER_FIXTURE=1 node tests/support/accounts-network-browser.mjs --finance
```

The browser fixture is explicit fake identity/payment mode on loopback 3503/3504;
it loads no cloud configuration and disables native transport/preflight. Stop
with Ctrl-C. Installed pinned SDK checks use the existing repository SDK setup
and an explicit test-only `AXP_EXTERNAL_SOLANA_SDK_ROOT`, never another checkout
as a runtime dependency. Follow `ACCOUNT_PAYMENTS_RUNBOOK.md` for real-owner
setup; do not enable broadcast as part of ordinary local verification.
