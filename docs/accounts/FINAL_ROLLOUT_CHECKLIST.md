# Final rollout checklist

Assessment: 12 October 2026, committed baseline `0e00aac0d27a5a1eacbf7877b565439cdcfecb31`
on `codex/account-owned-network`, plus concurrent uncommitted funding work observed
during inspection. Submission is close; no deadline is assumed.
Prioritize a usable advertiser/AI-app product, not another infrastructure or
benchmark cycle. This checklist is a plan, not release or spending authorization.

## Execution update — local account-payment build

The account-payment sidecar and functional Wallet Standard panel are now
implemented and locally verified. See `ACCOUNT_PAYMENTS_RESULT.md` for final
test counts and precise boundaries. The finance migration passed disposable
PostgreSQL acceptance but has **not** been applied to the cloud. Browser checks
used separate fictional advertiser/app identities, no connected wallet and
broadcast disabled; they prove resource scoping/readiness/sign-out, not funding.
Pinned SDK recovery/transaction-format tests are offline. Native lifecycle,
real wallet extension acceptance, integration and hosted rollout remain open.

Work next in this order:

1. Approve/apply the additive private finance migration, then test real ownership
   proofs with separate advertiser/app owners. Keep broadcast off initially.
2. Approve a bounded native pilot: positive and zero-spend closure, cumulative
   receipt-linked authorizations, rejected prompts and restart/recovery. Signed
   expiry/failed-transaction recovery and unilateral exit remain explicit gaps.
3. Complete spend/earnings statements and the opportunity funnel; finish password
   recovery and the account-specific first-integration guide.
4. Agree on unattended spending authority before inviting always-on advertisers:
   this version requires an advertiser wallet prompt per cumulative increment
   and both owners for cooperative closure. Do not silently introduce a hosted
   wallet or reuse the shared demo signer. A bounded, revocable delegation needs
   its own user-approved design and acceptance, not production-hardening scope.
5. Integrate without marketing overlap, run an independent hosted owner journey,
   freeze the exact submission artifact and evidence-backed claims, then release
   only the functionality actually accepted in that environment.

These are functional rollout gates. Inference credits, agent-facing sponsored
access, additional payment rails and scale benchmarks stay out of this release.

## Confirmed built versus not yet proved

| Area | Local evidence and remaining boundary |
| --- | --- |
| Accounts and profiles | Email/password, confirmation, verified sessions, organizations, both profile types and sign-out exist in `packages/accounts/{api,supabase,store,supabase-store}.mjs` and `/account/`. `END_TO_END_ACCEPTANCE.md` records actual local-browser/Supabase profile persistence and sign-out. Password recovery is absent; hosted lifecycle acceptance remains open. |
| Campaigns and app keys | Owned versioned drafts, exact-version approval, issue/list/rotate/revoke/expiry exist in `api.mjs`, `resources.mjs` and account forms. Approval is not activation. Four-identity resource acceptance is fixture evidence in `NETWORK_CONNECTION_RESULT.md`, not four real customer signups. |
| Actual shared serving | `network-service.mjs` and `/api/accounts/sdk` connect multiple advertisers/apps to **one shared exchange**, with private reports, app-bound receipts and aggregate caps. The accepted phase-4 evidence is **synthetic accounting**, not merely an unconnected keys prototype and not native payment acceptance. Concurrent native-mode extensions remain unverified below. `SHARED_SERVING_RESULT.md` records 673 passes/21 skips, fixture SDK/browser acceptance and dedicated Supabase migration checks; those results were not rerun here. |
| Own-wallet funding | Locally implemented and tested: ownership proofs, private CAS financial records, frozen recipient/channel terms, own-wallet native transport, cumulative voucher recovery, separate activation and functional account panel. Integration payment outcomes are fixtures; real pinned SDK checks are offline. Migration/cloud/native lifecycle and real wallet prompts remain unaccepted. A payout declaration is not wallet proof. See `ACCOUNT_PAYMENTS_RESULT.md`. |
| Existing native demo | Separate `/api/product` shared sponsor and historical Solana/Tempo proof exist. They do not prove account-owned funding or app-specific payout. Solana Devnet/test USDC and Tempo Moderato/test PathUSD are different rails; own-wallet Tempo is explicitly deferred by the account-payment plan. |
| SDK and keyboard | SDK source is 0.2.0, locally packable; `prepublishOnly` forbids publication. Current dashboard/chat have no Tab autofill. This assessment reran `tests/product/keyboard.test.mjs`: **3 passed, 0 failed/skipped**, no external network. Browser/hosted keyboard checks remain separate. |

Profile-only integration was merged locally earlier (`INTEGRATION_RESULT.md`).
That is not evidence that this later campaign/shared-serving branch was merged,
pushed or deployed. No hosted state was inspected for this assessment. Earlier
phase-1–3 `not_connected` documentation is historical: current opt-in/config
readiness is authoritative, not the legacy campaign DTO's `servingStatus` alone.

## Top blockers, in order

1. Account-owned funding/payout is built locally but not live accepted end to end. Do not pitch the
   shared sponsor or synthetic account receipts as customer-wallet payments.
2. No independently usable hosted four-owner journey is established for this
   branch; merge, environment/redirect setup and hosted smoke are separate gates.
3. Advertiser/app reports cannot yet explain the whole funnel: current reports
   show accepted/reserved synthetic totals and at most 100 receipt rows, not
   evaluated opportunities, losses, no-fill breakdowns or finalized earnings.
4. Public SDK/onboarding still leads to the shared `/api/product` demo. Account
   users need `/api/accounts/sdk`, their own key, actual restrictions/readiness
   and clear no-fill/recovery instructions. Password recovery is missing.
5. Submission assets must separate built-local, fixture, historical native and
   hosted claims, and attribute ContextHint traction to ContextHint, not AXP.

Unchecked gates below remain open even when an underlying component is built.
Close each with the exact release commit/environment, test log or sanitized
browser trace, resource/receipt correlations and explicit fixture/live labels.
Never include passwords, session/confirmation tokens, SDK keys or private vouchers.

### Highest-priority next functional items

1. Finish the **own-wallet browser journey** against the concurrent backend:
   funding and payout proofs, understandable signing prompts, rejected signatures,
   frozen recipient/channel terms, voucher/close actions and unknown-outcome recovery.
   Keep status unverified until the owner supplies the candidate's verification.
2. Connect **private advertiser spend and app earnings views** to the same ledger:
   reserved → accepted → authorized → finalized paid/refunded, exact recipients,
   shared caps and separate assets. No second frontend ledger or synthetic-to-native
   history conversion.
3. Complete **password recovery and account lifecycle UX**, including real email
   callback, expiry refresh and sign-out; preserve the working role-private journey.
4. Make **account SDK onboarding, readiness/no-fill and usage explanations** usable
   without builder help: correct endpoint/key, own model, supported restrictions,
   first receipt, recovery and clear reasons when nothing serves.
5. Freeze **truthful submission assets**, then obtain approval for frontend-safe
   integration and exact hosted smoke. Native pilot and public access remain later
   evidence gates, not assumptions made to meet an invented deadline.

## Phase 0 — before submission

- [ ] **Freeze an honest submission scope — remaining, owner decision.** Choose
  either an explicitly synthetic account-network demonstration plus separately
  labelled historical native proof, or a newly accepted own-wallet demonstration.
  **Acceptance:** an owner-reviewed claim-to-evidence sheet maps every video,
  screenshot and submission sentence to the exact environment/run/commit. Missing
  funding or hosting evidence is labelled unavailable, not silently implied done.

- [ ] **Show the complete private advertiser journey — built locally; release
  acceptance remaining.** `/account/`: sign in → owned organization/advertiser →
  draft → edit → review saved version → approve → explicitly enable synthetic
  serving → inspect private report → pause. Keep `/advertiser-dashboard/` labelled
  as the separate shared demo, not the signed-in person's private dashboard.
  **Acceptance:** a two-advertiser browser trace shows persistence after reload,
  a two-tab stale approval returning `409 campaign_version_conflict`, edits
  invalidating approval/enrollment, pause stopping new awards while an existing
  valid award retains its terms, and foreign campaign/report reads/writes returning
  404. Grounding: `tests/accounts-resource-api.test.mjs`,
  `tests/accounts-serving-store.test.mjs`, `tests/accounts-shared-serving.test.mjs`.

- [ ] **Show the private AI-app journey and shared inventory — built locally;
  connected release acceptance remaining.** Register/select an app → issue a
  one-time server key → SDK config/request → exact separate Sponsored card below
  the independent answer → acknowledge → own report → rotate/revoke/sign out.
  **Acceptance:** two app owners use `/api/accounts/sdk` against the same opted-in
  inventory; identical session/turn strings remain app-bound; the original receipt
  and charge survive restart/lost-response lookup; foreign app access fails; old
  rotated/revoked/expired keys return 401. Human sign-out ends owner access but
  intentionally does not revoke the app's server credential. Source/tests:
  `network-service.mjs`, `tests/accounts-resource-api.test.mjs`,
  `tests/accounts-shared-serving.test.mjs`, `tests/publisher-sdk/pilot-sdk.test.mjs`.

- [ ] **Finish and review the own-wallet build, or explicitly exclude it from
  submission claims — implementation/verification remaining.** Follow
  `ACCOUNT_PAYMENTS_PLAN.md`: person login ≠ app key ≠ wallet control; separate
  advertiser funding/app payout challenges, frozen campaign-version/app/payee
  terms, external open/voucher/close signatures, no shared-sponsor fallback.
  **Acceptance:** exact candidate commit and independent review, with fixture
  tests rejecting replay-based rebinding, expired/wrong-purpose proofs, changed payees/terms,
  wrong-wallet signatures, foreign owner operations and client-chosen amounts.
  Show wallet rejection and unsupported own-wallet Tempo as unavailable. Health,
  account console and SDK must agree on actual availability; a configured native
  mode or repository is not proof of usable funding. Finish the browser wallet
  journey rather than treating new backend routes as user acceptance. Until
  browser/native acceptance in phase 1, label this a tested build, not funded or
  paid. Cloud migrations/native runs need fresh approval; none is granted here.

- [ ] **Keep account access recoverable — partially built; recovery remaining.**
  Signup/confirmation/sign-in/sign-out exist; password-reset request, recovery
  callback and new-password flow do not exist in `api.mjs`/`supabase.mjs` or the
  account console. Do not mark refresh-as-read as expiry-driven token-refresh proof.
  **Acceptance:** local/provider fixtures cover explicit logout during provider
  outage, reload/back navigation without private state restoration, delayed
  responses after logout, expired refresh and invalid confirmation links
  (`tests/accounts-api.test.mjs`, account `client.test.ts`). Either implement/test
  reset and single-use expired-link behavior before offering it, or label it
  unavailable and name a human support path for the bounded demo. Actual recovery
  email acceptance is a phase-1 gate, not inferred from signup-email delivery.

- [ ] **Expose actionable readiness, no-fill and usage — partial; remaining.**
  `/api/accounts/health` checks serving catalogue access; authenticated
  `/sdk/publisher/config` exposes engine `ready/dailyCap/usedToday`, restrictions,
  synthetic mode and catalogue status. Health/config do not establish usable
  inventory, successful Auth, remaining provider budget or native funding.
  Current account reports omit the opportunity funnel; ordinary no-fill collapses
  to `no_eligible_bid`. **Acceptance:** demonstrate no inventory, missing Jev,
  exhausted admission cap, unsupported policy, unavailable catalogue, zero bids
  and unconfirmed delivery without a fake card/charge or blocked organic answer.
  Provide readable next actions and distinguish “no requests” from “no wins”;
  show actual remaining admission allowance, not fabricated spend. Config/report/
  recovery reads cause zero extra model invocations, charges or payments. Unknown
  admissions stay unknown after restart. Tests: shared-serving cases plus
  `packages/product/decisions.mjs`; add exact reason/usage UI tests where absent.

- [ ] **Reconcile onboarding docs and minimum disclosures — remaining.** Existing
  SDK README/`docs/product/SDK.md`/`/sdk/` describe operator-provisioned demo or
  single-publisher pilots; the account runbook contains the newer shared path.
  **Acceptance:** one first-run guide distinguishes those modes and gives exact
  artifact/version, account SDK base, server-only key, config check, Request →
  Render → Acknowledge and lookup recovery. Explain supported capability exclusions
  versus unsupported broad categories (`gambling` currently disables serving),
  current-question sharing, synthetic/test-money labels and billing for accepted
  insertion—not attention, clicks or conversion. A fresh reader reaches a fixture
  receipt without private backend knowledge; ad-off sends no ad request.

- [x] **Remove Tab autocomplete if present — confirmed absent locally, not a hosted
  claim.** Inspected `CampaignEditor.tsx`, `AdvertiserDashboard.tsx`,
  `PublisherDemo.tsx` and `keyboard.mjs`; the three keyboard regressions passed in
  this assessment. Explicit example selection remains. **Release acceptance still
  required:** Tab/Shift+Tab on blank and populated forms only moves focus; Enter
  submits once, Shift+Enter inserts a newline, IME composition does not submit;
  no Tab action saves, approves, funds or fills fields. Record a browser check on
  the final artifact; preserve historical recordings without rewriting them.

- [ ] **Prepare accurate submission assets — remaining.** Produce the product URL
  or clearly labelled local fallback, repository/setup link, short walkthrough,
  captions, screenshots and evidence links. **Acceptance:** all links resolve in
  the chosen artifact; recording distinguishes prior runs from fresh actions;
  payment proof names rail/token/finality and whole-channel amounts. ContextHint
  audience/usage is attributed and qualified as founder-reported ContextHint
  traction, not enrolled AXP advertisers/apps, revenue or measured lift. Jev buys,
  the example's DeepSeek answers independently, deterministic rules control money.
  No mainnet, production-scale, npm-publication or customer-wallet readiness claim
  without corresponding evidence. Historical hackathon timing is not a new deadline.

- [ ] **Integrate safely and smoke the exact submission artifact — needs approval
  for merge/push/hosting; not executed by this sidecar.** Capture current frontend
  HEAD/dirty paths and marketing/design hashes; inspect overlap before a narrow
  integration. Never reset, stash, rebase or overwrite specialist work, demo state
  or funded identities. **Acceptance:** unchanged protected-file hashes/diffs,
  candidate regression/build logs and a route/asset smoke of `/`, `/account/`,
  `/advertiser-dashboard/`, `/publisher-demo/`, `/sdk/`, `/demo/`, `/mvp/` and account
  API dispatch. Hosted proof must name the deployed commit, exact HTTPS account
  origin/allowlisted email callback, private account/network storage identities,
  successful owner-session read and disabled/unavailable states. HTTP 200 or merge
  alone is insufficient. If hosting is not approved/passed, submit the labelled
  local/recorded path; do not claim this branch deployed.

## Phase 1 — limited real pilot, after explicit authorization

- [ ] **Authorize one bounded cohort/run — needs approval.** Agree pilot owners,
  apps, exact environment, test networks, model-call/spend ceilings, deposits,
  fees/rent, accepted-charge caps and stop/reconciliation owner before execution.
  **Acceptance:** recorded approval plus four consented real identities (two
  advertisers, two app owners), not fixture Auth claims or ContextHint signups.
  No mainnet, automatic top-ups or inherited permission from earlier demos.

- [ ] **Complete real Auth and role-private onboarding — remaining.**
  **Acceptance:** delivered confirmation and password-recovery emails on the
  exact HTTPS callback; single-use/expired/wrong links rejected; new password can
  sign in and prior sessions follow the declared invalidation policy. Exercise
  expiry-driven refresh, sign-out/reload and account switching. Each role completes
  its own campaign/app tasks with foreign reads/writes denied; one person can own
  both profile types. Record browser and provider evidence separately, with no
  credentials exported. Minimum account/data support instructions must work.

- [ ] **Connect a fresh independent app with its own model — remaining.** Use the
  exact hashed SDK tarball and ordinary hosted HTTPS account endpoint, not a private
  deployment-protection adapter. **Acceptance:** a limited-context integrator
  follows public docs to config, award, exact visible Sponsored insertion, accepted
  receipt and private app report. Organic prompts/history contain no sponsor copy,
  hints or SDK key; sharing off makes zero exchange requests. No-fill/error keeps
  answers working; restart and lost opportunity/receipt responses recover the same
  IDs with no new model call/charge. Prior clean-room fixture results are supporting
  evidence (`docs/sdk-cleanroom/PILOT_RESULT.md`), not this real pilot's acceptance.

- [ ] **Accept actual own-wallet funding and correct app payout — unverified;
  needs bounded wallet/native approval.** Start with Solana Devnet/test USDC only.
  **Acceptance:** two advertiser wallets prove control and explicitly approve
  frozen app-specific channels to two separately verified app payout wallets.
  Browser prompts show exact network, deposit/cap and fee limits; rejecting a
  signature creates no claimed funding. Finalized opens precede eligibility;
  accepted native receipts, cumulative authorized totals, finalized correct-payee
  payout and actual-payer unused refund reconcile by channel. Include cooperative
  close signer requirements, zero-spend refund and signed-byte/hash persistence
  through restart. Existing demo transactions cannot close this gate.

- [ ] **Prove caps, expiry and uncertainty under shared real use — remaining.**
  **Acceptance:** accepted + live reserved amounts never exceed the parent campaign
  cap across both apps/versions; authorization and payout do not count as new spend
  or replenish caps. Duplicates, losers, rejected/failed/expired render and no-fill
  add zero charge. Native signing deadlines bound admission/award validity so an
  expired channel cannot accept a newly unpayable delivery. Changed payout profiles
  never redirect frozen channels. Inject lost open/close/provider responses in
  fixtures, then demonstrate bounded recovery of saved identities; unknown native
  outcomes stop new spending without replacement deposits. Separately assess the
  historical accepted-but-unauthorized demo symptom noted in
  `docs/product/PRODUCT_COMPLETION_CHECKLIST.md`; do not declare it fixed here.

- [ ] **Give both sides understandable reports and pilot terms — remaining.**
  **Acceptance:** advertiser can reconcile evaluated/excluded/bid/skip/abstain/
  win/loss/accepted/failed counts and readable reasons; app can distinguish fill,
  accrued, reserved, authorized, outstanding, finalized paid and refund states.
  Show zero activity versus no-fill, window/denominators, bounded-list truncation,
  recipient/network and separate fees/rent without leaking questions/competitor
  strategy or summing vouchers. Owner-approved pilot terms/privacy/contact and
  current-message sharing/opt-out describe data recipients, retention, prohibited
  ads, test assets and insertion billing. Check the disclosures with pilot users;
  do not claim legal review or efficacy measurement that has not happened.

## Phase 2 — public rollout, only after the pilot gates pass

- [ ] **Make onboarding repeatable without the builder — remaining.**
  **Acceptance:** a new advertiser and a new app operator complete documented
  signup/recovery, campaign review/activation or SDK setup, first receipt/report
  and support/reconciliation independently on the release candidate, including
  mobile/keyboard/error states. If an action remains operator-assisted, label it
  that way before signup; do not advertise unavailable self-service funding.

- [ ] **Publish a coherent SDK/docs/legal release — needs release approval.**
  **Acceptance:** version/hash and support channel match the deployed contract;
  examples target the correct account/demo namespaces, supported frameworks and
  recovery modes. Public package publication, if desired, needs separate approval;
  a downloadable supported tarball is not an npm release. Publish owner-approved,
  appropriately reviewed advertiser/publisher terms, privacy/sharing disclosures,
  prohibited-content policy, refund/settlement limitations and account/data request
  contact before opening public enrollment; verify links and acknowledgement UX.

- [ ] **Enable only separately accepted rails — remaining/needs approval.**
  **Acceptance:** public capability flags/UI reflect actual account-bound readiness.
  Own-wallet Tempo stays unavailable until its external-signature adapter and
  wallet/browser/hosted lifecycle pass their own bounded acceptance. Keep Solana
  test USDC, Tempo test PathUSD, payer/payee identities and balances separate;
  demonstrate Tempo earned-delta payout while open versus Solana final-close
  semantics only where actually supported. No bridge, mainnet or custody expansion
  is implied by either testnet release.

- [ ] **Owner go/no-go and post-release functional smoke — needs approval.**
  **Acceptance:** close phase-1 blockers, review exact frontend-safe candidate,
  record merge/push/deployment separately, then repeat the hosted role/SDK/readiness/
  recovery/disclosure smoke on that exact commit. Record any disabled capabilities
  and a working support/stop-enrollment path that preserves existing obligations.
  Invite public users only to the capabilities that passed; do not turn this gate
  into unrelated infrastructure redesign, new benchmarks or model training.

## Verification commands and evidence discipline

These are future candidate checks, not commands run by this documentation sidecar:

```sh
node --test tests/accounts-*.test.mjs tests/publisher-sdk/*.test.mjs tests/product/keyboard.test.mjs tests/build-site/*.test.mjs
node --experimental-strip-types --test apps/product-ui/src/components/accounts/client.test.ts apps/product-ui/src/components/accounts/api-contract.test.mjs
node scripts/accounts/verify-resource-sql.mjs --isolated-fixture
npm test
pnpm --filter @axp/product-ui typecheck
pnpm --filter @axp/marketing typecheck
node scripts/setup/check-repository.mjs
```

`npm test` discovers only `tests/**/*.test.mjs`; it does not replace the explicit
account-component tests. SQL verification requires the already-installed
`postgres:17` image and uses a disposable network-disabled container, not cloud
acceptance. New payment test filenames must be taken from the actual implemented
slice, not invented from its plan. Record all skips and their missing evidence.

In a separate approved release checkout with prepared dependencies, build using
`npm run build:site`, then smoke with `npm run serve:site`; these scripts assemble
static pages and the packaged account/product API. The build can acquire missing
SDK dependencies and generate files, so it was **not run** in this no-network,
single-document task. Likewise no servers, cloud checks, wallet operations,
transactions, full-suite runs, merge/push or deployment occurred here. Only the
three source/keyboard tests above were rerun; all broader results are attributed
to their existing dated acceptance documents.
