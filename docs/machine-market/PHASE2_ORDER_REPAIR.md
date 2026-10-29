# Duplicate order repair and partial HTTP continuation

The cb3c20a result remains preserved. Root forwarded the user's explicit "continue"
and authorized one repair/continuation phase under unchanged finite caps.

The service now coalesces only identical authenticated in-flight BookOrder messages,
keyed by actor and nonce and checked against the complete authorization hash. Each
request verifies its signature and allowed actor before joining. After the first
admission, aliases still call the authoritative store transaction to bind their own
HTTP idempotency key and validate nonce/body identity. Different signed bytes reject
NONCE_CONFLICT. This neither relaxes wallet compare-and-set checks nor merges different
orders. The in-memory coordination is disposable; durable SQLite identity remains
necessary across restarts. Native signing/sending is not duplicated by aliases.

Five regression checks cover fresh duplicate admission with one reservation, changed
signed price with the same nonce, invalid signatures and HTTP-key conflicts, independent
requests competing for shared balance, and interrupted checkpointed HTTP recovery.
The complete focused suite passes 145/145 (fixture/source evidence, not native acceptance).

The original stopped acceptance journal is archived privately before any change with
SHA256 dbcef89d82a3b08280ca44e203c4d6d640ec6ad1d20cb606b24e098871f081ba.
Public recovery metadata records its hash, exact carried order/version/10000-lamport
hold and hashes of all three original request rows. Every continuation checks those
original rows still have identical body/result bytes. Explicit resume retains stopped
records in stopHistory. No journal, request or failed evidence is recreated/cleared.

Recovery never blindly replays the original HTTP step's zero-hold precondition. Its
original Prepared step remains intact. Separate checkpointed steps retry the original
same-nonce order with its two HTTP keys while proving the single carried hold persists,
cancel that exact order once using the original stable cancellation nonce and version,
verify the old wallet capture is stale, then run new explicitly named shared-balance
requests and their cancellation plus the original not-yet-submitted IOC. Completed
recovery substeps are reused on restart; cancellation retains its original expected
version and pre-cancellation capture. The unit test pauses after duplicate retries,
reopens the journal and finishes without replaying completed requests. No native
signature, new funding or new fixture identity is needed for this HTTP repair.

This phase uses the original ledger/genesis/program, 8 initial Units, <=24 trades,
<=128 signed operations, ledger<=10GiB with9GiB stop inside20GiB total, free>=40GB,
DB/log<=50MiB. The validator stays stopped until preparation/testing finish. Native
results will be recorded separately; no Goal, additional agents, push or Devnet run.

## Native continuation checkpoint

Actual local HTTP recovery passed: both retries returned the original order, the
carried reservation cancelled once, stale capture was refused, the separately named
shared-balance pair admitted only one order, and all recovery holds reached zero.
All three original request rows retained identical body and cached-result bytes.
The original interrupted step stays Prepared and its stop record survives in history.
See http-order-repair-actual-http.json; its HTTP proof is separate from fixture tests.

The original Fund transaction finalized successfully before the exact replay probe
stopped with REPLAY_PENDING_SETTLEMENT. The harness had assumed sendTransaction
always returns the signature, and did not support its existing ReplaySendIntent on
resume. The checked official Agave source returns simulation errors before broadcast.
The repaired harness admits only a matching returned signature or exact -32002 /
AlreadyProcessed preflight error, together with the unchanged finalized transaction/
metadata and paired unchanged balances/data hashes. Other errors remain unresolved.
It retains the earlier send intent and response history and never creates a signature.
Two new replay checks plus the existing harness suite passed 23/23.

Actual replay resume returned AlreadyProcessed; all paired account deltas/data changes
were zero and the original finalized receipt matched. See native-exact-replay.json.
The same run has continued into native trades and terminal settlement. These are
intermediate checkpoints, not a complete T1–T9 or deadline-equality result.

## Final result

The original run finished with16 trades and all8 Units terminal. Full acceptance is
partial (38/40 proof checks;2 exact timing proofs pending). Actual65 signed transaction
outcomes are retained; only2 are still available from fresh RPC, with63 older receipts
classified as execution-time retained evidence. Current accounts prove zero escrow
and exact fixture balance conservation. Automatic FIFO pruning is now prevented by explicit u64::MAX within the
unchanged storage caps. See PHASE2_NATIVE_ACCEPTANCE_RESULT.md for limitations and all
artifacts. Validator/service stopped; no push or Devnet phase follows automatically.
