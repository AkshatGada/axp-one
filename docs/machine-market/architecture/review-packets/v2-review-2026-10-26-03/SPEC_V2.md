# AXP backend and Solana settlement — specification v2

26 October 2026. Frozen review candidate v2-review-2026-10-26-03; NOT implementation approval.
Normative bundle: this file, WIRE_V2.md and ACCEPTANCE_V2.md, identified together
by this snapshot's MANIFEST_V2.json. All must be read; no mutable prototype/PLAN defaults apply.
V1 and original round-one reports remain unchanged. Every original finding is
mapped in AUDIT_DISPOSITIONS.md. Round Two reports are preserved; the new Packet03
corrections require focused independent verification and explicit root GO.

## S1. Objective and binding gate

The focus is deterministic trading algorithms/backend and genuine Solana escrow,
payout and refund for matched machine-access trades. Catalog, content, reasoning,
order book and matching remain offchain. Minimal native cursors/nullifiers protect
settlement; this is not an NFT platform or a demand to put all data onchain.
Existing frontend stays minimal and usable. Local SOL on an isolated validator is
the sole native asset; reference microcredits and historical testnet assets remain
separate. No USDC/SPL support, mainnet, public Devnet, external RPC, cloud deployment,
paid model call, production custody, commercial demand or attention claim.

IMPLEMENTATION PAUSED. Planning/read-only research/audit documents only. No source
edits, installs, builds or validator execution until at least two independent audit
rounds have no unresolved Critical/High or material rights/authority ambiguity,
all Medium findings have explicit dispositions, and root parent
01a17200-435b-74c1-9fd0-24a82e3f60ee independently reviews the complete packet and
issues explicit GO naming its version/hash and allowed phases. Lead cannot self-GO.
The initial synthetic prototype is preserved, not declared the finished objective.

Proportionate MVP boundary: one local backend writer, controlled fixture signer
handles and an intact current SQLite database/validator ledger across process
restarts. Concurrent HTTP commands and conflicting native transactions require
future acceptance tests after GO; no native execution is claimed here.
HA, competing backend services, arbitrary backups/restores, malicious local operator,
external wallet drains/account reassignment, indefinite operation and machine-wide
disaster recovery are unsupported. Do not add infrastructure to claim those cases.
Every finding retains original severity plus A(MVP blocker), B(cheap useful
improvement) or C(deferred hardening/unsupported condition). A supported-flow bug
cannot be deferred merely to pass review.

## S2. Instrument and clocks

A Series commits an issuer, exact content SHA-256/version hash, content format,
finite cap, immutable primary sponsored price, useBySlot, resale policy and these
v2 delivery/refund terms. A Unit is one indivisible right to START one delivery
request before useBySlot. Quantity is exactly1. N units require N authorizations.
It is not a copyright transfer, attention asset, subscription or future unspecified
capacity. Issuer must control the owned fixture material. Resale is available only
where the issuer explicitly opts in under the canonical transfer policy below.
Native global run caps:16 series,64 lifetime units,256 executed matches; no recycling
expired/refunded/consumed units. At most3 secondary transfers/4 executed trade receipts per unit. Only the primary
trade holds refundable principal; secondary trades settle immediately.

All economic deadlines use Solana Clock.slot, u64. No Unix/slot ambiguity. Local
wall-clock time is display metadata only. New funding, order admission and delivery
start require currentSlot < their deadline. Equality means closed. FinalizeDelivery
requires currentSlot < deliveryDeadlineSlot; TimeoutRefund requires >=. Ordinary
expiry requires >=useBySlot and FundedOpen state. Recent-blockhash validity uses
lastValidBlockHeight independently; a slot/use deadline is not blockhash expiry.

A timely finalized delivery-start locks the right. Its completion lease lasts
150 slots from the execution slot, even if useBySlot passes meanwhile. This is an
explicit difference from the reference prototype. A committed delivery creates a
permanent same-response recovery entitlement FOR THIS BOUNDED LOCAL RUN: the exact
owner, request identity and response may recover after useBySlot; no new request,
resale or changed content is allowed. Private responses/tombstones are never evicted
within the run. Lifetime count/byte caps make indefinite run retention finite.
No run reset/deletion is a recovery mechanism. Export/retention beyond this local
run and commercial data-retention promises are deferred, not implied.

Thus execution at E-1, finalized observation at E+1 and a restart much later cannot
turn a successfully committed delivery into a paid-but-forbidden first response.
If start executes at E-1 and completion misses its lease, the locked unit becomes
eligible for an explicit TimeoutRefund transaction. No timer or read automatically
moves funds. Original useBySlot does not permit an expiry payout while locked.
No heuristic finality margin supplies the guarantee. Gateway dishonesty or loss of
all durable content after payment remains a stated trusted-service risk.

A unit's EFFECTIVE remaining resale allowance is an economic property. The only
valid issuance pairs (transferable,maxTransfers) are (0,0), (1,1), (1,2), (1,3).
Reject every other pair at issuer admission and native IssueSeries, before creating
Series state or advancing counters; never silently normalize signed terms. Ordinary
nontransferable Series are supported for consumption, with zero resale entitlement.

For a proposed fill, first validate the Series pair and the transition. Ordinary
primary uses transferCountAfterFill=0; ordinary secondary uses current transferCount+1
and requires transferable=1, Unit.sponsored=0 and current transferCount<maxTransfers.
EffectiveRemainingAfterFill=0 if the Series is nontransferable, the Unit is sponsored,
or the acquisition is sponsored; otherwise it is maxTransfers-transferCountAfterFill.
Check count bounds before subtraction. A zero minimum never authorizes a forbidden
secondary transition. Sponsored primary overrides even a transferable Series to zero
rights and requires common Fund.minRemainingAfter=0.

Every ordinary primary AND secondary bid signs minRemainingTransfersAfterFill in0..3.
Require EffectiveRemainingAfterFill >= that signed minimum in candidate selection,
match reservation, signer validation and native Fund BEFORE economic effects. For
ordinary primary admission, the Series already fixes these rights: reject a minimum
above them before creating an order hold. Secondary candidates still require their
Unit-specific post-fill check before matching. Zero
explicitly accepts no future resale. These are structural permissions, not promises
of liquidity, price or time beyond useBy. WIRE W3/W4 fixes the same rule.
Bids have no exact unit cursor; asks MUST name exact unit and current cursor.
One matching algorithm operates on typed lanes. Primary lane uses Series plus
refundFace=0 sentinel, explicitly meaning the claim equals actual primary execution
gross. Secondary lane adds EXACT originalPrimaryRefundFace to the book key; bids
and asks sign that face value. A unit with a different face cannot cross even when
Series/content match. The selected Unit's primaryMatch and face bind native signing.
This is a face-value issuer claim, not insurance of a secondary buyer's purchase price. The
match and all transaction signers bind the selected unit/cursor. Compatibility
otherwise requires exact Series ID/terms, issuer, content/version, format, useBySlot
and failure policy. Sponsored/nontransferable units never enter the secondary book.

## S3. Matching and order lifecycle

Primary posted-price asks and secondary asks use ONE continuous limit book. Native
auctions are deferred; the preserved synthetic auction is a separate reference. One unit
is free inventory, one ask, one reserved match, delivery-locked or
terminal—never more than one. Primary seller is issuer; resale seller is the
native cursor's current owner. Availability/depth is provisional until funding.

Bids: price descending then committed admission sequence. Asks: price ascending
then sequence. In BOTH incoming directions, filter compatible candidates by the same
S2 effective-rights predicate and exact claim face BEFORE price-time selection.
Incoming bids filter asks; incoming asks filter resting bids against this Unit's
post-fill rights. Skipping an ineligible higher bid is eligibility selection, not
fallback after a reserved/native-failed match. IDs only break an impossible equal
sequence deterministically. Crossing incoming order executes at the RESTING order's
price, within both limits. One order fills one unit. Self-cross (buyer beneficiary
or payer equals current seller) rejects the incoming order; resting order remains.
This only prevents same-key self-trade, not aliases/collusion or manufactured demand.

GTC must have explicit expiry. IOC is evaluated exactly once INSIDE its admission
transaction against then-executable resting orders; no asynchronous later matching
of an unfilled IOC. Noncrossing IOC goes to cancellation processing, never rests.
A price/terms change cancels the old authorization and requires a new nonce/order
with new priority. Exact retries preserve identity/sequence. No partial fills,
unbounded market orders, midpoint execution, AMM or automatic fallback maker.

| State/event | Order/hold outcome |
| --- | --- |
| Valid signed admission | Verify all fields; unique actor+nonce and orderId; allocate sequence; reserve bid limit or ask unit; evaluate IOC/crossing atomically |
| Resting GTC | Hold remains owned by order; may cancel or match before deadline |
| Match reservation | Both orders Reserved; move the SINGLE bid principal hold to match at execution gross; release price-improvement difference; ask-unit hold moves to same match |
| Before any signed bytes | Sole writer may NeverSignedAbort after proving no signed-attempt row; both orders become FailedClosed, holds release, never reopen at old priority |
| Signed/submitted/unknown funding | No cancellation acknowledgement/release; hold belongs to immutable match; quarantine payer and shared operating signer |
| Finalized trade success | Both orders Filled; hold retires with coherent wallet/receipt observation. Primary is Escrowed; secondary is immediately Settled with seller/fee paid; Unit owner and sole primary claim advance atomically |
| Finalized funding failure | Both orders FailedClosed; release principal only after exact failed signature and no funded Match; retain consumed operating fee; no automatic retry/new match |
| User cancellation or unfilled IOC/expired GTC | Only an unmatched order with no signed attempt becomes Cancelled/Expired/NoFill atomically; release its order hold; no native effect |
| Cancellation races match/signing | One DB linearization; if match reservation wins, single-order cancellation rejects PendingSettlement. A reserved but never-signed match may instead undergo sole-writer NeverSignedAbort of BOTH orders. Signed/Unknown cannot abort or release; finalized trade resolves Filled |
| Funding unknown | Frozen match/holds; no cancellation acknowledgement or fresh signature |

Cancellation is intentionally offchain under the supported sole-writer/intact-DB
model. The same transaction that decides cancellation observes whether a signed
attempt exists; signing and durable attempt creation occur under that writer lock,
and no broadcast happens before commit. A cancelled/failed nonce remains permanently
terminal in the database and cannot be re-admitted under another HTTP key. Native
OrderUse records protect FILLED order reuse across units. They do not preserve
purely offchain cancellations after an unsupported old-DB restore. No claim of
backup restoration safety or malicious signer protection is made. This removes
per-cancellation native transactions and the associated recovery subsystem.

Reservation equation per payer, per coherent observed chain context:
spendable = finalized wallet lamports - minimum System-wallet rent reserve - sum(active principal holds).
A hold has ONE owner(type order or match), never both. Operator fee/rent holds
are separate and never counted as principal. After the native buyer debit is observed,
its principal hold retires; primary escrow is not subtracted again. Confirmed secondary
proceeds are spendable wallet cash; unknown proceeds are not credited speculatively. Unknown retains full
principal until native evidence resolves it. Mission/campaign committed-gross
allowances do not replenish on refund, although actual wallet cash does return.

Maintain a walletStateVersion and finalized observation-slot watermark per payer.
Increment the version atomically whenever an accepted wallet observation OR its
hold set changes, including hold retirement. A context fetched outside the writer
transaction carries the captured version. Admission/signing must recheck that version
and require contextSlot>=the current wallet watermark; otherwise refuse the decision
and refetch outside the transaction. A new operation ID cannot bypass this payer
check. Commit coherent observed balance and hold retirement together. Never combine
an older higher balance with a newer reduced hold set. This is a local version
check, not a distributed lock or wallet-history service.

All admission/matching/cancellation decisions use relational SQLite transactions
and unique indexes for actor+nonce, orderId, active unit lane and match identity.
No RPC while holding the write transaction. Worker signatures are authorized from
immutable admissions and a fenced signing row, not arbitrary browser intent data.

## S4. Selected economics and mechanism comparison

ONE continuous price-time/maker-price book, quantity1, typed primary/secondary
lanes. Native auctions are deferred. The reference synthetic auction remains separate
historical implementation; its priority policy is not native conformance. Any later
auction needs a separate rules/priority review. No AMM, leverage or liquidity claim.

SELECTED: primary-only issuer escrow and immediately settled secondary rights.
Primary buyer pays P into its primary Match PDA; issuer and primary fee receive
nothing yet. Ordinary ownership carries the indivisible original-P refund claim.
Each secondary buyer pays Q atomically to seller Q-fee(Q) and collector fee(Q),
together with native ownership/cursor and claim transfer. Secondary proceeds/fees
are final, not refundable on later issuer failure. Historical owners retain neither
claim nor terminal refund. No secondary gross becomes additional issuer collateral.

Success or agreed UNUSED expiry pays issuer P-fee(P), collector fee(P), extinguishing
the claim. Admitted delivery failure/timeout instead refunds all P to the locked
current holder, with zero primary fee. Sponsor primary rights cannot transfer;
failure refunds their sponsor, never beneficiary. Fee(x)=floor(x/100). Transaction
fees/rent are separate operator costs, not subtracted from the promised face.

| Alternative | Cash/claim consequences | Decision |
| --- | --- | --- |
| Primary escrow plus settled secondary | P10000, resales15000/8000: sellers immediately14850/7920, secondary fees230; only10000 stays escrowed. Success adds issuer9900/fee100; failure instead pays final holder10000. | SELECTED: conventional immediate secondary settlement, one precisely funded issuer claim and lower locked capital. Buyer explicitly bears resale-premium risk and may buy the claim at a discount. |
| Full-gross contingent chain | Same prices lock33000; every seller waits until terminal; failure returns each historical gross. | Comparison only, NOT simultaneously implemented. Solvent but capital-intensive and changes a sale into a contingent-proceeds claim. |
| Immediate secondary proceeds plus full resale-price refunds | Requires extra collateral/guarantor after proceeds have been paid. | REJECTED: no backing exists for that promise. |

If holder paid15000, a qualifying10000 refund leaves5000 premium loss. If it paid8000,
refund10000 can yield2000 gain. This is a transferred face-value claim, not invented
backing or guaranteed arbitrage; qualifying native admission, timing and gateway
trust still apply. Known-failure/deceptive secondary listings and colluding aliases
are explicit market risks, not a production surveillance project. Locked/terminal
Units cannot trade. Signed secondary orders bind exact P and nonrefundable fee/premium
policy under this rules version. Same-Series primary fills may have different P,
so exact claim-face compatibility is mandatory, not just a UI disclosure.

The experiment demonstrates resource-right transfer, competitive matching and actual
native settlement. It does not establish commercial liquidity, fair value or demand.

## S5. Sponsorship mandate

Native sponsorship is PRIMARY FIXED-PRICE ONLY: issuer-owned cursor0 unit, exact
Series sponsoredPrice, no secondary asks and no auctions. The source is chosen
independently before a sponsor is considered. Sponsor and beneficiary cannot equal
issuer/seller or each other. Same-controller aliases remain out of scope.

This is issuer-authorized fixed-price procurement, NOT competitive book price
discovery or a claim that the highest ordinary bid won. It is not a second auction
or sponsor book. Label regular trades pricingProvenance=book-maker-price and sponsored
trades pricingProvenance=sponsored-fixed-price. Both paths use the SAME atomic Unit
availability/reservation guard; sponsored admission also reserves campaign allowance
in that transaction. If either path has already reserved/funded the exact Unit, the
other cannot sell it or substitute another Unit under stale consent. The first
successful reservation governs availability; no cross-route best-execution promise
is made. Evidence must distinguish the two pricing sources.

A signed SponsorMandate binds domain, campaignId/nonce, sponsor, exact Series,
packetHash, maxGross, perGrantCap, maxGrants, at most4 eligible beneficiary keys,
validUntilSlot and fixed rule version. Immutable backend Campaign record tracks
consumedGross/count and refundedGross separately. It is allowance authority, NOT
a prefunded cash balance; multiple mandates do not create cash. No budget mutation,
replenishment or withdrawal feature in this run.

Exact beneficiary consent signs campaign/version, selected unit/cursor0, Series,
packetHash, exact gross, sponsor/payer, beneficiary, deadline, nontransferability,
and assessment enum(positive/negative/insufficient). Assessment is an unverified
opinion and never changes eligibility. Sponsor signs the exact funding transaction
after its adapter verifies mandate, consent and reservations. Changed unit, packet,
price or campaign requires fresh consent. If quoted unit becomes unavailable, reject;
never substitute another unit using prior consent. Decline consumes no money/grant.

Backend campaignAvailable = maxGross - consumedGross - activeReservedGross;
countAvailable = maxGrants - consumedCount - activeReservedCount. Reserve both in
the same match transaction. On finalized FundSponsored, backend consumed counters atomically
increase with the observed Match and the local reservation retires; unknown keeps reservation until a
coherent observed Match resolves it. Known failure/cancellation releases
only that reservation. Primary refund credits the sponsor and increments refundedGross but never reduces consumed.
Concurrent60+60 against100: only one reserves/funds; the second is rejected. The single-writer budget transaction and sponsor signing adapter enforce the cap.
The native program verifies the sponsor/beneficiary signatures and exact primary
price/packet/unit, not aggregate campaign policy. Backup rollback is unsupported. Resource bytes
never contain sponsor instructions; packet/disclosure is a separate response field.

## S6. Authority, signatures and custody

Orders, campaigns, cancellations, consent and delivery requests
have complete tagged canonical byte schemas in WIRE_V2. HTTP transports those bytes
and signatures; no unsigned request field changes economic meaning. Actor+nonce
uniqueness is independent of HTTP idempotency. Exact retry under another HTTP key
still resolves the same signed economic authorization. Changed bytes under a used
nonce reject. Native transaction signatures are match-specific approval by fixture
signing adapters acting under those mandates, not fresh unrestricted authority.
Each adapter reconstructs and checks the complete native message/terms/nullifiers
before signing. No private key is exposed to models/browser/RPC or read from existing
wallet configuration. Demo role switching impersonates fixtures by design; it is
not production wallet authentication or independent custody.

Onchain authority: Market/Series caps, Unit cursor/state, filled OrderUse nullifiers,
Match escrow/terminal status. Offchain authority:
catalog/private bytes, authenticated order admission, campaign allowance, price-time matching, eligibility
and fair ordering, source selection, assessment. Program does not recompute the book
or prove best execution. It verifies transaction signers, exact supplied bounds,
deadlines, expected cursor, role constraints and consumed order identities.
Matcher censorship, gateway dishonesty and a compromised authorized fixture signer
remain explicit trust risks. Same-key STP does not provide Sybil resistance.

Market PDA namespace includes the manifest-bound initializer key and random nonce;
Initialize requires that key, preventing another key preempting the intended market.
Issuer registration is restricted to the one manifest-bound fixture issuer; finite
Series/Unit counts are native. Program is loaded from the pinned SBF binary into the isolated validator genesis
using the official test-validator program-loading facility. Record program ID,
actual loader owner/executable flag, binary SHA-256 and genesis; verify that fixed
identity before native admission. No program upgrade is performed within a run.
No separate upgrade-governance or authority-removal workflow is required. The
trusted fixture operator controls the validator and code; deliberate replacement
is unsupported and not protected against a malicious operator. Unexpected program/
manifest identity blocks signing. Supported exact loader observation is confirmed
in toolchain preflight after GO; failure stops before funding, not silent fallback.

## S7. Native escrow, settled receipts and accounting

Native asset: local SOL lamports. Maximum gross1_000_000_000 per trade; fee=
floor(gross*100/10000), checked u128 intermediate/u64 result. No float or asset
conversion. Primary Match holds full P plus rent; primary fee is unearned until
success/unused expiry. Secondary Match is a PERMANENT SETTLED RECEIPT holding rent
only: Q moves directly buyer->seller net and collector fee atomically with owner/
cursor/claim transfer. The primary escrow stays exactly P; no receipt loop pays
historical parties at terminal. Tombstones never close/reinitialize.

Unit stores primaryMatch, immutable refundFace=P, latestMatch, owner/cursor and
refund policy. Direct ordinary refund follows current owner; sponsored refund uses
immutable sponsorRefundKey and Unit cannot transfer. Delivery lock freezes ownership
and hence refund recipient. Terminal primary receipt records actual paid recipient
and disposition; no second claim or old-owner claim can consume it. A secondary
receipt remains Settled even if primary is later Refunded.

For service-submitted transactions, operator/matcher pays transaction fees and
state-account rent from a separate allowance. For direct owner StartDelivery, the
owner may pay the transaction fee without a matcher or gateway signature. That fee
is separate from trade principal and primary escrow and must be budgeted so the
owner retains the required wallet rent reserve. Setup funds all registered fixture
wallets/collector above the System-wallet rent minimum. Every trade requires payer
post-debit >=that minimum; backend available funds subtract it. Apart from this
direct-owner fee exception, supported operations otherwise only credit recipients.
Invalid/externally drained or reassigned destinations fail atomically with principal intact.
External wallet drains/automatic repair are unsupported; no top-up/withdrawal system.

Fresh PDAs must be absent/zero-lamport empty System accounts at expected seeds.
Prefunded/foreign/nonempty fresh PDAs reject before consideration moves. Exact
existing program receipts use replay rules. Unsolicited escrow donations are not
principal: distribute only stored P/Q/fee and retain surplus/rent in tombstones.
No sweep or close path. These choices avoid a prefund-repair subsystem.

Allow direct payer=beneficiary and matcher=gateway/fee payer. Trading identities and
collector are distinct from operating authorities; current seller differs from
payer/beneficiary. Historical participants may recur (A->B->A). State/escrow PDAs
never alias wallets or foreign state identities. Compute deltas by UNIQUE pubkey,
including each fee/rent once; no global distinct-wallet shortcut. Source wallets
are System-owned/data-empty. Primary payout/refund directly debits the program-owned
escrow using checked lamport mutation, preserving rent and instruction conservation.
Secondary transfer uses System CPI; all receipt/nullifier/owner/payment effects
commit together or all revert. No historical proceeds are clawed back.

Conservation across P10000,Q15000,Q8000: total33000 = live primary escrow10000 +
secondary seller cash22770 + secondary fees230. Success replaces escrow with issuer
9900+primary fee100; failure replaces escrow with current-holder refund10000. Rent,
network fees and unsolicited surplus are independent terms. Claim recipient can
receive more/less than last paid Q; that is expressly signed face-value coverage.

## S8. Native lifecycle and delivery precedence

| Unit state | Permitted effect | Required result |
| --- | --- | --- |
| IssuerOpen | Primary or sponsored primary trade | Exact cursor/Series, valid bounds/signers/unused OrderUses; full P escrow; owner/cursor advances, primary claim initialized; FundedOpen |
| FundedOpen | Secondary trade | Exact cursor, transferability, remaining transfers and signed face=P; buyer pays seller net/fee immediately; receipt/nullifiers/owner+claim transfer atomic; original primary escrow unchanged |
| FundedOpen | StartDelivery | Current owner signature, exact cursor/request, slot<useBy; DeliveryLocked until startSlot+150 |
| DeliveryLocked | FinalizeDelivery | Gateway, exact lock/request/response, slot<deadline; primary issuer/fee payout only; Consumed |
| DeliveryLocked | RefundFailure | Gateway and exact lock; primary P refunds current locked holder or sponsor; Refunded |
| DeliveryLocked | TimeoutRefund | Any caller at slot>=deadline; same single primary refund; Refunded |
| FundedOpen | ExpireUnused | Any caller at slot>=useBy; primary issuer/fee payout only; Expired |
| Terminal | Exact replay | Original typed receipt, no repeated principal or market fee; a separately submitted transaction may still incur its network fee. Conflicting terminal action rejects |

Unfunded IssuerOpen pastuseBy is unusable without a financial expiry transaction.
Register/fund/start reject after applicable deadline. Counts never recycle.

Start is owner-only, not gateway-co-signed. The gateway processes the bounded native
Unit set for finalized locks, including direct native starts without an HTTP call.
All needed source terms/request identity are onchain or in the immutable local Series
record; no missing caller text can prevent preparation. Processing is an explicit
local service operation, not a new timer-settlement product. Owner can request a
native timeout refund if gateway never services its accepted request.

Refund entitlement from delivery failure begins at successful native Start, NOT an
HTTP request or offchain failure flag. Source readiness is evaluated after that
admission. Locked blocks ordinary expiry even afteruseBy. If Expire wins beforeStart,
no delivery claim was admitted; HTTP202 means pending. There is no unconditional
promise that an offchain-known failure outranks an already executed expiry payout.

Gateway persists exact response/owner/cursor/request/content hash with SQLite FULL
before signing Finalize. No bytes release before finalized consumed verification.
Consumed owner may recover that exact response indefinitely within the finite run,
including late observation afteruseBy. Refunded/Expired never releases bytes; unknown
terminal outcomes release neither bytes nor new financial actions. An earlier A
request cannot act after A->B->A because cursor/request binding differs.

Atomicity covers native cash+records, not HTTP reception. Gateway dishonesty, total
private-content loss after payout and malicious local operator remain trust risks.
No cryptographic attention/comprehension/fair-exchange claim. Finite admission caps
reserve the committed-response storage; no new rights on replay.

## S9. Logical operations, attempts and monotonic recovery

EVERY native effect has an immutable operation, not just funding. Types are Init,
IssueSeries, RegisterUnit, FundMatch,
StartDelivery, FinalizeDelivery, RefundFailure, TimeoutRefund, ExpireUnused.
Operation IDs derive from domain+type+stable authorization/unit/request identity
as defined in WIRE_V2. An operation has at most ONE signed transaction attempt in
this acceptance. Fresh-signature/blockhash replacement is DISABLED. Exact-byte
rebroadcast while valid is permitted only after explicit reconciliation. Expired
unresolved attempts remain quarantined; absence/pruned history never proves failure.
This deliberately sacrifices automatic liveness to avoid unproven replacement.

States: Reserved -> Prepared -> Signed -> Submitted/Unknown -> ResolvedSuccess /
ResolvedFailure / Quarantined. NeverSignedAbort is allowed only under exclusive
writer transaction with no signed-attempt row. Signed bytes/signature/blockhash/
lastValidBlockHeight, intent hash, expected accounts and fee/rent holds are durably persisted
BEFORE send. Signature generation itself is local while holding the
short exclusive writer transaction; no worker may keep unrecorded signed bytes. Any
potentially signed uncertainty is treated as Signed/Unknown, never unsigned timeout.

Each observation includes finalized contextSlot, exact account bytes/hashes,
transaction status if available and expected program/market identity. Critical
Unit+Match+wallet/nullifier observations use one getMultipleAccounts context,
with minContextSlot at least the operation watermark. Public views may lag, but
cannot authorize signing. Monotonic compare-and-set reducer rejects older contexts,
never regresses cursor or terminal state, and quarantines conflicting same-context
or mutually incompatible terminal observations. A mere later HTTP arrival does not
win. Reads alone never sign or mutate economic state.

| Original operation | Sufficient finalized program evidence, including later states |
| --- | --- |
| Trade | Exact immutable receipt plus both OrderUses proves PrimaryEscrowed/PrimarySettled/PrimaryRefunded or SecondarySettled; later Unit ownership does not erase the original effect |
| Cancellation | Offchain-only atomic order transition if no signed attempt; known native OrderUse means Filled and cannot be locally cancelled |
| StartDelivery | Exact lock record/request/cursor proves start; matching terminal request proves start also occurred, without regressing Unit to Locked |
| FinalizeDelivery | Unit Consumed with exact request/response/terminalOp hash and the linked primary Match settled |
| Failure/timeout refund | Unit Refunded and the linked primary Match refunded; exact terminalOp identifies which action won; a sibling refund is SupersededByRefund, not fabricated execution of this attempt |
| Expiry | Unit Expired and primary Match settled; another terminal state supersedes/rejects the requested action rather than rewinding it |
| Registration | Exact immutable account/authority/terms and counters; absence is not proof of failed signed registration |

A finalized failed attempt is known failure only if exact program evidence does not
prove its economic effect already occurred. With one attempt, success/failure
contradiction implies continuity failure and quarantine. Record account-state-only
reconciliation distinctly when transaction history/fees cannot be recovered;
principal may be established while full operating fee reservation remains unknown.
Terminal evidence can resolve unknown funding that was later expired/refunded by
another valid caller; the program cannot and does not test backend uncertainty.
No late lock-success observation overrides an already finalized refund.

## S10. Supported restart and explicit recovery non-goals

Support process crash/restart with the SAME intact database, signer files, manifest
and validator ledger. Startup verifies exact loopback/genesis, fixed program/
binary identity, Market and all known unresolved operations before signing. Read the bounded
market's native OrderUse/Match/Unit accounts to reconcile effects missed before a
crash. Unknown principal and fees stay reserved. Observed lower cursor/contradictory
terminal state or missing known finalized account quarantines the run. Native
OrderUse independently prevents one filled nonce buying another unit, even if a
bad caller tries different match IDs; this does not require an onchain book.

One backend service owns the SQLite writer and fixture signer handles. Exclusive
run lock rejects a second live backend. Stale lock after process death requires
explicit operator recovery after verifying recorded PID is absent; never steal a
possibly live lock. SQLite transactions serialize concurrent HTTP requests. This
is not an HA lease/fencing protocol. Sign within the writer transaction, persist
exact signed bytes, commit, then broadcast; a killed pre-commit process cannot
resume broadcasting memory it no longer has. No worker sends uncommitted bytes.

Backup/old-database restoration, copied/reset ledgers with unchanged genesis,
rewriting both sides of history and recovery after loss of private content are
UNSUPPORTED. Do not claim genesis equality detects them or that all lost
cancellations can be reconstructed. No independent anchor service, replicated log,
automated restore or absence-based replacement is built. An intentional restore
requires a new isolated run, preserves old unresolved evidence and does not claim
to recover old obligations. A malicious operator controlling all fixture keys/files
can fabricate local activity and is outside this MVP's guarantee.

A clean process restart must reconcile exact persisted signatures and stronger
current native account states. Null/pruned history remains uncertainty; fresh
signatures are disabled for an unresolved/expired attempt. This is sufficient for
the supported lost-response/current-DB restart demonstration without claiming
production disaster recovery. New run: new nonce/domain/ledger/database/disposable
signers; no user wallet or global CLI configuration is touched.

## S11. Resource and operating bounds

Native run ceilings:16 Series,64 lifetime Units,256 funded Matches,256 signed order/
bid authorizations (revisions count),32 active orders,8 pending funding matches,
16 Campaigns,1024 logical native operations, one signed attempt each,4096 events.
All counts include terminal/history rows; no eviction. Resource raw bytes<=16KiB,
packet<=2KiB, prepared encoded response<=64KiB, authorization<=512bytes, signed
legacy transaction<=1232bytes, stored observation summary<=2KiB, event<=512bytes.
Reject oversized issuance before rights exist. No quote/task free text in public logs.

Each unit admission reserves64KiB permanent response capacity and64KiB for its
remaining bounded native operations/observations/events. Each open order additionally
reserves8KiB for cancellation/receipt; pending Match includes its required unit
budget, not another principal obligation. Recovery slots are deducted from the
1024-operation ceiling at admission, never discovered unavailable after funding.
At most64 units need64*128KiB=8MiB reserved. Explicit metadata/auth/history caps plus
current and reserved private bytes must remain<=12MiB for new ingress;4MiB additional
logical drain headroom is reserved for finite cleanup. No-op expiry cannot use it.
Final implementation must validate actual encoded-row/index overhead against these
conservative bounds before opening native admission.

SQLite every writer: WAL, synchronous=FULL, fullfsync=ON on macOS, foreign_keys=ON,
busy_timeout=5000, max_page_count giving24MiB at observed page size, short readers
(no application read transaction >2seconds), checkpoint after writes. Refuse ingress
when WAL>4MiB; bounded drain may proceed until8MiB, then safely block until reader/
storage health restored. Reserve at least one maximum transaction growth before
writing. Main24+WAL8+logs4+temporary2=38MiB<50MiB total allowance. Track physical
sizes as well as logical promises. No log rotation deleting unresolved evidence;
stop ingress at lifetime/log cap. Disk-full, hardware failure and a malicious external
reader can prevent progress; promise safe retained obligations, not impossible
liveness under exhausted storage. SIGKILL checks do not prove power-loss durability.

Operator native allowance is at most10 LOCAL SOL for fees/rent; principal
fixture funding at most10 LOCAL SOL per issuer/buyer/sponsor key, at most4 trading
keys. Per signed attempt fee reserve<=100000lamports; use local getFeeForMessage
and reject larger. Rent reserves use exact declared account lengths and current
local Rent requirements; recipient wallets retain their independent rent reserve. Unknown
operating outcomes reserve full allowance and block further signing by that operator.
No faucet request is made outside the verified local endpoint/run.

## S12. Feasibility, validation and implementation phases

Read-only evidence: Darwin arm64; cargo/rustc1.94.1 present; no installed Solana CLI,
validator, cargo-build-sbf, Anchor or rustup in inspected paths. Free disk was
149401780KiB; hard minimum40GB. Official Agave4.3.2 arm64 archive is77047814bytes,
SHA2565439bd2a42c9e8b39923377361a14c9267f6ce699308f9255fb71c3017af76fd.
No archive downloaded/installed. Expanded size/SBF platform-tools remain preflight
unknowns, not silently satisfied readiness facts. After GO: verify archive digest,
paths/member sizes, pinned compiler metadata and local CLI help before extraction/
execution; lock package versions/integrities before build. If incompatible or beyond
budget, stop and report. Host Rust compilation does not prove a deployed SBF binary.

Budget after GO: isolated toolchain/cache<=4GiB, builds<=2GiB, validator ledger<=512MiB,
DB/logs<=50MiB, sources/worktrees<=3GiB; verify free-space projection before each
large operation and run only one heavy build/validator. No deleting user caches.
Test-validator must bind literal127.0.0.1 with no public cloning/entrypoint/external
RPC; verify supported flags from pinned help. Client checks exact loopback port,
genesis, market and fixed binary identity before every signing phase; no redirects or
fallback endpoints. Use task-specific CARGO_HOME/RUSTUP_HOME, never overwrite HOME.

Acceptance and negative traces are frozen in ACCEPTANCE_V2.md. Architecture review
is not executed evidence. After parent GO: B1 trading engine; B2 minimal program;
B3 adapter/outbox/delivery monitor; B4 lead integration, actual local-validator
signatures/account deltas, crash/concurrency tests and local commits. Exact worker
assignments and execution ceilings require the named GO; existing Sol builders remain
paused. Existing UI only needs truthful inspection, not a design sprint.

## S13. Reuse and residual risks

Informative ONLY: previous PLAN, CONTRACT, prototype code/tests, old payment adapters,
SDK and external experiment repos. None supplies unspecified normative defaults.
Adopted invariants are explicitly restated here: exact byte/idempotency binding,
transactional reservations, primary-only issuer escrow and immediate secondary settlement, separated funding/payout/refund,
owner-before-private replay, independent sponsor material and unknown quarantine.
Adapt canonical serialization/validation only if it conforms to WIRE_V2; existing
numeric/expiry/priority semantics are not silently inherited.

Reference source hashes recorded for provenance, not normative authority:
core.mjs1d4634d38903f67a48638a98f732011bc3ae1ebccc017187ed1fc7cf7bdfcb92;
exchange/index.mjs b4f40caba8b8e1bed7397e82a743e1b1f1aa16b96615f81a13cb7287efcb6c00;
publisher-sdk/index.mjs b66ed6cfd01ee515bc4d52478ebb166f65d5f74bf3ec494d06982345dcbaa328.
These were observed during preparation; no unverified hash claims are native proof.

Previous publisher402/WebMCP work informs beneficiary/version/packet binding and
negative assessment, not a native trading program. Exact-span checks never proved
comprehension; genuine quotes could accompany false claims. Existing paid-run caps
do not authorize another run. Cloudflare integration and commercial issuer demand
remain unproven. Legacy funded state, private keys and corpora are not imported.

Residuals requiring explicit parent acceptance: trusted matcher fairness/censorship;
fixture operator custody and same-host role impersonation; trusted gateway truthful
preparation/durability; no production Sybil resistance; bounded local lifetime and
permanent receipt storage; no automatic expired-attempt replacement; same-current-database process recovery only, no backup/ledger-restore guarantee; native SOL
only; real implementation, runtime rent and performance remain untested. No unresolved
High is waived by this residual list; independent round2 must verify the actual rules.
