# Account-connected AXP network — phased execution

12 October 2026. Branch `codex/account-owned-network`, base `ddba8fa`.
This worktree is isolated from the landing specialist and existing demo/state.

## North Star and protected boundaries

A signed-in advertiser manages only its own campaigns. A signed-in AI-app owner
provisions only its own server-side SDK credentials. Later, a shared exchange
matches eligible campaigns across those private accounts; separate demo instances
per user are not a substitute for a network.

No changes to `apps/marketing`, `design-system`, existing product/demo handlers,
payment adapters, historical evidence or funded state. No fresh model calls,
wallet operations, push or deployment in the initial build. The user subsequently
approved the additive resource migration to AXP Supabase `qcejmyhaakoedjaqmcub`,
conditional on passing isolated tests; this does not authorize any other project.
Dedicated AXP Supabase is the real account-resource source of truth. SQLite is
explicit offline fixture evidence only, never a silent real-provider fallback.

Current result: phases 1–3 implemented and verified; approved additive Supabase
migration applied. Shared serving and financial bindings remain gated. See
`NETWORK_CONNECTION_RESULT.md` for test evidence and exact release status.

## Phases and completion loop

1. **Contracts and isolation (first).** Freeze the interfaces below. Record the
   baseline and separate the namespace from the shared `/api/product` demo.
2. **Advertiser-owned campaigns (build now).** Add Supabase RLS-backed campaign
   drafts, immutable organization/advertiser bindings, versioned edits and exact
   saved-content approval. Foreign/missing IDs return identical 404s. There is
   no launch/funding route; approval alone cannot activate a campaign.
3. **App-owned SDK credentials (build now).** Issue/list/revoke/rotate 256-bit
   server credentials; save hashes only, return raw key only at issue/rotate.
   Resolve publisher identity/restrictions from the key, not request IDs. Own-app
   configuration works with the existing SDK using a separate base URL. Serving
   and recovery routes fail explicitly until phase 4; never route to demo state.
4. **Multi-app shared serving (next gate).** Replace the fixed demo publisher in
   a separate account-aware integration. Backend matching spans eligible opted-in
   campaigns while customer reports remain private. Bind turns/awards/receipts to
   app identity; profile restrictions are mandatory, request restrictions additive.
5. **Financial bindings (next gate).** Validate advertiser spending authority and
   app payout routes; model campaign/app channel bindings and aggregate campaign
   caps. Fixed-payee channels cannot be redirected. No new ledger in the browser.
6. **Account-connected acceptance (per slice).** Two advertiser identities and
   two independent AI-app identities, foreign-resource attacks, persistence,
   logout, rotation/revocation and actual SDK configuration. Cloud RLS acceptance
   requires explicit migration approval and real test identities; fixture success
   is not cloud/hosted acceptance. Later serving/payment gates need separately
   authorized bounded provider and native tests.

For every phase: implement -> focused tests -> independent review -> bounded
repair/recheck -> update result and next gate. Do not call phases 4–6 complete
because account drafts/keys exist. No broad infrastructure-hardening cycle.

## Frozen phase 2/3 contracts

All owner routes remain under `/api/accounts`, use verified Supabase identity,
opaque session and same-origin session-bound CSRF for writes. IDs are UUIDs.

- `GET /organizations/:orgId/campaigns` -> `{campaigns}`
- `POST /organizations/:orgId/campaigns` -> `{campaign}` (201)
- `GET /organizations/:orgId/campaigns/:campaignId` -> `{campaign}`
- `POST /organizations/:orgId/campaigns/:campaignId` -> `{campaign}` (edit)
- `POST /organizations/:orgId/campaigns/:campaignId/approve` `{expectedVersion}` -> `{campaign}`
- `GET /organizations/:orgId/apps/:appId/credentials` -> `{credentials}`
- `POST /organizations/:orgId/apps/:appId/credentials` `{label}` ->
  `{credential,apiKey}` (201; raw key shown once, never stored in browser storage)
- `POST /organizations/:orgId/apps/:appId/credentials/:keyId/revoke` `{}` ->
  `{credential}`
- `POST /organizations/:orgId/apps/:appId/credentials/:keyId/rotate` `{label}` ->
  `{credential,apiKey}` (atomic old revocation + new issuance)

Campaign input is exact:
`{name,productDescription,approvedText,contextHints,declaredCapabilities,
maxBidBaseUnits,budgetCapBaseUnits,settlementNetwork}`.
Strings: name 120, description 1200, creative 800; total description/creative/hints
2400 UTF-16 units; at most 6 distinct hints of 400, 12 distinct supported product
capabilities. Integer money strings only: positive bid <=4000, positive cap <=100000,
bid <=cap. Network enum `solana-devnet|tempo-testnet`; values never summed across
currencies. Campaign DTO:
`{id,organizationId,advertiserId,version,status:'draft'|'approved',input,
approvedContentHash:null|string,createdAt,updatedAt,servingStatus:'not_connected'}`.
Creation derives advertiser from owned organization (must exist). Edit increments
version and clears approval. Approval compares the reviewed `expectedVersion`
atomically under the row lock/transaction; a stale version returns
`409 campaign_version_conflict` without approving newer content. The version is
a precondition, never an assignment. Approval hashes current input and does not
launch. No user/owner/advertiser/version/status/hash assignment from clients.

Credential DTO:
`{id,organizationId,appId,publisherId,label,scopes,createdAt,expiresAt,revokedAt}`.
Publisher ID = `app:<appId>`; four existing publisher SDK scopes. Keys use prefix
`axp_app_` followed by 64 random hex characters. 30-day expiry, maximum 10 active
keys per app. Raw keys are hashed SHA-256 before persistence. SQL and fixture
store validate bindings, irreversible revocation, quotas and atomic rotation.

SDK base `/api/accounts/sdk`; server header `x-axp-publisher-key` (no browser key).
`GET /publisher/config` is authenticated and returns actual app restrictions,
`publisherId`, `contractVersion:'0.2.0'`, `financialMode:'unfunded'`, and explicit
`servingEnabled:false`. Existing request/delivery/recovery routes return stable
`account_serving_not_connected`503 for valid keys, 401 for invalid/revoked/expired
keys, without invoking product service or accepting money. Capability health keeps
`campaignServing:false,nativeFunding:false`; add `campaignDrafts:true` and
`appCredentials:true` only when a resource repository is installed.

## Repository/store interface and ownership

Account store gains async-capable methods:
`campaigns(userId,orgId)`, `campaign(userId,orgId,campaignId)`,
`saveCampaign(userId,orgId,input,campaignId=null)`,
`approveCampaign(userId,orgId,campaignId,expectedVersion)`,
`appCredentials(userId,orgId,appId)`,
`issueAppCredential(userId,orgId,appId,{label,keyHash})`,
`revokeAppCredential(userId,orgId,appId,keyId)`,
`rotateAppCredential(userId,orgId,appId,keyId,{label,keyHash})`,
`resolveAppCredential(keyHash)` -> `{credential,app}` or null.
Resolution is a narrowly scoped database capability, not a service-role query or
an arbitrary user/organization lookup. It exposes no hashes/tokens. All other
resource operations use the authenticated user's JWT and owner RLS.

Main: resource validation, HTTP/session/SDK boundary, hosted/local wiring,
verification and result. Sol6.1-high builder: SQL migration/rollback acceptance,
fixture store and Supabase store resources, store tests (disjoint files).
Sol6.1-high builder: existing account console/client/types + resource forms/tests
only; no dashboard, chat, marketing, global style or financial component edits.
Fresh reviewer: authorization, DB exposure, API/SDK contracts and truthful gates.
