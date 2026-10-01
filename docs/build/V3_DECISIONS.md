# V3 persistent decision harness

Implemented locally 2026-10-01; fixture-tested, not real Jev execution or sandbox
payment evidence. `V3_TASK.md` and `packages/v3/config.mjs` override historical
travel/default-engine plans. Only the three assigned builder files were changed.
V1/V2 code, state and artifacts were not edited. No commit, push, deployment,
source DB/export, embedding/model call, wallet access, signing or funding.

## Frozen interface and integration

`createV3Harness({stateDir,runId,retriever,apiKey,liveEnabled,transport,now})`
exports exactly `runSlots({slots})`, `status()`, `results()`, `close()`.

- `runSlots` returns an array of persisted records for the supplied slots, in
  supplied order. Main consumes `.arm`, `.campaignId`, `.decision`; each decision
  is validated `agent-decision.v1`, compatible with the existing Exchange.
- `results()` returns all frozen records in insertion order, including pending,
  unavailable and uncertain records. Outputs are detached and deeply frozen.
- `status()` returns global admissions/remaining, per-category
  `{limit,planned,admitted,remaining}`, terminal-state counts and known/unknown
  usage. `admittedCalls`/`remainingCalls` aliases support main's presentation.
- `close()` is asynchronous: await it to drain this instance's queued work and
  reject further runs. No persistent connection is held between transactions.

No slot-schema/API deviation. `correctionOf` is a string naming a prior slot.
Acceptance requests (`paired`, `repeat`, and their `correction` slots) use
`mode: sandbox`; `laboratory` uses `synthetic`. Fixture execution is explicitly
labelled `engineProvenance.transportMode: fixture`. V2's unchanged fixture engine
requires an internal synthetic-mode validation copy; mode is absent from the
Jev wire packet, so the saved sandbox request and actual packet remain exact.
No `financialMode` slot extension has been introduced.

All three advertisers may be judged independently, including LeatherGuard.
The harness does not hard-exclude it or fabricate a skip. The slot interface
does not supply mandatory capabilities; request `taskConstraints` stays empty,
while frozen question-specific soft preferences come from V3 config. Main's
Exchange owns mandatory eligibility, mobile-only deterministic no-fill,
financial arithmetic and final auction admission. Only history decisions enter
auctions. Main does not call the harness for mobile no-fill (zero admissions).

## Persistence, freeze and allowance

Separate file `stateDir/v3-agents.sqlite`, separate `v3_run`/`v3_slots` tables.
One directory binds one run, evidence manifest, transport kind, policy and
implementation hashes. A different identity fails closed, never resets counts.
SQL transactions use `BEGIN IMMEDIATE`, full synchronous durability and a CAS
on each pending slot. No transaction spans retrieval or provider work.

Each supplied batch is prepared and frozen before its first provider admission.
Caller objects are snapshotted before awaiting. Slot identity binds exact
question/index, arm, own ML campaign including appended targeting text,
opportunity, category and correction reference. Changed bodies conflict before
retrieval or calls; unchanged bodies reuse frozen outcomes without re-retrieval.
Additional distinct batches are allowed only within the same lifetime limits.

The durable allowance is 24 admissions: paired12, repeat3, laboratory6,
correction3. Failures and uncertain calls retain their admission. Categories
cannot borrow allowances. Frozen plans are also capped at those counts, so an
unavailable slot is not replaced under a new ID to hunt for a preferred outcome.
Unavailable preflight consumes no provider admission; expose planned and actual
admitted counts separately. Thus 15 planned acceptance slots do not necessarily
mean 15 calls or 15 valid/completed decisions.

Admission, attempt deadline/time, exact request, packet and initial abstention
are committed before invoking the provider. Multiple instances cannot admit the
same slot twice. A dead process's admitted slot becomes `uncertain` with
`call_uncertain` abstention on recovery. Original raw output/usage, if captured,
is retained; a recovered uncertain bid is never inferred or retried. Active
same-process calls and calls owned by a still-live process are not stolen.

## Corrections and retained failures

A correction must reference a terminal failed abstention and the original exact
question/index, arm, campaign and opportunity bindings. Its new slot/category
and durable admission make it a distinct documented correction, never a retry
that overwrites the original. The persisted `documentedDefect` contains defect
type/code/stage and, for the correction, the referenced original failure hash.
At most one correction references each original; correction chains are rejected.

Recognized documented defects:

- Definitive HTTP failure: strict transport's `jev_http_4xx`/`jev_http_5xx` code
  establishes an HTTP response, not an ambiguous lost network acknowledgement.
- Strict provider schema failure: `jev_response_invalid`, `jev_model_mismatch`,
  `schema_invalid`, `unknown_field`, `missing_field`, `score_invalid`,
  `creative_id_invalid`, `decision_binding_invalid`, `bid_invalid`,
  `skip_invalid`, `evidence_id_invalid`. Malformed JSON from the unchanged HTTP
  transport is a definite response/schema failure even without a decoded body.

Valid bids/skips, sufficient=false abstentions, unavailable history/key/authority,
timeouts, generic transport errors, interrupted calls and all uncertain outcomes
do not qualify. Oversized/unsafe bodies do not qualify. No outcome is rerun to
manufacture winners or improvement. There is no rules or text-only fallback.

Generic provider/network errors without a definitive response remain uncertain.
Received invalid/late outputs remain failed abstentions; an insufficient packet
is a completed provider abstention, not a failed skip. Known usage is retained
even on schema failures; unknown usage is explicit. Late outputs cannot revive
terminal timeout decisions or initiate another call.

## Exact packet and public-safe bindings

Reuse unchanged V2 evidence exports plus existing strict Jev request, rubric,
mapping and HTTP transport. No V2 edits or upstream service calls. The request
contains one own nonfinancial ML campaign, question/opportunity and bounded
selected historical associations/inferred hints. No competitors, budget, bid,
channel, deposit, wallet, credential or raw vectors reach Jev.

Each record exposes `request`, `packet`, canonical `packetHash`, exact serialized
`packetBytes` and byte `packetBytesHash`, `inputHash`, `requestHash`, `bindings`,
retrieval, validated decision, attempt state/timing and safe raw response/usage.
`requestHash = hash({packet,bindings,inputHash})`. Bindings include slot/run,
mode, question hash/index, opportunity, own campaign/version/advertiser/hash,
arm/category, manifest hash, source hash, profile hash and retrieval hash.
The provider callback checks canonical hash and serialized bytes against the
durable packet before invocation. The strict transport fixture verifies its
actual POST body equals the saved packet bytes.

Profiles must match the own campaign content, source/snapshot, retrieval method,
observed examples and hints; query hashes, when supplied, match the question.
Bounded public retrieval shapes reject vectors and private source associations.
Missing aligned history is an honest unavailable abstention with zero admission,
not invented physical-wallet history or a text-only substitute.

Credentials live only in transport construction, not persisted identity, inputs
or results. Failure messages are safe codes, not arbitrary provider exceptions.
Oversized or credential/private-identifier-bearing outputs are hash-only failures;
raw bytes and credentials are not persisted/exported. Hashes are local integrity
checks, not independent attestation, targeting lift or attention evidence.

## Verification and freeze

`node --check packages/v3/agents.mjs` passed.

`node --test tests/v3/agents.test.mjs`: 15 passed, zero failed/skipped. Fixtures
cover buyer isolation/LeatherGuard, durable24/category limits, frozen conflicts,
caller mutation, missing/invalid evidence, schema/HTTP/generic errors, correction
references, concurrent instances, real process death before/after output capture,
restart/no repeat, timeout, disabled/keyless live paths, safe projection, exact
fake HTTP POST bytes and unchanged actual cached/lexical V2 export reuse.

Final bounded regression command:
`node --test tests/v3/agents.test.mjs tests/v3/service.test.mjs tests/v2/agents.test.mjs tests/v2/evidence.test.mjs tests/ml/jev-http.test.mjs`
passed 54 tests, zero failed/skipped, including main's three service fixtures.
The earlier adjacent check passed 50 before the final malformed-JSON case and
service checks. No live-provider flag was enabled; fixture integration is not
real acceptance execution. Main separately reported its earlier full repository
run as 349 total/343 passed/6 skipped; that was before this builder's final
15-test harness set, not a freshly reverified full-suite count here.

Final `packages/v3/agents.mjs` SHA-256:
`0bdd11750482382ae0863134e8798639f8095c5fb32bd94fd8003e3aece34cdb`.
Module code is frozen for main's real-state initialization. Later changes require
an explicit freeze/review decision; do not silently drift implementation hashes
after main admits actual calls. This document/test updates do not enter the
harness implementation hash set.

The preceding builder record describes its handoff, not current acceptance.
Main subsequently completed15 actual Jev calls,4 isolated organic completions,
two funded competing auctions,3 browser deliveries, native receipt-linked
settlement and the focused review. See V3_RESULT.md and verified replay.
Cached history changed intent2→3, not fit/bid/skip; offline pairs unchanged.
No model or monetary output was selectively rerun to obtain a preferred winner.
