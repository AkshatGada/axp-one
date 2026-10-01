# Phase5 frontend sidecar

This is a contract/client/fixture handoff, not a new frontend or a new recorded
run. Main owns `packages/replay`, `apps/replay-ui` and the Phase5 launcher/video.
The later specialist owns `apps/product-ui` and `apps/marketing`. No commit,
push, deployment, new model request, payment or wallet operation is part of this
sidecar.

## Files and commands

Run from `/Users/akshat/agentic-dsp` using the existing Node runtime (SQLite
support required for loopback contract tests). No SDK/codegen package install:

```sh
node packages/client/generate.mjs
node scripts/demo/build-frontend-fixtures.mjs
node packages/client/generate.mjs --check
node scripts/demo/build-frontend-fixtures.mjs --check
node --test tests/demo/frontend-contracts.test.mjs
```

`packages/client/schema.mjs` is the single frontend schema/route registry.
`generate.mjs` emits `openapi.json` (OpenAPI3.1 JSON) and `index.d.mts` (DTOs
and method signatures for importing `index.mjs`). Check mode fails on drift.
`validate.mjs` checks the limited schema vocabulary used here, including the
u64 maximum for amounts; it is not a general-purpose JSON Schema validator.
Runtime remains authoritative for URL, binding, deadline and cross-field
business rules. These schemas do not replace its existing validation code.

`tests/demo/frontend-contracts.test.mjs` checks generated parity, the implemented
runtime route inventory, fixtures, fake-fetch/EventSource behavior and actual
temporary loopback synthetic server responses. It never enables the source DB
or model/network payment adapters. It needs loopback listen permission in
restricted environments; do not interpret an EPERM as an API failure.

Optional type smoke using an already installed TypeScript compiler:

```sh
tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext --lib ES2022,DOM packages/client/type-smoke.mts
```

The normal build does not require TypeScript or code generation dependencies.
No paid Phase4 launcher, payment terminal command or `.env` file is needed for
fixture generation or these tests. Use main's Phase5 launcher to view the replay;
do not rerun the completed paid acceptance to rehearse.

## Replay browser integration

Import the local module through the specialist's bundler or explicitly configured
static serving. Neither existing server is assumed to serve `/packages/client/`.
The current runtime serves only its fixed reference UI files. This example uses
the replay origin supplied by main's launcher, not an assumed permanent port:

```js
import {createClient} from '../../packages/client/index.mjs';
const client = createClient({baseURL: window.location.origin, surface: 'replay'});
const bootstrap = await client.replayBootstrap();
const run = await client.replayRun();
const fixtures = await client.replayFixtures();
// Financial mode is sandbox; presentation is recorded_evidence_replay.
// Display bootstrap.readOnly and originalRecordedAt independently.
```

Replay defaults to read-only even if the caller omits `surface`. All runtime
write methods reject with `replay_read_only` before any fetch, including evidence
lookup/decision comparison POSTs. Main's replay server independently returns405
with `Allow: GET` for every non-GET, including paths outside the replay namespace.
There is no generic request method, wallet, arbitrary signature/voucher API,
payment command or automatic retry in the browser client.

`ReplayRun` names the core `campaigns`, `turns`, `evidence`, `decisions`,
`deliveries`, `payment`, `chain`, `restart`, `research`, `limitations` keys.
Its nested values and additional keys are extensible JSON, not falsely exact
records. Original amounts/IDs/hashes must be displayed without rewriting;
do not reinterpret source time/hash fields or correct them to fit a narrative.
Main's extra `/health` and `/v1/replay/diagnostics` are auxiliary replay routes;
the sidecar client consumes the four agreed `/v1/replay/*` routes.

## SSE and retry/error semantics

Runtime `/v1/events` is live: server polls every500ms and native EventSource may
reconnect with `Last-Event-ID`. Data is `{seq,type,at,data}`; `at` is original
server milliseconds. A run change emits named `reset` and resets the cursor.
Call `.close()` on unmount. Runtime and replay cursors are not interchangeable.

Main's replay `/v1/replay/events` emits original exchange events by ascending
`seq`, retains `at`, then closes. No animation timers or invented intermediate
events are implied. Invalid/negative/non-safe-integer cursors reset to0.
`client.openEvents({onEvent,onReset,onError})` returns native EventSource but
closes it on replay error/EOF so finite completion cannot reconnect forever.
Native EventSource cannot set an initial custom header. To resume explicitly:

```js
const frames = await client.replayEvents(lastSeenId);
for (const {id, data} of frames) {
  lastSeenId = id; // persist only after consumption; EOF completes without retry
  showOriginalEvent(data);
}
```

This finite fetch helper buffers the saved bounded replay stream. Native
EventSource cannot distinguish ordinary EOF from transport failure: show a
neutral "stream ended; resume if needed" state, not automatic successful-run
proof. Network failures propagate; HTTP errors become `ClientError` with
`code` and `status`. No retry/purchase/model call is triggered. Runtime writes
require an explicit decision to retry with the same turn/session identifiers.

## Current reference runtime, not the planned marketplace API

`surface: 'runtime'` is explicit and restricted to HTTP `localhost` or127.0.0.1
origins, matching actual server Host checks. Call `bootstrap()` before a write;
its local CSRF token stays in memory. The client sets `x-axp-csrf`, same-origin
credentials and redirect rejection. This is local operator access, not production
roles/tenant auth. Tokens must not enter fixtures, logs or browser persistence.

Implemented reads: health/bootstrap/state, recorded demo results, decision
cases/recorded summary and SSE. Implemented browser writes: corpus evidence
lookup, nonfinancial cached comparison, demo turn/organic recovery/reset,
campaign create/pause and award render/fail. The synthetic authorize/close routes
exist in the runtime and OpenAPI but deliberately have no browser client methods.
No planned inventory/bids/payment-sessions API is asserted to exist.

Runtime `turn`/`recoverOrganic` can invoke configured providers in an enabled
environment; the client is not authority to make fresh calls. Runtime GET state
can synchronize local network projections; it is not the read-only replay.
Frozen Phase3/4 configuration rejects campaign creation/reset with the actual
`phase3_frozen_configuration`409 code. `includeJev` is not accepted by the HTTP
comparison route. Reset preserves history; it is not a safe payment reset.

No HTTP `Idempotency-Key` requirement is invented: current turn uniqueness uses
`turnId` + `randomSessionId` and canonical body checks. Preserve both on a retry;
changed body gets409. Receipt acknowledgement is duplicate-safe server-side.
The runtime fail response can expose a render-token hash; never treat that hash
as a signing capability. Frontend fixtures omit it.

Render only approved creative as text in a separate region with visible Sponsored
label. Reuse `packages/publisher/client.mjs`'s `inspectPlacement` /
`acknowledgePlacement` in actual runtime integrations, with the thin client's
`acknowledgeRender` as transport. Do not acknowledge replay rendering: it is not
a new delivery. Publisher receipt signing remains server-side, never wallet-side
in the browser. DOM insertion/disclosure is not human attention or conversion.

## Fixtures served by main

`artifacts/phase5/frontend/fixtures.json` is UTF-8 JSON:

```json
{"schemaVersion":"axp.frontend-fixtures.v1","fixtures":[]}
```

The real array contains nine `FrontendFixture` envelopes; individual copies are
`<id>.json` in that same directory. Each has `schemaVersion`, `id`, `sourceKind`,
`financialMode`, `description`, `source`, `response`, `limitations`. Main's
`GET /v1/replay/fixtures` returns this object without an extra wrapper.

| ID | Provenance | Response meaning |
|---|---|---|
| awarded | recorded_run / sandbox | Saved TurnResult, current delivered award; not a fabricated reserved snapshot |
| no-fill | synthetic_test / synthetic | Hypothetical TurnResult without ad/charge |
| failed_delivery | synthetic_test / synthetic | Hypothetical failed Award, no accepted receipt |
| accepted_unpaid | synthetic_test / synthetic | Hypothetical payment projection; accepted is not authorized |
| authorized | synthetic_test / synthetic | Hypothetical payment projection; authorized is not settled |
| pending | synthetic_test / synthetic | Hypothetical close pending, no finalized payout |
| unknown | synthetic_test / synthetic | Hypothetical reconciliation requirement, not zero obligation |
| finalized | recorded_run / sandbox | Saved payment and charge/receipt/hash correlations |
| competing_bids | synthetic_test / synthetic | Two hypothetical funded channels/bids, 3000 wins over2500; no recorded competition |

Recorded source metadata retains the run ID, source-artifact export timestamp
(`sourceArtifactGeneratedAt`, not an inferred original timeline) and byte SHA256
hashes for both Phase4 inputs. Public fields and original hashes are unchanged.
Intermediate states have `source: null`, fixture identities, no original event
time and no claim to represent a measured Phase4 state. Phase4 funded only
TripDesk. Receipt packets were reconstructed on operator replay and marked
`recordedOnReplay`; original charge/receipt hashes remain original.

The generator reads only the two saved Phase4 artifacts. It exports no CSRF,
keys, raw receipt signatures, signed spending vouchers, private config or raw
transcripts. Public transaction signatures are identifiers, not spend authority.
Do not link a sandbox signature with a Devnet/mainnet explorer default.
