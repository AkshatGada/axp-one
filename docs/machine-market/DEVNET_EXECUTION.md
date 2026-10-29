# Bounded Devnet execution — 27 October 2026

User authorization: “finish the docs and commit then go ahead with the approved
devnet run, dont ask me for approval again within the agreed limits”.
Reference: `user-2026-10-27-approved-bounded-devnet-run`.

**Final status: stopped before deployment; original buffer collateral fully refunded.**
The D0/D1/D2 demonstration is incomplete. See the verified outcome below.

Status before execution: seven approved local keys prepared; eight public identities
confirmed; existing wallet unchanged; zero live signatures or broadcasts. The core
regression suite passed 179 checks and the host-binding suite passed three checks.
Execution results will be appended after the actual attempt.

Prepared public manifest:
`artifacts/machine-market/devnet-implementation/execution-manifest.prepared.json`
SHA256 of canonical manifest:
`103bed71c26a9a9bad0ee208a2abc8f8508309d336d66b1addeb12671ea2e2d9`.
New program: `13pUf2FAc5db74eBie9pPhikg891RGTRZpwYABAQz2fz`.

Run from the isolated machine-market worktree:

```sh
node scripts/machine-market/devnet-runner.mjs --execute \
  --manifest artifacts/machine-market/devnet-implementation/execution-manifest.prepared.json \
  --state-dir local-state/machine-market/devnet-execution/devnet-mvp-29fa8ffe-2206-4308-a29a-6547103eb962 \
  --root-go user-2026-10-27-approved-bounded-devnet-run
```

The fixed run uses one new program, one Series and three Units D0/D1/D2. Limits:
300 aggregate native attempt slots, 256 loader writes (252 planned), 64 W2
authorizations, 1.30 SOL rent, 0.015 SOL fees, 50,000 lamports per transaction,
0.081 SOL fixture funding, 60,000 lamports gross and 30,000 primary across five
Funds, at most 1.40 test SOL peak. These are ceilings, not measured outcomes.
Resources remain bounded to 20 GiB task and 50 MiB app storage with free-space
checks. No new keys, extra run, mainnet, paid API, hosted write or GitHub push.

The fresh preflight verifies genesis, fresh identities, funding, rent and fees.
Deadlines seal once. Every real attempt and unresolved liability survives in the
private journal; unresolved outcomes stop further expansion. Public evidence
separates successful, expected failed and unknown receipts, fee/rent/principal,
program deployment and application effects. Original local evidence is preserved.

## Initial live attempt and preserved recovery

Integration commit: `b0597f8`. The first buffer creation finalized successfully:
`4RLYuKTCDHSrdAdsPmShS3FouBHXLRcoMC4cSMmLJ8h5XD6jZPmkznT2mNPs6JUTsd27r6YyTVVAmrXihkdG8p1a`,
slot 515430396. Buffer collateral: 1,229,385,400 lamports; fee: 10,000 lamports.
A later RPC failure stopped upload preparation before any loader write was sent.
Three writes were signed and one was prepared. All four original blockhashes
expired with zero durable send intents. These attempts must remain preserved,
including exact signed bytes and their original slot reservations.

The direct recovery correction paces live requests and adds explicit expiry recovery
only for never-submitted loader writes. Recovery checks the original blockhash is
invalid, finalized height exceeds its validity, and no transaction exists for the
original signature. It archives the complete original row and proof before admitting
a fresh attempt. Archived attempts continue to count toward the same 300-attempt
and 256-write ceilings. No submitted/unknown transaction qualifies. No funded
application obligation, identity, budget or deadline is reset.

Explicit recovery uses the same command arguments with `--recover-expired-unsent`
in place of `--execute`; then `--execute` resumes the same sealed run. This is
within the user's authorization to complete the run inside the agreed ceilings.

Recovery verification: all 184 focused native/phase2/Devnet/host-binding checks passed,
including exact original-byte preservation and refusal of any submitted attempt.
See `artifacts/machine-market/devnet-implementation/RECOVERY_VERIFICATION.json`.

## Verified outcome — stopped and financially reconciled

The run stopped at a completely settled wave after 172 of 252 upload writes.
At the latest quote only 410 slots remained before the original sealed useBySlot
515436371; the remaining 80 writes plus deployment and application cases could not
fit. The deadline was never extended. The owned runner was interrupted only when
all admitted operations were finalized, leaving no unknown or signing quarantine.

The declared `buffer:close-aborted` action finalized at slot 515436248, signature
`65okk2zxd3H9CAGYFRoxpWCwzRt6dYKtj16HuB656JjTDoD1KzwJJGoQ5PS4ess3xvJNgMrTPdFf3B5oxxDv6BHe`.
It returned all 1,229,385,400 buffer lamports; close fee was 5,000 lamports.

| Measured result | Actual |
| --- | --- |
| Finalized transactions | 174: buffer creation, 172 writes, buffer close |
| Aggregate attempt slots | 178 of 300, including four archived expired unsent slots |
| Aggregate write slots | 176 of 256: 172 finalized and four expired unsent |
| Actual fees / net payer spend | 875,000 lamports = 0.000875 test SOL |
| Buffer collateral deposited / returned | 1,229,385,400 / 1,229,385,400 lamports |
| Remaining buffer collateral | 0 |
| Initial / final payer balance | 4,379,560,920 / 4,378,685,920 lamports |
| Fixture funding / gross trades / primary funding | 0 / 0 / 0 |
| Program deployment / completed application cases | No / none |
| Unresolved native outcomes / writer owners | 0 / 0 |

Read-only verification from the same public provider confirmed every one of the
174 signatures finalized without error, all three original expired signatures absent,
and every nonpayer run account absent, including buffer, program, ProgramData and
application addresses. This is a fresh read from the same provider, not independent
provider proof. Payer conservation exactly equals actual fees. The journal's rent
total is historical gross allocation; the separate close receipt proves its full
return and zero retained collateral.

Public evidence:
- `artifacts/machine-market/devnet-implementation/live-abort-result.json`
- `artifacts/machine-market/devnet-implementation/live-abort-verification.json`
- `artifacts/machine-market/devnet-implementation/initial-live-reconciliation.json`
- `artifacts/machine-market/devnet-implementation/expired-unsent-recovery.json`
- `artifacts/machine-market/devnet-implementation/execution-manifest.sealed.json`

The original local evidence hashes are unchanged. The existing wallet remained
unchanged through the host signer integrity checks. Private keys/journal remain
ignored; no GitHub push, paid provider call, production change, new program identity
or second funding cycle occurred. The final resource sample was 148,072,939,520 free
bytes, 7,981,547,520 task bytes and 3,284,992 app bytes.

This original run is terminal after buffer closure and expiry. Do not rerun its
execution command, redeposit, reset its journal, or claim deployment/D0/D1/D2 proof.
The actual blocker is the deadline sealed before upload; RPC pacing and the initial
recovery left insufficient time for the full fixed workflow. Completing the demo
requires a separately scoped plan addressing that timing boundary; no such run
was started automatically.
