# Accounts and profiles operator runbook

## Local launch

Use Node >=22.18 and the repository's pinned pnpm workspace dependencies.
Run `pnpm install --frozen-lockfile`, then `npm run dev:accounts` from this checkout.
Open `http://127.0.0.1:3495/account/`. Port 3496 is its internal Next UI;
do not use it as the account origin. Stop the server with Ctrl-C.

Copy the account settings in `.env.example` to ignored `.env.local`. The dedicated
project is `https://qcejmyhaakoedjaqmcub.supabase.co`; use its public publishable
key, never a secret/service-role key. This worktree has the retrieved public key
in its ignored, mode-0600 `.env.local`. No credential needs committing.

Account data uses separate encrypted snapshots under ignored `local-state/accounts`.
Do not copy customer state into the shared product demo. The launcher does not
initialize model clients, financial adapters or the shared product backend.
Run only one product-ui development server in this checkout at a time because
Next's development output is shared within a checkout.

## Supabase setup still required before full confirmation acceptance

Read-only inspection on 12 October 2026 confirmed that email sign-up and email
confirmation are enabled. The real public-key settings endpoint returned HTTP 200.
The project's default Site URL was `http://localhost:3000`, with no redirect URLs.
The Emails screen required custom SMTP before editing confirmation templates.
No cloud settings, users, keys or templates were changed by this build.

An authorized operator must configure:

1. The exact local return URL `http://127.0.0.1:3495/account/` in the redirect
   allowlist, and an appropriate Site URL. Retain unrelated existing redirects.
   For a hosted release, use its exact HTTPS origin and configure
   `AXP_ACCOUNTS_ORIGIN` to match. Do not add wildcard preview origins.
2. A working email sender/SMTP configuration and confirmation email link:
   `<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=email">Confirm your AXP account</a>`.
   AXP supplies the allowlisted `/account/` redirect when requesting sign-up.
   Supabase's default fragment-token callback is intentionally not imported into
   an AXP session. Do not disable email confirmation to bypass setup.
3. One approved test identity. The human enters their own new password, completes
   confirmation, signs in, creates both profile types, refreshes, then signs out.
   Never paste confirmation hashes or provider tokens into logs or reports.

For hosted execution, set `AXP_ACCOUNTS_ENABLED=1`, provider URL/public key and
exact origin, plus the existing private durable CAS store and `AXP_STATE_KEY`.
Hosted file-only or unencrypted persistence is rejected. This branch has not been
deployed; a configured local health response is not hosted sign-up evidence.

## Repeatable checks

`node --experimental-strip-types --test tests/accounts-api.test.mjs tests/accounts-store.test.mjs apps/product-ui/src/components/accounts/client.test.ts apps/product-ui/src/components/accounts/api-contract.test.mjs tests/build-site/product-static.test.mjs`

`pnpm --filter @axp/product-ui typecheck`

`pnpm --filter @axp/product-ui exec next build`

`npm test`

For an explicitly fictional, offline browser check only:
`AXP_ACCOUNT_BROWSER_FIXTURE=1 node tests/support/accounts-browser.mjs`.
Open `http://127.0.0.1:3497/account/`. Fictional users are
`alice@example.test` and `bob@example.test`, password `fixture-only-password`.
This support server refuses hosted execution and sends no email. Its temporary
data is removed on normal shutdown. It must never be presented as Supabase
acceptance or enabled in a deployment.

## Next integration gate, not enabled by this build

Owned campaign operations must enforce organization identity throughout the
existing campaign/auction APIs. Publisher credentials must bind to an owned app;
serving restrictions and settlement recipients must come from that app, not
browser declarations. Do not route signed-in users to shared demo state and
describe it as private. Profile payout addresses are unverified declarations.
Password recovery, team invitations and verified wallet onboarding are not yet
implemented. Existing shared demo and landing page remain separate.
