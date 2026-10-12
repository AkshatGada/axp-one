# Shared account serving — phase 4

12 October 2026. Same `codex/account-owned-network` worktree; phase 1–3 commit
`bcb13db`. Build and verify locally before any cloud change. Landing, shared demo,
historical artifacts, existing payment adapters and funded state are protected.
No model calls, wallet operations, native authorizations, push or deployment.

## Scope and truth

One shared exchange, not a demo per account. Two advertiser accounts explicitly
enroll approved campaigns. Two AI-app accounts use their own server keys against
the same inventory. Jev's existing validated decision adapter and ContextHint
retriever are reusable; missing provider configuration abstains, never fabricates
a model decision. Tests inject labelled deterministic provider fixtures.

Financial mode is **synthetic** throughout this phase. Accepted receipts accrue
synthetic base-unit charges; no automatic voucher authorization, payout, refund or
native channel is claimed. Solana/Tempo inventory and accounting stay separate.
Native app-specific spending/payout bindings remain phase 5.

Supabase remains the account/profile/campaign/enrollment authority. A dedicated,
encrypted hosted workspace (`axp-account-network-v1`, storage kind `accounts`)
holds shared exchange state, admissions, reservations and receipt signatures.
It must not reuse the demo or session workspace identity. Existing CAS/lease
checkpoints fence writes and persist admissions before model calls. A local
fixture is explicit only; real Supabase failure cannot fall back to SQLite.

## Sequence and ownership

1. Freeze this contract and inspect existing SDK/Exchange. Main owns this step.
2. Builder A: additive enrollment SQL, owner-only RPC/store methods, trusted
   backend catalogue reader and SQL/fixture tests. Scope: accounts store files,
   new `network-catalog.mjs`, new migration/test. No API/service/frontend edits.
3. Main: shared service, SDK/API routes, hosted wiring and privacy projections.
   Reuse existing Exchange, deterministic bid policy, signed receipt format and
   validated Jev adapter without changing their demo behavior.
4. Builder B: functional account console/client/types for opt-in/pause and private
   reports after contract freeze. Account components/tests only; no design work,
   marketing, dashboard, chat or global styles.
5. Main: two-advertiser/two-app SDK acceptance; duplicate/concurrent/restart,
   foreign ID, key rotation, expiry, policy, budget and report privacy tests.
6. One fresh independent review; substantive fixes and one bounded recheck.
   Update result/runbook and local commit. Cloud migration/privileged backend
   configuration requires fresh specific approval after isolated tests pass.

## Store contracts (frozen)

- `campaignServing(userId,orgId,campaignId)` -> enrollment or null; ownership check.
- `setCampaignServing(userId,orgId,campaignId,{expectedVersion,enabled})` -> enrollment.
  Exact current version required. Enabling requires current saved approval and
  snapshots advertiser name/site; disable stops new matching, not old receipts.
- Enrollment: `{campaignId,organizationId,version,approvedContentHash,
  enabled,financialMode:'synthetic',updatedAt}`.
- `networkCampaigns()` -> `[{campaign,advertiser:{id,name,website},enrollment}]`.
  Returns only current approved explicitly enabled versions, bounded at 100.
  Fixture method explicit. Real reader uses a separate backend-only Supabase
  secret via `AXP_NETWORK_SUPABASE_SECRET_KEY`, a service-role-only narrow RPC;
  publishable keys, human JWTs and SDK app keys cannot enumerate this catalogue.
  No privileged credential is sent to the browser, persisted in source or logged.

## HTTP contracts (frozen)

Human session + same-origin CSRF writes, owned resources only:

- `GET /api/accounts/organizations/:orgId/campaigns/:id/serving` -> `{enrollment}`.
- `POST .../:id/serving` `{expectedVersion,enabled}` -> `{enrollment}`.
- `GET /api/accounts/organizations/:orgId/campaigns/:id/report` -> campaign-only report.
- `GET /api/accounts/organizations/:orgId/apps/:id/report` -> app-only report.

SDK base remains `/api/accounts/sdk`, existing header/scopes, server-to-server:

- `GET /publisher/config`: capabilities array, profile restrictions, public receipt
  verification key, `financialMode:'synthetic'`, actual serving/recovery readiness.
- `POST /opportunities`: existing SDK question/session/turn/placement/restrictions/
  rail contract. Reject owner, campaign, publisher, amount or payout assignments.
- `GET /publisher/opportunities?sessionId=...&turnId=...`: this app's saved outcome.
- `POST /awards/:id/render`, `/fail`: current app key + bound delivery token.
- `GET /awards/:id/status`: same authority, immutable receipt recovery only.

Existing SDK award/receipt DTOs remain compatible. SDK result includes the winning
approved creative and its decision, not losing campaign private text, hints,
budget, full evidence packet or competitor decisions. Owner reports do not expose
other owners' questions, private campaigns, raw keys or delivery capabilities.
Responses explicitly distinguish accepted synthetic charges from native payment.

## Correctness gates

- Identity comes from the validated app key. Turn idempotency includes app ID;
  identical session/turn strings from different apps are independent.
- Profile prohibited categories are mandatory, request restrictions additive;
  unknown profile categories fail closed rather than silently disappear.
- Paused, unapproved, stale-version or rail-mismatched campaigns do not bid.
- Each campaign's aggregate accepted + reserved amount across all apps/versions
  stays within its authorized synthetic cap; app-specific projections are not
  independent budget grants. Recheck catalogue before auction after model await.
- A saved award binds its exact campaign version, app, creative, amount and
  receipt identity. Later campaign edits do not rewrite an accepted receipt.
- Replays, rejects, failure, expiry, no-fill and losing bids add no charge.
- Persist uncertain admissions; restart does not repeat an uncertain model call.
- Reports/config/recovery do not call models, acknowledge delivery or authorize
  payment. Serving is unavailable unless both catalogue and isolated state work.
- Separate-account tests are fixture identity/provider evidence, not fresh cloud
  signup, live Jev evidence or native settlement. Preserve those distinctions.

## Completion

Local phase 4 passes when private owner enrolment, shared competition, app-bound
SDK delivery/recovery and campaign-wide synthetic accounting work with four
separate fixture accounts, and real-provider wiring fails closed without its
dedicated catalogue migration/credential. Cloud deployment and phase 5 financial
acceptance are separate gates, not inferred from these local results.
