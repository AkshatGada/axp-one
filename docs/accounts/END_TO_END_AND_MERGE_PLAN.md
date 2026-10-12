# Accounts acceptance and frontend-safe integration — 12 October 2026

Approved: create advertiser and AI-app profiles through the real signed-in local
console, verify persistence and sign-out, then merge accounts into the primary AXP
checkout without changing the specialist's landing page. No push or deployment.

1. Use the existing human-operated confirmed session. Create one clearly labelled
   `AXP Acceptance Test — 12 Oct 2026` organization, `AXP Test Advertiser` and
   `AXP Test Chat App`. Use reserved `.example.test` domains; no payout declaration,
   wallet operations, campaigns, provider model calls or SDK credentials.
2. Reload and restart the isolated account server. Verify saved form contents and
   the same resource IDs against read-only Supabase rows. Do not export tokens.
3. Sign out explicitly; reload and confirm profiles/owned writes are unavailable.
   Check the private session is invalidated without printing cookies or tokens.
   Keep the labelled test profiles in the owner's account; do not silently delete.
4. Record real acceptance separately from prior fixtures. Stage only account
   implementation, contracts, migrations, tests and additive integration files.
   Run focused checks, product UI build and repository hygiene before committing.
5. Immediately before merge, snapshot the primary checkout HEAD, landing/design
   tree hashes and unrelated work. If account integration paths overlap new edits,
   resolve narrowly or stop; never stash/reset/rewrite specialist work.
6. Merge the accounts branch into the primary checkout's current `frontend`
   branch. Verify no landing/design changes, preserved untracked research and
   account code identity. Do not change branches, push or trigger deployment.
7. Run repository regressions, UI typecheck/build with a separate build directory,
   and browser smoke checks of dashboard and publisher chat without models/payments.
   Public account hosting stays disabled until separately configured and released.

Signed-in profile tests do not establish private campaign serving, native funding,
app credentials or tenant-specific settlement. These remain separate product gates.
