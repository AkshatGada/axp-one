# Account-connected network: phases 1–3 result

12 October 2026 · historical resource-slice acceptance.
Subsequent [shared serving](SHARED_SERVING_RESULT.md) and
[finance verification](FINANCE_CLOUD_ACCEPTANCE.md) extend this implementation.

## Delivered

- Advertiser-owned campaign drafts, versioned editing and saved-version approval.
  Edits clear approval. A stale approval request returns a conflict rather than
  approving content the advertiser has not reviewed.
- AI-app-owned server SDK credentials: issue, metadata list, atomic rotation,
  irreversible revocation and expiry. Only a SHA-256 hash is persisted; the raw
  random credential is shown once and never returned by metadata/configuration.
- Account console, typed client, Supabase store and explicit offline fixture store.
  Real resources use dedicated AXP Supabase, not a local JSON/SQLite fallback.
- Separate authenticated SDK configuration namespace. App identity/restrictions
  derive from its credential and saved profile, never a supplied publisher ID.

At this original resource-only stage, approval did not activate delivery and
serving returned `503 account_serving_not_connected`. The subsequent serving
implementation is separate and opt-in; no traffic falls back to the shared demo.

## Verification

| Check | Result and boundary |
|---|---|
| Account tests | 67 passed, including four separate fixture identities, foreign-resource denial, persistence, expiry, rotation/revocation and stale approval |
| Repository suite | 629 passed, 0 failed, 21 explicitly skipped native/live/dependency checks; no fresh chain or model acceptance claimed |
| Product UI | Typecheck and Next production build passed |
| Browser | Separate advertiser/app fixture accounts: create, edit, approve, reload, switch accounts, issue/rotate/revoke, reload metadata, sign out; two-tab stale approval remained draft |
| Isolated SQL | Postgres 17 container, network disabled, no host mounts; both migrations and both rollback acceptance scripts passed; exact disposable container removed |
| Dedicated Supabase | Approved additive migration applied; resource rollback acceptance passed under authenticated/anonymous roles |
| Cloud preservation | All four existing profile-table row counts and SHA-256 fingerprints unchanged; both new resource tables empty after acceptance rollback; RLS enabled and hash SELECT denied |
| Independent review | One fresh independent review, approval-race fix, one bounded recheck with no remaining blocker |

Browser/API identities were explicit offline fixtures. Cloud database acceptance
used transactional fixture Auth rows and role/JWT claims and then rolled back.
Neither is a new real customer email/sign-up test or a deployed hosted acceptance.
Existing sign-in/profile behavior was preserved, not rebranded as new evidence.

## Cloud change evidence

Only the dedicated AXP Supabase project was changed. Existing profiles were not edited.
The resource migration adds campaign/credential objects and scoped functions;
there was no application deployment, service-role export, wallet operation,
model request, payment or email send.

- Migration: `supabase/migrations/20261012_axp_account_resources.sql`
  SHA-256 `3312b40ec882472b8c086c7f6ea66fd552c87f491cf426ffc5817181c1a09f2b`.
- Rollback acceptance: `supabase/tests/account_resources.sql`
  SHA-256 `aaaf8840dcce47a5b480ad162d46241a5641f98ba4ded3b41f05c3071a4d5a6d`.
## Release boundary

The resource migration was cloud-applied and verified without changing existing
profiles or executing models/payments. Fixture SQL identities were rolled back.
Application deployment is a separate check; current verified/pending scope is
recorded in [status](STATUS.md). Shared serving and own-wallet finance now have
their own contracts and tests; historical resource-only behavior is not the
current network's full feature set.
