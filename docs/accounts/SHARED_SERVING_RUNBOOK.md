# Account-connected shared serving — operator runbook

12 October 2026. Isolated `codex/account-owned-network` worktree. This is the
phase 4 **synthetic accounting** integration, not account-bound native payments.
Keep `/api/accounts/sdk` separate from the shared `/api/product` demo.

## Configuration and startup

Use the repository's supported Node runtime and workspace dependencies. From
the repository root, `npm run dev:accounts` starts the isolated account console.
`node scripts/accounts/dev-server.mjs --api-only` starts just its API.

The current worktree has an ignored, owner-readable `.env.local` configured with
the dedicated AXP Supabase project and ports 3505/3506. No model keys were copied.
The UI address is `http://127.0.0.1:3505/account/` when the full launcher runs.
Verification servers are stopped at handoff; the user's earlier 3495 server is
not replaced or restarted. Port 3505 configuration does not automatically change
Supabase's email-confirmation redirect allowlist.

Required server settings (placeholders, never real secrets in Git):

```dotenv
AXP_SUPABASE_URL=https://qcejmyhaakoedjaqmcub.supabase.co
AXP_SUPABASE_PUBLISHABLE_KEY=<dedicated-project-publishable-key>
AXP_NETWORK_SUPABASE_SECRET_KEY=<dedicated-project-backend-secret>
AXP_ACCOUNTS_PROFILE_STORE=supabase
AXP_ACCOUNT_SERVING_ENABLED=1
AXP_ACCOUNTS_ORIGIN=http://127.0.0.1:3505
AXP_ACCOUNTS_PORT=3505
AXP_ACCOUNTS_UI_PORT=3506
AXP_ACCOUNTS_DATA_DIR=local-state/accounts-network
```

The catalogue key is privileged, backend-only and is not a browser key or an app
SDK key. Owner operations still use the person's verified Supabase identity and
RLS. The backend calls one fixed no-argument `axp_network_campaigns` RPC; do not
put that credential on the owner repository or forward it to clients. See
[Supabase's key guidance](https://supabase.com/docs/guides/getting-started/api-keys).

Apply migrations once, in order: profiles, resources, then
`supabase/migrations/20261012_axp_account_serving.sql`. They are not automatically
applied by startup. These three are already applied to the dedicated project;
do not rerun the non-idempotent DDL there. Missing migration or catalogue access
must show unavailable readiness, never route to a fixture/demo database.

Local session and shared exchange snapshots are encrypted and have different
workspace identities: `axp-accounts-v1` and `axp-account-network-v1`. Preserve the
local encryption key/state together across restart. Supabase owns profiles,
campaigns, credentials and opt-ins; this phase does **not** move the exchange
ledger into Supabase. A hosted environment requires the existing supported
durable CAS store and backend encryption key; file storage is rejected on Vercel.
No hosted configuration or deployment was performed in this slice.

## Advertiser

1. Sign in and create/select your own organization and advertiser profile.
2. Use an HTTPS advertiser website; loopback HTTP is permitted as a profile
   declaration, but cannot be enrolled as an ad destination.
3. Save the offer, exact creative, hints, capabilities and integer bid/budget caps.
4. Review and approve the exact saved campaign version.
5. Explicitly enable that version's **synthetic serving**. Approval alone does
   not opt in. Changes invalidate opt-in; approve and enable the new version.
6. Pause to prevent new matching. Existing issued awards retain their saved
   terms and may still be acknowledged until expiration.
7. Read only your campaign report: accepted synthetic charges, outstanding
   reservations and correlated receipt IDs. No competitor hints or questions.

Budget is shared across every app and campaign version, not reset per publisher.
Accepted charges plus live reservations cannot exceed the campaign cap. A cap
below existing obligations is rejected. Once a campaign has serving history,
changing its settlement rail requires a different campaign rather than relabeling
old obligations. Reports keep Solana and Tempo base units separate. The legacy
`summary` field is Solana-only; use `bySettlementNetwork` for both rails.

## AI-app integration

1. Sign in as a different app owner, create/select an organization and app.
2. Issue an app credential; save its one-time value only in your app server's
   environment. Listing credentials never returns the raw key/hash.
3. Initialize the existing publisher SDK with the **account** API base:

```js
import { AXPPublisher } from './packages/publisher-sdk/index.mjs';
const axp = new AXPPublisher({
  baseURL: `${process.env.AXP_ORIGIN}/api/accounts/sdk`,
  apiKey: process.env.AXP_APP_KEY,
});
const response = await fetch(`${process.env.AXP_ORIGIN}/api/accounts/sdk/publisher/config`, {
  headers: { 'x-axp-publisher-key': process.env.AXP_APP_KEY },
});
if (!response.ok) throw new Error('publisher_configuration_unavailable');
const config = await response.json();
// Inspect financialMode, servingEnabled, engine and catalogue readiness.
// This phase is synthetic even when the intended rail is solana-devnet.
```

Consult `packages/publisher-sdk/README.md` for the full answer-parallel request,
native renderer, observation-based acknowledgement and recovery integration.
The SDK key stays on your server. Forward only the scoped award/token to your
frontend, render the exact approved card separately **below** the independent
answer with a visible Sponsored label, then proxy its observation to the SDK's
`acknowledgeRender`. This service does not generate or modify organic answers.

The key determines app identity; clients cannot assign a publisher, advertiser,
campaign, charge amount or payout. Browser-origin SDK-key requests are rejected.
Do not send private chat history or personal identifiers. Keep stable random
session/turn IDs and the same canonical input on retries. An uncertain request
must use lookup/reconciliation, not a new turn or another purchase.

Server SDK routes supported here:

- `GET /publisher/config`
- `POST /opportunities`
- `GET /publisher/opportunities?sessionId=...&turnId=...`
- `POST /awards/:id/render` and `/fail`
- `GET /awards/:id/status`

Render, fail and delivery lookup require the award's app-bound delivery token.
Rotate/revoke keys from the account console. The old key immediately loses
access; a current key for the same app can recover previously bound receipts.
Human sign-out does not revoke an independently issued app server credential.

### Availability and restrictions

- No Jev key means abstention/unavailable decisions and no-fill, never synthetic
  bids masquerading as live model output. Normal browsing/config/report calls do
  not invoke Jev. Running paid provider calls needs a separately bounded approval.
- Declared required capabilities and exclusions use the existing capability
  catalogue. Historical ContextHint evidence cannot add product capabilities.
- Broad safety categories such as `gambling` are **not classified** in this
  slice. An unsupported saved app restriction disables serving; an unsupported
  request exclusion records no-fill. There is no question-keyword safety shortcut.
- A missing catalogue suppresses new serving. Existing app-bound receipt
  recovery remains available when the catalogue is down, provided ledger storage
  and credential validation remain available.
- Unknown model admissions persist before invocation; restart cannot silently
  repeat them. A busy fenced workspace fails instead of starting a second write.
- Receipts assert accepted insertion/disclosure, not human attention/conversion.

## Reproducible offline verification

```sh
node --test tests/accounts-*.test.mjs
node scripts/accounts/verify-resource-sql.mjs --isolated-fixture
npm test
AXP_ACCOUNT_BROWSER_FIXTURE=1 node tests/support/accounts-network-browser.mjs
```

The browser fixture is at `http://127.0.0.1:3503/account/` with an isolated Next
process on 3504. Its four identities are `advertiser-a@example.test`,
`advertiser-b@example.test`, `app-a@example.test`, `app-b@example.test`;
password `explicit-fixture-password`. These are intentionally public **fixture**
credentials, never Supabase users. It seeds two approved opted-in campaigns,
two app keys and one SDK-accepted synthetic receipt of 4000 units. Provider
responses are injected fixtures. It does not load `.env.local`, send email,
call live models or access wallets. Stop it with Ctrl-C; it deletes only its own
disposable state. Next may add its generated type directory to tsconfig while
running; do not commit generated output or incidental config edits.

The SQL verifier uses the installed bounded, network-disabled PostgreSQL fixture.
The whole cloud acceptance file `supabase/tests/account_serving.sql` ends in
ROLLBACK. It creates only disposable transaction-scoped users/resources and
temporary helper functions. SQL role/JWT fixtures are not fresh real sign-ins.

## Next phase

Review/merge this branch separately, then design account-owned funding and
publisher payout/channel bindings. Reuse existing native adapters but do not
redirect fixed-payee channels or imply synthetic receipts were paid. A bounded
hosted four-account/live-provider/native acceptance and deployment require
separate authority. Landing, shared demo and existing native runs stay untouched.
