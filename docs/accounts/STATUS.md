# Accounts/profile build result — 12 October 2026

Isolated branch `codex/accounts-profiles`, based on `5d47516`.
This is an implemented identity/profile foundation, not completed multi-tenant
campaign serving, customer wallet funding or publisher payout onboarding.

## Delivered

- Dedicated Supabase email/password provider adapter, authoritative user checks,
  explicit confirmation endpoint, server-side refresh and sign-out.
- Opaque HttpOnly sessions; exact-origin writes and session-bound CSRF.
- Personal profiles, owner organizations, advertiser profiles and multiple AI-app
  profiles. One person can own both sides. Other people's IDs do not grant access.
- Dedicated AXP Supabase PostgreSQL profile repository (new database migration
  and cloud acceptance status recorded below). Private SQLite/encrypted snapshots
  retain opaque sessions only in the real-provider runtime. Cookies are emitted
  only after session persistence succeeds; there is no local profile fallback.
- Separate `/account/` console, disabled-by-default hosted dispatch, static
  packaging and `npm run dev:accounts`. No marketing component edits.
- Contracts, component plan, runbook and explicit unavailable financial/serving
  capabilities. The old public shared demo is not made tenant-safe implicitly.

## Evidence and limits

- 52 focused account/client/static-packaging checks passed after the confirmation
  compatibility fix; no failures or skips in that focused command.
- Fresh review identified the native 56-hex confirmation hash incompatibility;
  both validators and fixtures were corrected. One bounded reviewer recheck ran
  all 46 account tests successfully and confirmed resolution.
- Product UI typecheck and Next static build passed, including `/account/` and
  existing advertiser/dashboard publisher pages.
- Final repository suite: 606 tests,
  585 passed, zero failed, 21 skipped. Native SDK checks are among the skips
  because this fresh worktree does not install the private prepared SDK. No new
  native payment or hosted integration acceptance is claimed.
- Actual browser fixture: Alice signed in, saved a personal name, organization,
  advertiser and AI-app profile; page reload retained them. Sign-out worked.
  Bob signed in and saw no organizations or Alice profiles. These are explicitly
  fictional provider responses, not live Supabase sign-in evidence.
- The newly connected Chrome profile allowed retrieval of only the public
  publishable key. It is saved in ignored `.env.local`, not source control.
- Real Supabase read-only settings returned 200: email enabled, sign-up allowed,
  email confirmation required. Local health reports configured provider/store.
  Human-operated signup, delivered confirmation email, email confirmation and
  signed-in session re-verification passed on 12 October. This is real Supabase/
  Resend acceptance, not a fixture. Expiry-driven token refresh and sign-out were
  not separately exercised with this human session. See `EMAIL_SETUP.md`.

No landing-page checkout edits, ContextHint changes, financial operations,
paid model calls, merge, push or deployment. The later approved cloud changes are
limited to auth-subdomain DNS, Resend sending credentials and AXP Supabase email/
redirect settings, documented in `EMAIL_SETUP.md`.

## Remaining gates

### Later account-network work (isolated branch, not merged/deployed)

`NETWORK_CONNECTION_RESULT.md` and `SHARED_SERVING_RESULT.md` supersede the
historical resource/serving gaps below. Account-owned campaigns and app SDK keys
are connected to the shared synthetic exchange on `codex/account-owned-network`.
The next own-wallet payment slice is locally implemented; see
`ACCOUNT_PAYMENTS_RESULT.md`, `ACCOUNT_PAYMENTS_RUNBOOK.md` and
`FINAL_ROLLOUT_CHECKLIST.md`. Its private finance migration is tested locally but
not cloud-applied; real wallet/native/hosted acceptance remains open. None of
these sidecar changes silently enables native payment in the existing demo.

Dedicated Supabase profile migration and real signed-in read acceptance now pass;
see `SUPABASE_DATABASE_RESULT.md` for cloud evidence, hashes and SQL rollback
acceptance. The local console uses Supabase profiles, not the fixture store.

1. Real browser advertiser/AI-app creation, reload/server-restart persistence and
   explicit sign-out acceptance now pass; see `END_TO_END_ACCEPTANCE.md`.
   Signup, email delivery, confirmation and verified signed-in reads also pass.
   Resend's latest overall domain status should still be checked independently
   before claiming every DNS record is fully verified.
2. Organization-scoped campaign management and app-scoped SDK credentials.
3. Enforced app restrictions and verified payout/financial authorization routing.

Only gate 1 is required to validate this sign-in/profile slice end to end;
gates 2–3 are separate product integration work before inviting real network users.
