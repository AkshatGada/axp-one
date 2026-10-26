# Packet03 Phase1 JavaScript interface

Normative packet: `architecture/review-packets/v2-review-2026-10-26-03/`.
Manifest SHA256 `d77ac0f699a29dd89812137007f3ccb1cbf1d271dbcb738c66fd63c3736a3f3c`.
Local codecs/domain/relational reference trading only. This is not native settlement
or validator evidence. Existing synthetic API/UI/core is untouched.

Published before implementation integration on 26 October 2026.

## Binary interoperability (Rust consumer)

`native/codec.mjs` exports `encodeAuthorization(input)`,
`decodeAuthorization(bytes)`, `encodeInstruction(input)`,
`decodeInstruction(bytes)`, `encodeAccount(input)`, `decodeAccount(bytes)`.
All encoders return Node Buffer; decoders return strict JSON-compatible objects.
Authorization input has `kind` string (BookOrder, Cancel, SponsorMandate,
SponsoredConsent, DeliveryRequest, ReadDelivery), plus `domain`, `actor`, `nonce`
and every exact W2 field using the WIRE names. Instruction input has `type` string
(Init, IssueSeries, RegisterUnit, Fund, StartDelivery, FinalizeDelivery,
RefundFailure, TimeoutRefund, ExpireUnused), `operationId` and every W4 field.
Version2 is inserted/verified by the codec. Account input has `kind` string
(Market, Series, Unit, Match, OrderUse), `state` numeric byte, `market` public key
and every W3 body field. Magic is inserted/verified, not supplied in JSON.

Keys are canonical base58. Hashes/nonces/IDs/domain are exactly64 lowercase hex.
u64 fields are canonical decimal strings; u8/u16/u32 fields are JS integers.
Flags are numeric0/1 (not bool). Every field is required; unknown fields reject.
`eligibleKeys` is exactly4 keys with counted nonzero prefix and zero unused tail.
Named fields/types follow WIRE tables verbatim, including account `feeCollector`
versus instruction `collector`, auth `minRemainingAfter`, `refundFace`, `limit`,
`validUntilSlot`, `expectedOrderVersion`, `cursor`, `consumedCursor`.

Golden fixture file schema (public deterministic synthetic bytes, no signatures or
private material):
`{schemaVersion:'axp.market.golden.v1',packetSha256,vectors:[{name,
family:'authorization'|'instruction'|'account',input,hex}]}`.
All6 authorizations,9 instructions,5 account kinds are included. Representative
u64 boundary values are decimal JSON strings. Tests also assert literal offsets,
lengths and one-field rejection independently of round-trip equivalence.

## Domain

`native/domain.mjs`: exact-byte SHA256, D/order/unit/match/operation derivations,
Series terms and Fund terms hash, effective-rights/face compatibility, immutable
Ed25519 authorization verification using built-in Node crypto. No SDK/network/key
configuration reads. Invalid signatures/bytes are fixed typed errors.

## Relational reference trading

`native/trading.mjs` exposes `createTradingStore({filename,run})` with explicit
fixture registration, signed authorization admission/cancellation/sponsorship,
wallet observations/version guards, operation/one-attempt persistence, explicit
observations and read-only focused actor projections. No RPC inside or outside the
store; observations/signing are fixture-injected in Phase1. Exact finalized-effect
inputs are labeled reference observations, never evidence of native settlement.
Detailed method signatures are recorded below. Phase2 adapter,
validator, delivery monitor/native deltas remain excluded.

## Final store signatures and evidence boundary

The store is now implemented with actual relational SQLite tables, unique indexes
and one explicit process owner. All mutations run under `BEGIN IMMEDIATE`; SQL is
FULL synchronous, `fullfsync=ON`, foreign keys enabled and 24MiB main page ceiling.
`run` is the immutable object `{genesis,program,market,initializer,marketNonce,
matcher,gateway,collector,issuer,buyerA,buyerB,sponsor}`. Keys are canonical base58;
genesis/nonce are lowercase32-byte hex; Market/Series/Unit PDA addresses are derived.
No global environment/CLI wallet configuration is read.

Public methods (synchronous; errors use frozen W6 code/status/customCode):
- `observeWallet({key,balance,rent,contextSlot,expectedVersion})` accepts an explicit
  trusted reference observation. `captureWallet(key)` returns its version/slot,
  balance, held, available and quarantine. Both balance acceptance and every hold
  mutation advance walletStateVersion. Admission/signing requires a matching capture.
- `registerSeries({address,seriesId,issuer,resourceHash,versionHash,format,useBySlot,
  sponsoredPrice,cap,maxTransfers,transferable,contentBytes,currentSlot})` and
  `registerUnit({address,series,serial,currentSlot})` are fixture registration
  boundaries, not unsigned native issuer endpoints. Immutable duplicate checks,
  sequential serial/cap, canonical PDA and issuer/rights checks are enforced.
- `admitAuthorization(envelope,{currentSlot,walletContext})`,
  `cancelUnsigned(envelope,{currentSlot})`,
  `admitCampaign(envelope,{currentSlot})` authenticate exact W2 bytes. Envelope is
  exactly `{authorization,signature,idempotencyKey}` with canonical base64 strings.
  `sponsorAccess({consentEnvelope,issuerEnvelope,currentSlot,walletContext})` uses
  signed kind4 plus an unconsumed issuer kind1 exact-primary quote; walletContext
  belongs to the sponsor. Both paths use the same unique unit hold.
- `reserveMatch(orderId,{currentSlot,walletContext})` re-evaluates an existing open
  GTC order by the same eligibility/price-time algorithm; IOC cannot rest/re-evaluate.
- `abortNeverSignedMatch(matchId,{expectedVersion})` releases BOTH orders only if
  no signing attempt/barrier exists; both become FailedClosed, never reopen.
- `prepareNativeOperation(operationId,{expectedVersion})` prepares the immutable
  match. `persistSignedAttempt(operationId,{expectedVersion,currentSlot,
  walletContext,prepared,signExact})` revalidates admission and payer version before
  invoking the synchronous fixture signer under the writer. Prepared is
  `{blockhash,lastValidBlockHeight,feeReserve,rentReserve}`. The callback receives
  `(operation,instructionBytes)` and returns `{transaction,signature}` in canonical
  base64. Exact returned public bytes and signature are persisted before returning.
  **Phase1 message bytes are the typed instruction only, not a Solana legacy
  transaction message.** The callback/transaction is fixture-injected; real complete
  native message reconstruction, all transaction signatures and transport are Phase2.
  A callback that may have signed and then throws/returns malformed bytes commits
  quarantine/signing uncertainty, full holds and a barrier. It cannot become an
  unsigned abort or be signed again. Raw callback errors are never persisted.
- `observeOperation(operationId,{expectedVersion,contextSlot,status,wallets,
  receipt?,failedSignature?,fundedMatchAbsent?,operatingFeesKnown?,operatingCost?})`
  consumes trusted reference observations only. Wallets are exact
  `{key,balance,rent}` values, with unique keys. A success receipt is
  `{matchId,termsHash,state:PrimaryEscrowed|SecondarySettled}`; known failure requires
  the original signature and explicit no-funded-match observation. Changed expected
  wallet deltas reject. Unknown freezes principal/unit/campaign plus operating fees.
  Known operating cost `{fee,rent}` must fit the original reserve and accompany its
  coherent operator wallet delta. Unknown fee allowance remains fully reserved even
  after economic success. `observeOperatingCost(operationId,{expectedVersion,
  contextSlot,fee,rent,wallet})` can resolve that cost later without repeating trade.
- `referenceStartDelivery(envelope,{currentSlot})` and
  `referenceTerminal({unit,reason,currentSlot,expectedCursor,requestHash?,wallets})`
  are explicitly **reference fixture observations**, not a native adapter or public
  delivery endpoint. They test owner/request/cursor, start/useBy/150-slot lease,
  primary-only proceeds/refund claim and sponsor nonreplenishment. No protected bytes
  are stored/returned. Real native delivery admission and private-response durability
  are not implemented by these fixture methods.
- `getOrder`, `getMatch`, `getUnit`, `getOperation`, `getCampaign`, `projectActor`,
  `storageInfo`, `close` provide focused reads/lifecycle. Read projections carry
  `authority:'sqlite-reference-fixture',nativeEvidence:false`. They do not write,
  sign or broadcast. A second live store for the same file is refused; explicit
  stale-lock recovery checks that its recorded process is absent.

All slots/amounts/u64 remain decimal strings. Sequence/version/count are bounded
integers. Holds have exactly one owner (`order` or `match`); price improvement moves
only gross into the match. Primary claim is original P. Secondary Q-net and Q-fee
are immediate reference wallet deltas and never become refundable chain escrow.
Primary failure refunds current holder P once; sponsored failure refunds sponsor P.

Ingress reserves128KiB per unit and8KiB per open order; twelve bounded recovery
operation slots per unit fit within1024. Native lifetime caps remain16Series,
64Units,256orders/matches,32activeorders,8pendingmatches,16campaigns. Ordinary events
stop at3072 to reserve the remaining1024 for bounded drain; total4096. HTTP aliases
are bounded4096 ingress/5120 drain and included in logical byte accounting. Logical
limit is12MiB ingress/16MiB drain; WAL thresholds4MiB/8MiB and a maximum-transaction
margin are checked before/after transactions. No original history is evicted.
Actual complete adapter/row overhead remains a Phase2 pre-admission gate.

## Golden refinement notice

The published schema and all offsets remain unchanged. Final Unit/Match examples
now explicitly zero every unused lock/terminal field; decoders reject nonzero
unused fields rather than treating them as padding. Rust consumers should read
`golden-vectors.json` from the current worktree. Magic checks use exact byte equality
(including high-bit mutations), and prototype-like schema names reject safely.
`instructionMetas({type,fundingKind?,accounts})` exports the complete frozen W4 role
order/flags; System is inserted as the exact fixed key. Secondary Fund appends its
readonly primaryMatch after System. `deduplicateMetas` aggregates signer/writable
flags by unique key without dropping instruction roles.

## Phase2 gaps (stop here)

No validator, actual Solana message/SBF execution, RPC, signing adapter, send/resend,
local funding, finalized account-byte observation or actual native wallet deltas
were run. Cross-language Rust unit checks are owned separately by the Rust builder.
Complete adapter validation of all legacy transaction metas/signers/fees/rent,
manifest/program/loader/genesis checks, account-state-only stronger receipt recovery,
remaining native operation outboxes, direct-owner delivery monitoring, immutable
private response/tombstone storage, native crash/HTTP concurrency proofs, runtime
CU/1232-byte transaction measurements and physical full-stack growth remain Phase2.
Reference evidence cannot satisfy native T6–T9. No change to economics or frozen
packet has been made, and no follow-on phase is authorized by these tests.


## Final lead integration checkpoint

The lead reran all 59 focused JS tests and all 25 Rust host tests. The 20 ABI
vectors agree across languages. An additional 40 public PDA vectors cover all five
address families and match Solana SDK `Pubkey::find_program_address`; these check
both address bytes and bump selection independently of the JS curve calculation.
SBF compilation passed after the bounded stack correction. Exact output and source
hashes are in `../../artifacts/machine-market/phase1/verification.json`.
