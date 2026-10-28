# Approved Devnet retry — 28 October 2026

The user explicitly approved 478 cumulative native transaction slots, 432 cumulative
loader write slots and a 1.40 test SOL total across runs, including the earlier
875,000-lamport fee spend, and instructed execution without another approval request
within those limits. Reference:
`user-2026-10-28-approved-retry-478-432-total-1400000000`.

The historical original run and pending-review packet remain unchanged. This record
supersedes their pending-retry status for this one approved retry only.

The retry uses a separate private journal in `devnet-retry-20261028` and reads the
seven existing key files directly from the original preparation directory. It does
not generate, copy or overwrite keys, their index, the existing wallet or the original
journal. The host capability verifies exact messages against the retry journal's
committed signing fences. Original journal hashes and source-manifest identity pin
the reuse binding. Eight actual public bindings passed without signing/broadcast.

The new journal starts with 178 prior attempt slots, 176 prior write slots and
875,000 prior fee lamports. Cumulative admission checks enforce 478/432 as well as
the finite additional 300/256 limits. Aggregate fees remain at most 15,000,000
lamports, leaving 14,125,000 before new activity; aggregate fee/rent/capital/reserve
exposure remains at most 1,400,000,000 lamports. Current payer conservation subtracts
new fees once; it does not debit prior fees again from an already-debited balance.

Preflight at finalized slot 515932781 verified Devnet genesis/version, active SBPF-v3
prerequisite, exact reviewed ELF, 174 original finalized successful signatures,
4,378,685,920 payer lamports and absence of all other retry accounts. Planned
application/program rent is 1,276,985,000 lamports. The worst listed reservation is
1,396,650,240 lamports including prior fees exactly once and the refreshed 650,240
wallet reserve, leaving 3,349,760 headroom. Deployment/upload fee quotes are
10,000/10,000/5,000 lamports for buffer/deploy/write. These are fresh quotes, not
actual deployment or application results. Per-operation checks remain active.

Source verification: 194 focused native/phase2/Devnet checks passed; 13 direct
binding/deadline/budget checks also passed and overlap that set. The initial new
binding test had a temporary-fixture cleanup-order error, corrected before signing;
its failed output is retained separately. No dependency or program rebuild occurred.

```sh
node scripts/machine-market/devnet-runner.mjs --execute \
  --manifest artifacts/machine-market/devnet-retry-run/execution-manifest.prepared.json \
  --state-dir local-state/machine-market/devnet-execution/devnet-retry-20261028 \
  --key-dir local-state/machine-market/devnet-execution/devnet-mvp-29fa8ffe-2206-4308-a29a-6547103eb962 \
  --key-manifest artifacts/machine-market/devnet-implementation/execution-manifest.prepared.json \
  --root-go user-2026-10-28-approved-retry-478-432-total-1400000000
```

Application deadlines seal once after verified deployment, then the same journal
reopens with the committed seal and executes D0/D1/D2. Original failed/expired attempts
remain preserved. An unresolved native result stops expansion until its original
signature is reconciled; no automatic fresh signature substitutes for uncertainty.
No mainnet, paid provider call, hosted change, extra keypair, GitHub push, additional
run or capacity increase beyond this approval is included.

Actual results will be appended after execution. Public artifacts are in
`artifacts/machine-market/devnet-retry-run/`; ignored private state stays local.

## Preserved expired write during upload

Write 235 was submitted once with signature
`22ZAPG9RSEnJF9w9i4oKWvrom4i3f8CaWHG41762M6SAUucQebjzdye4WhhLy2Dn9B2Y8qtAeSGrmCWdnnm5ea5x`.
The pinned provider returned no status/receipt, and its original blockhash expired.
The runner stopped expansion and retained the exact bytes, send intent and full
reservation. It did not automatically replace the signature.

The narrow recovery checks two distinct fresh finalized account contexts after
expiry: both must show no status or transaction, the exact expected payer balance
(no unknown fee), the intended byte range still zero while the ELF range is nonzero,
and every known finalized write still matching the ELF. Buffer owner, authority and
full data hash must agree across observations. If any condition fails, the original
Unknown reservation remains. This is same-provider proof, not independent-provider
proof. A successful proof archives the complete original attempt and observations
with zero actual fee before a fresh blockhash can be signed for that offset. The old
attempt and write slot remain in cumulative counts. No program, buffer, funding
cycle, key or cap is reset. Actual recovery proof is recorded separately if it passes.
