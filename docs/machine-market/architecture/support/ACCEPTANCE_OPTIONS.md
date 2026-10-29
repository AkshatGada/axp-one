# Bounded MVP acceptance options — drafting proposal

26 October 2026. **Assistance to the architect, not an independent audit verdict, frozen specification, execution evidence or GO.** Only this file is owned by this drafting helper. The lead selects and integrates scope; reviewers independently challenge the resulting packet. Root parent `01a17200-435b-74c1-9fd0-24a82e3f60ee` must review the complete packet and explicitly GO before builders resume.

## Input identity

Input SHA-256 snapshots (paths relative to `docs/machine-market/`):

| Input | SHA-256 |
| --- | --- |
| `architecture/SPEC_V2.md` — mutable DRAFT | `29df4a058f90bb51d67ac76b8c8feb6475e5e4f3364a534e49ead49919cdeb0f` |
| `AUDIT_DISPOSITIONS.md` — mutable DRAFT | `1d93009a6572837ba1c9c56d1a531d7977e1bd7603bad0dd23815b5f36f36ebd` |
| `audits/market/ROUND1.md` | `3dc56959a91f6151e7434c1704695adea33b9ae8fcbc9580e52a579d5b793b64` |
| `audits/solana/ROUND1.md` | `ed1db5f3bff35ef4b70448e3117341c1ce315aeccf4fbf76ec97d9dc6b801234` |
| `audits/backend/ROUND1.md` | `cc18ed4203f2387226d63480f1f7bb2d4a0fb7ee8fc8deb68e6e1076bc3cd7d4` |

The reports identify frozen V1 as `91d04eea60761c04f7517944bcd055acd6cd5e0b2d7b9391cdfbf5b59a785a2c`; V1 and reports remain untouched. Later draft changes require reconciliation against these inputs. No external reference was newly verified here. No tests, builds, validator, signing or RPC were executed.

## Recommended scope and classification

Demonstrate a meaningful trading engine: compatible quantity-one rights, price-time/maker-price matching, bounded resale, primary fixed-price sponsorship, redemption and genuine localhost SOL settlement. Keep one backend service, concurrent requests, controlled fixture signers and the same intact database/ledger across process restart. The UI exposes evidence.

**A** means an essential supported-flow blocker: specify before GO, then prove during implementation acceptance. **B** means useful if cheap; omit only with explicit narrower documentation. **C** means production hardening deferred under a named unsupported condition. Classification does not change original severity or close a finding. Mixed findings retain A for their core defect while separately deferring C extensions. No High is wholly waived.

Recommend disabling replacement signatures and supporting only exact persisted-byte reconciliation/rebroadcast under the frozen rules. Unknown principal/fees remain reserved. Defer HA, arbitrary backup/ledger restoration, malicious host control, external wallet drains, indefinite retention services and broad adversary campaigns. Core authority, duplicate-fill and concurrency checks remain.

## Mechanism and resale economics: bounded options

**Recommended proposal for lead selection:** one continuous limit book initially; primary sponsored procurement uses its separately consented fixed quote, not another competitive matching lane. A public auction is useful comparison research but optional, with its own later acceptance gate. Removing it narrows claims and drops auction execution from this matrix; retaining it requires T1/T5 and MKT-006 closure. This is a proposed cut, not an approved spec change.

| Settlement option | Economic obligation and tradeoff |
| --- | --- |
| Retain full-gross contingent resale | Each incoming buyer deposits the entire price. The selling holder transfers the unused right immediately but receives only a contingent claim to net proceeds. Sellers receive cash together on delivery commitment or unused expiry. On failure, each original payer receives its own gross back; those refund claims do not transfer with the right. |
| Immediately settle secondary sales | Pay each secondary seller at transfer. Thereafter those proceeds cannot fund refunds. A coherent minimal contract could retain only primary escrow and explicitly assign its bounded refund claim to the final holder; secondary premiums are nonrefundable and intermediate buyers retain no refund claims. This materially changes the instrument, consent, pricing and failure allocation. |

At prices10000/15000/8000, retained gross is33000, not8000. The issuer receives no interim cash; A finances10000 until terminal and awaits net14850 after selling; B finances15000 and awaits net7920; the final holder finances8000. On failure, refunds go to those respective payers. Successful expiry pays even without retrieval. Fees/rent need additional operating capital. Name this **contingent resale with deferred settlement**, not immediately settled spot trading.

Recommend retaining this model for first acceptance because four bounded gross escrows make the advertised full-chain unwind exactly funded and demonstrate transferable rights plus contingent claims. Its utility is an experiment, not evidence of capital efficiency or demand. Immediate secondary settlement is simpler operationally only after accepting weaker refund rights; preserving full refunds would require new explicit collateral, which is not proposed.

No native cancellation tombstone is needed under sole-writer/intact-DB cancellation. No restore anchors, automatic top-ups or HA are recommended. Immutable deployment is optional hardening under trusted fixture-operator control: an explicitly retained upgrade authority plus verified program bytes before signing is a narrower alternative, with no malicious-upgrade protection claim. Select one loader policy before GO; genuine deployed-program identity remains essential.

## All original findings: disposition options and regression obligations

Tests below are future obligations, grouped by matrix IDs to avoid duplicate suites. Each A requires its stated result without unexplained balance/authority changes.

| Original ID / severity | Proposed class and bounded obligation | Overlap / alternative |
| --- | --- | --- |
| MKT-001 / High | **A.** Execute delivery before E; delay finalized observation and restart beyond E. The original owner/request retrieves identical committed bytes; no second debit/refund. Timeout-winning case releases no bytes. | T6–T8; SOL-R1-002, BKR1-05. Preserve committed replay within run; reject a heuristic cutoff as closure. |
| MKT-002 / High | **A.** Same-series U has zero resales, V two. With max3, bid minRemaining=1 skips V; min0 may buy V and leaves0. Assert selected eligible best ask, exact cursor and post-fill allowance. Exclude sponsored/exhausted units. | T1; exact-unit-only bids are an alternative only if series matching is removed explicitly. |
| MKT-003 / Medium | **A.** Mutate TIF, kind/domain, unit/cursor, limit, expiry, auction ID/revision or consent with retained signature: reject before hold. Reuse one authorization under a new HTTP key or second unit: no new fill. | T2, T3; BKR1-04, SOL-R1-001. Freeze semantic bytes; do not let native co-signing silently enlarge authority. |
| MKT-004 / Medium | **A.** Kill before signed persistence: provably never-signed abort releases each hold once and terminalizes both orders. Failed IOC never rests. Cancel/fund race linearizes once; signed unknown never releases. | T3, T8; BKR1-02. Terminalizing failed GTC is simpler than restoring old priority. |
| MKT-005 / Medium | **A.** Concurrent60+60/cap100 admits one; refund does not replenish consumed cap. Changed unit/packet/price requires new consent. Secondary sponsorship rejects; negative assessment remains eligible; decline creates no obligation. | T4. Primary fixed-price only; aggregate policy is trusted backend/signer enforcement, not native campaign enforcement. |
| MKT-006 / Medium | **C if auctions omitted; A if retained.** A1/B100/A100 selects B after increase resets sequence; identical retry retains sequence. Test close equality and funding-window end, losing-hold release and failed-winner no fallback charge. | T1, T5. Original-entry priority is an alternative only with explicit incentive acceptance; no truthful-bidding claim. |
| MKT-007 / Medium | **A.** Issuer→A→B→A→B settles/refunds every gross exactly once with repeated wallet deltas aggregated. Direct payer=beneficiary works. Escrow-as-wallet and duplicate Match substitutions reject atomically. | T7; SOL-R1-006. Removing recurrence would change supported trading and must precede admission. |
| MKT-008 / Low | **B documentation cleanup**, with essential contract closure covered by A below. Mark historical code/PLAN informative and copy only adopted invariants; derive sample outcomes without mutable oracle defaults. | T0; SOL-R1-005, BKR1-07. Pinning a large historical oracle is unnecessary. |
| SOL-R1-001 / High | **A.** Fund O→U1, then submit O→U2 with fresh Match ID/current U2 cursor and sufficient funds: native OrderUse rejects; fresh O2 works. Concurrent attempts produce one consumption. Changed price/expiry fails signer reconstruction. | T2, T3, T7. Old-DB restoration is C, but same-order duplicate protection is not. Cancelled nonce also remains terminal in supported intact DB. |
| SOL-R1-002 / High | **A.** Same delayed-finality/lost-response trace as MKT-001, verified across native terminal state and gateway release. An old request from A before A→B→A cannot start/recover another cursor's request. | T6–T8. No independent duplicate timing suite needed. |
| SOL-R1-003 / Medium | **A supported rent invariant; C external drains/repair.** Setup reserves runtime-required wallet rent; all supported purchases preserve it. Small payout/refund succeeds. Invalid destination rejects atomically, preserving escrow; principal never pays rent repair. | T7, T9. Automatic top-ups/claim accounts deferred because external drains/reassignment are unsupported. |
| SOL-R1-004 / Medium | **C restore/replacement system; A uncertainty rule.** No fresh signature based on absent/pruned status or expired blockhash. Exact tombstone may prove principal while fees remain unknown. Current-DB process restart reconciles persisted attempts. | T8; BKR1-01/02. No claim to detect a coordinated same-genesis ledger/DB rollback; intentional restore cannot resume the old run. |
| SOL-R1-005 / Medium | **A.** Freeze signing/account/authority contract. Wrong initializer/domain/program/recipient/cursor, foreign PDA and oversize input reject. Valid replay is inert; prefunded PDA follows explicit unsupported rejection; escrow donation never increases payout. | T0, T2, T7, T9; BKR1-07. Exact error-number aesthetics may follow; economic semantics may not. |
| SOL-R1-006 / Medium | **A.** Use MKT-007's four-trade trace; aggregate by unique key, count each operator fee/rent once, preserve forbidden state/wallet separation. Test the narrow allowed authority-sharing matrix. | T7. Do not require fee-payer=trader where V2 explicitly excludes it. |
| BKR1-01 / High | **A consumption/startup barrier; C disaster restoration.** Same intact DB/ledger restart reconciles bounded native inventory before signing; missing known finalized state or observed cursor regression quarantines. Cross-unit duplicate O still rejects natively. | T2, T8; SOL-R1-001/004. No lost-cancellation reconstruction or independent rollback-anchor guarantee. |
| BKR1-02 / High | **A.** Funding response lost, then Match settles/expires: stronger immutable state resolves funding. Late Start success after refund never regresses Unit. Contradictory success/failure quarantines. Each native effect has stable operation identity; unknown fee stays reserved. | T8. One signed attempt removes replacement aggregation, not monotonic-reducer requirements. |
| BKR1-03 / High | **A.** Native Start before readiness, then source failure and delayed refund: ordinary expiry cannot pay locked unit; failure/timeout refunds all. Reverse ordering: expiry wins before Start, no admission/refund promise or byte release. | T6, T7. An offchain failure flag alone cannot establish priority. |
| BKR1-04 / Medium | **A.** Reuse T2's tagged payload vectors including cancellation domain, sponsor mandate/consent and auction revision; new HTTP key cannot bypass actor/nonce uniqueness. | MKT-003. Local role switching remains fixture impersonation, not wallet authentication. |
| BKR1-05 / Medium | **A.** E−1/E/E+1 and lease-deadline equality have one outcome; local wall-clock skew changes no economics. Blockheight expiry cannot release principal. Committed replay survives useBy. | T5, T6, T8; MKT-001, SOL-R1-002. |
| BKR1-06 / Medium | **A finite admission/drain; B pinned-reader exercise; C storage catastrophe/HA.** Lifetime orders/revisions, bytes and operation budgets reject before exhausting retained-evidence/terminal capacity. Ordinary crash keeps committed rows. Full storage safely blocks; no eviction or progress guarantee. | T9. Validate actual row/index/WAL allowance; do not demand replicated archives or claim power-loss proof from SIGKILL. |
| BKR1-07 / Medium | **A.** Freeze one complete normative manifest; trace primary/resale/sponsor/cancel/lock/timeout/recovery across interfaces. Backend/Rust canonical vectors agree byte-for-byte. Missing schema or contradictory authority blocks GO. | T0, T2; SOL-R1-005, MKT-008. No architecture verdict substitutes for implemented parity. |

## Finite acceptance matrix

Ten groups share fixtures and bounded schedules. Auction checks apply only if that lane is retained; otherwise it is explicitly unsupported. Each group reports pass/fail/not-run, input hash, expected and actual state/deltas. No performance or fleet-capacity claim is required.

| Group | Minimum meaningful coverage | Evidence tier |
| --- | --- | --- |
| T0 Contract | One manifest; all21 findings mapped; independent readers derive identical worked outcomes and authority boundaries. | Static review before GO |
| T1 Algorithm | Incoming buy/resting sell and incoming sell/resting buy at maker price; equal-price sequence; ineligible cheaper ask skipped; transfer-boundary cases; auction priority trace. | Deterministic engine vectors |
| T2 Authority | One valid canonical vector per mutation schema; one-field economic mutations; nonce replay; cross-unit native OrderUse; stale returning-owner cursor. | Shared byte vectors plus native critical negatives |
| T3 Concurrency | Six pair races: last unit, shared payer balance, same nonce, cancel/fund, resale/start, two redemptions. Force each winner ordering; compare to a valid serial history. | Backend barriers; native conflicting transactions where relevant |
| T4 Sponsor | Cap/count reserve race; known failure versus unknown; refund nonreplenishment; changed consent, decline, negative assessment and forbidden secondary acquisition. | Backend policy; native sponsored funding/redeem |
| T5 Clock/auction | Before/equal/after admission, bidding close, funding cutoff, useBy and lease deadline; display-clock skew. | Deterministic boundary vectors plus native guards |
| T6 Delivery | Delayed observation/restart after useBy; committed replay; locked-source failure versus expiry; expiry-before-start; owner-only recovery; timeout denies bytes. | Gateway/native integration |
| T7 Conservation | Four-trade payout and full refund, recurring recipients, unused expiry, escrow replay, wrong recipient/account substitutions, exact integer fee rounding/max amounts. | Actual localhost signatures/account deltas |
| T8 Recovery | For funding, Start and terminal payout/refund: kill after signed persistence before send, after send before observation, after observation before response. Add one never-signed abort and bounded reordered-observation vectors. | Same-DB process recovery; no restore simulation required |
| T9 Bounds | Each declared count/byte boundary accepts at limit/rejects next; reserve one unit's remaining drain; actual maximal four-Match serialization/runtime execution; destination/rent guards and safe write refusal. | Local storage checks and pinned runtime evidence |

For T7, principal identity is `deposited = live escrow principal + terminal seller net + market fees + refunds`. Rent, transaction fees and unsolicited surplus are separate terms. Per-key deltas combine recurring roles exactly once. Every claim of native success needs persisted signature, finalized status, instruction/account identity, immutable terminal receipt and reconciled balances; HTTP success or a mock ledger is insufficient. Account-state-only recovery is labeled narrower when transaction history/fees are unavailable.

## Compact substantive demonstration

Use one isolated run with finite fixtures. Show a limit-book price-improved primary purchase, competitive equal-price ordering and resale chain reaching the three-transfer limit. Redeem one chain, replay the same response after a lost response/restart, and show unchanged charges. On another chain, admit delivery then make the controlled source unavailable: refund every original gross. Show unused expiry separately so payout is not mislabeled delivery.

If retained, include one auction using A1/B100/A100. Include one independently selected primary sponsored resource with negative assessment, exact consent and nontransferability. Display book decisions, ownership/cursor, principal escrow, finalized payout/refund and authenticated response separately. Reuse these units for matrix evidence where possible; choose exact fixture count and native operation budget before execution. No additional funded runs are authorized by this proposal.

## Minimum gates and unresolved integration choices

1. **Architecture gate:** reconcile draft contradictions, freeze spec/wire/acceptance/manifest, independently review remaining A issues and explicit C assumptions; root reviews full packet and issues named GO. No builders resume earlier.
2. **Engine/interface gate:** T0–T5 deterministic obligations pass; no unresolved semantic defaults. Reuse evidence across overlaps.
3. **Native integration gate:** verified isolated toolchain/runtime and loopback identity, genuine deployed program, T6–T9 and maximum four-trade terminal feasibility. Respect authorized resource ceilings and at least40GB actual free disk; no cleanup of user state.
4. **Completion gate:** independently reconcile the finite demo evidence, remaining liabilities and limitations. Unresolved native outcomes prohibit completion claims and further spending; local code success is separate from native proof.

Lead decisions still needed: remove stale disposition claims of native campaign caps/cancellation tombstones and independent recovery anchors if selecting V2's backend campaign/offchain cancellation/no-restore model; clarify S9's word “anchored”; remove stale consumed/**cancelled** native-order wording inconsistent with filled-only OrderUse. Select exact capacity constants from measured encoded layouts after GO, without promising unmeasured headroom now. Resolve direct native Start monitoring and operation identity in the wire contract. These are proposed reconciliation items, not a new verdict or permission to implement.

## Delta appendix — root-preferred settled secondary market

**26 October 2026; candidate for architect integration and independent Round 2, not GO.** This appendix supersedes the earlier full-gross-chain recommendation and its full-chain-unwind acceptance obligations for the preferred candidate. Earlier text remains historical comparison, not a second implementation. Its pre-append SHA-256 was `a438da523adcb633dcd4b07499ad3908942070cca1a3ea3b7f216dce9306daa6`. This delta follows root's new direction; it does not certify intervening SPEC_V2 edits. Architect owns the selected contract; root must inspect changed sections and audits before authorizing implementation.

### Cash flows and claim ownership

Use one continuous price-time limit book, quantity one and resting-order execution price. Remove auctions, auction authorizations and auction-only acceptance cases from this first MVP. Sponsored acquisition remains an exact-price primary purchase under that mechanism, not an auction. Retain one writer and same-current-database/ledger restart only.

Proposed fee rule: `fee(gross)=floor(gross×100/10000)`. Hold **all primary gross**, including its contingent fee, until terminal outcome. Each secondary sale atomically debits its buyer, credits seller net and collector fee, transfers ownership **and the original primary-value refund claim**, advances cursor and consumes both order identities. Secondary proceeds and fees are final and nonrefundable. No secondary consideration becomes additional issuer escrow. Fees/rent for executing transactions remain separate operating costs.

Worked trace, lamports, excluding operating costs:

| Event | Cash movement | Remaining principal / claim |
| --- | --- | --- |
| Issuer→A at10000 | A deposits10000; issuer/collector receive0 | Escrow10000; A holds claim10000 |
| A→B at15000 | B pays15000; A receives14850; collector150 | Escrow10000; claim transfers exclusively to B |
| B→C at8000 | C pays8000; B receives7920; collector80 | Escrow10000; claim transfers exclusively to C |
| Successful redemption, or agreed unused expiry | Issuer9900; collector100 | Escrow principal0; claim extinguished |
| Instead: admitted delivery failure/timeout | C receives10000; issuer0; primary fee0 | Escrow principal0; claim extinguished |

The two terminal rows are mutually exclusive. After secondary sales, `33000 total consideration = 10000 live primary escrow + 22770 secondary seller proceeds + 230 secondary fees`. Success replaces10000 escrow with9900 issuer proceeds plus100 fee; failure replaces it with10000 current-holder refund. Rent/surplus never enlarge claim face. Historical payers receive no terminal refunds merely because they once owned the unit.

Premium risk is explicit: if B pays15000 and failure occurs before another sale, B recovers10000 and loses5000. A already realized4850 net profit. Buying at8000 can yield C a2000 gain upon qualifying failure; B has realized7080 loss. This is a funded claim purchased at a discount, not new backing or guaranteed arbitrage: eligibility, timing and gateway trust still govern recovery. Known-failure trading and deceptive listings remain risks; no production surveillance is promised. Delivery-locked or terminal units cannot trade.

A sponsor-funded unit cannot transfer: sponsor deposits primary gross, beneficiary receives access, and failure refunds the **sponsor**, never beneficiary. Successful delivery/unused expiry follows the same primary fee rule. Refund does not replenish campaign consumption.

### Replacement obligations, without a second matrix

Keep T1–T9 structure, replacing its chain-payout/refund expectations:

- **T1/T2:** signed terms disclose original primary claim face, fee timing and nonrefundable resale premium. Same-series units can have different primary execution prices: require an exact signed claim-face compatibility field for generic bids, or another explicitly reviewed predicate. Series identity alone is insufficient. Mutation or substitution rejects before reservation.
- **T3/T7:** replay secondary settlement, reuse an order on another unit, sell the last unit twice, and race resale against Start/expiry. One current cursor wins; losing transactions make no principal payment or ownership change. Cancel versus signed resale retains the existing unknown-outcome rule.
- **T6/T7:** execute the worked success and failure branches on separate units; include sponsor refund and a recurring owner. Old owners cannot redeem claims. Race refund against finalization and duplicate refund: exactly one primary disposition, no historical seller clawback, no second fee, no secondary refund. Preserve committed-response replay and expiry-versus-admission semantics.
- **T8/T9:** lose a secondary response, restart intact state, and reconcile immutable trade receipt, consumed orders and later ownership/terminal state without another seller payment. Measure the actual simplified terminal transaction; remove the obsolete requirement to distribute four historical escrows atomically.

Original IDs/severities remain unchanged. MKT-006 (Medium) becomes **C: separate auction unsupported**. Other A/B/C classifications persist, but MKT-007, SOL-R1-006 and BKR1-03 now use current-holder primary refunds; MKT-002 also covers claim-face compatibility. These are replacement obligations, not closures. **Open A decisions:** exact claim encoding/transfer authority, compatibility predicate, sponsor destination binding, immutable secondary recovery evidence and signed unused-expiry terms. No arithmetic inconsistency is apparent in this candidate, but omitted bindings could still permit duplicate claims or mispriced rights. Round 2 must challenge those contracts; no tests or native execution establish them yet.
