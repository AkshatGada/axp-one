# AXP backend and Solana settlement — specification v1

Frozen review candidate, 26 October 2026. Status: NOT approved for implementation.
This document is the shared input for independent round-one architecture audits.
It supersedes the initial SQLite-only completion target; it does not rewrite
that implementation or its observed local test results as chain evidence.

## 1. Objective, authority and execution gate

“Google built AdSense for the web. We are building the advertising market for AI.”
The immediate engineering objective is a functioning trading backend whose matched
access trades are escrowed and finally settled by a real Solana program on a
localhost validator. Deterministic matching, order lifecycle, authorization,
solvency and recovery are the focus. Keep the existing interface usable and minimal.
Catalog, private content, reasoning, order book and matching may remain offchain.
Do not turn this into a generalized tokenization platform or move arbitrary data
onchain merely to describe the product as onchain.

User gate: all implementation workers are paused. Until the audits and parent GO,
only planning, read-only research and audit documents may change. No source edits,
installs, program builds, validator execution or further frontend work. After at
least two independent audit rounds, the local lead reconciles findings and presents
a readiness packet. Parent orchestration chat
`01a17200-435b-74c1-9fd0-24a82e3f60ee` must independently inspect it and explicitly
provide GO. Passing reviews alone is insufficient authority to resume.

All future execution is local to this Mac. No external Solana RPC, Devnet/mainnet,
cloud database mutation, hosted deployment, paid model call or push. Local commits
are authorized, but no implementation commit is required during this review gate.
The original frontend checkout and other worktrees remain untouched.

## 2. Present evidence versus proposed implementation

The preserved reference prototype implements durable SQLite primary sales,
first-price auctions, secondary asks, ownership/retrieval checks, per-trade escrow,
full-chain failure refunds, sponsorship, an HTTP gateway and deterministic agent.
Reported final market test checkpoint: 67 passing, no failures/skips. Core subset42;
UI client recovery8; these sets overlap repository totals and must not be summed.
Existing repository baseline814 passed/23 optional skips. Production UI export
completed. Browser inspection observed issuer creation, A purchase/list, B purchase,
old-owner denial, B retrieval, reload and same delivery receipt. None moved SOL.

The new program, native settlement adapter and limit order book below DO NOT exist
yet. Existing Solana/Tempo payment-channel records are separate dated evidence.
No claim of native execution follows from the synthetic prototype's tests.

## 3. Precise instruments and scope

A resource series is an issuer-owned immutable byte sequence or immutable API-result
snapshot identified by content SHA-256, version, format, expiry and supply cap.
A unit is one right to make that exact content retrievable once before expiry,
with replay of the same committed delivery allowed under the original identity.
Units are indivisible. Every order has quantity exactly1; a request for N units must
create N separately authorized orders and units. Partial fills within a unit do not
exist. A unit is not a copyright transfer, attention asset, endorsement, user data,
subscription, claim on future unspecified service or freely fungible token.

Two resource examples remain: a versioned report and a bounded dataset/API result.
The issuer must control the material and expressly opt into resale. Maximum three
secondary transfers, hence maximum four funded trades per unit including primary.
After delivery commitment, the unit is permanently untradeable. Ordinary unused
expiry earns the recorded sellers' proceeds under disclosed terms. Known issuer
failure before delivery commitment unwinds all funded trades. No recycling a
refunded or expired unit into supply; a fresh issuance is a separately signed series.

Sponsored funding uses the same independently selected resource. The sponsor is
the payer, the buyer is the beneficiary, and the acquired unit is nontransferable.
Consent binds exact campaign version, packet hash, unit/series, price, beneficiary
and expiry. Honest negative/insufficient assessments remain valid and do not affect
funding eligibility. Packets remain untrusted data and never change independent
resource bytes. Existing award-bound conversational Sponsored cards remain a
separate product; they are not placed on this resale book.

Native settlement asset for the first executed localhost gate: local-validator
SOL, integer lamports, with faucet-funded disposable fixture accounts. This is
chosen to prove the escrow/settlement lifecycle with the native System Program;
it is not test USDC, PathUSD or a real-money balance. No conversion between the
reference microcredits and lamports. SPL-token settlement is a later independently
specified extension, not an implicit feature. Auditors should challenge whether
this narrow asset scope meets the stated local settlement objective.

Excluded: external publishers, commercial demand claims, mainnet readiness,
production wallet onboarding/custody, bridging, leverage, derivatives, AMMs,
shorting, prediction bets, automatic recurring payments, LLM-controlled signing,
production throughput promises and discretionary frontend redesign.

## 4. Chosen mechanism: hybrid deterministic market

Primary issuer supply supports posted asks and bounded first-price auctions.
Secondary unused units support a price-time limit order book. An issued unit can be
in exactly one availability lane: free inventory, one open ask, one auction, a
reserved match, a delivery lock, or terminal. The same unit cannot simultaneously
back a posted ask and auction. The backend allocates unit IDs deterministically
from series ID plus serial index and persists allocation atomically.

An order contains schema/domain version, orderId, actor public key, client nonce,
side, series compatibility key, optional exact unitId for an ask, unit version,
quantity1, limit price, validUntil and time-in-force. The compatibility key hashes
issuer, resource hash/version, format, original expiry, transfer rules and failure
policy. A bid never silently substitutes another issuer/version or a sponsored
nontransferable right. Orders are immutable after admission; changing price means
cancel and new order, losing time priority. Supported TIF: GTC with explicit expiry,
and IOC. No market orders with an unbounded price. No partial fills.

Price-time ordering: bids by price descending, asks by price ascending; same-price
orders by monotonically committed admission sequence. IDs are a final deterministic
tiebreaker, never wall-clock timestamps. A new crossing bid takes the oldest best
ask at that resting ask's price. A new crossing ask takes the oldest best bid at
that resting bid's price. Execution price is the maker's limit, always within both
limits. One incoming order matches at most one resting order because quantity1.
A non-crossing IOC is cancelled with no native transaction. A crossing self-trade
rejects the incoming order and leaves the resting order intact; it does not create
fees, volume or a priority advantage by silently skipping to a worse counterparty.

Example: asks at100(sequence10) and100(sequence11); bid120 takes sequence10 at100.
If bid120 rests first and ask100 arrives later, execution is120. An order with a
different content hash cannot cross either book regardless of cheaper price.
An already reserved or uncertain unit is absent from executable depth. The public
book distinguishes provisional orders from funded matches and terminal settlement.

First-price auction: issuer reserves one unit and declares floor, bid cap and close
slot/time before bids. Authenticated bidders reserve their maximum chosen amount.
Highest valid amount wins; ties use original bid admission sequence, then actor ID.
Bid increases retain original sequence, decreases are rejected. Close is explicit
after deadline; winning price is the winning bid. Losers release backend reservations.
The winning match uses the same native funding/settlement pipeline as book matches.
If its funding is uncertain, the unit and winner reservation remain frozen. A known
failed winning funding ends that auction as failed; there is no silent fallback
charge to a runner-up. Any new auction is a separate explicit operation.

Rejected alternatives: an AMM needs fungibility and continuous liquidity not present
in one-use versioned rights; a pure auction adds unnecessary delay to posted access;
a pure ask board is not sufficient evidence of competitive limit-order matching;
an entirely onchain book adds scope/cost without improving this bounded matching
experiment. Maker-price execution is chosen over midpoint pricing because it gives
an unambiguous, reproducible rule and does not invent price improvement assumptions.

## 5. Backend records, roles and admission

Proposed durable relational SQLite records (not one indefinitely growing JSON row):
series, units, orders, order_authorizations, reservations, matches, settlement_intents,
signed_attempts, gateway_deliveries, sponsor_campaigns, consent, idempotency and events.
Indexes cover compatibility/side/state/price/sequence and unit/version uniqueness.
All admission, matching and reservation decisions occur inside BEGIN IMMEDIATE.
Network calls never occur while that write transaction is held.

Roles: issuer, buyer, sponsor, matcher, gateway attestor, fee collector, operator.
The local demo service uses disposable fixture keypairs in ignored owner-only state.
A selectable role is a demonstration capability, NOT production authentication.
Neither existing user wallets nor hosted credentials are read. Fixture order
signatures still exercise exact Ed25519 payload/domain verification and wrong-key
rejection. No model receives private keys or can choose an arbitrary signer.

Canonical signed order authorization includes domain(schema, program ID, market ID,
genesis hash), order ID/nonce, actor, side, exact compatibility terms/unit/version,
quantity, limit and expiry. Store exact signed bytes and signature. Verify before
admission; compare canonical bytes rather than loose JSON equivalence. Replay of
same actor/key/payload returns original outcome, changed payload conflicts. Nonce
reuse with different terms is rejected. Cancellation is signed by the same actor
and names the original order/version. Expired signatures cannot admit new orders.

Balance checks use finalized local chain balances minus all active backend
reservations, signed-but-unresolved principal obligations and separate conservative
fee/rent reservations. Reservation is not a charge or final settlement. Before any
funding signature, recalculate affordability under the actor's serialized lock.
External spending by a fixture actor may still cause chain rejection; this is a
known failure, not authority to invent funds. The program independently enforces
actual payment. A sponsored match requires sponsor and beneficiary authorization;
backend campaign consumed/refunded counters remain distinct and refunds do not
replenish campaign allowance.

Once a match is reserved, neither matched order can be cancelled until funding has
a definitive outcome. Cancelling an unmatched order is atomic and releases its
reservation. Failed funding releases exactly that match's holds after evidence;
unknown funding releases nothing. Any unknown signed obligation quarantines that
payer from new spending across the market, not just the same resource. Unmatched
orders of a quarantined payer cannot execute. Safe reads and cancellation of an
unmatched order remain possible. No dependent resale or delivery until confirmed
funding has established the unit cursor.

## 6. Onchain/offchain authority and trust

| Fact | Authority | Explicit limit |
| --- | --- | --- |
| Resource bytes and declared usefulness | Issuer/gateway offchain | Hash binds bytes, not truth, legal rights or quality |
| Series catalog/eligibility/order book/price priority | Signed backend records and deterministic matcher | Program does not recompute best execution or prove fair ordering |
| Finite issued series cap and unit serial validity | Small program Series account | Issuer declaration does not prove real-world exclusive supply |
| Settlement cursor for a unit | Program Unit account | Minimal cursor for conflicting spend prevention, not general token/NFT infrastructure |
| Funded match principal and exact pay/refund recipients | Program Match escrow account | No seller proceeds before terminal payout |
| Delivery-commit/expiry/refund terminal result | Program state and finalized transaction | Gateway attestation is trusted for offchain content availability |
| HTTP delivery and same-key response recovery | Private durable gateway record checked against chain | Cannot prove recipient read/understood bytes |
| Backend settlement projection | Derived from validated program accounts and confirmed execution | SQLite cannot override a conflicting chain outcome |

The issuer and matcher can censor or delay offers; this local MVP does not promise
permissionless fair access. The gateway can lie about having prepared bytes. Its
signature is a trusted service attestation, not cryptographic proof of private
information delivery. Program ownership and escrow guards constrain unauthorized
money movements, duplicate settlement and conflicting unit matches even if a stale
backend worker runs. A compromised authorized fixture signer remains powerful;
production custody and wallet UX are outside the local proof.

## 7. Minimal Solana program account model

Use a native Rust SBF program, avoiding framework requirements unless the audited
contract demonstrates a need. Program ID, binary SHA-256, release/toolchain versions,
market ID and validator genesis hash are recorded in a local run manifest.
No program upgrade or authority change is part of normal market operation.

All state accounts have a discriminator, schema version and exact bounded layout.
Verify owner==program, expected PDA seeds/canonical bump, writable flags, distinct
account roles and exact expected length before processing. Reject account aliasing
that could make an escrow also a payer, seller, collector or another escrow.
User destinations must be the recorded authorized keys; clients cannot substitute
arbitrary account metas. Checked integer arithmetic only; native rent and transaction
fees are kept separate from consideration and platform fees.

- Market PDA: seed market+marketId; immutable matcher, gateway and fee-collector keys,
  fee100bps, maximum resale hops3 and delivery lease duration. Domain hashes include
  genesis and program identity; the adapter separately verifies live genesis.
- Series PDA: market+seriesId; issuer, resource hash, version/terms hash, expiry,
  supply cap, issued count, transferable flag and max transfers. Immutable terms;
  issuer cannot overwrite a sold version. Max64 series/128 units for the local run.
- Unit PDA: market+series+serial; serial<cap; current owner, cursor version,
  transfer count, status, exact ordered array of at most4 match PDAs, delivery
  request hash/deadline and terminal receipt hash. Initially issuer-owned. The
  serial plus Series cap prevents same-unit reissuance under a different match ID.
- Match PDA: market+matchId; unit/version, buy/sell authorization hashes, payer,
  beneficiary, seller, gross, computed fee, terms hash, sponsored flag/packet hash,
  escrow status and terminal disposition. Full gross is held in this PDA in addition
  to its rent reserve. Tombstones remain after payout/refund to prevent reinitializing
  the same ID. No account-close/reopen path in this MVP.

Holding prior trade records is intentionally bounded: one primary plus at most three
resales. No unbounded array or loop. Terminal payout/refund must provide the exact
stored match list and all recorded recipients; missing/reordered/foreign matches
are rejected. Measure the worst-case transaction size/compute before accepting the
contract; do not assume arbitrary account lists fit. Legacy transaction size is
bounded, and instructions within a transaction commit atomically; fees can still
be charged on failed execution. [Solana transactions](https://solana.com/docs/core/transactions)

## 8. Program instructions and monetary invariants

Proposed instruction family; byte offsets and numeric error codes must be frozen
in a follow-on wire-contract artifact before code coupling after GO.

InitializeMarket and IssueSeries require the intended authorities and immutable
terms. RegisterUnit creates only the next valid bounded serial and increments
Series issued count atomically. Registration creates no trade and transfers no
consideration; rent is a separate fixture operating cost.

FundMatch requires payer, beneficiary, current seller/owner and matcher signatures
(deduplicated if roles share a key). It binds both order authorization hashes,
match ID, exact unit cursor/version, gross, recipients, expiry and sponsorship
terms. The program checks price>0, safe upper bound, series validity, unit open,
expected cursor, self-trade rejection and transfer limits. It creates the Match
escrow, moves full gross from the payer using the System Program, appends that match
to the bounded unit chain and advances owner/cursor atomically. Sponsored acquisition
sets the unit nontransferable. A replay with the same match ID must compare every
stored immutable field and required authority, then return its existing result;
a conflicting match ID cannot reuse an earlier unit version. No duplicate debit.

This confirms FUNDED trade escrow and current unit ownership. It is not a payout
to the seller and must not be labeled final settlement. The backend advances to
funded only after finalized account/transaction verification. Calling native
System Program via CPI does not grant additional privileges; required signers and
writable accounts must be explicitly authorized. [Solana CPI](https://solana.com/docs/core/cpi)

BeginDelivery requires current owner and gateway signatures. Gateway first durably
prepares the exact private response in SQLite (including hash, unit, owner, request
key and content bytes), then locks the unit onchain with the request hash and a
bounded deadline, no later than series expiry. Both signatures prevent an arbitrary
caller opening a gateway lease the service never accepted. Locked units cannot
fund another resale. No protected bytes leave the gateway yet.

FinalizeDelivery requires gateway signature and the exact lock/request hash,
content/series binding and deadline. In ONE transaction, each funded Match pays
its stored seller gross-floor(gross/100), pays the immutable collector its fee,
marks the match settled, and marks the unit consumed with terminal receipt hash.
Do not include rent in distributable principal. The gateway releases its prepared
response only after this terminal outcome is finalized and verified. The same
request key can recover the saved exact response until original resource expiry.
No subsequent resale or refund is possible for that consumed unit.

RefundFailure requires gateway signature before delivery commitment, invalidates
the unit and refunds EACH match's full gross to that match's original payer in one
transaction. No platform fee or seller proceeds are earned. TimeoutRefund is a
separate permissionless operation after a confirmed delivery lock's deadline,
allowed only while still locked; it has the same full-chain refund and terminal
invalidation. A racing FinalizeDelivery/TimeoutRefund must have one winning state
transition. A late gateway completion cannot turn a refunded unit into delivered.
The gateway MUST re-read terminal state before releasing bytes.

ExpireUnused is explicit and allowed only for an open, unlocked unit at/after
series expiry. It pays each match's recorded seller/fee just as ordinary agreed
expiry does and makes the unit terminal. It cannot consume an active delivery
lease or release money from an unresolved funding match. Terminal instruction
replays have no repeated effects; incompatible terminal requests reject.

Example: A primary100, B resale150, A resale80 => three gross buckets330.
Success/ordinary expiry distributes99 to issuer,148.5 to first seller and79.2 to
second seller only when amounts are scaled to permit these integer fees; integer
base-unit examples use10000/15000/8000, fees100/150/80. Failure returns10000 to
first payer,15000 to second payer,8000 to third payer. Do not additionally pay
seller proceeds on refund. Neither resale price appreciation nor decline creates
under-collateralized obligations. Counterparty identity may recur across hops,
but each match account is unique and gross can be moved only once.

## 9. Private delivery is not atomically exchangeable with a chain transaction

The atomic guarantee is escrow/payment plus program state transitions. HTTP bytes
and chain execution are different systems. Selected policy is durable preparation,
then onchain terminal commitment, then response release. A lost HTTP response is
recovered from the exact durable private row; it does not initiate a new settlement.
If the gateway loses its durable content after settlement, the program cannot prove
that failure or safely refund without contradicting settled seller balances. This
is an explicit trusted-service/durability risk, not a solved fair-exchange theorem.

Before lock: no bytes, current owner can list or request delivery; a simultaneous
resale and BeginDelivery is resolved by the unit cursor/state. After lock, resale
is forbidden. Crash before terminal commit: recover the same delivery operation,
inspect chain; finalize only while lock valid, otherwise resolve timeout refund.
Crash after terminal commit before HTTP response: reconcile receipt, then release
the same prepared bytes. Unknown terminal outcome: release neither bytes nor new
funding/refunds until chain reconciliation. After refund/expiry, all retrieval
(including cached same-key reads) fails before touching private bytes.

No proof of attention, comprehension, correctness, recommendation or conversion
follows from the delivery receipt. Sponsored material remains separately disclosed.

## 10. Durable settlement outbox and finality

Each matched unit/order pair creates one immutable intent, principal reservation,
fee/rent reservation and outbox row in the same backend transaction. Allowed states:
reserved -> prepared -> signed -> submitted -> unknown OR finalized-success /
finalized-failure / proven-expired-unexecuted. Store exact message bytes, signed
transaction bytes, signature, recent blockhash, last-valid block height, intent
hash and expected account/amount deltas BEFORE broadcast. A lease/fence token
serializes signing and dispatch across worker processes.

Never generate a replacement trade ID, new deposit or fresh signature to hide an
unknown attempt. Recovery inspects the SAME signature and program Match/Unit state.
`getSignatureStatuses` uses `searchTransactionHistory:true`; null is not failure.
Check account owner/PDA/discriminator/terms and finalized commitment, not just HTTP
200 or a signature-shaped string. [Signature status semantics](https://solana.com/docs/rpc/http/getsignaturestatuses)

A successful RPC send is submission only. Funding/payout/refund is accepted only
with verified finalized execution, correct expected program account state and
principal/recipient/fee conservation. A finalized program error is known failure,
but transaction fees may have been consumed; account for them separately.

If signature status is unavailable but the exact immutable receipt is finalized,
reconcile from that controlled program state, retaining the unknown history and
recording the narrower evidence. If neither is known, freeze. Re-signing the SAME
logical intent is possible only after original blockhash validity has ended AND
finalized observations show no matching program effect and no transaction. Preserve
both original and replacement attempts. This is single-local-provider evidence,
not an independent-provider production finality claim. New signatures are never an
automatic response to timeout. Whether this replacement policy is sufficient under
local ledger reset/pruning is a mandatory audit question; conservative blocking is
preferred to duplicate financial effects.

A new worker may resend the exact persisted signed bytes while valid, only after
reconciliation and explicit retry policy; duplicate native submission cannot become
a second escrow. After a database crash or response loss, idempotency returns the
original match/intent/receipt, not a new reservation. A stale worker cannot cancel
or release signed obligations; onchain cursor and Match idempotency constrain it.

No transaction is signed or sent unless endpoint is literal loopback127.0.0.1,
expected port, expected genesis, exact program identity/binary manifest and market
configuration. No redirects, hostnames resolving externally or fallback URLs.
A validator reset changes genesis and MUST quarantine the existing database rather
than reusing prior balances/cursors. [Genesis identity](https://solana.com/docs/rpc/http/getgenesishash)

## 11. Threat and failure matrix

| Attack/failure | Required guard and observable outcome |
| --- | --- |
| Wrong order signer/nonce/domain/expired authorization | Reject admission, zero reservation/transaction |
| Different resource hash/version/issuer on compatible-looking title | No match; exact terms hash required |
| Duplicate command or match with changed terms | Conflict; original result/history preserved |
| Same unit funded by distinct match IDs or concurrent processes | Program cursor/version permits at most one next transfer |
| Cancel races match/sign/send | One committed backend state; signed obligation never released on ambiguity |
| Wrong program-owned account/PDA/bump/owner/discriminator | Reject program execution; no principal movement |
| Seller/payer/collector/escrow alias or substituted destination | Reject before money mutation |
| Overflow, fractional amount, negative price or excessive fee | Checked integer validation on backend and program |
| Payer spends outside backend between admission and funding | Atomic native failure; no ownership advance; fees separate |
| RPC timeout after actual success | Quarantine, inspect same signature/receipt, no replacement debit |
| New genesis or stale SQLite snapshot | Halt signing; explicit recovery/new isolated run, not silent reset |
| Lost response after chain final delivery | Same prepared private response and original receipt recover |
| Crash during delivery lock | Reconcile original lock, finalize if valid or timeout refund, never both |
| Early refund/expiry/timeout or post-consumption resale | Program state/Clock/authority rejection |
| One missing match in multi-hop refund or settlement | Whole transaction rejects; no partial chain payout |
| Fake sponsor consent, changed packet/beneficiary or subsidy resale | Reject; immutable consent and nontransferable cursor |
| Negative assessment | Permitted; same independent resource and truthful disclosure |
| Journal process dies holding lock | No lock stealing from possibly live owner; explicit verified recovery |
| Disk/capacity exhaustion | Reject new ingress before signing; reserved capacity protects finite recovery |
| Local operator edits DB | Chain remains settlement authority; mismatch quarantines, local audit not independent trust |
| Malicious issuer/gateway | Explicit trusted-content/delivery boundary; program does not attest truth |

## 12. Interfaces and implementation seams

Retain reference `createMarket()` unchanged as the synthetic conformance oracle.
New trading engine is mode-explicit, with separate database and no implicit fallback.
Proposed interface: createTradingStore({filename,now,domain}), admitOrder(signedOrder),
cancelOrder(signedCancel), matchBook(compatibilityKey), closeAuction(auctionId),
getSnapshot(actor), getIntent(id), prepareAttempt(intentId,fence), saveSignedAttempt,
markSubmitted, reconcileObservedOutcome, prepareDelivery, close.
All mutators bind idempotency and return stable IDs/status, never keys/private bytes.
Network adapter owns sign/broadcast/observe; core never calls arbitrary RPC.

Settlement adapter: inspectNetwork(), prepareFunding(intent), submitExact(attempt),
observe(attempt), prepareDeliveryLock(), prepareFinalize(), prepareRefund(),
prepareExpiry(). It accepts only frozen typed terms and run fixture signer handles.
It never accepts arbitrary transaction bytes or destination keys from browser/model.
All signer dependencies are explicitly injected; no global Solana CLI wallet config.

HTTP/CLI is the first integration surface. Existing UI remains a minimal reference
inspection surface; future native mode must show local-Solana asset, genesis,
program, exact statuses/signatures and authority source accurately. Do not relabel
existing microcredits or synthetic receipts as onchain. APIs expose book depth,
orders, reservations, matches, native attempts and reconciled receipts separately.
No protected resource content in catalog/audit/errors/public operation projections.

Exact Rust/JS binary layouts, instruction tags, errors, signature domain encoding,
HTTP DTOs and adapter ownership will be frozen after audit corrections and BEFORE
parallel implementation coupling. Any unresolved normative interface ambiguity is
a gate failure, not an invitation for builders to choose inconsistent defaults.

## 13. Required tests and executable acceptance

Matching properties: deterministic replay of the same admitted sequence; price-time
ties and maker-price execution; incompatible terms never cross; exactly one unit
per order; reject partial quantities; self-trade incoming reject; IOC/GTC expiry;
cancel-versus-match races; same-unit oversubscription across two actual processes;
monetary cap/reservation conservation; quarantined payer cannot fund another book.
Auction tests: one reserved final unit remains bid-able; posted price is irrelevant
to bid admission; bounded floor/cap; original tie sequence; loser release; no-fill;
failed/unknown winner behavior; no implicit runner-up broadcast.

Program adversarial tests: bad signer/program/PDA/owner/bump/length; altered match
terms; duplicate ID exact/conflicting; distinct matches same cursor; stale owner;
self-trade; max hops; sponsored transfer prohibition; wrong recipients/fee sink;
checked overflow; fee/rent/principal conservation; failure refund each prior payer;
missing/reordered trade accounts; delivery-lock race, timeout/expiry boundary and
terminal replay; no close/reinitialize duplicate. Test maximum four-hop account/
message size and actual compute consumption rather than estimating away a limit.

Local validator acceptance (mandatory after GO): pinned compiled SBF deployed on
an isolated localhost validator; signed fixture orders; posted/book and auction
matches; actual native escrow deposits; A-to-B cursor advancement; gateway delivery
lock and terminal seller/fee payout; full-chain failure refund at rising/falling
prices; unknown-after-send recovery with same signature; restart with durable
outbox/private response; competing match attempts; unauthorized signers; expiry;
negative-assessment sponsor funding; confirmed accounts/transaction metadata and
wallet balance deltas. Capture program binary/hash, genesis, all relevant signatures,
slots, fees, rent, expected and observed deltas in sanitized evidence. Never include
private signers. Program-test or mocked RPC alone does not pass this gate.

Inject response loss AFTER real local RPC execution to distinguish unknown transport
from failed program logic. Include process SIGKILL between persisted signed bytes
and broadcast, after send/before checkpoint, and after terminal chain commit/before
HTTP response. Recovery must use original obligation; no fabricated success after
resetting validator/database. Repeated tests use fresh explicitly named local runs,
not silently erase failing/unknown cases. Preserve failed attempts in evidence.

Performance acceptance is local algorithm evidence only: fixed seed/fixture set of
1,000 admit/cancel/match operations over at most64 units, three serial repetitions;
record p50/p95 and memory/DB growth. Target p95<=50ms for local admission/matching
EXCLUDING RPC/signing, and zero invariant violations. Report misses instead of
changing the target after measurement. Validator latency is separately measured,
not advertised as production throughput. No provider/API paid benchmark.

## 14. Toolchain feasibility and disk controls

Read-only checks26October: Darwin arm64, Homebrew cargo/rustc1.94.1 available.
No solana CLI, test-validator, cargo-build-sbf, Anchor, rustup or Surfpool in PATH
or standard inspected install locations. Current free volume149,401,780KiB
(~142.5GiB). Hard floor40GB remains mandatory. No Solana archive downloaded or
installed. Release metadata alone has been fetched.

Official Agave v4.3.2 is non-prerelease, published15October2026. Native arm64 archive
`solana-release-aarch64-apple-darwin.tar.bz2` size77,047,814bytes, release API digest
`5439bd2a42c9e8b39923377361a14c9267f6ce699308f9255fb71c3017af76fd` SHA-256.
[Official release](https://github.com/anza-xyz/agave/releases/tag/v4.3.2).
Expanded size and transitive SBF platform-tools version/size are NOT yet known.
After GO only: download pinned official archive, verify digest, inspect archive
paths/member sizes before extraction, then inspect CLI help/version. Pin SBF tools
and Cargo.lock before compilation; no unconstrained curl-pipe-shell or global config.

Proposed task disk allowance after approval: <=4GiB isolated toolchain/cargo cache,
<=2GiB build outputs, <=512MiB validator ledger, <=50MiB market DB/logs, existing
source/worktrees within3GiB. Verify combined projections and free space before each
large step; if tools exceed assessed allowance, stop and update feasibility rather
than delete user caches or proceed silently. One heavy build/validator at a time.
Task-specific ignored directories and explicit CARGO_HOME/RUSTUP_HOME where needed;
never repurpose HOME/CODEX_HOME or read existing wallet configs.

Run test-validator with explicit loopback bindings, bounded ledger/log retention,
no account cloning/public cluster RPC/entrypoint. Verify actual supported flags
from pinned binary help rather than guess. Record run-specific genesis allowlist.
Solana test-validator is a full single-node local cluster and exposes bounded
ledger retention. [Agave validator documentation](https://docs.anza.xyz/cli/examples/test-validator/).
The SBF build must actually produce a deployable program; host Rust success alone
is not enough. [Program build/deploy documentation](https://solana.com/docs/programs/deploying).
Default Surfpool behavior that loads public dependencies is not acceptable here.

## 15. Reuse and prior lessons

Reuse review remains in PLAN.md's matrix. Existing contracts canonicalization,
integer guards, SQLite transactional admission and exact idempotency are foundations.
Existing publisher SDK and native payment adapters provide patterns for immutable
attempts, response recovery and unknown-outcome quarantine, not a ready transferable
settlement program. Reference core tests are a conformance oracle for bounded gross
escrow/full-chain refunds. Prior publisher402/WebMCP protocol informs exact resource/
beneficiary/packet binding and independent outputs; its paid runs are historical
and authorize no new network activity. Prior sponsor selector was policy, not auction.

Do not reintroduce sampled examination as proof of attention. Genuine quotes did
not establish entailment in prior constructed cases. Negative assessments must
remain compatible with funding. MCP/WebMCP/HTTP transports are distinct; this phase
proves backend/settlement and makes no native-agent integration claim without a
separate observed run. Cloudflare gateway/routing and commercial issuer demand remain
unproven. Other repositories remain read-only; no secrets, funded state or corpora
are copied. Existing design is sufficient for inspection; no design sprint.

## 16. Phases after the audit and parent GO gate

B0 architecture: freeze versions, three independent Astra domain audits, reconcile,
second round verify changes/cross-layer invariants, prepare parent readiness packet.
B1 core Sol builder: relational trading engine/order signatures/price-time matching,
auctions and adversarial reservation tests against frozen contract.
B2 reassigned Sol builder: minimal native escrow/cursor program and program tests;
no generalized NFT platform. Lead controls serial toolchain/build/validator execution.
B3 transport Sol builder: outbox, signing adapter, genesis guards, reconciliation,
private delivery handshake and real-local-RPC integration.
B4 lead: independent multi-process/crash tests, actual validator acceptance, minimal
existing UI evidence only as necessary, measured limits and scoped local commits.
No code assignment starts just because this plan was written.

## 17. Architecture acceptance criteria and unresolved v1 items

Architecture gate requires: exact instrument and compatibility; explicit price/time
rules; no unresolved economic/rights/settlement ambiguity; complete authority and
failure matrix; bounded accounts/transaction model; durable signed-attempt recovery;
solvent multi-hop refunds; delivery trust boundary; feasible pinned toolchain/disk;
concrete adversarial/property/validator test plan; at least two independent review
rounds; zero open critical/high findings; documented disposition of every medium;
parent's explicit GO. Tests described here are planned, not passed native evidence.

Known v1 questions for reviewers (not implementation authority):
1. Are four-trade atomic terminal transactions feasible within chosen legacy message
   and compute limits with worst-case distinct recipients and signatures?
2. Is the trusted gateway lease/timeout model economically acceptable and complete,
   including ordinary expiry before/after a lock and durable-response loss?
3. Are matcher/seller/buyer/payer signatures and cursor sufficient to prevent a
   different-match double charge without requiring an onchain order book?
4. Does the proposed replacement-after-proven-expiry policy need to remain entirely
   disabled for the first local acceptance to avoid ambiguous history/reset cases?
5. What exact wire-contract details must be fixed in v2 before any builder coupling?
6. Are native local SOL and the minimal cursor sufficient for the backend settlement
   proof without implying USDC support or a public mainnet marketplace?

Reviewers must supply concrete counterexamples, severity, evidence, rejected
alternatives, remediation and residual risks. No reviewer may declare completion
from conceptual plausibility or historical fixture counts. A new critical/high
finding in round2 requires another revision/review, not majority voting it away.
