# Independent market audit — Round 2

26 October 2026. **Domain verdict: PASS for bounded MVP architecture/implementation
readiness, with the B clarifications below.** This is not implementation GO, executed
acceptance, a production-readiness finding or a security guarantee. Root alone may
authorize the next phase after considering the entire packet and other audits.

The selected economic model is coherent: one primary consideration P backs one
transferable face-value claim; secondary consideration Q is actually paid out at
transfer. There is no promise to refund Q or historical purchase prices. I found no
remaining A defect in that cash/claim model under the declared supported conditions.
This conclusion follows from the actual snapshot rules, not the author's assessment.

## 1. Reviewed identity and independence

Worktree: `/Users/akshat/agentic-dsp/.worktrees/axp-machine-market`.
Packet: **v2-review-2026-10-26-02**. All references below are to files in
`docs/machine-market/architecture/review-packets/v2-review-2026-10-26-02/`.
The root-level older drafting files were not used as normative sources.

| File | Verified SHA-256 |
| --- | --- |
| MANIFEST_V2.json | `ebeccd4064c37059f2bb4d72e4f3ebe0c2f611e0cb2ae955c0029f215162b9ea` |
| SELECTED_MODEL_V2.md | `8b72ef534b6497c13ae1f00a75c1669a64286670e6a85eb1de853b5337d8ee3e` |
| SPEC_V2.md | `b84eda45894000d16ec2f126a1885778165a2ac88dc1bb5fda599978f2b60c5b` |
| WIRE_V2.md | `d59f60ee963942e471e19c00ca37ad6b30f249be74ebf22127bf5e5828d80850` |
| ACCEPTANCE_V2.md | `af2a68f92c1608076fac3051566252bc7720e1b247dcbe729a5911b9fd4bd512` |
| AUDIT_DISPOSITIONS.md | `40143228908a108905d98d57fa291111d7bb5200478eac04f7ab35762d6026d9` |
| PLANNING_HANDOFF.md | `0f34d82856121770909bfa7d298bf031584d8b890385f21588a0eb9be9b72f48` |

Manifest identity and every listed document hash matched before review and were
checked again before submission. The five normative snapshots and handoff were
read. My original ROUND1 findings were checked against them. Original report hash
remains `3dc56959a91f6151e7434c1704695adea33b9ae8fcbc9580e52a579d5b793b64`.

No other reviewer's Round 2 report/conclusions were read. The shared Round 1
disposition ledger was read as required; its proposed closures were not treated
as independent evidence. No new research, agents, chats, implementation, installs,
builds, tests, validator/RPC operations, credentials, external writes or transactions
were performed. Only this report was written. File hashing and arithmetic inspection
are not execution of the planned tests. Observed available disk:142GiB.

## 2. Economic review of the actual selected contract

### What is purchased and who finances it

SPEC S2 lines41-89 and S4 lines158-185, SELECTED_MODEL lines8-31, and WIRE W3/W4
describe a one-use service right with a conditional refund claim. The right is to
start native delivery before useBySlot, not a promise that any HTTP request sent
before that slot will succeed. Successful native start creates the bounded lease;
successful delivery commitment creates persistent same-response recovery within
this finite run. Ordinary unused expiry earns the issuer's primary proceeds.

The original buyer provides P. That amount stays in the primary Match PDA; it is
not immediately available to finance the issuer's operations. The issuer therefore
finances the service/content until delivery commitment or unused expiry. The
original buyer finances ownership until resale, consumption or qualifying refund.

On a secondary purchase, the next buyer provides Q from its own available wallet.
The previous holder immediately receives Q-floor(Q/100), and the collector receives
floor(Q/100). The previous holder has sold both the access right and the sole
conditional claim to P; it keeps no refund claim merely because it once paid for
the right. The current buyer may finance a resale premium or buy the claim at a
discount. Q never augments the issuer escrow. A secondary receipt is a settled
record with rent, not another pool of refundable consideration.

This is a useful simpler model for demonstrating actual resale settlement: sellers
receive spendable proceeds before the eventual resource consumer redeems. It is
materially different from the former contingent full-gross model, and the packet
correctly names the changed promises rather than pretending to preserve them.

### Cash and claim traces

The following are paper derivations from S7 lines259-307 and W4 lines144-204, not
native results. Network fees/rent are excluded from consideration and must be
accounted independently by actual fee payer.

| Event | Cash effect | Escrow/claim effect |
| --- | --- | --- |
| Issuer -> A at P=10000 | A pays10000; issuer/collector primary proceeds0 | Primary escrow10000; A owns one P=10000 claim |
| A -> B at Q=15000 | B pays15000; A receives14850; collector150 | Escrow stays10000; only B owns claim |
| B -> A at Q=8000 | A pays8000; B receives7920; collector80 | Escrow stays10000; only current A owns claim |
| Delivery or ordinary unused expiry | Issuer receives9900; collector100 | Primary escrow principal0; claim extinguished |
| Alternative admitted failure/timeout | Current A receives10000 once; primary fee0 | Primary escrow principal0; claim extinguished; prior secondary cash unchanged |

Before terminal action, net A=-3150, net B=-7080, secondary fees=230 and primary
escrow=10000. Their sum is0. On refund, current A's net becomes6850. That does not
create money: B's trading loss, issuer's unpaid primary sale and paid fees explain
the resulting cash distribution. A receives one current-owner refund, not one
refund for each historical appearance. The retained primary receipt and owner lock
are essential to this result.

For a buyer that pays15000 and does not resell, a qualifying10000 refund leaves5000
of uninsured premium. A buyer paying8000 can instead receive10000. Neither case is
a promise of profit: eligibility requires native delivery admission, time and the
declared gateway behavior. A buyer that leaves the right unused until expiry has
no refund entitlement. Secondary fees remain earned even when the issuer claim
later refunds. SPEC S4 lines178-185 and acceptance V2/V3 state these consequences.

### Why duplicate or misdirected claims are excluded in the design

WIRE W3 lines105-113 keeps Unit.primaryMatch and refundFace immutable after primary
funding. W4 lines152-166 makes secondary cash, receipt, order consumption and owner/
cursor transfer one transaction, and requires the linked primary Match to remain
PrimaryEscrowed. W4 lines190-204 consumes that primary claim once, paying Unit.owner
for an ordinary locked unit or the immutable sponsorRefundKey for sponsored access.
Old owners and old secondary receipts cannot name a different terminal recipient.

For instance, racing A's StartDelivery against A->B has one cursor/state winner:
Start first makes the unit locked and blocks resale; resale first makes A stale.
A->B->A does not restore an old delivery authorization because the cursor differs.
Wrong-recipient and duplicate terminal actions must reject, while exact receipt
replay has no repeated principal/market fee. This is the necessary native proof,
not a reason to add full historical refund loops or onchain content.

### Alternatives and retained costs

The rejected full-gross model locked33000 for the same three purchases and delayed
all sellers' proceeds. It could fund all original-price refunds, but that service
promise and capital burden are absent here. Reintroducing it as a second mode would
make the finite MVP harder to explain and verify without advancing the selected goal.

Immediate resale proceeds plus refunding every buyer's Q is not an acceptable
alternative without new collateral. Limiting refunds to the original buyer while
selling access alone would be simpler in another sense, but would sever the current
holder's remedy from the issuer obligation and contradict this selected instrument.
No extra issuer collateral, guarantor, mark-to-market margin or netting engine is
needed for the precisely limited P claim.

The claim's face fragments secondary liquidity: same-content units bought at
different primary prices can have different P. Exact face books are an honest
simple choice. A looser minimum-face predicate could consolidate liquidity but
would enlarge the pricing/selection problem; it is unnecessary for the demo.

## 3. Original finding dispositions, preserving original severity

“Closed” below means the frozen specification supplies a coherent resolution in
this domain. It does not mean the corresponding native implementation/test passed.

| Original ID / severity | MVP class | Independent disposition and exact changed evidence | Essential future proof / residual |
| --- | --- | --- | --- |
| MKT-001 / High | A | **Closed by changed instrument and recovery rule.** SPEC S2 lines43-74, S8 lines315-343; WIRE lines181-204,239-246 distinguish use deadline,150-slot admitted lease and same-response recovery after useBy. | T5/T6,V4: execution before E and observation/restart after E still recover consumed response; timeout winner refunds without bytes. Gateway durability remains trusted. A merely pending HTTP request is not admitted delivery. |
| MKT-002 / High | A | **Closed for selected series/rights model.** SPEC S2 lines76-89 and S3 lines99-110; WIRE W2 line51, W4 lines152-156 bind exact secondary P and buyer minRemainingAfter, while asks name exact unit/cursor and generic bids use zero cursor. | T1,V1: eligible best price in both incoming directions, skip wrong P and insufficient remaining rights; exhausted/sponsored units reject. See B clarification MKT-R2-01 for primary policy consistency. |
| MKT-003 / Medium | A; auction part C | **Closed within trusted fixture-signing boundary.** SPEC S6 lines225-244; WIRE W1/W2 and W4 lines144-173 bind TIF/lane/face/deadlines/nonce and mandate-aware native signing; OrderUse prevents a filled nonce being reused on another unit. Auctions have no supported schemas. | T2: one-field mutations, same nonce/new HTTP key and same filled order/another unit. Program deliberately trusts signer/matcher for full offchain authorization and maker-price policy; arbitrary compromised signer remains unsupported. |
| MKT-004 / Medium | A | **Closed for one writer/intact DB.** SPEC S3 lines107-144 supplies IOC-at-admission, single hold ownership, both-leg FailedClosed, NeverSignedAbort and no signed-unknown release. S9/S10 and WIRE lines259-306 agree on persistence/sign/send ordering. | T3/T5/T8: cancel before reservation versus reserved abort, pre-sign crash, funding failure and unknown. No old-priority resurrection. Native cancellation tombstones and arbitrary-restore reconciliation are not needed for the supported model. |
| MKT-005 / Medium | A; secondary sponsorship/aliases C | **Closed.** SPEC S5 lines192-221 restricts exact-price primary sponsorship; mandate and consent schemas in WIRE lines53-60 bind authority, packet, unit, amount and beneficiary. Campaign reservation/counters have explicit transitions; W4 lines147-150,196-200 refunds sponsor and forbids resale. | T4:60+60/cap100, count cap, changed unit/price/packet, negative/decline, unknown and refund without allowance restoration. Campaign cap is backend/sponsor-adapter authority, not native enforcement; that is sufficient under declared custody. See B presentation clarification MKT-R2-02. |
| MKT-006 / Medium | C, feature deferred | **Accepted deferral, not repaired old algorithm.** SPEC S3 lines93-94/S4 lines153-156 and WIRE lines58-59 remove the native auction and mutable-bid priority problem. | Unsupported auction input must reject; do not show synthetic auction policy as native proof. One competitive price-time book remains substantial. Future auction addition requires separate rule review. |
| MKT-007 / Medium | A | **Closed under the NEW cash/claim model.** SPEC S7 lines293-307; WIRE W5 lines208-221 allows recurring historical wallets and direct payer=beneficiary while separating state PDAs and current seller from payer/beneficiary. | T7,V3 unique-key accounting for A->B->A, one final-holder primary refund and immediate secondary cash. No requirement to preserve obsolete full-chain refunds. Native account permission/layout implementation still needs its own validation. |
| MKT-008 / Low | B | **Closed.** Manifest pins actual snapshots; SPEC S13 lines502-514 explicitly makes PLAN/prototype/tests informative and lists restated invariants. Handoff reuse table specifically rejects prototype refund semantics as native oracle. | T0/T2 derive outcomes/bytes from this packet and verify codec parity. Prior tests are not proof. No root-level mutable defaults are needed for these economic traces. |

## 4. New observations and cheap clarifications

### MKT-R2-01 — Low / B: make primary transfer-policy validation explicit

**Evidence:** SPEC S2 lines76-79 computes primary remaining allowance as
series.maxTransfers, while WIRE Series/IssueSeries retains separate maxTransfers
and transferable fields (lines80,95-96,129). W4 explicitly states the minimum-rights
test for secondary at152-154 but does not repeat it for primary. SPEC S2 line46
requires the ordinary issuer to opt into resale, and the global matching predicate
already requires the bid's post-fill minimum; these provide the intended constraint.

**Trace to guard:** A future implementation accepts an ordinary Series with
transferable=0,maxTransfers=3, then admits a primary bid minRemainingAfter=1 using
only the numeric count. It could advertise three rights while rejecting every
resale. This is not a demonstrated permitted debit under the packet's opt-in and
eligibility requirements; it is an avoidable interpretation/input-validation trap.

**Minimal clarification:** State either that ordinary native Series in this demo
must be transferable with maxTransfers in0..3 (and how zero is represented), or
that effective remaining rights are zero whenever transferability is false. State
the primary candidate/signing check explicitly alongside the secondary check.
Sponsored acquisitions always have effective remaining rights zero regardless of
the underlying Series. Add one ordinary primary positive-minimum vector to T1/T2.

**Tradeoff/residual:** Restricting issuance is simpler than supporting every flag
combination. This does not justify a new instrument engine or another broad audit.
If a future implementation accepts that inconsistent trace, it becomes an A
supported-flow defect; this B recommendation is not permission to ship it.

### MKT-R2-02 — Low / B: label sponsored procurement as the fixed-price exception

**Evidence:** SPEC S3/S4 selects a continuous maker-price book; S5 lines192-210 and
WIRE W6 lines266-267 separately allow exact-unit fixed-price sponsored primary
procurement. Program/signer roles explicitly do not guarantee global best execution.

**Trace:** A regular resting bid offers120 for a primary unit while a sponsored
quote authorizes100 for that exact unit. A funded sponsored purchase at100 should
not be reported as proof that the global highest bid won. The same-unit hold and
signed issuer offer must still prevent both paths selling it. If the regular match
has already reserved/funded the unit, the stale sponsored consent rejects.

**Minimal clarification:** Label sponsored access as issuer-authorized fixed-price
procurement, not competitive book price discovery. In the demo/evidence show its
separate pricing provenance and shared availability guard. Add the regular-match
versus sponsored-exact-unit race to the existing T3/T4 cases rather than making a
second mechanism, campaign order book or routing service.

**Tradeoff/residual:** A unified competitive sponsor book would complicate exact
consent and budget pricing without being required here. Keeping the fixed-price
path is coherent with disclosed issuer discretion and no cross-route best-execution
promise. This observation does not require native auction machinery or subsidy
surveillance. Same-controller aliases remain unsupported.

## 5. Mechanism quality and proportional scope

The book provides a real algorithmic demonstration if it proves both maker-price
directions, equal-price admission sequence, eligibility before price selection,
quantity-one consumption and exact reservation movement. Native settlement then
proves the cash/owner/claim effects of those matches. An attractive order display
or a list of transaction IDs alone would not demonstrate that objective.

Two typed lanes are justified by different claim formation: primary P equals actual
execution gross, while secondary P is pre-existing and exact. They use one matching
algorithm, not separate auction policies. Incoming asks must apply resting bidders'
minimum-rights predicates just as incoming bids filter asks; T1's two directions
should include that case. No partial fills, market orders, price oracle, AMM or
optimal-value claim is needed.

The following cuts are accepted as scope decisions, not undisclosed safety gaps:

- No auction lane. It adds another timing/priority/cancellation lifecycle and is
  unnecessary to demonstrate competitive matching.
- No native cancellation tombstone. Single-writer durable sign-before-send and
  intact-DB replay preserve cancelled nonces. Native filled OrderUse remains useful
  for the essential same-order/different-unit protection without an onchain book.
- No native campaign aggregate. Signed mandate, one budget transaction and trusted
  sponsor adapter suffice; fixture key compromise/rollback is not promised safe.
- No immutable-loader governance workflow. Fixed local binary/program identity and
  no upgrades during the run fit the operator trust model. A malicious validator
  operator is not an adversary this demo can meaningfully exclude.
- No fresh-signature recovery, arbitrary restoration, HA, external wallet-drain
  repair, prefunded-PDA repair or automatic rent top-up subsystem. Keep known
  obligations, fail explicitly and retain evidence; these unsupported conditions
  do not require a production recovery platform.
- No full-chain terminal recipient loop. One primary escrow is enough for the
  selected promise; historical secondary receipts remain audit records.

Fixed layouts, bounded retention and actual serialization/rent checks are still
appropriate to a finite local program. Fine-grained storage tuning and optional
latency measurements should not displace mechanism/economic/native correctness or
be expanded into infrastructure performance commitments.

## 6. Essential finite implementation proof, once root authorizes it

Use ACCEPTANCE T0-T9 as shared groups rather than adding a suite per finding.
For this domain the decisive evidence is:

1. Exact signed-order vectors and deterministic book results: primary maker-price
   face formation, secondary exact P, remaining-transfer predicates, sequence,
   IOC/GTC, no-fill, same-unit and shared-balance concurrency, one-fill nonce use.
2. Actual localhost primary deposit P and secondary payment Q, with simultaneous
   owner/claim transfer; a failed native transfer leaves all three unchanged.
3. On separate units, primary payout and P-only refund to the current holder;
   prior sellers keep Q-net and paid fees. Include premium, discount, recurring
   owner and replay/wrong-recipient attempts. Compare unique-wallet deltas.
4. Sponsored exact-price primary purchase, negative assessment, consent binding,
   cap/count reservation and sponsor-only refund; no resale or counter reuse.
5. A timely native start observed after useBy, consumed response recovery after
   expiry/restart, timeout versus finalization, and a stale former-owner request.
6. Same intact DB/ledger restart with original signed operation and final receipts;
   no duplicate secondary payment or primary refund, no speculative credit of
   unknown proceeds and no relabelling account-only evidence as known fee history.

Do this within the declared8 initial units,24 successful trades/128 signed-operation
execution package, reusing cases when possible. Toolchain/serialization incompatibility
stops the relevant phase before funding; it is not authority for an unreviewed
economic workaround. These tests remain future work, not grounds to withhold a
design verdict simply because implementation has correctly remained paused.

## 7. Residual assumptions and final conclusion

The local operator controls fixture signers and validator; the matcher can censor
and is trusted for fair ordering; the gateway can misstate preparation or lose
content. There is no protection against arbitrary historic DB/ledger restoration,
production custody compromise, external wallet drain or Sybil/collusive trading.
No attention, comprehension, market demand or public-network capacity is proved.

Buying near useBy entails the disclosed slot deadline: funding before useBy does
not guarantee a later native delivery start can land in time. The new persistent
recovery promise applies to a consumed response, and the lease protection applies
to an admitted native start. It does not turn a pending HTTP operation into an
admitted claim. Keep those distinctions visible in the minimal inspection flow.

**Independent conclusion:** the revised market semantics close the original A
findings in this domain; MKT-006 is transparently deferred, and MKT-008 is closed as
documentation. The new original-P claim model is backed, economically intelligible
and more suitable for an actual secondary settlement demonstration than the prior
all-gross contingent chain. No new High/Critical or unresolved material A economic
defect was identified. The two Low/B clarifications are small and do not call for
production hardening or new infrastructure. This is a PASS for the declared bounded
design, not a blanket endorsement of unspecified future extensions.

Implementation remains paused pending root's explicit GO naming the packet and
allowed phases, and the MVP remains incomplete until actual local-validator proof.
