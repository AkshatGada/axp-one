# Shared account serving — phase 4 result

12 October 2026. Branch `codex/account-owned-network`, resource base `bcb13db`.
Implemented in the same isolated worktree; not merged, pushed or deployed.

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
authorization, settlement, payout or refund. Those remain account financial
bindings phase 5. Existing demo native payment evidence is unchanged and does not
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
| Fresh review | One independent Sol6.1-high review and bounded recheck; substantive findings fixed with targeted regressions |

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

## Approved dedicated Supabase setup

Applied **only** to AXP project `qcejmyhaakoedjaqmcub`, following the user's explicit
approval after isolated tests passed:

- Migration `20261012_axp_account_serving.sql` SHA-256
  `167d225c69c56d680e791dd7c8bf4fce73d7ff836c85e121d885db2f654d6e92`.
- Whole-file cloud rollback acceptance `account_serving.sql` SHA-256
  `bc04bc2eec474bb7724efec87ea760eb09fbd2936a90784af5d62b496d932f20` passed.
- Before/after counts and complete-record hashes of **all six existing tables**
  match: profiles/orgs/advertisers/apps each 1 row, campaigns/credentials each 0.
- Enrollment table remains empty. Catalogue returns `[]`. New owner RLS and
  service-only catalogue permissions verified. No customer inventory enrolled.
- Saved existing project backend key only to ignored mode-0600 `.env.local`;
  no new key created, no secret committed/logged or forwarded to a browser client.
- The real backend catalogue reader successfully queried Supabase: zero enrolled
  campaigns. The isolated API health at port 3505 returned
  `profileStore:supabase`, `campaignServing:true`, `nativeFunding:false` and
  `serving.ready:true`. Test servers were stopped afterward.

Verification query:
[dedicated project SQL checks](https://supabase.com/dashboard/project/qcejmyhaakoedjaqmcub/sql/49f48597-72b9-4072-b64f-8ab9c91faef3).
Local private evidence is outside the repository in the worktree parent:
`supabase-serving-checks.png`, `shared-serving-suite-final.log`,
`shared-serving-focused.log`, `shared-serving-build.log` and account screenshots.
Do not treat a saved SQL editor result as a substitute for rerunning checks after
later database changes.

## Preservation and next gate

Primary checkout remained `frontend` at `ddba8fabc8a2f8776cd5f8545aad80bad17d3e11`,
with only its existing untracked research handoff observed. Landing, design
system, shared dashboard/publisher demo, native payment packages and historical
artifacts have no changes in this phase. Disk remained about 70 GiB free.

Next: review/merge this account branch without landing changes, then implement
advertiser spending authority and app-specific native payout/channel bindings,
followed by separately approved bounded hosted acceptance. Missing broad safety
classification deliberately suppresses affected serving; it is not claimed as
implemented. See [operator runbook](SHARED_SERVING_RUNBOOK.md).
