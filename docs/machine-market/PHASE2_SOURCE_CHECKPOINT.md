# Phase 2 core/transport source checkpoint — 26 October 2026

Core and transport implementation is verified and ready for native integration.
This is NOT Phase 2 completion. The validator/compiler workaround remains paused
pending approval forwarded by root; no validator, funding or native run has started.
The acceptance harness is being completed separately and is not claimed complete
by this checkpoint. Frozen Packet03 and Phase1 evidence remain unchanged.

## Implemented source

- Complete canonical legacy messages and every required Ed25519 signature check.
- A FULL-sync committed intent/message/reservation/signing fence before any signer;
  complete signed bytes before a single-use durable send intent. Three SIGKILL
  cases retain uncertainty and holds; no new signature or unsigned abort follows.
- All nine operation outboxes, same-byte explicit resend, native-mode trading
  reservations and wallet versions, immutable receipt identity and monotonic
  observations. Exact known fees remain known if later history is unavailable.
- Strict literal-loopback RPC, genesis/program/loader/ELF checks, exact transaction
  and coherent account proofs, separate principal/market fee/network fee/rent.
- Native/direct-owner lock observation, immutable response commit before Finalize,
  sponsored packet separation, holder/sponsor refunds, authenticated late replay,
  and durable Start/process actor+HTTP-key binding across restart.
- A bounded W6 handler with private operator actions; reads never sign or mutate.
  Sources/packets are explicit immutable local inputs, not fetched provider data.

Review corrected abort-after-prepare signing, dynamic receipt reread quarantine,
known-fee regression, signature encoding/Fund hash coupling, RPC rentEpoch u64
handling, failed zero-face primary classification, direct-owner lock persistence,
and HTTP-key binding. The normal service retains preflight; acceptance-only negative
probes are separate work and cannot weaken W6 service authorization.

## Actual checks

The lead reran the final frozen core/transport source after both owners became idle:
**99 passed, zero failed/skipped** (59 original JS, 19 core, 21 transport/integration).
This includes actual process SIGKILL/SQLite reopen and real module integration with
injected RPC responses. It is not hardware power-loss, validator or CPI evidence.

The required reviewer command subsequently passed: **991 passed, 23 skipped**, plus
90 component tests, both UI typechecks, React SDK parity and repository hygiene.
These broad counts include existing product and synthetic-prototype tests, plus
then-current harness unit checks; they are not counts of native-market executions.
The first reviewer run had one failure in the unchanged wall-clock Jev rolling-rate
assertion while a focused suite ran concurrently. That exact test passed in isolation,
and a subsequent reviewer run passed without code changes to the limiter/test.
The cause has not been proved. Both failure and passing outputs are retained.

Exact commands:

```sh
node --test tests/machine-market/native-codec.test.mjs tests/machine-market/native-domain.test.mjs tests/machine-market/native-trading.test.mjs tests/machine-market/phase2-core.test.mjs tests/machine-market/phase2-transport.test.mjs tests/machine-market/phase2-transport-integration.test.mjs
node scripts/setup/verify-review.mjs
node scripts/setup/check-repository.mjs
node scripts/machine-market/phase2-resources.mjs
```

Source hashes and sanitized actual output are in
[core-transport-verification.json](../../artifacts/machine-market/phase2/core-transport-verification.json).
The earlier 88-test intermediate checkpoint is retained separately. The transport
worker's 97-test handoff predates two final core regressions; the lead's99 is the
final combined result for this source checkpoint. Native Rust source and the
Phase1 SBF binary were not changed or rebuilt in this phase.

## Remaining execution gate

[PHASE2_PREFLIGHT.md](PHASE2_PREFLIGHT.md) identifies the original pinned tool's
three wildcard binds. Local commit5331450 records that blocker and an unapplied
source correction proposal. Root has asked the user about an isolated patched
validator/compiler build and a proposed20GiB combined tool/build ceiling. That
adjustment is NOT yet authorized here. No download, install, patch, workaround
build, host firewall change or validator startup has occurred after the pause.

| Proof group | Source checkpoint | Actual native/HTTP acceptance |
|---|---|---|
| T1 | Matching/price/rights tests pass | Native coupling pending |
| T2 | Codecs/signatures/roles and immutable bytes pass | Finalized negative transactions pending |
| T3 | Reservation/fence/restart guards pass | Actual W6 races and competing native transactions pending |
| T4 | Sponsorship and response separation tested | Native sponsor/refund/nontransferability pending |
| T5 | Slot/deadline rules tested in fixtures | Runtime boundary executions pending |
| T6 | Service/direct-owner delivery and late recovery with injected RPC pass | Actual native admission/payout/response proof pending |
| T7 | Unique-key effect verification tested with transaction fixtures | Real native wallet/escrow/rent/fee deltas pending |
| T8 | Process fence and exact-byte recovery tests pass | Funded current-ledger crash/recovery pending |
| T9 | Source caps, signature serialization, physical preflight pass | Actual CU/ledger/full-stack storage and ingress-drain proof pending |

There is no declared funded run to reconcile and no Phase2 validator/test service
process to stop. Unit fixtures are temporary and self-cleaned. Existing historical
funded state, original UI/prototype changes and other worktrees are preserved.
No push, source upload, paid provider call or external settlement occurred.
