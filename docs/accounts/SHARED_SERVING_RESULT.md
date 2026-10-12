# Shared account serving — phase 4 result

12 October 2026 · historical synthetic-serving acceptance.
[Account finance](FINANCE_CLOUD_ACCEPTANCE.md) is a subsequent additive slice.
This result does not establish native settlement or current deployment.

## Delivered

- Explicit owner-approved, exact-version synthetic campaign enrollment/pause.
- One shared exchange across advertiser accounts and independently keyed apps.
- Existing ContextHint retrieval and validated Jev decision integration. Live
  provider absence abstains; all decision execution in this verification used
  explicitly injected fixtures, not fresh paid model calls.
- First-price auction, aggregate campaign reservations/caps across apps and
  versions, immutable approved creative snapshots and app-bound signed receipts.
- Replay/unknown-outcome protection, current-key receipt recovery, foreign-app
  denial, private campaign/app reports and functional account-console controls.
- Separate encrypted account-network workspace; no demo fallback or demo ledger.
- Additive Supabase enrollment authority, a backend-only bounded catalogue RPC,
  narrow owner RLS/invoker operations and a private local backend configuration.

This is **synthetic financial accounting**, including when the intended rail is
Solana Devnet or Tempo testnet. It performs no native funding, spending-voucher
authorization, settlement, payout or refund. Those are covered by the separate account-finance implementation and acceptance gates. Existing demo native payment evidence is unchanged and does not
constitute settlement of this phase's account-owned placements.

## Verification

| Check | Result and evidence boundary |
|---|---|
| Repository suite | 694 tests: **673 passed, 0 failed, 21 skipped** |
| Focused account suite | 111 passed before the final fixture-readiness repair; subsequent 13 shared-serving tests and the final repository suite passed with that regression included |
| Isolated SQL | Profiles, resources and serving migrations plus all three rollback acceptance scripts passed in bounded local PostgreSQL |
| UI | TypeScript no-emit and isolated Next static build passed; final typecheck passed after review repairs |
| Two advertisers/two apps | Actual SDK code exercised independent fixture identities against one shared ledger; competing valid fixture bids, independent same-string turns, global caps and private reports |
| Receipt correctness | Signed receipt verification, rejected/failed/expired delivery zero charges, losing campaigns zero charges, duplicates/restart reuse, foreign app denial and rotated-key recovery passed |
| Model provenance | Immutable cached-vector/uncached-lexical ContextHint packets reached the injected Jev transport; no external provider calls |
| Uncertainty | Checkpointed admissions survived restart without repeat invocation; pending/unknown was not presented as success |
| Browser | Advertiser A privately inspected its campaign/report, paused/re-enabled version 1, reloaded and signed out; App A saw its own app/report and no campaigns, then signed out |
| Fresh review | One independent independent review and bounded recheck; substantive findings fixed with targeted regressions |

Browser accounts, keys, decisions and receipt amounts above are explicit local
fixtures, **not** four real Supabase signups or a hosted live-provider acceptance.
No emails, fresh Jev/organic calls, wallets or funds were used.

### Review repairs

1. Replaced question-keyword category checks with fail-closed unsupported safety
   restrictions; declared capability policy remains enforced deterministically.
2. Supplied a separate synthetic Tempo routing/state projection; Tempo inventory
   no longer poisons unrelated Solana auctions, currencies never combine.
3. Rejected non-HTTPS ad enrollment in fixture, SQL owner RPC/direct REST and
   backend catalogue validation, preserving ordinary loopback profile editing.
4. Made SDK configuration reflect actual catalogue readiness. Recovery is still
   available for existing ledger receipts during a catalogue outage.
5. Corrected hosted fixture health to resolve its working network before gating
   console controls; added a regression and passed the final suite.
6. Kept historical advertiser snapshots immutable on explicit pause/re-enable;
   checked cross-app obligations before cap reductions and rail changes.

## Dedicated Supabase verification

The additive migration was applied to the dedicated AXP project after isolated tests:

- Migration `20261012_axp_account_serving.sql` SHA-256
  `167d225c69c56d680e791dd7c8bf4fce73d7ff836c85e121d885db2f654d6e92`.
- Whole-file cloud rollback acceptance `account_serving.sql` SHA-256
  `bc04bc2eec474bb7724efec87ea760eb09fbd2936a90784af5d62b496d932f20` passed.
- Before/after counts and complete-record hashes of **all six existing tables**
  match: profiles/orgs/advertisers/apps each 1 row, campaigns/credentials each 0.
- Enrollment table remains empty. Catalogue returns `[]`. New owner RLS and
  service-only catalogue permissions verified. No customer inventory enrolled.
- Privileged catalogue access is backend-only; credentials are not part of the public client.
- The real backend catalogue reader successfully queried Supabase: zero enrolled
  campaigns. The isolated API health at port 3505 returned
  `profileStore:supabase`, `campaignServing:true`, `nativeFunding:false` and
  `serving.ready:true`. Test servers were stopped afterward.

Current source/schema contracts and remaining release gates are documented in
[serving integration](SHARED_SERVING_RUNBOOK.md), [status](STATUS.md) and
[finance verification](FINANCE_CLOUD_ACCEPTANCE.md). Missing unsupported safety
classification suppresses affected serving; it is not claimed implemented.
