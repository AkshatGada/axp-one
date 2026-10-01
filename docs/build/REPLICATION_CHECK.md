# Replication check: fresh clone, README followed step by step

Date: 2026-10-02. Machine: macOS (Darwin 25.5), Node 25.5.0, pnpm 11.9.0, npm 11.8.0.
Clone: `git clone --branch frontend /Users/akshat/agentic-dsp /Users/akshat/axp-clone-test`
(committed HEAD only: no `.env.local`, `local-state/`, `node_modules` or generated data).
Started at `8ad364b`; the fixes below were pulled into the clone (`de0ff12`), and the
affected steps were run again. The clone is left in place for inspection.

## Result

A fresh clone works end to end for everything a judge can do without secrets: the test
suite, the recorded replay and its check, the install, both dev servers, both static builds,
the MVP tests, the repository check and the local hosted server. Without keys, the live path
refuses to start and says exactly what is missing. No live run was attempted.

## Step log

| # | README step | Command | Result | Time |
|---|---|---|---|---|
| 0 | Clone | `git clone --branch frontend …` | ok | 1.6 s |
| 1 | Suite, no install | `npm test` | 391 tests: 380 pass, 0 fail, 11 skipped | 4 s |
| 2 | Replay | `npm run demo:v3:replay` | **EADDRINUSE** stack trace: the owner's own replay server already held :8794 | – |
| 2b | Replay, other port | `AXP_V3_PORT=8894 npm run demo:v3:replay` | ok. `/`, `/health`, `/v3/replay/bootstrap`, `/v3/state` (349 KB), `/v3/replay/events` return 200; `POST /v3/replay/run` returns 405 (read-only) | < 1 s to ready |
| 3 | Replay check | `node scripts/demo/v3-replay-check.mjs artifacts/v3/replay` | `allChecksPassed: true`, 0 upstream calls | 0.2 s |
| 3b | (not in README) the same check on the two Devnet bundles | `… artifacts/v3-devnet-live-rehearsal/replay`, `… artifacts/hosted-live-e2e/replay` | AssertionError `'devnet' !== 'sandbox'`: the check only covers the sandbox recording (now said in the README) | – |
| 4 | Install | `pnpm install --frozen-lockfile` | ok, 32 packages | 1.2 s (warm pnpm store; a cold machine downloads) |
| 5 | Landing dev | `pnpm --filter @axp/marketing dev` | Ready in 4.9 s; `/` renders "axp.one: the advertising exchange…" | about 6 s for the first page |
| 6 | MVP dev | `pnpm --filter @axp/product-ui dev` | Ready in 4.7 s; `/verify` renders "Verify, axp.one MVP" | about 6 s |
| 7 | Landing build | `pnpm --filter @axp/marketing build` | ok: static export, lint-copy clean, `apps/marketing/out` | 12 s |
| 8 | MVP build | `NEXT_PUBLIC_BASE_PATH=/mvp pnpm --filter @axp/product-ui build` | ok: 23 static pages; `out/` (main) and `out/first-recording/`; assets under `/mvp/_next` | 22 s |
| 9 | Local hosted server | `node scripts/hosted/dev-server.mjs` | ok. `/`, `/mvp/`, `/mvp/verify/`, `/__live/`, `/api/health`, `/api/live` return 200; `POST /api/runs` returns 503 `live_runs_unconfigured` | < 1 s |
| 10 | MVP tests | `pnpm --filter @axp/product-ui test` | 35/35 pass | 1 s |
| 11 | Repository check | `node scripts/setup/check-repository.mjs` | passed on a clean or just-built clone; **blocked** after step 5 ran (fixed, see below) | < 1 s |
| 12 | Builds leave git clean | `git status --short` | clean (all output is gitignored) | – |

## Live run: variables and the no-keys behaviour (no live run made)

The README's step 3 names `JEV_API_KEY` and `DEEPSEEK_API_KEY` (in `.env.local`), the Devnet
wallet file (`node scripts/hosted/wallets.mjs init`, `AXP_DEVNET_WALLETS_PATH`/`AXP_DEVNET_WALLETS`),
funding, and `AXP_LIVE_ENABLED=1`. This matches the code: `packages/config/local.mjs` merges
`.env.local` with the process environment, and `packages/hosted/api.mjs` needs both model keys
and wallets before it reports `live`. `TYPESAFE_API_KEY` is still accepted as an alias.

Messages captured without keys:

- `AXP_LIVE_ENABLED=1 node scripts/hosted/dev-server.mjs`
  - Before the fix it printed only `live runs disabled; store unconfigured`, with no reason.
  - Now it prints: `AXP_LIVE_ENABLED=1 but live runs are off; missing: JEV_API_KEY, DEEPSEEK_API_KEY, Devnet wallets (node scripts/hosted/wallets.mjs init, or AXP_DEVNET_WALLETS_PATH / AXP_DEVNET_WALLETS). Set them in .env.local (README step 3).`
  - `GET /api/live` reports `configured: {liveEnabled: true, modelKeys: false, wallets: false, walletError: "wallets_unavailable"}`.
  - `POST /api/runs` returns 503 `{"error":"live_runs_unconfigured"}`.
- `AXP_E2E_LIVE=1 node scripts/hosted/e2e-live.mjs` exits 1 at once with
  `e2e failed: live runs not enabled: check JEV/DeepSeek keys, wallets and funding`.
- `node scripts/hosted/wallets.mjs status` prints `{"status":"blocked","reasonCode":"wallets_unavailable"}`.
- `node scripts/payment-spike/phase4-sdk.mjs` run before the README's `npm ci … --prefix tooling/payment-sdk`
  prints a raw `Cannot find module 'semver'`. Following the README's order avoids it.

## Fixes made (committed, not pushed)

- **`82f0698` README, `.env.example`, `package.json`, dev server, STANDALONE_SETUP**
  - **README:**
    - The clone command names its folder.
    - The Node requirement now reads 22.18+, matching `engines`.
    - A port-in-use note covers `AXP_V3_PORT` and `AXP_HOSTED_PORT`.
    - It says the replay check covers the original sandbox recording, and that Devnet runs are
      verified by the MVP build (`project-run.mjs` fails the build if any check fails) and by
      the MVP's `/verify` page.
  - **`package.json`:** `engines.node` changed from `>=22.13.0` to `>=22.18.0`. The MVP build
    imports `.ts` files through Node type stripping, which 22.13 does not have by default.
  - **`docs/STANDALONE_SETUP.md`:** the same Node wording.
  - **`.env.example`:**
    - Added `AXP_LIVE_STALE_SECONDS`.
    - Marked `AXP_V3_PORT`, `AXP_V3_ENABLE_MODELS` and `AXP_V3_OPERATOR_SIGN` as process
      environment only; they are not read from `.env.local`.
    - Listed the optional process-environment variables, names and purpose only:
      `AXP_E2E_LIVE`, `AXP_CHROME_BIN`, `AXP_HOSTED_DEVNET_SIGN`, `AXP_V3_DEVNET_SIGN`,
      `AXP_CODEX_BIN`, `AXP_RUN_DIR`, `NEXT_PUBLIC_BASE_PATH`, `AXP_PORT`, `AXP_STATE_DIR`,
      `AXP_RUN_ID`, `AXP_CORPUS_DB`.
  - **`scripts/hosted/dev-server.mjs`:** with `AXP_LIVE_ENABLED=1` but no live configuration, it
    names the missing settings (names only, never values).
- **`de0ff12` `scripts/setup/check-repository.mjs`:** the check now skips gitignored Next output
  (`.next-dev`, `.next-first`, `.next-build`, `out`), as it already did for `.next`.
  - Before this, running the README's dev servers flagged generated chunks under
    `apps/*/.next-dev` as `machine_specific_path`. This happened in the clone and in the source
    tree. No tracked file lives in those directories.
  - The marker it looks for is the owner's home path, so this hit the owner's machine; a judge
    with another username would not have seen it.

## Open

- **40 GiB free-disk floor: not removed.** The owner decided to remove it. The edit was refused
  by the Claude Code permission classifier ("Security Weaken"), so the floor is unchanged in all
  of these:
  - `scripts/demo/v3.mjs` (also blocks `npm run demo:v3:replay` on a machine with under 40 GiB free)
  - `scripts/payment-spike/phase4-sdk.mjs` (`FLOOR`, in `capacity()`; keep `LIMIT`)
  - `scripts/demo/phase4-payment.mjs`
  - the packaging and recording scripts: `phase5-bundle`, `phase5-package`, `phase5-recording`,
    `v2-recording`, `v3-recording`, `v3-package`, `v3-preservation`
  - `v2-evidence` (40 GiB) and `advertiser-evidence` (50 GiB)
  - `packages/v3/payments.mjs:163` (freeze path)

  No test asserts the floor: `tests/` has no reference to it. The frozen copies under
  `artifacts/*/offline*` are recorded snapshots and should stay as they are. The owner needs to
  make this edit or approve it.
- `npm run demo:v3:replay` still crashes with a raw `EADDRINUSE` stack when the port is taken.
  The README now says what to do.
- Defaults that point at this Mac, both overridable:
  - `AXP_CHROME_BIN` defaults to the macOS Chrome path (`e2e-live.mjs`).
  - `AXP_CODEX_BIN` defaults to the ChatGPT app's copy of codex (`v3-devnet-live.mjs`, the
    terminal operator; not on the judge path).
- Not exercised:
  - A cold pnpm store (the install time here is from a warm store).
  - Node 22.x.
  - Linux or Windows.
  - A real live run (needs secrets; out of scope).
  - Visual rendering in a browser (only HTTP status and page titles were checked).
- No problems were found in `apps/marketing` or `apps/product-ui` source.
