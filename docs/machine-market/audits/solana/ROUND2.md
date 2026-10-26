# Independent Solana review — Round 2

26 October 2026. Domain: native instruction/account authority, signing, escrow, settled secondary transfers, ownership/claim transitions, replay and bounded localhost proof.

## Verdict

**CONDITIONAL — one narrow Medium/A rights-definition correction remains before implementation readiness.** No new Critical or High finding was identified. The six original Solana findings are resolved for the explicitly narrowed MVP model, with the C exclusions below accepted as scope boundaries rather than claims of repaired production behavior. New **SOL-R2-001** concerns the relationship between Series transferability and the signed remaining-transfer minimum. It requires a small contract correction, not more infrastructure or an economic redesign.

The primary-only escrow/immediately settled secondary model is coherent. I do not recommend restoring historical-gross escrow, native cancellations, a separate auction, upgrade-governance tooling, automatic rent repair or backup-recovery machinery. Subject to the one correction, the architecture is suitable to present to root for bounded implementation consideration. **This report is not GO, a security guarantee, or native execution evidence.** Root alone may authorize the next phase after reviewing the whole packet.

## Reviewed identity and method

Repository reads and this report used `/Users/akshat/agentic-dsp/.worktrees/axp-machine-market` explicitly. The normative target is snapshot **`v2-review-2026-10-26-02`** under `docs/machine-market/architecture/review-packets/v2-review-2026-10-26-02/`. Below, `SPEC`, `WIRE`, `ACCEPTANCE`, `SELECTED`, `DISPOSITIONS` and `HANDOFF` mean files in that directory, not the older drafting files. References use one-based snapshot line numbers.

| Reviewed file | Verified SHA-256 |
| --- | --- |
| MANIFEST_V2.json | `ebeccd4064c37059f2bb4d72e4f3ebe0c2f611e0cb2ae955c0029f215162b9ea` |
| SELECTED_MODEL_V2.md | `8b72ef534b6497c13ae1f00a75c1669a64286670e6a85eb1de853b5337d8ee3e` |
| SPEC_V2.md | `b84eda45894000d16ec2f126a1885778165a2ac88dc1bb5fda599978f2b60c5b` |
| WIRE_V2.md | `d59f60ee963942e471e19c00ca37ad6b30f249be74ebf22127bf5e5828d80850` |
| ACCEPTANCE_V2.md | `af2a68f92c1608076fac3051566252bc7720e1b247dcbe729a5911b9fd4bd512` |
| AUDIT_DISPOSITIONS.md | `40143228908a108905d98d57fa291111d7bb5200478eac04f7ab35762d6026d9` |
| PLANNING_HANDOFF.md | `0f34d82856121770909bfa7d298bf031584d8b890385f21588a0eb9be9b72f48` |
| Original `docs/machine-market/audits/solana/ROUND1.md` | `ed1db5f3bff35ef4b70448e3117341c1ce315aeccf4fbf76ec97d9dc6b801234` |

The assigned manifest hash matched first. Each document hash then matched its manifest entry before review. All five normative documents and the complete handoff were read, together with my original findings. No other reviewer's Round 2 report was read or requested. The author's assessment of no remaining A issues was treated as a proposal, not inherited.

This round used static document inspection, field-size arithmetic and lifecycle traces. No implementation, test execution, build, install, validator, RPC, signing, transaction, broad research, other-thread message or source edit occurred. Only this report was saved. Original audits and frozen snapshots remain unchanged. Disk observation was approximately 142 GiB free, above the 40 GB floor.

## Original findings: independent scope dispositions

A means essential supported-flow correctness, B a useful inexpensive improvement, and C explicitly unsupported hardening. Original severities are retained; closure here is architectural and remains subject to the specified later implementation evidence.

| Original ID / severity | A/B/C disposition and verified correction | Independent verdict and residual boundary |
| --- | --- | --- |
| **SOL-R1-001 — High** | **A closed:** SPEC 225–242 makes transaction co-signing subordinate to exact signed mandates. WIRE 18–47,51–60 fixes domain, actor/nonce, quantity and order bytes. WIRE 30,83,112–113,168–173 adds actor/nonce OrderUse, atomic consumption and immutable Match replay before current-owner/expiry checks. SPEC 127–135 and 398–415 restrict cancellation/restart to the sole writer and intact database. | **Resolved in supported scope.** O→U1 followed by O→U2 cannot consume the same OrderUse, even with a different match ID. Matching can remain offchain. **C accepted:** old-database cancellation recovery and malicious signer/operator resistance are unsupported. Native cancellation tombstones are unnecessary here. T2/T3/T8 and V5 remain required execution evidence. |
| **SOL-R1-002 — High** | **A closed:** SPEC 43–74 defines start-before-useBy, a 150-slot completion lease and same-response recovery after useBy for the bounded run. SPEC 315–343 and WIRE 181–204 bind current owner/cursor/request and make Locked incompatible with ordinary expiry. WIRE 239–246 fixes response preparation/hash without a circular transaction signature. | **Resolved.** Execution before E followed by finality/observation after E no longer forbids the first committed response. Timeout and completion use disjoint slot inequalities. **C accepted:** malicious gateway or loss of all durable content after payout. No fair-exchange theorem or permanent commercial archive is claimed. T6/V4 tests the actual delayed-observation boundary. |
| **SOL-R1-003 — Medium** | **A closed:** SPEC 276–285 reserves System-wallet rent, separates operator fees/rent, budgets the direct-owner Start fee, and checks trade payer post-debit. WIRE 158–165,208–221 separates principal and actual per-key operating costs. Recipients start funded; permitted flows preserve the declared reserve. | **Resolved by a supported-flow invariant plus narrowing.** **C accepted:** arbitrary drains/reassignment and automatic repair. The old four-recipient terminal chain is also removed. **B:** inexpensive reserve diagnostics are useful, but a top-up/withdrawal system is not required. Actual rent behavior must still be checked in T7/T9 before funded acceptance; no runtime pass is inferred. |
| **SOL-R1-004 — Medium** | **A closed:** SPEC 352–395 and WIRE 298–306 retain exact attempts, distinguish account-state evidence and unknown fees, and forbid absence-based replacement. SPEC 400–431 explicitly supports only the same intact current database/ledger through process restart and disclaims same-genesis restore detection. | **Resolved for current-run restart.** **C accepted:** arbitrary restore, independent anchors and automated replacement. Safe blocking after an expired unresolved attempt is a disclosed liveness tradeoff. Same-byte resend is not a new economic attempt. Do not revive the original rollback campaign as a build gate. T8/V6 suffices for the promised recovery model. |
| **SOL-R1-005 — Medium** | **A closed as the original freeze/authority finding:** the manifest pins the actual spec/wire/acceptance; SPEC 502–508 removes mutable-oracle authority. WIRE 7–37,70–204 fixes encodings, seeds, layouts, instruction roles, replay precedence and financial branches. SPEC 246–257 defines initializer/issuer and pinned genesis-loaded program trust. SPEC 287–291 explicitly rejects prefunded fresh PDAs and preserves unsolicited surplus. | **Resolved as originally scoped.** **B/C accepted:** immutable-loader/governance workflow is unnecessary against a trusted operator; actual loader/binary verification remains a bounded pre-funding execution check. Prefund repair is C. A frozen contract is now reviewable; this does not preclude finding a new cross-field inconsistency, recorded separately as SOL-R2-001. |
| **SOL-R1-006 — Medium** | **A closed:** SPEC 293–301 and WIRE 208–221 explicitly allow direct payer=beneficiary, operating-key sharing and historical A→B→A, while separating trading identities, collector and state PDAs. Seller is writable in Fund (WIRE 131); actual deltas aggregate by unique pubkey. | **Resolved.** Immediate secondary receipts make terminal historical-recipient aggregation unnecessary. The current holder, not every historical payer, receives the single primary refund. **C accepted:** Sybil/collusion detection. T7/V3 still must verify recurring-wallet cash and a recipient paying its own direct transaction fee. |

## New finding SOL-R2-001 — Medium, A: transferability and remaining-transfer minimum are not one predicate

**Exact evidence.** SPEC S2 lines 76–89 says primary acquisition leaves `series.maxTransfers`; it defines a signed `minRemainingTransfersAfterFill` and separately says nontransferable units cannot enter the secondary book. SPEC S3 lines 99–104 filters candidates using the post-fill remaining allowance. WIRE W2 line 51 includes the signed minimum in primary BookOrders. WIRE W3 lines 80,93–99 and W4 line 129 permit Series fields `maxTransfers` and `transferable` without a stated cross-field constraint. WIRE W4 lines 144–156 describes primary funding, but only the secondary branch explicitly checks transferability and post-fill minimum.

**Supported-flow counterexample, requiring no malicious operator or restore:**

1. The ordinary issuer CLI registers Series S with `transferable=0`, `maxTransfers=3`, a valid cap/content/deadline and positive prices. Both fields fit the published layout/ranges; no normative rule says this combination must be rejected. This is an ordinary Series, not a sponsored Unit.
2. A signs a primary quantity-one bid for S with `minRemainingAfter=1`. The primary matching formula in SPEC 77 reports three remaining transfers. A compatible issuer ask crosses.
3. A literal implementation of that formula and the primary Fund branch can debit P and give A the Unit. The economic authorization asked for at least one future resale.
4. A's first resale is forbidden by the nontransferable rule, regardless of the numeric remaining count. An implementation that instead treats the count as effectively zero would reject step 2, but that overriding formula is not written.

**Impact and classification.** This is a mismatch in a supported signed rights predicate, not an escrow-conservation exploit. **Medium/A** is proportionate: it can fulfill a primary bid with fewer actual resale rights than requested, but the remedy is a small schema/eligibility correction. It is not an invitation to expand adversary coverage. If nontransferable ordinary Series are intended to be unsupported, say so and reject them at issuance; the present wire exposes the choice.

**Minimal remediation.** Freeze one rule for effective remaining rights and enforce it consistently in issuance, matching, signer validation and native Fund checks. A simple choice is `transferable=0 => maxTransfers=0`; effective remaining is zero for every nontransferable/sponsored Unit and otherwise `maxTransfers - transferCountAfterFill`. Validate the primary branch's signed minimum as well as the secondary branch's. Sponsored funding has no resale entitlement and should use an explicit zero minimum in its common Fund fields.

**Smaller alternative.** For this controlled demo, only allow ordinary Series with `transferable=1` and an explicitly bounded maximum, keeping nontransferability solely as the sponsored acquisition override. Reject unsupported Series configurations rather than introducing a new subsystem. Either option is reasonable; silently assuming it in a builder is not a frozen decision. Allowing arbitrary inconsistent flag/count pairs and relying on UI disclosure is rejected because the signed minimum is an executable purchase constraint.

**Finite acceptance/falsification.** Add this case to existing T1/T2, not a new test campaign: issue false/positive-count Series and require rejection, or show effective remaining zero so a primary minimum-one bid cannot fund; a minimum-zero bid may fund only if that Series is supported. A transferable Series with three transfers must still admit valid primary bids and reach zero after the third secondary transfer. A sponsored Unit must remain nontransferable regardless of its Series count. Include the primary native minimum check with otherwise legitimate signer roles. No test was executed here.

**Residual.** The minimum promises only the structural permission/count of resales before other conditions such as useBy; it does not promise liquidity, a buyer, price or service availability. This finding does not seek those guarantees.

## Economic and native-state analysis

### What is bought and when sellers receive money

The selected alternative removes the principal objection to treating a contingent chain as spot resale. A primary buyer advances P; that consideration remains in the primary Match while the issuer owes the bounded access obligation. A secondary buyer advances Q from its own available cash; seller receives `Q-floor(Q/100)` and collector receives `floor(Q/100)` in that same native transaction. The receipt, both order nullifiers, new owner/cursor and the primary claim move together (SPEC 158–185,261–274; WIRE 144–173). The secondary seller can use finalized proceeds immediately under the reservation equation. No secondary principal remains trapped awaiting redemption.

After settlement, the seller keeps its proceeds and relinquishes the Unit and refund claim. The current ordinary holder owns exactly one claim for original P; a buyer paying a premium does not get Q insurance. A discounted purchaser can recover more than Q on a qualifying failure. This is economically coherent because the payout is still bounded by the existing P collateral; it is not new backing. A failure is admitted through native Start, with the stated gateway/timeout policy. Neither a positive assessment nor a favorable answer is required for sponsor funding (SPEC 190–221).

For P=10000, Q1=15000, Q2=8000, aggregate gross 33000 equals 22770 secondary seller proceeds + 230 secondary fees + 10000 live primary escrow. Success/unused expiry replaces the 10000 with issuer 9900 and primary fee 100. Failure replaces it with one 10000 current-holder refund and no primary fee. The original contingent alternative would have locked all 33000 and left all sellers unpaid until terminal; it remains solvent but is no longer the chosen market. Immediate resale proceeds plus full historical-price refunds would require additional capital that this design does not supply. Rejecting that unsupported promise is correct.

Interim inventory funding is explicit: each buyer supplies its own purchase gross and receives a right plus the described claim. The original P stays immobilized until terminal; current reservations temporarily lock further buying capacity before Q executes. Secondary prices do not increase issuer collateral. Lost resale premiums, earned secondary fees and prior sellers' completed proceeds are not later clawed back. This is sufficient to demonstrate meaningful rights trading without manufacturing a guarantor or insurance mechanism.

### Supported adversarial traces checked statically

| Trace | Why the specified native contract is adequate, subject to implementation |
| --- | --- |
| Two secondary matches target one cursor | Both require FundedOpen/current seller/expected cursor. The first transfer advances it; the competing transaction cannot also debit and transfer at that cursor. All receipt/order-use/payment effects are one transaction. |
| Same filled bid targets a different Unit | OrderUse is keyed by market, actor and nonce, not Unit; it records one Match/auth hash. A new Match cannot reuse it. Exact historical Match replay returns the old result before checking a later owner or expiry. |
| Resale versus owner Start | Both require the current cursor. Start increments and locks it; resale advances ownership/cursor. The loser cannot redirect ownership or the refund claim. Old A's request after A→B→A carries the old cursor and fails. |
| Current holder refund versus old payer | Terminal validation uses Unit.primaryMatch/refundFace and locked current owner, not the primary payer or previous secondary payer. Sponsored uses the immutable sponsorRefundKey and cannot enter resale. |
| Delivery, timeout, ordinary expiry compete | Finalize requires Locked and slot<lease deadline; timeout requires Locked and slot>=deadline; ordinary expiry requires FundedOpen. Terminal status and primary disposition consume the claim once. Exact replay cannot pay again; sibling terminal outcomes remain distinct. |
| Secondary payment followed by primary refund | Secondary Match remains SecondarySettled. Only primary Match is debited at terminal; prior Q/fee proceeds survive. There is no loop over historical recipients that could accidentally unwind them. |
| Crash after native secondary execution | The immutable SecondarySettled receipt and both OrderUses survive later ownership/terminal changes. Account-state-only reconciliation can establish the economic effect without inventing fees/signature history. Fresh signatures are disabled for the unresolved attempt. |
| Repeated participant or direct owner fee payer | Direct payer/beneficiary key sharing is allowed, state PDAs stay distinct, and delta reconciliation is per unique key with network fee and rent separate. Same-key self-trade rejects seller=payer or seller=beneficiary. |

These are deductions from the frozen contract, not evidence that the program already exists or passes these cases.

## Exact-interface and feasibility checks

Static sums of WIRE's no-padding layouts match the printed totals: Market 393, Series 229, Unit 383, Match 619 and OrderUse 178 bytes. Fund instruction data sums to 316 bytes including the 34-byte prefix. The printed conservative legacy Fund budget of 1089 and terminal budget of 574 are arithmetically correct under their stated signer/key/data assumptions (WIRE 223–237). They include no extra compute-budget/top-up instructions. Actual serialization and compute still need T9; these sums do not justify an unreviewed format or compute-limit increase.

The key roles needed for the new cash path are present: payer writable/signer, secondary seller writable/signer, collector writable, matcher writable/signer for rent/fees, Unit/Match/OrderUse writable, and the linked primary Match readonly for secondary funding. Terminal escrow mutation is by the owning program rather than pretending a data-bearing Match is a System-wallet transfer source. The exact primary pointer/face is immutable after primary funding. That is the minimum necessary custody state for the selected liability model.

Canonical signing domain includes genesis, program and Market; actor/nonce identity is independent of the HTTP key. Generic bids use zero exact Unit/cursor while asks bind the selected native cursor. Transaction co-signatures remain a trusted fixture signing service enforcing the original byte authorization; there is no unsupported claim that the program independently verifies detached order signatures or computes price-time fairness. That is an acceptable and substantially simpler MVP trust boundary.

## Scope cuts accepted; complexity not required

- **Keep one maker-price price-time mechanism.** Primary and secondary compatibility lanes represent different claims, not a second matching algorithm. Native auctions and their separate priority/close recovery are unnecessary for this demonstration.
- **Keep filled OrderUse and Unit cursor checks.** These directly support one-order/one-fill and no overselling. They do not require an onchain order book. **Omit native cancellation tombstones** under the sole-writer/intact-DB model.
- **Keep primary P escrow only.** It backs the stated current-holder claim. Do not reintroduce historical-gross buckets or multi-recipient terminal loops.
- **Keep exact signed bytes and coherent restart reconciliation.** Omit HA, independent history anchors and arbitrary restore guarantees. One-attempt blocking is an accepted finite-demo liveness cost, not a production recovery claim.
- **Keep wallet reserve checks and explicit supported destinations.** Automatic rent top-ups, general prefunded-PDA repair and withdrawal claim accounts would add a second money path without helping the supported demonstration.
- **Keep pinned local program identity and no-upgrade operation.** A separate immutable-loader/governance ceremony does not protect this demo against an operator who controls the whole validator; that adversary is excluded explicitly.
- **Keep the existing shared acceptance groups.** Do not expand six original findings into six duplicate campaigns. Prioritize mechanism and actual local signatures/cash/claim evidence over optional latency work or a new UI.

## Finite readiness path and essential proof obligations

1. Correct SOL-R2-001 in a new immutable packet (or explicitly reject nontransferable ordinary Series), with one focused vector and corresponding primary minimum check. Preserve packet02 and both original reports. A targeted static closure review suffices for this issue; it does not require implementation or broad new research now.
2. Root reviews the final packet, all independent reviews and accepted C boundaries, then alone decides whether to issue bounded GO. This review does not authorize any toolchain or builder activity.
3. After such GO, T0–T5 establish exact codecs, legitimate signer/nonce/domain binding, maker-price/remaining-rights/face eligibility, reservations, cancellation and sponsored consent. Source-level fixtures are necessary but not native settlement proof.
4. T6–T9 must then run against the pinned SBF on the isolated localhost validator within the declared funding/operation/disk caps: actual primary escrow; Q seller/fee payment plus owner/claim transfer; separate success and failure Units; current-holder-only P refund; sponsor-only refund/nontransferability; duplicate/conflicting transactions; late-finality delivery recovery; same-intact-DB restart; maximum message/compute and supported wallet/account checks.
5. Record actual finality, program accounts, principal, secondary/primary fees, rent and network costs separately. Reconcile failures/unknowns without a new run masquerading as recovery. The overall MVP remains incomplete until this evidence exists. Optional performance numbers and frontend polish do not substitute for it.

## Residual assumptions and review limits

The operator owns disposable fixture signers and controls the local validator; matcher fairness/censorship, honest gateway preparation and continued availability of the bounded private response store remain trusted. Structural transfer permission does not establish market demand. A qualifying P refund is not secondary-premium insurance. Unused expiry pays the issuer under the explicit terms; offchain failure before a successful native Start does not secretly create a stronger refund claim.

Only the same intact database/ledger through a process restart is supported. Arbitrary restores, external drains/reassignment, deliberate program replacement, lost private content and malicious operator actions are outside the claim. Unknown signed outcomes can stop progress. No native result, runtime rent behavior, compiler compatibility, serialized transaction or compute measurement was verified in this audit. Those are the finite post-GO acceptance obligations already in the packet, not newly invented preimplementation gates.

The report's findings come from the hashed packet and my original report. Prior Solana documentation informed the first review; no new external factual claim or research campaign is needed to establish this round's cross-field counterexample. After saving the report, the manifest, all six snapshot Markdown files and original Round 1 report were rehashed: every hash still matched the table above. **Builders remain paused; root GO is absent.**
