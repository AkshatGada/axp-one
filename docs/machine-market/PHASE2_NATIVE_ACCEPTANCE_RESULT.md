# Native local execution result — 26 October 2026

The authorized repair/continuation phase finished on the **original preserved local
run**, with every financial right drained. Full acceptance remains **partial**:
38 of40 harness proof checks passed; exact use-by and lease equality are pending.
No reset, new funded run, repeat funding, replacement signature, extra agent, Goal,
public-network transaction, paid model call, push or hosted write occurred.

## Actual execution and economics

There were **16 successful marketplace trades**:8 primary/sponsored and8 secondary.
All8 Units are terminal:4 Consumed,3 Refunded,1 Expired. Market.fundedMatches is16.
All primary Match receipts retain only rent, with **zero remaining primary escrow**.
There are zero active orders, principal holds, Unit holds, campaign reservations,
native fee holds or quarantined wallets. All65 actual signed transactions have known
at-execution outcomes:50 successful and15 expected native rejections. Signed funding,
setup, negative probes and terminal operations are included. The exact replay reuses
one original signature and is not another transaction/trade/charge.

All amounts below are **LOCAL SOL lamports**, not Devnet SOL or stablecoin payments.

| Economic event | Gross/face | Net recipient | Market fee |
| --- | ---: | ---: | ---: |
| Eight primary/sponsored acquisitions |80000|Held until terminal|Deferred|
| Five earned primary terminals |50000|49500 issuer|500|
| Three primary refunds |30000|30000 current holder/sponsor|0|
| Eight secondary acquisitions |99000|98010 sellers|990|

The primary refund face stayed10000 through resale; secondary prices did not replace
or multiply that claim. Native receipts/wallet deltas and final conservation remain
separate from bids, reservations and signed intentions. Sponsor failure refunded the
sponsor; campaign consumption was not replenished. No attention/comprehension claim.

Fixture funding remains **9001000000 lamports (9.001 LOCAL SOL)** across the original
six funding transactions; there was no additional funding. Total transaction fees were
**675000 lamports**, including30000 paid by the faucet for fixture funding. The funded
fixture wallets paid645000. The final6 fixture wallets plus61 market accounts retain
9000355000 lamports: **9000355000+645000=9001000000**. This includes preserved account
rent and internal seller/issuer/collector transfers and proves no unexplained change
in the funded fixture balance. Funding is not marketplace trading volume.

Measured signed-transaction maximum: **1042 bytes**; measured CU maximum: **76438**,
within1232 bytes/200000 CU. This is finite local-run evidence, not throughput, fleet
capacity or production readiness.

## Repair and preserved partial-step history

Local source checkpoint **3390850** fixes concurrent identical authenticated orders
with distinct HTTP idempotency keys. Full signature verification precedes coalescing;
every HTTP key still binds in the store transaction. Changed signed bytes, conflicting
keys, bad signatures and independent stale wallet captures remain rejected. Five
regression checks cover fresh admission, one reservation and interrupted recovery.

The original failed acceptance journal is retained privately, byte-for-byte, SHA256
`dbcef89d82a3b08280ca44e203c4d6d640ec6ad1d20cb606b24e098871f081ba`.
All3 original request rows retain their original body/cached-result bytes. Recovery
reused the original order and10000-lamport hold, proved both actual concurrent retries
return that same order, cancelled it once with its original stable cancellation nonce
and expected version, and completed separately checkpointed shared-balance/IOC checks.
No hold/request/journal was cleared and recreated. The interrupted original step stays
Prepared as historical evidence; its stop record survives in stopHistory. Both Reserved
slots remain counted: the cancel-first branch's unused native candidate and the unused
last-Unit HTTP candidate. The isolated SQLite fence separately retains1 signing slot
with zero signed attempts/signer/RPC calls; counting it conservatively gives68 total
slots, still below128. They are not signed transactions and were not discarded to shrink budgets.

Local checkpoint **50a94af** fixes exact replay recovery. Agave returned -32002 /
AlreadyProcessed for the already-finalized original Fund bytes. The repaired probe
checks that specific RPC rejection or a matching returned signature, the unchanged
exact finalized receipt/metadata and paired unchanged account balances/data hashes.
Other errors remain unresolved. The earlier ReplaySendIntent and all later checked
response history remain; no new signature or repeat principal/market fee was created.

Actual signed-persistence, after-send and resolved-before-HTTP child-process crash
recovery ran on the same funded DB/keys. The signing-fence and physical-full checks
use explicitly isolated local SQLite fixtures and are not relabeled as network tests.
The harness's38 passed proof checks include these distinct evidence classes. The
147 ordinary source/fixture tests remain separate from native execution evidence.

## Timing remains partial

| Probe | Required boundary | Actual execution | Result |
| --- | ---: | ---: | --- |
| Expired delivery start |5197|5229|Expected rejection; equality partial|
| Finalize after lease |3375|3407|Expected rejection; equality partial|

Both actual traces are32 slots after the boundary, consistent with waiting on a
finalized slot before submitting to the advancing validator. They do **not** prove
execution at exact equality or E-1. The public result correctly has complete:false
and pending T5:useby-equality / T5:lease-equality. No new rights/run were funded to
manufacture another timing attempt, and no clock/ledger was reset or rewound.

## Historical RPC verification limitation

The execution captured and retained signed bytes, finality receipts, fees, CU and wallet
changes before continuing. At the final read-only restart, the blockstore's first
available block was **4099**. Only the last2 transactions could still be retrieved from
current finalized RPC; **63 older transactions rely on retained execution-time finality
evidence**. The failed strict-all-current-RPC check is preserved in ignored verification
logs; it was not replaced with a false fresh-RPC pass. The final artifact labels each
transaction current-finalized-rpc or retained-at-execution-finality-evidence.

The inherited --limit-blockstore-size800000 setting did not preserve the full history
through this run. The CLI restores800000 when the flag is omitted; the final supervisor now explicitly
sets u64::MAX (18446744073709551615) so automatic FIFO cleanup cannot trigger within
the storage bounds. This preserves remaining history;
the9GiB supervisor stop/10GiB hard ledger and19GiB stop/20GiB hard total limits remain.
This cannot restore already unavailable RPC history. Signed bytes, checkpointed proofs,
original identities, current accounts and ledger are retained; no manual pruning/reset
or replacement transactions were used. The final current-state query independently
re-read all8 terminal primary receipts, zero escrow and global fixture balance
conservation from the **same** preserved validator. It is not independent-provider
proof, nor a current-RPC re-verification of all65 old transactions.

## Validation, stopped state and evidence

- Final focused suite: **147 passed, zero failed/skipped**. All26 Phase2 scripts pass
  syntax checks. The new read-only recheck executed successfully against actual state.
- Earlier full-repository result remains1010 passed/23 skipped/one unrelated benchmark
  wall-clock timing assertion failure. It was not rerun or reclassified green.
- Final validator exit was SIGINT/operator_stop; the service and all owned execution
  processes exited. A privileged listener check found no listeners on18899/18900/
  18910/19900. No build/test process is left running by this phase.
- Final storage was about1.037GB ledger,8.074GB total task,6.468MB app DB/logs,
  146.187GB actual free. Hard caps remain10GiB/20GiB/50MiB with>=40GB free.

[Public harness result, actual evidence and pending proofs](../../artifacts/machine-market/phase2/native-acceptance-after-order-repair.json)

[Read-only reconciliation, all65 signatures and availability classes](../../artifacts/machine-market/phase2/order-repair-readonly-recheck.json)

[Stopped state, boundary slots and retained signing reservations](../../artifacts/machine-market/phase2/order-repair-final-state.json)

[Source/test/evidence hashes](../../artifacts/machine-market/phase2/order-repair-final-verification.json)

[History retention argument and source verification](../../artifacts/machine-market/phase2/history-retention-guard.json)

[147-test output](../../artifacts/machine-market/phase2/outputs/order-repair-final-focused-suite.txt)

The local commit containing this report is the final review checkpoint. This phase
stops here; exact timing/retention review and any bounded Devnet phase remain separate.
