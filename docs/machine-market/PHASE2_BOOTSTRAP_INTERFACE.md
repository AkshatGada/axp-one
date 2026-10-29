# Phase2 bootstrap helper — early integration interface

26 October 2026. SOURCE/UNIT ONLY here; lead alone executes runtime. The patched
validator/compiler is paused pending approval. This helper does not launch, patch,
install or discover a validator, key, endpoint or existing wallet configuration.

`phase2-bootstrap.mjs` exports `createBootstrapDriver(dependencies?)` with
`create(options)` and `resume({directory,execute:true,recoverStaleLock?})`.
Both require explicit execution. CLI/import/--help has no external effect.

Runtime creation options:
`{execute:true,directory,runId,endpoint,serviceOrigin,genesis,program,programBytes,
programDeployment?,sources,deadlines,readValidUntilSlot,probes?,maximumWaitMs?,
resources}`.
- directory is the explicit new ignored `local-state/machine-market/<runId>`;
  existing directory refuses, no overwrite/re-key/new-run fallback.
- genesis is32-byte lowercase hex, program canonical base58; programBytes is the
  already built/loaded exact ELF supplied by lead. Endpoint is literal canonical
  `http://127.0.0.1:<port>`. Already-running genesis/program/loader/exact bytes and
  resource caps are verified before any funding request.
- sources has main/consume/sponsored/timing entries `{content,version,format}`;
  content is owned exact UTF-8 string/Buffer <=16KiB. Private source files and
  canonical sponsor packet are immutable. No corpus/export/URL fallback.
- deadlines has the four exact u64 useBySlot strings; readValidUntilSlot is later.
  Four Series caps4/1/1/2 and Units U0–U7 follow PHASE2_ACCEPTANCE_PLAN exactly.

Creates one immutable bootstrap manifest, six disposable Ed25519 handle files0600,
a private operator capability, one native-mode SQLite DB and one durable bootstrap
journal. Airdrop plan is operator5LOCAL SOL, four traders1each, collector0.001.
Each request's intent/signing-slot reservation is fsynced BEFORE its one request;
unknown request/signature stops expansion, never retries/refunds/rekeys. Finalized
original funding transactions/signatures/unique-key deltas must verify before next
step. Funding signatures count in global128 and setup19 ceilings.

Then actual core/service/outbox calls execute Init + four IssueSeries + eight
RegisterUnit. Exact operation IDs are journaled before effects. Resume observes
original prepared/signed identities and never refreshes a persisted blockhash or
automatically resends/re-signs an uncertain operation. Current intact DB/run only.

Successful runtime result:
`{config,configPath,bootstrapAttempts,bootstrapProof,context,close}`.
Config is directly compatible with `validateRunConfiguration` / runAcceptance.
Context contains actual `{store,rpc,observer,service,repository,acceptanceRepository,
signAuthorization,nativeSigners,operatorToken,control}`; HTTP listener/process
launcher/probe controllers remain lead-owned. Authorization/native functions are
opaque handles; native handles only sign the exact currently committed Signing
fence. bootstrapAttempts retain original signatures/evidence and count19 on the
ordinary six-funding/thirteen-native setup. Public inspection uses an explicit
allowlist and excludes private paths/key bytes/capability/source/packet bytes.

Dependencies permit injected fetch/resource measurement and temporary private parent
ONLY with explicit `provenance:'injected-unit-fixture'`; such results have
nativeEvidence:false and cannot be presented as actual bootstrap execution.
Runtime uses actual createLocalRpc/createTradingStore/createNativeService/observer.
Detailed methods/results and executed unit checks will be appended on completion.

## Acceptance coordination refinements

Main Series sponsoredPrice is6000; ordinary maker trades remain10000. Other three
Series sponsoredPrice is10000. The8 Units/caps and all source bindings are unchanged.

Normal `context.nativeSigners` remain strict core-Signing-fence handles, closed over
that current store only. `context.bindNativeSigners(reopenedStore)` creates a new
binding; it never reuses the closed parent store. `driver.resume` reopens the SAME
run/config/DB with new process-local handle closures and performs no re-funding when
bootstrap is complete. `driver.openHandles({directory,execute:true})` loads only this
bootstrap's hash/policy checked0600 disposable files, with no RPC/DB writer; useful
for the parent W2/probe handles while the actual writer lives in a child. Its close
clears those in-memory handles. W2 signing rejects non-W2 messages.

Direct acceptance probes use an EXPLICIT separate binding:
`context.bindProbeSigners({filename,journal})` / the same method from openHandles.
It returns a distinct Map for `createDirectProbeRunner`'s probe context, never the
normal service. filename must be the exact same-run private
`acceptance-native-probes.sqlite`. At each signature, a readonly connection verifies
its pinned run hash, an existing FULL-committed Signing row, fixed catalog/error/
Unit/Series/role bindings, immutable descriptor hash, exact reconstructed legacy
message (only the fixed invalid-issuance/oversize patches permitted), ordered signer
set, fee/rent bounds and the matching allocated probe slot in the SAME global
acceptance journal/identity with <=128 total attempts. No core/normal-service signer
check is relaxed. No arbitrary HTTP key, program, URL or message is accepted.

Harness factory can build `probeContext={...context,
signers:context.bindProbeSigners({filename,journal})}` immediately before creating
its direct probe runner. The actual service retains nativeSigners. On child
restart, bindNativeSigners must receive that child's reopened current store.

Runtime creation requires an explicit expected `programDeployment.loader`; known
legacy or explicitly configured upgradeable layout is verified by actual RPC.
The main Series sponsoredPrice6000 refinement above is reflected in the immutable
manifest/config; ordinary book prices remain independent signed order inputs.
Bootstrap attempts acquire `status:'finalized-success'` only after original
signature/finality/delta verification; a known signature with unknown finality
remains counted Signed without that success status.

## Explicit resource and directory layout

Use a NEW app directory such as `local-state/machine-market/phase2-run` and a
SEPARATE existing validator ledger sibling such as
`local-state/machine-market/phase2-ledger`. An already-running validator must not
precreate the new app directory. Helper creation refuses every existing app path.
Runtime `resources` names four explicit task-contained directories:
`toolsDirectory`, `buildDirectory`, `ledgerDirectory`, `verificationDirectory`.
`measureBootstrapResources` counts allocated filesystem blocks without following
symlinks, includes the app PLUS shared verification/validator-log allocation in
its50MiB DB/log check, and reports ledger separately against512MiB. Capture validator
--log under that verification directory; no hidden ledger logs are omitted.
All paths must resolve under the same task state parent. Unit fixtures use only
an explicitly injected temporary parent; no actual local-state run was created.

The fixed probe binding also recognizes the catalog's exact missing-owner-signature
header mutation (required-signers2->1, operator signature only) and foreign-unit
account=run.collector case. These exceptions are catalog-specific; normal service
handles never accept them or any other header/account mutation.

`driver.inspect({directory})` is read-only and works after stopped/unknown setup;
it reads only saved public metadata/proofs/journal, never a handle/token/source file
or RPC. It returns an allowlisted projection, including conservative allocated
attempts and stopped status. `--inspect <explicit-private-directory>` exposes that
same redacted saved projection. Partial creation reports creation-incomplete; it
never generates missing identities or starts another run. Handle/source/config
files remain preserved on every error/close.

## Final source/unit handoff — frozen after this checkpoint

Final focused check:

```sh
node --test tests/machine-market/phase2-bootstrap.test.mjs
node --check scripts/machine-market/phase2-bootstrap.mjs
node --check tests/machine-market/phase2-bootstrap.test.mjs
node scripts/machine-market/phase2-bootstrap.mjs --help
```

Actual result:9 passed, zero failed/skipped. Syntax/help checks passed. The final
probe descriptor reconstruction includes BOTH `deadline` and
`headerRequiredSigners` in addition to id/error/success/instruction/accounts/patches;
the prior combined-regression PROBE_DESCRIPTOR_CHANGED blocker is resolved by this
exact-field alignment without weakening message/fence/journal checks. Lead still
owns the final combined regression and commit.

Tests use actual core/service/RPC classes with injected fetches and temporary
fixture files only. They cover all19 setup attempts, original funding signature/
fee/delta validation, lost funding/native responses, same-run resume without
re-funding/re-signing, private file modes/redaction, closed-parent/reopened-store
handles, the separate fixed-catalog probe fence/global journal, and shared-log
resource accounting. These are source/unit results, not native bootstrap evidence.

Parent/child handoff: retain the public config plus private operatorToken/RPC/
observer references, close the parent's initial writer, then use openHandles for
parent W2/probe capabilities. The child calls resume on the SAME directory and
receives nativeSigners bound to its reopened current store. The lead supplies the
actual listener and process launcher; this module starts neither. Resource byte
snapshots use canonical decimal strings.

No actual run directory/keys were created in local-state. No real RPC/faucet,
validator, compiler/toolchain action, native send, commit or push was executed by
this builder. Approval for the patched validator/compiler and all actual runtime/
process/native acceptance remains pending/lead-owned. Owned source and tests are
now frozen; builder is idle for the final integration handoff.
