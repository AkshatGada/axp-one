# Isolated account Preview preflight

`packages/accounts/release-preflight.mjs` inspects configuration without creating
an account service, KV adapter, database connection, payment transport or model
worker. `scripts/accounts/release-preflight.mjs` exposes the inspection as JSON.
It does not load an environment file automatically or change existing settings.

This is a bounded non-spending check, not a deployment or infrastructure manager.
It does not access landing/demo endpoints, initialize snapshots, prepare native
transactions, sign, broadcast, call models, send email or write KV/database state.
The existing landing, demo configuration and historical state are unchanged.

## Invocation

Run from the repository root using Node 22.18 or newer. Supply the isolated hosted
Preview environment through the operator's process environment. The expected
origin must be an independently selected exact HTTPS origin, without a path,
trailing slash, credentials, query or fragment; the production `axp.one` and
`www.axp.one` origins are rejected.

```sh
node scripts/accounts/release-preflight.mjs \
  --expected-origin https://EXACT-ACCOUNT-PREVIEW-HOST
```

Optional health inspection:

```sh
node scripts/accounts/release-preflight.mjs \
  --expected-origin https://EXACT-ACCOUNT-PREVIEW-HOST --health
```

Both commands return exit code 0 only when every requested check passes, otherwise
1. Without `--health`, success means configuration checks only; hosted readiness
is not established. `--help` prints usage. Unknown arguments fail closed without
echoing their values. Do not put secrets in command-line arguments. No secrets,
raw environment values, remote response bodies or exception text appear in JSON.
Keep private operator configuration and raw run evidence outside the repository.

## Configuration gates

- `VERCEL=1`, `VERCEL_ENV=preview`, `AXP_ACCOUNTS_ENABLED=1` and
  `AXP_ACCOUNT_SERVING_ENABLED=1`.
- `AXP_ACCOUNTS_ORIGIN` exactly matches the supplied expected origin.
- `AXP_SUPABASE_URL` is exactly
  `https://qcejmyhaakoedjaqmcub.supabase.co` (optional final slash).
- `AXP_ACCOUNTS_PROFILE_STORE=supabase`; SQLite fixtures are rejected.
- `AXP_SUPABASE_PUBLISHABLE_KEY` has the existing `sb_publishable_` format and
  `AXP_NETWORK_SUPABASE_SECRET_KEY` has the existing backend `sb_secret_` format.
  Inspection validates format, not credential validity or project ownership.
  See [Supabase key guidance](https://supabase.com/docs/guides/getting-started/api-keys).
- `AXP_ACCOUNT_FINANCIAL_MODE` is `synthetic` (the existing default) or `devnet`.
  Devnet requires `AXP_ACCOUNT_PAYMENTS_ENABLED=1`. Synthetic mode may omit that
  setting or use `0`/`1`; it is never reported as native settlement evidence.
- `AXP_ACCOUNT_PAYMENT_BROADCAST_ENABLED=0` explicitly; omission also fails.
- The shared product demo is not enabled (`AXP_PRODUCT_ENABLED` is not `1`),
  and `AXP_ACCOUNT_BROWSER_FIXTURE` is not `1` in this isolated Preview.
- The selected durable backend is private Blob or authenticated HTTPS Upstash,
  using existing `AXP_RUN_STORE`, `BLOB_READ_WRITE_TOKEN`, `KV_REST_API_URL/TOKEN`
  or `UPSTASH_REDIS_REST_URL/TOKEN` selection. File, unknown and incomplete
  configurations fail. Blob API overrides other than the existing canonical
  endpoint are rejected. These are configuration checks, not a cloud privacy,
  reachability, retention or CAS-durability audit.
- `AXP_STATE_KEY` is canonical base64 encoding of 32 bytes. This does not generate,
  rotate or test decryption with that key.
- Account namespace identities are fixed by existing backend source:
  `axp-accounts-v1` for sessions, `axp-account-network-v1` for synthetic serving,
  `axp-account-network-native-v1` for native serving, all with storage kind
  `accounts`. The configured product workspace (default `demo`) must not collide
  with any of these. This does not introduce configurable account identities or
  prove that a configured Blob/Redis binding is isolated from every other Preview.

## Health evidence and limits

Only after all configuration checks pass, `--health` makes one unauthenticated
`GET /api/accounts/health` on the exact expected origin, with redirects rejected,
cookies omitted, no API/SDK key header, no retries and a five-second timeout.
No Supabase, KV, SDK configuration or demo URL is called directly by the tool.
Deployment-protected responses fail; the tool does not forward bypass credentials.

The existing backend health implementation uses its own catalogue credential to
read the campaign catalogue and, when payments are enabled, probe the finance
repository. The preflight checks account/resource configuration, catalogue
readiness, financial mode, wallet-binding readiness where applicable and disabled
broadcast/native-funding flags. It projects only fixed check identifiers, booleans
and allowlisted readiness labels; arbitrary health errors/details are discarded.
Catalogue/finance readiness reflects those existing probes, not a complete schema
audit. Profile schema access is explicitly `not_checked` by this public endpoint.
The endpoint does not attest the exact project, origin, KV binding or encryption
key; those are checked only in the supplied configuration. Match that configuration
to the deployed revision/environment separately.

Neither a passing configuration nor health response proves real sign-in, email
confirmation allowlists, owner isolation, browser wallet prompts, funded channels,
model availability, accepted delivery or finalized settlement. Those remain the
separate checks in [the release checklist](FINAL_ROLLOUT_CHECKLIST.md). This tool
does not authorize them or production activation.

## Offline verification

```sh
node --test tests/accounts-release-preflight.test.mjs
node --test tests/accounts-*.test.mjs
```

Tests inject configuration, responses and transport failures. They cover valid
native/synthetic settings, exact project/origin, fixture rejection, storage and
encryption gates, namespace collisions, disabled broadcasts, the sole health
request, failure handling and output redaction. They are not hosted acceptance.
