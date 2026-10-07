# User-operated products on the existing Vercel project

The landing page and recorded `/mvp/` remain static. The additive root
`/advertiser-dashboard/` and `/publisher-demo/` share `/api/product/*`.
`packages/product/hosted.mjs` adapts the existing product service; it does not
create a second auction, ledger, receipt implementation or payment protocol.
The existing `/api/runs/*` recorded/live MVP remains in its original namespace.

## Configuration

Use server-only Vercel environment variables (never `NEXT_PUBLIC_*`):

| Variable | Value/purpose |
|---|---|
| `AXP_PRODUCT_ENABLED` | `1` explicitly enables the shared hosted product demo |
| `AXP_PRODUCT_WORKSPACE_ID` | Stable lowercase ID, default `demo`; keep fixed across deployments |
| `AXP_PRODUCT_FINANCIAL_MODE` | `devnet` for real public Devnet test-USDC channels; default `synthetic` |
| `AXP_PRODUCT_DEVNET_SIGN` | `1` explicitly enables bounded Devnet signing; otherwise fail closed |
| `AXP_PRODUCT_DEMO_MODE` | `1` enables editable demo suggestions/Tab flow |
| `AXP_PRODUCT_DEVNET_WALLET` | Base64 JSON of the existing disposable product wallet (`network: solana-devnet`, `sponsor`, `publisher`); upload as a secret |
| `AXP_STATE_KEY` | Stable base64 32-byte AES key; reused private hosted-state encryption capability |
| `BLOB_READ_WRITE_TOKEN` | Existing private Vercel Blob store binding |
| `JEV_API_KEY` / `TYPESAFE_API_KEY` | Existing server-side Jev credential |
| `DEEPSEEK_API_KEY` | Only the example publisher chat's organic answer provider |
| `AXP_PRODUCT_JEV_DAILY_CAP` | Integer 1–200, default 50, globally persisted per UTC day |
| `AXP_PUBLISHER_API_KEY` | Optional explicit server-to-server SDK key; otherwise the migrated/generated private workspace key |
| `AXP_PRODUCT_PASSCODE` | Optional `x-axp-product-passcode` requirement on every POST; leave unset for the existing public bounded demo UI |

Blob is selected by the existing hosted KV configuration. An Upstash REST
binding is also supported using an atomic Lua compare-and-set. Filesystem KV is
only a local test/development option; Vercel refuses it. No warm disk state or
process-global service is authoritative. Private snapshots never expire by TTL:
open channels and unresolved obligations must survive deployments and inactivity.
Changing the workspace ID or encryption key is **not** a reset/recovery procedure.

`GET /api/product/health` is safe before initialization: it reports configuration,
store reachability and public bounded caps without constructing payment workers,
calling providers, querying Solana or initializing a workspace. Missing settings
turn product routes into stable 503 responses; the static website and old MVP
continue to work. It does not establish wallet funding or SDK/chain compatibility.

## Durable execution and recovery

There are two distinct encrypted snapshot records under `axp:product:<id>:`:

- `financial:v1`: advertiser campaigns, immutable approved copy, Jev admissions,
  exchange reservations/charges, publisher receipt identity, payment terms,
  private signed transactions/vouchers and protocol-native session state.
- `organic:v1`: the independent example chat's answer admissions/results. It has
  **no payment capability** and a global 20-admissions/day cap.

Separating answers permits DeepSeek and Jev/auction to run concurrently. Each
request restores its relevant snapshot into a fresh private temporary directory,
uses the existing SQLite service, then deletes scratch data. Read-only dashboard
and publisher configuration GETs read the latest committed snapshot without a
lease; parallel page loads do not contend with one another or with a mutation.
They never save their scratch projections. Concurrent financial mutations
receive `429 product_busy_retry` with `Retry-After: 2`; they never mutate another
invocation's in-memory ledger. Mutation responses are buffered until the complete
final snapshot has been saved. Client disconnection does not authorize cancelling
a halfway durable financial operation.

A snapshot and its lease occupy **one** exact-value compare-and-swap record.
Blob's private uncached GET requests `Accept-Encoding: identity` to retain the
object's strong ETag; conditional PUT fences every update. A missing or weak
validator fails closed instead of being normalized or used for an overwrite.
An expired worker cannot overwrite a successor's snapshot or delete its lease.
Lease renewal happens at durable checkpoints; loss/expiry fails closed.

Checkpoints precede paid model calls, signing, transaction submission and voucher
commit, and follow native session updates. In particular, a transaction's exact
signed bytes and its `submitting` attempt are in private Blob **before** broadcast.
Cold retries of uncertain Jev/DeepSeek admissions do not reissue provider calls.
Unknown native outcomes look up their saved signatures; no replacement signature,
channel or cumulative increment is generated automatically.

The local 50-GiB Mac planning/output guard remains the default local worker guard.
The explicit hosted worker uses a 32-MiB scratch floor and the existing 8-MiB
compressed encrypted-snapshot bound. Storage failures prevent new external side
effects and prevent a successful response. All native deposit/charge/channel/
fee-rent limits from `native.mjs` remain enforced across cold starts. The current
public demo is one bounded shared sponsor/workspace, not multi-tenant account auth.

## Migrate the already-funded local workspace

Prefer migration over redepositing already-funded channels. Stop the local demo
normally so its SQLite connections/WALs are closed and `payment-worker.lock` is
removed. Preserve its directory and wallet; do not reset or delete native state.

From a **trusted local operator script** with the same target Blob/state-key
configuration, construct `createHostedProductAPI({config, root})`, then call:

Run from the repository root, with the target Vercel server secrets already
available through the operator's environment (or an ignored target env file):

```sh
AXP_PRODUCT_IMPORT_DIR=local-state/product-devnet-presentation node --input-type=module <<'JS'
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {createHostedProductAPI} from './packages/product/hosted.mjs';
const root=process.cwd();
const file=process.env.AXP_PRODUCT_HOSTED_ENV_PATH;
const config={...(file?parseEnv(readFileSync(file,'utf8')):{}),...process.env,
  VERCEL:'1',AXP_PRODUCT_ENABLED:'1'};
const source=resolve(root,process.env.AXP_PRODUCT_IMPORT_DIR);
const api=await createHostedProductAPI({config,root});
if(api.initError)throw new Error(api.initError);
console.log(await api.financialWorkspace.importDirectory(source));
console.log(await api.organicWorkspace.importDirectory(source));
JS
```

`AXP_PRODUCT_HOSTED_ENV_PATH`, if used, points to a 0600 gitignored env file pulled
for the **target environment**; never print its contents. The command prints only
import status/workspace ID/revision, not keys, wallet material or provider text.
Set `AXP_PRODUCT_FINANCIAL_MODE=devnet` and the same existing product wallet/key
configuration in that target environment before running it. A Preview can share
Production state only intentionally; use distinct workspace IDs for unrelated
tests so a preview does not accidentally mutate the live judge workspace.

This helper is not exposed through HTTP. It only accepts known product SQLite and
publisher identity files, excludes wallet/secrets/arbitrary operator files,
rejects a running local worker, and CAS-imports only into an **absent** record.
The organic import remaps previous answer admissions/results to its new run ID,
preserving existing daily counts and retry identities. It never overwrites a
hosted workspace, signs, transfers tokens or calls a model. Do this **before**
any `/bootstrap` or product UI request initializes an empty workspace. `/health`
is safe while preparing migration. Use the existing product sponsor/publisher
wallet in `AXP_PRODUCT_DEVNET_WALLET`; matching keys and public identities are
validated. If initialization raced migration, investigate rather than deleting
state—there may already be obligations.

After import, call `/state` and confirm campaigns, finalized channels, reservations,
spend, signatures and publisher identity match the local public projection. Then
replay one existing receipt/opportunity identity: it must return its recorded
result without a new signer/model/broadcast. A fresh live judge turn and any new
native deposits are separate explicitly bounded operator demo actions.

## Verification

Offline tests inject models and native transport fixtures—never network evidence:

```sh
node --test tests/product/hosted.test.mjs tests/product/native.test.mjs \
  tests/product/service.test.mjs tests/product/organic.test.mjs
```

Coverage includes cold replay, provider admission checkpoints, daily ceilings,
independent answer/auction requests, lease expiry/stale-write fencing, storage
failure, migration refusals, Blob/Upstash CAS, native signed-byte persistence,
receipt/voucher replay, exact close/refund accounting and uncertain-open lookup.
Deployment verification must additionally exercise the **actual** private Blob
conditional-write protocol and Vercel runtime before enabling judge traffic.
