# Account network implementation status

AXP implements accounts for advertisers and AI apps, connecting owned resources
to shared ad serving and a separate own-wallet financial lifecycle.

## Implemented components

| Component | Implementation |
| --- | --- |
| Identity | Supabase email/password authentication, confirmation, verified sessions and sign-out |
| Profiles | Supabase PostgreSQL personal profiles, organizations, advertiser profiles and AI apps |
| Campaigns | Owner-scoped versioned drafts, approved creative/declarations, limits and serving controls |
| App integration | Issue, list, rotate, revoke and expire scoped server-side SDK credentials |
| Shared serving | Account inventory, advertiser decisions, deterministic auctions and app-bound receipts |
| Finance | Private revision-controlled records, exact wallet-control proofs and immutable channel terms |
| Own-wallet transport | Solana native channel preparation, cumulative authorization, cooperative closure and reconciliation |
| Interface | Functional account, campaign, app credential and Wallet Standard controls |

## Current verification

The additive finance migration is applied to the dedicated Supabase database.
Actual backend REST reads, RLS/ACL checks and unowned-binding rejection pass.
Existing profiles/resources are unchanged.

Two separate real Supabase Auth test identities saved funding and payout ownership
proofs using existing operator-controlled disposable Devnet keys. Both bindings
persisted after backend restart; wrong-key, altered-message and cross-owner
requests were rejected. The database contained two challenges, two bindings and
zero channels. No funds moved. This is not a wallet-extension prompt test.

The latest repository regression passed 733 tests with 23 optional skips and zero
failures. The focused account-client run passed 72 checks; Wallet Standard/panel
fixtures passed 17. These are local source checks, not hosted deployment evidence.
See [finance architecture and verification](FINANCE_CLOUD_ACCEPTANCE.md) for the
commands and evidence scope.

Real user-selected wallet-extension and account-owned funded lifecycle acceptance
are separate release checks. Broadcasts remain disabled for the current
non-spending verification. The isolated account-network source candidate is not
itself evidence of public deployment.

## Documentation

- [Reviewer guide](SUBMISSION_READINESS_CHECKLIST.md)
- [Accounts API and persistence](CONTRACTS.md)
- [Supabase database integration](SUPABASE_DATABASE_RESULT.md)
- [Account finance architecture](FINANCE_CLOUD_ACCEPTANCE.md)
- [Own-wallet integration](ACCOUNT_PAYMENTS_RUNBOOK.md)
- [Functional release checks](FINAL_ROLLOUT_CHECKLIST.md)

The existing shared demonstration and its historical Solana/Tempo records remain
separate from account-owned financial state.
