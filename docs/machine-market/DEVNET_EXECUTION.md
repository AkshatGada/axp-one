# Bounded Devnet execution — 27 October 2026

User authorization: “finish the docs and commit then go ahead with the approved
devnet run, dont ask me for approval again within the agreed limits”.
Reference: `user-2026-10-27-approved-bounded-devnet-run`.

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
