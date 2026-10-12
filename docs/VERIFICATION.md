# AXP verification and evidence

AXP's tests cover the connected advertiser-to-AI-app flow and its failure paths.
Hosted acceptance and recorded native settlement provide additional, separately
identified evidence. Each result below describes its own environment and run.

## Coverage matrix

| Capability | Exercised behavior | Evidence |
| --- | --- | --- |
| Identity and profiles | Email confirmation, sign-in, saved profiles, reload/restart persistence and sign-out | [Account acceptance](accounts/END_TO_END_ACCEPTANCE.md), [hosted acceptance](accounts/HOSTED_ACCOUNT_ACCEPTANCE.md), [live status](accounts/STATUS.md) |
| Campaign ownership | Distinct owners, inaccessible foreign resources, versioned approval, editing invalidates approval, enrollment | `tests/accounts-resource-api.test.mjs`, `tests/accounts-connected-journey.test.mjs` |
| App credentials | Server-only scope, rotation, revocation, expiry, wrong-app and browser-origin rejection | `tests/accounts-resource-store.test.mjs`, `tests/accounts-shared-serving.test.mjs`, hosted acceptance |
| Auction and limits | Eligibility before model evaluation, deterministic first-price bids, caps, reservations and pause | `tests/exchange/exchange.test.mjs`, `tests/accounts-network-catalog.test.mjs`, `tests/accounts-shared-serving.test.mjs` |
| SDK delivery | Exact Sponsored card below an independent answer, acknowledgement, matching private reports and no-fill | `tests/accounts-connected-journey.test.mjs`, `tests/publisher-sdk/`, hosted acceptance |
| Recovery | Original opportunity/receipt recovered after restart, duplicate acknowledgement retains charge, committed reads during an auction | `tests/accounts-hosted-concurrency.test.mjs`, [hosted recovery](accounts/ACCOUNT_CONCURRENCY_VERIFICATION.md) |
| Wallet ownership | Exact-message signatures, nonce/expiry/resource/origin binding, replay and invalid-signature rejection | `tests/accounts-wallet-ownership.test.mjs`, [cloud persistence](accounts/FINANCE_CLOUD_ACCEPTANCE.md) |
| Account finance | Frozen channel terms, broadcast gate, authorizations and reconciliation using injected transport | `tests/accounts-financial-service.test.mjs`, `tests/accounts-external-solana.test.mjs` |
| Database permissions | RLS/ACL ownership, fixed RPCs, immutable bindings, CAS and rollback | `supabase/tests/`, [database verification](accounts/SUPABASE_DATABASE_RESULT.md) |
| Native settlement | Saved finalized Solana/Tempo records, recipient/token deltas, payout/refund conservation | [Solana benchmark](../BENCHMARK.md), [Tempo lifecycle](product/TEMPO_VERIFICATION.md) |
| Interfaces and packaging | Account/dashboard/chat component contracts, TypeScript, SDK tarball imports, React SSR and NodeNext/Bundler types | Component tests, `tests/publisher-sdk/release.test.mjs`, `tests/accounts-preview-package.test.mjs` |

## Reproduce the current source checks

In a clean checkout without `.env.local`:

```sh
pnpm install --frozen-lockfile --ignore-scripts
npm run verify:review
```

The command uses Node's built-in test runner, explicit fixture transports and
loopback HTTP listeners. It stops on failure without automatic retries. Child
processes receive a minimal environment with account broadcasts disabled and
without provider, wallet, database, auth or npm-token environment variables.
It does not deploy, migrate a cloud database, request paid models or broadcast
transactions. It does not start a browser or replace a hosted acceptance run.

Checks run in order:

1. Local file targets in the review-entry documentation.
2. All repository `tests/**/*.test.mjs`, including SDK packed-consumer checks.
3. Account, advertiser dashboard and publisher chat component tests.
4. Product and marketing TypeScript checks.
5. Generated React SDK parity and repository/index hygiene.

The link check covers the listed review documents and local file existence, not
remote URL reachability or section anchors. The hygiene check is a focused source,
vendor-integrity and staged-file guard, not a comprehensive security audit.

### Verification checkpoint

On 13 October 2026, the baseline source `030e5b6c4bd1339da44c7b2c4726d88ea31ec784`
passed **806 repository tests**, with **23 optional skips** and zero failures,
and **90 account/dashboard/chat component checks**, with zero failures or skips.
These are freshly rerun offline checks, not another hosted or funded execution.
The review entry-point addition passed **811 repository tests**, with **23 optional
skips**, and **90 component checks**, with zero failures. Both UI typechecks,
generated React SDK parity, review-document links and repository hygiene passed.
The command's terminal totals remain authoritative for the revision being reviewed.
The [sanitized source-verification record](../artifacts/review/source-verification-20261013.json)
pins this review's base revision, runner/test/lockfile hashes and per-check results.

Separate checks also passed the product and marketing production static exports,
referenced assets on all six account/dashboard/chat/SDK/landing/recording entry
pages, and both isolated PostgreSQL fixture scripts. Read-only live checks returned
200 for the account, dashboard, chat, SDK and recording pages; signed-out owned
organization access returned 401. Live account health reported synthetic mode,
native funding unavailable and broadcasts disabled. These GETs performed no new
sign-in, auction, acknowledgement or payment action.

Optional checks include pinned native SDK/codec prerequisites and explicitly
opt-in source-data integration. The clean-checkout command does not enable live
source-data tests. Their skip labels identify the condition. A skip is not a
passed integration; fixture cryptographic signing is not an on-chain action.

## Optional isolated PostgreSQL acceptance

With Docker running and `postgres:17` already installed:

```sh
node scripts/accounts/verify-resource-sql.mjs --isolated-fixture
node scripts/accounts/verify-finance-sql.mjs --isolated-fixture
```

Each script creates its own network-disabled disposable container, applies the
committed schema and tests with fixture Auth claims, then removes only that
container. There are no host mounts, listening ports or cloud credentials.
These commands do not mutate the dedicated hosted Supabase project.

## Evidence interpretation

The hosted account journey used two confirmed owners, one real Jev evaluation
and synthetic delivery accounting. Its receipt/report reconciliation and saved
cryptographic wallet bindings are verified. Account broadcasts are disabled;
this result is not an account-owned deposit or payout.

Recorded Solana and Tempo executions establish their identified testnet payment
outcomes. Participant-selected wallet-extension prompts and a funded account-owned
lifecycle are separate from those results. Historical acceptance reports retain
their original dates and counts. Local accounting fixtures, hosted model calls
and finalized chain transactions are never combined into one performance claim.

The SDK artifact is locally packable; registry publication is separate. A receipt
authenticates accepted app-reported insertion and disclosure, not human attention,
ad effectiveness or completed cash settlement.
