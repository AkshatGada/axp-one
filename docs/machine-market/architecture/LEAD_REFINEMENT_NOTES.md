# Lead refinement notes — not a frozen audit input

26 October 2026. These are independently identified questions/possible resolutions
for the next revision. SPEC_V1 remains unchanged. Do not circulate these to round-one
reviewers before their independent submissions. No implementation or test execution.

## Candidate precise decisions for v2

- Native economic deadlines should use one authority: Solana Clock.slot. Separate
  auction bidding cutoff from the later funding-authorization deadline; otherwise
  an auction-winning bid expires exactly when it must fund. Backend admits/matches
  against a recent finalized slot; the program performs the final slot check.
  Wall-clock timestamps are display/audit metadata only. Specify stale-clock refusal.
- Price-time priority should be tied to the current price's admission sequence.
  Auction bid increases retaining an earlier tiny bid's time is a declared policy
  in the reference prototype, but gives a head-start at the eventual equal price.
  Consider resetting priority on an increase in the native mechanism, leaving
  exact retries unchanged. Explain the change rather than silently copy semantics.
- Resource series equality does not imply identical remaining resale rights.
  Signed demand should declare minimum remaining transfers AFTER fill. Dynamic
  unit eligibility must satisfy it, as well as series/expiry/policy equality.
  Sponsor-funded nontransferable units never enter the secondary book.
- Program effect uniqueness needs both a stable Match PDA and a Unit cursor;
  different match IDs alone cannot bypass expected unit version. Backend budget
  reservations still prevent unauthorized aggregate signer admission.
- Exact instruction bytes and onchain account layouts must be included in the
  final audit target, not left as an implementation-time choice. Detached orders
  are verified by backend; transaction signatures approve exact matches. Explicitly
  state which prechecks are trusted matcher assertions and which are native checks.
- Transaction-size feasibility can be proved analytically before build, then
  verified with actual serialization after GO. Do not assume docs' newer transaction
  formats are enabled in the pinned validator: use conservative legacy1232bytes.
  Terminal instruction requires one gateway fee-payer signer; config+series+unit+
  four match accounts+up to four recipients+collector+program is about14keys.
  Refund path needs payer recipients, payout path seller recipients, not both lists.
  With bounded data, this appears comfortably below1232, but exact metas/layout
  and alias handling must be enumerated in the frozen contract.
- Account alias rules must allow repeated legitimate recipients across resale hops,
  payer==beneficiary for direct funding, and gateway==transaction fee payer. Reject
  any user wallet equaling a state/escrow PDA, foreign PDA aliases, seller==buyer
  self-trade and unapproved fee-sink aliases. Aggregate repeated wallet credits
  safely before mutating lamport borrows.
- Full-gross escrow keeps old payers' refund claims; resale does not transfer those
  historical claims. Success produces each recorded seller's proceeds. Fees and
  account rent must remain distinct. Tombstones retain rent and prevent replay.
- Native FundMatch after buyer or seller order expiry must reject. A known native
  funding failure does not reactivate a stale signature/order automatically;
  require explicit re-admission or a previously specified still-live remainder.
- Disable re-signing after uncertain/expired attempts in first native acceptance
  unless the audit establishes a complete safe policy. Exact-byte resend plus
  receipt reconciliation and fail-closed hold is simpler than generic replacement.
  This bounds functionality but avoids negative-proof claims from pruned history.
- Gateway response preparation must use full SQLite durability and retain exact
  bytes before locking, not merely a resource URL/hash. Finalization pays for a
  durable retrievable response, not proof that an HTTP consumer received it.
  Availability risk after gateway disk loss remains explicitly trusted-service risk.
- Gateway lease should not permit a funded right with an already admitted delivery
  complaint to expire into seller payout. Define the linearization point and what
  happens if gateway is unavailable before it can co-sign BeginDelivery.
- Reserved recovery capacity needs a concrete bound on pending orders/attempts/
  deliveries and remaining ledger/WAL writes. Logical bytes alone cannot bound
  physical SQLite/WAL or validator log growth. Separate ingress and drain budgets.

## Candidate wire-contract outline

All numeric monetary/cursor/count fields use little-endian checked unsigned integers;
slot fields use u64; hashes and public keys are exactly32bytes; booleans exactly0/1;
no floats, varint ambiguities or unbounded strings onchain. Discriminator/version
must be checked before decoding. Exact final offsets, instruction tags and account
meta order still need frozen tables. Any trailing bytes reject. Order-signature
encoding should be deterministic length-prefixed bytes, with a fixed domain string
and no JSON/string-normalization ambiguity. Persist exact authorization bytes.

Native fixture mode uses local lamports and a separate database/run manifest;
reference microcredit state is never migrated or relabeled. No global Solana CLI
configuration or existing key material is read. Program/source/binary/genesis/run
identities bind all observed evidence. No new tools installed during this review.
