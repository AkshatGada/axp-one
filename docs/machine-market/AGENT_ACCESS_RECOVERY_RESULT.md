# Current result — buyer refund verified, all funded obligations settled

29 October 2026. The exact original buyer Fund finalized at slot 4731 and the human
continuation returned 10,000 lamports to the buyer at slot 4947. Both prior successes
are preserved. **Three of four journeys pass**; sponsor refund was not admitted
before the approved 450-slot headroom and protected drain boundaries closed.
All 15 native operations are finalized and unblocked; all principal/operating holds
and active reservations are zero. **20/32 attempts**, **0.216/0.25 LOCAL test SOL**.
All runtimes stopped at 3,000,853/3,300,000 ms, preserving 299,147 ms of protected
allowance. [Current exact outcome, proof and scope boundary](FINAL_REFUND_CONTINUATION_RESULT.md).
The checkpoints below are historical.

# Sponsored recovery verified; buyer Fund remains Unknown

29 October 2026. The human clicked **Continue existing funded case**. The same Unit
continued from funded cursor 1; the original sponsored Fund was neither purchased
again nor re-signed/resubmitted. Actual StartDelivery and FinalizeDelivery completed.
The source bytes were unchanged; the immutable Sponsored packet remained separate.
The publisher received **9,900** and collector **100 LOCAL lamports**. Exact response
replay added zero native signing slots, wrong-owner retrieval returned **403
INVALID_AUTH**, and the sponsored primary escrow was verified zero. The terminal
transaction finalized at slot **4513**. Direct success and its original proof remain
unchanged. Both successful access cases are now verified.

[Sponsored case proof](../../artifacts/machine-market/agent-access/case-sponsored-success.json) ·
[Strict checks](../../artifacts/machine-market/agent-access/read-only-verification.json).
The original SERVICE_UNAVAILABLE history is retained, with an appended recovery
event. No new transport error occurred during this recovery. The original sponsored
Fund still has exactly one send record. This is actual local native/HTTP evidence,
not a fixture, public Devnet or model-provider run.

A reconnect UI defect was also corrected: ready state now replaces stale offline
status text. Before correction a live enabled button could retain the previous
"Runtime stopped/offline" sentence. The fix was visually verified in the live page;
JavaScript syntax checks pass. The earlier 13 focused recovery/client/CLI checks
remain the source-validation evidence; no new broad test or audit was run.

## Shutdown overlap with the buyer-refund Run

Near the remaining runtime boundary, the operator requested shutdown rather than
start both still-unexecuted refunds without enough finality time. **The human's
buyer-refund Run was admitted while that shutdown was being requested.** The operator
stop therefore interrupted a newly admitted original Fund; it was not a settled
boundary for that buyer case. The native journal retained the exact signed attempt
and all reservations. No duplicate Run, send, re-sign, new nonce or blockhash was made.

Original buyer Fund operation:
`635a026cdbf1485e8e5f7d30ffc0e75dd07e5a13331f12459ea1291714db042a`.
Original signature:
`3na3JMKBtuujwMLXPcaSxmsvLfpiUh4QonRgrYvCJqtdAcBjWMzhChYkrFgKyYMYPhr5Nef2eM95Q3DvtM1ZbPPh`.

A **6,706-ms observation-only** restart used the same ledger, no signers and no
financial HTTP routes. It called only reconciliation, never send/execute. Finalized
transaction evidence was unavailable: the operation remains **Unknown/blocked**,
with account-state-only observation through context **4728**. This is not proof that
the original transaction failed, expired or was never executed. Do not replace it.

The buyer's **10,000-lamport principal reservation**, **15,000 fee reserve** and
**9,458,640 rent reserve** stay fully held. Operating/native-fee hold views describe
the same obligation and must not be summed twice. No buyer delivery request/body or
refund has been produced. Sponsor refund is still untouched. Reconcile this exact
signed identity before any additional financial operation.

[Unknown buyer checkpoint](../../artifacts/machine-market/agent-access/BUYER_UNKNOWN.json) ·
[Bounded observation](../../artifacts/machine-market/agent-access/buyer-fund-reconciliation.json).
Exact signed transaction bytes stay in the ignored native_attempts journal; the
sanitized checkpoint records their SHA256 and original validity identity.

## Current limits and next boundary

- **18/32 total attempts**: five original faucet requests, 12 finalized native
  operations and one original Unknown native attempt. No extra funding.
- Funding **0.216/0.25 LOCAL test SOL**. Known retained rent **39,254,400** and known
  program/faucet fees **145,000 lamports**; the Unknown reserves remain separate.
- **Two of four cases verified**. Known success principal escrows are zero; the
  buyer's possible charge/operating liability remains fully reserved and unresolved.
- Cumulative active runtime **2,395,614 / 2,400,000 ms**, leaving **4,386 ms**, which is
  insufficient for native finality and refund completion. All owned runtimes stopped.
- Original ledger/genesis/program/keys/Units, Series useBy **6190**, read expiry
  **10190**, signed authorization history and original errors remain preserved.

Further work needs a specifically bounded runtime/recovery instruction. First
reconcile the original buyer Fund through finalized evidence or proven expiration/
non-execution, without a replacement identity. Then continue that original refund
obligation and only afterward the untouched sponsor-refund case. Do not treat this
record as permission to restart, extend time, refresh a transaction or add funding.
No push, hosted write, user wallet, paid API, mainnet or new public Devnet action
occurred.

For future MVP tests, prefer deterministic fixtures and programmatic unattended
local runners where permitted, and identify unavoidable human steps upfront. That
preference does not authorize an API/CLI substitute for the current final-click
safeguard. No new runner/hardening project was started in this checkpoint.
