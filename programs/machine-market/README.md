# AXP machine-market native program — Phase1

This is the actual Solana entrypoint for the frozen Packet03 ABI, manifest SHA256
`d77ac0f699a29dd89812137007f3ccb1cbf1d271dbcb738c66fd63c3736a3f3c`.
It is not a native-execution result. Phase1 authorizes source and focused host tests;
local-validator/CPI/runtime/transaction-delta acceptance requires the separate Phase2 GO.
A lead-run SBF compilation is a build check, not native execution evidence.

The entrypoint implements Init, IssueSeries, RegisterUnit, Fund, StartDelivery,
FinalizeDelivery, RefundFailure, TimeoutRefund and ExpireUnused. It manually encodes
fixed-length Market393 / Series229 / Unit383 / Match619 / OrderUse178 byte accounts.
Each load checks program ownership, exact layout, market namespace and canonical PDA.
No account is closed or reinitialized. Fresh prefunded PDAs are explicitly refused.

Primary gross P is the only refundable escrow. Secondary gross Q pays seller net
and collector fee immediately through System CPI and transfers the single P claim
with native ownership/cursor. Terminal payout touches only the primary receipt;
refund goes to the locked current holder, or to the immutable sponsor for a
nontransferable sponsored unit. Secondary sellers and fees are not clawed back.
Quote fees remain immutable; earnedFee is derived from receipt state.

Native checks enforce signer/writable roles, exact system program, fixture authority,
wallet ownership/data/rent reserve, source balance, limits/deadlines, nonce nullifiers,
canonical transfer policy, minimum effective post-fill rights and immutable receipts.
Payer/beneficiary may alias for direct trades and operating authorities may share a
key; state accounts cannot alias wallets or each other. Exact receipt replay precedes
current ownership/cursor/expiry so later resale/settlement does not repeat a debit.
Direct owner Start needs only owner signature, never matcher or gateway co-signing.

The program does not verify the offchain order book, Ed25519 authorization messages,
aggregate sponsor allowance or prepared content truth. Native transaction signers
and the separately reviewed adapter authorize those fields. Gateway and fixture
operator trust, one writer and the intact current DB/ledger boundary remain explicit.

## Source and dependencies

- `src/codec.rs`, `state.rs`, `instruction.rs`: strict fixed ABI and custom codes.
- `src/domain.rs`: pure hashes, rights, face/fee/transition validation.
- `src/processor.rs`: real account creation, System transfers and escrow mutation.
- Runtime: exact `solana-program=2.3.0`, default features disabled; no Anchor/Borsh.
- Tests only: exact `serde_json=1.0.154`, consuming public shared golden vectors.
- The lead owns task-isolated CARGO_HOME/target paths, lockfile generation, dependency
  preflight, formatting/build/test execution and any eventual serial SBF build.

Cargo.lock records the lead-resolved dependency graph with registry checksums.
The exact top-level pins remain `solana-program=2.3.0` and dev-only
`serde_json=1.0.154`; dependency/build commands use task-isolated caches and targets.

## Meaning of the authored tests

`tests/domain.rs` checks canonical issuance, primary and secondary signed minima,
sponsor override, exact claim face, strict deadlines, checked cursor/fee arithmetic,
selected-economics conservation, current-holder claim and byte/hash binding.
`tests/golden.rs` compares every decoded field of all nine native instructions and
five account kinds with the JS owner's public vectors. It checks all six authorization
layouts and independently encodes the DeliveryRequest used by Start.
`tests/processor.rs` injects Clock/Rent and exercises owner-only Start and direct
program-owned terminal lamport mutation, wrong owner/signer/recipient/foreign account,
lease/expiry boundaries, exact replay and conflicting terminal outcomes.

These are host fixtures. They do not simulate a bank or execute System CPI, verify
transaction signatures, charge a real network fee, prove runtime atomicity, deploy
SBF or establish native finality. Real primary/secondary System transfers, creation,
CU/transaction-size bounds and local-validator money/claim races remain Phase2.


## Verification checkpoint — 26 October 2026

Lead-run final checks passed **25 Rust host tests**: 12 domain tests, two
cross-language tests (20 ABI vectors plus 40 PDA vectors across all five address
families), and 11 processor tests. The JavaScript focused suite passed 59 tests.
The SBF release build passed with no stack diagnostic. Remaining compiler warnings
are deprecated Solana module re-exports. See `../../docs/machine-market/PHASE1_RESULT.md`
and `../../artifacts/machine-market/phase1/verification.json` for exact evidence.

The first SBF compile returned zero despite a 4,288-byte dispatcher frame error,
192 bytes over its 4,096-byte limit. The dispatcher and six handlers now use
`#[inline(never)]` to preserve call boundaries under release LTO. The new compile
has no stack error; ABI and economic behavior are unchanged. The build runner now
fails on compiler errors/unsafe stack diagnostics even if Cargo returns zero; its
failure behavior was checked against the original compiler diagnostic.

No validator, deployment, System CPI execution, transaction finality, runtime CU or
native wallet delta is claimed. Phase2 remains separately gated. Host fixtures and
an ELF build do not complete localhost settlement acceptance.
