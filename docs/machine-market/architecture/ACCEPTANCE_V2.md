# Finite MVP acceptance and audit contract v2

Normative with SPEC_V2/WIRE_V2; FUTURE execution after root GO, not native evidence
now. One price-time book, quantity-one rights, primary issuer escrow, IMMEDIATELY
SETTLED secondary transfers, and original-primary-value claim following ownership.
Sponsor rights never transfer and refund sponsor. No historical seller clawback or
resale-premium insurance. Every original finding/severity remains in the reports.

## A1. Supported model and proportionate classes

One local backend writer, concurrent HTTP requests, controlled disposable signers,
same intact current database and validator ledger across process restart. Native
Unit/OrderUse/Match guards reject duplicate fills/conflicting transactions. Minimal
usable inspection UI/CLI; no design sprint. A=essential supported-flow blocker;
B=cheap useful improvement; C=explicitly deferred feature/hardening. Mixed A/C never
defers its supported-flow correctness part. Root/reviewers must accept the narrowing.

Unsupported: native auctions, HA/multiple backend services, arbitrary DB/ledger
restores, malicious local operator, external wallet drains/reassignment, prefunded
PDA repair, live upgrades, production custody, SPL/USDC/public RPC, indefinite service
infrastructure. No claim that genesis detects all rollback or that local role selection
is production authentication. No exhaustive enterprise fault campaign is required.

## A2. Ten shared proof groups

| ID | Required cases | Pass condition/evidence |
| --- | --- | --- |
| T0 Contract | Same manifest; all21 findings; derive primary/resale/sponsor/cancel/delivery traces | No unresolved A semantic ambiguity; root explicit GO still needed |
| T1 Algorithm | Both maker-price directions; equal-price sequence; IOC/GTC; self-cross; remaining resale eligibility; EXACT secondary primary-refund-face compatibility | Expected order/price/sequence/claim; no partial fill or unbounded price; incompatible cheaper ask skipped |
| T2 Authority | Golden binary vector per message; one-field economic mutations incllane/claimface/TIF; same nonce/newHTTPkey; same filledorder/anotherUnit; wrong native signer/account | No unintended debit/owner/claim change; Rust/backend bytes match; fresh O2 works |
| T3 Concurrency | Lastunit/sharedbalance/samenonce/cancel-sign HTTP races; direct native competing secondary trades; resale vsStart; twoStart requests | One serial result, oneowner/claim/debit; SignedUnknown holds nevercancelled; second live backend refused |
| T4 Sponsor | Concurrent60+60/cap100,countcap; failure/unknown; refundnonreplenishment; changedpacket/price/unit; decline/negative; secondary request | Onecapreservation; exactprimaryonly consent; sponsor receives refund; independentcontent unchanged; nontransferable |
| T5 Timing/lifecycle | Before/equal/after orderdeadline/useBy/lease; wallclockskew; never-signedabort; definitivefailedtrade; IOCnofill | Oneexplicit outcome; holds move once; failedIOC neverrests; no blockheight/slot confusion |
| T6 Delivery | StartbeforeE/observeafterE; lostresponse/restart; sourcefailureafterStart; expirybeforeStart; old/returningowner; timeoutwins | Consumed originalresponse recoverable afteruseBy; lockedunitcannotexpirepay; refund/expiry releasesnobytes |
| T7 Native money/claim | PrimaryP, secondaryQ1/Q2; payout and current-holder refund on separateunits; premium/discount; recurringowner; sponsorrefund; repeatedsecondary/terminal receipts; wrong payee | Actual local signatures/finality/accountdeltas; primaryescrow staysP duringresale; secondaryseller/fees paidonce immediately; no historicalrefund/clawback; claim consumedonce |
| T8 Current-run recovery | Primary and secondary lostresponses; terminalaction: kill aftersignedpersistence, aftersend, afterresolvedDB/beforeHTTP; oneunsignedabort; reordered observations | Same signature/op; laterownership/primaryterminal doesnoterase secondarysettled receipt; no extra sellerpayment; terminal neverregresses; unknownfee reserved |
| T9 Bounds/feasibility | Count/byte refusal; fundedunitstillcloses at ordinaryingresscap; actual maximal secondary/terminal serialization/CU; FULL config; wallet/statechecks | No historyeviction; <=1232byte transaction and declaredCU; no powerloss/HA claim; safe failure onunsupported recipientstate |

These are shared groups, not21 duplicate suites. Physical storage/runtime overhead
is checked after GO before increasing admission. Lower supported caps or return to
contract if measurements exceed bounds; do not invent recovery capacity. Cheap
pinned-reader/size telemetry is B; storage catastrophe safely blocks without eviction.

## A3. Worked vectors

V1 matching: asks100(seq10),100(seq11), bid120 =>seq10 at100. Restingbid120 thenask100
=>120. Hold120 becomes match100, release20 once. Primary face becomes actualgross.
Secondary lanes include exact P: Uface10000, Vface6000 in sameSeries; bidface10000
must skip cheaperV. Face6000 requires a separate authorization/book key. Minremaining1
skips a unitwhose fillleaves0; min0maytakeit. Sponsored/exhausted units cannotresell.

V2 cash: issuer->A P10000; A->B Q15000; B->C Q8000 (C denotes finalholder; native
fixture may reuseA). Secondary sellercredits14850 and7920, secondaryfees150+80=230.
Liveprimaryescrow10000. Totalgross33000 = sellercredits22770 + fees230 + escrow10000.
Success/unusedexpiry adds issuer9900+primaryfee100. Instead, admittedfailure/timeout
refunds finalholder10000, primaryfee0. Original A/B receive no terminal refunds merely
for pastownership. A holderwhopaid15000 loses5000premium; onepaying8000 canrecover10000.
This is face-value coverage, not last-purchase insurance or guaranteed arbitrage.

V3 recurringwallets: issuer->A10000, A->B15000, B->A8000. Beforeterminal netA=-3150,
netB=-7080, secondaryfees230, primaryescrow10000. Success addsissuer9900+fee100.
Failure instead creditsA10000 ONCE (netA6850), not another historical refund. Fees230
remain earned. A->B->A->B can reach3resales; finalowner alone hasclaim, previousreceipts
remainsettled. A stale formerowner cannot redeem or redirect the refund.

V4 expiry: Start atE-1 createslease untilE-1+150. Finalize withinlease, observed/restarted
afterE, permits same committedresponse. Timeoutwins =>primaryP refundtoholder/sponsor,
no bytes. Expire beforeStart means no nativeadmission; pendingHTTP isn't acceptance.
Secondarycash alreadysettled remainsfinal on eitherbranch. Refundedclaim can'treplay.

V5 identity: O funds/tradesU1; O->U2 withfreshMatchID/currentcursor rejects viaOrderUse;
newO2works. A secondaryreceipt re-read afterlaterresale/redemption stillproves its
originalsellerpayment without restoring oldowner. Purelyoffchain cancellednonce remains
terminal in intactDB; arbitraryoldDB restoration is unsupported, not a passedrestoretest.

V6 recovery: secondarysendexecutes, response lost, processrestarts. Readsame signature,
SecondarySettled receipt/nullifiers and laterUnitstate; don't pay selleragain. Primary
fundunknown followedbyvalidexpiry gives PrimarySettled proof oforiginalfunding. Native
account-onlyproof is labelednarrower ifhistory/feesunknown; never invent a signature.

## A4. Finite local execution package after GO

One declared run,8Units initially(max64 lifetime), atmost24 successfultradeexecutions
and128 signednative operations includingnegativecases. Operatorcap10LOCAL SOL;
atmost4tradingfixturekeys with10LOCAL SOL each. Onlyverifiedlocalhostfaucet/RPC.
Reuseunits/evidence acrossgroups; preservefailed/unknownattempts. No silentreset or
unannounced funding rerun. Newisolatedrun is not recovery ofoldobligations.

Demo: signedcompetitiveorders ->maker-price match ->nativeprimaryescrow ->native
immediate secondaryseller/fee payment+claimtransfer ->deliverylock/primarypayout ->same
response recovery. Separateunitshows admittedfailure refundtofinalholder while prior
secondarypayments remainfinal. Includeunusedexpiry, premium/discount and negative-
assessment sponsoredprimary refundtosponsor/nontransferability. Nativeevidence must
show actual accountdeltas, not just created transaction IDs.

Sanitizedmanifest: spec/source/binary hashes,validatorversion/genesis/programloader,
namespace/fixturepubkeys,assetlocalSOL; transaction signatures,slots/status,exactnative
instructions/receipts, before/afteraccountdeltas, principal/marketfee/operatorfee/rent,
commands/results. Nevercommit privatekeys/content. Mocks/hostcompilation are not native
proof. Onevalidator doesnot establish publicnetwork resilience, scale or demand.

OptionalBmeasurement: three fixedseed trials of100admissions,upto64matches and1000book
reads within caps; report samplecounts,p50/p95,DBgrowth/environment. Target<=50ms local
admission/matching excludingRPC, not productionSLO. Correctness/nativeproof takespriority.

## A5. Gates

G0: frozen spec/wire/acceptance/dispositions/hashes; independentround2; noopenAcritical
semantics; Cscopeaccepted; rootreviewsfullpacket andexplicitlyGO. G1: exactcodecs/engine
andT1–T5. G2: pinnedtoolchain/disk/loopback/program andactualT6–T9. G3: reconcileallnative
outcomes/residuals, scopedlocalcommits,no push. Tool incompatibility stopsbeforefunding;
no cloudfallback. OverallMVP remainsincomplete untilrealvalidatorproof. No GO is present.
