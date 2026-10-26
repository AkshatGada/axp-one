# Phase2 finite acceptance plan and bootstrap port

26 October2026. Packet03 manifest
`d77ac0f699a29dd89812137007f3ccb1cbf1d271dbcb738c66fd63c3736a3f3c`.
This builder authored source and local unit checks only. Lead owns all actual
validator/RPC/funding/process/native execution. Root currently pauses startup for
the pinned toolchain/listener decision; this plan records no native result.

## Exact bootstrap inputs

The harness generates its cases and expected outcomes; no caller-provided probe
fixtures, arbitrary proof labels or assertion callback is required.

Four Series/eight initial Units (the program's lifetime ceiling remains64):

| Series binding | Cap | Canonical resale policy | sponsoredPrice |
|---|---:|---|---:|
| main |4|(1,3)|6000 lamports |
| consume |1|(0,0)|10000 lamports |
| sponsored |1|(1,3)|10000 lamports |
| timing |2|(1,3)|10000 lamports |

Main's **ordinary** primary maker price is10000. Its separate sponsoredPrice6000
allows two distinct-unit6000 reservations against one10000 campaign, exactly the
60+60/cap100 vector at100x scale. That test aborts only proven never-signed matches;
it does not fund either Unit or mutate native escrow. U3 actual sponsorship is10000.
Bootstrap source hashes/format/bytes/version must agree with native Series exactly.

Unit bindings: U0=main/serial0, U1=main/1, U6=main/2, U7=main/3,
U2=consume/0, U3=sponsored/0, U4=timing/0, U5=timing/1.
The exported SERIES/UNITS in phase2-acceptance-schedule.mjs are authoritative for
this finite harness schedule; there is no invented liquidity/volume.

## Entry/context supplied by bootstrap/lead

`runAcceptance({configPath,context,execute:true,resume:false})` is exported by
`scripts/machine-market/phase2-acceptance.mjs`. Import/--help never reads keys/config
or performs RPC/signing/listening. Lead supplies the current verified run and:

- canonical local `rpc`/`observer` from the transport modules;
- `store`/`service` actual core/transport objects OR the fixed awaitable worker
  facades below; no reference store;
- the same disposable opaque `signers`/`nativeSigners` Map (or dedicated
  `acceptanceProbeSigners` alias) and synchronous
  `signAuthorization(actor,bytes)` W2 handle; no generation/discovery by harness;
- private `operatorToken`, actual bootstrap source bytes/repository;
- process `launcher` primitives stop/start/waitExit and actual resource readout.

Config schema `axp.market.acceptance.run.v1`: `packetSha256,runId,run,
programSha256,endpoint,serviceOrigin,privateRoot,journalPath,publicOutput?,
readValidUntilSlot,maximumWaitMs?,series,units,bootstrapAttempts`.
Series include id/address/cap/transferable/maxTransfers/useBySlot/resourceHash and
all native source metadata bootstrap retains. Units include id/address/series.
All amounts/slots are canonical decimal strings; public keys base58. bootstrapAttempts rows are `{id,state:'Signed',status:'finalized-success',
signature,transactionHash?}`; an unresolved bootstrap never starts acceptance.
All config,
source bytes, handles and databases stay in ignored local-state. Bootstrap must be
financially resolved before calling acceptance; unknown setup is not another run.

## Actual writer/process port

To prove a service AND sole SQLite-writer crash, use a child process:
1. Bootstrap/lead launcher opens the actual native store/service in that child.
2. Child calls `installAcceptanceCrash({store,armed:crashSpec,privateRoot,
   markerDirectory,kill:(pid,signal)=>process.kill(pid,signal)})` and
   `attachAcceptanceWorker({store,service,repository})` from assigned helpers. Bind
   the W6 handler to the returned `{service,gates}.service`; its fixed IPC gates
   hold only the declared cancel/bid request pair, leaving business logic unchanged.
3. Launcher start returns `{child,pid,identityHash}`; parent builds
   `remoteAcceptanceContext({child,baseContext,identityHash,pid})` (controller also
   normalizes this return automatically). All facade methods are awaitable. The
   private IPC whitelist exposes no arbitrary method/transaction/key endpoint.
4. `launcher.stop({preserveDatabase:true,preserveLedger:true})` gracefully closes
   the old writer and returns `{exited:true}`. `launcher.start({configIdentity,
   crashSpec?,recoverStaleLock})` reopens the SAME current DB/ledger/config/source;
   it never funds/resets or generates another identity. `waitExit({pid})` returns
   the actual `{pid,signal}`; expected SIGKILL is checked, not inferred.

`identityHash=SHA256(canonical({runId,run,programSha256}))`. Start must return that
hash. A child fixture repository can be created with
`createAcceptanceRepository({store,config,sources})`; sources are the exact
bootstrap-owned Map by Series address. The helper supplies the deterministic
fixture sponsor packet and deliberate source-unavailable/restore controls. Actual
packet/response/source bytes never enter the public output.

U7 fixed crash points: primary after signed persistence; resale after send;
Finalize after resolved DB commit before HTTP. The hook runs AFTER the actual
core method committed. Marker and same signed bytes/signature are verified after
SIGKILL/current-DB restart. Only the declared after-signed case explicitly resends
ORIGINAL bytes after reconciliation; no fresh blockhash/signature is generated.
The pre-signature fence death is a SEPARATE isolated child/SQLite test with no
handles, RPC or native transaction, before any shared-run funding. It leaves its
one fence quarantined; never pretend it is a safe unsigned abort.

## Native schedule and budget

U0: issuer→A10000→B15000→A8000, delivery success; U1 same trade chain, failure
refund to current A10000. Secondary cash14850/7920 and fees150/80 are final in
both cases. U2 consume-only primary with native positive-minimum refusal.
U3 negative-assessment sponsored primary, nontransferable, sponsor-directed refund.
U4 unused expiry; U5 locked150-slot timeout. U6 HTTP last-unit plus direct native
competing resales/resale-vs-Start; U7 two-Start race and three real process crashes.
All native direct probes are explicitly labeled acceptance-direct-program rather
than book price-discovery evidence. At most16 successful trades, within root24.

Predeclared signing allocation: bootstrap19 (Init1+Series4+Unit8+up to6 local
funding transactions), funding16, terminal17, probes30, reserve46 =128 total.
Planned allocation82 leaves46 for finite drain/reconciliation. Every failed or
unknown signed operation counts. Reserved slots and actual known signed attempts
are reported separately. Same-byte duplicate submission is not another signature.
No extra run/funding is authorized by this allocation. Operator<=10 LOCAL SOL;
four trading keys each<=10 LOCAL SOL; these remain ceilings, not measured balances.

## Concrete coverage and evidence

The factory builds signed authorization intents, HTTP shared-balance/same-nonce/
last-unit/cancel-sign cases, real current-DB price-time/rights filtering in BOTH
incoming directions, IOC/GTC, never-signed abort and wallet-watermark checks.
Native probes have a fixed catalog, independently rebuilt against verified native
Unit/Series/role data before the first signer call. Invalid issuance/minima,
wrong owner/refund holder, filled nullifier reuse, sponsored resale and deadline
refusals require actual finalized program errors and fee-only changes.

The dedicated acceptance sender uses skipPreflight:true ONLY for this declared
catalog, exact verified127 endpoint and immutable FULL-sync fenced signed bytes.
Normal service preflight stays enabled; no W6 route exposes the probe sender.
Native race candidates are both durably signed before either is sent; one actual
winner and one finalized rejection are required. Current native facts are synced
through core observeNativeUnit, never reference observations.

Each pass records its OWN assertions/evidence. Native proofs include original
signature/slot, account/instruction bytes, unique-key pre/post deltas, primary face,
fees/rent, <=1232 serialized bytes and measured<=200000CU. Account-state-only or
simulation rejection cannot become finalized transaction evidence. Direct race
seller/owner/claim changes and current-holder refunds are checked against the actual
program records. Public output is allowlisted and hashed; no private handles,
paths, content/packet/response bodies, DB rows or raw provider diagnostics.

The driver funds every timing right before expiry waits, starts/finishes ordinary
leases serially, and defers U7's FIRST response read until past useBy after the
resolved-before-HTTP crash. U0's later read matches its original response hash.
Actual deadline probe transaction slots are recorded; at-or-after execution is not
misreported as exact equality/E-1. Exact predicate boundaries also have preserved
Phase1 host evidence; the eventual result must disclose the observed native slots.

Unknown fee/native/fence outcomes stop expansion and retain obligations. Resume
uses original step/operation/nonce/bytes only; no reset, re-fund or replacement
signature. A completed step returns saved evidence; missing proofs keep completion
false. This source has not been run against a validator. Lead integration and one
actual bounded native run remain necessary after root's startup gate clears.


The acceptance-only signer port must authorize only the helper's independently
validated, FULL-committed exact probe message. It must not be an unrestricted
browser/model signer. A provider restricted exclusively to the ordinary service's
outbox needs a separate acceptanceProbeSigners binding to the probe fence; do not
weaken the service's authorizer. Both use the same disposable run key identities.

Integration review batch:21 offline tests pass. Literal native boundary equality
is not assumed: a measured at-or-after transaction with a different slot records a
partial equality case. Source is ready for lead integration; no native/HTTP run,
real SIGKILL service restart, funding or transaction evidence is claimed here.


Final handoff: source frozen,21 offline checks and16 script syntax checks passed.
The actual child launcher/bootstrap/runtime wiring and exact native slot equality
remain unexecuted gates; no runtime or funding is implied. Only lead-coordinated
H1–H5 verification/final regression/local commit follows this builder handoff.
