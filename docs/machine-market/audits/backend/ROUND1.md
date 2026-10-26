# Independent backend architecture audit — Round 1

Date: 26 October 2026. Domain: backend consistency, crash recovery and adversarial
acceptance. Reviewer: assigned independent local backend reviewer.

**Verdict: FAIL for implementation readiness.** Three High and four Medium
findings remain. No Critical finding is asserted. These are contradictions or
missing normative decisions in a proposed design, not observed exploits in an
implemented native market. The absence of future code/tests is not itself a finding.
This is not a security guarantee or implementation authorization.

## Frozen target and independence

- Full target read: `docs/machine-market/architecture/SPEC_V1.md`, version v1,
  566 lines, SHA-256
  `91d04eea60761c04f7517944bcd055acd6cd5e0b2d7b9391cdfbf5b59a785a2c`.
  Hash matched before review and again before report creation; final verification
  is recorded below. All specification line references below refer to these bytes.
- Full audit protocol read: `docs/machine-market/AUDIT_PROTOCOL.md`, SHA-256
  `ef33fb4bdce8fa23d8aade301bd8026ce39743aef1464327d4e151dcba32cc3f`.
  The protocol is in the parent documentation directory, not `architecture/`.
- No other domain's preparation, findings, reports or conclusions were read.
  No agents were created and no other chats were contacted.
- All local commands used the explicit worktree
  `/Users/akshat/agentic-dsp/.worktrees/axp-machine-market`. Only this assigned
  report was written; the preparation document and all source/spec files remain
  unchanged by this reviewer. No build, install, test, validator, RPC, transaction,
  credential access, push or deployment occurred. Free disk remained 142 GiB.

## Summary and positive boundaries

| ID | Severity | Issue |
| --- | --- | --- |
| BKR1-01 | High | Rollback quarantine has no operational continuity proof; same-genesis restoration and forgotten fills bypass per-unit replay protection |
| BKR1-02 | High | The outbox lacks operation-specific identity, attempt aggregation and monotonic reconciliation rules for the multi-stage lifecycle |
| BKR1-03 | High | The promised known-failure refund conflicts with ordinary-expiry payout when failure is known only offchain |
| BKR1-04 | Medium | Signed authorization schema omits execution-relevant fields and several mutation families |
| BKR1-05 | Medium | Time authority and the settlement-to-retrieval expiry boundary are undecided |
| BKR1-06 | Medium | Recovery-capacity promise is not supported by admission bounds and a durable storage policy |
| BKR1-07 | Medium | Mutable conformance references and deferred normative interfaces prevent a closed audit target |

Local native SOL is sufficient to demonstrate a genuine escrow/payout/refund
lifecycle, provided evidence labels it accurately. Keeping matching and private
content offchain is appropriate to the stated experiment. Unit cursor/version,
immutable Match tombstones and full gross escrow are valuable constraints. The
spec explicitly acknowledges trusted gateway availability and separates funding,
seller payout and HTTP delivery. These strengths do not resolve the findings below.

## BKR1-01 — High: rollback quarantine is stated but not enforceably defined

**Type/evidence.** Missing recovery mechanism and overbroad identity premise.
Sections 5/8 require quantity-one orders and protect a unit cursor (lines 154–179,
251–260). Section 10 checks genesis and says a reset changes it (368–372).
Section 11 promises a stale SQLite snapshot halts signing (388) and a DB mismatch
quarantines (397), but specifies no startup inventory scan, rollback anchor,
restoration protocol or proof that the local journal is complete. Genesis identifies
the cluster origin, not a unique incarnation or current ledger prefix [S1].

**Counterexample.** (1) Save a DB snapshot in which signed generic bid B for one
compatible unit is open. (2) Match it against U1, persist/send transaction T, and
let T fund U1. (3) Restore that older DB snapshot while retaining the same validator.
(4) Resume from the apparently open B and allocate a fresh match against U2. The
new match passes U2's independent cursor check; no onchain consumed-order index is
specified. Fixture signers can sign it based on the restored authorized record.
Two units can be paid for from a quantity-one order unless the unspecified rollback
guard catches the restoration first. No key compromise is needed. Separately,
restoring an earlier copy of the validator ledger containing the same genesis does
not change the genesis identity merely because execution history was rolled back.

**Impact.** Per-unit idempotency does not establish per-order at-most-once fill.
Lost journals can also erase cancellations, pending liabilities and private response
records. The issue is not that ordinary transactional crash recovery loses commits;
the spec expressly includes stale snapshots/reset in its supported failure matrix.

**Required remediation.** Specify a startup admission/signing barrier and complete
bounded reconciliation of the run's Series/Unit/Match inventory, not only known
pending rows. Define monotonic observation watermarks and behavior on missing or
regressed chain state. Choose an explicit rollback policy: an independently
maintained local run/journal epoch anchor and verified restore procedure, or reject
all restores and require a new isolated run with disabled old signing authority.
Define detection limits when the anchor and DB/ledger are all restored together.
Prevent reuse of consumed order authorizations across units through trustworthy
durable order-consumption recovery or onchain order-consumption protection.

**Alternatives/tradeoffs.** An onchain consumed bid ID costs state but survives DB
rollback. A complete bounded scan plus trusted local backup/epoch discipline is
smaller but does not reconstruct erased purely offchain cancellation history.
Genesis checks alone are cheap and useful, but cannot supply either guarantee.

**Residual risk/test.** A privileged operator able to roll back every independent
anchor remains outside a local durability guarantee. After GO, restore a pre-fill
DB while preserving chain, and restore a pre-fill ledger with unchanged genesis
while preserving DB. Both must halt admission/signing or reconcile without a second
fill, missing liability or content release. Include a removed cancellation and an
unknown signed attempt. V2 must state which scenarios are rejected versus recovered.

## BKR1-02 — High: lifecycle and reconciliation identities are incomplete

**Type/evidence.** Missing cross-layer state-machine contract, not a request to
implement it now. Section 10 defines one intent/outbox per matched unit/order pair
and one arrow sequence (332–338), with attempt replacement (351–366). The same unit
later has BeginDelivery, FinalizeDelivery, RefundFailure, TimeoutRefund and
ExpireUnused operations, some spanning four matches (268–297). Their durable
operation identities, reservations, attempt-to-operation mapping and transition
preconditions are absent. A finalized program error is called known failure
(348–349); failed funding releases holds (174), but there is no rule aggregating
multiple attempts or rejecting late observations. Terminal receipt fallback
(351–352) names an exact receipt without defining its immutable fields or all
instruction-specific predicates. Section 8 says expiry cannot release money from
an unresolved funding match (296), a backend observation state the program cannot
observe from the proposed accounts.

**Counterexample.** T funds M, but the response is lost. At series expiry the
onchain Unit is open and M funded, so an ExpireUnused invocation can settle M.
The backend still records unknown funding. A later observation of M finds it
settled rather than in the original expected funded state. V1 does not say whether
to infer successful funding from this stronger state, block permanently, or reject
the observation as inconsistent. Conversely, a delayed successful BeginDelivery
observation may arrive after TimeoutRefund has finalized. A last-writer projection
can regress the unit from refunded to locked unless a monotonic reducer is required.
This is compatible with writing every signed byte before broadcast; persistence
alone does not resolve the ordering.

**Impact.** Implementers can produce mutually incompatible recovery behavior,
permanent quarantines, stale owner/depth projections or incorrectly released
reservations. Onchain terminal guards still prevent paying the same Match twice;
this finding does not claim that a stale projection overrides those guards.

**Required remediation.** Define separate logical operation IDs and immutable hashes
for funding, lock and terminal actions; link each to zero/more signed attempts.
Freeze per-operation and per-attempt transition tables, a versioned compare-and-set
observation reducer, exact reservation ownership/release predicates and terminal
precedence. One failed attempt must not fail an operation with another possible or
successful attempt. Define how later valid account states prove earlier effects,
and how a refunded/settled Match reconciles unknown funding. Specify coherent
observation context/slot requirements, fields in fallback receipts, and the narrower
claims when transaction fees/deltas cannot be recovered. Account APIs expose
observation context; it must be used deliberately [S2]. Replace the impossible
backend-unknown guard on ExpireUnused with an enforceable chain predicate and
recovery rule. Include current cursor/version and canonical request identity in
delivery authorization, including an owner A→B→A returning to the same public key.

**Alternatives/tradeoffs.** One generic operation table is fine if typed state
machines and unique keys are normative. Separate tables are easier to constrain but
duplicate plumbing. Disabling replacement attempts for the first acceptance
reduces cases; it does not remove funding-to-terminal reconciliation races.

**Residual risk/test.** History may be unavailable; safe quarantine is allowed if
precisely classified, not silently treated as failure [S3]. After GO, permute
observations of real funding/lock/terminal executions, inject lost responses,
restart two workers, and deliver old success/failure observations last. Assert no
state regression, no duplicate logical action, no release while any valid attempt
can consume principal, and correct account-state-only recovery classification.

## BKR1-03 — High: known issuer failure can lose to ordinary-expiry payout

**Type/evidence.** Actual policy conflict requiring a normative decision. Section 3
promises known issuer failure before delivery commitment unwinds all funded trades
(61–64). RefundFailure requires the gateway before commitment (284–286), whereas
ExpireUnused pays sellers for an open unit at expiry (293–297). No failure marker,
priority rule or definition restricting "known" to finalized onchain failure exists.
Section 9 explicitly accepts irreversible seller payout once terminal (314–316).

**Counterexample.** A purchased unit remains open. Shortly before expiry, gateway
preparation discovers missing/corrupt source bytes: issuer failure is known and no
delivery has committed. The gateway persists a failure/refund intent, then crashes
or its refund transaction is delayed. At expiry, an allowed expiry action pays the
sellers. The delayed RefundFailure now rejects as incompatible terminal state.
The program has satisfied the expiry rule but violated the promised known-failure
unwind. No double payout or malicious signer is necessary.

**Impact.** Buyers lose the promised refund despite detected non-deliverability.
The winning transaction order determines financial rights that the instrument
description currently presents as determined by known failure versus unused expiry.

**Required remediation.** Choose and disclose the recognition/priority point. One
option is that only a finalized failure/lock before the cutoff establishes refund
rights, and expiry wins otherwise; explicitly narrow the guarantee and disclose the
gateway availability/timing risk. Another is a delivery/failure admission state
onchain before inspecting readiness, so expiry cannot pay while a timely request
is unresolved and timeout produces refund. Define admission cutoff, applicable
signatures and allowed finalization/refund transitions. An offchain flag cannot
enforce priority against an otherwise valid onchain expiry instruction.

**Alternatives/tradeoffs.** The first option keeps the program small but weakens
buyer protection. The second changes the present prepare-before-lock protocol and
requires bounds against malicious refund-triggering requests. A long grace period
reduces frequency but does not establish atomic priority or eliminate the race.

**Residual risk/test.** Trusted gateway honesty and availability remain explicit.
After GO, detect and persist failure before expiry, hold its transaction, execute
expiry, then release the refund. Reverse the ordering as well. Both outcomes must
match the revised instrument's exact rights and terminal evidence; there must be
no unconditional full-refund claim for a case that permits seller payout.

## BKR1-04 — Medium: signed authorization coverage is incomplete

**Type/evidence.** Missing normative payload fields. Order TIF determines IOC/GTC
execution (96–113), but the signed authorization list (154–156) omits TIF. Auction
bid increases/close rules (121–129) and sponsor/beneficiary consent (66–70,168–170)
have no canonical signed mutation schema. A signed cancel names order/version but
does not explicitly include a message-kind domain and target domain (159–160).
Exact fixture signatures are required, not sufficient schema definitions (151–157).

**Counterexample.** An authorized bid is submitted as IOC and does not cross. A
transport changes the unsigned TIF to GTC while retaining every enumerated signed
field. It can now rest and fill later. The backend holds fixture signer handles,
so later native signatures are not a substitute for faithfully enforcing the
original order authorization. This trace is prevented if TIF is signed, but v1 does
not require that. Equivalent ambiguity exists for who authorizes auction bid
replacement and sponsor budget consumption.

**Impact/remediation.** Signature verification can pass while executing a different
instruction lifetime or mutation. Freeze complete tagged payload schemas for every
mutation, including TIF, nonce scope, market/genesis/program domain, actor role,
expected version and all sponsor consent bindings. State whether signing authorizes
later native signing by the fixture service and exactly which policy checks precede
it. Require uniqueness over order ID and actor/nonce, not only HTTP keys.

**Alternatives/tradeoffs.** Sign a full canonical command envelope for fewer omissions,
or use per-command binary schemas for tighter validation at higher maintenance
cost. Do not rely on a builder inferring omitted fields from mutable UI payloads.

**Residual risk/test.** Selectable localhost roles remain a demo trust boundary.
After GO, mutate only TIF, message kind, sponsor consent, cancellation domain or
auction identity under a retained signature. Each must reject before reservation;
replay under a new HTTP key must not admit a second order.

## BKR1-05 — Medium: clock and retrieval-expiry semantics need one contract

**Type/evidence.** Missing normative decision with a boundary consequence. Auction
close is described as slot/time (121–125); orders, series and delivery use expiry/
deadline without units, clock authority or equality rules (98–103,220,268–297).
Store construction injects `now` (404), while program behavior references Clock
(391). Finalized terminal payout precedes byte release, but replay ends at original
expiry (279–281,322–325).

**Counterexample.** FinalizeDelivery executes just before the series cutoff. The
backend learns finalized success only after the cutoff, or the local wall clock
moves ahead. It must deny retrieval after expiry, although it has just paid sellers
for a consumed unit and has never released the prepared bytes. A first HTTP response
loss at the cutoff similarly defeats the stated response-recovery workflow. This
is not solved merely by choosing a correct transaction commitment level.

**Impact/remediation.** Specify timestamp/slot types, authoritative time source,
strict versus inclusive boundaries, and behavior when local and chain time diverge.
Separate new-delivery eligibility from recovery of an already committed delivery.
Choose bounded post-commit replay retention, or expressly accept and disclose a
late-request paid-without-access outcome. If choosing a safety cutoff, define its
limits: a margin is not a guarantee of bounded finalization or outage duration.
Blockhash expiration uses its own last-valid blockheight, not a resource timestamp
or arbitrary timer [S4].

**Alternatives/tradeoffs.** Post-commit replay is operationally robust but extends
storage/access beyond original expiry. Strict expiry is simpler but must be an
explicit service-risk term and appear in acceptance. Neither can be left to `now`.

**Residual risk/test.** Availability after settlement remains trusted. After GO,
test execution before/finality observation after expiry, equal deadlines, HTTP
loss across expiry and clock skew. Assert a single documented outcome for first
delivery and same-key recovery across backend/program boundaries.

## BKR1-06 — Medium: finite recovery headroom is unproven by the declared bounds

**Type/evidence.** Missing admission/storage policy. The spec bounds series/units
and match hops (220–236), declares reserved recovery capacity (396), and sets a
50 MiB DB/log allowance (490–492). It does not bound outstanding/lifetime orders,
cancel/idempotency history, signatures/attempt count, resource/response byte size,
event growth, or reserve journal space for all required terminal actions. V1 also
does not specify durable SQLite sync/backup settings. BEGIN IMMEDIATE alone is not
a power-loss durability policy. SQLite documents both pinned-reader checkpoint
effects and the durability difference of synchronous settings [S5].

**Counterexample.** Repeatedly admit/cancel unique signed orders without issuing
another unit. Orders, signatures, idempotency and events grow while the unit cap is
unchanged. At the DB allowance, a funded unit's timeout/refund still requires
journal writes, signed-attempt storage and response evidence. There is no specified
headroom formula or refusal point to guarantee this succeeds. A long-lived reader
can also retain WAL growth despite small logical rows.

**Impact/remediation.** Define explicit byte/count limits and per-admission reserved
capacity for worst-case remaining lock/terminal/reconciliation work; include WAL,
temporary serialization, private responses, retry ceilings and retained failures.
Define read timeouts, checkpoint/backpressure and disk-full safe behavior. Choose
and verify SQLite durability settings on every writer connection; distinguish
process-crash from machine-power-loss guarantees. The prototype's storage guard
at `packages/machine-market/core.mjs:124–140` is an example, not a proven bound for
the new relational schema and native journals.

**Alternatives/tradeoffs.** Conservative fixed caps suit this bounded local run;
segmented immutable archives permit longer runs but need verified manifests and
must not remove live idempotency/liability evidence. Lower durability improves
latency only by accepting a clearly narrower crash guarantee.

**Residual risk/test.** Hardware/storage failure can still destroy private bytes,
as already acknowledged. After GO, fill each admission dimension, pin a reader and
inject capacity failure with outstanding locks/attempts. New ingress must stop
early enough for all finite recovery paths; no original identity or obligation may
be discarded to reclaim space. Verify configured durability rather than claiming
SIGKILL tests prove power-loss survival.

## BKR1-07 — Medium: normative dependencies are not frozen with the target

**Type/evidence.** Audit-target closure gap. Sections 12/15 require keeping the
reference `createMarket()` as conformance oracle (402), refer to a mutable PLAN
reuse matrix and core tests as oracle (509–514), and defer binary/signature/HTTP
contracts until after corrections (424–427). Section 8 permits a follow-on wire
artifact after GO (243–244), while section 17 and the protocol require normative
ambiguities resolved before GO (542–548). The proposed seam list includes
matchBook and terminal adapters but not their complete typed contracts.

**Counterexample.** Two builders use different revisions of the unpinned reference
tests or interpret synthetic `confirmed` differently. One translates it to native
funded escrow; another to terminal seller payout. Both can claim to follow an
oracle without a frozen semantic mapping. Alternatively, one builder includes
TIF in signed bytes and another omits it under the still-deferred wire schema.

**Impact/remediation.** Mark historical reference files explicitly non-normative,
or pin their hashes and enumerate which individual invariants transfer. Include
the corrected schema/state/encoding/API contract in the next frozen packet before
implementation GO, with a dependency manifest for every normative artifact.
Mechanical numeric tags may be assigned later only if ownership, validation,
failure semantics and signed-byte compatibility are already unambiguous and
the gate explicitly reserves approval of those tags before coupling.

**Alternatives/tradeoffs.** One self-contained spec simplifies the audit but is
larger; a hashed multi-file normative bundle is equally acceptable. An unpinned
"reuse existing tests" instruction is neither. This finding does not require
native code to exist before architecture approval.

**Residual risk/test.** Correct interfaces can still be implemented incorrectly.
Round 2 should verify the manifest and perform a static trace of one primary,
resale, sponsor, cancellation, lock, timeout and recovery exchange across all
interfaces. After GO, shared encoded fixtures and negative vectors must exercise
the exact same bytes in Rust, backend and client.

## Required acceptance matrix and unresolved questions

V2 should map each of these checks to the revised invariant and owner; these are
requirements for future execution, not passed tests:

1. Multi-process conservation: same last unit, same payer balance, same nonce under
   two keys, order cancel versus reserve, quarantine across books, delivery versus
   resale, and returned-owner A→B→A stale delivery authorization.
2. Kill/restart every chain operation before/after journal commit, signed persistence,
   real local broadcast, execution, observation and response. Include finalization
   and refund/expiry, not only FundMatch.
3. Monotonic projection under duplicated/reordered observations, chain state later
   than expected, attempt failure arriving after another attempt's success, and
   account-state-only evidence with unavailable transaction history.
4. The restore, failure/expiry and replay/cutoff traces in BKR1-01/03/05, including
   explicit safe refusal where recovery is deliberately unsupported.
5. Worst-case resource admission and recovery capacity, exact request/response
   authorization and redaction, read-only status with no signing or mutation.
6. Real localhost-validator matched-trade funding and terminal native SOL deltas,
   wrong-key/cursor/recipient rejection and full-chain refund. Preserve original
   signatures, failed attempts and all fee/rent accounting. Mocks and historical
   prototype success cannot satisfy this evidence tier.

Open decisions requiring written disposition:

- Is restored state supported at all, and what independent run/epoch evidence gates
  signing? What proves a generic bid was not already consumed on another unit?
- Are replacement signatures enabled for first acceptance? If yes, what exact
  attempt aggregation and observation predicates prove replacement eligibility?
- What onchain fact establishes known-failure refund rights before ordinary expiry?
- What exact hash/receipt proves a funding operation after a later terminal change?
- Is committed-content replay allowed beyond series expiry, and who decides time?
- Which principal, fee payer and terminal fee/rent budgets belong to each operation?
- What resource bounds protect recovery, and what artifacts are normative in v2?

No finding is a demand for a production identity system, every right to become a
token, public RPC evidence, independent commercial issuers, or a broader benchmark.
Those remain outside this local architecture audit. The native asset choice is not
a blocker; the unresolved lifecycle and rights rules are.

## Sources read and source-qualified reasoning

Local sources: full frozen v1 and audit protocol; assigned backend preparation;
root AGENTS, README, pages, architecture and reviewer/verification guides from
preparation. Relevant reference code inspected during preparation and/or reread:
`packages/machine-market/core.mjs`, `api.mjs`, `docs/machine-market/CONTRACT.md`,
`packages/exchange/index.mjs`, `packages/publisher-sdk/index.mjs`, recovery-test
cases in `tests/product/publisher-recovery.test.mjs`, and checkpoint/reconciliation
locations in `packages/product/payments.mjs`. These are background, not evidence of
native market correctness. Mutable prior PLAN/NORTH_STAR were not used as audit
authority. No other reviewers' documents were accessed.

Primary documentation read on 26 October 2026:

- **S1:** [Solana getGenesisHash](https://solana.com/docs/rpc/http/getgenesishash).
  It returns cluster genesis identity. The limitation concerning copied/rolled-back
  execution history is this reviewer's inference, not a claimed reset experiment.
- **S2:** [Solana getAccountInfo](https://solana.com/docs/rpc/http/getaccountinfo).
  Account observations have commitment/context; `minContextSlot` is available.
  This alone does not provide an atomic cross-system snapshot or durable reducer.
- **S3:** [Solana getSignatureStatuses](https://solana.com/docs/rpc/http/getsignaturestatuses).
  Recent-cache versus requested history is explicit. A missing response is not an
  application-level proof of no financial effect.
- **S4:** [Solana confirmation and expiration](https://solana.com/developers/cookbook/transactions/confirmation).
  Expiration handling records last-valid blockheight and observes subsequent height.
  It must remain separate from application delivery/campaign deadlines.
- **S5:** [SQLite WAL](https://www.sqlite.org/wal.html), especially concurrency and
  performance/durability sections. Pinned readers can obstruct checkpoint progress;
  FULL versus NORMAL differs for power-loss durability.
- [Solana transactions](https://solana.com/docs/core/transactions): transaction
  instructions execute atomically, while failed transactions may still charge fees.
  This supports, but does not expand, the spec's single-transaction settlement claim.

The counterexamples are static adversarial traces. None was executed. No inference
from a documentation page is presented as a measured runtime result.

## Final verification and disposition

The assigned v1 hash was checked at intake, immediately before writing this
report and after report creation. All checks matched
`91d04eea60761c04f7517944bcd055acd6cd5e0b2d7b9391cdfbf5b59a785a2c`.
No source implementation can start on this verdict.
Round 2 must inspect a new frozen target, the dispositions and cross-layer reports,
verify the three High issues and all material semantics, and check for regressions.
Only parent `01a17200-435b-74c1-9fd0-24a82e3f60ee` can issue GO after packet review.
