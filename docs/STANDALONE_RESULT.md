# Standalone consolidation result

## What is portable

The AXP backend, laboratory, recorded V1–V3 evidence, screened ContextHint
export, cached compatible vectors, contracts, reference consoles, fonts and
design assets are repository-local. The native payment SDK's tested source,
license, package metadata, integrity pins and compiler lock are included.
No AXP runtime module imports an old project or reads ContextHint's live database.
Optional corpus-maintenance scripts are not prerequisites for the demo.

Codex and optional FFmpeg tooling resolve from PATH or explicit operator
overrides, not macOS application/Homebrew paths. Capture directories are explicit
inputs and no longer require a macOS-specific temporary location.

## Reproduction actually checked

From a fresh local Git clone, without the original ignored wallet, environment
file or financial databases:

- Vendor/source portability check passed; 71 source-manifest files verified.
- The native SDK rebuilt from 67 vendored TypeScript modules and 72 pinned
  registry packages; compiled modules matched the tested hashes.
- Repository suite: 370 tests, 364 passed, six optional tests skipped, zero
  failures. Native payment tests used ephemeral fixtures, not funded wallets.
- Read-only V3 replay checked 30 HTTP requests with credentials absent and
  upstream access disabled. Seven mutation routes were rejected; zero new model
  calls, charges, signatures or broadcasts occurred.
- Cached vector retrieval and labelled lexical fallback remained available.
- The original working checkout's preservation check retained 205 files.

Verified bundle: `v3-wallet-acceptance`, SHA-256
`e34448fafa059d88c0120373fe039940ee1aca29369e3a245293a8b0f5a2152a`.

The clean-clone tests ran on this Mac with Node 25.5.0, not on a separately
provisioned Linux/Windows laptop. This verifies removal of this checkout's local
dependencies; it is not a claim of tested compatibility on every OS.
Final marketing/product-UI acceptance remains with the frontend specialist.

## What is deliberately not committed

Provider credentials, wallet private keys, publisher secrets, private spending
vouchers, financial databases and installed dependencies remain ignored.
The existing approved disposable wallets are available locally under
`local-state/secrets/test-wallets.json`, with owner-only permissions.
Test credentials still authorize usage or spending; a public Git clone must not
contain them. Fresh actual model/payment operations require private configuration,
service access, explicit admission and the necessary retained private state.
Recorded replay requires none of those and does not recreate closed channels.

See [STANDALONE_SETUP.md](./STANDALONE_SETUP.md) for launch and installation.
No push, deployment, fresh model inference, new funded transaction or original
evidence regeneration was performed during consolidation.
