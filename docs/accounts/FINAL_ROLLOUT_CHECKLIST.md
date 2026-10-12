# Account network release verification

A release connects the advertiser's own campaign and the AI app's own integration
through one exchange, with inspectable decisions, disclosed delivery and accurate
financial state.

For the complete product and submission scope, see the
[release and submission checklist](../SUBMISSION_CHECKLIST.md).

## Verified foundation

- [x] Dedicated Supabase authentication and profile database integration implemented.
- [x] Owner-scoped campaign versions, approval and app credentials implemented.
- [x] Account SDK requests and app-bound delivery receipts connected to shared serving.
- [x] Private finance schema applied; backend REST access and database permissions verified.
- [x] Existing account data preserved during the additive finance migration.
- [x] Fifty-five focused finance, ownership, client and panel tests pass.
- [x] Ownership-only tests verify exact signatures, account/resource isolation,
  expiry, restart and replay without payment transport.
- [x] Broadcasts remain disabled during non-spending verification.

These checks identify the implemented and exercised foundation. They do not
replace the user-facing release checks below.

## Advertiser journey

- [x] A fresh advertiser completes signup, confirmation and sign-in.
- [x] Their profile and campaigns persist across reload and hosted requests.
- [x] Draft edits create versions; approval binds the exact creative and declarations.
- [x] Bid limits, campaign caps and pause are enforced in offline integration tests.
- [x] Saved reports distinguish exclusion, bid, skip, unavailable, win/loss and delivery.
- [x] Hosted spend and app reports reconcile the same receipt without competitor data.

## AI app journey

- [x] A fresh app owner creates a profile and configures allowed origins/restrictions.
- [x] Issue, rotate and revoke their server-only SDK key without exposing it to clients.
- [x] A separate app integrates against `/api/accounts/sdk`, not the shared demo API.
- [x] The independent answer remains separate from the Sponsored card.
- [x] Exact acknowledgement creates one receipt/charge; duplicates create no extra charge.
- [x] No-fill leaves the browser answer usable; provider failure and rejected
  delivery are covered with offline injected transports, not fresh hosted failures.
- [x] The app's receipt and earnings report is private to the correct owner.

## Own-wallet acceptance

- [ ] Separate advertiser and app owners prove their chosen wallets through real
  extension prompts, signing only the exact ownership messages.
- [ ] Rejecting a prompt produces no verified proof or claim of funding.
- [x] Hosted cryptographic wallet bindings persist through Supabase and sign-in;
  real wallet-extension connection/prompt acceptance remains unchecked above.
- [ ] A separately scoped testnet lifecycle verifies finalized deposits before serving.
- [ ] Accepted receipts drive cumulative authorizations using the frozen payer.
- [ ] Positive-spend and zero-spend closures reconcile payout and unused refund.
- [ ] Fees/rent are separate from delivery charges; unknown outcomes reconcile saved attempts.
- [ ] Native state, browser behavior and finalized chain evidence agree for the same run.

The current non-spending verification closes the schema and automated ownership
checks, not the real-wallet or funded lifecycle boxes.
See [finance verification](FINANCE_CLOUD_ACCEPTANCE.md).

## Release artifact and integration

- [ ] Pin the source revision, dependency locks, SDK artifact and evidence bundle.
- [ ] Reproduce setup in a fresh checkout without another developer's repository.
- [x] Repository/component checks, UI typecheck and static export pass on the
  identified candidate; the existing marketing deployment is not rebuilt here.
- [ ] Verify account, advertiser, publisher, SDK and recording routes together.
- [x] Preserve existing landing-page design, demo assets and historical run identities.
- [x] Hosted confirmed-owner/independent SDK acceptance and the deployed recovery
  followup pass; actual account assets match the verified build. See the dated
  [concurrency and recovery verification](ACCOUNT_CONCURRENCY_VERIFICATION.md).
- [ ] Check submitted links, captions and recordings from a signed-out browser.
- [ ] Confirm the final submission identifies the tested product and evidence scope.

## Supported financial model

Own-wallet accounts currently target Solana Devnet/test USDC. The payer explicitly
signs cumulative voucher increments; cooperative closure uses both frozen parties.
This is not unattended delegated buying. Current channel recipients and terms
cannot be redirected through profile edits.

Historical shared-demo Tempo support is separately documented. Own-wallet Tempo,
mainnet, automatic top-ups, new rails, inference credits and sponsored-access
experiments are outside this account release's current scope.

The current build slice follows phases 1–3 of the essential checklist: readiness,
private activity and one non-spending connected journey. The
[hosted account acceptance](HOSTED_ACCOUNT_ACCEPTANCE.md) exercises that journey
with separate confirmed owners and a standalone SDK consumer. Real-extension,
funded and concurrent-serving acceptance remain subsequent gates. Password
recovery and broader polish are deferred, not prerequisites for this bounded
verification.
