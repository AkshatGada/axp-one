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

## Database and ownership acceptance

The additive finance migration is applied to the dedicated Supabase database.
Actual backend REST reads, RLS/ACL checks and unowned-binding rejection pass.
Existing profiles/resources are unchanged.

Two separate real Supabase Auth test identities saved funding and payout ownership
proofs using existing operator-controlled disposable Devnet keys. Both bindings
persisted after backend restart; wrong-key, altered-message and cross-owner
requests were rejected. That ownership-only checkpoint contained two challenges,
two bindings and zero channels. No funds moved in that checkpoint. This is not a
wallet-extension prompt test; the later funded result is identified below.

The [verification matrix](../VERIFICATION.md) records the functional release's
811 passing repository tests and the PostCSS follow-up's 814 passing tests,
both with 23 optional skips and 90 passing component checks, plus separate
SDK/native adapter checks. These are source checks, not hosted
deployment evidence. Historical acceptance documents retain their original counts.
See [finance architecture and verification](FINANCE_CLOUD_ACCEPTANCE.md) for the
commands and evidence scope.

## Verified account release checkpoint — 13 October 2026

Release `3f54535448cbc5551662ed65e73cb942f690395a` was pushed to `main`, deployed
at [axp.one/account](https://axp.one/account/) and matched against production Git
metadata. It includes the customer UI and Sign in entry points, the published
SDK release and the native account terms' six-decimal regression fix.
The [reviewer guide](../REVIEWER_GUIDE.md) and
[verification matrix](../VERIFICATION.md) provide current source checks.

Earlier live account acceptance verified separate confirmed Supabase owners,
persisted advertiser/app profiles, same-value profile save/readback, an approved
campaign remaining paused, cross-owner denial, scoped SDK configuration and
saved-opportunity lookup, temporary-key revocation and session invalidation.
Existing owner-bound funding/payout wallet proofs remained readable. Production
account reports started at zero; Preview receipts were not copied into this ledger.

Accounts use synthetic accounting with transaction broadcasts disabled. The
3f54535 post-deploy GET checks verified signed-out session/owned-resource denial,
public pages/assets and the account safety gates without a fresh auction, model
call, delivery acknowledgement or funds movement. Persisted cryptographic bindings
alone do not establish wallet-extension prompts or settlement.

## Published SDK and isolated account-owned settlement

[`@axp001/publisher-sdk@0.2.1`](../sdk-cleanroom/NPM_RELEASE.md) is public on npm,
with ESM/browser/optional React exports and SDK-only MIT licensing. Account-issued
keys require `/api/accounts/sdk` explicitly and remain server-only.

The [isolated account-owned Devnet acceptance](DEVNET_ACCEPTANCE.md) completed
one channel with separate confirmed owners and fresh disposable signers:
0.020 test USDC deposited, two accepted Sponsored placements, 0.008 paid and
0.012 refunded. The channel finalized and closed; read-only RPC verification
passed. This used a local account runtime and fixture ad decisions/answer, not
production payment activation or participant wallet-extension signing.

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
- [Published SDK verification](../sdk-cleanroom/NPM_RELEASE.md)
- [Account-owned Solana Devnet acceptance](DEVNET_ACCEPTANCE.md)

The existing shared demonstration and its historical Solana/Tempo records remain
separate from account-owned financial state.
