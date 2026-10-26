# V2 planning phase handoff — v2-review-2026-10-26-02

26 October 2026. Planning is complete FOR INDEPENDENT REVIEW. This is not an
architecture approval, implementation GO or native execution result. All builders
remain paused. No Goal controls, implementation, tests/builds, installs, public RPC,
reviewer dispatch, push or deployment were used in this planning phase.

## Selected decisions and rationale

- One deterministic price-time limit book, quantity one, maker-price execution,
  IOC/GTC and explicit cancellation. Primary/secondary are typed lanes of the same
  mechanism; native auctions are deferred. This provides competitive matching
  without a second lifecycle or claims of liquidity, optimal pricing or demand.
- Primary gross P stays in issuer escrow. Secondary gross Q atomically pays seller
  Q-floor(Q/100) and collector floor(Q/100), with owner/cursor and refund-claim transfer.
  Secondary receipts hold rent, not consideration. They never become refundable
  merely because issuer delivery later fails.
- The current ordinary holder owns the ONE original-P claim, not insurance of Q.
  Primary success/unused expiry pays issuer P-floor(P/100) and primary fee; admitted
  failure/timeout refunds P to the current locked holder. Sponsored rights cannot
  transfer and refund sponsor. Premium loss and discount gain are explicit.
- Exact secondary claim face and minimum remaining transfers are signed compatibility
  constraints. Same Series alone does not make different claims interchangeable.
- Owner-only native delivery admission precedes readiness assessment and blocks
  ordinary expiry while locked. A missed lease permits an explicit timeout refund.
  A committed response remains recoverable after useBy within this bounded run.
- Primary-only escrow is selected over the old full-gross contingent model: it makes
  secondary proceeds immediately spendable and keeps only P collateralized. It
  intentionally removes the old all-payer/refundable-premium promise. The rejected
  combination of immediate proceeds and full-price refunds has no collateral backing.

For P10000 and secondary prices15000/8000, secondary sellers receive22770 and the
collector230; only10000 remains in escrow. Success adds issuer9900 and fee100;
failure instead refunds current holder10000. Historical proceeds/fees remain final.
The packet contains the recurring-owner vector and exact per-key accounting.

## Supported scope and explicit deferrals

Backend-first research MVP, minimal usable inspection UI/CLI, one local writer,
concurrent HTTP requests, disposable fixture signers, same intact database/ledger
through process restart, and actual settlement on an isolated localhost validator.
Native asset is local SOL, never USDC/PathUSD/microcredits. Native records enforce
finite issuance, current Unit cursor, one filled order per nonce, exact settlement
and single primary claim disposition. Matcher fairness and gateway content/durability
remain explicit trust assumptions.

Deferred: native auctions; HA/multiple writers; arbitrary backup/ledger restore;
malicious operator; production custody or Sybil resistance; external wallet-drain
repair; automatic rent top-ups; live upgrades; SPL/public-network operation; enterprise
archives/disaster recovery. These are not silently promoted into readiness guarantees.
Hard disk floor40GB; declared tool/build/ledger/DB caps remain in S11/S12. Observed
free space at phase start was149164364KiB (about142.3GiB), not a future guarantee.

## Reuse, adapt and new boundaries

| Existing source | Treatment |
| --- | --- |
| packages/contracts/index.mjs | Reuse compatible pure validation/hash utilities; signed orders must follow the NEW fixed binary WIRE contract, not inherit old JSON defaults. |
| packages/exchange/index.mjs | Adapt transactional reservations/idempotency and deterministic decision patterns. Existing placement auction is not the selected native book. |
| packages/machine-market/core.mjs and tests | Informative reference for ownership, budgets, replay and negative scenarios. Its full-chain refund policy is economically incompatible and must NOT be reused as the native settlement oracle. |
| packages/publisher-sdk/index.mjs | Adapt bounded transport and saved-result recovery concepts; old award/creative schemas are not access-right authorizations. |
| packages/payments/native-store.mjs and network-adapter.mjs | Adapt persisted signed-attempt and uncertainty principles; do not instantiate legacy external-network defaults, credentials or funded state. |
| Prior publisher402/WebMCP work | Informative beneficiary/version/packet binding and independent outputs; historical tests/payments are not new native evidence or authority for another run. |
| Existing product UI | Retain usable inspection and honest synthetic labels. Native evidence must have distinct local-SOL/genesis/program/status fields; no redesign sprint. |
| New native phase | Relational limit book and exact authorizations; OrderUse/Unit/primary escrow and immediate secondary receipts; local adapter/outbox; gateway delivery integration. All remain unimplemented and gated. |

## Interfaces and essential proof obligations

WIRE W1-W6 fixes domain/IDs, signed fields, PDA layouts, signer/writable roles,
primary versus secondary effects, replay precedence, API/store/adapter seams and
conservative message sizes. A primary Match is escrow; a secondary Match is an
immediately settled receipt. OrderUse is filled-order uniqueness, not an onchain book.
Cancellation of an unmatched order differs from aborting BOTH legs of a reserved,
provably never-signed match; Signed/Unknown cannot release holds.

Acceptance T0-T9 supplies a finite shared matrix: matching priority/eligibility,
canonical authorization, no overselling/duplicate fills, campaign cap/consent,
slot boundaries, delivery/expiry/refund precedence, actual native cash/claim deltas,
current-run crash/reconciliation, and bounded storage/message feasibility. No
21-fold duplicate test program. Planned local demo starts8Units, at most24 successful
trades and128 signed operations under explicit local funding caps. Root GO is needed
before any of that execution. Optional algorithm latency measurement is informative,
not a production SLO or public-network scale claim.

## Disposition coverage and remaining issues

All21 original IDs and severities are retained:7 High,13 Medium,1 Low. Nineteen rows
contain essential A obligations (some also separate B/C portions); MKT-006 is C because
native auctions are unsupported, and MKT-008 is B documentation closure. All are
PROPOSED resolutions/boundaries, not independent closures. A supported-flow bug
cannot be deferred as production hardening.

No fundamental economic contradiction or additional unresolved semantic A decision
was identified in this phase's static reconciliation. This is the author's finding,
NOT an independent verdict: reviewers must challenge actual byte layouts, claim/
recipient bindings, signer authority, cancellation/recovery and accepted scope. All
original High findings still require independent Round Two disposition verification.

Unexecuted validation is distinct: actual SBF compilation/loading; toolchain expanded
size/compatibility; runtime rent behavior; binary codec parity; transaction size/CU;
physical SQLite overhead and actual crash/concurrency behavior; local-validator
signatures, finality, cash/fee/rent deltas and response recovery. None has passed for
this native model. Incompatibility or a new A defect stops implementation progress
under the future approved phase; it is not permission for an unreviewed workaround.

## Delta from preserved packet01

Packet01 manifest SHA256:4bbc565da014b122a526ff36f0b7c5cf939151047a1720e9b1e186c031c0cc70. Its manifest and all five source bytes remain
unchanged. Packet02 is a new snapshot with the SAME economics and mechanism:
1. Corrected remaining present-tense wording so native checks are future obligations.
2. Clarified explicit TimeoutRefund rather than implying automatic timed payment.
3. Distinguished unmatched cancellation from reserved NeverSignedAbort, aligned
   signed-message/API/store wording and the concurrency acceptance case.
4. Clarified principal/market-fee idempotence versus separately incurred network fees.
5. Updated planning-stage footer and MKT-002 closure language to review-candidate status.
Previously accepted seller-writable, direct-owner signer/fee exception and byte-sum
corrections1089/574 remain preserved. No economic redesign or production expansion.

## Exact review packet and next step

This directory's MANIFEST_V2.json binds the five normative documents and this handoff.
Review these snapshot paths, not the older root-level drafting files. Any subsequent
normative change requires another version; never overwrite this snapshot.

- `docs/machine-market/architecture/review-packets/v2-review-2026-10-26-02/SELECTED_MODEL_V2.md`
  SHA-256 `8b72ef534b6497c13ae1f00a75c1669a64286670e6a85eb1de853b5337d8ee3e`
- `docs/machine-market/architecture/review-packets/v2-review-2026-10-26-02/SPEC_V2.md`
  SHA-256 `b84eda45894000d16ec2f126a1885778165a2ac88dc1bb5fda599978f2b60c5b`
- `docs/machine-market/architecture/review-packets/v2-review-2026-10-26-02/WIRE_V2.md`
  SHA-256 `d59f60ee963942e471e19c00ca37ad6b30f249be74ebf22127bf5e5828d80850`
- `docs/machine-market/architecture/review-packets/v2-review-2026-10-26-02/ACCEPTANCE_V2.md`
  SHA-256 `af2a68f92c1608076fac3051566252bc7720e1b247dcbe729a5911b9fd4bd512`
- `docs/machine-market/architecture/review-packets/v2-review-2026-10-26-02/AUDIT_DISPOSITIONS.md`
  SHA-256 `40143228908a108905d98d57fa291111d7bb5200478eac04f7ab35762d6026d9`

Coordinator may separately authorize the existing three local Astra High reviewers
to inspect the same packet/hash, original Round One reports and dispositions. This
phase does not dispatch them. They should evaluate the selected economics and scope,
verify each proposed closure and report new concrete A defects without expanding
production requirements. Root parent01a17200-435b-74c1-9fd0-24a82e3f60ee personally
reviews the complete packet and reports and must explicitly issue GO. No builder
resumption is authorized now. STOP at this planning handoff.
