# AXP accounts and profiles — isolated build

## North Star

Advertisers and AI-app operators sign in as people, own their organizations and
profiles, and see only their own resources. One person can do both jobs. This is
the identity/ownership foundation for a two-sided network, not a second auction
or payment ledger.

Worktree: `/private/tmp/axp-accounts.A49SWX/worktree`, branch
`codex/accounts-profiles`, base `5d47516`. Preserve the specialist's landing-page
checkout and all existing shared-demo state. No push, deployment, payment or
model calls in this build.

## Component phases and verification loop

1. **Identity and session boundary.** Dedicated AXP Supabase Auth project
   `qcejmyhaakoedjaqmcub`. Email/password sign-up, email confirmation, sign-in,
   refresh and sign-out. Provider verifies identity; AXP never accepts a browser
   user ID or trusts a decoded JWT alone. Opaque HttpOnly cookies; no passwords
   or bearer tokens in browser storage or API responses. Validate provider
   contracts, expiry, logout and missing configuration before advancing.
2. **Owned profiles.** Personal display name; organizations with owner membership;
   advertiser business profile; AI-app name, website, allowed origins, prohibited
   categories and payout configuration. One user may create both profile kinds.
   Test two users and denied cross-organization reads/writes, including forged IDs.
3. **Functional account console.** Separate `/account/` page and account API;
   create/edit profiles and inspect readiness. Use existing design tokens only;
   do not alter marketing or claim the old shared dashboard is tenant-isolated.
   Campaign routing, scoped app credentials and native recipient routing are
   explicit next integration gates, not automatically enabled by signing in.
4. **Integration and handoff.** Add disabled-by-default hosted account dispatch
   and loopback launcher; run account tests, typecheck and regression suite.
   Verify real Supabase sign-up/confirmation only with approved test identity and
   project configuration. Record fixture versus real-provider evidence separately.

After each phase: compare implementation to this goal, run its acceptance checks,
record the achieved gate and next blocker. No broad production-hardening cycle.

## Non-goals and safety boundaries

No tenant receives the shared demo wallet or its existing records. Native funding,
live ad serving, cross-app payouts and team invitations are not offered in the
profile slice. Payout addresses are declarations, not verified wallet ownership.
No ContextHint Auth/database changes. Do not migrate existing demo campaigns to a
new person's ownership implicitly. Supabase service-role/admin keys are unnecessary
for normal sign-in and must not be placed in frontend code.

## Builder ownership

Main: provider adapter, session HTTP API, hosted/local integration and verification.
Sol6.1-high builder: `packages/accounts/store.mjs` and `tests/accounts-store.test.mjs`.
Sol6.1-high builder: new account UI/client/types/routes only; no existing marketing
or dashboard components. Contracts below freeze shared interfaces before work.
