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

**Completed: deployment, D0/D1/D2 and cleanup all passed.** See the verified result below. Public artifacts are in
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

## Verified completed result

The retry completed 284 on-chain transactions: 280 successes and the four exact
expected rejection probes (Custom 2/2/2/6). All 252 upload chunks finalized, then
the exact reviewed program deployed at slot 515941548 with signature
`3cVenmit7R4eauGLjti9X5q2m6eB516e81JMKRNE61T5kjG7chDspBqzgGUvp2Zwi47961RE35P4dw52FcvUMvNV`.
Program: `13pUf2FAc5db74eBie9pPhikg891RGTRZpwYABAQz2fz`. ProgramData:
`8AiVc3Lta4BY8K6eBopb7j9wMsN6uc43Q3w2UTEfTCAE`; authority remains the approved D7
payer. The ELF hash is unchanged and read-only inspection verified exact bytes with
zero padding. No old deployed program was modified.

Application deadlines sealed at finalized slot 515941559, after deployment: useBy
515947559 and read-valid 515951559. Upload and its recovery consumed no application
window. The immutable seal persisted in the same journal and public sidecar.

| Case | Actual result |
| --- | --- |
| D0 | Primary 10,000 lamports, resale 15,000; native delivery finalized; Unit Consumed/cursor 4, primary Paid. Current-owner exact response replay and old-owner rejection assertions passed. |
| D1 | Same purchase/resale, then source-failure refund; Unit Refunded/cursor 4 and original 10,000 primary refunded to current buyer B. |
| D2 | Sponsor paid 10,000 for A with disclosure/consent and the declared negative assessment; native sponsored flag 1, no resale, source-failure refund to sponsor, Unit Refunded/cursor 3. |

Five Funds record 60,000 gross lamports and 30,000 primary lamports. Final native
Market counts are one Series, three Units and five funded matches. Each primary
account retains only its 3,794,760-lamport rent reserve: zero principal escrow. D2
consumed allowance is 10,000, refund 10,000 and available allowance zero; refund did
not replenish its campaign budget. D2 does not claim successful sponsored-body delivery.

All five test wallets were swept to zero. The upload buffer was recycled into the
new ProgramData, not funded again. No additional keypair was created. The original
journal hash remains unchanged, and the existing wallet integrity checks passed.

| Aggregate accounting across original run and retry | Actual | Approved ceiling |
| --- | ---: | ---: |
| Native attempt slots, including preserved non-executed attempts | 463 | 478 |
| Loader write slots, including expired attempts | 429 | 432 |
| Finalized on-chain transactions | 458: original 174 + retry 284 | Slots counted separately |
| W2 authorizations in retry | 16 | 64 |
| Prior fees | 0.000875 test SOL | Included in total |
| Retry fees | 0.001535 test SOL | Included in total |
| Aggregate fees | 0.002410 test SOL | 0.015 |
| Retained program/application rent | 1.276985 test SOL | 1.30 new rent |
| **Aggregate net spend including prior fees** | **1.279395 test SOL** | **1.40** |
| Conservative reservation peak, including fixture capital and wallet reserve | 1.36104524 test SOL | 1.40 |
| Remaining principal escrow | 0 | 0 at completion |
| Unresolved native/W2 outcomes and active writer owners | 0 / 0 / 0 | 0 at completion |

The original payer balance of 4,379,560,920 lamports fell to 3,100,165,920: the
1,279,395,000-lamport difference exactly equals aggregate fees plus retained rent.
Prior fees count once. The remaining allocation headroom is 120,605,000 lamports
(0.120605 test SOL); this completed run does not automatically start another run.

Write 235 recovery passed at distinct finalized contexts 515940919/515940929. Both
showed expected payer balance 3,148,115,520, absent original transaction/status,
untouched target bytes and all known chunks intact. Exact original transaction
bytes/send intent and proof were archived before that offset was re-signed. The
old attempt still counts and its signature remained absent at final verification.
It incurred zero actual fee; no counter or budget was reset.

The saved result and fresh read-only verification are:

- `artifacts/machine-market/devnet-retry-run/live-result.json`
- `artifacts/machine-market/devnet-retry-run/live-verification.json`
- `artifacts/machine-market/devnet-retry-run/application-deadlines.sealed.json`
- `artifacts/machine-market/devnet-retry-run/expired-write-235-recovery.json`

Read-only verification recompiled and cryptographically verified every retry signed
transaction, including the archived expired write; refreshed all 458 signatures'
finality/expected errors; inspected program, market and terminal accounts; confirmed
zero fixture-wallet/primary principal balances; and reproduced payer conservation.
This uses the same pinned public provider and is not independent-provider proof.
No fixture count is presented as chain execution or production capacity. The old
local exact-slot/history gaps remain unchanged.

To repeat the read-only check without modifying an existing proof:

```sh
node scripts/machine-market/devnet-retry-verify.mjs
```

Optional `--output NEW_FILE.json` saves a new proof and refuses to overwrite an
existing file. The verifier opens journals read-only and never loads private keys,
signs or submits transactions. Sources/keys/private journals remain local; no
GitHub push, mainnet action, paid model call, hosted deployment or extra run occurred.
The final verification sample recorded 147,893,862,400 free bytes, 7,982,485,504 task
bytes and 4,304,896 app bytes; all resource ceilings/floors passed.
