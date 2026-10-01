# V2 independent focused review

Reviewed 2026-10-01. Fresh reviewer; did not draft or build this implementation.
Scope: algorithm, integration, claims and bounded-demo reproducibility only.
One substantive reproducibility blocker below; no production-hardening requests.
No provider/model calls, payments, upstream queries/writes or old-state writes.
Only this review document was written. Tests used disposable temporary state;
the original harness SQLite was opened with `readOnly: true`.

## Finding

### [P2] Replay acceptance does not validate the decision-to-auction evidence chain

Location: `packages/v2/bundle.mjs:9-15`, called by
`packages/v2/bundle.mjs:20-21`; package producer
`scripts/demo/v2-package.mjs:11-14`.

`validateV2Run` checks twelve distinct call IDs, at least one charge, signed
receipt/award correlation and channel totals. It never validates the paired
slot identities, actual/unavailable counters, historical profiles, original
response-to-decision mapping, or history decision → bid → winning award chain.
Consequently the credential-free replay can pass its acceptance check while
its principal model/evidence/auction story contradicts the recorded financial
evidence. File SHA-256 verification does not repair this: the package writer
validates the same incomplete semantics before producing a fresh file hash.

Reproduced without writing artifacts: load the current actual bundle, clone
`run` in memory, apply each change independently, then call `validateV2Run`.
Every one of these invalid variants returned `true`:

- Set Q1 ClearVault history `decision.opportunityId` to `different-opportunity`.
- Remove `state.completed.turns` entirely while retaining the signed charges.
- Set `state.model.admittedCalls = 12` and `unavailableCalls = 0`, leaving the
  actual two PocketKey unavailable slots unchanged.
- Promote a PocketKey history slot to `completed` with a dummy raw response.
- Remove all paired history retrievals, or remove a completed raw response.
- Relabel a charge's `campaignId` to PocketKey while its award remains ClearVault.

Impact is a missing reproducible acceptance gate, **not a claim that the current
run is fabricated or misbound**. Independent checks against the original
read-only SQLite established that the current run's inputs, responses, decisions
and two paid-in-simulation placement chains agree.

Narrow fix: extend the offline V2 validator and fixture tests to check the frozen
2 × 3 × 2 slot matrix; reconcile status/admission/response/usage counts; bind
profiles and snapshot/campaign hashes; validate available original responses and
their mapped decisions using existing validators; and correlate history-arm
decisions through `agentRunId`, opportunity/campaign/version/creative IDs,
`winningBidId`, award, receipt and charge/channel identities. Recompute the two
integer bids/caps with the existing policy, without introducing a new algorithm.
If exact semantic requests are needed, export a sanitized vector-free packet or
deterministically reconstruct and verify the existing `requestHash`; do not
package private SQLite or receipt keys. Reject the invalid variants above.
Do not rerun models, fabricate missing history or alter the frozen harness to
address this packaging-layer finding.

## Verified actual evidence

Reviewed bundle: `artifacts/v2/replay/manifest.json`, original run
`v2-wallet-acceptance`; manifest-byte SHA-256
`a92699b1bee9b6472a69145bb1de83e8c7d56a9bf3e563ec0d0fa3e125c93ef0`.
Bound `run.json` SHA-256:
`6155f233aa44640f8502f8756f29c28d70bceb1f54e3abf63726ebf953dd5f3b`.

- **Actual versus unavailable:** 12 planned slots, 10 admitted/completed actual
  responses, 2 unavailable/unadmitted PocketKey history slots, no failed,
  uncertain or pending calls. Usage totals 13,579 input / 1,072 output tokens.
  All 12 replay raw outputs and decisions canonically match the original saved
  rows. All saved request hashes and the input/policy hashes recompute correctly;
  all seven frozen implementation-byte hashes match the current source.
- **History really enters model input:** rebuilt all 12 semantic payloads and
  matched them to the saved payloads. Four available history calls contain the
  observed examples and inferred hints; six text-only payloads have null
  evidence. Both unavailable PocketKey history slots have no admission/response
  and are not substituted with text-only calls. Bindings follow
  `packages/v2/agents.mjs:141-160,191-210` and
  `packages/ml/engines/jev.mjs:10-23`.
- **Category alignment:** reretrieved the four available historical packets
  offline and matched saved retrievals canonically. ClearVault examples affirm
  hardware wallets; LeatherGuard examples are physical wallets. PocketKey has
  no aligned mobile history. The CoinLedger tax-software association is not
  used as its history. The actual catalogue tests cover that regression.
- **Genuine skips:** PocketKey text-only responses independently skip both soft-
  preference questions; its unavailable history abstentions are not model skips.
  LeatherGuard history responses also independently skip; both auction rejection
  lists record `agent_skip`, not policy exclusions. No forced winner or rules
  fallback was found.
- **Auction/receipt/accounting:** independently matched each winning history
  `agentRunId` to its bid and `winningBidId`, verified creative hashes, receipt
  signatures, run/mode/opportunity/award/DOM-ack hashes and charge identities.
  Recomputed ClearVault bids of 4,000 and 3,000 base units. The two accepted
  charges total 7,000 against its 8,000 cap and 20,000 deposit; authorized and
  simulated settled totals are 7,000, refund 13,000, transaction signature null.
  Both losing channels settle zero/refund 20,000. Reviewed the saved
  `artifacts/v2/delivery-proof.png`, showing both disclosed cards and receipt-
  linked charges. No fresh DOM acceptance was invoked by this reviewer.
- **Privacy/read-only replay:** actual-bundle temporary replay server constructed
  no service/SQLite. State/catalogue/retrieval GETs contain no vectors or keys;
  both attempted backend-index routes return 404. All five mutation routes
  (`run`, `close`, `campaign`, `render`, `fail`) return 405. Backend vector index
  is mode 0600. Model packets contain no vector, budget or key fields.
- **Preservation:** `node scripts/demo/v2-preservation.mjs` checked 155 original
  catalogue/travel/V1/state files, zero changed. V2 uses its own state and port;
  V1 payment evidence retains its separate original run and hosted-sandbox mode,
  not V2 settlement or Devnet.

## Tests and remaining gate

All 36 unique focused V2 fixture tests pass:
`node --test tests/v2/evidence.test.mjs tests/v2/agents.test.mjs tests/v2/integration.test.mjs tests/v2/client.test.mjs`.
The initial restricted run passed 34 and hit loopback `listen EPERM` in two
tests; rerunning the client/integration files with scoped loopback permission
passed all three tests in those files. No actual provider transports were used.
Durable admission, crash/concurrent-instance no-repeat and completed restart
behavior are covered by those fixtures. The separately saved actual restart
and offline reports bind the reviewed bundle and show unchanged decisions,
events, charges, channels and allowance; those reports are main-produced, not
new actual-state replay invocations by this reviewer.

Packaging/recording work was concurrent. This review does not certify a final
four-minute video or a subsequently regenerated bundle. After the finding is
fixed, the requested bounded recheck should verify its negative fixtures,
the final bundle's same actual evidence/claims, and the final packaging outputs.
No further broad review loop is requested.

## Single bounded recheck — 2026-10-01

**Approved for the bounded local V2 demo/replay. Original P2 finding addressed;
no remaining substantive blockers within this review's scope.** This supersedes
the original finding's open status, not its historical evidence.

- Inspected `packages/v2/bundle.mjs:12-85` and the read-only `callEvidence`
  export in `scripts/demo/v2-package.mjs:14-16`. Offline validation now checks
  the complete slot matrix, frozen inputs/policy/request hashes, history packets,
  admission/status/usage counts, original response mapping, history-only auction
  records, calculated bids, winners/creatives and receipt/charge identities.
  `node --test tests/v2/bundle.test.mjs`: **17 passed, zero failed**, including
  all original invalid variants and baseline substitution/winner/amount checks.
- Loaded and semantically validated the final credential-free bundle, hash
  `9e89752345b6f1533fc6b4507fd3d67390a68ea24553a4ae4eeefe851479cc1e`;
  its `run.json` hash is
  `e74df43bb913da1ac683154a2181a44fdff2acb2a67e286b4e21368dde80fde3`.
  Compared exported inputs, policy and all 12 request/payload/admission packets
  directly with the original SQLite opened read-only: canonical equality.
  Freeze/request hashes and every original response/decision remain unchanged.
  Decisions, events, charges and channels also match the original restart report's
  hashes. The final offline report binds this new bundle, preserves those hashes
  and records rejected mutations/zero new calls, charges or payments.
- Claims remain bounded: ten actual responses plus two unadmitted PocketKey
  history slots; four complete pairs, two incomplete; historical hypotheses are
  not campaign capabilities. ClearVault's synthetic 4,000 + 3,000 accounting
  remains distinct from the separately identified V1 hosted-sandbox payment.
  Exported evidence contains no vector arrays, credentials or private keys.
  Preservation check again reconciled **155 files, zero changed**.
- Inspected the recording script, narration, SRT, capture manifest and all nine
  normalized browser frames. Verified all nine JPEG capture hashes, video/SRT
  hashes and the contiguous 240-second timeline against the final bundle identity.
  Independent `ffprobe` confirms a **240.000-second H.264 video**; full decoding
  with `ffmpeg -v error ... -f null -` completed without errors. The packet
  explicitly identifies edited recorded-replay frame holds, synthetic accounting,
  no audio (operator narration supplied), unavailable history, deterministic
  organic references and separate V1 payment. No fresh execution, causal lift,
  attention or V2 token-settlement claim was found.

Only this outcome was appended. No models, payments, source database access or
old-state writes; no package regeneration or actual-state restart was performed.
The full-suite 314-pass/6-opt-in-skipped result is main-reported, not rerun here.
The single requested recheck is complete; no expanded audit is requested.
