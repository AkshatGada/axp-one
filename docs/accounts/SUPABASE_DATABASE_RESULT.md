# Dedicated AXP database result — 12 October 2026

## Implemented and exercised

Project `qcejmyhaakoedjaqmcub` now owns personal profiles, organizations,
advertiser profiles and AI-app profiles in four additive public tables:
`axp_account_profiles`, `axp_account_orgs`, `axp_account_advertisers`,
`axp_account_apps`. All four have owner-scoped row-level security enabled.

The checked migration was applied through this project's authenticated SQL editor.
The local account console was restarted and reports `profileStore: "supabase"`.
The human's existing confirmed session remained valid after restart and reads its
profile through the actual authenticated Supabase RPC. The browser displays
"AXP Supabase PostgreSQL". No password or additional confirmation was requested.

Read-only SQL verification after browser acceptance returned:

```json
{"app_rows":0,"profile_rows":1,"advertiser_rows":0,"organization_rows":0,
 "rls_enabled_tables":4,"remaining_sql_fixture_users":0,
 "confirmed_user_profile_present":true}
```

No organization, business/app declaration or display-name change was invented
for the human. Real profile writes were exercised through the rollback-only SQL
acceptance using two temporary synthetic Auth identities, not customer identities.
It covered both owners, foreign/nonexistent IDs, anonymous denial, RPC/direct
table restrictions, immutable bindings, confirmed identity, quotas and declaration
validation. The first attempt exposed a test-helper-only PostgreSQL `pg_temp`
GRANT alias error. The helper was corrected to grant its actual temporary schema;
the corrected whole-file run passed and rolled back. Subsequent verification
confirmed zero fixture identities remain. The application migration was unchanged.

## Reproducibility

SHA-256:

- `supabase/migrations/20261012_axp_account_profiles.sql`:
  `f8e2f418d4972cc7995c61b8adeac3d36ff515ab6c1a83271f5880a1c9159d2a`
- `supabase/tests/account_profiles.sql`:
  `cd2290a598508b6a5a3ee8ce10194a5dafd8df3eada8c99558987f65a7affaed`

The migration is apply-once SQL, not an automatically executed application
startup routine. SQL-editor application does not create a Supabase CLI migration
history entry. Retain this source/hash before provisioning another environment.

- 57 focused account/client/packaging checks passed.
- Product UI TypeScript check passed.
- Final repository suite: 611 tests, 590 passed, zero failed, 21 skipped
  (including native SDK tests unavailable in this fresh worktree).
- One independent Sol6.1-high review found no substantive blockers in the
  profile integration. Its offline review was not cloud acceptance.
  The bounded recheck caught query loss on a non-trailing-slash confirmation URL
  in the local proxy. Both account spellings now forward internally to `/account/`
  without a redirect, retaining the browser's callback while excluding it from logs.
  Actual loopback HTTP checks with a fake callback returned 200 with no Location
  header for both spellings after restart; no confirmation/provider POST was made.

## Persistence and scope

Supabase PostgreSQL is the real-provider profile source of truth. There is no
SQLite profile fallback when Supabase is unavailable. Opaque login sessions and
their minimal identity references retain the existing encrypted backend snapshot;
they are not public database rows. No service-role/admin key was retrieved or
added. Profile RPCs use the public publishable key plus the backend-held,
provider-verified person's access token. Sessions/credentials never enter the
public profile DTOs or tables. The local UI proxy strips callback queries before
forwarding the static shell, preventing confirmation hashes in Next request logs.

Campaigns, payments and the shared demo have not been migrated. Account profiles
do not grant campaign serving, funding or app credentials. ContextHint, landing
work, current demo records and wallets remain untouched. This is an applied cloud
database migration plus verified local integration, not a deployed account feature.
No merge, push, deployment, model calls or payment operations were performed.

Database policy references:
[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
and [database functions](https://supabase.com/docs/guides/database/functions).
