# Approved final continuation — three journeys verified, funded obligations settled

29 October 2026. [The approved plan](FINAL_REFUND_CONTINUATION_PLAN.md) was prepared
while stopped and exercised on the same local ledger. The result is **three of four
journeys verified**, not complete Phase 2 acceptance. Sponsor refund stayed unstarted
when the predeclared admission margin and protected reserve closed the window.

## Original buyer Fund and actual refund

The exact original signature
`3na3JMKBtuujwMLXPcaSxmsvLfpiUh4QonRgrYvCJqtdAcBjWMzhChYkrFgKyYMYPhr5Nef2eM95Q3DvtM1ZbPPh`
was reconciled to finalized success at **slot 4731**. Observation context **4733**
reported actual blockheight **4729**, a valid original blockhash, finalized signature
status, FundedOpen cursor 1, and the original Match/OrderUse accounts. No replacement
signature, blockhash, nonce, API purchase or Fund was submitted; its send count is one.

The human then clicked Continue existing buyer refund. The original Unit proceeded
to StartDelivery and explicit RefundFailure. **10,000 lamports returned to the buyer**
at terminal slot **4947**; publisher and collector deltas were zero. Principal escrow
was verified zero. No protected body was returned, and repeated signed retrieval was
denied with **403 INVALID_AUTH**, adding zero native signing slots.

The verifier initially expected PENDING_SETTLEMENT for this failed read. Inspection
confirmed the actual store contract rejects a refunded/non-Consumed Unit with
INVALID_AUTH. That expectation was corrected, and actual read/receipt verification
passed. Neither the Fund nor the native refund was rerun during those verification
restarts. Preserved finalized transaction proofs plus current native accounts are
available when old transaction metadata is absent; this evidence mode is labeled
explicitly. The actual buyer verification used transaction-finalized metadata.

[Buyer case proof](../../artifacts/machine-market/agent-access/case-direct-failure.json) ·
[Original reconciliation and session history](../../artifacts/machine-market/agent-access/final-refund-reconciliation.json) ·
[Final result](../../artifacts/machine-market/agent-access/FINAL_REFUND_RESULT.json).
The historical BUYER_UNKNOWN checkpoint remains preserved; it is no longer the
current outcome. Both original success proof files and workflow cases retain their
exact preparation hashes.

## Admission/drain controls and the unexecuted fourth case

New admission awaits the actual slot, then checks the gate synchronously before any
reservation/signing. Closing admission is irreversible within that runtime, including
when a Run was waiting for its slot read. Operator stop closes admission first and
drains existing work; it does not immediately close the store beneath an admitted
workflow. No new financial case is allowed with less than five minutes or less than
**450 slots** before the immutable Series useBy. Sponsor admission also requires the
buyer refund's verified marker. Financial mutation routes remain disabled during
Unknown reconciliation.

The final sponsor settings were prepared (sponsorship, consent and admitted failure),
but no sponsor-failure Run was admitted. A read-only finalized RPC observation reached
**slot 5872**, leaving **318 slots** before useBy **6190**: already below the approved
450-slot margin. This is an admission-margin closure, not a claim that useBy had
already expired. The runtime subsequently stopped automatically at its protected
reserve. No late Fund, reserve or signing slot was created; sponsor Unit 3 is untouched.
The current plan cannot be reopened simply because unused drain time remains.

## Exact stopped totals

| Evidence | Actual result |
| --- | --- |
| Verified journeys | Direct success, sponsored success, buyer refund: **3/4** |
| Unexecuted journey | Sponsored failure/refund |
| Native outcomes | **15 ResolvedSuccess**, zero Unknown/blocked |
| Attempts including original faucet requests | **20/32** |
| Fixture funding | **0.216/0.25 LOCAL test SOL**, zero additional requests |
| Native principal funded | 30,000 lamports |
| Publisher / collector paid | 19,800 / 200 lamports |
| Buyer / sponsor refunded | 10,000 / 0 lamports |
| Remaining principal, principal/unit/operating/fee holds | Zero |
| Active campaign reservations | Zero |
| Sponsor consumed allowance | 10,000 gross, one grant, zero refunded gross |
| Retained rent / program and faucet fees | 48,713,040 / 175,000 lamports |
| Cumulative active time | **3,000,853 / 3,300,000 ms** |
| Unused protected allowance | **299,147 ms (4m 59.147s)** |
| Immutable useBy / read expiry | 6190 / 10190 |

Seventeen focused fixture checks passed, including the asynchronous admission-close
race, reserve and slot thresholds, exact pending/refunded buyer restart states and
strict expiry evidence. Actual native/HTTP verification is separate from those tests.
The failed-content verifier accepts the actual INVALID_AUTH code and does not count
transport failures as access denial. Syntax and staged repository hygiene checks
passed. No broad audit or production hardening campaign was run.

All owned runtimes are stopped and both ports are closed. No original ledger,
identity, deadline, signed attempt or success proof was reset. No paid model/API,
user wallet, mainnet, new public Devnet, hosted write, push or PR occurred.

The only remaining acceptance gap is the untouched fourth journey. Completing it
requires a separately scoped decision because both the fixed 450-slot admission
margin and the five-minute no-new-admission reserve have closed for this plan.
Do not silently relax the margin, extend the signed Series deadline, reset the
ledger, or reinterpret retained funds/time as a new run authorization. Conditional
publication after completed, verified Phase 2 has not become actionable at 3/4.
