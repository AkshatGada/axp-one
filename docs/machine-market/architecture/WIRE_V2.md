# AXP native MVP contract v2 — normative draft

Read with SPEC_V2 and ACCEPTANCE_V2. No implementation GO. This specifies the
supported single-backend/current-database fixture model, not production custody,
HA or backup recovery. Historical contracts are non-normative.

## W1. Encoding, domain and identity

All binary integers are little-endian unsigned u8/u16/u32/u64 as named. Arithmetic
is checked; money intermediates use u128. Hashes/public keys are exactly32bytes.
No floats, implicit defaults, optional trailing bytes or unbounded strings onchain.
Unused fixed-array entries are all-zero and counted entries must be nonzero.
Public keys use canonical base58 at JSON boundaries; hashes/nonces use lowercase
64-hex. u64 JSON fields are canonical unsigned decimal strings, never JS floats.
Binary payloads/signatures use canonical base64 (decode/re-encode must match).
Reject wrong length, enum, count, trailing bytes or unknown JSON fields.

D=SHA256(ASCII('AXP-MM-V2') || genesisHash32 || programPubkey32 || marketPubkey32).
All message hashes mean SHA256 of exact encoded bytes. Resource hash is SHA256 of
exact UTF-8 resource bytes. No JSON reordering, Unicode normalization or trimming
changes signed bytes. A resource version is bounded UTF-8 offchain; versionHash
commits those exact bytes. termsHash is H(Series immutable fields in W3 order).

PDA seeds (canonical bump derived, never caller-chosen):
- Market:[ASCII('axp-mkt-v2'), initializerPubkey, marketNonce32].
- Series:[ASCII('axp-series-v2'), marketPubkey, seriesId32].
- Unit:[ASCII('axp-unit-v2'), marketPubkey, unitId32], where
  unitId=H(seriesPubkey || serial:u16).
- Match:[ASCII('axp-match-v2'), marketPubkey, matchId32].
- OrderUse:[ASCII('axp-order-v2'), marketPubkey, actorPubkey, orderNonce32].

orderId=H(D || actorPubkey || orderNonce32). A generic bid's exact unit and cursor
are ZERO; an ask's are mandatory. matchId=H(D || buyOrderId || sellOrderId ||
unitPubkey || expectedCursor:u64 || gross:u64 || fundingKind:u8).
operationId=H(D || nativeInstructionTag:u8 || stable identity): Match uses matchId;
Series uses seriesId; Unit registration uses unitId; delivery uses unitPubkey+
requestHash; expiry uses unitPubkey+preterminalCursor:u64; Init uses marketNonce.
Exact same operation never gets a new economic ID to recover a timeout.

## W2. Complete offchain authorization messages

Every authorization starts with ASCII('AXPAUTH2')[8], kind:u8, D[32], actor[32],
nonce[32] (105byte common prefix). Append fields below in EXACT order. Signature
is64byte Ed25519 over the complete bytes. Source actor is derived from bytes;
HTTP demo-role headers cannot replace cryptographic verification. Native transaction
co-signing is delegated only for actions permitted by the full signed authorization
and the v2 lifecycle; adapter revalidates every field before using fixture handles.

| Kind | Append fields, ordered | Authority/semantic rule |
| --- | --- | --- |
| 1 BookOrder | orderId32,side:u8,lane:u8,series32,refundFace:u64,exactUnit32,expectedCursor:u64,limit:u64,validUntilSlot:u64,minRemainingAfter:u8,tif:u8,quantity:u8 | side0bid/1ask; lane0primary/1secondary; primaryface0meansactualprimarygross, secondaryfaceexactpositive; tif0GTC/1IOC; quantity1; bid unit/cursor0; ask exact; deadline>current; all v2 closed/failure rules apply |
| 2 Cancel | originalOrderId32,originalNonce32,originalAuthHash32,expectedOrderVersion:u64 | Actor owns target; only unmatched/never-signed; signed/unknown cannot cancel |
| 3 SponsorMandate | campaignId32,series32,packetHash32,budget:u64,perGrant:u64,maxGrants:u16,eligibleCount:u8,eligibleKeys:[4*32],validUntilSlot:u64,version:u16 | Sponsor;1..4 known buyer keys; version1 immutable; no budget replenishment |
| 4 SponsoredConsent | orderId32,campaignId32,campaignVersion:u16,series32,unit32,cursor:u64,amount:u64,sponsor32,packetHash32,validUntilSlot:u64,assessment:u8,nontransferable:u8 | Beneficiary; primary cursor0; exact price/unit; assessment0insufficient/1negative/2positive; nontransferable1 |
| 5 DeliveryRequest | unit32,expectedCursor:u64,series32,resourceHash32 | Current owner; requestHash=H(full authorization bytes); nonce identifies this one request, not a secret bearer credential |
| 6 ReadDelivery | unit32,requestHash32,consumedCursor:u64,validUntilSlot:u64 | Current consumed owner; fresh read proof can be signed after useBy; only retrieves original committed response; read nonce need not create a DB row |

Native auction schemas are absent and unsupported. Book and sponsored order kinds
are not interchangeable. A bidder cannot change TIF/nonce/unit/minimum rights with
a retained signature. Campaign/consent matching compares every bound field, not
merely a hash supplied by an untrusted request. Issuer/Unit creation is authorized
by native fixture issuer signatures through explicit bootstrap/issuer CLI commands;
there is no public arbitrary-transaction endpoint or unsigned economic override.

Other native operations use fresh explicit fixture authority transaction signatures:
Init/Series/Unit by issuer/initializer as W4; terminal delivery by gateway; expiry/
timeout by any local caller. They cannot spend another party's wallet principal.
No model-generated arbitrary transaction or browser-selected signer is accepted.

## W3. Exact account layouts

Each account begins magic ASCII('AXPMKT02')[8], kind:u8, state:u8, marketPubkey[32]
=42byte common header. No padding. Table body order is exact; offsets are cumulative
from42. Every account length must equal the stated total. Program owner and canonical
PDA are checked first. State bytes are listed below; all other values reject.

| Kind / total bytes | Body fields in order |
| --- | --- |
| 1 Market /393 | initializer32,marketNonce32,genesis32,matcher32,gateway32,feeCollector32,issuer32,buyerA32,buyerB32,sponsor32,feeBps:u16,maxTransfers:u8,maxSeries:u16,maxUnits:u16,maxMatches:u16,issuedSeries:u16,issuedUnits:u16,fundedMatches:u16,leaseSlots:u64,maxGross:u64 |
| 2 Series /229 | seriesId32,issuer32,resourceHash32,versionHash32,termsHash32,format:u8,useBySlot:u64,sponsoredPrice:u64,cap:u16,issued:u16,maxTransfers:u8,transferable:u8,contentBytes:u32 |
| 3 Unit /383 | series32,unitId32,serial:u16,owner32,cursor:u64,transferCount:u8,sponsored:u8,primaryMatch32,latestMatch32,refundFace:u64,sponsorRefundKey32,requestHash32,lockStartCursor:u64,lockStartSlot:u64,lockDeadlineSlot:u64,terminalOpHash32,responseHash32,terminalSlot:u64,terminalReason:u8 |
| 4 Match /619 | matchId32,unit32,series32,expectedCursor:u64,fundedCursor:u64,payer32,beneficiary32,seller32,buyNonce32,sellNonce32,buyAuthHash32,sellAuthHash32,gross:u64,fee:u64,tradeKind:u8,packetHash32,campaignId32,fundTermsHash32,fundedSlot:u64,terminalOpHash32,terminalSlot:u64,rentReserve:u64,primaryClaimFace:u64,terminalRecipient32,previousMatch32 |
| 5 OrderUse /178 | actor32,nonce32,authHash32,match32,consumedSlot:u64 |

Market/Series state1=active. Unit states0IssuerOpen,1FundedOpen,2DeliveryLocked,
3Consumed,4Refunded,5Expired. Match states1PrimaryEscrowed,2PrimarySettled,3PrimaryRefunded,4SecondarySettled; tradeKind0primary/1secondary/2sponsoredprimary. OrderUse state1Used.
terminalReason0none/1delivery/2failure/3timeout/4expiry. Unit cursor starts0 and
increments on every funding, delivery start and terminal transition. Record
lockStartCursor BEFORE start increment. Delivery replay compares that stored cursor
and request identity; it cannot use A's older request after ownership cycles A->B->A.
Unused lock/terminal fields are zero. Format0plain/1markdown/2json/3csv.

Constants are fixed:feeBps100,maxTransfers3,maxSeries16,maxUnits64,maxMatches256,
leaseSlots150,maxGross1_000_000_000. Series cap<=64 and global issuedUnits<=64.
Series termsHash hashes issuer,resourceHash,versionHash,format,useBySlot,
sponsoredPrice,cap,maxTransfers,transferable,contentBytes in that order (excludes
mutable issued count). Series registration duplicate compares ALL immutable fields.
Unit serial must equal Series.issued for fresh registration and serial<cap; exact
existing unit replay is checked before counter progression and never remints.

Match.fee is the contractual fee: earned immediately for SecondarySettled, earned
for PrimarySettled, zero earned for PrimaryEscrowed/PrimaryRefunded. Do not mutate
the immutable quoted fee on refund; derive earnedFee from kind/state.

Match fundTermsHash hashes COMPLETE Fund instruction bytes plus ordered semantic
keys [market,series,unit,payer,beneficiary,seller,matcher,collector,buyUse,sellUse,primaryMatchOrZero]; it commits
limits/windows/selected identity and sponsor metadata. Market/Series rent remains
in accounts. Match rentReserve is recorded at initialization and never distributed. PrimaryClaimFace
is primary execution gross P. Secondary receipt records P but holds NO Q principal;
previousMatch links the prior receipt for audit only. Unit.primaryMatch/refundFace
never change after primary funding; secondary ownership carries that one claim.
Surplus is not principal. OrderUse record links exactly one actor/nonce/authHash to
one Match; it cannot be consumed on another Unit or with changed bytes.

## W4. Native instruction data and account metas

Each native instruction is tag:u8,wireVersion:u8(2),operationId32 followed by the
ordered fields below. Reject trailing bytes. `s`=required signer, `w`=writable.
All unspecified metas readonly/non-signer. Service-submitted transactions use the
configured matcher as fee payer (gateway may share this key), distinct from trading
recipients. For direct owner StartDelivery, the owner may pay the transaction fee;
no matcher or gateway signature is required.
System Program ID is exact; native Clock/Rent use runtime sysvars, not caller data.
No caller-supplied unix time, arbitrary program, rent amount or destination.

| Tag | Data after common34bytes | Ordered metas |
| --- | --- | --- |
| 0 Init | marketNonce32,genesis32,matcher32,gateway32,collector32,issuer32,buyerA32,buyerB32,sponsor32 | initializer(s,w),market(w),System |
| 1 IssueSeries | seriesId32,resourceHash32,versionHash32,format:u8,useBySlot:u64,sponsoredPrice:u64,cap:u16,maxTransfers:u8,transferable:u8,contentBytes:u32 | issuer(s),matcher(s,w),market(w),series(w),System |
| 2 RegisterUnit | seriesId32,serial:u16 | issuer(s),matcher(s,w),market(w),series(w),unit(w),System |
| 3 Fund | matchId32,expectedCursor:u64,buyNonce32,sellNonce32,buyAuthHash32,sellAuthHash32,gross:u64,buyerLimit:u64,sellerLimit:u64,buyerValidUntil:u64,sellerValidUntil:u64,minRemainingAfter:u8,fundingKind:u8,expectedRefundFace:u64,packetHash32,campaignId32 | payer(s,w),beneficiary(s),seller(s,w),matcher(s,w),collector(w),market(w),series,unit(w),match(w),buyUse(w),sellUse(w),System |
| 4 StartDelivery | expectedCursor:u64,requestNonce32,requestHash32 | owner(s,w),market,series,unit(w) |
| 5 FinalizeDelivery | expectedLockedCursor:u64,requestHash32,responseHash32 | gateway(s,w),market,series,unit(w),primaryMatch(w),issuer(w),collector(w) |
| 6 RefundFailure | expectedLockedCursor:u64,requestHash32 | gateway(s,w),market,series,unit(w),primaryMatch(w),refundRecipient(w) |
| 7 TimeoutRefund | expectedLockedCursor:u64,requestHash32 | caller(s,w),market,series,unit(w),primaryMatch(w),refundRecipient(w) |
| 8 ExpireUnused | expectedCursor:u64 | caller(s,w),market,series,unit(w),primaryMatch(w),issuer(w),collector(w) |

Tags7/8 caller can be operator or buyer but transaction fee payer remains matcher
in the supported service. Adversarial direct-program tests may pay their own fees;
reconciliation aggregates each unique key's actual fee debit independently of its
recipient roles. Service signing never pays fees from a seller/payer wallet.
No new wallet principal debit exists in7/8: effects are from the recorded escrows.

Fund kind0primary/1secondary/2sponsoredprimary. Book limits require buyerLimit>=gross
>=sellerLimit; program trusts matcher for maker-price/TIF computation. Primary kind0
requires IssuerOpen/cursor0/seller=issuer, expectedRefundFace0; creates full P escrow
and immutable Unit.primaryMatch/refundFace=P. Sponsored kind2 also requires exact
Series.sponsoredPrice, payer=sponsor, buyerbeneficiary, nonzero campaign/packet;
sets sponsorRefundKey=payer and permanently nontransferable. Aggregate campaign
mandate stays backend/signer authority; consent is consumed buy authorization.

Secondary kind1 requires FundedOpen and exact native current owner/cursor, transferable
nonsponsored Unit, transferCount<maxTransfers, expectedRefundFace=Unit.refundFace>0,
and post-fill remaining rights>=minimum. Read and validate the linked primary Match
is PrimaryEscrowed and agrees on P. Add primaryMatch READONLY as the LAST meta after
System for kind1 only; kind0/2 have no extra meta. It is never replaced or replenished.

All funding kinds require slot<useBy and both authorization deadlines, exact signers,
registered fixture roles, zero/supported sponsor fields, self-trade rejection and
payer post-debit>=System-wallet rent minimum. Matcher creates receipt/OrderUses with
rent separately. Primary transfers gross to primary Match and sets PrimaryEscrowed.
Secondary transfers gross-fee to seller and fee to collector via System CPI, creates
SecondarySettled receipt (terminalOpHash=thisFundOp,terminalSlot=currentSlot,
terminalRecipient=seller), updates latestMatch/owner/cursor/transferCount, and consumes
both orders IN ONE atomic transaction. Its receipt holds rent only. Fee is earned
now and never clawed back. PreviousMatch=current prior latestMatch; primary previous0.

Both OrderUse PDAs are fresh and initialized atomically with funding. An existing
Used record referring to any other Match or auth hash rejects. Exact existing Match
replay: first validate account ownership/layout, immutable fundTermsHash and STORED
required signer identities; return its existing state before checking current
unit owner/cursor/expiry. This lets a prior successful funding replay after resale/
terminal settlement without debit. An attacker cannot change any immutable field.

Fresh PDA creation only accepts absent/zero-lamport empty System account at expected
canonical seeds. Prefunded rejects explicitly; no recovery/allocate-assign path.
After creation checks actual data length/type/owner again. Foreign accounts reject.
Initializer signature and initializer-derived namespace bind Market, and manifest
must match every configured authority; no any-caller initialization assumption.

Start recomputes requestHash from W2 DeliveryRequest using stored owner/Series/hash,
provided nonce and expected pre-start cursor. Require owner signature/current cursor
and <useBySlot. Native record sets startSlot, deadline=startSlot+150, requestHash and
lockStartCursor; advances cursor. Exact duplicate verifies stored owner/request/
start cursor and returns original lock/terminal, even if deadline/useBy passed.
Fresh stale request rejects. StartDelivery updates the existing Unit and creates no
account. A service may sponsor its transaction fee, but direct owner admission needs
neither matcher nor gateway signature.

Finalize/refund/timeout require exact locked cursor and request identity. Validate
Unit.primaryMatch, kindPrimary/SponsoredPrimary, statePrimaryEscrowed,gross=P and
recorded issuer/Series. No historical secondary receipts/recipients are passed.
Finalize (<deadline,gateway) pays issuer P-fee(P) and collector fee(P), marks primary
PrimarySettled and UnitConsumed. Expire (FundedOpen,slot>=useBy) makes the same primary
payout and UnitExpired. No financial Expire for unfundedIssuerOpen; funding is simply
ineligible afteruseBy. RefundFailure(gateway,Locked) orTimeout(slot>=deadline,Locked)
pays all P to Unit.owner for ordinary units or immutable sponsorRefundKey for
sponsored; primaryfee0, statePrimaryRefunded, UnitRefunded. Store actual terminal
recipient/operation/slot, increment cursor and extinguish claim. Secondary receipts
remain SecondarySettled, sellers/secondaryfees retain cash. Wrong current-holder/
sponsor destination rejects. Exact replay yields existing evidence and no new
payment; another terminal action conflicts. Sibling refund evidence can supersede
an outbox action without pretending that losing transaction executed.

## W5. Equality, amounts, receipts and message bounds

Trading identities issuer,buyerA,buyerB,sponsor are pairwise distinct. Collector is
distinct from all of them and from matcher/gateway. Initializer,matcher,gateway may
share one operating key. Direct payer=beneficiary; sponsored payer!=beneficiary.
Seller!=payer and seller!=beneficiary. A historical payer/seller may recur across
DIFFERENT matches. For native terminal calls by a recipient, fee debit and multiple
credits aggregate by pubkey. No state/escrow PDA may equal any external role; all
Match PDAs in one chain distinct. System/program keys cannot be user/state accounts.
Canonical account-key deduplication does not erase economic roles or obligations.

For each unique wallet k:expected delta=sum(contractual credits to k)-sum(gross
funding from k)-actual network fee if k is tx fee payer-rent funded by k. Surplus
and existing rent are tracked separately. Compare changes at a coherent finalized
transaction/account context; future unrelated credits are not proof of this trade.
Program direct escrow debits preserve recorded rent and change total lamports by0.

Conservative legacy message budget, including1signature-count byte,64bytes per
signature,3byte message header,1byte key count,32bytes/key,32byte blockhash,1byte
instruction count, and each compiled instruction(1program index+1account-count+
indices+1/2data-length+data):
- Fund max4distinct signers,14keys,13instruction indices,data<=330bytes:
  1+256+3+1+448+32+1+(1+1+13+2+330)=1089bytes <1232.
  Kind1 adds primaryMatch; kinds0/2 have fewer keys. Native data is316bytes.
- Terminal max2distinct signers,9keys,7indices,data<=110bytes:
  1+128+3+1+288+32+1+(1+1+7+1+110)=574bytes <1232.
- Registration<=3signers,9keys,data<=330bytes,one instruction <900bytes.
These are bounds from the frozen layouts, not executed serialization/CU evidence.
No priority-fee/compute-budget/extra top-up instruction is included in those bounds.
If actual serialization exceeds the bound, do not silently add ALTs or new formats;
return to the contract. Default max200000CU; measure real worst-case program compute
afterGO and report failure if it needs a separately reviewed increase.

Private response canonical JSON (sorted keys, no undefined/nonfinite values):
{schema:'axp.delivery.v2',domain,unit,owner,requestHash,deliveryId,resourceHash,
versionHash,contentType,content,sponsored:null|{campaignId,packetHash,packet,
disclosure:'Sponsored'}}. deliveryId=H(D||ASCII('delivery')||unit||requestHash).
responseHash=H(exact canonical UTF-8 JSON). It contains NO transaction signature,
so responseHash can be durably prepared before signing Finalize. Native Unit stores
responseHash; HTTP returns the same response bytes plus separately labeled native
receipt evidence. Late observation metadata never changes the protected response.

Public receipt exposes program/market/genesis, operationId,type,status, unit/cursor,
match IDs and immutable terms hash, gross/fee, terminal reason/slot and original
signature if known. `evidence=transaction-finalized` or `account-state-only` is
explicit. Account-only recovery does not invent signature/fee/delta data.

## W6. API/store/adapter contracts

HTTP loopback only, exact Host/Origin for API, fixed demo mode, bounded JSON and
sanitized fixed errors. Read APIs do not sign, send or mutate. No generic transaction
submission endpoint. APIs under /api/trading; reference /api/market stays synthetic.

- POST /orders body{authorization,signature,idempotencyKey}; W2kind1. Returns
  {orderId,state,version,sequence,matchId|null,operationId|null,reservation}.
- POST /orders/cancel same envelope W2kind2; returns stateCancelled or409
  PENDING_SETTLEMENT, never a false cancellation of signed intent.
- POST /campaigns same envelope kind3; fields derive from bytes.
- POST /sponsored-access same envelope kind4 plus issuer posted-order authorization;
  exact fixed-price quote required; returns match/operation identity or rejection.
- POST /deliveries/start same envelope kind5;202pending with operation identity,
  never a claim of native admission before reconciliation.
- POST /deliveries/process {unit,requestHash,idempotencyKey}, explicit local gateway
  action on an already finalized lock; no caller override of bytes/payees/outcome.
- POST /deliveries/read same envelope kind6; returns original private response only
  after Consumed/owner/request/hash verification. No operation/ledger row for reads.
- POST /operations/:id/reconcile is an explicit operator operation that observes
  only the original attempt/accounts; returns typed reducer state, never auto-signs.
- POST /operations/:id/resend sends SAME persisted bytes only after explicit checked
  reconciliation while blockhashvalid; no second attempt/key. No automatic retry.
- GET /book?series, /orders/:id, /operations/:id, /units/:id, /health expose bounded
  projections; private content/signers excluded. Include mode/local genesis and
  authoritative source. Pagination/focused recovery must not depend on last-N lists.

Store: admitAuthorization, cancelUnsigned, reserveMatch, prepareNativeOperation,
persistSignedAttempt, observeOperation, preparePrivateResponse, projectActor.
Every mutation uses actor/key+byteHash and versioned compare-and-set. Reusing same
signed nonce under a fresh HTTP key cannot create another authorization. Native
operation rows have id,type,termsHash,unit,matchIds,sourceCursor,state,attempt|null,
lastObservedSlot,version,reservation IDs. Signed attempt includes exact message/
transaction bytes,signature,blockhash,lastValidBlockHeight and operating reserves.
One attempt maximum. Method returns exact original operation on idempotent replay.

Adapter: inspectRun, prepareMessage(typedOperation), signExact(validatedMessage),
sendPersisted(attempt), observeFinalized(attempt,expectedAccounts). No arbitrary
URL,key,recipient,program or amount override. Admission fetches local chain context
outside DB lock; signing revalidates versions/balances/mandates and writes bytes
inside the sole-writer transaction. Broadcast after durable commit only.

Monotonic observation contract: reducer compares contextSlot>=watermark and allowed
state transition. PrimaryEscrowed->PrimarySettled/PrimaryRefunded proves primary funding; SecondarySettled
proves its immediate seller payment; current later
Unit cursor never erases old Match. Start->Consumed/Refunded with same request proves
Start occurred. A terminal state is never downgraded by late Funding/Start observations.
Conflicting terminal facts quarantine. Known failed tx plus exact successful program
receipt is not interpreted as fresh failure; flag continuity/identity contradiction.
Unknown history leaves full unresolved operating fee allowance; account-only economic
success can be stated separately. No negative absence proof or fresh-signature retry.

Fixed error meanings: INVALID_INPUT400, INVALID_AUTH403, NONCE_CONFLICT409,
INCOMPATIBLE409, INSUFFICIENT_AVAILABLE409, STALE_CURSOR409, SELF_TRADE409,
EXPIRED410, PENDING_SETTLEMENT409, TERMINAL_CONFLICT409, ALREADY_USED409,
CAPACITY503, RUN_MISMATCH503, PREFUNDED_PDA_UNSUPPORTED409, RECIPIENT_STATE409.
Rust numeric custom codes map in that listed order starting1; native missing-signature/
owner errors may be translated to INVALID_AUTH. Error bodies contain code and stable
operation ID when safe, never private bytes/keys/raw provider errors.

## Bounded correction note — 26 October 2026

- The shared Fund account list now marks seller(s,w): secondary settlement credits
  the seller through System CPI, so signer status alone is insufficient. This does
  not change primary escrow or fee economics.
- StartDelivery now lists owner(s,w),market,series,unit(w). The owner can submit and
  pay the fee directly; matcher sponsorship is optional at the transaction level,
  not an instruction authorization requirement. No gateway signature is required.
- Corrected the printed conservative byte sums (the component bounds are unchanged):
  Fund: 1+256+3+1+448+32+1 = 742; instruction 1+1+13+2+330 = 347;
  total 742+347 = 1089 bytes, below 1232.
  Terminal: 1+128+3+1+288+32+1 = 454; instruction 1+1+7+1+110 = 120;
  total 454+120 = 574 bytes, below 1232.

Validation here is document/account-role inspection and arithmetic only; no program
serialization, tests, build, native execution or implementation approval is claimed.
