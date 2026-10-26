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
