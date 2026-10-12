# Account-owned campaigns and app credentials

This guide describes owned campaign and credential operations. Approval, serving
enrollment and confirmed financial readiness are separate transitions.
Use [shared serving](SHARED_SERVING_RUNBOOK.md) and
[own-wallet finance](ACCOUNT_PAYMENTS_RUNBOOK.md) for those connections.
The legacy resource DTO's `not_connected` field does not override actual serving
or funding readiness.

## Storage and setup

Real operation uses the dedicated AXP Supabase project. Apply the existing
`20261012_axp_account_profiles.sql` migration first, then the additive
`20261012_axp_account_resources.sql`. Use the existing account environment setup
in [the account runbook](RUNBOOK.md); never use a service-role key in the browser.
`npm run dev:accounts` starts the account console. Real identity and resource
operations require the configured Supabase provider; an unavailable database is
not replaced with SQLite. Session persistence remains separate from resource data.

The explicit local browser fixture is different:

```sh
AXP_ACCOUNT_BROWSER_FIXTURE=1 node tests/support/accounts-browser.mjs
```

It serves `http://127.0.0.1:3497/account/` and accepts only the synthetic accounts
defined in that file. It makes no email, provider, model or payment calls. Its
disposable state is removed when the process stops. Do not use customer credentials
there or describe those tests as real Supabase sign-ins.

## Advertiser journey

1. Sign in, create/select an organization and save its advertiser profile.
2. Create a campaign draft with its offer, approved creative, authored hints,
   declared capabilities, bid ceiling, budget cap and test settlement network.
3. Inspect and approve the saved version. Approval records a content hash and
   atomically checks that the version you reviewed is still current. A concurrent
   edit returns a conflict; reload and review the new version before approving.
4. Editing creates a new version and removes approval. Approve that version again
   if desired. Approval is not activation: explicitly enroll the approved version
   through the separate serving interface and inspect actual readiness.

All owner operations use the verified session identity. A client cannot assign an
owner, advertiser, approval hash or version. Another owner's resource ID is treated
as not found. Campaign limits are integer base units, not floating point amounts;
Solana USDC and Tempo PathUSD are not combined.

## AI-app journey

1. Sign in separately, create/select an organization and save an AI-app profile.
2. Issue a credential for that app. Save the one-time raw value privately in the
   app's server environment, never a browser bundle, public repository or URL.
3. List credentials to inspect labels, scope, expiry and revocation status. The
   list never contains the raw key or its hash.
4. Rotate atomically to revoke the old key and issue its replacement, or revoke
   without replacement. Signing out ends the human session; it intentionally does
   not revoke independent server credentials.

Keys expire after 30 days; each app may have at most ten active keys. App identity
and restrictions come from the saved profile, not caller-supplied publisher IDs.

For server-side configuration inspection:

```js
const response = await fetch(`${process.env.AXP_ORIGIN}/api/accounts/sdk/publisher/config`, {
  headers: { 'x-axp-publisher-key': process.env.AXP_APP_KEY }
});
const config = await response.json();
// Inspect servingEnabled, financialMode, engine and catalogue readiness.
```

The existing publisher SDK may be initialized server-side with base URL
`${AXP_ORIGIN}/api/accounts/sdk`. With serving disabled, valid-key requests return
`503 account_serving_not_connected`. Enabled serving additionally requires
catalogue/provider readiness and the configured financial conditions. The SDK
preserves the independent answer on failure. These contracts alone are not proof
of completed hosted native acceptance.
No request is routed to the shared demo as a fallback. Browser-origin key requests
are rejected. Never expose private raw keys to inspect the public configuration.

## Verification

```sh
node --test tests/accounts-*.test.mjs
node scripts/accounts/verify-resource-sql.mjs --isolated-fixture
```

The SQL verifier needs the already installed `postgres:17` Docker image. It creates
a bounded disposable container with no network, exposed ports or host mounts,
runs both migrations and rollback acceptance scripts, then removes only that
container. Its Auth claims are explicit fixtures, not actual Supabase Auth users.

For cloud acceptance, run the resource rollback test only against the dedicated
AXP project after the reviewed migration is applied. The script must end in
`ROLLBACK`. It checks authenticated/anonymous role enforcement without persisting
test profiles or credentials. This is database acceptance, distinct from fresh
customer sign-up, a deployed account console and native financial acceptance.
