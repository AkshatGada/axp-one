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

Personal, organization, advertiser and AI-app profiles use the dedicated AXP
Supabase PostgreSQL database (`AXP_ACCOUNTS_PROFILE_STORE=supabase`, the default).
Apply `supabase/migrations/20261012_axp_account_profiles.sql` before launch; run
`supabase/tests/account_profiles.sql` for rollback-only database acceptance.
No service-role key is required: profile RPCs use the provider-verified person's
JWT and database owner policies. Database failure never selects local profiles.
Opaque sessions use separate encrypted snapshots under ignored `local-state/accounts`.
Their SQLite identity reference exists only for session integrity, not as a profile
source of truth. The legacy SQLite profile adapter is an offline fixture only.
Do not copy customer state into the shared product demo. The launcher does not
initialize model clients, financial adapters or the shared product backend.
Run only one product-ui development server in this checkout at a time because
Next's development output is shared within a checkout.

## Supabase email configuration and confirmation acceptance

Read-only inspection on 12 October 2026 confirmed that email sign-up and email
confirmation are enabled. The real public-key settings endpoint returned HTTP 200.
The project's default Site URL was `http://localhost:3000`, with no redirect URLs.
The Emails screen required custom SMTP before editing confirmation templates.
The authorized follow-up configured Resend SMTP, the AXP confirmation template,
and the exact local redirect. See `EMAIL_SETUP.md` for the saved provider state
and remaining verification gates. No real-user acceptance is implied by setup.

The configured local setup is:

1. The exact local return URL `http://127.0.0.1:3495/account/` is the Site URL and
   sole redirect allowlist entry. Retain unrelated redirects if added later.
   For a hosted release, use its exact HTTPS origin and configure
   `AXP_ACCOUNTS_ORIGIN` to match. Do not add wildcard preview origins.
2. Resend SMTP is saved with sender `AXP <noreply@auth.axp.one>`, and the
   confirmation email uses this link:
   `<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=email">Confirm your AXP account</a>`.
   AXP supplies the allowlisted `/account/` redirect when requesting sign-up.
   Supabase's default fragment-token callback is intentionally not imported into
   an AXP session. Do not disable email confirmation to bypass setup.
3. On 12 October the human signed up, received the confirmation email (Resend:
   delivered), confirmed email, and remained signed in after Refresh account.
   The independent Supabase user record shows signup and last-sign-in timestamps.
   The later authorized browser acceptance created both labelled profile types,
   verified reload/server-restart persistence and explicitly signed out; see
   `END_TO_END_ACCEPTANCE.md`. The labelled test records remain for inspection.
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
