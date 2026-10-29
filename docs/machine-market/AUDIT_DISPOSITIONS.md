# Round-one dispositions — v2 candidate, awaiting independent verification

All21 original IDs/severities preserved. Full reports read after all submitted;
no original report or SPEC_V1 altered. A=MVP correctness/design blocker;
B=cheap useful improvement; C=explicitly unsupported production hardening/feature.
Mixed A/C separates fundamental supported-flow fix from deferred expansion.
Every disposition below is a PROPOSED resolution/scope boundary for round2, not
reviewer closure or implementation GO. RootGO absent. No original High is wholly
waived. Native execution tests remainfuture; claims here are architectural.

| ID | Original severity | MVP class | Selected correction / exact v2 sections | Counterexample and required evidence | Alternatives / residual |
| --- | --- | --- | --- | --- | --- |
| MKT-001 | High | A | S2,S8; timely nativeStartlease; Consumed same-response recovery persists beyonduseBy in boundedrun | T6,V4 latefinality/restartafterE stillrecovers; timeoutneverleaksbytes | Strict cutoff/finalitybuffer rejected; trustedgatewayretention remains |
| MKT-002 | High | A | S2,S3,W2; signed lane/exact secondary refundFace/minRemainingAfter and exactaskcursor | T1,V1 remaining-rights filtering AND exact primary claim-face; differentface cannotcross; sponsor/exhaustedexcluded | Predicate overfragmentedbooks/exactunitonly; no usefulness/fungibilityclaimacrossseries |
| MKT-003 | Medium | A | S6,W1,W2,W4; complete taggedbytes,TIF,nonce,limits,consent; nativeOrderUse | T2 mutateeachfield; sameauthnewHTTPkey/secondUnitcannotrefill | No unsigneddefaults or freshnative-signature expansion; fixturesignertrusted |
| MKT-004 | Medium | A | S3,S9,S10,W6; oneholdowner; unsignedabortunderwriter; FailedClosed; signedunknownfreeze | T3,T5,T8 crashbeforesign; failedIOCneverrests; cancel/signlinearizesonce | Terminalizeboth overold-priorityrestore; onlyonebackend/currentDBsupported |
| MKT-005 | Medium | A | S5,W2,W4; primaryfixedpriceonly; backendcap/countreservations; exactconsent | T4 concurrent60+60/cap100; unknownholds; refundtosponsor/noallowancereplenishment; changedquote rejects | No nativeCampaign subsystem/secondarysubsidy/auction; aliascollusionunsupported |
| MKT-006 | Medium | C feature deferred | S4; nativeauctionsremoved, onebook selected; existingprototypeauctionnotnativeconformance | T0/T1 nativeAPIrejectsunsupportedauction; futureauctionmustreviewincrease-prioritypolicy | Removes secondmechanism, retains competitivebook; no claim referencepolicyfixed |
| MKT-007 | Medium | A | S7,W4,W5; narrowequalitymatrix, repeatedhistoricalwallets allowed, distinctstatePDAs | T7,V3 recurringA/B cash/claim sums; escrow-as-recipient/duplicatedMatchreject | No globalunique-walletshortcut; same-keySTPnotSybilresistance |
| MKT-008 | Low | B (packet closure required) | S13,manifest; historicalcode/PLANinformative; allnormativerulescopiedhere | T0 deriveoutcomesfromhashedbundlealone | No large mutableoracledependency; hashesproveidentityonly |
| SOL-R1-001 | High | A; restore expansion C | S3,S6,S10,W3,W4; nativefilledOrderUsenullifier foractor/nonce acrossUnits | T2,V5 O->U1 thenO->U2rejects; freshO2works; intactDBcancelretained | Nativeorderuse oversoleUnitcursor; arbitraryoldDBcancellationrestoreunsupported |
| SOL-R1-002 | High | A | S2,S8,W4; exactslotbounds andpermanentcommittedresponsewithinrun | T6,V4 preEexecute/postEobserve; staleAreturncursorrejected | OverlapMKT-001; gatewaydiskloss/censorshipnotcryptographicallysolved |
| SOL-R1-003 | Medium | A supported reserve; C externaldrainrepair | S7,W4,W5; setuprecipientreserve; everyFundpreservespayerSystemrent; invalidrecipientatomicreject | T7/T9 smallpayout/refundunderallowedflows; wrongstatefailswithoutpartialprincipal | No autonativetopup/claimwithdrawal; externaldrain/reassignmentunsupportedandmayblock |
| SOL-R1-004 | Medium | A uncertainty; C restore/replacement machinery | S9,S10; oneattempt,noabsence-basedfreshsignature; current-runlookup | T8,V6 nullhistorydoesnotrelease; exacttombstoneeconomicproof/unknownfeesseparate | No independentanchor/HA/rollbackclaim; intentionalrestoreisnewrunnotrecovery |
| SOL-R1-005 | Medium | A contract; B deployment immutability hardening | S6,S7,W1–W6; exactlayouts/metas/authorities,initializerderivednamespace,checkedfixedprogramidentity | T0/T2/T7/T9 wronginit/program/PDA/params; explicitprefundreject; storedgrossignoresdonation | Programloadedfrompinnedbinaryatlocalgenesis; no liveupgrade/governance; trustedoperatorno-upgradepolicy |
| SOL-R1-006 | Medium | A | S7,W5 aggregatebyuniquepubkey includingfee/rent; explicitsupportedrole-sharing | T7 recurring trades/current-holder-only primary refund/directpayerbeneficiary; forbiddenstatealiasesreject | Operator/collector/tradersdistinctinservice; direct-programcallerfeeaggregatedhonestly |
| BKR1-01 | High | A restart/consumption; C disasterrestore | S10,W3,W6 startupidentity+knownunresolvedscan; nativeOrderUse | T2/T8 sameintactDBprocessrestartmissedfundreconciles; wrongknownstatequarantines | No promise to detect coordinatedoldDB/ledgerrestore orrecoverlostcancellations; theseareunsupported |
| BKR1-02 | High | A | S9,W1,W6 typedopIDs,oneattempt,monotonicCASandstronger-statepredicates | T8,V6 primaryfundlaterterminal and secondarysettledlaterresold; lateStartafterRefundneverregresses; feeunknownretained | One generictypedtable oversubsystems; no freshsignatureattemptaggregationneeded |
| BKR1-03 | High | A | S8,W4 ownernativeStartbefore readiness; lockblocksexpiry; timeoutrefund | T6/T7,V4 sourcefailureafterlockcannotpayonexpiry; expirybeforestartisexplicitlyunadmitted | Onchainadmission overoffchain-known-failurepromise; networkrequestdelayriskdisclosed |
| BKR1-04 | Medium | A | S6,W1,W2 completekind/domain/TIF/consent/cancelschemas; actor/nonceuniqueness | T2 fieldmutation/newHTTPkeyreject; nativeauctioninputunsupported | Fixture-roleimpersonationnotproductionauth; nativecosignmustrespectoriginalmandate |
| BKR1-05 | Medium | A | S2,S8,W4 Clock.slotonlyforeconomics; blockheightseparate; recoveryafteruseBy | T5/T6 equality,wallclockskew,latefinality/lostresponse | No timer-as-finalityorheuristicreplaycutoff |
| BKR1-06 | Medium | A finitebounds; B size/pinnedreaderchecks; C catastrophe/HA | S11,A2T9 count/bytecaps,fullSQLite,ingress/drainheadroommeasuredbeforefunding | T9 nextadmissionrefuses; onefundedunitstillcloses; noidentityeviction | No replicatedarchives/indefinitelogservice; fullstoragemayblock, SIGKILLnotpowerlossproof |
| BKR1-07 | Medium | A | S13,W1–W6,A1–A5,MANIFEST_V2 exactnormativebundle | T0/T2 staticprimary/resale/sponsor/cancel/lock/refund/recoverytraces andfuturebyteparity | No semanticsdeferredpastGO; codeimplementationstillmustproveconformance |

## Selected economics and justified scope change

Latestrootdirection adopted: PRIMARY-ONLY issuer escrow, immediately settled
secondarysales, and original-primary-value refundclaim transferring exclusively
withcurrentownership. Sponsor rightsnontransferable/refundsponsor. S4 compares the
oldcontingentfull-gross model but doesnotimplement it. Prior all-payergrossrefund
obligations are INTENTIONALLY REPLACED, not claimed preserved afterproceedspayout.

10000primary/15000resale/8000resale:22770paidsecondarysellerproceeds+230earnedfees;
10000only remainsescrowed. Success paysissuer9900+fee100. Admittedfailure instead
refunds currentholder10000; no historicalclawbacks/refunds. Premiumloss/discountgain
are explicitlysignedrisks. Genericsecondarybook binds EXACT originalrefundface;
primarylane usesface0sentinel meaningactualexecutiongross. This closes the new
claim-substitutability issue underMKT-002 inaddition toremainingtransfers.

Selectedcuts: onebook/nonativeauction; no nativecancellationtombstones,campaigncaps,
independentanchors,HA,automaticrentrepairorbackuprestoreguarantee. Correctnessstill
requiresactualauthorization, finiteinventory, consumedorders, nativeowner+claimcursor,
primaryescrow/secondarycash conservation andrealvalidatorsettlement. Single-writer
and intact-DB restart checks are required FUTURE acceptance tests after GO; no
executed native evidence is claimed here. Removed production guarantees are
explicitly unsupported.

Neweconomicstate andrecipientbindings inS7/S8/W3–W6 andA3V2/V3 must be independently
challenged inround2. No arithmeticobjection identified; this is not auditapproval.
Alloriginal21findings/severities remain. MKT-007/SOL-R1-006 nowprove repeatedrecipient
accounting andsinglecurrent-holderclaim, NOT fullchainunwind. BKR1-03 preserves
nativeStart-before-readiness butrefundsprimaryfaceonly. T9terminal nowtouchesone
primaryescrow; noobsoletefour-escrowpayoutrequirement remains.

## Original report hashes

market3dc56959a91f6151e7434c1704695adea33b9ae8fcbc9580e52a579d5b793b64
Solanaed1db5f3bff35ef4b70448e3117341c1ce315aeccf4fbf76ec97d9dc6b801234
backendcc18ed4203f2387226d63480f1f7bb2d4a0fb7ee8fc8deb68e6e1076bc3cd7d4

Overlap groups retain everyID: deliveryMKT-001/SOL-R1-002/BKR1-05 withfailureBKR1-03;
authorityMKT-003/SOL-R1-001/BKR1-01/BKR1-04; lifecycleMKT-004/BKR1-02/SOL-R1-004;
alias/rentMKT-007/SOL-R1-006/SOL-R1-003; freezeMKT-008/SOL-R1-005/BKR1-07.

## Open before round2 verdict

No claim of independentclosure. Reviewers must verify actualcross-layerconsistency,
economics, message/layoutbounds and proportionatescope. Toolchainexpandedsize and
runtime/serialization/CU/storage measurements remain executionpreflight AFTERGO,
not secretlypassedfacts. If an A decision remains ambiguous inthiscandidate,
reportitandrevise; do not implementaroundit. RootGO hasNOTbeenissued.
