# Operator: isolated publisher pilot

This branch adds pilot-critical integration/recovery. It is not deployed and does
not provide public signup, shared-inventory multi-tenancy or mainnet billing.
One platform uses one separate state directory, run identity and API endpoint.
Never point a new platform at the shared demo keys, channels or state.

## Workspace and API boundary

Initialize/configure a dedicated workspace via trusted operator tooling, create
and approve inventory before enabling publisher-only access. No campaign funding
is authorized by this document. Existing channel/network rules still apply.

Run the existing local API with these explicit settings (own credentials required
for actual Jev; absent providers stay unavailable, never silently substituted):

```sh
AXP_PRODUCT_STATE_DIR=local-state/my-publisher-pilot \
AXP_PRODUCT_PUBLISHER_ONLY=1 AXP_PRODUCT_PORT=3472 \
  node scripts/product/dev-server.mjs --api-only
```

Publisher-only mode exposes configuration and authenticated request/render/fail/
recovery routes, not the public shared dashboard, state, bootstrap or example chat.
The hosted wrapper honors the same setting; no hosting changes were made here.
Do not enable a global product POST passcode on an external SDK endpoint: SDK auth
uses scoped publisher keys. Network/API hosting and independent payee onboarding
remain separately configured operator tasks, not automatic SDK behavior.

## Credential lifecycle (local operator)

Stop local writers before modifying their SQLite workspace. For hosted snapshots,
rotate through a fenced operator state mutation—not a stale exported local copy.
The local CLI is not a hosted credential-management API.

```sh
node scripts/product/publisher-key.mjs list --state-dir local-state/my-publisher-pilot
node scripts/product/publisher-key.mjs issue --state-dir local-state/my-publisher-pilot --out publisher.env
node scripts/product/publisher-key.mjs issue --state-dir local-state/my-publisher-pilot --out recovery.env --scopes opportunities:read,delivery:read
node scripts/product/publisher-key.mjs rotate --state-dir local-state/my-publisher-pilot --key-id KEY_ID --out replacement.env
node scripts/product/publisher-key.mjs revoke --state-dir local-state/my-publisher-pilot --key-id KEY_ID
```

If a database contains multiple run identities, also supply `--run-id EXISTING_ID`.
Output files must be fresh `.env` filenames inside the ignored state directory;
they are written mode0600. Standard output contains only identifiers/scopes/path,
not the credential. Copy its value privately into the publisher's server secret
store. Keys in the exchange database are hashes. Rotation revokes the old key
atomically, so coordinate switching or issue a replacement first then revoke for
an overlap window. Revocation persists on restart; original defaults never revive it.
Existing delivery tokens remain valid with a newly authorized credential.

## Recovery semantics

Persist request admission before the first opportunity call. Save app-user owner,
canonical sanitized input and server-owned session/turn IDs in the app database.
Save awards/tokens and accepted receipts durably before acknowledging them to the
browser. Lookup endpoints never create provider calls, expire reservations, admit
charges or authorize payment vouchers. `unknown` remains unknown; never invent a
new turn to repair it. A status GET can show `expired` without changing stored state.
An explicit subsequent mutation/expiry sweep owns reservation release.

## Reproduce the fresh integration exercise

The dedicated fixture lab ignores provider credentials and has no native wallet:

```sh
node experiments/sdk-pilot/exchange.mjs
```

API: `http://127.0.0.1:3472/api/product`. Credentials stay in
`local-state/sdk-pilot/integrator.env`. The fresh agent's independent app uses port3473.
All its model decisions/answers are fixtures and all accounting is synthetic.
This exercise validates integration and recovery, not human attention or live payout.

Use Node.js 22.18+ (acceptance used 25.5.0). In a second terminal:

```sh
cd experiments/sdk-pilot/app
npm ci --offline --ignore-scripts --no-audit --no-fund --cache .state/npm-cache
npm start
```

The only dependency is the repository's packaged SDK tarball. Open
`http://127.0.0.1:3473/`. App state stays in ignored `.state/pilot.sqlite`;
restarting uses that same file. Never print the server-only environment file.
Ordinary answers are fixtures. Opt into a developer-tool question to observe a
Sponsored card; an unrelated wallet question demonstrates no-fill.

With the fixture exchange still running, from the repository root:

```sh
node experiments/sdk-pilot/verify.mjs --http
```

This enables the fresh integrator's actual HTTP failure/restart tests on port3474
and adds a bounded set of synthetic test records to this separate fixture lab.
It never makes paid calls or payments. Without `--http`, those five explicitly
opt-in exercise cases are skipped. Reruns create new isolated test sessions,
not retries of an existing user purchase. The original clean-room app and
main-product state are not reset. See `PILOT_RESULT.md` for measured coverage.
