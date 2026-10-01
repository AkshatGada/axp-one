# V2 paired Jev harness

Locally implemented and fixture-tested. No actual provider calls, credentials
read from disk, commits, deployment, wallets or upstream writes in this lane.
Enables the paired decision beat; does not prove targeting accuracy, causal lift,
an actual eligible-agent skip, or a completed live V2 demonstration.

## Exact API

`packages/v2/agents.mjs` exports only:

```js
createPairedHarness({
  stateDir,                 // absolute path; private, dedicated V2 state directory
  runId,                    // stable ID; one identity per state directory
  retriever,                // {manifest, retrieve(task, exactMlCampaign)}
  apiKey,                   // optional server-only key, never persisted
  liveEnabled = false,
  transport,                // optional fake async (payload, {signal}) => Jev response
  now = Date.now,            // function returning epoch milliseconds
})
// returns {run, status, results}

await harness.run({questions, campaigns, opportunityIds}) // result array
harness.status()                                         // synchronous durable status
harness.results()                                        // synchronous saved result array
```

`questions`: one or two unique strings from main's frozen `QUESTIONS`.
`campaigns`: one to three strict ML DTOs, unique campaign and version IDs.
Full connected execution is 2 questions × 3 campaigns × 2 arms = 12 maximum.
Subset runs are accepted but cannot later expand their frozen inputs.
`opportunityIds`: optional unique ID array of the same length as questions.
Supplied IDs bind both arms' validated decisions. Omitted IDs are deterministic
from run ID/question index. IDs cannot be rebound on restart.

Use `CAMPAIGNS.map(c => mlCampaign(c, ownTargetingText))` in main, not the raw
exchange DTO. The harness preserves the exact supplied ML DTO; retrieval and
profile validation bind to its canonical hash, including any targeting appended
to `approvedText`. It never reconstructs or strips those declarations.

An injected transport is always labelled `fixture`, even when liveEnabled=true.
Without injection, liveEnabled=false yields durable unavailable abstentions and
zero admissions. Without a valid supplied key, enabled execution is also
unavailable without admission. No environment/key-file lookup is performed.
Main alone enables actual HTTP after freezing the connected run; tests never
use real HTTP. A disabled `run()` saves terminal unavailable outputs: use
`status()` for preflight; do not invoke `run()` as a dry run for a later live run.

## Results and status

Each result has `questionIndex`, `task`, `campaignId`, `campaignVersionId`,
`arm` (`text_only`/`history`), `retrieval` (null for text-only), validated `decision`,
stable `callId`, `requestHash`, `status`, `rawOutput`, `failure`, `usage`,
`admittedAt`, `startedAt`, `completedAt`, `elapsedMs`. A received response also
records `responseAt`, `responseReceived`, `rawOutputHash`, `responseBytes` and
`responseRejected`. Timing is actual local time/monotonic elapsed time, not a
provider latency or performance claim.

- `completed`: original valid bid/skip or model evidence-insufficiency abstention.
- `failed`: original invalid or late received response; validated abstention.
- `uncertain`: admitted attempt without a captured response; validated abstention.
- `admitted`: persisted in-flight/crash state; provisional `call_uncertain`
  abstention, never retried or treated as a bid.
- `unavailable`: no invocation, e.g. missing/unaligned history, invalid profile,
  disabled live mode, missing key or oversized input.

Pending slots are durable but excluded from `results()` until processed/admitted.
`status()` includes `maxCalls`, `admittedCalls`/`admitted`,
`remainingCalls`/`remaining`, `plannedCalls`, `pendingCalls`, `completedCalls`,
`uncertainCalls`, `failedCalls`, `unavailableCalls`, `transportMode`, `frozen`,
`inputHash`, `freezeHash`, `manifestHash`, `policyHash`, and aggregate `usage`
(`inputTokens`, `outputTokens`, `unknownUsageCalls`). Remaining means unused
admission allowance, not permission to retry terminal unavailable slots.

## Durability and frozen authority

Dedicated `stateDir/paired-harness.sqlite`, built-in Node SQLite, FULL synchronous
commits and short BEGIN IMMEDIATE transactions. The full plan/manifest is committed
before any invocation; each slot commits its admission and provisional abstention
before calling the provider. SQLite serializes concurrent admission. No transaction
spans retrieval or provider I/O. Keys are questionIndex/campaignVersionId/arm.

The input hash freezes questions/order, exact campaign DTOs/order, opportunity
bindings, all manifest fields and policy. The freeze hash also freezes the selected
retrievals and semantic requests. Policy includes main's policy, model, rubric,
mapping/question versions, fixture/live mode, 12-call cap, 12-second deadline and
source-byte hashes of this harness, config, core, strict contract, base engine,
Jev engine and HTTP transport. Changed input, manifest, policy, implementation or
run identity is rejected; code must remain unchanged after main's live freeze.
Attempt-specific deadlines are stored but excluded from the semantic freeze.

Restart never invokes an admitted, uncertain or terminal slot. Untouched pending
slots can finish under the same freeze and remaining allowance. A completed
identical run returns saved outputs without retrieval or invocation. Even a crash
after capturing output but before validation leaves an abstention, not an
automatically recovered bid. No reset, delete, correction or retry API exists.
Do not delete/move the private database to reset allowance.

## Model and failure boundaries

Existing `JevDecisionEngine`, `buildJevRequest`, `createJevHttpTransport`, strict
campaign/request/profile/decision validators and Jev response validation are reused.
Engine and HTTP deadlines are 12 seconds; no short adtech latency is claimed.
Only normalized task, own declarations/approved creative and compact validated
retrieved evidence enter the model. No budgets, competitors, wallet/admin tools,
financial arithmetic or automatic rules substitute. Explicit mandatory policy
and auctions remain main-owned; frozen wallet questions carry soft preferences.

History requires a ready retrieved profile aligned to the exact campaign hash,
retrieval method, snapshot ID and source hash. Null/unavailable/unaligned/invalid
history yields unavailable, not a text-only model call masquerading as history.
Profile limits are enforced by the main-owned strict validator (3 examples,
2 hints, no vectors, 2400 text characters). Provider input also obeys the existing
8192-byte cap. There are no automatic corrective calls, extra model arms or rule
fallbacks, and no allowance for main's separately gated corrective work here.

Original parsed responses, including safe malformed schemas, are captured before
validation. Usage survives invalid-schema/late responses. Oversized (>65536 bytes)
or credential-bearing responses are retained as hash/byte-count/rejection metadata
only, with abstention; they are never silently corrected. Known error codes persist;
arbitrary exception messages/stacks do not, preventing key leakage. The existing
HTTP transport does not expose rejected/non-JSON HTTP bodies; those remain explicit
transport failures with unknown usage. Main must still sanitize public exports.

## Executed verification

```sh
node --test tests/v2/agents.test.mjs tests/ml/jev-http.test.mjs tests/ml/engines.test.mjs
```

Result: 32 passed, 0 failed, 0 skipped (14 harness checks plus 18 existing engine/
HTTP transport checks). All transports are fake, using temporary SQLite
directories. Tests cover 12-slot
admission, isolation, immutable bindings and own targeting, strict limits, missing
history/profile corruption, raw failure/usage preservation, deadline rejection,
credential/size screening, disabled/missing-key execution, concurrent instances,
actual child-process exit after admission, restart/no repeat and saved replay.
Child-process exit after raw output capture also preserves that original response
and usage without recovering a bid or consuming another admission on restart.
Main owns connected service/browser acceptance and any later live evidence.
