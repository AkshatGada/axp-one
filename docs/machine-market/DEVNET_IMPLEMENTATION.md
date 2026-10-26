# Devnet adapter and finite runner

The offline implementation was committed as `e49dec9`; its historical verification
record remains unchanged in `VERIFICATION.json`. The host binding and executable
entrypoint are now implemented. Exactly seven approved test keypairs were prepared
in ignored owner-only local storage, and the nonbroadcast host check confirmed all
eight public identities with the existing wallet unchanged: zero signatures and
zero broadcasts. Private bytes remain inside the host process.

On 27 October 2026 the user explicitly authorized finishing the documentation,
committing locally, and proceeding with this same bounded Devnet run without another
approval request within the agreed limits. The execution reference is
`user-2026-10-27-approved-bounded-devnet-run`. This is one run with the prepared
identities, at most 1.40 test SOL, and the fixed D0/D1/D2 plan. No additional run,
mainnet action, paid model call, hosted change or GitHub push is authorized here.

## MVP implementation and execution status

The core implementation passed 179/179 focused offline/native regression checks
(147 existing, 32 new). The host binding adds three passing checks. Fixture results
remain scripted Node evidence, not SBF execution or Devnet finality proof.

The public prepared manifest contains real identities, nonces and source hashes.
The executable seals deadlines once from the fresh finalized slot, verifies the
pinned Devnet genesis, then checks fresh accounts, balance, rent and fees before
signing. Actual live status belongs in `DEVNET_EXECUTION.md` and its evidence;
preparation and test success do not imply deployment or settlement.

**DEFERRED PRODUCTION WORK:** independent-provider verification, exhaustive deployment
failure/recovery drills, additional adversarial scenarios, production HTTP/UI integration
and operational polish, performance/load work, and a new controlled-bank timing harness.
The old exact-slot gaps remain documented; do not delay this narrow demo by relabeling
or attempting to close them here. Do not add infrastructure, another funded run, or
new tooling to improve confidence before the requested MVP handoff.

The real delay came from implementing/reviewing the deployment signing boundary and
then expanding recovery/validation coverage too far. Essential fixes were committing
a fence before a key callback, persisting exact signed bytes before send, counting
buffer rent recycling once, keeping unknown liabilities reserved, and correcting
validation-order/cached-receipt-slot defects. Several later safeguards are already
implemented and retained, but no further hardening is required for this phase closure.
An incomplete-handle test initially stopped earlier than its existing-program check;
its fixture was corrected to exercise both intended rejections rather than weaken a
guard. The final179/179 run includes that correction and the rejected-receipt archive.

## Implemented components

| Module | Responsibility |
| --- | --- |
| `devnet/manifest.mjs` | Exact HTTPS/genesis/ELF identity, separate role identities, immutable run/domain/PDAs, fixture/live separation and fixed limits |
| `devnet/legacy.mjs` | Bounded loader/System legacy messages, zero priority price, Ed25519 verification of every required signature and exact serialized bytes |
| `devnet/plan.mjs` | One new program,252 writes for the reviewed length, one Series/three Units, five exact Funds, three Starts/terminals, four declared zero-principal negatives, cleanup/fallback catalog and canonical W2 data |
| `devnet/journal.mjs` | One FULL-sync SQLite owner, aggregate attempts/budgets, native/W2 signing fences, immutable signed attempts, receipt observations, quarantines, response durability and sanitized archive |
| `devnet/rpc.mjs` | Separate literal `https://api.devnet.solana.com` transport; exact genesis/program/authority checks; no redirect/env/mainnet fallback; action-time send gate |
| `devnet/evidence.mjs` | Exact receipt bytes, signature/fee/CU/delta/loader authority checks; reuse of the existing native observer for marketplace effects |
| `devnet/runner.mjs` | Finite workflow, four-write waves, cash/authority/order barriers, consent/disclosure, owner-before-cache access, explicit recovery and end-state conservation |
| `devnet/resources.mjs` | Read-only canonical task/run storage measurement without following external symlinks |
| `devnet/host-signer.mjs` | One-run local key binding, exact durable-fence signing and existing-wallet integrity check |

The core modules and host-only signer live in `packages/machine-market/devnet/`. Existing
`native/rpc.mjs`, literal-loopback guards, ABI/domain rules, financial contracts and
compiled program are unchanged. The plan uses the existing codec, native message
builder, authorization verifier, response format and native observation/effect rules.
It is a fixed synthetic test driver, not another order book or production wallet API.

## Network, credentials and immutable authority

The production plan requires the exact reviewed241832-byte ELF SHA256
`3335158a895ac7f483c9cbbcc4470e95e65098c54c7da1b7be4733b0594fea1a`, upgradeable loader,
Devnet genesis `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG` and existing payer
`D7GzU2o43V4whHJG1pv7k1o3UTU9yuC3Hohp1mdii6ST`. The payer aliases initializer,
matcher and gateway; the issuer, buyers A/B, sponsor, collector, new Program and buffer
are distinct. State PDAs cannot masquerade as wallet roles. Initial account checks
reject any nonfresh program, buffer, trading identity or target state address.

Production construction requires all of: a resolved immutable public manifest, explicit
financial ROOT GO/reference with key preparation no longer pending, a manifest-bound
local capability set covering exactly eight public keys, and an action-time gate. The
gate separately approves authorization signing, native signing, sends and explicit
same-byte resends. The host-only adapter reads the existing wallet without rewriting
or copying it, derives its public identity, and binds the seven prepared keys.
There is no generic raw-message signer or signer HTTP endpoint.
Only declared action IDs compile, and persisted intent/signature bytes are revalidated.

Fixture mode must be explicit, uses a synthetic ELF marker and an injected transport,
and rejects the approved existing D7 payer. Fixture results are labeled
`injected-offline-rpc`/liveEvidence:false. Production cannot select a fixture transport.
Default missing approval denies signing/submission. `--execute` requires the explicit
authorization reference before any manifest, key or network access. The current
user instruction supplies that authorization for this one bounded run.

## Durable boundaries and recovery

Every prepared action reserves aggregate capacity before signing. A FULL-sync native
Signing fence is committed before the first opaque callback. All signatures verify
against the exact compiled message and ordered required keys; complete serialized
bytes commit before SendIntent. The submission gate rechecks the same persisted bytes,
manifest, endpoint, genesis, blockhash validity and action type. Only the four exact
negative probes may skip preflight. Normal marketplace and deployment sends use it.

W2 signing has its own committed fence and64-message ceiling. A native or W2 Signing
state reopened after process death is quarantined, even when no complete signature was
saved. No unsigned reset/new signature is inferred from missing bytes. Signer failure,
post-signer storage failure, stale lock, mutated intent and unrelated databases are
explicit refusal paths. Existing databases are opened for a read-only identity check
before writable pragmas/schema changes; an unrelated financial database is not reused.

Writes are admitted/signed in waves of at most4 before that wave sends. An unknown
stops the next wave and new signatures; all already-admitted attempts retain full fee/
rent/principal reservations. Reconcile the original signature first. Only an explicit
resend of the same valid bytes may follow a fresh unknown observation. Expired or
uncertain bytes are not re-signed with another blockhash, moved to another buffer or
silently rerun. Every action/public identity remains in the original manifest/journal.

Finalized receipt observations are archived **before** proof validation. Rejected or
conflicting observations remain marked unverified and do not release costs. Successful
proofs bind the exact transaction/signature/meta, monotonic observation slot, fee/rent
and native/loader effects. Unknown holds do not shrink because account state looks
plausible. Terminal costs cannot change or be downgraded. Missing/invalid receipts halt
rather than manufacture finality. This does not promise future RPC retention or an
independent provider: full bytes/receipts and rejected observations remain local.

## Bounded cases and accounting

The compiled catalog implements the review packet's three cases:

- D0: primary10000, resale15000, owner B Start/Finalize, issuer9900/fee100; old A is
  rejected before private cached bytes are accessed; B receives identical response
  bytes on replay.
- D1: primary10000, resale15000, Start/source failure and10000 refund to current B;
  settled secondary seller14850/fee150 is not clawed back; no response bytes release.
- D2: sponsor10000 for A with negative assessment, exact packet/unit/amount and
  pre-consent Sponsored acknowledgement; source failure refunds sponsor10000. The
  consumed allowance remains10000/available0 after refund. This is a sponsored refund
  case, not successful sponsored-body delivery.

The disclosure callback must acknowledge the exact manifest, beneficiary, packet hash,
Unit, amount, assessment and Sponsored label; the acknowledgement commits before the
beneficiary signer. Decline before any native fence leaves a preserved DeclinedUnsigned
tombstone, creates no transaction/grant and releases only unused fee/rent/grant holds.
It does not delete the request or create another candidate. The fixed catalog has no
second sponsored grant, even after its wallet refund. This callback is a structured
integration contract, not evidence that a human understood a disclosure.

The four native negatives are wrong owner, missing owner signature, foreign Unit
account and stale Start cursor, all on D0 before its real lease. They have zero new
principal. Sponsor resale/order-reuse refusals in this fixed driver are policy/consent
and current-state assertions; this phase does not claim new Devnet HTTP or native
adversarial-Fund proof. Existing local evidence stays separate.

| Bound | Enforcement |
| --- | --- |
|300 native attempt slots /256 writes|Aggregate immutable journal; the fixed reviewed catalog has252 upload writes and288 total possible actions including conditional cleanup|
|64 W2 authorizations|Separate durable authorization table; exact known IDs only|
|0.015 SOL fees /50000 per transaction|Full50000 held per prepared native action until known actual fee; distinct failures/fences count|
|1.30 SOL rent|One combined ledger across buffer, deploy and application|
|0.081 SOL fixture capital|Four×0.02 plus collector0.001; sweeps never replenish allowance|
|60000 gross /30000 primary deposits /five Funds|Exact declared trade catalog; no extra Fund for a negative test|
|1.40 SOL peak|Fee/rent/fixture allocations plus current wallet rent reserve; no credit from later payouts/refunds|
|>=40GB free /20GiB task /50MiB app|Required resource probe plus physical journal/page/WAL guards|

Deployment accounting checks that buffer funding is recycled atomically into
ProgramData. It does not charge the same1.2293854 SOL twice. The full-size fixture
asserts rent1276985000, fees1535000, fixture funding81000000 and gross60000 lamports,
with284 signed fixture transactions. This is **assertion evidence from a scripted
fixture**, not money spent. Final checks require three terminal primary receipts with
rent-only balances, no remaining principal escrow, swept fixture wallets, native counts
1/3/5 and exact payer conservation. Observed payer drift blocks another signature.

A current rent change, authority change, program collision, fee/CU/size mismatch or
unresolved result stops expansion. Optional explicit timeout drains concern only
already funded/locked rights after known outcomes and do not pass the intended case.
No automatic timeout, new Unit, extra funded run, program upgrade or authority transfer
is added. Program/application rent is retained after the successful path, not silently
closed/refunded; a buffer close is only for a known safe aborted deployment.

## Verification and honest limits

`tests/machine-market/devnet.test.mjs` uses ephemeral test KeyObjects and a scripted
RPC/bank fixture. It verifies FULL-committed fences from another SQLite connection,
all five native Fund effects through the existing observer,252 loader writes, exact
rent recycle, four-signature sponsorship, disclosure/decline, balance and phase-order
barriers, unknown/resend behavior, metadata quarantine, physical/process-death recovery,
resource boundaries and archive privacy. Its fixture ELF is explicitly synthetic;
production validation still requires the reviewed hash. The fixture is not an SBF
interpreter or cluster simulator, and its CU numbers are not real-program measurements.

The focused regression command is recorded with counts/hashes in
`artifacts/machine-market/devnet-implementation/`. The earlier full-repository benchmark
wall-clock timing assertion failure remains recorded; this phase does not claim a full
repository green run. The offline checkpoint used no heavy dependency/tool install,
live key loader, validator, public simulation, real transaction or paid provider.
The later host-binding check loaded identities locally without signing; live execution
is recorded separately.

The old local38/40 proof status, two exact-slot gaps and2-current-RPC/63-retained-history
classification are unchanged. New offline tests do not close or relabel them. All
previous native execution evidence and the Devnet review packet remain byte-for-byte
unchanged. No source or private configuration upload occurred; all work stays local.

## Prepared execution

See [the execution record](DEVNET_EXECUTION.md) for the exact command and public
manifest. Key preparation and public binding are complete; do not regenerate keys.
Deadlines are intentionally absent from the prepared manifest and sealed once from
the fresh finalized Devnet slot. A resumed run retains the original sealed manifest,
identities, journal, signed bytes and liabilities. Unknown outcomes stop expansion;
reconciliation must resolve the original attempt before any dependent action.

The existing wallet is loaded only by the host adapter and is checked unchanged on
close. No private key is printed, committed, transmitted or persistently converted.
Live loader compatibility and actual compute usage are established only by actual
network receipts. No feature-verification bypass, faucet, endpoint fallback, priority
bump or additional funded run is part of this command.
