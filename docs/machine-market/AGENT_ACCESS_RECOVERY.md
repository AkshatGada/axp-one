# Local request fix and exact funded recovery — ready for human action

29 October 2026. The user authorized fixing SERVICE_UNAVAILABLE, recovering the
existing funded case, both refunds and ten more active minutes if needed. This
checkpoint records implemented code and successful startup validation. The recovery
and refunds have **not** executed because no human final continuation click arrived.

The native client previously mapped every fetch rejection to SERVICE_UNAVAILABLE
and used a fixed 30-second timeout. The workflow stopped even when the exact original
transaction was already signed/sent. Resource checks also synchronously rescanned
the task tree on polling, signing and supervisor paths. One stopped measurement
required 542.445 ms for the walk plus 569.201 ms for du. This overhead can delay the
local service; the original generic error does not establish a unique transport cause.

The bounded workflow now uses a **120,000-ms** request deadline; other clients keep
the **30,000-ms** default. Timeouts become SERVICE_TIMEOUT. Resource samples are
reused for at most **2,000 ms**, with free space checked live and existing limits
unchanged. A failed response with a durable signed attempt causes only bounded
observation of that **same** operation. It does not resubmit the API/native request,
re-sign, refresh a nonce/blockhash, or send another transaction. No-attempt errors
still halt. PENDING_SETTLEMENT observation retries are reads of the original attempt.

Thirteen focused policy/resume/client/CLI checks pass, including one-submit
transport-uncertainty behavior, timeout classification and changed-funded-state
refusal. Tests use fixtures and no transfers or paid calls.

Resume accepts only the known sponsored interruption and original Fund signature,
funded cursor 1, original sponsor/buyer/Series and exactly **10,000 lamports** above
the native Match rent reserve. All ten existing outcomes must be known; active holds
must be zero. Direct success and the untouched Units are checked too.

Restart exposed unavailable old direct transaction metadata. Resume now verifies
its preserved serialized signatures/finalized proof, then matches current native
Unit/Match state and zero direct escrow. Fund recovery similarly combines preserved
finalized proof with current accounts, labeled
`persisted-finalized-proof-and-current-native-accounts`, at context slot **3512**.
It is not represented as fresh RPC transaction-metadata capture.

The human **Continue existing funded case** action skips trade and Fund entirely,
then runs only the remaining delivery/terminal stages. The original error history
is retained and a recovery event appended. The two human refund Run actions follow
sponsored verification. No completed direct purchase is rerun.

The approved cumulative cap is **2,400,000 ms (40 minutes)**, carrying all prior time.
Elapsed is **2,178,044 ms**, leaving **221,956 ms (3m 41.956s)**. The validator stopped
to preserve that window while awaiting the final human action. No new continuation
click, funding, signature or transaction occurred during validation. Usage remains
**15/32 attempts**, **0.216/0.25 LOCAL test SOL funded**, with **10,000 lamports still
in original sponsored escrow**. Series/read deadlines remain **6190/10190**.

[Recovery checkpoint](../../artifacts/machine-market/agent-access/RECOVERY.json) ·
[Original Fund proof](../../artifacts/machine-market/agent-access/sponsored-fund-proof.json) ·
[Focused checks](../../artifacts/machine-market/agent-access/recovery-tests.txt).

The next same-ledger command is `node scripts/machine-market/agent-access.mjs resume --execute-local`.
The human must perform final Continue/refund Run clicks under the existing action-time
safeguard. Approval is already recorded within these bounds. Verify before each next
case, halt on an unresolved outcome and stop runtimes after the walkthrough. No new
funding, mainnet/Devnet, user wallet, paid API, hosted write or push is included.
