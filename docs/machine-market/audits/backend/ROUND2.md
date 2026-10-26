# Independent backend review — Round 2

26 October 2026. Domain: backend consistency, reservations/cancellation,
idempotency, current-run recovery, ownership admission and gateway outcomes.

**Verdict: PASS for bounded architecture implementation readiness in this domain.**
No unresolved A correctness/design blocker was identified in the reviewed packet.
The seven original backend findings have supported-flow corrections or explicit,
acceptable scope deferrals as detailed below. Two Low/B implementation-check notes
are recorded; neither asks for an additional infrastructure subsystem or blocks
architecture readiness. This verdict is not implementation GO, executed evidence,
a production-readiness verdict or a security guarantee. Root alone can issue GO.

## 1. Exact target, verification and method

Reviewed version: **v2-review-2026-10-26-02**. All paths below are relative to
`/Users/akshat/agentic-dsp/.worktrees/axp-machine-market`.
The snapshot directory is
`docs/machine-market/architecture/review-packets/v2-review-2026-10-26-02/`.

| Artifact in snapshot directory | Verified SHA-256 |
| --- | --- |
| MANIFEST_V2.json | ebeccd4064c37059f2bb4d72e4f3ebe0c2f611e0cb2ae955c0029f215162b9ea |
| SELECTED_MODEL_V2.md | 8b72ef534b6497c13ae1f00a75c1669a64286670e6a85eb1de853b5337d8ee3e |
| SPEC_V2.md | b84eda45894000d16ec2f126a1885778165a2ac88dc1bb5fda599978f2b60c5b |
| WIRE_V2.md | d59f60ee963942e471e19c00ca37ad6b30f249be74ebf22127bf5e5828d80850 |
| ACCEPTANCE_V2.md | af2a68f92c1608076fac3051566252bc7720e1b247dcbe729a5911b9fd4bd512 |
| AUDIT_DISPOSITIONS.md | 40143228908a108905d98d57fa291111d7bb5200478eac04f7ab35762d6026d9 |
| PLANNING_HANDOFF.md | 0f34d82856121770909bfa7d298bf031584d8b890385f21588a0eb9be9b72f48 |

The manifest hash matched the assignment before review. Each document hash matched
its manifest entry before reading its contents. All five normative snapshots and
the full handoff were read, rather than the older root-level drafting files.
The original backend ROUND1.md remains SHA-256
`cc18ed4203f2387226d63480f1f7bb2d4a0fb7ee8fc8deb68e6e1076bc3cd7d4`.
Original findings and severities were preserved and compared with the actual changed
sections, not closed merely because the author marked them proposed-resolved.

References below abbreviate SPEC_V2 as **S**, WIRE_V2 as **W**, ACCEPTANCE_V2 as **A**,
and AUDIT_DISPOSITIONS as **D**. Line numbers refer only to the verified snapshots.
No other reviewer's Round 2 report was read or requested. Shared Round 1 dispositions
were read because they are part of this frozen packet. No broad research, source
editing, tests, installation, build, validator/RPC execution, transactions, push,
other-thread messaging or agent delegation occurred. Only this assigned report was
written. Every local command used the specified worktree; free space was 142 GiB.

## 2. Economic coherence and proportionality

The selected market is now a rights transfer with an outstanding **primary-value
issuer claim**, rather than a chain of contingent historical sale proceeds.
S158–185, S261–307, W144–166 and W190–204 agree on these consequences:

- Primary buyer supplies P. The primary Match holds P; issuer and primary platform
  fee wait for delivery success or agreed unused expiry. The claim is therefore
  backed by the original P, not by a later buyer's payment or an unstated guarantor.
- Each secondary buyer supplies its full Q at the secondary fill. The seller gets
  Q-floor(Q/100) and the collector gets floor(Q/100), atomically with owner/cursor
  and claim transfer. Once finalized, those proceeds are spendable. The secondary
  receipt stores evidence and rent, not another refundable gross balance.
- An ordinary seller gives up both access ownership and the only P refund claim.
  The current holder can receive P after admitted failure/timeout; historical
  holders do not retain parallel claims. P is independent of the last resale Q.
- The buyer funds interim inventory until a resale pays it, delivery consumes it,
  expiry ends it, or a qualifying failure refunds P. A premium Q-P is uninsured;
  a discount purchase can receive more P than its Q. The signed rules/claim face
  disclose that risk instead of promising a fictitious full-price refund.
- Sponsored acquisition is primary-only and nontransferable. Its beneficiary can
  use the resource, but the immutable sponsor receives a qualifying P refund.
  Refunding cash does not restore campaign consumed allowance.

For P=10000, Q1=15000, Q2=8000, historical secondary sellers have received 14850
and 7920, and secondary fees total 230. Only 10000 remains locked. Success/unused
expiry replaces that escrow with issuer 9900 and primary fee 100. Failure replaces
it with one current-holder refund of 10000; secondary proceeds/fees stay final.
For issuer→A→B→A, before terminal A's net cash is -3150 and B's is -7080. Refunding
A once adds 10000; it does not refund A's first purchase and last purchase separately.
These are static arithmetic traces, not measured transactions.

This model is coherent and materially simpler than holding all 33000 and refunding
every historical buyer. The old model is solvent under its own terms, but makes
sellers wait and locks each intermediate buyer's gross until final delivery/expiry.
Immediate secondary settlement with full resale-price refunds would require extra
collateral or a guarantor; no such backing exists here, so rejecting that alternative
is correct. A primary-only market would simplify further but would remove the
requested resale/claim-transfer demonstration. The chosen middle scope is useful.

I accept these explicit cuts:

| Cut | Reason it is adequate for this MVP |
| --- | --- |
| One book; native auctions deferred | Competitive maker-price execution, priority, cancellation and eligibility already demonstrate substantial matching. A second auction lifecycle is unnecessary. |
| Offchain cancellation; native filled-order nullifiers | The sole writer can atomically refuse cancellation after reservation/signing and retain cancelled nonces in the intact DB. Filled-order uniqueness across units still deserves the small native OrderUse guard. |
| Same intact DB/ledger restart only | Durable attempts and bounded account reconciliation demonstrate the supported recovery path. Backup restoration, independent anchors and HA would protect explicitly unsupported conditions. |
| Fixed genesis-loaded program; no upgrade-governance workflow | The trusted local operator and pinned binary are the selected boundary. Actual loader identity must still be observed after GO; irreversible-loader ceremony is not a prerequisite to this local proof. |
| Fixed funded fixture destinations; no rent repair/top-ups | Basic rent reserves and atomic failure remain necessary. Repairing external drains/reassignment or prefunded PDAs is not part of the supported demo. |
| One signed attempt; no replacement-signature recovery | This is conservative but finite and coherent. Unknown/expired attempts can stop the run; the packet does not claim indefinite liveness or hide such cases by resetting state. |

The remaining trust risks—matcher fairness, truthful/durable gateway preparation,
fixture custody, alias collusion and known-failure secondary-sale risk—are disclosed
in S178–188, S223–257 and S522–527. They are not solved by escrow, but no claim here
requires this MVP to solve them. In particular, a primary-value refund is not a
guarantee that the material was useful or that the secondary premium was fair.

## 3. Original finding verification and A/B/C disposition

### BKR1-01 — original High; A restart/order consumption fixed, C restore deferred

**Evidence:** S127–135, S370–407, S409–431; W24–38, W83, W112–113,
W168–173; A30–31, A72–80. D27 accurately describes the selected boundary.

Native OrderUse now binds actor/nonce/authHash to one Match across units. A different
match ID cannot consume a filled generic bid again. Current-run startup verifies
identity and scans the bounded native effects missed before the crash. Known
state regressions quarantine rather than silently reconstructing availability.
Purely offchain cancellation survives supported process restart through the intact
DB. The former claim that genesis detects all reset/rollback is expressly removed.

**Disposition:** Supported-flow A portion closed at design level. Arbitrary old DB,
copied-ledger or coordinated restore is C, expressly unsupported; the Round 1
restoration experiments are not retained as build gates. This is an accepted scope
narrowing, not a claim that restoration was repaired. No anchor/replicated-log
subsystem is needed. T2/T8 and V5/V6 remain future implementation proof.

### BKR1-02 — original High; A fixed

**Evidence:** S114–149, S350–396; W35–38, W87–90, W168–204,
W282–306; A31, A36, A77–80. D28 is supported by actual normative changes.

All native action types have logical operations and one persisted signed attempt.
Funding, delivery lock and terminal actions are no longer overloaded into a single
funding state. Hold ownership transfers rather than duplicates; unknown principal
and operating costs stay reserved. Signed bytes commit before broadcast, and the
single-writer transaction also serializes cancellation/abort against signing.
The reducer recognizes primary terminal evidence as proof of earlier funding and
SecondarySettled as proof of the completed sale despite later ownership changes.
Late Start evidence cannot regress Refunded/Consumed state. Sibling refund evidence
is recorded as supersession, not falsely attributed to a losing attempt.

**Disposition:** Closed at design level. Disabling replacement attempts removes
the earlier multi-attempt aggregation problem rather than leaving it unspecified.
Account-only evidence retains unknown operating costs and a narrower evidence label.
An unresolved signed attempt remains a deliberate liveness stop, not authority to
release or sign anew. The balance-freshness implementation check below reinforces
the already required coherent-context invariant; it is not an HA requirement.

### BKR1-03 — original High; A fixed with intentionally revised refund economics

**Evidence:** S309–348, especially S332–336; W181–204; A34, A66–70.
D29 and D35–64 accurately state the changed promise.

The recognition point is now successful native StartDelivery before useBy, authorized
by the current owner. Source readiness follows admission. A locked Unit cannot
ExpireUnused; gateway failure or lease timeout refunds the one primary P claim.
Expiry winning before Start means no admitted delivery/refund claim, even if an HTTP
request or failure suspicion existed earlier. This removes the original offchain
known-failure priority contradiction. Direct owner admission avoids requiring a
cooperative gateway just to obtain the lease.

**Disposition:** Closed at design level. The protected amount is now original P,
not every historical gross; that was expressly authorized as the economic revision
and is not concealed as preservation of v1 terms. Admission delay/gateway honesty
remain residual risks. T6/T7/V4 must later show both orderings and exact recipients.

### BKR1-04 — original Medium; A fixed, auction branch C

**Evidence:** S190–242; W40–68, W144–173, W259–290; A29–34.

Tagged canonical messages include TIF, lane, refund face, remaining-transfer
minimum, nonce/domain and exact ask cursor. Cancellation binds target nonce/auth
hash/version. Sponsor mandate and beneficiary consent have separate complete
payloads; a changed selected unit/price/packet requires new consent. Native signing
is delegated under these admissions, not a new unrestricted authority. Fresh HTTP
keys cannot duplicate an economic nonce. Removed native auctions have no ambiguous
bid-amendment schema to implement.

**Disposition:** Closed at design level for A. Native auctions are C feature
deferral. This does not claim production identity; fixture role impersonation is
an explicit demonstration choice. Golden-byte and field-mutation evidence is T2,
not presumed from this document review.

### BKR1-05 — original Medium; A fixed

**Evidence:** S39–74, S309–348; W55–56, W181–204, W239–246; A33–34, A66–70.

Economic deadlines use Clock.slot with explicit strict/equality boundaries;
blockhash expiry is separate. The 150-slot completion lease begins at native Start
and may extend beyond useBy. Once Consumed, exact response recovery lasts throughout
the bounded run, including first response after late finality observation. A fresh
read proof does not create a new right or settle again. Old-owner/returning-owner
requests bind cursor/request identity and cannot seize a later entitlement.

**Disposition:** Closed at design level. There is no hidden wall-clock margin or
original-expiry cutoff on already committed content. Total durable-content loss
remains C/unsupported recovery and an explicit gateway trust risk, not a new fair
exchange guarantee. Future T5/T6 must verify boundary and replay behavior.

### BKR1-06 — original Medium; A finite bounds fixed, B measurement, C catastrophe

**Evidence:** S433–471; A37–42, A82–105; W239–246.

Lifetime history/authorization/operation/event caps, raw/encoded byte limits and
per-unit/order recovery reservations now exist. WAL/FULL/macOS sync settings and
physical-size caps are explicit. New ingress stops before ordinary drain headroom;
funded closure must remain possible at that ingress limit. Storage catastrophe can
still stop progress, with obligations retained. No identity eviction or reset is
offered as a remedy. The response includes no late transaction signature, allowing
its exact hash/bytes to be prepared durably before signing Finalize.

**Disposition:** A architectural gap closed. Actual encoded-row/index/WAL overhead
must be measured after GO before opening native admission, as the packet already
requires. Pinned-reader telemetry and optional performance sampling are B; power-loss
proof, indefinite archival, HA and catastrophic recovery are C. Do not multiply
these into a production stress program. T9 is sufficient for the bounded promise.

### BKR1-07 — original Medium; A fixed

**Evidence:** S3–7, S500–514; all verified manifest entries; W1–W6; A28–37;
D33; handoff reuse table and interface section.

The packet pins normative snapshots and restates chosen semantics. Old PLAN,
prototype contracts/tests and channel adapters are expressly informative. In
particular, old full-chain refund tests are not a native conformance oracle.
Wire fields, roles, IDs, state transitions and API/store/adapter seams are supplied
before GO instead of delegating semantic choices to builders.

**Disposition:** Closed at design level. Rust/JS parity, actual loader behavior,
serialization/CU and storage feasibility remain legitimate post-GO implementation
checks, not evidence already supplied. No additional pre-build native execution is
requested by this review.

## 4. Nonblocking implementation-check notes

No new A finding was identified. The following are **Low / B** notes for the shared
test groups, not newly discovered contradictions or permission to alter this frozen
packet. Failure of the underlying invariant during implementation would be an A
supported-flow defect and must stop that implementation path.

### BKR2-N01 — Low / B: exercise stale wallet context after hold retirement

**Evidence:** S137–149 and S370–377 require coherent balances/holds and monotonic
observations; W285–296 requires version revalidation with context fetched outside
the write lock. T3/T8 are the correct shared home for this check.

**Trace to falsify an incorrect implementation:** Request A fetches payer balance at
slot s, then pauses. An earlier funded operation is reconciled at s+n, updating the
wallet and retiring its hold. A resumes with the old higher balance. A fresh operation
ID must not let that stale balance be combined with the newer hold set. Otherwise
the backend can admit unbacked bids even though the native program later rejects
an unaffordable debit.

**Minimal handling:** Implement the specified revalidation using the wallet/account
observation version as well as operation version; reject/refetch a stale observation
outside the DB transaction. Include one delayed-context schedule in T3/T8. No RPC
inside the transaction, global distributed lock or wallet-history service is needed.
The frozen coherent-context requirement already forbids the bad combination; this
note is an implementation trap to verify, not an additional semantic gate.

**Residual:** Truly external wallet drains remain unsupported, but this schedule
uses only the supported local writer and must not be dismissed as an external drain.

### BKR2-N02 — Low / B: include incoming-ask predicate filtering in T1

**Evidence:** S76–89 and S99–112 bind per-bid remaining rights, price priority and
maker execution. T1 tests both maker-price directions and eligibility, while V1
spells out the incoming-bid example more explicitly than its converse.

**Trace to falsify an incorrect implementation:** Two resting secondary bids share
Series and exact P. The higher bid requires one transfer remaining after fill; the
lower bid accepts zero. An incoming ask would leave zero. The higher bid is
ineligible for that unit; the lower compatible bid should determine execution if
its price crosses. It must not reserve the ineligible high bid and rely on the
program to fail it. This is eligibility selection, not fallback after a failed
reserved maker; the no-automatic-fallback rule still applies to the latter.

**Minimal handling/test:** Reuse the same predicate in both matching directions
and include this vector in T1. Do not add another auction mechanism or a new market
partition for every minimum; exact P remains the specified book key.

**Residual:** This verifies the deterministic algorithm, not commercial liquidity,
price optimality, Sybil resistance or usefulness of the resource.

## 5. Finite path to build readiness and evidence

From this backend review, the packet can proceed to root's decision once the other
independent domains are complete. It does not need another production-hardening
phase. If another domain reveals a material contract contradiction, that takes
precedence and requires the appropriate frozen correction/review; this report does
not preapprove an unseen change.

After an explicit root GO naming the packet and allowed phases:

1. Implement fixed codecs and the single transactional book: unique admission,
   eligible maker-price match, single hold owner, cancellation versus reserved-match
   abort, campaign allowance and exact consent. Use shared T1–T5, including the two
   small notes above rather than separate broad suites.
2. Implement the minimal native program and typed outbox/observer. Preserve the
   invariant that every service signature is committed before send, and that
   any unknown attempt retains its liabilities and cannot be replaced automatically.
3. Show the finite A4 run: primary P escrow, immediately settled secondary Q with
   owner/claim transfer, delivery payout and response recovery; a separate admitted
   failure refunds current holder P while prior Q proceeds stay final; sponsor
   refund returns to sponsor. Include unused expiry and competing/duplicate calls.
4. Exercise current-run crash/restart and reordered observations using real local
   execution and original signatures. Include account-only evidence labels and
   unknown fee reservations. Do not restore/reset away a failing/unknown case.
5. Record actual serialization, compute, storage, wallet/rent and fee/principal
   deltas under the packet's caps. Stop on incompatible toolchain/limits or a new
   A defect; do not silently widen the contract or add external services.

No architecture test description, static cash vector, generated signature string,
host compilation or mocked RPC result can substitute for the later real local
validator proof. Conversely, requiring that proof before any authorized build would
make the architecture gate circular; it correctly belongs to G2 after root GO.

## 6. Residual assumptions and final verification

Accepted residuals are precisely the supported fixture model: one writer/controlled
signer set; same intact current DB/ledger and source content; trusted local operator
and gateway; fixed local SOL/program identity; bounded run/history; explicit unknown
quarantine rather than indefinite recovery. A read or health route cannot create
an economic effect. Production custody, arbitrary restoration, external drains,
HA, public-network performance and commercial market claims remain unsupported.

There are no outstanding indispensable clarification questions in this domain.
Original High/Medium severity labels have not been reduced or deleted; their
Round 2 disposition is additional to the preserved Round 1 record.

The manifest, all six referenced snapshot/handoff documents and original ROUND1
were rechecked after report creation; every digest still matched the values above.
PREPARATION.md also retained its original digest. Verification results are recorded
in this chat.
Only `docs/machine-market/audits/backend/ROUND2.md` was created for this round.
Root `01a17200-435b-74c1-9fd0-24a82e3f60ee` retains sole GO authority.
