# Phase2 core interface — early publication

26 October 2026. Frozen Packet03 remains unchanged, manifest SHA256
`d77ac0f699a29dd89812137007f3ccb1cbf1d271dbcb738c66fd63c3736a3f3c`.
Core builder owns only transaction/outbox/trading plus assigned tests and this doc.
No RPC/validator/funding/signing with real fixture handles is run by this builder.

## Transaction module (no dependencies/network)

`transaction.mjs` exports:
- `buildLegacyMessage({program,feePayer,blockhash,instruction,accounts})` ->
  `{message:base64,messageHash,requiredSigners:[base58],accountKeys:[base58],metas}`.
  `instruction` is the exact W4 JSON codec shape; `accounts` is the exact role map
  consumed by `instructionMetas` (System inserted, secondary primaryMatch appended).
  Canonical key dedup/order, shortvecs and one native instruction only. No ALT,
  compute-budget, priority fee or arbitrary extra instruction.
- `parseLegacyMessage(base64)` -> strict canonical legacy structure.
- `serializeTransaction({message,signatures:[base64 in required signer order]})`
  -> canonical base64, <=1232bytes. `validateTransaction({transaction,message,
  requiredSigners})` verifies every Ed25519 signature and exact message/ordering.
- `signLegacyMessage({message,signers})` uses a synchronous opaque Map/object from
  public key to `(messageBuffer)=>signatureBuffer|base64`. Keys never leave handles.
  It returns validated exact serialized transaction/signatures. This function has
  no network and MUST be called only after a durable outbox fence in actual use.

## Durable outbox / supported service orchestration

`createOutbox({filename,run,recoverStaleLock=false,authorize})` is a standalone
single-process-owner SQLite outbox. Trading's native mode integrates the same
engine into its own SQLite DB so fences, principal/unit/operating reservations and
coherent observation/hold retirement share one transaction. `authorize` is an
internal synchronous service hook revalidating immutable admissions/observations;
there is no raw HTTP transaction submission endpoint.

Run uses Phase1's exact public run shape. Outbox methods:
- `prepare({instruction,accounts,feePayer?,blockhash,lastValidBlockHeight,
  feeReserve,rentReserve,contextSlot,context?})` returns immutable Prepared op.
  Operation ID is instruction.operationId. All9 types are supported; Fund aliases
  FundMatch in operation projections. Exact retries recover the same record;
  changed blockhash/message/accounts/terms under an existing operation reject.
- `fence(id,{expectedVersion,currentSlot,context?})` commits full prepared legacy
  message, required signers, context/reservations and a Signing fence FIRST.
  It reserves one of at most128 lifetime signing slots. It returns a fence token.
- `sign(id,{expectedVersion,currentSlot,context?,signers,afterFence?})` performs
  fence commit, invokes opaque signer handles OUTSIDE any DB transaction while
  retaining sole process ownership, verifies all signatures/serialized bytes, then
  commits Signed bytes. `afterFence` is a local test hook, never HTTP input.
- `persist(id,{fenceToken,transaction})` permits persistence of bytes generated
  for that original fence only; it does not invoke any signer/network. Exact signed
  bytes are immutable. Crash during signing leaves the fence/holds quarantined;
  reopened service cannot invoke a fresh signature or unsigned-abort that operation.
- `markSend(id,{expectedVersion,blockHeight,reconciliationVersion?})` commits send
  intent BEFORE returning exact persisted transaction. First send is allowed once;
  every later send requires explicit intervening reconciliation and a still-valid
  blockheight. No automatic retry/reblockhash/resigning. Transport owns actual send.
- `observe(id,{expectedVersion,contextSlot,status,evidence,signature?,facts?,
  operatingFeesKnown?})` is fed by the transport's verified finalized reducer.
  Status success/failure/unknown/superseded-refund; evidence transaction-finalized
  or account-state-only. It never invents fee/signature data. Old/conflicting facts
  cannot downgrade terminal success; contradictions quarantine.
- `get(id)`, `listUnresolved()`, `storageInfo()`, `close()` are focused reads/lifecycle.

`createTradingStore({filename,run,mode:'native',recoverStaleLock})` exposes
`store.native` with these methods, sharing its DB. Existing Phase1 reference APIs
remain explicitly reference-only and must reject in native mode. Fund preparation
must match the already admitted/reserved operation exactly. The signing fence
revalidates original signed BookOrder/Consent/Mandate, rights, deadlines, exact
Unit/current cursor and payer walletStateVersion before invoking any handle.
Nonfund native operation preparation uses typed internal service context; further
exact method details and tests will be appended before completion.

## Current boundary

This publication is an interface, not completion evidence. Actual local-validator
run, all RPC/account proofs, fixture funding and native execution are lead-owned.
The core builder will prove the fence with fresh ephemeral-key unit tests and
SIGKILL child-process tests against temporary DBs, not hardware powerloss claims.

## Binding integration refinements (same ABI)

- `intentHash` is the generic canonical prepared economic-intent hash. For Fund,
  `termsHash` is the native W4 `fundTermsHash`, not that JSON hash. The operation
  also exports ordered `semanticKeys=[market,series,unit,payer,beneficiary,seller,
  matcher,collector,buyUse,sellUse,primaryMatchOrZero]`. Native receipt comparison
  must use `termsHash`. Other operations' termsHash equals intentHash.
- Run identity is pinned in an immutable standalone DB row independent of the live
  owner lock, and survives clean close. Maximum128 fences counts even crashes with
  no signed-attempt row. Same-DB trading barriers block NeverSignedAbort immediately
  after the committed fence, before callback invocation.
- Persisted observation summaries are <=2KiB. Larger public account proofs are
  separate immutable hash-addressed evidence rows, each <=8KiB and included in
  total storage bounds. `getEvidence(id)` returns the latest summary plus facts.
- `markSend` returns a persisted send intent. `assertPersisted(operation)` is a
  synchronous SINGLE-USE claim for transport's send guard: validates exact attempt,
  commits Submitted, returns true. Calling it again requires a new checked resend
  intent. `markSubmitted` is idempotent after this claim.
- Integrated native preparation/fence context is
  `{currentSlot,walletContext?,operatorContext,authorization?}`. walletContext is the
  principal payer's capture for Fund. operatorContext is the fee payer's current
  `captureWallet` result. Fence requires both versions/watermarks; no RPC is called.
- `prepareDeliveryStart(envelope,{currentSlot,blockhash,lastValidBlockHeight,
  feeReserve,rentReserve,feePayer?,walletContext?,operatorContext})` constructs the
  exact Start instruction/accounts from verified kind5 bytes. It binds source
  owner/Series/hash/current cursor and authorizes its nonce once. Alternatively
  `native.prepare` may receive that exact instruction/accounts plus
  `context.authorization=envelope`. A fresh fence must pass the same authorization
  and current wallet captures in its context. Direct-owner fee payer is supported.
- Internal-only `getPrivateResponse({unit,requestHash})` returns
  `{bytes,response,responseHash,deliveryId,owner}|null` before/after Finalize so the
  gateway can resume prepared exact bytes. It is NOT an unauthenticated HTTP route.
  `preparePrivateResponse({unit,owner,requestHash,response})` verifies independent
  content hash/version/type, exact W5 response schema and separate sponsor packet;
  persists canonical bytes FULL before Finalize can fence. `readPrivateResponse`
  verifies fresh kind6 signature/current consumed owner/request/cursor/responseHash
  before exposing protected bytes, and creates no DB rows.

### Integrated native observation facts

Transport supplies verified finalized account facts, not browser JSON. Every
successful integrated observation requires `facts.verified=true` after transport
checks ownership, canonical PDA, exact native ABI, program/run and coherent context.
Core rechecks immutable identities/terms, Unit cursor monotonicity and claim policy.

Bootstrap facts: `{verified,accountOwner:program,account:decodedMarket|Series|Unit,
wallets?,operatingCost?}`. Series/Unit registration becomes admissible only after
these successful observations; local catalog registration alone grants no right.
Fund facts: `{verified,receiptOwner:program,unitOwner:program,
receipt:decodedMatch,unit:decodedUnit,orderUses:[buyOrderUse,sellOrderUse],
wallets:[{key,balance,rent}],operatingCost?}`. Core compares the complete immutable
Fund receipt/nullifiers and accepts stronger primary terminal receipt states while
never restoring old ownership. Wallet observations and principal/unit/campaign hold
retirement commit in the SAME transaction as outbox success. Native account-only
proof keeps full operating allowance reserved. Known failure additionally requires
`exactFailedTransaction:true,fundedMatchAbsent:true` and original signature, with
coherent wallet facts; a null/pruned transaction is never failure.

Start/terminal facts: `{verified,unitOwner:program,unit:decodedUnit,
receiptOwner?:program,primaryMatch?:decodedMatch,wallets?,operatingCost?}`. Terminal
requires matching primary escrow disposition/terminal operation, or explicit
superseded-refund classification. Unknown/conflict preserves holds/quarantine.
Known operating costs require `{fee,rent}` within original reserves AND coherent
fee-payer wallet in `wallets`; account-state-only cannot claim fees known.

### Direct native Start observation (no HTTP/outbox needed)

Internal service method:
`store.observeNativeUnit({address,contextSlot,unit:decodedUnit,
unitOwner:program,primaryMatch:decodedPrimaryMatch,receiptOwner:program,
verified:true})`.
Transport MUST first verify the finalized RPC account owner/canonical Unit and
primary Match PDAs, Series binding and coherent context. Core checks exact ABI,
immutable Series/primary face/claim binding, state compatibility and monotonic
per-Unit context/cursor/terminal fields, then FULL-persists the lock/current native
state. It does not invent a start authorization/outbox/transaction signature or
retire unrelated funding holds. This permits a valid direct owner native start to
be processed by `getUnit` -> `preparePrivateResponse` -> typed Finalize outbox.
No reference API is called. Older contexts reject; newer contradictory state
quarantines the native run rather than restoring old rights.

Fund preparation/fencing also rechecks BOTH orders Reserved, match Reserved, the
underlying operation unsigned, and exact principal/unit hold ownership/amount.
NeverSignedAbort closes a prepared native outbox in the same DB transaction. A
previously prepared but aborted/cancelled trade cannot fence or invoke a signer.

Resolved-success reconciliation compares immutable effect identity (full immutable
Fund receipt/nullifiers, stable Start lock identity, terminal action identity or
bootstrap immutable fields), not complete dynamic facts JSON. Later Unit cursors,
ownership, primary terminal state and coherent wallet observations can strengthen
an original funding observation. They do not reexecute a transaction or consume a
campaign reservation again. Conflicting immutable receipt/terminal facts quarantine.

### Durable Start/process HTTP key binding

`store.bindRequest({actor,idempotencyKey,purpose,requestBytes,operationId:null|hex})`
uses the SAME `requests` table/count/byte caps and returns
`{kind:'NativeRequestBinding',operationId}`. Purpose is `delivery-start` or
`delivery-process`; requestBytes is a Buffer/Uint8Array (or exact UTF-8 string),
1..8192bytes. Core hashes purpose plus exact bytes; changed bytes or purpose under
an actor/key conflict with NONCE_CONFLICT, including after restart. A first binding
may reserve a null operation before preparing; the SAME bytes may attach its one
operation ID once. An attached different ID conflicts. No plaintext body is stored.

Transport verifies kind5 authorization before binding Start: actor is the signed
beneficiary, bytes are the exact full authorization message, operationId is the
computed Start ID. Process is operator-authorized; actor is configured gateway or
matcher, bytes are the strict canonical process request body excluding its HTTP
key. Bind before any preparation/signing/economic work, then attach the selected
Finalize/Refund operation before executing. Gateway process bindings may use finite
drain headroom for an already accepted delivery. No generic HTTP native transaction
endpoint or unsigned buyer authority is introduced.

### Final operating reservations

Prepared operations expose `rentPayer`: initializer for Init, matcher for other
account creation. Fee payer remains explicit. When these differ, the native fence
also requires `context.rentContext=captureWallet(rentPayer)` and independently
reserves each key's actual fee/rent allocation, including principal holds. Known
costs plus all unresolved operating allowances share the10LOCAL SOL ceiling and
never replenish by forgetting a completed cost. The native outbox also reserves
its finite24-trade ceiling conservatively across successful/unresolved Fund fences.
Only an exact known failure releases that execution slot. These are source guards;
actual funding/Rent/fee quotes and finality remain lead/transport responsibilities.

Preparing an authenticated Start also reserves its Unit under that operation in the
same DB. Pending/signed/unknown Start cannot be bypassed by a secondary ask. The
hold retires only with known failed Start or a matching native lock/terminal
observation; an HTTP202 or prepared operation is still not native admission.

Observation strength is durable: once an exact transaction's fee/rent/signature
were verified and stored, a later account-only reread preserves that known cost,
stronger evidence and original signature. `get().evidence/feeKnown` report retained
strength; `getEvidence().latestEvidence` labels the latest observation separately.
Pruned history cannot create a new fee blocker for an already known cost. An
operation whose cost was never known still retains the full unresolved allowance.

## Core source verification checkpoint

Final scoped command, Node v25.5.0, local Mac worktree:

```sh
node --test tests/machine-market/native-codec.test.mjs tests/machine-market/native-domain.test.mjs tests/machine-market/native-trading.test.mjs tests/machine-market/phase2-core.test.mjs
```

Actual result:78 passed, zero failed/skipped;19 are Phase2 core tests. Syntax checks
passed for transaction/outbox/trading and the child crash fixture. Process-kill
checks cover after-fence, inside-callback and integrated trading recovery; they
prove supported intact-DB process recovery, not hardware/power-loss durability.
The tested direct native lock/prepare/Finalize/read and native observation paths
use injected public account fixtures and ephemeral in-memory test signing keys;
none is validator/RPC/payment evidence.

Packet03 manifest and all11 referenced hashes were reverified unchanged. Frozen
Phase1 golden SHA256 remains
`1670a4a2315a4f2522145ad88dcceca1cc2447825b31e1f566108d5a0e5bb995`.
Observed free disk141GiB, above40GB. No validator, RPC, native send, dependency
install, heavy build, commit/push, cloud write or existing wallet/config read was
performed by this builder. All actual native runtime/System CPI/CU/delta/crash
acceptance and integration-wide budget reconciliation remain lead-owned gates.
The builder stops at this source/unit checkpoint and is idle for integration.
