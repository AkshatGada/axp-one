# Account-owned network integration

Verified locally on 12 October 2026. This is a source integration record, not a
deployment or funded acceptance claim.

## Integrated revision

Merge `1fc5fa768f35174264be86b831a89450d491ba28` integrates
`codex/account-owned-network` into the primary AXP checkout's existing `frontend`
branch. Its first parent is `ef900848162050652f4a0533102f45a973d9a153`;
its account source parent is `f9f94c3`.

The conflict-free merge includes campaign ownership and approval, app-scoped SDK
credentials, shared account auctions and receipts, private activity/readiness,
Supabase financial persistence, exact wallet-control proofs and the own-wallet
Solana transport. The implementation remains separate from the shared demo API
and financial state. No existing landing commit was reverted or replaced.

## Regression results on the merged checkout

| Check | Result |
| --- | --- |
| `npm test` | 748 passed, 8 optional skipped, zero failed; 756 total |
| Focused connected-account/SDK/ownership checks | 64 passed, zero failed |
| Account client, financial client, Wallet Standard and finance panel | 49 passed, zero failed |
| Product UI TypeScript | Passed |
| Repository hygiene and whitespace checks | Passed |
| Main account console | Loads; identifies Supabase PostgreSQL and preserves explicit unavailable serving/funding gates |
| Dedicated Supabase finance records, read-only check | Two ownership challenges, two bindings, zero channels |

The eight optional skips are not native-network acceptance. Test results from
other checkouts can differ because optional installed SDK/tooling differs.
All executed integration/model/payment tests here use offline fixtures; no fresh
model inference, native payment signing, broadcast or funds movement was performed.
The real non-spending ownership run is documented separately in
[finance verification](FINANCE_CLOUD_ACCEPTANCE.md).

## Preservation checks

All 916 tracked files in the following preservation set have the same
filename-and-content SHA-256 aggregate before and after the merge:

- Marketing sources and assets.
- Product UI outside the account components, including dashboard, publisher chat,
  original explorer and their routes.
- Product backend, payment packages and publisher SDK.
- Design system, historical artifacts and recordings.

Aggregate: `f486aa3b66620f70c6a552aa6055b9def7a4dd452ef3d97990d73cf833aa8a1c`.
The primary checkout's ignored environment file is unchanged. Private keys,
credential files, ownership test state and generated browser caches were not
copied or committed. Existing historical evidence retains its original identity.

## Activation boundary

Account serving and account payments remain opt-in. The primary environment does
not enable either capability or the account broadcast flag; defaults are disabled.
The previously running local account process was not restarted or reconfigured.
No migration was rerun. No branch was pushed and no deployment was requested.

Participant wallet-extension acceptance, an explicitly authorized bounded funded
run and independent hosted account/SDK acceptance remain separate release gates.
See [essential release checklist](../SUBMISSION_CHECKLIST.md).
