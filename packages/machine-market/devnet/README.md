# Explicit Devnet implementation

See [the implementation and limits](../../../docs/machine-market/DEVNET_IMPLEMENTATION.md)
and [the execution record](../../../docs/machine-market/DEVNET_EXECUTION.md).

The runner requires a pinned manifest, exact ELF/owned content, private journal,
resource measurements, scoped host capabilities and an action-time execution gate.
The one-run host adapter binds the existing wallet and exactly seven prepared keys;
private bytes remain local and existing wallet files remain unchanged. Fixture mode
is explicit and cannot use the approved live payer.

`node scripts/machine-market/devnet-runner.mjs --manifest-template` is read-only.
`--check-binding` checks public identities without signing or network access.
`--execute` requires the explicit authorized execution reference and runs the fixed
D0/D1/D2 plan within its aggregate limits. See the execution record for its command.

Preserve original loopback guards. Fixture results do not establish Devnet finality,
network capacity or closure of the old local exact-slot gaps.

The approved original run is now terminal: it stopped before deployment, and its
buffer collateral was fully returned. Do not rerun or redeposit using that sealed
manifest. The execution record preserves the incomplete outcome and actual fees.

The local timing correction uses a deferred `after-deployment-v1` manifest. The
launcher calls `deploy()`, saves `sealApplicationDeadlines()` after verified finality,
then reopens the same journal with that immutable seal and calls `runApplication()`.
Unsealed application messages/signatures are refused. Restarting cannot extend the
application window. The [retry review](../../../docs/machine-market/DEVNET_RETRY_REVIEW.md)
records the unchanged aggregate money cap and proposed cumulative capacity change;
this code patch does not authorize or start a replacement run.

The proposed retry's live deferred manifest must carry the original 875,000 lamports
of fees. The journal counts them before signing in both aggregate fee and peak
checks; current payer conservation excludes that historical debit from being charged
twice. The total 1.40 SOL allocation and 0.015 SOL fee ceiling are unchanged.

The explicitly approved 28 October retry is now complete: exact program deployment,
D0/D1/D2 and cleanup passed. Aggregate net spend including the original fees is
1.279395 test SOL; cumulative capacity used is 463 attempts/429 writes. See the
[verified execution record](../../../docs/machine-market/DEVNET_RETRY_EXECUTION.md).
`node scripts/machine-market/devnet-retry-verify.mjs` repeats read-only verification
without keys, signing, submission or overwriting proof.
