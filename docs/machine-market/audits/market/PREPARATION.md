# Market instruments, matching and incentives — preparation

Prepared 26 October 2026. **Ready for the frozen spec; no architecture verdict.**

## Scope and gate

Independent market-domain review only. The forthcoming backend-first specification
must arrive with the same exact path, version and SHA256 supplied to all three
reviewers. Verify that identity before round 1; do not silently follow later edits.
Existing NORTH_STAR.md, PLAN.md, CONTRACT.md and SQLite code are background,
potentially superseded, and neither authoritative Solana settlement nor proof of
architecture correctness. No other reviewers' reports or conclusions were read.

Implementation remains gated until multiple audit rounds resolve critical/high
issues and rights/settlement ambiguities, and the root parent explicitly issues
GO on the full packet. This reviewer cannot authorize implementation. Eventual
demonstration is localhost validator only. Rights, matching, reasoning and private
content may remain offchain; no presumption that every right needs a token.

Preparation used local source reads and public primary-source documents only.
No installs, builds, test execution, feature edits, credentials, RPC, transactions,
push, deployment, agents or messages to other chats. Only this assigned document
was written. Repository commands explicitly used the assigned worktree; the
initial project cwd remains unchanged. Observed available disk: 142 GiB, above
both the requested 40 GB floor and repository 50 GiB large-output guidance.

## Background inspected, not adopted as the frozen design

- Root/worktree AGENTS.md; README.md; pages.md; review/verification guides;
  docs/ARCHITECTURE.md; machine-market CONTRACT, STATUS, NORTH_STAR and PLAN.
- `packages/exchange/index.mjs:89-125`: existing placement auction uses integer
  first-price bids, campaign-ID ties, reserved awards and separately accepted
  signed delivery receipts. This is request-specific placement inventory.
- `packages/machine-market/core.mjs:144-204`: prototype holds every primary/resale
  gross consideration, then pays each seller on delivery/ordinary expiry or
  refunds each original payer on issuer failure; activation changes ownership.
- `core.mjs:257-269,343-352`: prototype auction is one unit, first price,
  amount/first-bid-sequence/actor ordering; increasing a bid retains its sequence.
- `core.mjs:299-333,356-370`: versioned secondary asks, direct self-purchase denial,
  sponsor consent and assessment fields; funding eligibility does not require a
  positive assessment. These are source observations, not executed verification.

## Frozen-spec review checklist

| Area | Required specification/evidence | Adversarial case to resolve |
| --- | --- | --- |
| Instrument and issuer | Named obligor; exact unit, beneficiary, resource/version/hash or service scope; capacity, expiry, delivery/retry promise; transfer permission and failure/refund policy | Publisher issues two overlapping series against one capacity pool, or changes bytes after issuance |
| Compatibility | Exact market key and substitutability rules: issuer, rights, service window, unit size, remaining uses/transfers, refund terms, quote mint/decimals/network | Two rights with the same content hash but different expiry or remaining transfer count cross as if equivalent |
| Primary versus secondary | Primary issuance consumes authorized supply; resale transfers an existing unconsumed obligation; historical proceeds/refunds remain attributable | Seller lists one right on two paths while its owner redeems; resale accidentally mints another right |
| Mechanism choice | Workload-based comparison of posted price/RFQ, single-unit auction, continuous book and periodic batch; explicit scope for placement versus access inventory | Sparse heterogeneous reports are pooled into a liquid-looking book without a fungible instrument |
| Price and priority | Integer tick/lot sizes, price formation, fee rounding, eligible-order filtering, arrival sequence, deterministic ties, replace rules and explicit no-fill | Early minimal bid is increased at the deadline to jump an equal-price later bidder; user-chosen IDs bias ties |
| Fills and cancellation | Indivisible units or exact partial-fill accounting, residual quantity, time-in-force, deadline clock, cancel/replace linearization and pending-fill behavior | Cancel acknowledgement releases funds while a previously matched fill later settles; remaining quantity fills twice |
| Authorization | Canonical signed/authenticated order binds actor/delegate, market, side, price/quantity caps, fees, beneficiary, nonce, expiry and deployment/domain | Valid signature replays on another market/validator deployment, or changed recipient receives a valid-price fill |
| Reservation and solvency | One authority per obligation; cross-market inventory and funds reservations; distinction between spendable funds, escrow and promised budget; fee/rent payer | Two books reserve the same balance; sponsor advertises several budgets backed by one wallet; uncertain transaction is treated as failed |
| Settlement binding | Immutable match/fill identity binds both orders, exact terms, amounts, parties and settlement intent; settlement status separate from delivery status | Chain payment confirms after local cancellation; backend grants ownership before payment finality or after duplicate recovery |
| Delivery and refunds | Explicit authority for delivery/failure decisions; evidence and deadlines; payout and refund exclusivity; ordinary expiry versus issuer outage | Publisher withholds until expiry to earn proceeds; buyer obtains bytes then denies receipt to demand refund |
| Manipulation | Self-trade policy and its identity scope; alias/collusion limitations; bid visibility, shill bidding, order spam and reservation exhaustion | One controller uses two actors to wash-trade, drain subsidy or fabricate price/volume evidence |
| Sponsor independence | Source/resource selection, disclosed packet, consent, payer/beneficiary separation and nontransferability where promised; no favorable-answer condition | Negative assessment loses funding, sponsor packet changes after consent, or subsidized access is resold through an alternate path |

A complete instrument must state what the issuer can actually enforce. Selling
access does not erase already obtained information, convey copyright automatically,
or prove attention, comprehension or endorsement. An offchain gateway is a trust
boundary even when consideration settles on Solana.

## Alternatives and economic questions to carry into round 1

1. **Posted prices/RFQ** fit differentiated resources and simple explicit consent;
   they provide less endogenous price discovery. **Per-opportunity auctions** fit
   expiring, nontransferable placements; sealed versus visible bidding changes
   information leakage and last-moment strategy. **Continuous price-time books**
   need compatible units and clear sequencing; they add replacement/cancellation
   races and favor fast arrival. **Periodic batches** can reduce arrival-speed
   advantage but add latency and clearing/tie complexity. No choice is prescribed.
2. Distinguish matching price from settlement and service performance. Escrow
   funding may execute a matched obligation without yet paying seller proceeds;
   the frozen spec must name these events rather than calling all of them final.
3. Full gross escrow per resale can cover full-chain refunds, but locks capital
   proportional to turnover. For prices 100 -> 150 -> 80, gross escrow is 330;
   refund recipients are the three original payers. Immediate seller payout needs
   another explicit source of refund collateral or narrower buyer recourse.
   Evaluate liability semantics before optimizing escrow or netting flows.
4. Selling the original payer's refund claim along with a right is a different
   instrument from preserving every payer's refund claim. State which transfers.
   Supply conservation must distinguish never-issued capacity, pending issuance,
   active rights, consumed/expired rights and any permitted replacement issuance.
5. Refunds, cancellations and failed grants need explicit budget semantics:
   a campaign cap is not automatically prefunded cash, and returning cash need
   not restore campaign allowance. Unknown outcomes retain their obligations.
6. A trusted publisher/gateway or adjudicator can resolve service disputes, but
   that trust must be named. Hashes and chain atomicity do not make offchain
   delivery atomic with money or prevent retention of retrieved content.

## Public primary-source reference map

Checked 26 October 2026; these are comparison references, not AXP requirements.
Pin the relevant source version during the frozen-spec audit if relied upon.

- [Coinbase Exchange matching engine](https://docs.cdp.coinbase.com/exchange/concepts/matching-engine):
  documented continuous price-time matching, resting-order execution price,
  partial-order lifecycle and alternative self-trade-prevention actions. Useful
  for making priority/price/STP choices explicit; it does not establish that
  machine-access instruments are fungible or that one-user checks stop aliases.
- [IAB Tech Lab OpenRTB 2.6](https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md),
  sections 3.2.1, 3.2.12 and 4.2.3: auction type, direct-deal price and distinct
  win/billing notices. Supports separating an advertising auction win from a
  billable event. CPM conventions must not silently become a price per access
  right. This advertising protocol does not grant secondary access rights.
- [Solana transactions](https://solana.com/docs/core/transactions): transaction
  instructions execute atomically and failure still incurs fees. This constrains
  onchain settlement design; it does not extend atomicity to SQLite, gateways or
  private delivery. This review performed no chain/RPC validation.

## Submission and closure criteria

Round 1 report will identify the frozen artifact path/version/SHA256 and scope;
for each finding give severity, exact spec/code/reference evidence, a concrete
adversarial trace, alternatives/tradeoffs, remediation and residual risks. Rank
loss, unauthorized obligations and invalid rights above cosmetic omissions. State
whether an uncertainty is an actual specified defect or missing information.
Give an explicit review verdict with limitations, never a security guarantee or
implementation GO. Save the full report only in this assigned domain directory.

Round 2 will inspect the revised frozen artifact, original findings and shared
dispositions. For each closure require an actual changed rule and a worked
boundary/failure trace; check instrument -> order -> reservation -> match ->
settlement -> transfer/delivery/refund consistency across layers. Documentation
claims or future tests alone do not prove implementation correctness. Reopen
contradictions or unresolved critical/high issues; root retains the GO decision.

**Pending input:** exact frozen spec path, version and SHA256. No verdict issued.
