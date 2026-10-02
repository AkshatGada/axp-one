# Hosted live run (axp.one): architecture

Status 2026-10-02: the API is implemented (`packages/hosted/`) and ran real Devnet runs end
to end locally, through the dev server and through the packaged Vercel function (section
12). The single-site Vercel build is in place (section 9); not deployed by this agent.

A judge presses "Run it live" in the hosted MVP and gets a real, bounded V3 run on
Solana Devnet: four DeepSeek `deepseek-flash` organic answers, 15 real Jev decisions,
deterministic first-price auctions, publisher delivery acknowledged from the judge's
own browser, publisher-signed receipts, accepted charges, cumulative vouchers and
real Devnet channel opens/closes in test USDC. The result is a bundle in the
`artifacts/v3/replay` schema, persisted and viewable later with the same MVP components.

## 1. Shape

```
axp.one/            landing   (apps/marketing static export)
axp.one/mvp/        MVP       (apps/product-ui static export, NEXT_PUBLIC_BASE_PATH=/mvp)
axp.one/api/*       one Node function (packages/hosted), Node 22.x runtime
                    state: Vercel Blob (private store) in production, a local directory in dev
```

One function, not many: the handler routes `/api/*` itself (keeps under Hobby's
function count and shares warm module caches). Node 22.13+ has `node:sqlite`
unflagged; the run engine keeps using it, but only inside a per-invocation `/tmp`
directory (see 3). Nothing in a function relies on a previous invocation's disk.

## 2. What a run is

Exactly the four fixed V3 scenarios (cached, offline, repeat, mobile) against the
three fictional campaigns, because the replay schema validator (`validateV3Run`)
requires that matrix (12 paired + 3 repeat Jev slots, 4 organic answers, 2 channels).
Judges do not type a question: no prompt-injection surface and no length cap needed
(a custom-question run would need a new bundle schema: owner decision, not done).
Story gates (competition, three placements, multiple increments) are reported, never
forced: a live run may legitimately differ from the recording.

## 3. Persistence

**Vercel Blob (preferred; owner decision 2026-10-02, no extra signup)**: create a
**private** Blob store in the project's Storage tab; Vercel injects `BLOB_READ_WRITE_TOKEN`.
Upstash Redis remains an optional alternative (`AXP_RUN_STORE=upstash` +
`KV_REST_API_URL`/`KV_REST_API_TOKEN`). Both speak to the same small key/value interface
(`packages/hosted/kv.mjs`, REST via `fetch`, no SDK); locally it is a directory.

| Key | Value |
|---|---|
| `axp:run:<id>` | run record: phase, timestamps, public status (fast GETs) |
| `axp:run:<id>:state` | AES-256-GCM encrypted, gzipped snapshot of the run's private state dir (SQLite files, publisher receipt key, vouchers, signed wires) |
| `axp:run:<id>:file:<path>` | public outputs (organic answers, chain-check, restart, replay bundle) |
| `axp:run:<id>:lease` | step lock |
| `axp:runs` | recent run ids |
| `axp:day:<date>[:ip:<hmac>]` | daily counters |
| `axp:idem:<key>` | idempotency key → run id |

How Blob gives safe locks and counters (each key is one private blob):
- Reads are uncached (`?cache=0` on the private URL), so a step always sees the last write.
  Public Blob stores are not supported: their CDN may serve a stale snapshot for up to a
  minute, which could replay a step.
- Lease / admission lock / idempotency = **create-if-absent** (`allowOverwrite` off). An
  expired lease is taken over only with an **ETag conditional write** (`ifMatch`), so two
  takers cannot both win.
- Counters and the run list = ETag compare-and-swap loops (retry on 412).

Trade-offs: Blob costs one HTTP request per key operation (Upstash: one command) and
writes count as Blob "advanced operations", which Vercel meters per plan (the Hobby
allowance is small). Busy polls only read (a lease read precedes any lease write). A run
writes roughly 40–80 times (about 6 steps × record/state/lease plus public files and 3
acknowledgements), so check the plan's Blob operation allowance against the expected run
count; at about 20 runs/day this is fine on Pro, and Upstash's free tier is the fallback.

`AXP_STATE_KEY` (32 random bytes, base64) encrypts every state snapshot. On Vercel with no
store configured, the API still answers (`/api/live` → `enabled:false` with
`storeError:"store_unconfigured"`, `/api/runs` → `[]`): the MVP shows live runs as not yet
available, and the rest of the site is unaffected.

Each step: take the lease, restore the snapshot into `/tmp/<run>`, run one step of
the existing engine (`packages/v3/service.mjs` + the payment adapter, unchanged),
save the snapshot and public files, release the lease.

## 4. Run flow and time limits

Measured: organic 10–60 s each, Jev about 1 s per call, a Devnet open or close 5–20 s
to finality. The browser drives the run by calling `POST /api/runs/:id/advance`
(every 2–3 s); each call does at most one step, each step stays well under the
300 s function limit (Hobby with Fluid compute; 60 s would not fit the opening step).

| Phase | Work | Typical |
|---|---|---|
| `queued` | balances check, approve + freeze campaigns, frozen Devnet terms, request 4 organic answers | 2–4 s |
| `opening` | open ClearVault then KeyForge (sequential: the adapter refuses to sign while another channel is unreconciled), concurrently 4 DeepSeek answers | 30–70 s |
| `auctions` | cached, offline, repeat (15 Jev calls), mobile (0 calls, policy no-fill) | 15–40 s |
| `delivery` | waits for the judge's browser to render + acknowledge each award; authorizes the voucher after each receipt | judge-paced, 10 min window |
| `closing` | drain + cooperative close of both channels | 20–40 s |
| `finalizing` | chain verification, restart check, bundle export + validation | 5–10 s |
| `completed` | bundle downloadable, viewable in the MVP | |

**Channels: open + close per run (chosen)** rather than long-lived pre-opened
channels with periodic closes. Per-run channels reuse the proven adapter, terms and
bundle validator unchanged (voucher expiry 2 h, two charges, 8000 cap per channel),
give each run its own open/close explorer links, and leave nothing open between runs.
Long-lived channels would change the shared payment terms and the evidence schema
(an owner decision) to save about 40 s per run.

**Wallets: stable advertiser wallets (chosen)** instead of the rehearsal's fresh
payers funded per run: two payers (ClearVault, KeyForge) and one publisher payee,
generated once (`scripts/hosted/wallets.mjs init`), funded once from the existing
disposable Devnet wallet (`fund`). Saves a funding transaction per run and keeps
refunds in the system. Hosted, they arrive as `AXP_DEVNET_WALLETS` (base64 JSON);
locally from `local-state/secrets/hosted-devnet-wallets.json` (0600, ignored).

## 5. Abuse controls

- `AXP_LIVE_ENABLED=1` required to start runs (and to sign or call models).
- Optional judge passcode `AXP_LIVE_PASSCODE` (timing-safe compare).
- Caps: `AXP_LIVE_DAILY_CAP` (default 20 runs/day), `AXP_LIVE_IP_DAILY_CAP`
  (default 3 per IP/day; the IP is stored only as an HMAC), `AXP_LIVE_MAX_ACTIVE`
  (default 1 concurrent run: one public RPC, one payer pair).
- Model budgets per run are the frozen V3 policy: at most 24 Jev admissions
  (15 used) and at most 10 DeepSeek attempts (4 per scenario). Day maximum =
  cap × those numbers. DeepSeek model pinned to `deepseek-flash` (pro rejected).
- Timeouts: DeepSeek 90 s, Jev 12 s per call, RPC 15–20 s, step lease 290 s,
  delivery window `AXP_LIVE_DELIVERY_WINDOW_SECONDS` (600), awards expire after 30 min.
- Idempotency: `Idempotency-Key` on start; the lease serializes steps; receipts,
  opens, closes and vouchers are idempotent in the existing engine.
- Request bodies at most 16 KB, strict field allowlists, same-origin POSTs only,
  the run token (returned once at start, stored as a hash) is required to acknowledge
  delivery. Anyone may advance a run (it only performs its fixed script).

## 6. Devnet funding math

Per run (2 opens, 2 closes): network fees about 0.00004 SOL; each channel leaves its
channel-account rent (0.00195 SOL) behind; the escrow token account rent is
reclaimed at close. So about 0.004 SOL and at most 0.012 test USDC (payouts, which
move payer → publisher) per run; 0.04 USDC is locked as deposits during a run and
refunded at close. Initial funding: 0.25 SOL + 1 USDC per payer covers about 60
runs of rent and about 100 runs of payouts; at 20 runs/day that is a top-up every
3 days (the funder holds about 4.9 SOL and 18.9 Devnet USDC). Publisher payouts can
be swept back to the payers. `GET /api/live` reports payer balances so the
MVP can say "live runs paused: wallet top-up needed" instead of failing.

## 7. Failure handling

- RPC 429: the transport retries with identical bytes (same signed wire, no new
  identity); operator RPC helper backs off; `sendTransaction` is never re-signed.
- Every step is resumable: a crashed step leaves the lease to expire; the next
  advance restores the last snapshot and the adapter reconciles by lookup
  (`submitted` → finalized/failed) before any new signing. No double-sends: signed
  wires are persisted before broadcast and only rebroadcast unchanged.
- Bounded retries per phase (4 attempts). Before delivery, exhaustion aborts the
  run: reserved awards fail (no charge) and open channels close with a refund
  (`zeroChargeClose`). If closing itself keeps failing the run becomes
  `needs_operator` (run `node scripts/hosted/runs.mjs reconcile <id>`).
- A judge who leaves: the delivery window expires, the next advance (any viewer,
  the local sweeper, or the cron in 9) fails the remaining awards and closes.
  Never acknowledged by the server: no receipt without a browser render.

## 8. Browser delivery acknowledgement

During `delivery` the status lists each reserved award (advertiser, approved
creative text, `creativeHash`, price, expiry). The MVP inserts a card into its own
DOM with a visible `Sponsored` label and the creative text, checks both from the
DOM, then posts `{domInserted:true, sponsoredLabelPresent:true, creativeHash}` with
the run token. The server signs the publisher receipt with the run's own key
(`session.acknowledge`), the exchange accepts the charge, and the voucher for that
channel is authorized immediately. `acknowledgeCard()` in the client contract does
the DOM checks. It proves an owned-app DOM insertion, not human attention.

## 9. Vercel packaging (built)

`npm run build:site` (`scripts/build-site.mjs`) writes `.vercel/output` (Build Output API v3):
- `static/`: `apps/marketing/out` at `/`, `apps/product-ui/out` at `/mvp/` (built with
  `NEXT_PUBLIC_BASE_PATH=/mvp NEXT_PUBLIC_LIVE_API=1`; both runs, the first recording at
  `/mvp/first-recording/`).
- `functions/api/index.func`: `packages/hosted/vercel-function.mjs` as `index.mjs`, the
  backend modules (`packages/` without tests/spikes, `apps/backend/`, `artifacts/v2/evidence`)
  and the native payment SDK. The SDK is rebuilt from the vendored, hash-pinned source when
  absent (fresh clone / Vercel) and copied as a symlink-free `node_modules` tree
  (`scripts/build-site/flatten-sdk.mjs`; every dependency edge re-resolved; the loader's
  module-hash checks still run). Runtime `nodejs22.x`, `maxDuration` 300, 1024 MB, about 100 MB.
- `config.json`: security headers, immutable `_next/static`, `/api/*` → the function,
  `/mvp` → `/mvp/`, directory `index.html` resolution, 404 pages, and a daily cron
  `0 9 * * *` → `/api/cron/sweep` (Hobby allows daily crons only; on Pro `*/2 * * * *`).
- Self-checks: required pages exist, no `.env*`/wallet/`.pem`/`.sqlite` in the output, the
  function contains only the expected top-level entries, and it imports and answers
  `/api/live` with no environment.

The function entry deliberately lives outside a top-level `api/` directory: a local
`vercel build` would otherwise also build a zero-config function whose file tracing pulled
private `local-state/` files into it (seen once locally, deleted, fixed).

`vercel.json`: framework `null`, `installCommand` `pnpm install --frozen-lockfile`,
`buildCommand` `node scripts/build-site.mjs`, `outputDirectory` `.vercel/output/static`
(fallback only; the Build Output API output is used). Root `engines` `>=22.18.0` makes
Vercel build on Node 24.x; the function itself runs on 22.x.

Local checks: `npm run serve:site` serves `.vercel/output` with Vercel's routing phases
and the packaged function; `vercel build` (no link, no deploy) succeeded locally.

Environment (`node scripts/build-site/write-env-vercel.mjs` writes `.env.vercel`, 0600,
gitignored, and `.env.vercel.public-names.txt`):
- secret: `JEV_API_KEY`, `DEEPSEEK_API_KEY`, `AXP_DEVNET_WALLETS`, `AXP_STATE_KEY`,
  `CRON_SECRET`, `AXP_LIVE_PASSCODE` (empty), `BLOB_READ_WRITE_TOKEN` (injected by Vercel)
- non-secret: `AXP_LIVE_ENABLED=1`, `AXP_RUN_STORE=blob`, `AXP_LIVE_DAILY_CAP=20`,
  `AXP_LIVE_IP_DAILY_CAP=3`, `AXP_LIVE_MAX_ACTIVE=1`, `AXP_LIVE_DELIVERY_WINDOW_SECONDS=600`

## 10. Client contract (for the MVP "Run it live" UI)

`packages/hosted/client.mjs` + `client.d.mts` (dependency-free; import or copy).

| Call | HTTP | Notes |
|---|---|---|
| `config()` | `GET /api/live` | enabled, passcodeRequired, caps, used today, active run, payer health |
| `start({passcode?, idempotencyKey?})` | `POST /api/runs` | → `{runId, runToken, status}`; keep `runToken` in memory/sessionStorage |
| `list()` | `GET /api/runs` | recent runs, newest first |
| `status(id)` | `GET /api/runs/:id` | `RunStatus` (phase, steps, turns, awards, payments with explorer links) |
| `advance(id)` | `POST /api/runs/:id/advance` | performs one step; returns `RunStatus` (`busy:true` if a step is in flight) |
| `render(id, awardId, body, token)` | `POST /api/runs/:id/awards/:awardId/render` | the browser delivery acknowledgement |
| `file(id, path)` | `GET /api/runs/:id/files/<path>` | `replay/run.json`, `replay/manifest.json`, `chain-check.json`, `restart.json`, `devnet-feasibility.json`, `organic/<scenario>.json` |
| `bundle(id)` | the three files above | `{run, manifest, chainCheck}`: exactly what `apps/product-ui/scripts/project-run.mjs` reads |
| `driveRun(client, id, opts)` | loop | advances until `delivery` with pending awards or a terminal phase |
| `acknowledgeCard(client, id, token, award, element)` | | DOM checks, then `render` |

The file layout mirrors `artifacts/<run>/` (`replay/` plus sibling `chain-check.json`),
so a completed hosted run can be projected with the same code as a committed one.

## 11. Honest risks

- Public Devnet RPC (`api.devnet.solana.com`, frozen into the terms) rate-limits; a
  busy hour can stall opens/closes. Mitigated by retries and one active run; a
  private RPC would need a terms/environment change (owner decision).
- Jev and DeepSeek outages make runs abstain or abort (no charges, refunds at close).
- Stochastic decisions: a live run may have fewer placements or no competition; the
  MVP must render story-gate failures honestly (the schema reports them).
- An abandoned run keeps 0.04 test USDC locked until the window passes and something
  advances it (on Hobby the cron is daily; the dev sweeper is local only).
- `/tmp` snapshots: a crash between broadcast and snapshot save loses the
  "submitted" mark locally; recovery relies on the persisted pre-broadcast state
  (signed wire stored before submission) plus RPC lookup. Not exercised hosted yet.
- Secrets live in Vercel env: Jev/DeepSeek keys and the Devnet wallets. All are
  throwaway hackathon credentials; Devnet tokens have no value; rotate after judging.
- The run's receipt key and vouchers are in KV, encrypted with `AXP_STATE_KEY`.
- Delivery acknowledgement proves DOM insertion in the judge's browser, not attention.

## 12. Local end-to-end result (2026-10-02)

`AXP_E2E_LIVE=1 node scripts/hosted/e2e-live.mjs --keep-artifacts artifacts/hosted-live-e2e`:
local dev server with the file store, headless Chrome on the dev harness
(`/__live/#auto=1`) starting, driving and acknowledging the run from its DOM.
Run `v3-devnet-live-h20261001-8897d4114d`, 74 s wall clock, 6 advance steps plus 3 delivery acknowledgements, no step retries:
queued 0.7 s, opening (2 opens + 4 DeepSeek answers 5–30 s each) 33 s, auctions
(15 Jev calls) 8 s, delivery (3 browser receipts) 2 s, closing 25 s, finalizing 3 s.

| Turn | Bids | Winner | Delivery |
|---|---|---|---|
| cached | ClearVault 4000, KeyForge 4000 (tie) | ClearVault 4000 | browser receipt |
| offline | ClearVault 3000, KeyForge 3000 (tie) | ClearVault 3000 | browser receipt |
| repeat | KeyForge 4000 (ClearVault frequency-capped) | KeyForge 4000 | browser receipt |
| mobile | none (policy) | no fill, 0 calls | — |

Settlement: ClearVault payout 7000 / refund 13000, KeyForge 4000 / 16000. Bundle
`artifacts/hosted-live-e2e/replay` (hash `6622f84f…e8ba84`), validated by
`loadV3Bundle`; story gates all passed; the MVP projection (`project-run.mjs`'s
`project()` + structural checks) accepts it unchanged. Jev 15 calls (21346 in / 1655 out
tokens); DeepSeek 4 calls, no retries.

- Stable wallet funding (one-time, not this run): [2JA6iSFe…](https://explorer.solana.com/tx/2JA6iSFefQmrwffame3B1558tFnDU1oShDfmHvAsuHeMNKNuENMyRD2UJfmikZQNXsM9nbkNsUTXZoL2vpJdfy5w?cluster=devnet)
  (0.25 SOL + 1 USDC to each payer from the existing disposable Devnet wallet)
- ClearVault open [gJS9VbEJ…](https://explorer.solana.com/tx/gJS9VbEJNZFEM8bhvrBanseQezyEMzJ52BFfKT8wzrJnwC11Fz85Yquy8aY2zH7cfAh6ivvEDcZba5NhpyCzCKQ?cluster=devnet),
  close [51nHQC6h…](https://explorer.solana.com/tx/51nHQC6hozJpV8PeFWgbhyy2zKfXVDuHUtHU4Vgczoz5jy8Y6SP2Z351kiHoogtF4HaBKh3sBJe6ikamt9oCrQAg?cluster=devnet),
  channel [xoKBvHNv…](https://explorer.solana.com/address/xoKBvHNvJ5qTJdV25tu9YTde3SKak2HKeoKYM7Vwfcj?cluster=devnet)
- KeyForge open [4K6mnDYu…](https://explorer.solana.com/tx/4K6mnDYu4ZB2nvw1kDAcwHVSUAkcmXUdsFhg8iwb422x5qFKd7Xow88Z4pWUNAwtywNeMjTy3xeKkwXgo1nMu3Q5?cluster=devnet),
  close [3yrexdmM…](https://explorer.solana.com/tx/3yrexdmM7YXTBpkg2rCQJNZvN8jbEzLQS2BLV9mYpDmwMMQiyfusPtrzj6eChTZVL7M7VKtVSSwL3hUFr7z273AM?cluster=devnet),
  channel [8iLcbovi…](https://explorer.solana.com/address/8iLcboviLAwTvcYuw715HfxPoe1FadurhKMMBipHXnHX?cluster=devnet)
- Payers: [ClearVault 8JT15Apz…](https://explorer.solana.com/address/8JT15Apzzn8BCj3UGdHp2VsfubgkUytiiLopSvwtyGqt?cluster=devnet),
  [KeyForge 4Q1hay8S…](https://explorer.solana.com/address/4Q1hay8SSmRanh6dbp3wcSvcyQXBm2Eo32GLf3mqvXeK?cluster=devnet);
  publisher [Bfra9s9K…](https://explorer.solana.com/address/Bfra9s9Kn4uKpTw7qcT93YTETtb9nFXR34iGCVtTuB78?cluster=devnet)

Second run, through the **packaged Vercel function** (`.vercel/output` served by
`scripts/build-site/serve.mjs`, env from `.env.vercel`, file store): run
`v3-devnet-live-h20261002-951e952c1c`, completed in 73 s, one DeepSeek answer retried once
(`organic_pending` path), charges 4000/3000/4000, bundle `90d37641…3a59f` validated, story gates
passed. ClearVault [open](https://explorer.solana.com/tx/4z4BjLE4DGsrJeUwvw6pDAdL8EdtAsCxvZdFnjjJQpaMFb5o1L6hB6WueDvqPZLtN7Bxa5paFBN3cgr9s1Us9V4j?cluster=devnet)
/ [close](https://explorer.solana.com/tx/4CVYr9KWpddeK6U3JGQdatGy1Sj4WtPmfSbPCQ8u526LafJTrmGJCWDMXGWrAKZY1vKzyjpyk1wAYf4DkYyCC45H?cluster=devnet),
KeyForge [open](https://explorer.solana.com/tx/2C6z6YF1kAqZPsLe1gBVUKijPjHUkhm6i2AsyRpwVeKLNYFhU7kmrupB339VhPxmnBBLWcNsREJWwvdkYCmZ4Lr5?cluster=devnet)
/ [close](https://explorer.solana.com/tx/3GrLWGExm4AxMThFYTGDHd3EphZo4dYoyt3MwCJsmG7PBDNPTyBPZ8FYAkBk8iybyHf64TeSGu7sHYxc2gbK6KA9?cluster=devnet).

Notes for the MVP builder: a hosted run's `chain-check.json` has `hosted: true` and its
`funding` entry is the one-time stable-wallet funding (with a `note`), so a run has 4
settlement transactions (2 opens, 2 closes), not the rehearsal's 5; the projection treats
funding as optional. Turns in the live status are listed alphabetically by scenario.
Not yet exercised against a real Blob/Upstash store or on Vercel itself (Blob is covered by a
protocol-level fake of its REST API), and the crash-between-broadcast
recovery path is covered by the adapter's own tests, not by a hosted run.

## 13. Files

`packages/hosted/`: `api.mjs` (routes, caps), `runner.mjs` (leased step machine),
`live-run.mjs` (engine), `kv.mjs` (Vercel Blob / Upstash REST / local dir), `vercel-function.mjs` (function entry), `vault.mjs` (encrypted
snapshots), `wallets.mjs` (stable Devnet wallets), `client.mjs` + `client.d.mts` (contract).
`scripts/hosted/`: `dev-server.mjs`, `wallets.mjs` (init/status/fund), `e2e-live.mjs`,
`harness/` (dev delivery page). Tests: `tests/hosted/hosted.test.mjs` (offline).
