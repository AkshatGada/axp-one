# AXP two-sided product completion checklist

Assessment: 12 October 2026. This is a proposed execution backlog, not a claim that
account isolation, external advertiser funding or multi-app settlement is implemented.
Four read-only specialist reviews covered advertiser journeys, publisher integration,
payments and end-to-end UX. No new paid acceptance run was performed for this assessment.

## North Star and current answer

An advertiser signs in, creates and funds an approved campaign, and understands
where it ran and what it cost. An AI-app operator signs in, registers an app,
integrates the SDK with its own model, and sees deliveries and earnings paid to its
configured recipient. Several advertisers and apps can use the same exchange
without sharing accounts, credentials or access to each other's private records.

The current exchange implements the central request -> decision -> auction ->
disclosed insertion -> receipt -> cumulative authorization -> settlement flow.
That does not make the shared public workspace an independently usable multi-party
network. The product service currently fixes one publisher identity and one
workspace account. Multiple brand records are not separate authenticated customers;
multiple publisher API keys in that workspace still authenticate the same publisher.

Existing architecture references: packages/product/service.mjs,
packages/product/api.mjs, packages/product/publisher-credentials.mjs,
packages/product/payments.mjs and packages/exchange/index.mjs.

## Already present: retain rather than rebuild

- Saved campaign drafts, exact creative approval, hints/capabilities, spend limits,
  launch, pause/resume, duplication and basic reporting.
- ContextHint evidence retrieval, real Jev decisions and deterministic auction rules.
- Own-model publisher integration, separate Sponsored rendering, receipts and no-fill.
- Native Solana channels and additive Tempo sessions, with distinct assets and networks.
- Recorded payment evidence and restart/receipt recovery. Later SDK improvements
  also exist on local integration/pilot branches; release consolidation is still needed.

## Phase 1: settle the account and money contracts

One person can be both an advertiser and an AI-app operator:

    User account
      -> organization membership
        -> advertiser profile -> owned campaigns and funding records
        -> publisher apps -> app-scoped keys, placements and payout routes

- [ ] Sign-up/sign-in/sign-out, verified email, persistent sessions and personal profile.
- [ ] Organization/business profile and a minimal owner/member permission model.
- [ ] Advertiser profile: brand, website, contact and campaign ownership.
- [ ] AI-app profile: app name, website, allowed placements/categories and payout
  address per supported network. Key issuance/rotation/revocation belongs to that app.
- [ ] Derive user, organization and publisher identity from authenticated sessions
  or server credentials, never a browser-supplied owner/publisher ID.
- [ ] Scope campaign edits, reports, receipts, recovery lookups and payment actions
  to their authorized owner/app. Protect GETs as well as mutations: a CSRF token is
  not a customer login.
- [ ] Keep the shared example workspace separate from signed-in customer workspaces.
- [ ] Specify the multi-publisher payment route before enabling cross-app matching.
  Current channels bind one publisher/payee. A campaign cannot send another app's
  earnings down that existing route. The closest extension is explicit
  advertiser-to-publisher channel allocations under one parent campaign budget,
  with bounded allocation/reservation rules and per-recipient settlement.
  This is a proposed design, not implemented behavior.
- [ ] Define advertiser funding ownership: the server-held test sponsor is not
  customer wallet custody. Keep an explicitly labelled test-money pilot until a
  separately approved funding/authorization model exists. Signing stays server-side.

Exit: two independent users cannot read or change each other's records; two apps
have different credentials and recipients; the same session/turn IDs on different
apps cannot collide; a cross-app receipt cannot charge or pay the wrong app.

## Phase 2: close functional blockers and consolidate the release

- [ ] Reconcile main, local SDK recovery/pilot changes and specialist-owned frontend
  through a narrow integration branch. Do not blindly merge temporary operator
  endpoints, credentials or uncommitted landing work.
- [ ] Payment expiry/admission: exclude native channels before their authorization
  deadline and bound award/receipt validity accordingly. The adapter already
  rejects late signatures; accepting a charge first is not sufficient protection.
  Add an expiry/race regression and an explicit blocked/expired product state.
  Assess existing accepted-but-unauthorized obligations without deleting records,
  replacing deposits or silently extending frozen terms.
- [ ] Disable unavailable settlement rails using readiness, not object existence.
  Preserve the chosen network in campaign-to-chat links.
- [ ] Fix draft-save/preview races: later edits must not be marked saved by an older
  response. Lock edits during the request or compare draft versions.
- [ ] Show buyer readiness and remaining admission allowance before launch. A
  configured key does not guarantee usable decision capacity.
- [ ] Publish one versioned installable SDK artifact and matching guide. Integrate
  existing authenticated recovery, app identity and framework examples rather than
  implementing another transport. Normal HTTPS pilots must not need private
  Vercel deployment-protection adapters.

Observed read-only payment symptom on 12 October: the public workspace projected
one open/active campaign with 3,000 accepted base units, zero authorized base units
and no vouchers. Its exposed voucher expiry was 9 October, while the accepted
delivery was 11 October. This requires recovery assessment, not a claim of lost
funds or a completed fix. No wallet or financial operation was performed here.

## Phase 3: complete both customer journeys

- [ ] Advertiser reporting: evaluated opportunities, policy exclusions, genuine
  bid/skip/abstain, auction wins/losses, accepted/failed deliveries and readable
  reasons. Distinguish no requests from requests that did not win.
- [ ] Campaign evidence preview: inspect the relevant historical inputs and missing
  capability names. Keep observed copy, inferred hints and advertiser declarations
  separate. Browsing/deterministic preview makes zero provider calls.
- [ ] Publisher onboarding: register app -> obtain server-only scoped credential ->
  install SDK -> request/render/acknowledge -> inspect first receipt and earnings.
- [ ] Publisher dashboard: app-scoped fill, accepted deliveries, accrued,
  authorized, finalized paid and outstanding amounts, with recipient/network proof.
  Project existing records; do not create a second ledger or sum cumulative vouchers.
- [ ] Clear payment actions/states: accepted is not paid; unknown requires
  reconciliation; Solana close ends the channel; Tempo payout can keep it open.
  Refunds return unused collateral to its actual payer, not the current visitor.
- [ ] Separate advertiser, AI-app operator and example-chat navigation. Surface
  account/profile controls and mobile navigation without prescribing the specialist's
  final layouts.
- [ ] Useful empty/error states for no-fill, quota, unavailable provider,
  unconfirmed delivery and blocked payment. Preserve the organic answer.
- [x] Remove product Tab autofill and demo-only campaign fill controls in the
  isolated local compatibility patch. Preserve explicitly selected examples,
  native keyboard focus, Enter submission and historical recordings.
  This checkbox is not a deployment statement.

## Phase 4: one independent, connected acceptance

- [ ] A fresh limited-context integrator installs the exact released SDK in a
  separate chat app, retains its own model and uses a normal hosted HTTPS endpoint.
- [ ] Two signed-in advertiser owners manage isolated campaigns; two publisher
  owners use distinct apps, keys and payout routes.
- [ ] A funded eligible campaign competes on each app; correct app-bound receipts
  create one charge and show the matching advertiser spend/publisher earnings.
- [ ] Verify revoked/wrong-app keys, unauthorized campaign access, no-fill,
  unavailable rail/provider, payment expiry, failed delivery and duplicate/restart
  recovery with no extra charge or replacement purchase.
- [ ] Verify finalized payout and refund for the right recipient/network, separately
  from fees and accrued totals. Any new paid/network execution needs a fresh bounded
  run authorization; this checklist does not extend old budgets.
- [ ] One focused review/recheck of these acceptance gates, then freeze the release.

## Submission and scope

Make the landing story product-led while accurately labelling actual test networks,
test tokens and access boundaries. ContextHint is the intelligence/GTM foundation,
not enrolled AXP inventory or proof of targeting lift. Attribute combined traction
to ContextHint plus AXP, not AXP alone. Keep historical proof separate from a new run.

Do not spend this phase on new model training, extra benchmark rounds, broad
infrastructure redesign, mainnet custody, automatic top-ups or agent-facing
paywall/Cloudflare expansion. Account ownership, correct recipient routing and
recoverable SDK integration are product necessities, not cosmetic hardening.

## Local keyboard patch verification

The isolated patch passed product UI typechecking, 21 focused UI/model tests and
the 583-test repository suite (577 passed, six skipped, zero failures). Repository
portability/staged hygiene passed. In an isolated loopback synthetic workspace,
browser checks confirmed an empty chat stayed empty after Tab and campaign-name
Tab moved focus to Brand name with every offer field still blank. Both product
pages compiled and loaded. Provider keys were empty and native signing disabled;
the verification created no model calls, funded channels or payment operations.
Historical recordings and the active specialist checkout were not modified.
