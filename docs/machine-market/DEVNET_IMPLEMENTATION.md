# Devnet adapter and finite runner — offline implementation

The ROOT-authorized implementation/offline-verification phase is complete. The new
adapter, fixed loader/application plan, aggregate signing journal, evidence verifier
and D0/D1/D2 runner are implemented. **No live operating key was loaded, persistent
execution key created, Devnet simulation/broadcast/deployment performed, or GitHub
push made.** Cryptographic tests used ephemeral fixture keys and injected RPC only.
The fixture bank is a scripted Node model, not SBF execution or Devnet finality proof.

The approved allocation remains **up to1.40 test SOL for this one run**. Allocation is
not the next phase GO. The checked-in execution template has pending identities and
financialRootGo:false; the CLI has no live execution route. A JSON approval flag alone
cannot authorize a signer or submission.

## MVP closure: demo blockers and deferred work

The final code passed179/179 focused offline/native regression checks (147 existing,
32 new). No code changes followed that pass; this closure adds documentation and the
manifest/evidence inventory only. There is no known failing bounded-demo test.

**DEMO BLOCKERS:** the real existing operating key has not been opened/bound; seven
execution identities do not exist yet; the public manifest needs their actual keys,
nonces/content hashes/deadlines; a reviewed host-only signer capability and action-time
execution gate must be bound; ROOT must issue the real execution phase GO. Allocation
up to1.40 test SOL is already approved and must not be requested again. Refreshing the
normal network/rent/fee/balance preflight is part of execution, not another broad audit.

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

All eight modules live in `packages/machine-market/devnet/`. Existing
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
same-byte resends. There is **no loader for the existing wallet/secret configuration**
in this implementation. There is no generic raw-message signer or signer HTTP endpoint.
Only declared action IDs compile, and persisted intent/signature bytes are revalidated.

Fixture mode must be explicit, uses a synthetic ELF marker and an injected transport,
and rejects the approved existing D7 payer. Fixture results are labeled
`injected-offline-rpc`/liveEvidence:false. Production cannot select a fixture transport.
Default missing approval denies signing/submission. `--execute` is rejected by the
review/template CLI; it cannot create keys, open a wallet or contact an RPC.

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
repository green run. No heavy dependency/tool install, live key loader, validator,
public simulation, real transaction or paid provider was used.

The old local38/40 proof status, two exact-slot gaps and2-current-RPC/63-retained-history
classification are unchanged. New offline tests do not close or relabel them. All
previous native execution evidence and the Devnet review packet remain byte-for-byte
unchanged. No source or private configuration upload occurred; all work stays local.

## Concrete next secure preparation step — still gated

The checked-in [execution template](../../artifacts/machine-market/devnet-implementation/execution-manifest.template.json)
contains seven pending public identities and pending nonce/source/deadline fields.
Before a live caller can be constructed, a separately authorized Root phase must:

1. Approve preparation of the seven new opaque handles in one private owner-only run
   directory. Do not overwrite/copy/convert the existing credential file or use CLI
   ephemeral recovery-mnemonic defaults. Preserve existing routes, encryption and
   hosted/key configuration.
2. Through a reviewed local host-only adapter, derive/check the existing operating
   public key D7 and all seven new public keys **before funding**. Do not trust metadata
   labels alone. The model needs only public identities, hashes and permission status;
   no seed, secret JSON, private-key export or generic signing capability is exposed.
   The callback interface is synchronous Ed25519; confirm the existing opaque local
   signer can supply it without persistent format conversion.
3. Fill/pin the immutable public manifest, fresh Market nonce/Series ID, owned synthetic
   content/packet hashes, deadlines and exact role/authority bindings. Verify target
   accounts/PDAs are fresh. Review the full unsigned loader and native messages,
   beneficiary's four-signature sponsored Fund and four precise probe exceptions.
4. Bind `capabilities.assertManifestBinding` and `executionGate.assertAllowed` to the
   actual action-time/root approval and a run-specific allocation/owner lease. Do not
   copy the fixture's always-allow gate into live code. Bind the real task/run resource
   probe and exclusive payer accounting. No live launch/key-binding helper is supplied
   by this offline phase.
5. Refresh public genesis, feature/ELF-loader compatibility, fee/rent and allocated
   balance. Rent is queried again before signing/sending relevant commitments; live
   loader acceptance and actual CU remain unverified until the authorized deployment.
   No skip-feature-verify, mainnet, faucet/top-up, priority bump or endpoint fallback.
6. ROOT separately reviews the actual prepared manifest/key capability and gives the
   financial execution GO/reference before any real signature or deployment. Allocation
   up to1.40 is already approved; do not ask for that same allocation again. Changed
   scope/caps or incompatible credential access is a new decision, not a silent bypass.

This phase stops at the local implementation/review checkpoint. There is no automatic
key preparation, financial run or GitHub push after its tests finish.
