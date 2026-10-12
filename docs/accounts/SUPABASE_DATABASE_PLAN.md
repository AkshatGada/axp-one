# Supabase-owned profiles — 12 October 2026

The user requires the dedicated AXP Supabase database, not local SQLite, to own
personal profiles, organizations, advertiser profiles and AI-app profiles.
Supabase Auth is already live: the human's confirmation email was delivered,
email confirmed, and the browser remained signed in after an authoritative
session refresh. No profile or organization has been created for that person.

## Phases

1. Add additive, versioned tables and owner RLS in project
   `qcejmyhaakoedjaqmcub`. No changes to ContextHint, demo financial state,
   existing Auth identities or landing-page files.
2. Add an asynchronous profile repository using the public publishable key and
   the backend's provider-verified user access token. PostgreSQL derives ownership
   from `auth.uid()`, not request IDs. No service-role/admin key is required.
3. Keep opaque login-session persistence in its existing encrypted backend
   snapshot; it is not the profile source of truth. A minimal identity reference
   remains there solely for existing session foreign-key integrity. Never fall
   back to SQLite profiles when the database is unavailable.
4. Wire all account/profile API reads and writes to the database adapter;
   expose the selected profile store in health. Preserve the SQLite fixture
   adapter for existing offline tests only. Existing signed-in session is reused.
5. Apply the migration through the authenticated AXP Supabase SQL editor, run
   transaction-rolled-back owner/isolation acceptance, and verify the real
   signed-in profile is backed by the database. Do not fabricate a customer
   business profile or change the human's display name for testing.
6. Run account contracts/regressions, database adapter tests and UI typecheck.
   Record local versus cloud migration versus product integration separately.

## Frozen database contract

Public RPC `axp_account_operation(operation text, payload jsonb default '{}')`
returns JSON matching the existing profile-store DTOs. Operations:
`ensureUser`, `user`, `updateProfile`, `organizations`, `createOrganization`,
`organization`, `details`, `saveAdvertiser`, `saveApp`.

`payload` is `{}` for identity/list operations, `{displayName}` / `{name}` for
profile/org writes, `{orgId}` for org reads, `{orgId,input}` for advertiser writes,
and `{orgId,input,appId}` for app writes (`appId:null` creates). The function is
SECURITY INVOKER with a fixed search_path. It requires a confirmed authenticated
identity and uses owner-scoped RLS. Anonymous execution/table access is denied.
Foreign/nonexistent IDs return the same `not_found` error. Invalid input and quota
errors use stable safe names. UUID generation/timestamps/ownership are database
controlled. Profile ensure must preserve existing display names.

Only personal/business/app declarations are stored in these tables. No provider
tokens, passwords, session cookies, wallet secrets, vouchers or payment ledger.
Sessions, campaigns and payments are not migrated in this phase.

## Ownership

Main: async repository, API and runtime wiring, cloud application and acceptance.
One builder: additive SQL migration and its rollback-only SQL acceptance script.
Scopes do not overlap. No push, merge, deployment, model calls or payments.
