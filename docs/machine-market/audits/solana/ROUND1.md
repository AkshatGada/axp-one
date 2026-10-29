# Independent Solana/program/security audit — round 1

Reviewer domain: Solana settlement, program authority, custody, replay/conflicts, native accounting and recovery. Date: 26 October 2026.

## Target and verdict

**Domain verdict: FAIL — architecture revisions required.** This is a design review, not a security guarantee, implementation audit or permission to resume builders. There are **two High and four Medium findings**, no claimed Critical finding. The two High findings concern an unresolved order-consumption authority boundary and incompatible delivery/expiry outcomes. They are missing normative decisions, not assertions that nonexistent program code contains an executed exploit.

- Frozen version: **v1**.
- Target: `/Users/akshat/agentic-dsp/.worktrees/axp-machine-market/docs/machine-market/architecture/SPEC_V1.md`.
- Assigned and locally verified SHA-256: **`91d04eea60761c04f7517944bcd055acd6cd5e0b2d7b9391cdfbf5b59a785a2c`**.
- Hash matched before the full read, after analysis immediately before writing this report, and after the report was saved. All three observations matched the assigned hash; no target-byte change was observed.
- Full protocol read: `docs/machine-market/AUDIT_PROTOCOL.md`, observed SHA-256 `ef33fb4bdce8fa23d8aade301bd8026ce39743aef1464327d4e151dcba32cc3f`.
- All spec citations below are exact one-based line numbers in this frozen v1. Section references refer to the spec unless expressly labeled otherwise.

No other domain's preparation or round-one report was read. No other reviewer was consulted. No agents or other chats were created or messaged. Only this assigned report was written; preparation remains unchanged. No tests, builds, installs, validator, RPC, signing, transaction, deployment, credential reads or source edits occurred. Public documentation/source browsing was read-only. The worktree was explicitly selected for each repository command; the initial project checkout was not changed. Available disk remained approximately 142 GiB.

## Scope judgments

The hybrid design is a reasonable candidate for this objective. Local-validator SOL can establish real matched-trade escrow and payout/refund without pretending to support USDC. The small Unit cursor is materially useful authoritative state; an NFT and an onchain order book are unnecessary. Deferring every seller's proceeds until a terminal event makes the four-trade refund chain solvent: each payer's entire gross remains separately collateralized. The explicit gateway trust and lack of atomic HTTP/chain exchange are appropriately acknowledged.

Those choices do not, by themselves, establish safe order consumption, delivery timing or executable account interfaces. Solana transaction signatures authorize message bytes; they do not automatically enforce the meaning of a separately signed order. Transaction atomicity protects a single chain transition, not a database restoration or delayed HTTP release. These distinctions underpin the findings rather than a demand to move the whole application onchain. [Transaction structure](https://solana.com/docs/core/transactions/transaction-structure)

| ID | Severity | Normative issue | Closure needed |
| --- | --- | --- | --- |
| SOL-R1-001 | High | Unit/match uniqueness does not define quantity-one order consumption across units or after stale-state recovery | Choose and specify an independently enforced order-use/signing boundary |
| SOL-R1-002 | High | Pre-expiry delivery commitment can finalize only after the permitted retrieval period | Define commitment, first release, replay and refund deadlines coherently |
| SOL-R1-003 | Medium | Atomic native-SOL payout/refund lacks a recipient rent-state policy | Specify settlement liveness and separate top-up authority/budget |
| SOL-R1-004 | Medium | Genesis equality does not prove continuity for absence-based replacement | Narrow or disable replacement; specify rollback/recovery detection |
| SOL-R1-005 | Medium | Normative wire/authority decisions and mutable oracle remain outside the frozen review packet | Freeze the contract and dependency manifest before implementation GO |
| SOL-R1-006 | Medium | Role-alias rejection conflicts with permitted signer sharing and recurring participants | Freeze a role equality matrix and per-key accounting rules |

## SOL-R1-001 — High: quantity-one order use is not an authoritative invariant yet

**Evidence.** Quantity exactly one is contractual (§3, lines 51–55). Bids are compatibility-based and an exact unit is optional for an ask (§4, 96–103). Signed order replay/nonces are checked during backend admission (§5, 154–160). The specified program state has Series, Unit and Match accounts, but no consumed-order relation (§7, 217–231). FundMatch binds order hashes, all parties co-sign, and duplicate protection is by match ID and unit cursor (§8, 251–260). Stale workers and stale SQLite snapshots are expressly in scope (§6, 197–199; §10, 365–366; §11, 388,397).

**Counterexample.** This does not require forged transaction signatures or a malicious trader approving a new economic order:

1. B admits one quantity-one compatibility bid O; U1 and U2 both satisfy that compatibility key. Save an ordinary older database snapshot containing O as unfilled.
2. Match M1 consumes O against U1. Fixture signing handles produce the required message signatures; the chain finalizes M1 and advances U1. B has sufficient funds for two purchases.
3. An older backend snapshot is restored. O appears executable again. The signer service still has the valid fixture handles, and v1 supplies no authoritative recovery scan, signing watermark or order-use account that must be checked before accepting another typed intent.
4. Matching creates M2 using O against U2. Its match ID is fresh, U2's owner and cursor are current, and all specified program checks can succeed. It stores the same buy-authorization hash in another Match and debits B again.

There is no conflict at either Unit PDA. A same-match tombstone cannot detect a different match on another unit. The generic instruction to halt on a stale snapshot does not specify how this otherwise locally consistent state is detected. The same issue needs a policy for a resting bid's `unit version`: v1 does not say which exact unit that field binds before a compatibility-based match selects it.

**Impact and severity.** Under the promised stale-backend failure scope, one admitted order can become two paid trades. This is High because the missing boundary controls repeated economic authorization. It is **not** an allegation that the program can spend without the required transaction signers. If transaction co-signing is deliberately fresh, independent economic approval for every trade, the trace stops at step 4—but that signer verification/consumption contract is currently unspecified. A compromised owner intentionally signing a new order remains outside this finding.

**Required correction.** State whether the order or each subsequent transaction is the controlling economic authorization. Then make quantity, price limit, expiry and consumed/cancelled status enforceable at that boundary. Require the signer to reconstruct/verify the exact message and bound terms, rather than trust an intent merely because it is typed. Define startup reconciliation before any fixture handle may sign after restore, including discovery of matches absent from SQLite. Resolve whether matching commits an order before its expiry and how a signed-but-unexecuted match interacts with expiry/cancellation.

**Alternatives and tradeoffs.** A small order-use PDA keyed by market/domain, actor and immutable order identity can be atomically consumed with FundMatch; this is not an onchain order book. It adds bounded state/rent. Binding every authorization to one exact unit/version also limits reuse, but changes the resting compatibility-bid design. Keeping consumption offchain is possible with an explicitly trusted, independently durable signing authority and mandatory chain reconciliation; it sacrifices the claim that the Unit cursor alone protects this failure and must spell out restoration/fencing guarantees. Requiring fresh human approval would be another model, but is not the proposed unattended fixture workflow.

**Residual risk.** None of these choices proves matcher fairness or prevents an owner from deliberately authorizing distinct new trades. Onchain nullifiers also do not validate a price limit hidden only behind an opaque hash without the appropriate signed-message/transaction binding.

**Falsification/acceptance test.** After GO, finalize O→U1, restore the older database, and attempt O→U2 with a new match ID and current U2 cursor. The second debit must be rejected or signing must remain quarantined until the first consumption is recovered. Repeat with two actual workers, a different blockhash, order cancellation, and price/expiry changes. A fresh independently authorized order O2 must still work. Also demonstrate that the selected remedy actually prevents step 4; simply detecting the duplicate later in a report does not pass.

## SOL-R1-002 — High: a valid delivery commitment can leave no permitted response window

**Evidence.** The instrument permits making content retrievable before original expiry (§3, 49–52). BeginDelivery's deadline may reach that expiry (§8, 268–273). FinalizeDelivery pays all sellers and consumes the unit, but response release waits for finalized verification and same-key recovery ends at original resource expiry (§8, 275–282). Post-commit loss cannot be refunded (§9, 314–316); post-refund/expiry retrieval is denied (§9, 321–325). No minimum lead time or post-commit recovery period is defined.

**Counterexample.** Let original expiry be E. The honest gateway durably prepares the content and obtains a lock ending at E. FinalizeDelivery executes at E−1 under the chosen onchain clock, pays sellers and consumes the unit. The RPC observation or transaction finalization is delayed until E+1. No bytes were allowed to leave before finalized verification. Applying the stated retrieval expiry now denies the first response/replay; issuing a refund contradicts consumed finality. If instead initial response release is allowed after E while only replay is forbidden, that is a different, unstated instrument rule and must be frozen explicitly.

This requires no dishonest gateway, lost disk data or non-final fork. Ordinary asynchronous finality/observation is enough. Transaction success and finalized observation are distinct stages; a send acknowledgment does not establish completion. [sendTransaction](https://solana.com/docs/rpc/http/sendtransaction), [confirmation and expiration](https://solana.com/developers/cookbook/transactions/confirmation)

**Impact and severity.** An accepted terminal delivery may pay the entire chain while the consumer has never had a permitted opportunity to retrieve its prepared bytes. V1 recognizes gateway data-loss risk but does not choose this timing/rights outcome. High is warranted for the unresolved paid-delivery entitlement, not a claim to solve general fair exchange.

**Required correction.** Define separate deadlines for initiating delivery, onchain commitment, first release and response retention/replay. Choose what a commitment made before E means when finalized observation arrives after E. Bind the chosen rules into immutable series/authorization terms and specify exact Clock units and boundary inequalities for all competing terminal operations. A buffer alone cannot give a finite upper bound on finality or operator outage.

**Alternatives and tradeoffs.** Preserve redemption cutoff E but let a valid pre-E commitment create a durable retrieval entitlement lasting an explicit recovery interval after verified commitment; this changes the current absolute-expiry instrument and increases storage obligations. Alternatively, explicitly sell a commitment-only opportunity with possible paid-but-unretrievable expiry and obtain that consent; it weakens the proposed access product. Earlier lock/commit cutoffs reduce the probability but require an explicit residual-delay policy. Releasing content before finality exchanges this issue for rollback/unpaid-delivery risk and must not be slipped in as a retry fix.

**Residual risk.** Gateway dishonesty, durable-content loss and outages beyond any agreed retention period remain trusted-service risks. Chain state cannot force delivery of private bytes.

**Falsification/acceptance test.** At E−1 execute terminal delivery, delay finalized observation/HTTP response past E, restart the gateway, then retry the original request. Assert the exact agreed entitlement and accounting outcome; no second payment or conflicting refund. Repeat just before/at/after every boundary, with TimeoutRefund winning and with an unknown terminal attempt. Use simulated clock planning now and real local execution only after GO.

## SOL-R1-003 — Medium: native recipient rent-state failure can block every payout in a chain

**Evidence.** Price need only be positive and below an unspecified upper bound (§8, 254); native lamports are the sole asset (§3, 74–80). Terminal operations must pay every stored recipient atomically (§7, 233–239; §8, 275–297). Fixture participants begin faucet-funded (§3, 75), but external spending is explicitly possible (§5, 162–167). No recipient minimum-balance, account-state or top-up policy is defined.

**Counterexample.** A seller drains its System account to zero after funding and before delivery. Its net proceeds are positive but below the rent-exempt minimum for the destination account. Under the documented rent transition rules, crediting that empty destination into a rent-paying state fails the transaction. Every other seller/collector payment rolls back too. A prior payer emptying its account can similarly obstruct a small full-chain refund. The examples using small lamport principals make this a relevant boundary. Initial faucet funding is not a durable invariant.

The official account rules prohibit transitions from an uninitialized or exempt account into rent-paying state. This is a source-backed risk, **not a run against the proposed Agave binary**. The docs' linked implementation was v3.1.8; fetching the analogous v4.3.2 rent-calculator path failed. Freeze and verify the selected runtime/feature behavior before treating this as an executed v4.3.2 fact. [Rent state transitions](https://solana.com/docs/core/accounts/modification-rules)

**Impact and severity.** One changed destination can deny terminal cleanup for all four escrow buckets. Medium reflects the bounded local setup and an available operational top-up remedy; the remedy still needs authority and cost accounting. Do not misclassify this as lost or stolen principal.

**Required correction.** Define required destination ownership/data/rent states at execution. If recovery tops up recipients, name the authorized fixture funding account, reserve the separate operating cost, and recheck affordability. Credit only contractual principal/fee from each Match; do not quietly subtract a recipient's rent shortfall from seller proceeds. Include repeated recipients and collector/fee-payer effects in the calculation.

**Alternatives and tradeoffs.** Preflight and explicit separate top-up can preserve atomic terminal distribution, with extra local operating cost and race handling. Program-owned per-payee claim accounts avoid dependence on immediate wallet receipt but introduce a withdrawal mechanism and change what terminal settlement means. An invariant forbidding fixture destination drains narrows the threat model and must be enforced at all permitted operations; merely having funded them at setup is insufficient.

**Residual risk.** A validator/operator with full control is still trusted. Runtime feature changes can invalidate assumed rent behavior; preflight does not itself reserve mutable account balances.

**Falsification/acceptance test.** After GO, empty one previously funded seller, prior payer and collector in separate cases; use sub-minimum positive proceeds/refunds; execute each terminal branch. Either the specified bounded recovery succeeds with separately recorded costs, or the state remains explicitly blocked without partial distribution. Record the pinned runtime features and exact error rather than assuming this documentation describes all future versions.

## SOL-R1-004 — Medium: genesis identity is not sufficient evidence of local-ledger continuity

**Evidence.** Replacement is permitted after expiry plus finalized absence observations (§10, 351–360). The network guard asserts a validator reset changes genesis (§10, 368–372). Bounded ledger retention is planned (§14, 490–502). There is no defined external run-incarnation marker, finalized high-watermark or restoration protocol for a previous local ledger snapshot with the same genesis.

**Counterexample.** A trade executes on the local ledger and its response is lost. The ledger is later restored from a pre-trade copy while preserving that ledger's genesis; the database still records an unknown signed attempt. The restored chain advances beyond the attempt's validity. Genesis, program and market identities match, while Match and signature observations are absent. V1's literal replacement predicate can now treat this as proven unexecuted. Alternatively, restoring both old ledger and database hides that the first execution ever occurred. The original signed history and any irreversible gateway response are not reconstructed by genesis equality.

This is a local restoration/continuity counterexample, **not** a claim that finality routinely rolls back on an honest distributed Solana cluster. `getGenesisHash` identifies genesis, not the current chain history or process incarnation; signature history lookup also does not make a pruned/missing result a proof of nonexecution. [getGenesisHash](https://solana.com/docs/rpc/http/getgenesishash), [getSignatureStatuses](https://solana.com/docs/rpc/http/getsignaturestatuses)

**Impact and severity.** Replacement can hide an earlier run outcome and violate the prescribed evidence/recovery boundary. The canonical restored ledger may contain only one eventual debit, so this report does not exaggerate the trace into two surviving debits on the same canonical chain. Medium reflects operator/local-storage dependence; combined with stale database authorization in SOL-R1-001 it can be more damaging.

**Required correction.** Distinguish an ordinary process restart from ledger reset/restore. Specify the protected run identity and continuity evidence checked before any signing or absence-based release, including how backups/restores are detected and what retention supports verification. An observed slot/height watermark helps but does not by itself defeat a restored chain that later advances past it. On continuity uncertainty, quarantine and preserve original attempts. Separate immutable onchain receipt recovery from proof that a transaction never executed, and account for unknown fees even if economic state is known.

**Alternatives and tradeoffs.** Disable replacement signatures for the first acceptance; retain same-byte resend while valid and otherwise block until explicit audited disposition. This is simplest but can strand a local test obligation. More complete recovery needs a defined trusted local run controller/append-only record and relevant checkpoint consistency checks; it adds operator complexity, not independent-provider security. A new isolated run must have new state/identity and leave the old evidence intact.

**Residual risk.** A malicious operator able to rewrite all logs, keys, manifests and ledger can forge a local demonstration. Explicitly exclude that attacker rather than imply a genesis check solves it.

**Falsification/acceptance test.** Restore an older same-genesis ledger with (a) current database and (b) older database; also prune signature history while retaining the exact Match tombstone. The first two must not silently resume/re-sign as a normal continuation; the third should recover only the evidence actually supported by program state. A clean process restart without ledger rollback should remain recoverable.

## SOL-R1-005 — Medium: the frozen packet delegates security-relevant decisions to later, unpinned material

**Evidence.** Account layouts are promised exact but not given (§7, 209–231). InitializeMarket/IssueSeries require unspecified intended authorities; registration does not name its signer policy (§8, 243–249). Wire details are deferred until after GO (§8, 243–244), while §12 says unresolved normative interface ambiguity is a gate failure (424–427). Mutable `createMarket()` is a conformance oracle (§12, 402), and the reuse matrix is delegated to mutable PLAN.md (§15, 509–514), neither incorporated by hash. The gateway lease, amount upper bound, Clock units and onchain authorization fields are also not frozen numerically.

**Concrete divergent implementations.** One builder treats market ID as a free namespace initialized by any signer; another assumes only a manifest-bound initializer can create the intended Market PDA. A third relies solely on adapter configuration. These have different front-running/authority semantics. Separately, a signer encodes an expiry as seconds while a program treats the same integer as slots, or a delivery instruction omits expected unit version and can apply a still-valid old request after ownership cycles A→B→A. Each implementation can claim consistency with the prose; the review cannot choose the intended behavior from a hash of v1. This is the gate problem, not proof that an implementation already made the wrong choice.

**Impact and severity.** Security checks and negative tests may target different contracts; a mutable oracle can silently change acceptance after review. Medium rather than High because builders are still paused and the defect can be closed by a new immutable contract before work begins. It cannot be deferred beyond GO while also claiming all authority ambiguities resolved.

**Required correction.** Include or hash-pin the normative contract in the next audit freeze, before any program/adapter implementation begins. It must specify:

- Account layouts, fixed maxima, seed domain separators and ID encodings; initializer/issuer/register authority, deployment loader and upgrade-key policy. A retained upgrade key must be named as a trusted actor; a check of the Program account pointer alone does not authenticate changed ProgramData bytecode. [Program deployment](https://solana.com/docs/core/programs/program-deployment)
- Exact instruction account order, signer/writable/equality constraints, accepted source states, expected cursor/lock binding, replay-before-current-state-check precedence, and terminal result fields that remain sufficient for recovery after history pruning.
- Fixed-width canonical signing domain/encoding, sponsor consent fields, time units and inclusive/exclusive boundaries, gross/fee arithmetic limits, rent treatment and maximum encoded message size.
- Initialization of absent versus valid prefunded System-owned PDA addresses, rejection of foreign/nonempty accounts, unsolicited-lamport accounting and whether surplus remains stranded in permanent tombstones. The pinned System implementation has distinct ordinary and prefund-capable creation paths; builders should not choose behavior accidentally. [Agave v4.3.2 System processor](https://github.com/anza-xyz/agave/blob/v4.3.2/programs/system/src/system_processor.rs)
- Hashes for any normative reference/oracle or copied invariants in the frozen packet. Background code must be labeled non-authoritative. PLAN may remain useful background but cannot silently supply a missing mandatory decision.

**Alternatives and tradeoffs.** Inline a compact ABI/authority appendix, or freeze a small separately hashed contract with dependency hashes. Exact numeric error codes that do not alter behavior may be implementation detail; accepted states, validation order and signing domains are not. A wider later design review is possible but prolongs the gate.

**Residual risk.** A precise wire contract does not prove correct code generation, ownership checks or safe parsing; those remain later implementation-review/test obligations.

**Falsification/acceptance test.** Before implementation, two independent readers should derive identical valid/invalid account-role and message examples from only the frozen packet. After GO, test wrong init authority, altered genesis/program/market, nonce and payload changes, absent/prefunded/foreign PDAs, stale A→B→A delivery request, oversized inputs, terminal replay, and canonical cross-language byte parity. A fixture signature on a different message must not satisfy the chosen authorization path.

## SOL-R1-006 — Medium: permitted role sharing and alias rejection need one consistent rule

**Evidence.** Account roles must be distinct and escrow aliases rejected (§7, 209–215); the threat matrix says seller/payer/collector/escrow alias rejects (§11, 384). FundMatch expressly deduplicates signatures when roles share a key (§8, 251–252), and counterparty identities may recur across hops (§8, 299–306). No equality matrix or aggregate-by-public-key reconciliation rule resolves these statements.

**Counterexample.** In an ordinary primary purchase the payer and beneficiary are the same key; blanket role distinctness would reject the normal flow. In issuer→A→B→A→C, A is a seller twice and a prior payer twice. A four-trade payout or refund legitimately credits A more than once. Conversely, letting every alias pass to accommodate this permits an escrow to overlap a recipient, violating custody. If the terminal fee payer is also a recipient, its transaction-local net lamport delta includes both proceeds and transaction fees; comparing it separately to each gross/recipient role can falsely mark a successful chain operation inconsistent.

The runtime makes duplicate account references point to the same underlying state. Review inference: accounting and mutable-borrow handling must respect that shared key, while escrow identity constraints remain strict. [Account deduplication](https://solana.com/docs/core/accounts/account-runtime)

**Impact and severity.** A conforming-looking implementation can reject legitimate closure or produce a false unknown outcome after a successful payment. Medium because correct handling is straightforward once the valid equality cases are fixed. This report does not assert that any particular repeated recipient is currently rejected by nonexistent code.

**Required correction.** Supply an explicit allowed/forbidden equality matrix for every instruction: payer=beneficiary, matcher/fee payer sharing, seller=collector, repeated recipients across matches, owner/gateway sharing if any, and all state/escrow versus external roles. Define self-trade by its economic roles, including sponsored payer versus beneficiary. Keep Match accounts distinct. Compute expected deltas per unique pubkey, incorporating each matched obligation, aggregated fee, rent funding and transaction fee exactly once. Specify safe sequential/aggregated lamport mutation for repeated destinations.

**Alternatives and tradeoffs.** Allow a narrow documented matrix and aggregate by key, which preserves current recurring-participant examples. Prohibiting recurrence or requiring all economic roles unique simplifies checks but changes market semantics; update the instrument and examples if choosing it. No broad exception should waive escrow/recipient separation.

**Residual risk.** Correct role aggregation does not solve recipient rent-state changes (SOL-R1-003) or prove the parties are independent actors.

**Falsification/acceptance test.** Exercise the full four-trade cycle with A recurring, direct buyer=payer, terminal fee payer also a recipient, and the selected seller/collector policy. Verify exact aggregated principal/fee/rent deltas. Then substitute an escrow for each external role and repeat one escrow in the stored match list; all forbidden cases must fail before any committed principal change.

## Answers to v1's six explicit audit questions

1. **Four-trade atomic terminal feasibility:** no inherent packet-size impossibility is established by this review. A compact candidate with two signers (distinct gateway and fee payer), 16 unique keys (those two, Market/Series/Unit, four Matches, four sellers, collector, program and explicit Clock), one instruction with 15 account indices and 100 data bytes is approximately **796 bytes** in legacy format: `1 + 2×64 + 3 + 1 + 16×32 + 32 + 1 + (1+1+15+1+100)`. This is illustrative arithmetic, not a frozen encoding or serialization/compute test. Extra instructions/signers/fields change it. Freeze actual size bounds under SOL-R1-005 and measure actual compute only after GO. The legacy format's 1,232-byte limit and compact array layout support this calculation; newer-format limits must not be assumed. [Transaction format](https://solana.com/docs/core/transactions/transaction-structure)
2. **Gateway lease/timeout:** full gross retention supports refunds, and the trusted-content boundary is honest. Expiry/finalized-release semantics still fail the architecture gate (SOL-R1-002). A gateway that never signs BeginDelivery can still deny service; permissionless timeout only helps after a lock exists. That is an explicitly trusted-service limitation, not cryptographic delivery proof.
3. **Signatures and cursor:** they protect a specifically co-signed same-unit version transition and same-match replay when implemented correctly. They do not yet specify one-order/one-fill protection across units or stale signer recovery (SOL-R1-001). Do not mistake this for requiring onchain price-time matching.
4. **Replacement policy:** prefer disabling fresh-signature replacement for first acceptance until SOL-R1-004 has a frozen, testable continuity/absence predicate. Same persisted-byte rebroadcast and receipt-based reconciliation are different operations. Preserve uncertainty and consumed fees.
5. **Wire contract before coupling:** see SOL-R1-005 and SOL-R1-006. The needed authoritative semantics should precede implementation GO, not merely the moment separately written components are connected.
6. **Local SOL and minimal cursor:** sufficient in principle for the stated localhost escrow/settlement proof. Keep native SOL, rent/fees, match escrow funding, terminal payout and content release separately labeled. It proves neither public-network resilience nor SPL support, independent custody, fair matching or commercial demand.

## Additional validation requirements and non-findings

These are review constraints for the frozen contract and later acceptance, not additional claimed vulnerabilities:

- Program-owned Match accounts containing state cannot be treated as ordinary System transfer sources for payout. Specify direct checked lamport debit/credit by the owning program, preserving rent and instruction balance, or explicitly choose a separate System-owned vault model. The current spec only explicitly calls System CPI for inbound funding, so no wrong outbound CPI is alleged. [Modification rules](https://solana.com/docs/core/accounts/modification-rules), [System transfer implementation](https://github.com/anza-xyz/agave/blob/v4.3.2/programs/system/src/system_processor.rs)
- No close/reinitialize path and durable Match tombstones are useful. Replaying a funded Match after later ownership changes or terminal payout must recover its old result without re-running current-owner/expiry checks that obscure already-established success. Wrong immutable fields and wrong authority still reject.
- Fixed Match gross, rather than current PDA balance, must govern distribution. Unsolicited lamports must not become extra earnings or make a legitimate finalized outcome fail an equality check. Preserve them under the chosen surplus policy.
- A detached order signature verified only by the backend is acceptable only under the declared signer trust contract. V1 uses transaction co-signatures for FundMatch; it does not presently require an Ed25519 precompile. If v2 introduces one, exact verified message/key/offset/instruction binding needs review; merely observing a successful precompile is insufficient. [Precompile interface](https://solana.com/docs/core/programs/precompiles)
- Global maximum counts, safe gross bounds and four-bucket totals must be specified at admission and checked with appropriate integer widths. Checked overflow that rejects is safer than wraparound, but a contract must not admit a lifecycle that inevitably overflows during cleanup.
- Fenced database dispatch cannot revoke signed bytes already held by another process. Safety must derive from immutable economic intent and program transitions even when a stale sender rebroadcasts them. All future attempts remain attributable to their original economic operation.
- Historical payment adapters supply useful persistence ideas, not a compatible native-SOL implementation. In particular, `packages/payments/network-adapter.mjs:171–239` persists/reconciles signed identities; `sdk-transport.mjs:14–40` contains external-network policies, and `74–100` verifies SPL-channel outcomes. The new localhost adapter must not instantiate those legacy defaults or reuse their token-delta verifier as native-SOL proof.

## Unresolved questions for the architect's disposition

1. Does co-signing independently re-authorize a fresh trade, or must every transaction consume exactly one previously admitted order? Who guards fixture signer handles against stale snapshot reuse?
2. What exact entitlement survives a valid pre-expiry delivery commitment observed as finalized only after resource expiry?
3. Which onchain clock units and inequalities apply to order validity, series validity, lock deadlines, finalization and expiry, including simultaneous RefundFailure/ExpireUnused eligibility?
4. Are empty/changed recipient accounts supported, and who may pay separate rent recovery costs?
5. Is replacement disabled in the first run? What distinguishes a same-genesis ledger restore from an ordinary restart?
6. What exact initializer/register authorities, loader/upgrade policy, role-sharing matrix, seed encoding, immutable receipt fields and signed-message format will be in the next frozen packet?
7. What is the precise actual maximum terminal message and account layout? Which mutable oracle assertions, if any, are normative and hash-pinned?

## Evidence inventory and limits

**Local material read:** all 566 lines of frozen SPEC_V1; full AUDIT_PROTOCOL; applicable worktree/root instructions and entry documentation during preparation; targeted payment adapter/transport source refreshed during this round. Preparation previously inspected `native-store.mjs`, `unsigned-transaction.mjs` and relevant prototype `core.mjs` settlement excerpts. None of this mutable source was promoted to the normative v1 contract. PLAN/NORTH_STAR and other reviewers' reports were not consulted for a verdict.

**Primary sources read during this round or preparation and used here:** Solana [Programs](https://solana.com/docs/core/programs), [PDAs](https://solana.com/docs/core/pda), [Transactions](https://solana.com/docs/core/transactions), [Transaction structure](https://solana.com/docs/core/transactions/transaction-structure), [CPI](https://solana.com/docs/core/cpi), [Modification rules](https://solana.com/docs/core/accounts/modification-rules), [Account runtime](https://solana.com/docs/core/accounts/account-runtime), [Program deployment](https://solana.com/docs/core/programs/program-deployment), [Precompiles](https://solana.com/docs/core/programs/precompiles), [sendTransaction](https://solana.com/docs/rpc/http/sendtransaction), [getSignatureStatuses](https://solana.com/docs/rpc/http/getsignaturestatuses), [getGenesisHash](https://solana.com/docs/rpc/http/getgenesishash), [Confirmation/expiration](https://solana.com/developers/cookbook/transactions/confirmation), Anza [Test validator](https://docs.anza.xyz/cli/examples/test-validator/), official [Agave v4.3.2 release page](https://github.com/anza-xyz/agave/releases/tag/v4.3.2), [v4.3.2 System processor](https://github.com/anza-xyz/agave/blob/v4.3.2/programs/system/src/system_processor.rs), and the documentation-linked [v3.1.8 rent calculator](https://github.com/anza-xyz/agave/blob/v3.1.8/svm/src/rent_calculator.rs). The release page was inspected as a public reference, not downloaded/installed or independently validated as a complete toolchain. Source browsing is not runtime evidence.

No native execution, performance result, transaction-size serialization, deployment digest verification, actual RPC finality, rent-rule validation on the selected binary or security guarantee is claimed. Every acceptance test above remains proposed. The report's adversarial traces are deductions from v1 and the named primary semantics, with assumptions called out explicitly.

**Disposition:** retain this report unchanged for round two, supply a new hashed spec and dispositions, resolve High findings and every authority/rights ambiguity, and document bounded Medium decisions. Builders remain paused. Only root parent `01a17200-435b-74c1-9fd0-24a82e3f60ee` can issue GO after inspecting the complete packet.
