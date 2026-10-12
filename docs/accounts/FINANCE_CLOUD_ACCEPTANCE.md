# Account finance architecture and verification

AXP connects account-owned advertiser campaigns to app-specific payment recipients.
Supabase PostgreSQL persists wallet-control challenges, verified address bindings
and channel state. The trusted backend controls financial transitions; neither
advertiser agents nor publisher SDK credentials can authorize spending.

## Supabase persistence

The additive finance migration is
[`20261012_axp_account_finance.sql`](../../supabase/migrations/20261012_axp_account_finance.sql).
It is applied to the dedicated AXP database. Its SHA-256 is
`d2beb9f1e99efa274ad3bdf2f6488d6519e412ec60f70d97d424698dbb70ccd6`.

The database stores three record types in `axp_account_financial_records`:

| Record | Purpose |
| --- | --- |
| `wallet_challenge` | Exact ownership message, nonce, origin, resource, expiry and consumption state |
| `wallet_binding` | Verified public address bound to its account, organization, resource, network and purpose |
| `channel` | Frozen campaign/app terms and revision-controlled payment lifecycle state |

The table has row-level security enabled and no client policies. Direct table
access is denied to anonymous clients, signed-in users and the service role.
The backend uses the fixed `axp_account_financial_operation(operation,payload)`
RPC for bounded get, create, compare-and-swap and list operations. Only the service
role can execute it. The security-definer function has an empty fixed search path;
its helper is not directly executable by those roles.

This separation keeps private financial records behind backend ownership checks.
Public responses expose verified addresses and channel summaries, not database
credentials, provider tokens, signed voucher payloads or private keys.

## Ownership and signatures

An advertiser proves control of its campaign's funding address. An AI-app owner
separately proves control of the app's payout address. The backend checks resource
ownership before issuing or verifying a challenge.

Each five-minute challenge includes the exact origin, network, account,
organization, resource, purpose, wallet address, challenge ID, nonce and timestamps.
Its first line states that it is **not a payment authorization**. The signature is
Ed25519 over the exact UTF-8 bytes, encoded as canonical base58.

A connected wallet is not a verified wallet. A prepared or rejected challenge
installs no binding. Invalid signatures, altered messages, foreign resources,
changed origins/purposes and unconsumed expired challenges are rejected.

Successful verification consumes the challenge before installing the binding.
A replay returns the original proof without renewing it. Replaying an older proof
cannot replace a newer wallet binding. Later address changes cannot redirect
existing frozen payment terms.

Implementation:
[`wallet-proof.mjs`](../../packages/accounts/wallet-proof.mjs),
[`financial-service.mjs`](../../packages/accounts/financial-service.mjs).

## Durable state and concurrency

Every record has a revision. Compare-and-swap rejects stale updates rather than
overwriting a newer record. Challenge consumption is one-way. Channel identity,
campaign version, counterparties, recipients and terms hashes remain immutable;
only the defined lifecycle fields can change.

Database indexes enforce one channel per campaign/app pair. An app's recipient
is pinned across its channel bindings. Listing is resource-scoped and bounded
to 100 records; each record is bounded to 256 KiB.

The Supabase repository fails explicitly if configuration, migration or response
validation fails. It does not silently switch to a local finance store. SQLite is
available only through the explicit fixture repository used by offline tests.

Implementation:
[`financial-repository.mjs`](../../packages/accounts/financial-repository.mjs).

## Receipt-linked payment lifecycle

The implemented own-wallet path freezes an approved campaign version and verified
app recipient, prepares a native Solana channel, and requires finalized funding
plus explicit advertiser activation before serving.

Accepted publisher receipts create ledger charges. The backend derives cumulative
voucher amounts from those charges; the payer signs the exact authorization
message. The amount is not supplied by the browser or advertiser model.

Cooperative closure uses both frozen owners' signatures, pays the app and returns
unused deposit to the payer. Closing does not create an extra delivery charge.
Unknown signed outcomes reconcile against their saved identity rather than
starting a replacement purchase.

Ownership proofs, deposits, accepted charges, cumulative authorizations and
finalized settlement are distinct states. Current own-wallet integration support
is Solana Devnet/test USDC. Historical shared-demo Solana and Tempo payment
evidence remains separately identified.

See [payment integration](ACCOUNT_PAYMENTS_RUNBOOK.md) for endpoints and
supported operating constraints.

## Verification results

Focused verification on 12 October 2026:

| Check | Result | Evidence scope |
| --- | ---: | --- |
| Finance repository and service | 24 passed | Offline persistence, ownership, CAS, broadcast gate and injected payment outcomes |
| Ownership-only acceptance | 5 passed | Real ephemeral Ed25519 signatures with separate fictional resource owners; no payment transport |
| Financial client and Wallet Standard | 16 passed | Request contracts, raw signing bytes, account changes and explicit wallet actions |
| Account finance panel | 10 passed | Component event fixtures, separate prepare/sign actions and no automatic connection |
| Dedicated Supabase finance schema | Passed | Actual table, RLS, ACL and fixed backend-only RPC |
| Backend repository access | Passed | Actual REST get/list through the configured Supabase repository |
| Cloud ownership rejection | Passed | Rollback-only unauthorized-role and unowned-binding checks |
| Existing account data preservation | Passed | Pre/post counts and whole-record hashes match |
| Repository hygiene | Passed | Repository checker and whitespace validation |

**55 focused automated checks passed**, with zero failures or skips on the final
runs. This count is not a fresh full-repository-suite result. The component checks
use an installed TypeScript compiler; no runtime dependency was added.

The new ownership-only test is
[`accounts-wallet-ownership.test.mjs`](../../tests/accounts-wallet-ownership.test.mjs).
Existing fixture SQL acceptance is
[`account_finance.sql`](../../supabase/tests/account_finance.sql), run only in its
disposable test environment, not as a cloud Auth or funded-channel simulation.

### Verification scope

The applied schema and backend reads are verified against Supabase. Cryptographic
ownership, restart and rejection behavior are verified with fixture resources.
Real user-selected wallet-extension verification and account-owned funded
settlement are separate acceptance steps. This verification moved no funds and
left broadcasts disabled; it does not claim those separate steps are complete.

### Real-account non-spending verification — 12 October 2026

Two isolated Supabase Auth test identities own separate advertiser/campaign and
AI-app resources. The existing disposable Devnet sponsor and publisher keys signed
their respective exact ownership messages locally, through an operator-only test
driver. This used the real account HTTP API and Supabase financial repository,
not an injected finance store. The test identities were admin-confirmed; this
run does not test email signup/confirmation. Both wallets remain test-controlled,
not independently controlled participant wallets.

- Unsigned challenges installed no wallet binding.
- Wrong-key and modified-message submissions were rejected; foreign account
  reads and verification requests returned 404.
- Funding and payout proofs were saved for their exact owning resources.
- Both bindings persisted after restarting the isolated account backend.
- Replaying each saved signature returned the identical binding and verification
  timestamp, without a new challenge or renewed authority.
- Actual database counts were two challenges, two bindings and zero channels.
  Broadcasts remained disabled. No funding, transaction, voucher or model endpoint
  was invoked; no funds moved.

The account-client ordering regression checks passed: concurrent panel requests,
failed-request queue release, no automatic mutation retries, session invalidation
and immediate sign-out fencing. The focused client run passed 72 tests; the
repository suite passed 733 with 23 optional skips (756 total). TypeScript and
repository hygiene checks passed. These totals describe this checkout, not a
deployment.

The browser detects MetaMask and loads saved account resources through the ordered
client. Separate real advertiser and AI-app sign-ins displayed their own saved
funding and payout proofs after restart; sign-out cleared owned browser state.
The Wallet Standard/panel fixture run also passed 17 checks with no failures.
Locally signing with existing test keys validates cloud ownership and
durability, **not** Wallet Standard extension prompts or a participant-funded
lifecycle. Those release gates remain separate. No landing, shared-demo or frozen
artifact source changed in this verification.

## Reproduce the focused checks

```sh
node --test tests/accounts-financial-repository.test.mjs tests/accounts-financial-service.test.mjs tests/accounts-wallet-ownership.test.mjs
node --experimental-strip-types --test apps/product-ui/src/components/accounts/financialClient.test.ts apps/product-ui/src/components/accounts/walletStandard.test.ts apps/product-ui/src/components/accounts/financialResources.test.mjs
node scripts/accounts/verify-finance-sql.mjs --isolated-fixture
node scripts/setup/check-repository.mjs
git diff --check
```

Install the repository's documented dependencies first. The SQL fixture command
uses a disposable local PostgreSQL container and rolls back its test records.
None of these commands requests live model inference or moves funds.
