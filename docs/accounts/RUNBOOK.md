# Accounts and profiles integration

## Local setup

Use the supported Node runtime and pinned workspace dependencies.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
npm run dev:accounts
```

The default account origin is http://127.0.0.1:3495/account/. Configure the
provider URL, publishable key and exact account origin in the ignored environment
file. A Supabase publishable key is distinct from a backend secret/service-role key.
Use a dedicated AXP project, not ContextHint's data service.

Profiles use Supabase PostgreSQL through verified person-scoped operations.
Apply the versioned migrations in order; startup does not apply schema changes.
A database failure is unavailable state, never automatic SQLite profile fallback.
The SQLite profile adapter is for explicit offline fixtures only.

Opaque sessions have separate encrypted durable storage. Their local identity
reference is not the profile source of truth. Hosted execution requires supported
durable CAS storage and an encryption key; unencrypted file-only hosted state is
rejected. Never copy customer state into the shared demonstration namespace.

## Email confirmation and sign-out

Configure a verified transactional sender and an exact redirect allowlist matching
the account origin. The confirmation template passes token_hash and type=email
to the account callback; confirmation tokens are exchanged server-side, then
removed from the browser URL. Do not disable confirmation or log provider tokens.

Sign-in establishes an opaque application session. Reload/server restart should
retain it; sign-out invalidates it. Independent app SDK credentials intentionally
survive human sign-out until expired/revoked.

[Email integration](EMAIL_SETUP.md),
[real account acceptance](END_TO_END_ACCEPTANCE.md) and
[database verification](SUPABASE_DATABASE_RESULT.md) record the exercised flows.

## Owned resources and serving

[Resource operations](RESOURCE_OPERATOR_GUIDE.md) add approved campaign versions
and app credentials. [Shared serving](SHARED_SERVING_RUNBOOK.md) connects account
inventory to auctions and receipts in a separate SDK namespace.
[Own-wallet integration](ACCOUNT_PAYMENTS_RUNBOOK.md) adds verified funding/payee
bindings; profile address text alone is not wallet ownership.

See [status](STATUS.md) for remaining wallet/hosted gates. Local schema/build
success does not establish a currently deployed hosted account service.

## Non-spending verification

```sh
node --test tests/accounts-*.test.mjs
node scripts/accounts/verify-resource-sql.mjs --isolated-fixture
npm test
```

An explicit browser fixture is available through
`AXP_ACCOUNT_BROWSER_FIXTURE=1 node tests/support/accounts-browser.mjs`.
Its fictional users and disposable data are not Supabase acceptance. It refuses
hosted use and sends no email, models or payments. Do not put customer credentials
into it. Native broadcast stays disabled during ordinary verification.
