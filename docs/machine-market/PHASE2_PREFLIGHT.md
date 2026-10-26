# Phase 2 preflight — startup blocked

26 October 2026. Starting commit 075af84ae2c99491d00d807c547a81e2a54bc79b,
Packet03 manifest d77ac0f699a29dd89812137007f3ccb1cbf1d271dbcb738c66fd63c3736a3f3c.
The validator has NOT been started and no fixture wallet, genesis, funding or native
operation has been created by Phase2 preflight. Source/unit work can continue.

## Pinned tool conflict with literal loopback constraint

Installed official `solana-test-validator --version` reports 4.3.2, source a2033000,
feature c9ad34d2. Its `--help` exposes validator bind-address and faucet-port/caps but
no faucet bind-address or disable-faucet flag. The exact tagged CLI source sets the
faucet socket IP to `Ipv4Addr::UNSPECIFIED` and starts it unconditionally. Thus
`--bind-address 127.0.0.1` alone cannot enforce the root's literal-loopback listener
requirement. Port zero or faucet balance zero does not change that bind address.

Primary source:
https://github.com/anza-xyz/agave/blob/v4.3.2/validator/src/bin/solana-test-validator.rs
Relevant lines:189 (faucet address),307–358 (unconditional faucet startup).
This is source/help evidence; no deliberately nonconforming process was launched
to reproduce the listener. There has been no automatic tool upgrade, binary patch,
network-control change or replacement compiler build.

A compliant next step requires scoped root review of a supported alternative or a
reviewed toolchain correction that binds the faucet to loopback as well. A custom
validator build must first fit the existing tool/cache/build budgets or obtain a
specific budget adjustment. Relaxing the listener requirement, interposing/patching
the binary or changing host firewall rules is not silently authorized here.

The library also hardcodes both RPC HTTP and PubSub listeners to wildcard IPv4
at `test-validator/src/lib.rs` lines1101–1109. This makes the blocker broader than
the faucet alone: changing only the faucet would not meet the literal-loopback
contract. Both call sites need a supported configuration or reviewed correction.

## Other source-confirmed startup details

The same CLI's `--bpf-program` creates an upgradeable-loader representation with a
zero upgrade-authority public key. ProgramData metadata still encodes Some(zero),
not None. Verify actual owner, executable flag, canonical ProgramData address,
metadata and full ELF hash before admitting signatures; do not assume a legacy
loader merely from the flag name. Sources: CLI lines210–220 and
https://github.com/anza-xyz/agave/blob/v4.3.2/test-validator/src/lib.rs lines887–930.

The library creates a large default mint account plus validator-internal staking
accounts. Never use one of the bounded operator/trading keys as that mint. Any
future conforming setup must separately constrain fixture allocations to the
approved amounts; validator-internal genesis supply is not marketplace funding.
No setup has yet been chosen or executed.

## Work allocation

Supported resume calls accepted host local and explicit gpt-6.1-sol/high:
- Core 01a176a1-c7c9-7f92-97b9-b1f3cdf9403f: trading signing fence, manual complete
  legacy transaction encoding/signature verification, durable operation outboxes.
- Transport 01a176a4-2fd1-7662-a604-dd1e63a11a73: RPC run verification, authoritative
  observations, private delivery durability/recovery and loopback service.
- Program 01a176a2-5fe2-77e1-b4a1-32faa5d907be: finite resumable acceptance harness,
  test budget and runbook. No validator execution or speculative Rust changes.
Lead owns integration, all heavy builds/validator/funding and Git. Workers may run
local unit tests only. Execution-directory checks are recorded separately once
commands are observed; accepted settings are not a claim of runtime-model introspection.

Lead verified all three workers are active and their actual command executions use
`/Users/akshat/agentic-dsp/.worktrees/axp-machine-market`. No model introspection was
available beyond the explicit accepted resume settings.

## Reviewable correction proposal, not applied

`artifacts/machine-market/phase2/proposed-loopback-source.patch` shows the three
specific socket-address substitutions against the exact v4.3.2 source locations.
It has not been applied, compiled, or used; no corrected binary or changed pin is
claimed. Root review would need to authorize an isolated official-source rebuild
and its measured resource budget, then require a new binary digest and actual
listener verification before any fixture funding. No host firewall or other app
settings are part of this proposal. Existing validator flags still explicitly bind
its other protocols to literal127.0.0.1, with no cloning/entrypoint/external RPC.
