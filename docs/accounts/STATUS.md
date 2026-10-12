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

The merged primary checkout's repository regression passed 748 tests with eight
optional skips and zero failures. Connected account/SDK/ownership checks passed
64 tests; account-client and Wallet Standard/panel checks passed 49. These are
local source checks, not hosted deployment evidence.
See [finance architecture and verification](FINANCE_CLOUD_ACCEPTANCE.md) for the
commands and evidence scope.

## Live account release

Account runtime revision `9ab99f02e69762d65f868febdd4a81622e4c03eb` was
pushed to `main` and deployed at [axp.one/account](https://axp.one/account/)
on 13 October 2026. Live checks verified separate confirmed Supabase owners,
persisted advertiser/app profiles, same-value profile save/readback, an approved
campaign remaining paused, cross-owner denial, scoped SDK configuration and
saved-opportunity lookup, temporary-key revocation and session invalidation.
Existing owner-bound funding/payout wallet proofs remained readable. Production
account reports started at zero; Preview receipts were not copied into this ledger.

Accounts use synthetic accounting with transaction broadcasts disabled. No fresh
auction, model call, delivery acknowledgement or funds movement was performed in
this release check. Real user-selected wallet-extension prompts and account-owned
funded lifecycle acceptance remain separate checks; persisted cryptographic
bindings do not establish those outcomes.

The latest landing and shared-demo source was preserved. Public page content and
referenced assets passed checks; the shared demo's health, publisher configuration
and state responses were byte-identical before and after the account deployment.
Existing shared-demo payment configuration was preserved rather than replaced by
account settings. See [integration verification](NETWORK_MERGE_RESULT.md) for the
earlier local merge and regression evidence.

## Documentation

- [Reviewer guide](SUBMISSION_READINESS_CHECKLIST.md)
- [Accounts API and persistence](CONTRACTS.md)
- [Supabase database integration](SUPABASE_DATABASE_RESULT.md)
- [Account finance architecture](FINANCE_CLOUD_ACCEPTANCE.md)
- [Own-wallet integration](ACCOUNT_PAYMENTS_RUNBOOK.md)
- [Functional release checks](FINAL_ROLLOUT_CHECKLIST.md)

The existing shared demonstration and its historical Solana/Tempo records remain
separate from account-owned financial state.
