# Independent market audit — round 1

Date: 26 October 2026. Domain: instruments, matching, incentives and their
authorization/settlement boundaries. **Verdict: FAIL for implementation readiness.**
This is a specification review, not an implementation test or security guarantee.

## Target, independence and method

Full frozen target read: `/Users/akshat/agentic-dsp/.worktrees/axp-machine-market/docs/machine-market/architecture/SPEC_V1.md`,
version **v1**, 566 lines. SHA-256 verified before review:

`91d04eea60761c04f7517944bcd055acd6cd5e0b2d7b9391cdfbf5b59a785a2c`

The same digest was verified again before submission. Line references below refer
to those exact bytes. `docs/machine-market/AUDIT_PROTOCOL.md` was read in full.
Other reviewers' preparation, reports and conclusions were not read or requested.
No messages were sent to other chats. No agents, source edits, tests, builds,
installs, validator, RPC, transactions, credentials, push or deployment were used.
Only this assigned report was written in this round; PREPARATION.md is unchanged.
Repository reads used the assigned worktree explicitly. Observed free disk142GiB.

The report reasons about allowed traces and missing normative choices. It does not
treat absent future code as a defect, treat the prototype as settlement authority,
or require tokenization of offchain rights. Exact binary offsets may follow later;
economically significant fields and state transitions must be agreed before GO.

## Findings register

| ID | Severity | Finding | Classification |
| --- | --- | --- | --- |
| MKT-001 | High | Valid finalization can pay all sellers while expiry prevents every retrieval | Contradiction between instrument and delivery timing |
| MKT-002 | High | Series-level matching does not define the remaining resale right the bidder accepts | Missing normative instrument/compatibility decision |
| MKT-003 | Medium | Order signatures and auction authorization lack a complete semantic coverage contract | Authorization specification gap |
| MKT-004 | Medium | Reserved-but-unsigned and failed book matches have no complete order/hold terminal rules | Lifecycle specification gap |
| MKT-005 | Medium | Sponsor acquisition routing, cap reservation and consent invalidation are unspecified | Economic and authorization specification gap |
| MKT-006 | Medium | Auction bid increases buy priority retroactively using a minimal early reservation | Explicit policy with unaddressed incentive tradeoff |
| MKT-007 | Medium | Account-distinctness rule conflicts with permitted recurring counterparties | Cross-layer normative contradiction |
| MKT-008 | Low | Mutable prototype/PLAN references are described as conformance authorities | Unpinned normative dependency |

Two High findings and the unresolved rights/authorization choices block this
domain's readiness. Medium does not mean builders may choose their own semantics.
No Critical issue is asserted from this read-only scope.

## MKT-001 — High: expiry can make a paid delivery impossible

**Evidence:** §3 lines49-52 promises retrievability before expiry. §8 lines268-281
requires a delivery lock deadline no later than series expiry, terminal chain
commitment, then finalized verification before any byte release; recovery lasts
only until original resource expiry. Lines282 and293-297 prohibit refund of the
consumed unit. §9 lines322-325 rejects retrieval after expiry. §10 lines346-349
requires finalized execution. The exact interpretation of equality at a deadline
is also unspecified, but the counterexample does not rely on equality.

**Trace:** Let expiry be E. The owner and gateway prepare correct durable bytes and
establish a lease ending at E. FinalizeDelivery executes validly at E-1 and consumes
the unit, distributing every seller's proceeds. Finalized observation becomes
available at E+1, or the process recovers at E+1 after a pre-response crash. The
gateway was prohibited from sending bytes earlier; it is now prohibited from
sending them at all. TimeoutRefund cannot act on consumed state. No malicious
publisher, lost content, or false attestation is required.

**Impact:** An ordinary allowed timing trace charges the buyer for a right whose
promised retrieval opportunity never exists. This is distinct from the expressly
accepted §9 risk of a gateway losing durable content after payment. It also makes
the lost-response recovery promise false for some valid terminal commits.

**Required correction:** Distinguish acquisition deadline, delivery-request deadline,
commit deadline, and a guaranteed recovery/delivery window. Freeze exact clock
types and boundary inequalities. One viable bounded rule is: stop new locks at a
request cutoff, and allow a successfully committed request to recover until a
separate persisted deadline after commitment/finality, including across original
resource expiry. Make the issued right and gateway retention promise match this.
If replay must end at original expiry, define the weaker promise explicitly and
decide who bears late-finality risk; a heuristic safety margin alone cannot prove
a minimum usable window under unbounded delay.

**Alternatives/tradeoffs:** Extending recovery preserves the purchased request but
requires longer private retention and changes the expiry contract. Defining an
availability reservation rather than successful retrieval can permit nonrefund on
expiry, but is a materially weaker instrument requiring explicit acceptance.
Moving payment after HTTP receipt reintroduces buyer withholding/fair-exchange
problems; it is not a free fix. Gateway guarantees/compensation add a new liability
and require a funded, bounded source rather than reversing settled balances.

**Residual risk:** Even a corrected replay window retains trusted gateway durability
and censorship risks. Do not claim cryptographic delivery fairness.

**Acceptance/falsification:** Specify worked traces with execution before E and
finalized observation/restart after E, lost response near E, and exact deadline
boundaries. Every successful terminal commitment must either permit the promised
retrieval window or fall under an explicitly consented weaker service policy.
Demonstrating only a fast successful local run does not close this finding.

## MKT-002 — High: same series does not imply the same resale right

**Evidence:** §3 lines59-64 limits secondary transfers to three and prohibits
post-delivery transfer. §4 lines96-103 defines a compatibility key using original
transfer rules, not remaining transfer allowance; bids are series-compatible while
exact unitId is optional for asks. Both orders also contain a unit version without
explaining its meaning for a series-wide bid. §7 lines223-226 and §8 lines251-258
track per-unit transfer count/cursor and enforce transfer limits.

**Trace:** Two open unused units U and V have the same issuer/content/expiry/rules.
U has never been resold; V has already been resold twice. Both asks share the stated
compatibility key. Buyer B submits a series bid at100, expecting to consume or
resell. The best ask is V at90. That fill is still within the permitted third
secondary transfer, but leaves B no resale allowance; acquiring U would leave two
further resales. Nothing in the listed bid schema expresses a minimum remaining
allowance after acquisition, or clearly says B accepts any allowance including
zero. A generic unit-version check is not specified as that economic constraint.

**Impact:** The matcher can select rights with materially different remaining
optionality under an allegedly compatible bid. Alternatively, implementers may
interpret the mandatory unit version differently and reject intended cross-unit
matching. The uncertainty concerns what is bought, not whether the counter is
implemented correctly. The final FundMatch signature can mitigate this only if
its signer is required to apply an explicit acceptance policy absent from v1.

**Required correction:** Define the economic lot and the signed bidder's acceptance
predicate. Options include separate books by remaining transfer allowance after
fill; a signed minimum allowance/explicit zero-allowance acceptance; or an exact-unit
bid with explicit loss of series-wide matching. Define whether all series bids
intentionally accept any unconsumed unit and advertise that weaker right. Make ask
unit identity mandatory by matching/signing time and state whether bids carry an
exact cursor, wildcard, or terms constraint. Reject exhausted units before they
are executable, rather than relying on failed native funding.

**Alternatives/tradeoffs:** More books fragment already sparse liquidity; a predicate
adds eligibility filtering and must preserve best-price priority among eligible
asks; exact-unit orders are simplest but offer less substitution. Explicitly broad
bids are defensible if the UI/API/signature make the variability unambiguous.

**Residual risk:** Equal hashes do not prove equal usefulness or issuer honesty.
Do not generalize compatibility across issuers or service policies.

**Acceptance/falsification:** Work through U/V above with buyer requiring at least
one future transfer, then a buyer explicitly accepting zero. Include sponsor-funded,
max-transfer and stale-cursor units. Assert exact expected selected ask, post-fill
allowance and signed terms; both backend and funding adapter must agree.

## MKT-003 — Medium: semantic signature coverage is incomplete

**Evidence:** §4 lines96-103 includes time-in-force in orders, but §5 lines154-160's
canonical authorization field list omits it. §4 lines121-129 authenticates auction
bidders without a distinct immutable auction authorization/bid revision schema.
The generic order immutability rule and mutable increasing auction bids need an
explicit exception. §8 lines251-260 stores both authorization hashes but does not
define the adapter's comparison of executable terms to the full signed offer;
§12 lines424-427 defers encoding and acknowledges unresolved normative interfaces
as gate failures. Coinbase's order specification [P2] treats TIF as a lifetime rule,
not a cosmetic property.

**Trace:** B authorizes an IOC bid100 with a long validUntil. If the enumerated
canonical fields are used literally, changing only TIF to GTC does not change the
signature payload. An initially noncrossing order can rest and later match an
ask90 although IOC should have terminated it. Likewise, two auctions for the same
series with different units/deadlines cannot be distinguished by a generic bid
signature unless auction ID/version and rules are bound explicitly. The resulting
native transaction still needs fresh required signatures; this report does not
claim an attacker can forge those or directly steal funds.

**Impact:** Different implementations can accept materially different authority
from the same order signature. A fixture signing adapter that trusts the saved
match instead of revalidating consent can amplify the error into an unintended
trade, even though the Solana transaction is correctly signed.

**Required correction:** Freeze complete semantic schemas now: ordinary order,
cancel, auction creation, bid/increase and sponsorship consent. Bind all execution-
affecting fields, including TIF, exact auction/rule version and replacement revision.
Define actor/order/nonce uniqueness and one-fill consumption explicitly. State
whether the program trusts co-signers' validation or verifies order authorizations
itself; if the former, require each signing adapter to compare immutable terms,
price/fees, beneficiary and one-fill state before signing. Wire offsets can follow
once these decisions are reviewed.

**Alternatives/tradeoffs:** Signing all canonical semantic fields is simpler than
separately authenticating some mutable request fields. Fresh per-fill consent
could intentionally replace resting-order authority but changes latency/liveness
and must be named. Program-level order consumption is stronger against a faulty
signing service but adds state; this finding does not demand an onchain book.

**Residual risk:** An authorized compromised fixture signer can still consent to
bad trades. Program cursor checks alone prevent a conflicting transfer of one
unit version, not reuse of a generic order across distinct units if all required
parties sign twice.

**Acceptance/falsification:** Mutate each semantic field one at a time; show rejection
or exact documented nonsemantic treatment. Reuse one bid across two auction IDs,
alter IOC/GTC, replay an old bid revision, and propose a second fill of a consumed
quantity-one order on another unit. Specify which layer denies each trace.

## MKT-004 — Medium: reserved matches have incomplete terminal rules

**Evidence:** §4 lines101-110 promises immutable orders, IOC/GTC and priority. §5
lines172-179 forbids cancellation after reservation until definitive funding outcome;
known failure releases holds but does not define resulting order states. §10
lines332-338 permits reserved/prepared before signed; §12 exposes matchBook as a
separate operation. Auction failure has an explicit terminal rule at128-129;
book failure does not. [P2] illustrates why hold release and order lifetime are
separate contractual decisions.

**Trace A:** An IOC order crosses and a match is reserved. The worker dies before
any signature exists, or a required fixture signer never produces one. There is
no native attempt to finalize or prove expired; cancel is prohibited by §5. No
explicit rule releases this provably unsigned obligation or expires its orders.
Repeated instances can encumber all128 units even without an unknown chain outcome.

**Trace B:** An IOC bid120 matches ask100; native funding definitively fails. The
holds release. Is the bid terminal, reopened at its old sequence, or eligible to
match a later ask90? V1 does not say. Reopening an IOC violates its ordinary
immediate-only semantics; reopening either GTC side at its old priority versus
requiring a new authorization changes the market result. Asynchronous matchBook
also needs a rule for a crossed pair admitted before either is matched.

**Required correction:** Publish an order/match transition table and reservation
equations for admission, price improvement, match reservation, signing, known
failure, unknown, success and cancellation. Explicitly distinguish never-signed
abandonment under an exclusive verified fence from potentially signed uncertainty.
Define IOC evaluation at admission, GTC restoration/termination, sequence retention,
two-sided failure disposition and expiry after reservation. Each monetary hold
must be counted once as it moves from order to match to signed attempt; do not
double-subtract the same principal as both active hold and unresolved obligation.

**Alternatives/tradeoffs:** Terminally failing both orders is simple but loses maker
liquidity. Restoring a GTC maker can preserve user intent but requires precise
priority and stale-unit checks. Preventing all unsigned cancellation maximizes
conservatism but creates avoidable indefinite lockup; releasing based on elapsed
time alone is unsafe if a worker could have signed unrecorded bytes.

**Residual risk:** Actual unknown signed attempts must remain frozen; this finding
does not authorize timeout-based financial release or a second debit.

**Acceptance/falsification:** Enumerate Trace A/B outcomes, crash at every state
boundary, and compare the two-process result to one serialized event order. An
unsigned match has a defined recovery/abort path; signed ambiguity never releases
its obligation. Failed IOC never silently returns as a standing order.

## MKT-005 — Medium: sponsorship is not yet a specified procurement mechanism

**Evidence:** §3 lines66-72 requires independent resource selection, exact-price
consent and nontransferability. §5 lines168-170 mentions campaign counters and
refund nonreplenishment; §8 lines251-258 requires sponsor/beneficiary signatures.
There are no normative campaign cap/per-grant/expiry/eligibility schemas, allowance
reservation transitions, rules for whether sponsor funding can acquire a secondary
ask, or consent changes when maker-price execution differs from an offer. §12's
proposed trading API does not resolve these decisions. Prior CONTRACT.md cannot
silently supply them for the new lamport system.

**Trace:** S has ample SOL but authorizes a campaign allowance100 for resource R.
Two beneficiaries concurrently consent to60 each. Actor balance solvency succeeds
for both. Whether the second grant fails depends on an unspecified campaign-level
reservation rule and when consumed increments. Separately, a beneficiary can own
a secondary ask and request sponsorship through another identity; if secondary
acquisition is allowed, a nontransferable sponsored final right does not prevent
the subsidy from becoming the beneficiary/controller's seller proceeds. Finally,
consent at posted100 and crossing a resting bid120 require a routing/price decision.

**Impact:** Wallet solvency alone does not enforce sponsor mandate or distinguish
advertiser funding from issuer/beneficiary self-dealing. Exact signatures restrict
who can authorize the transfer, but the fixture service needs a defined policy
before generating them. No claim is made that two same-wallet controllers can be
identified without additional trust assumptions.

**Required correction:** Freeze a narrow sponsored-acquisition path: eligible
inventory/market types, independently selected series, exact offer/version and
execution price, immutable packet and campaign authority; define consent refresh
rules on price/unit changes. Specify allowance = cap minus committed consumption
minus active reservations with exactly-once transitions for failed, unknown and
refunded grants. Define whether count caps apply and at what event. State account-
level self-dealing restrictions and alias limitations; keep negative assessment
irrelevant to eligibility and keep content/answer independence unchanged.

**Alternatives/tradeoffs:** Primary-only fixed-price sponsored grants sharply limit
subsidy resale and simplify consent; allowing secondary/auction execution adds
utility but needs explicit seller restrictions and a signed pricing mandate.
Requiring fresh sponsor consent per exact match can replace a broad campaign budget
delegation, but then describe the campaign as that narrower manual approval model.
None requires a sponsor auction or onchain campaign if trusted signing is explicit.

**Residual risk:** Cooperative aliases can bypass public-key-only self-trade checks.
For fixed fixture identities, disclose this limitation; do not call the demo
Sybil-resistant or regard its trades as independent commercial demand.

**Acceptance/falsification:** Work the concurrent60+60/cap100 trace, refunded grant
without cap replenishment, changed packet/price, sponsored secondary self-dealing,
negative assessment, decline and an expired campaign. Define expected balances,
allowances, grants, authorizations and zero forbidden transfers for each.

## MKT-006 — Medium: early low bids retain priority after late increases

**Evidence:** §4 lines121-125 expressly preserves original sequence on bid increase;
§13 lines436-438 repeats this intended policy. The book instead loses priority on
price change at101-103. Auction bid visibility is not stated. This is an incentive
property of a specified rule, not a claim that its code violates that rule.

**Trace:** A bids floor1 first and reserves1. B bids100 next and reserves100 for the
auction duration. Immediately before close, A raises to100 and reserves the balance.
A wins the tie using the original sequence despite committing100 later. Across many
auctions, A can buy priority cheaply with floor bids while B encumbers more capital.
With visible bids A can target exact ties; even without visibility the priority
advantage still exists when bids coincide.

**Impact:** The design rewards early low-cost placeholders, not earliest commitment
at the winning price. This may be intentional, but the mechanism rationale does
not justify it or bound reservation/order-spam incentives. It cannot be presented
as the same price-time policy as the book or as truthful bidding.

**Required correction:** Choose and disclose an auction tie policy and visibility
model. Prefer resetting sequence on price increase if earliest commitment at price
is the intended principle; otherwise explicitly accept original-entry preference
and describe its incentive/capital advantage. Specify deadline clock, equality,
bid cancellation, and who may close after deadline so these cannot be chosen by
implementation accident.

**Alternatives/tradeoffs:** Immutable sealed bids reduce reactive matching but make
valuation updates harder. Public increasing bids are simpler but permit sniping.
Random ties require a nonmanipulable randomness/commitment design; deterministic
ordering avoids that added scope. A periodic batch is a different experiment,
not an automatic remedy for collusion or scarce compatible demand.

**Residual risk:** Any simple local first-price mechanism permits strategic bidding,
and public-key self-trade prevention does not prevent shill identities. Document
that boundary instead of adding a production surveillance project to this gate.

**Acceptance/falsification:** Encode A1/B100/A100 and equal-final-bid arrival traces
with exact intended winners; show replacement reservations and deadlines. Review
the result as accepted economic policy, not merely a passing deterministic test.

## MKT-007 — Medium: alias restrictions contradict valid economic identities

**Evidence:** §7 lines209-215 requires distinct account roles, including protection
against escrows aliasing payment parties. §11 line384 broadly says seller/payer/
collector/escrow alias is rejected. Yet §8 lines251-252 deduplicates shared signer
roles and lines299-306 explicitly permits A -> B -> A and recurring counterparties.
Full-chain terminal settlement requires every recorded recipient at234-236.

**Trace:** Issuer sells to A, A sells to B, B sells back to A, as the spec example
permits. In terminal refund A occurs as original payer in two separate matches;
in payout A is both current owner and a historical seller. A broad distinct-role
implementation rejects the terminal instruction, trapping valid escrow. An overly
broad exception could instead allow an escrow to alias a recipient. These require
different rules, not a universal uniqueness predicate.

**Required correction:** Publish an account-role alias matrix per instruction:
forbid every state/escrow alias that compromises ownership or conservation; permit
documented repeated wallet destinations across distinct matches and signer roles;
define self-trade as the relevant current economic parties, with explicit payer/
beneficiary distinctions. Sum or sequentially account for legitimate repeated
recipients using checked arithmetic without paying a match twice.

**Alternatives/tradeoffs:** Prohibiting repeated counterparties simplifies validation
but removes the explicitly advertised A -> B -> A lifecycle; if chosen, revise the
instrument, matching rules and examples. Allowing aliases without classification
weakens escrow isolation. Canonical unique-account metas need not imply unique
economic roles.

**Residual risk:** The Solana implementation still needs independent owner/PDA/
lamport mutation review; this market finding identifies the contract contradiction
and does not certify the account handling.

**Acceptance/falsification:** A -> B -> A settles and refunds with exact summed wallet
deltas under the revised rule, or is rejected before creating the forbidden trade
under a deliberately narrowed policy. Escrow-as-recipient and same current buyer/
seller attacks remain rejected. Run neither test during this planning gate.

## MKT-008 — Low: freeze the normative reuse boundary

**Evidence:** §12 line402 calls reference createMarket a synthetic conformance oracle;
§15 lines509-515 points to mutable PLAN.md's reuse matrix and reference core tests.
No commit/blob digest or exact adopted invariant list is supplied. §8 lines243-244
places wire-contract work after GO, while §12 lines424-427 requires unresolved
normative interfaces to block the gate. That is workable for byte offsets only
after semantic choices above are frozen, not for unspecified economic contracts.

**Trace:** A builder applies the old fixed-price/expiry or sponsor defaults from an
updated PLAN/reference core; another applies only v1's new maker-price/lease rules.
Both claim conformance to the same frozen target but construct different obligations.

**Correction and alternatives:** Mark mutable references explicitly informative and
enumerate adopted invariants in the frozen spec, or pin the precise paths/blobs and
precedence rules. Copying only the bounded required invariants reduces accidental
inheritance; pinning entire files is easier but imports more semantic surface.

**Residual risk and acceptance:** A hash proves identity, not correctness. A reviewer
must be able to derive every trade's authorization, price, timing and refund outcome
from the frozen packet without choosing a mutable document or unstated default.

## Mechanism assessment and accepted boundaries

The price-time book and maker-price examples are coherent for compatible quantity-
one rights. [P1] provides a real example of this matching policy, not evidence that
these access rights have liquidity or deserve a book. The argument at§4 line133
that an ask board does not demonstrate competitive matching is an experiment-scope
argument, not a market-demand argument. A posted-price/RFQ design would be simpler
for heterogeneous sparse resources; a continuous book is reasonable here if its
purpose is explicitly to demonstrate deterministic two-sided matching after the
instrument and lifecycle gaps are closed. Auctions add a second mechanism and
should retain a separate stated use case and policy. AMM rejection is reasonable
for these bounded heterogeneous rights; no AMM or tokenization expansion is needed.

Full gross escrow across at most four trades is internally solvent under the
specified no-early-proceeds model. For10000/15000/8000, principal totals33000;
success pays9900/14850/7920 and fees330, while failure returns10000/15000/8000 to
the original payers. These are paper arithmetic checks, not executed tests. The
capital cost grows with resale turnover and prior owners retain contingent refund
claims; those consequences should remain visible in instrument disclosures. Do
not switch to immediate payouts or net principal without specifying new collateral.

Native local SOL is adequate for the narrow proof of real program-controlled
matched-trade escrow and payout/refund. It proves neither stablecoin settlement
nor public-market operation. Offchain inventory/order reasoning with a minimal
program cursor is a coherent trust choice; onchain best-execution enforcement is
not required by this review. [P3] supports atomic instructions within a transaction,
not atomicity with HTTP or a promise that all four-hop layouts fit.

Explicit gateway dishonesty/durability and matcher censorship remain real accepted
trust limitations, not findings silently requiring permissionlessness. The spec
correctly separates negative sponsor assessment from funding and excludes attention
claims. Final economic rules must preserve those boundaries.

## Unresolved questions for the author and round 2

1. What usable retrieval/recovery window is actually purchased, and which event
   determines its deadline when finality is delayed?
2. What remaining resale allowance does a series bid consent to, and how does its
   unit-version field apply to multiple candidate units?
3. Which complete semantic messages authorize book orders, auctions, bid updates,
   campaigns and per-match signer decisions? Where is one-fill consumption enforced?
4. What happens to each order, sequence and hold after unsigned abandonment,
   definitive funding failure and post-reservation expiry?
5. Is sponsorship primary fixed-price only, or can it acquire book/auction inventory?
   What are its budget, count, self-dealing and consent-refresh rules?
6. Is original auction-entry priority intentional despite the low-bid placeholder
   strategy, and are bids visible? Which clock and boundary define close?
7. Which wallet roles may alias, including recurring counterparties at terminal
   payout/refund, and which escrow/state roles must never alias?
8. Which exact normative artifacts will be in the frozen v2 packet before GO,
   and which remaining details are purely binary encoding/implementation work?

Worst-case transaction sizing and chain recovery semantics remain required
cross-domain checks; this report does not infer another reviewer's conclusions.

## Sources actually read

**Frozen/local:** full SPEC_V1.md and AUDIT_PROTOCOL.md; applicable root/worktree
AGENTS.md. Background read during preparation: README.md, pages.md,
docs/ARCHITECTURE.md, docs/REVIEWER_GUIDE.md, docs/VERIFICATION.md;
docs/machine-market/{CONTRACT,STATUS,NORTH_STAR,PLAN}.md; relevant source sections
of packages/exchange/index.mjs and packages/machine-market/core.mjs, identified
in this reviewer's PREPARATION.md. No other domain's audit file was consulted.
Those mutable sources are informative only; no legacy test result was revalidated.

**Public primary references, checked26October2026:**

- **P1:** [Coinbase Exchange matching engine](https://docs.cdp.coinbase.com/exchange/concepts/matching-engine),
  matching/price-improvement/self-trade sections. Used as a concrete mechanism
  comparison; no assertion that its user model solves alias manipulation.
- **P2:** [Coinbase Exchange create-order specification](https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/orders/create-new-order),
  TIF, holds and lifecycle sections. Used to separate order lifetime, reservations
  and actual settlement; its fees/assets are not imported into AXP.
- **P3:** [Solana transactions](https://solana.com/docs/core/transactions), atomic
  instruction processing and fee-on-failure boundaries. No network was queried.
- Preparation also read [IAB OpenRTB2.6](https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md),
  sections3.2.1/3.2.12/4.2.3, to distinguish placement auctions/win/billing events
  from transferable access rights. It is not treated as a secondary-rights standard.

**Final verdict:** FAIL for market-domain implementation readiness. Resolve MKT-001
and MKT-002 and the identified semantic ambiguities in a new frozen version; provide
explicit dispositions and worked acceptance traces for every remaining finding.
Round2 must verify actual closure and cross-layer consistency. This report does
not authorize implementation. Only root parent `01a17200-435b-74c1-9fd0-24a82e3f60ee`
may issue GO after the required packet review and audit rounds.
