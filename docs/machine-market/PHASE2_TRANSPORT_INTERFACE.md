# Phase 2 native transport interface and source checkpoint

26 October 2026. Normative Packet03 manifest:
`d77ac0f699a29dd89812137007f3ccb1cbf1d271dbcb738c66fd63c3736a3f3c`.
Frozen packet and historical Phase1 artifacts remain unchanged. Native economics
are primary-only escrow/refund face, immediate secondary seller/fee settlement,
and nontransferable sponsor grants; reference microcredits remain separate.

This worker delivered source and injected deterministic unit fixtures only. Lead
owns validator/RPC/funding/native acceptance, dependencies, builds and Git. No
listener, validator, real RPC, faucet, native broadcast, user wallet/config, paid
call, hosted write or source upload was used by this worker. Ephemeral unit-test
Ed25519 handles sign only after an independently observed committed core fence.
Fixture transaction/account responses are not actual native settlement evidence.

## RPC and complete signed-byte verification

`native/rpc.mjs` exports `createLocalRpc({endpoint,run,programBytes,
programDeployment?,fetchImpl?,timeoutMs=5000,maxResponseBytes=4194304})`.
Endpoint must be literal canonical `http://127.0.0.1:<port>` with no slash, path,
credentials, query, DNS alias, redirect, environment/config fallback or alternate
endpoint. Exported `localEndpoint` validates the same rule. All methods are async;
none runs inside a store transaction or invokes a signer.

- `inspectRun({requireMarket=true,minContextSlot='0'})` verifies exact genesis,
  executable loader, expected ELF bytes/SHA256, canonical Market PDA, every fixed
  authority and native constant. Legacy BPF loaders require exact ELF equality.
  Upgradeable loader requires explicit
  `programDeployment:{loader,programData,upgradeAuthority}`, canonical ProgramData
  PDA/layout, exact ELF prefix and all-zero declared allocation padding. Program,
  ProgramData and Market are re-read in one finalized context. Some(zero pubkey)
  is distinct from None; unknown/guessed representation rejects. The pinned
  test-validator representation can be declared with upgradeAuthority=ZERO_KEY.
- `accounts(addresses,{minContextSlot='0'})` returns one finalized
  getMultipleAccounts `{contextSlot,accounts}`; addresses are unique/max100.
  Accounts contain canonical raw base64-decoded bytes, owner, executable, exact
  safe lamports and SHA256. Unused rentEpoch is excluded, so JSON's u64-max sentinel
  is never rounded into an authority claim. Unsafe numeric authority fields reject.
- `slot`, `blockHeight`, `latestBlockhash`, `feeForMessage`, `rentForLength`,
  `transaction`, `signatureStatus`, `blockhashValid` use fixed bounded finalized
  JSON-RPC requests. No airdrop/faucet/config or generic call method exists.
- `sendPersisted(operation,{assertPersisted})` accepts only a core SendIntent.
  It parses the COMPLETE <=1232-byte legacy transaction, verifies every Ed25519
  signature, exact message/blockhash/instruction, program, role order, deduplicated
  signer/writable flags and fee payer. After identity/blockheight/validity checks,
  core's SINGLE-USE `native.assertPersisted(operation)` atomically claims the
  persisted send intent immediately before sendTransaction. No Signed-only send,
  new blockhash/signature or automatic retry. The same-byte resend needs an explicit
  intervening reconciliation/validity check. Network ambiguity retains the attempt.

The helper `phase2-transport-utils.mjs` contains strict public base58/shortvec/
complete legacy parsing. Core remains the authority that constructs, fences,
validates and durably stores the complete message and signed transaction.

## Finalized native observations

`native/observations.mjs` exports `validateNativeAccount`, `nativeProof`,
`transactionEffects`, `createNativeObserver({rpc,run})`.
`observer.observeFinalized(operation)` returns verified raw-account summaries,
proof, status/evidence, exact original signature/transaction slot when available,
wallet snapshots and separately known effects/fee/rent/CU. It never signs/sends.

Account owner, exact ABI length/magic, canonical PDA, Market/Series identity and
immutable hash/terms are validated before interpretation. Full Fund receipt plus
BOTH OrderUses establishes the original effect even after later ownership/terminal
states. A failed primary can leave IssuerOpen/zero face; exact failed original meta
plus absent receipt/nullifiers is classified without treating zero face as success.
Current later Unit state never restores an earlier owner/cursor.

Transaction evidence requires exact original signed bytes and finalized meta.
Deltas aggregate by UNIQUE pubkey, including fee/recipient aliases, actual network
fee and rent. Primary escrow stays P; secondary cash/fee settles immediately.
Separately signed exact native receipt replay incurs no repeated principal/market
fee; its separate network fee remains visible. Start may use owner as fee payer.
Unexpected deltas reject. Observed compute above200000 rejects; absent CU remains
unmeasured. No extra compute-budget instruction or ALT is introduced.

Pruned/null history is explicitly `account-state-only`: no invented signature,
transaction deltas, fee, rent or CU. Economic account proof may resolve principal
while the full operating allowance remains reserved. If transaction/fees were
already durably known, a weaker later account-only read does not erase that proof
or re-reserve a known cost. Core's versioned reducer handles monotonic state and
contradictions; reference observations never enter this bridge.

## Immutable source, delivery preparation and private recovery

`native/delivery.mjs` exports `createImmutableSources`, `canonicalSponsorPacket`,
`prepareDeliveryResponse`, `verifyDeliveryRelease`, `createDeliveryCoordinator`.
Explicit source input is `createImmutableSources({sources:[{series,content}],
packets:[{campaignId,packet}]})`; no environment, filesystem or external fetch
fallback exists. Sources are owned immutable UTF-8 fixture bytes; <=16KiB each.
Sponsor canonical JSON is <=2KiB, exact packetHash/disclosure/campaign bound and
untrusted data, separate from unchanged independent resource text.

The coordinator reads finalized Market/Unit/Series/primary Match coherently. A valid
direct owner native Start needs no HTTP/outbox reconstruction: core
`observeNativeUnit({address,contextSlot,unit,unitOwner:program,primaryMatch,
receiptOwner:program,verified:true})` FULL-persists the observed lock first.
Explicit `monitor({units})` processes at most64 known Units; there is no timer.

Core private APIs are used exactly:
- `preparePrivateResponse({unit,owner,requestHash,response})` computes and FULL-syncs
  canonical W5 bytes; returned responseHash/deliveryId must match preparation.
- `getPrivateResponse({unit,requestHash})` is internal only; already prepared bytes
  survive restart/source unavailability, are checked exactly, and never become a
  public unauthenticated route.
- `readPrivateResponse(envelope,{currentSlot})` validates fresh signed W2 ReadDelivery,
  current Consumed owner/cursor/request/native responseHash, returning original bytes
  without a new DB row. Transport rechecks canonical bytes, content/version/hash,
  response identity and sponsor binding against finalized accounts.

Response prepare/fsync completes BEFORE typed Finalize preparation/fencing/signing.
No bytes release before matching finalized Consumed state. ReadDelivery can be signed
and observed after useBy; it recovers only the original response. Refund/expiry or
unknown outcomes release no bytes. Source failure is considered only after a native
lock and refunds locked holder P, or immutable sponsor P. Tombstones/private responses
are retained within the finite run; no reset, deletion or fresh grant is recovery.

## Service and W6 HTTP boundary

`createNativeService({run,rpc,store,signers,operatorToken,repository?})` requires actual
`store.native`. Pass explicit immutable repository input to enable delivery; it does
not assume store has source/packet getters. Operator capability is explicit/private,
not emitted in projections. Module import and service construction never listen,
load wallet/config files, sign or call RPC.

Internal lead/harness methods:
- `prepare({instruction,accounts,context={},feePayer?})` builds the exact core legacy
  message, gets bounded fee/exact declared-length rent quotes and prepares outbox.
  Exact operation replay retains original blockhash/message; changed intent conflicts.
- `executeOperation(id)` uses admitted Fund semantic keys or a typed prepared op.
  It refuses new signing while another fenced/attempted/blocked operation is unresolved.
  Fresh finalized critical account/wallet context is fetched outside DB transactions;
  Unit owner/cursor/state, expected missing receipt/nullifiers, System wallet state,
  and walletStateVersion captures are rechecked before core fence/sign. Whole signed
  bytes and a durable send intent precede transport. Errors never trigger a fresh key.
- `reconcile(id)` observes only original attempt/accounts; `resend(id)` is explicit,
  reconciles first and can claim only the SAME persisted bytes while still valid.
- `monitorDeliveries({units})` is an explicit bounded gateway operation.

`createTradingHandler({service,origin})` returns a Node request handler. Lead owns
listener/timeout configuration and must bind only127.0.0.1. The handler checks exact
Host/port, rejects duplicate Host/forwarded authority, null/cross-site/wrong-port
Origin, unsupported method/query/URL and oversized/malformed JSON. Nonbrowser clients
may omit Origin. JSON body<=8192, response<=196608, fixed W6 `{code}` errors, no
wildcard CORS, arbitrary transaction/URL/signer input or production auth claim.

| W6 endpoint | Method |
| --- | --- |
| /orders, /orders/cancel, /campaigns | POST signed exact W2 envelope |
| /sponsored-access | POST {consentEnvelope,issuerEnvelope} |
| /deliveries/start | POST signed kind5;202pending with original operation ID |
| /deliveries/process | POST {unit,requestHash,idempotencyKey}, operator capability |
| /deliveries/read | POST signed kind6; original response + responseBase64/hash and separately labeled native receipt |
| /operations/:id/reconcile, /operations/:id/resend | POST {}, operator capability |
| /book?series, /orders/:id, /operations/:id, /units/:id, /health | GET bounded/focused safe projections |

Core `bindRequest({actor,idempotencyKey,purpose,requestBytes,operationId})` durably
binds Start/process HTTP keys before preparation/signing, including restart conflicts.
Start actor and exact bytes derive from verified kind5. Process actor is configured
gateway; canonical unit/request body binds before observing/preparing and attaches
its one selected Finalize/Refund operation. Prepared/terminal replay has no new
spend. Public operation projections omit complete attempts, internal fence tokens,
private bytes and raw diagnostics. Health is configuration-only, nativeEvidence:false;
GET APIs never reconcile, sign, send, prepare or mutate.

## Actual checks and remaining scope

Transport-only:
`node --test tests/machine-market/phase2-transport.test.mjs tests/machine-market/phase2-transport-integration.test.mjs`
passed **21/21**, zero failed/skipped. Fixtures cover both loader forms/Some(zero),
RPC limits/redaction, failed zero-face primary, exact receipts after later states,
replay/unique-key deltas, owner fee alias, response-before-Finalize, direct/service
Start, source-failure refund, late read/restart, durable key conflict, lost request/
response, same-byte explicit resend and lost Finalize recovery without another send.

Final combined source/unit check passed **97/97**, zero failed/skipped:
`node --test tests/machine-market/native-codec.test.mjs tests/machine-market/native-domain.test.mjs tests/machine-market/native-trading.test.mjs tests/machine-market/phase2-core.test.mjs tests/machine-market/phase2-transport.test.mjs tests/machine-market/phase2-transport-integration.test.mjs`.
This includes core-owned process SIGKILL tests, not hardware/power-loss claims.
Manifest digest and all11 declared packet documents were reverified unchanged.

No transport/core interface blocker remains at this source checkpoint. Actual W6
socket concurrency, native execution/CPI/finality, resource measurements and full
T1–T9 acceptance remain lead-owned and unexecuted by this worker. The known pinned
validator listener preflight blocker is recorded separately in PHASE2_PREFLIGHT.md;
this work does not waive it or authorize a rebuild/run. No broad UI build, dependency
install, Git operation, commit/push or change to the old synthetic UI/API was made.
