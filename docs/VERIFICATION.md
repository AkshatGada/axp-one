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
| Native settlement | Saved finalized Solana/Tempo records, recipient/token deltas, payout/refund conservation | [Account-owned Solana acceptance](accounts/DEVNET_ACCEPTANCE.md), [Solana benchmark](../BENCHMARK.md), [Tempo lifecycle](product/TEMPO_VERIFICATION.md) |
| Interfaces and packaging | Account/dashboard/chat component contracts, TypeScript, SDK tarball imports, React SSR and NodeNext/Bundler types | [Public npm release](sdk-cleanroom/NPM_RELEASE.md), component tests, `tests/publisher-sdk/release.test.mjs`, `tests/accounts-preview-package.test.mjs` |

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

On 13 October 2026, merged release source
`3f54535448cbc5551662ed65e73cb942f690395a` passed **811 repository tests**, with
**23 optional skips** and zero failures, and **90 account/dashboard/chat component
checks**, with zero failures or skips. Both UI typechecks, generated React SDK
parity, review-document links and repository hygiene passed. The separate SDK
release gate passed **47 tests**; the explicit pinned native account adapter run
passed **25 tests** without RPC or skips. These check sets overlap and must not be
summed as unique cases. Source checks are not another hosted or funded execution.
The command's terminal totals remain authoritative for the revision being reviewed.
The [sanitized source-verification record](../artifacts/review/source-verification-20261013.json)
preserves the earlier review's original base revision, runner/test/lockfile hashes
and per-check results; it is not rewritten to describe a later release.

Separate checks also passed the product and marketing production static exports,
referenced assets on all six account/dashboard/chat/SDK/landing/recording entry
pages, and both isolated PostgreSQL fixture scripts. Read-only live checks returned
200 for the account, dashboard, chat, SDK and recording pages; signed-out owned
organization access returned 401. Live account health reported synthetic mode,
native funding unavailable and broadcasts disabled. These GETs performed no new
sign-in, auction, acknowledgement or payment action.

### Dependency verification

The [dependency follow-up record](../artifacts/review/dependency-verification-20261013.json)
records **814 passing repository tests**, **23 optional skips**, **90 passing
component checks** and zero failures after the dependency patch, with both UI
typechecks, SDK parity, reviewer links and repository hygiene passing. It is a
source-check record, not another hosted acceptance run.

The workspace override pins Next's transitive PostCSS to **8.5.23**, retaining the
existing framework and React versions. The committed lockfile preserves that
resolution for both UI apps. After locked installation, run:

```sh
pnpm audit --prod
```

This queries the registry's current advisory data without changing dependencies.
It is distinct from `verify:review`'s offline source checks; a clean advisory result
is not a comprehensive security audit.

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

The [isolated account-owned Solana run](accounts/DEVNET_ACCEPTANCE.md) used real
confirmed owners, the public SDK and disposable test signers: 0.020 test USDC
deposited, two accepted placements, 0.008 paid and 0.012 refunded, with the channel
finalized and closed. Its runtime was local and its ad decisions/answer were
fixtures. It is not hosted production payment or participant wallet-extension
acceptance. Its read-only verifier is `node scripts/accounts/verify-devnet.mjs`.

Recorded shared-demo Solana and Tempo executions retain their own identified
testnet outcomes. Historical acceptance reports keep their original dates and
counts. Local accounting fixtures, hosted model calls and finalized chain
transactions are never combined into one performance claim.

The [public SDK release](sdk-cleanroom/NPM_RELEASE.md) is
`@axp001/publisher-sdk@0.2.1`, MIT licensed for the SDK only. A credential-free npm
install and registry-integrity/source-file checks passed. A receipt authenticates
accepted app-reported insertion and disclosure, not human attention, ad
effectiveness or completed cash settlement.
