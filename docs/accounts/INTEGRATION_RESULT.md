# Accounts primary-checkout integration — 12 October 2026

## Completed

Real signup/confirmation was previously verified. The later authorized browser
acceptance created both advertiser and AI-app profiles, checked reload and server
restart persistence, independently read their Supabase bindings, and signed out.
After reload no private profile forms or authenticated identity returned. See
`END_TO_END_ACCEPTANCE.md`. Labelled test profiles remain in the owner's account.

The accounts source commits `035b0c4` and `fe90f8c` were merged locally into the
primary checkout `/Users/akshat/agentic-dsp`, keeping its existing `frontend`
branch, with merge commit `141fa362c34ce21fd2e716a56d60fdb83fa7f7f4`.
The merge was conflict-free. No branch switch, stash, reset, push or deployment.

## Landing preservation

Before merge, the primary HEAD was
`ca9e29a97d7117b87027c7a9e82f50b3dd622e26`.
All 340 tracked files under `apps/marketing` and `design-system` retained the
same filename/content SHA-256 aggregate before and after merge:

`ea1e9f0baf10359625ed56cac73a24609e070232ff4e0e2e5bf9595929e66629`

`git diff HEAD^1 HEAD -- apps/marketing design-system` was empty. Existing
landing commits remained parents of the merge. The untracked research handoff
`docs/research/AGENT_FACING_ADS_RESEARCH_AND_WEBMCP_HANDOFF.md` was left untouched.
No secrets, login sessions, wallets, database snapshots or screenshots were added
to Git. Dedicated Supabase schema was already applied; the merge does not rerun it.

## Post-merge checks

- Main repository suite: **611 tests, 605 passed, zero failed, six skipped**.
- Main product UI TypeScript check and production build passed, 27 generated
  pages including account, advertiser dashboard, publisher chat and SDK guide.
- Repository portability/staged hygiene passed with no findings.
- Browser checks used the main checkout's newly compiled product UI on a separate
  loopback harness with new synthetic state, no provider credentials, no native
  signing, and all POST operations rejected. Dashboard onboarding, publisher chat
  and chat settings loaded; both tabs had zero captured browser console errors.
  Provider-unavailable status was expected. No fresh organic answer, auction,
  delivery or payment is claimed by this read-only regression smoke.
- Account integration files in the primary checkout match the tested branch.

## Release boundary

Source is merged locally, not pushed or deployed. The existing hosted shared demo
and private funded state were not touched. Public account enablement still needs
its explicit environment configuration, exact HTTPS auth redirects and hosted
acceptance. The running local sign-out test used the isolated worktree; its
ignored session/configuration state was not copied into the main checkout or Git.
The primary repo can run its own `npm run dev:accounts` after setting the documented
ignored local configuration. Supabase is the profile source of truth, so profiles
do not depend on the isolated worktree's local storage.

Private campaign ownership, app-bound SDK credentials, enforced serving/payout
rules and real customer funding remain separate product integration gates.
