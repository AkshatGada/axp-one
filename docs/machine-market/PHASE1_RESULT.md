# Phase 1 implementation result — 26 October 2026

Phase 1 is complete locally against frozen Packet03 manifest
`d77ac0f699a29dd89812137007f3ccb1cbf1d271dbcb738c66fd63c3736a3f3c`.
This delivers strict binary codecs, domain rules, relational reference trading,
and a compiled minimal Solana program. It does not deliver native execution or the
Phase 2 end-to-end localhost demo. No follow-on phase is authorized by this result.

## Delivered behavior

The JS implementation enforces canonical inputs and signatures, effective transfer
rights, exact original-primary refund face, price-time/maker-price matching,
IOC/GTC, unique unit and wallet reservations, sponsored fixed-price limits,
wallet observation versions, one-writer persistence, and quarantined uncertain
fixture signing/outcomes. Principal, operating fee reserves and sponsor budget
consumption remain distinct. Reference primary/secondary/terminal observations
model immediate secondary proceeds and the transferable original-P refund claim.

The native program implements nine instructions with fixed account layouts,
canonical PDAs, signature/role checks, immutable receipts and order-use nullifiers,
primary escrow, immediate secondary System transfers, owner-only delivery start,
and primary-only success/refund/timeout/expiry disposition. Host tests inspect
program-owned lamport mutations and replay guards; they do not execute System CPI.

Lead review covered JS matching, signing/observation paths, Rust funding, delivery,
terminal effects and intentional role aliases. Corrections included exact magic
bytes, safe schema-name lookup, aggregate available-balance recheck, and SBF stack
boundaries. No outstanding blocker was identified for this source/unit/build phase.
This is integration review, not an independent security audit of the implementation.

## Actual verification

| Check | Result and limit |
|---|---|
| Focused JS | 59 passed, zero failed/skipped, Node v25.5.0 |
| Rust host | 25 passed: 12 domain, 2 cross-language, 11 processor; zero failed |
| ABI parity | All 20 vectors: six authorizations, nine instructions, five accounts |
| PDA parity | 40 vectors across five families; JS output checked by Solana SDK for address and bump |
| SBF release | Exit 0 and no error/stack diagnostic; ELF64 little-endian EM_BPF, flags 3, 241832 bytes |
| Broader repository | 940 passed, 23 skipped; 90 component tests; both UI typechecks; SDK parity and hygiene passed |
| Packet integrity | Manifest and all 11 referenced documents retain their declared hashes |

The broad suite ran before the final PDA-only test addition. The final focused JS
and Rust runs include that addition. Broad results include the earlier synthetic
prototype and existing product tests, and are not all native-market acceptance.
The initial sandbox run could not bind loopback HTTP; the supported escalated
fixture-only rerun passed. No real network/provider/payment adapter was enabled.

Initial SBF compilation misleadingly exited zero with a dispatcher frame of 4288
bytes (192 over the 4096 limit). `#[inline(never)]` on the dispatcher and six handlers
preserves frames under release LTO. The final compile has no such diagnostic. The
runner now treats unsafe stack/compiler-error text as failure, verified by replaying
the cached original compiler diagnostic before the fix. Deprecated Solana module
re-export warnings remain. The ELF has not been loaded or executed in a validator.

Final ELF SHA256:
`3335158a895ac7f483c9cbbcc4470e95e65098c54c7da1b7be4733b0594fea1a`.
The ignored binary is under
`local-state/machine-market/build/sbf/sbpfv3-solana-solana/release/axp_machine_market_program.so`.
Sanitized actual check outputs, source hashes and resource measurements are recorded
in [verification.json](../../artifacts/machine-market/phase1/verification.json).

Exact commands, from the worktree root:

```sh
node --test tests/machine-market/native-codec.test.mjs tests/machine-market/native-domain.test.mjs tests/machine-market/native-trading.test.mjs
node scripts/machine-market/phase1-rust.mjs test
node scripts/machine-market/phase1-rust.mjs sbf
node scripts/setup/verify-review.mjs
node scripts/setup/check-repository.mjs
```

The runner requires the pinned task-local compiler and registry cache described
below; it does not bootstrap dependencies or validators implicitly. Staged hygiene
is rerun before committing. The frozen `PACKET02_TO_PACKET03.diff` contains ordinary
blank diff-context lines reported as trailing whitespace by `git diff --check`;
its hashed bytes are preserved. All other staged files pass the whitespace check.

## Toolchain and reproducibility

Host Rust/Cargo is Homebrew 1.94.1 (rustc e408947bf, 25 March 2026).
Runtime dependency is exact `solana-program=2.3.0` with default features disabled;
test dependency is exact `serde_json=1.0.154`. Cargo.lock contains registry checksums;
no Git/private dependency is used. Locked fetch populated only the task cache;
subsequent host and SBF builds used `--locked --offline`.

Official downloaded archives, inspected for traversal/special files before extraction:

| Archive | Bytes | SHA256 |
|---|---:|---|
| Agave v4.3.2 aarch64 Apple | 77047814 | `5439bd2a42c9e8b39923377361a14c9267f6ce699308f9255fb71c3017af76fd` |
| platform-tools v1.57 osx aarch64 | 430747800 | `48c32c2ec3ac3729b5caf1fdd6c4145496125edf043b2662b0586bfbc932b34a` |

Sources: [Agave release](https://github.com/anza-xyz/agave/releases/tag/v4.3.2),
[platform tools release](https://github.com/anza-xyz/platform-tools/releases/tag/v1.57),
[Solana program dependency](https://docs.rs/solana-program/2.3.0/solana_program/).
The Agave archive's cargo-build-sbf reports 4.4.0 and selects platform-tools 1.57.
Its [wrapper source](https://github.com/anza-xyz/cargo-build-sbf/tree/907968c937e6462683a7c47fb8eec8f396359231)
was inspected. The runner invokes bundled cargo/rustc directly to avoid the wrapper's
global cache/rustup behavior and automatic program-key generation.

SBF compiler: rustc 1.95.0-dev (ae660768a, 17 August 2026), cargo 1.95.0 (bbbd3a760,
9 July 2026), target `sbpfv3-solana-solana`. Flags replicate the wrapper's target
settings: `-Zremap-cwd-prefix= -C link-arg=-z -C link-arg=defs`, with bundled LLVM
CC/AR/OBJDUMP/OBJCOPY. Two jobs, incremental off, serial heavy builds, isolated
CARGO_HOME and target paths. Provider/wallet/auth environment values are removed.
No global toolchain, HOME override, program wallet or validator was created.
Task tools/cache and build output remain below 4GiB/2GiB; free space exceeds both
the phase's 40GB floor and repository's 50GiB guidance. DB/log footprint is bounded;
checksums and exact measured bytes are in the verification JSON.

## Acceptance coverage and remaining gate

T1–T5 have focused algorithm, signature/codec, sequential reservation/concurrency
model, sponsorship and lifecycle evidence. Actual HTTP/native race portions of
those groups remain unexecuted. These are not blanket passes of all native
acceptance groups. T6–T9 remain Phase 2.

Phase 2 would still require a complete legacy transaction adapter and signatures,
all native-operation outboxes and transport/recovery, trusted account-byte
observations and real wallet deltas, direct-owner delivery monitoring, durable
private response/tombstones, manifest/genesis/loader checks, validator deployment,
System CPI/runtime atomicity, transaction-size/CU measurement, native races and
physical full-stack growth checks. JS signing currently accepts injected fixture
callbacks and instruction-only messages; it is not safe to attach a live signer as
though it were a complete native transport. A persistent signing barrier across
process/power loss must be established before any external signer is integrated.

The reviewed architecture is local commit `283d469`. The implementation/result are
in the Phase 1 commit containing this file. The older synthetic prototype, root
package changes and inherited marketing CSS remain unstaged and unchanged by this
phase. No push, hosted write, paid call, real asset or Phase 2 execution occurred.
