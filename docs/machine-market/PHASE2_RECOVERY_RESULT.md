# Localhost recovery result — 26 October 2026

Same preserved ledger/run; no reset, pruning, replacement signature, new fixture key,
repeat funding or new funded run. The approved cap is 10 GiB ledger, 9 GiB supervisor
stop, within 20 GiB total task storage; free space floor 40 GB, app DB/log cap 50 MiB.
Financial/operation ceilings remain 8 initial Units, 24 successful trades and 128
signed native operations. No Devnet/public broadcast, paid call, push or hosted write.

## Native result

Original Unknown RegisterUnit signature
`3teaFchGbwHM6UAk4nwB7fr5xv286qsqP73PjiJYdYwHf37fMzEYeBLFYdmeTkcrk8mu3FhVtSymQq78cyPHVcsj`
resolved to finalized success with exact transaction/account evidence and known fees.
No resend occurred; signed transaction SHA256 remains
`a5303c117a1c1b6658cac161f7af11625c8f659b6962970cb49ae4404dae84d0`.
The six remaining Unit registrations then finalized using the existing keys/run.

All **19 allocated signed attempts** are finalized: six fixture-funding transactions,
Init, four IssueSeries and eight RegisterUnit operations. Funding remains **9.001
LOCAL SOL** (9,001,000,000 lamports); no funding was repeated. Total known native fees
are 155,000 lamports; program-account rent is separately 42,017,520 lamports.
Setup-only maxima: 559 serialized transaction bytes, 28,775 CU. These do not establish
trade/delivery size or compute acceptance. No native outcomes remain unknown.
Actual Market: four Series, eight Units, zero funded matches. **Zero marketplace trades.**

Restart verification passed all 27 TCP/UDP socket rows on literal 127.0.0.1, same
genesis `DiFc6vsemLp95cTNHVEyzGBCKWpKUKR3qRNVLFyM5LQ2`, same approved four-substitution
validator SHA256 `1f135bb21bdd50df55e92f5254120e02e7e7118d428e668270ba8b98acf13dbf`
and program SHA256 `3335158a895ac7f483c9cbbcc4470e95e65098c54c7da1b7be4733b0594fea1a`.
The first unprivileged restart failed to bind its faucet (sandbox operation not permitted);
the approved loopback execution subsequently started and verified. No funding occurred
on the failed restart. The original manifest, identities, signed bytes and history persist.

## Concrete acceptance blocker

First acceptance entry was proved before execution: no acceptance journal/probe DB,
13 resolved native setup operations, zero off-chain orders/matches/campaigns/
authorizations/requests, and native fundedMatches zero. The original bootstrap is
reused; this is first harness entry, not a new run.

The actual harness stopped with **HTTP_CASE_REJECTED** in `concrete:http-reservations`
after the shared-balance order was cancelled and the 10000-lamport same-nonce order
was admitted. Its original HTTP error body was not saved; do not claim its precise
wire response was independently captured. An offline copy of the stopped database
reproduces the same two concurrent requests using the same signed authorization and
two HTTP idempotency keys: one succeeds, one rejects **STALE_CURSOR**. It makes zero
RPC calls and zero signer calls and does not alter the authoritative database.

The service captures a wallet version before awaiting RPC, then compare-and-sets
that version in observeWallet. Concurrent same-wallet requests can both capture the
same version; the second observation fails before the idempotency lookup. The current
HTTP probe expects both duplicate requests to return the same order successfully.
This is the supported diagnosis, with the live-response capture limitation above.

Current authoritative state: one Cancelled order, one Open order, a **10000-lamport
off-chain reservation**, no native debit/trade. The failed step remains Prepared and
its stopped journal is retained. A blind full-step retry would fail its initial zero-hold
guard, and reusing its immutable earlier order identities cannot reproduce a fresh
race. Do not clear/recreate the journal or release/recreate requests to label it passed.
A reviewed same-run recovery must handle both the service concurrency conflict and
partially executed HTTP step while preserving its original evidence and liabilities.
This correctness blocker stops the bounded phase for parent review; native T1–T9
trades, delivery, sponsor/refund, native races, crash recovery and boundary acceptance
remain incomplete. No automatic follow-on phase starts.

## Verification and stopped state

Current focused source suite: **140 passed, zero failed/skipped**. Resource/bootstrap/
launcher subset: 19 passed. Harness subset: 21 passed. All **23** Phase2 scripts pass
syntax checks. Resource boundary checks reject ledger >10 GiB, total task >20 GiB,
app DB/log >50 MiB and free space <40 GB. The bootstrap test also verifies limits stop
before fixture creation/funding. These are fixture/source checks, not native T1–T9 proof.
Repository hygiene passed with all 32 scoped files staged (zero findings). Source/docs
whitespace checks pass; exact hashed patch artifacts retain seven single-space unified
diff context lines that git diff --check reports as whitespace. These provenance bytes
were preserved. A privileged listener check found no remaining listeners on validator
RPC/PubSub/faucet or acceptance ports 18899/18900/19900/18910.
The earlier full repository result (1010 passed, 23 skipped, one unrelated timing
assertion failure) remains; no full repository rerun or green claim was substituted.

Owned service cleanup completed; validator exited SIGINT with operator_stop and no
running lock. Final recorded storage: ledger 1,319,055,360 bytes; total task
8,353,325,056 bytes; app DB/logs 4,149,248 bytes; free space 145,909,075,968 bytes.
No live demo, historical benchmark, Devnet wallet or existing hosted state was modified.

## Evidence

- [Recovery summary and all 19 signatures](../../artifacts/machine-market/phase2/recovery-result.json)
- [Original exact transaction recovery](../../artifacts/machine-market/phase2/original-registration-recovery.json)
- [Native bootstrap account/delta proof](../../artifacts/machine-market/phase2/bootstrap-native-result.json)
- [First acceptance entry guard](../../artifacts/machine-market/phase2/first-acceptance-entry-proof.json)
- [Offline concurrency reproduction](../../artifacts/machine-market/phase2/http-wallet-race-reproduction.json)
- [Verification, source and evidence hashes](../../artifacts/machine-market/phase2/recovery-verification.json)
- [140-test output](../../artifacts/machine-market/phase2/outputs/recovery-focused-suite.txt)

The local commit containing this report is the review checkpoint; GitHub push is prohibited.
