# Supabase database integration and verification

AXP uses a dedicated Supabase project for account identity and application records.
Profiles are read from PostgreSQL through the verified user's request-scoped
repository, not a local profile cache.

## Data model

The profile migration adds four owner-scoped tables:

- `axp_account_profiles`: personal account presentation.
- `axp_account_orgs`: organization identity and ownership.
- `axp_account_advertisers`: advertiser declarations.
- `axp_account_apps`: AI-app declarations and integration restrictions.

Each has row-level security. The backend calls `axp_account_operation` using the
provider-verified person's access token. Database ownership enforcement is
independent of client UI state; foreign and nonexistent resources return the same
safe not-found result.

Later additive migrations connect account campaigns, app credentials, serving
enrollment and private financial records. They preserve the separation between
user-authenticated profile operations and backend-only financial transitions.
See [finance architecture](FINANCE_CLOUD_ACCEPTANCE.md).

## Sessions and source of truth

Supabase PostgreSQL is the real-provider profile source of truth; provider
unavailability does not trigger a SQLite fallback. SQLite profile storage is an
explicit offline fixture and is refused in the hosted profile configuration.

Opaque sessions, provider tokens and minimal session identity references are
held in the encrypted durable backend snapshot. They are not public profile
columns or DTOs. Confirmation hashes are excluded from static-shell proxy logs.

## Recorded profile acceptance

Acceptance on 12 October 2026 exercised actual authenticated Supabase profile
reads through the local account console, including the existing verified session
after server restart. Separate user-facing acceptance exercised advertiser/app
creation, reload persistence and explicit sign-out.

Rollback SQL fixtures exercised independent synthetic owners, anonymous denial,
foreign/nonexistent IDs, immutable bindings, quotas and declaration validation.
These were database ownership tests, not independent customer signups.

The profile verification record includes 57 focused checks and a passing UI
typecheck. Its then-current repository suite recorded 611 tests: 590 passed,
21 skipped, zero failed. These are historical profile-phase results, not a rerun
of the later account-network suite.

## Reproducibility

| Artifact | SHA-256 |
| --- | --- |
| `supabase/migrations/20261012_axp_account_profiles.sql` | `f8e2f418d4972cc7995c61b8adeac3d36ff515ab6c1a83271f5880a1c9159d2a` |
| `supabase/tests/account_profiles.sql` | `cd2290a598508b6a5a3ee8ce10194a5dafd8df3eada8c99558987f65a7affaed` |

Migrations are explicit database provisioning steps, not startup side effects.
Match the source hash to the environment being reviewed. Profile persistence,
account serving and native financial settlement have separate verification scope.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
and [database functions](https://supabase.com/docs/guides/database/functions).
