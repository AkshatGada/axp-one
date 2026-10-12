# Account-connected network: phases 1–3 result

12 October 2026. Worktree `/private/tmp/axp-account-network.RPJg2l/worktree`,
branch `codex/account-owned-network`, base `ddba8fa`.

## Delivered

- Documented the full phase sequence in `NETWORK_CONNECTION_PLAN.md`.
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

Campaign approval does **not** activate delivery. Valid credentials can inspect
configuration but ad-serving routes explicitly return
`503 account_serving_not_connected`. No traffic falls back to the shared demo.

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
| Independent review | One fresh Sol6.1-high review, approval-race fix, one bounded recheck with no remaining blocker |

Browser/API identities were explicit offline fixtures. Cloud database acceptance
used transactional fixture Auth rows and role/JWT claims and then rolled back.
Neither is a new real customer email/sign-up test or a deployed hosted acceptance.
Existing sign-in/profile behavior was preserved, not rebranded as new evidence.

## Cloud change evidence

Only project `qcejmyhaakoedjaqmcub` was changed. Existing profiles were not edited.
The resource migration adds campaign/credential objects and scoped functions;
there was no application deployment, service-role export, wallet operation,
model request, payment or email send.

- Migration: `supabase/migrations/20261012_axp_account_resources.sql`
  SHA-256 `3312b40ec882472b8c086c7f6ea66fd552c87f491cf426ffc5817181c1a09f2b`.
- Rollback acceptance: `supabase/tests/account_resources.sql`
  SHA-256 `aaaf8840dcce47a5b480ad162d46241a5641f98ba4ded3b41f05c3071a4d5a6d`.
- Supabase SQL editor migration query: `78978a08-6c4b-4644-a49d-bd3e2f19e794`.
- Rollback acceptance query: `741713eb-65eb-47be-a91c-424795d43d43`.
- Eight preservation/access checks: `9ee98926-6f69-42d7-b13b-8969aa24d88d`.

Local verification logs/screenshots are in the parent temporary task directory,
not embedded in public source or committed as customer data.

## Protected work and release status

Primary `/Users/akshat/agentic-dsp` remained on `frontend`, four commits ahead of
`origin/main`, with its pre-existing untracked research handoff unchanged. Source
edits are confined to account components, account backend, tests, scoped SQL and
account documentation. Landing/design-system, existing product/demo handlers,
payment adapters and historical evidence have no worktree diff.

The new application code is **not merged, pushed or deployed**. The approved
additive Supabase schema is applied. The temporary browser fixture was signed out
and stopped; its data is not a customer account database. No credentials or local
dependency symlinks belong in a source commit.

## Next gates, in order

1. **Shared serving:** admit explicitly opted-in, eligible campaigns to one shared
   exchange; key-derived app identity binds opportunity, award and receipt. Keep
   owner reports private, profile restrictions mandatory and answer generation
   independent. Test two advertisers and two app accounts end to end.
2. **Financial bindings:** connect advertiser spending authority and app payout
   destinations to native channels; enforce aggregate campaign budgets across
   apps without redirecting fixed-payee channels or adding a browser ledger.
3. **Bounded hosted acceptance:** separate-account SDK integration, duplicate/
   restart handling and authorized model/payment checks. Obtain fresh authority
   for new spending/deployment, then integrate without landing-page edits.

Do not describe the account-owned network as fully serving or financially ready
until those gates pass. Operator instructions: `RESOURCE_OPERATOR_GUIDE.md`.
