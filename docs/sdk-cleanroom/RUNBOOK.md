# Isolated publisher integration exercise

## Scope

This worktree tests integrating the actual source SDK with another chat app, using
loopback HTTP, browser DOM and synthetic local accounting. It does not connect
to the deployed AXP workspace, ContextHint DB, real LLM/Jev providers or a wallet.
Use Node 22.18 or newer. The source server/browser SDK needs no npm dependencies.

## Exchange

From the experiment worktree:

```sh
node experiments/sdk-cleanroom/launch.mjs
```

Open `http://127.0.0.1:3471/`. The combined launcher supplies the publisher key
only to the child server environment. It does not inherit provider/wallet secrets.
The exchange binds `127.0.0.1:3470`. Its state is isolated under ignored
`local-state/sdk-cleanroom`. Startup creates a local publisher credential and
receipt signer; do not print, copy into browser assets or commit them.
No existing wallet or product state is loaded. Do not delete this state to claim
restart/idempotency evidence: restart must reopen the same records.

For the original two-terminal integration setup, run
`node experiments/sdk-cleanroom/exchange.mjs`, then in
`experiments/sdk-cleanroom/app` run `npm run start:axp`. That exchange-only
launcher also creates the ignored `integrator.env`. Do not run both launchers on
the same ports. The independently integrated app deliberately accepts only the
operator exchange URL `http://127.0.0.1:3470/api/product` in its CLI configuration.

Check **Optional Sponsored fixture**, ask “Recommend a developer tool to debug a
TypeScript API.”, and inspect the separate StackPilot card. Ask “Compare hardware
wallets for Ethereum and Solana.” for actual policy no-fill with the same fixture
inventory. Neither answer is a genuine LLM completion; the label is intentional.
The fictional decision fixture does not measure the relevance of arbitrary text.

The log is scrollable. A newly appended card can initially be below its visible
area; keyboard-focus its link or scroll the conversation to inspect the full card.
Insertion acknowledgement does not assert viewport visibility or attention.

Public configuration: `http://127.0.0.1:3470/api/product/publisher/config`.
Operator evidence: `http://127.0.0.1:3470/__lab/evidence` (loopback only).
Evidence includes synthetic ledger records, fixture decision inputs and public
receipt signatures, never publisher keys or private signing keys.

## Verification

```sh
node --test experiments/sdk-cleanroom/*.test.mjs experiments/sdk-cleanroom/app/test/*.test.js
node --test tests/publisher-sdk/*.test.mjs
node scripts/test.mjs
```

HTTP tests require permission to listen on loopback. A sandbox `listen EPERM` is
an environment restriction, not a failed exchange assertion; rerun with local
socket permission. The repository suite can skip native SDK fixtures if the
optional pinned payment package has not been built. That is outside this test.

The first command runs 30 app/harness/source-preservation checks, including actual
app → SDK → product HTTP/ledger integration. Other cases explicitly use DOM and
transport fixtures. Existing SDK checks are separate. Baseline and integration
source manifests live under `artifacts/sdk-cleanroom`.

After browser verification, save sanitized operator evidence with:

```sh
node experiments/sdk-cleanroom/capture.mjs
```

Review `app/INTEGRATION_LOG.md` for the integrator's own observations and
`docs/sdk-cleanroom/REVIEW.md` for the separate review. The integrated app's
session/retry bindings are in-memory: exchange restart/replay durability is tested,
but app restart is not a durable end-user reconciliation implementation.
