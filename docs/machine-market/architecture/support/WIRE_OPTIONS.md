# Minimal wire contract proposal — drafting assistance

26 October 2026. **Drafting proposal, not independent audit or GO.** One local writer, fixture signers, intact current database/ledger, localhost SOL. Only this file changed; no execution. Root parent `01a17200-435b-74c1-9fd0-24a82e3f60ee` must review the complete frozen packet and explicitly GO before builders resume.

## 1. Inputs and integration corrections

Exact SHA-256 inputs read:

| File under `docs/machine-market/` | SHA-256 |
| --- | --- |
| `architecture/SPEC_V2.md` | `29df4a058f90bb51d67ac76b8c8feb6475e5e4f3364a534e49ead49919cdeb0f` |
| `AUDIT_DISPOSITIONS.md` | `1d93009a6572837ba1c9c56d1a531d7977e1bd7603bad0dd23815b5f36f36ebd` |
| `audits/market/ROUND1.md` | `3dc56959a91f6151e7434c1704695adea33b9ae8fcbc9580e52a579d5b793b64` |
| `audits/solana/ROUND1.md` | `ed1db5f3bff35ef4b70448e3117341c1ce315aeccf4fbf76ec97d9dc6b801234` |
| `audits/backend/ROUND1.md` | `cc18ed4203f2387226d63480f1f7bb2d4a0fb7ee8fc8deb68e6e1076bc3cd7d4` |

Prefer the narrower SPEC_V2 choices, subject to review. Reconcile these contradictions before freezing:

- MKT-005 disposition says native campaign caps; S5 makes aggregate caps backend/signing-adapter policy.
- SOL-R1-001 disposition promises persistent cancellations after old-DB restoration; S3 makes cancellation offchain and S10 excludes restoration.
- SOL-R1-003 disposition proposes atomic top-ups; S7 instead preserves recipient reserves and safely blocks unsupported drained destinations.
- SOL-R1-004/BKR1-01 disposition retains independent anchors; S10 excludes that subsystem. S9's “anchored” wording also needs removal or a precise local meaning.
- S4's “finalized cancellation tombstone” and S6's native “cancelled order identities” conflict with offchain cancellation. Replace with retained database terminal records; do not accidentally introduce CancelOrder instructions.

## 2. Canonical identities and authority

Use SHA-256, fixed tagged schemas, and deterministic identities. No JSON signing, optional execution defaults or caller-selected Match IDs. Define `H(tag, fields)` as SHA-256 of a fixed ASCII tag plus the specified fixed-width ordered encoding; variable lists carry explicit counts.

`domain = H("AXPMM2-DOMAIN", genesisHash, programId, marketPDA, rulesHash)`. Rules hash covers canonical economic constants/terms, not the manifest containing its own hash. Initializer and random run nonce derive Market; genesis binding is checked by the adapter against the actual endpoint. A stored hash alone does not let the program independently discover network genesis.

| Identity | Proposed derivation / invariant |
| --- | --- |
| Market | PDA seeds `mm2-market`, initializer pubkey, runNonce32; initializer signature required |
| Series | PDA seeds `mm2-series`, Market, issuerNonce32; immutable terms hash |
| Unit | PDA seeds `mm2-unit`, Series, lifetime ordinal u32; no reuse |
| Authorization ID | `H("AXPMM2-AUTH-ID", domain, actor, nonce32)`; nonce unique across mutation kinds for that actor |
| Order ID | Authorization ID; signed byte hash stored separately; same nonce/different bytes rejects |
| OrderUse | PDA seeds `mm2-use`, Market, Authorization ID; permanent filled-order tombstone |
| Auction / Campaign | Creation authorization ID; immutable terms/version hash; offchain records |
| Match | `H("AXPMM2-MATCH", domain, unit, expectedCursor, buyAuthId, sellAuthId)`; PDA seeds `mm2-match`, Market, Match ID |
| Delivery | `H("AXPMM2-DELIVERY", domain, unit, cursor, owner, requestNonce32)`; public identity, never a bearer credential |
| Operation | `H("AXPMM2-OP", domain, operationKind, stableTargetId)`; immutable payload hash stored alongside |

Stable targets: Market for Init, Series for Issue, Unit for Register/Expire, Match for Fund, Delivery for Start/Finalize/Failure/Timeout. Kind distinguishes competing terminal actions. Changed payload under an operation ID rejects rather than generating another attempt. Existing accounts retain effect identity.

## 3. Signed semantic messages

Common envelope: fixed magic, schema version u8, kind u8, domain32, actor32, nonce32, then the following ordered payload. Sign these exact bytes with Ed25519; store bytes and signature64. All references are fixed 32-byte IDs/hashes; all monetary values, cursors and slots are u64. Terms hash resolves an immutable record, never a mutable URL.

| Kind / signing actor | Payload beyond common envelope |
| --- | --- |
| IssueSeries / issuer | contentHash, format enum, cap u32, sponsoredPrice, useBySlot, resaleAllowed bool, maxTransfers u8, deliveryPolicyVersion |
| RegisterUnit / issuer | Series, ordinal u32, termsHash |
| BookBid / payer=beneficiary | Series, termsHash, limitPrice, minRemainingTransfersAfterFill u8, TIF enum, validUntilSlot; quantity implicitly one; no unit/cursor wildcard bytes |
| BookAsk / seller | Series, termsHash, exact Unit, expectedCursor, limitPrice, TIF, validUntilSlot, lane primary/secondary |
| Cancel / original actor | targetAuthId, targetAuthHash, validUntilSlot; exact authorization only |
| CreateAuction / issuer | Unit, cursor0, Series, termsHash, floor, cap, biddingEndsSlot, fundingEndsSlot, auctionRuleVersion |
| AuctionBid / buyer | auctionId, auctionTermsHash, amount, revision u32, priorBidAuthId (zero for first), minRemainingTransfersAfterFill; windows inherited from immutable auction terms |
| CloseAuction / issuer or operator | auctionId, auctionTermsHash; no caller-selected winning price/order |
| SponsorMandate / sponsor | Series, termsHash, packetHash, maxGross, perGrantCap, maxGrants u32, beneficiaryCount u8 and sorted unique beneficiary keys (1–4), validUntilSlot, sponsorRuleVersion |
| SponsorConsent / beneficiary | campaignId, mandateHash, Unit, cursor0, Series, termsHash, packetHash, gross, sponsor, validUntilSlot, nontransferable=true, assessment enum |
| StartDelivery / owner | Unit, cursor, Series, termsHash, contentHash; envelope nonce derives Delivery ID |
| RetrieveDelivery / owner | Delivery ID, responseHash; fresh signed read proof; URL/ID alone cannot release bytes |

Auction revisions use fresh nonces; the previous revision becomes Superseded and its hold is transferred/adjusted atomically. Auction creation is the sell authorization, winning revision the buy authorization. Sponsored consent is the one-grant buy authorization; obtain an issuer-signed exact primary ask at sponsoredPrice as the sell authorization, reserved in the sponsored lane. The mandate is reusable policy, **not** a consumed one-grant OrderUse.

Adapters compare reconstructed native messages against saved authorizations, reservations and current state. Native co-signatures approve that exact match. The program need not verify detached signatures or re-run the book: it verifies native signers, supplied bounds/deadlines, cursor, roles, immutable terms and nullifiers. Opaque hashes do not prove their hidden price/TIF fields; that comparison remains adapter trust.

## 4. Minimal native account and instruction contract

Every state account has type/version, canonical PDA/bump, Market linkage and exact length. Proposed retained fields:

| Account | Essential fields beyond identity |
| --- | --- |
| Market | initializer/run nonce, domain inputs, issuer, matcher/gateway, collector, caps, lifetime counters |
| Series | issuer, content/terms hashes, format, cap/issued count, price, useBySlot, resale/delivery policy |
| Unit | Series, ordinal, state, owner, cursor, transferCount, sponsored flag, ordered Match IDs (max4), Delivery ID/request binding, start/deadline slots, responseHash, terminal kind/op hash |
| OrderUse | actor, nonce, authorization ID/hash, Match ID; immutable after funding |
| Match | Unit, before/after cursor, lane, buy/sell IDs+hashes, payer, beneficiary, seller, gross, fee, status, fund operation/payload hash, terminal operation hash; auction/campaign evidence hash when applicable |

Fund passes exact gross, limit bounds, effective funding deadline, minimum remaining transfers and lane-specific terms. Book deadline is the minimum of both signed expiries and useBySlot. Auction additionally binds auction ID and both window slots. Sponsored funding binds mandate/consent/packet hashes and exact primary price. Signers reconstruct those fields rather than trusting an arbitrary backend intent.

| Instruction | Required economic signer / writable effects |
| --- | --- |
| Init / Issue / Register | Initializer / manifest issuer / issuer respectively; operator pays separate rent; counters never recycle |
| FundBook / FundAuction | Payer=beneficiary, current seller and matcher; write Market counter, Unit, new Match, both OrderUse, payer and operator; Series read |
| FundSponsored | Sponsor payer, beneficiary, issuer seller and matcher; same writes, exact primary cursor0/nontransferability |
| StartDelivery | Current owner; write Unit lock; operator may pay fee but gateway permission is unnecessary |
| Finalize / FailureRefund | Gateway; write Unit, every stored Match, required payout/refund wallets; collector only for payout |
| Timeout / Expire | Permissionless trigger subject to native state/Clock; same complete terminal effect set |

Freeze exact account-meta order and writable/signer bits for each variant before GO. Match/Unit/Series/Market/OrderUse accounts must validate program ownership, type, seeds, linkage and expected identity; differing state IDs cannot alias. Direct payer=beneficiary and matcher=gateway=fee payer are allowed. Operator and collector are distinct from trading actors and each other; current seller differs from payer/beneficiary. Historical recipients may repeat. Aggregate credits by public key; reject omitted, extra or repeated Match identities.

Fund atomically transfers full gross, creates both nullifiers and advances owner/cursor. Checked fee is floor(gross×100/10000); intermediate u128. Settlement debits only program-owned escrow, credits unique destinations, and retains rent/surplus. Reject unexpected prefunded new PDAs; do not repair them. Program-owned direct debit and instruction conservation follow [Solana modification rules](https://solana.com/docs/core/accounts/modification-rules). PDA seeds above respect the documented [32-byte-per-seed bound](https://solana.com/docs/core/pda).

## 5. Effects, API and replay

Mutation API accepts only `{authorizationBytes, signature, httpIdempotencyKey}`; compound sponsored admission also names the already authenticated mandate/ask. IDs derive from signed content. Persist body hashes; conflicting reuse rejects. Internal matching constructs native operations, never accepts arbitrary serialized transactions from the browser.

Return separate `authorizationState`, `operationState`, `nativeEffect`, `observationSlot`, `signature`, `evidenceKind` and `errorCode`. A pending HTTP202 is not funding, delivery or payout. Read-only status projects saved evidence without signing. Authenticated retrieval returns bytes only for finalized Consumed with the exact owner/cursor/Delivery/response hash; no useBy cutoff on that recovery within this bounded run.

Operation lifecycle: Reserved → Prepared → Signed → Submitted/Unknown → ResolvedSuccess/ResolvedFailure/Quarantined. One signed attempt maximum, persisted before broadcast. NeverSignedAbort requires the exclusive writer transaction and no signed-attempt row; both reserved orders become FailedClosed. A cancelled unmatched order releases its sole hold locally. Signed/unknown funding cannot be cancelled or release principal. Failed IOC never rests again.

Native replay precedence: validate account identity, immutable payload and required authority first; recognize exact existing effect **before** evaluating today's ownership/expiry for a new transition. Exact duplicate returns retained evidence without money movement. Changed payload rejects. Funding Match in Settled/Refunded still proves original funding; require both OrderUse links. Unit terminal state dominates a late Start observation. Sibling refund success is SupersededByRefund, not proof the losing attempt executed. Null history never proves failure. Account-only recovery may establish principal while operating fees remain unknown/reserved.

Delivery locks require slot<useBy; deadline=start+150. Finalize requires slot<deadline, Timeout slot>=deadline. FailureRefund only accepts locked state. Expire only accepts open state at slot>=useBy. Gateway scans the bounded Unit set for direct owner starts, prepares immutable response bytes durably, then signs Finalize. No bytes leave on unknown/refunded/expired state.

| Worked trace | Required result |
| --- | --- |
| Resting ask90; incoming bid100 | Gross90; release10 improvement; one hold moves order→match; primary owner/cursor advances once |
| Resale candidate leaves0; bid requires1 | Skip candidate before price-time selection; min0 explicitly permits it |
| A1, B100, A increases100 | B wins; A's revision has later priority |
| Sponsor cap100; simultaneous60+60 | One reserves; second rejects; refunded first grant still consumes60 allowance |
| Same filled bid, different Unit/Match | Existing OrderUse rejects another debit |
| Start at E−1; Finalize within lease, observed after E | Consumed exact response remains retrievable; second request cannot consume/resell |
| Funding response lost; native expiry later settles | Settled Match proves funding; release principal hold once; preserve unknown fee reservation |
| Issuer→A→B→A, gross10000/15000/8000 | Payout9900/14850/7920 plus330 fee; refund A18000 and B15000, no duplicate escrow debit |

## 6. Freeze boundary and proportionate dispositions

**Before code:** agree every schema/enum, nonce scope, hash preimage, seed, state/replay rule, signer/meta matrix, exact account lengths, terminal evidence, API outcome semantics and acceptance trace. Freeze numeric tags/offsets in WIRE_V2 with the bundle, avoiding Rust/JavaScript defaults. Use little-endian unsigned integers, raw pubkeys/hashes, boolean0/1, bounded count-prefixed arrays, reject unknown variants/trailing bytes. JSON displays u64 as decimal strings; JavaScript uses BigInt internally. Reserve zero sentinels only where explicitly specified.

**After GO:** implement codecs, shared golden/negative vectors, rent calculations, actual legacy serialization/compute checks, concurrency/crash and native-delta evidence. These are validation work, not permission to choose different semantics. Full signed authorizations stay offchain; native instructions carry compact fields/hashes. Freeze worst-case byte arithmetic first, especially four-signer sponsored funding and four-Match closure; the [legacy transaction limit is 1,232 bytes](https://solana.com/docs/core/transactions/transaction-structure). No need for lookup-table infrastructure or detached-signature precompiles merely to fit an oversized unreviewed design.

Original severities retained; proposed classifications, not closures:

| Original findings | MVP classification and reason |
| --- | --- |
| MKT-001 High; MKT-002 High; SOL-R1-001 High; SOL-R1-002 High; BKR1-02 High; BKR1-03 High | A: rights, one-fill enforcement, monotonic effects and native delivery precedence |
| BKR1-01 High | A: intact-DB restart/scan and duplicate protection; C only for arbitrary backup/ledger restoration, explicitly unsupported |
| MKT-003 Medium; MKT-004 Medium; MKT-005 Medium; MKT-006 Medium; MKT-007 Medium | A: complete authority, holds, sponsor routing/caps, auction priority and legitimate aliases |
| SOL-R1-005 Medium; SOL-R1-006 Medium; BKR1-04 Medium; BKR1-05 Medium; BKR1-07 Medium | A: cross-language contract, signatures, clocks and frozen normative dependencies |
| SOL-R1-003 Medium | A: supported-flow recipient-reserve/conservation checks; C: automatic repair of externally drained/reassigned wallets |
| SOL-R1-004 Medium | A: no absence-based replacement, preserved uncertainty; C: independent restoration infrastructure |
| BKR1-06 Medium | A: finite admission/recovery headroom; B: inexpensive physical-size telemetry; C: indefinite archives/HA/disaster recovery |
| MKT-008 Low | B: cheap manifest/reference cleanup, still required to make this gate's target unambiguous |

Remaining choices: byte layouts/size feasibility and approval of narrowed dispositions. Return conflicts to review; never weaken authorization or escrow guarantees to fit.

## 7. Scope and economic alternatives for parent decision

Proposed boundary, **not an adopted spec change**:

| Question | Smallest sufficient choice / tradeoff |
| --- | --- |
| Native cancellation | Omit, as S3 already does. Intact-DB cancellation plus filled-order nullifiers suffices; no restored-cancellation guarantee. |
| Two matching mechanisms | Prefer primary posted offers plus price-time resale book for first native acceptance. Defer auctions if parent explicitly changes scope; retain section3 auction semantics if both remain required. This loses mechanism comparison, not resale/escrow proof. |
| Immutable loader | Fixed verified code is essential; irrevocable upgrade-authority removal is B, cheap if supported by the pinned setup. Alternative: trusted operator retains authority but never upgrades during run; verify binary before signing. This adds explicit upgrade trust. No upgrade-governance subsystem. |
| Rent / restart machinery | Keep recipient reserve checks, exact current-DB reconciliation and unknown quarantine. Omit automatic top-ups, backup restoration and independent anchors. External wallet changes may block completion; ordinary supported funding must preserve reserves. |

**Name the current instrument “contingent resale with full-chain escrow.”** Each seller transfers the unused right now and receives a conditional claim to its own gross minus fee, payable only on delivery or unused expiry. Intermediate buyers finance purchases from their own wallet; anticipated sale proceeds cannot fund another purchase. Failure refunds each original payer, including former owners; resale transfers neither those refund claims nor released cash. Prices10000→15000→8000 lock33000 principal, plus separate operating costs. This is useful for demonstrating transferable access with complete unwind across a short chain; it is capital-intensive and does not demonstrate ordinary immediately settled spot trading.

A coherent alternative keeps only primary10000 escrow and settles secondary15000/8000 payments immediately. Transfer the **primary face-value refund claim** with ownership: failure pays the final owner10000 from that existing escrow; prior secondary sellers retain14850/7920 and fees230 remain earned. Success pays the issuer from primary escrow. The final owner's refund can exceed or fall below its last purchase price. Secondary trades are final and cannot all unwind. This lowers retained principal to10000 but changes the instrument, disclosure, pricing predicate and terminal wire contract; there is no backing for refunding every secondary gross.

**Recommendation:** retain full-chain escrow for the currently promised all-payer refund demonstration; disclose its conditional economics and capital cost. Choose immediate secondary settlement only with explicit parent approval of the changed refund right. Never combine immediate proceeds with the existing full-chain refund promise without separately specified collateral.

## 8. Delta: preferred primary escrow and settled secondary market

26 October 2026. **Informational candidate following root direction; Round 2 and explicit root GO remain outstanding.** This appendix supersedes this contribution's earlier full-chain-escrow recommendation for the preferred candidate; preceding text remains comparison history, not a second implementation. Architect owns integration. Refreshed SPEC_V2 input SHA-256: `a3c1bf35cf93637bd47d5047d654de294d1b7747ae6cba0ebe150cac1ccdf011`; it still describes the old economic model. Earlier recorded hashes remain unchanged provenance.

### One mechanism and one primary obligation

Retain quantity-one continuous price-time matching, resting-price execution, IOC/GTC, reservations and exact order nullifiers. Remove auction authorizations, windows, revisions and native variants from the candidate. Sponsored acquisition remains exact-price primary-only: use the same matching checks with signed consent and eligible issuer inventory; reject a price/unit change rather than substitute. One writer and same intact database/ledger restart remain the supported operating boundary.

Use the **primary Match PDA as the sole principal escrow**, avoiding another account type. Store `primaryGross=P`, primary fee, issuer, original payer, refundMode (`CurrentHolder` or `Sponsor`), sponsor key where applicable, and status `Escrow/Settled/Refunded`. Unit stores immutable `primaryMatchId`, claim policy and current owner/cursor. Ordinary ownership carries the indivisible P refund claim automatically; no independent claim token or transfer API. Sponsored Unit is permanently nontransferable; beneficiary controls redemption, but refund always credits its recorded sponsor.

Secondary Match accounts become permanent **receipt-only** records: unit/primaryMatch linkage, buyer/seller, before/after cursor, authorization hashes/nullifiers, gross Q, fee, operation hash and `Executed` status. They hold rent, not resale principal, and never transition to Refunded merely because resource delivery fails. No terminal instruction needs historical seller/payer accounts.

### Atomic secondary sale and fees

Split native effects into `FundPrimary` and `TradeSecondary`; new rule/schema domains invalidate old authorizations. TradeSecondary requires buyer, current seller and matcher signatures, an open transferable Unit, exact expected cursor, valid signed bounds/deadlines, remaining transfers and unused orders. In one transaction: debit buyer Q; pay seller Q−fee(Q); pay collector fee(Q); create receipt/nullifiers; advance ownership/cursor. Failure rolls back every economic effect. Primary escrow stays P. Read the linked primary escrow to validate the claim; never replace it or replenish it from a secondary purchase.

Recommend the existing 1% floor rule with **primary fee deferred** until successful delivery or unused expiry, and **secondary fee earned immediately** at trade execution. Primary failure/timeout refunds all P with no primary fee; secondary fees and seller proceeds are final. Taking primary fee upfront would instead require a smaller refund promise or separate backing; do not silently choose it. Operator transaction fees/rent remain separate and may arise on failed attempts.

Terminal success/unused expiry distributes only P−fee(P) to issuer and fee(P) to collector. Failure/timeout distributes only P to the current holder locked at StartDelivery, or recorded sponsor. Keep native admission-before-readiness, timeout precedence and post-commit exact-response recovery. Unused expiry still pays issuer, not holder; this distinction must be signed into terms. DeliveryLocked prohibits resale, so refund recipient cannot change during delivery.

### Consent, recovery and conservation

**Essential open A choice:** units in one Series can have different P because primary fills occur at different prices. A generic bid cannot silently accept an arbitrary refund claim. Recommend adding signed `minPrimaryRefundLamports` alongside minimum remaining transfers; primary matching checks prospective P=execution gross, secondary matching checks stored P. Exact selected P, refundMode and primaryMatchId bind the native transaction and adapter review. An exact-unit bid is a narrower alternative. Freeze this eligibility rule before claiming MKT-002 closed.

API/evidence separates `PrimaryEscrowed`, `SecondaryExecuted`, `PrimarySettled` and `PrimaryRefunded`; never describe every Match as refunded. Account-state receipt recovery can prove an old secondary execution after subsequent resale/redemption without restoring old ownership. Unknown trade outcomes retain holds and prohibit fresh signing; finalized receipt/nullifiers resolve the original effect once. Do not count an observed wallet credit twice or make unknown proceeds spendable. Same receipt replay has zero payment; competing sell/delivery transactions serialize on Unit cursor/state. Primary terminal status plus Unit terminal identity prevent duplicate claims.

Paper trace: primary P=10000, resales15000 then8000. Secondary sellers immediately receive14850 and7920; collector receives230. Outstanding principal remains10000. Success adds issuer9900 and fee100; failure instead adds10000 to the final holder. Immediate distributions23000 plus retained10000 equal purchased gross33000; both terminal branches conserve33000. A holder who paid15000 risks5000 premium on failure; one who paid8000 can receive10000. This is explicit face-value coverage, not purchase-price insurance or proof of profitable demand.

Acceptance must cover both terminal branches, sponsorship refund destination, heterogeneous-P filtering, failed secondary atomicity, duplicate orders/receipts, stale-owner redemption, transfer-versus-lock races and restart after lost trade response. Keep previous A/B/C dispositions except **MKT-006 Medium → C**, with auctions wholly unsupported; original severity/report remain intact. New economics and claim compatibility remain open A integration work until reviewed. No other fundamental finding is waived by simplification.
