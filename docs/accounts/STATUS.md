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
- Private SQLite scratch state and separately namespaced encrypted durable
  snapshots; cookies are emitted only after persistence succeeds.
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
  No real sign-up, confirmation email, token refresh or customer session has yet
  been exercised. SMTP/template and exact redirect setup remain open; see runbook.

No landing-page checkout edits, ContextHint changes, financial operations,
paid model calls, cloud configuration writes, merge, push or deployment.

## Remaining gates

1. Authorized Supabase redirect/sender/template setup and a human-operated
   real-provider sign-up → confirmation → sign-in → profile → sign-out test.
2. Organization-scoped campaign management and app-scoped SDK credentials.
3. Enforced app restrictions and verified payout/financial authorization routing.

Only gate 1 is required to validate this sign-in/profile slice end to end;
gates 2–3 are separate product integration work before inviting real network users.
