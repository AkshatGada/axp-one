# AXP MVP explorer: build spec (apps/product-ui, Ledger)

Companion to FRONTEND_PLAN.md (approved). Holds the data traps, exact paths, screen detail, Present beats,
projection contract and Try spec. Self-sufficient: static export, no backend, no embeddings, no wallet, no Mac
dependency. The public data never contains vectors (build asserts no numeric array longer than 64).

## Data traps (verified in artifacts/v3/replay/run.json)
1. Story order != run order. state.turns[] is alphabetical (cached, mobile, offline, repeat); mobile no-fill was
   created first (event 16, +517s); cached/offline/repeat ran ~70 min later (events 17-33). Navigate in story order
   (scenario questionIndex 0..3); Timeline shows true chronology and says so.
2. Two clocks: sandbox blockTime of closes 14:41-14:42Z vs exchange charges 14:57-15:00Z (events[].at). Never one axis.
   Exchange lane by seq; chain lane by slot.
3. Levels are Math.round(score) (packages/ml/engines/jev.mjs:39). Cached: ClearVault intent 2.38 to 2.52, KeyForge
   2.29 to 2.50 (level 2 to 3). Repeat: KeyForge 2.49, level 2, bid 3000. Show ScoreRuler with .5 lines. ArmDiff wording:
   "With history, ClearVault's intent score moved 2.38 to 2.52, crossing the 2.5 rounding line: level 2 to 3. Relevance and
   bid/skip stayed the same. One observation per arm; not a measured lift." Unchanged outcomes get equal visual weight.
4. ClearVault's repeat decision exists (Jev bid 3:3) but runAuction skipped it for frequency_cap and logged no
   buyer_decision (only event 30, KeyForge). Show "Agent said bid. Exchange did not admit it." No amount, no bid row.
5. LeatherGuard blocked twice: policy missing_constraint AND its own Jev skip (relevance ~0.43-0.71, creative no_fit).
   Its history packet shows crypto prompts that matched leather/RFID wallet ads (Ariat, Yoder Leather, Thursday Boot):
   the word "wallet" is ambiguous. Best demo that evidence cannot add a capability.
6. The cached question was itself observed historically: vector neighbour similarity 1.0 to an observed prompt that drew
   a Mercari "Nano Trezor" listing. True opening hook for the evidence step.
7. publisherId "owned-travel-app": display "Owned reference publisher app", mono id + footnote "ID inherited from an
   earlier prototype". The intent rubric level-3 text mentions destinations/dates (travel legacy): show verbatim in the
   inspector with footnote "rubric wording inherited from the earlier prototype; unchanged in this run".
8. chainEvidence postSnapshot.publisherBaseUnits includes pre-run funds: show per-transaction token deltas only.
9. payments[].settlementLink embeds the RPC URL (customUrl): strip.
10. Jev rawOutput may carry a conversion-probability field: never display.
11. receipts[] not in turn order: join by awardId.

## Browser-verifiable hashes (canonical = JSON with sorted keys, packages/contracts/index.mjs:9)
packetHash = sha256(canonical(packet)); creativeHash = sha256(canonical(award.creative));
renderAcknowledgementHash = sha256(canonical({awardId, creativeHash, domInserted:true, sponsoredLabelPresent:true}));
receiptHash = sha256(canonical(receipt)); bindings.questionHash = sha256(question);
Ed25519 verify("AXP.delivery.v1\n"+canonical(receipt), publishers[0].publicKeyPEM, signature) (owner approved
publishing the 3 receipt signatures + publisher public key). Not recomputable: rawOutputHash, requestHash, organic
completionHash: label "recorded hash".

## Routes
/ overview; /opportunity/[1-4]/; /advertisers/ + /advertisers/[clearvault|keyforge|leatherguard]/; /publisher/;
/settlement/; /timeline/; /evidence/; /verify/; /try/; /present/; /design/ (noindex). trailingSlash.
Deep links: /opportunity/1/#eligibility|#evidence|#decisions|#auction|#award|#delivery|#receipt|#charge,
#decision-clearvault-history, #evidence-ads:mapping:1836866; /settlement/#clearvault, #voucher-clearvault-2,
#tx-close-clearvault; ?inspect=receipt:<chargeId>|decision:<slotId>|award:<id>|tx:<sig>|event:<seq>;
/present/#7, ?auto=1.

## Chrome
ScopeBar: AXP.one (links to landing), run id v3-wallet-acceptance (mono), chips: Recorded replay / Hosted Solana sandbox /
Test USDC / Fictional advertisers; buttons Present, Verify.
RunSpine (240px): Setup (Advertisers, Publisher, Evidence); Opportunities 1-4 with truncated question, outcome glyph,
line ("ClearVault 0.004" / "ClearVault 0.003" / "KeyForge 0.003, cap" / "No fill, 0 calls") and running accepted total
(0.004/0.007/0.010/0.010); Settlement, Timeline, Verify; footnote "Ordered by question. Recorded order: mobile ran first."
Inspector (420px, key I): raw JSON from the projection, source path (e.g. state.turns[0].records[1].packet), hash rows
with copy + "recomputable" or "recorded hash only". <900px: spine becomes horizontal scroller, inspector bottom sheet.
Term: inline glossary (opportunity, eligibility, frequency cap, first price, base units, channel, voucher, cumulative
authorization, lamports, rent, finalized, receipt, arm, cosine, lexical fallback, inferred hint).

## Screens
Overview: H "One recorded run of an ad exchange inside an AI app." Lede: "Four questions were asked in an AI app. For each
one, advertiser agents judged the moment, the exchange ran a sealed auction, the app showed a labelled Sponsored card, and
the publisher's signed receipt turned delivery into a test USDC charge settled through payment channels. Everything here
is the saved record of that run. Nothing re-executes." Right: HostChat (opp 1). Number strip: 4 questions / 15 agent
decisions / 3 auctions + 1 no fill / 3 signed deliveries / 0.010 paid, 0.030 refunded. "What happened" table (question,
winner, price, why: tie by campaign ID / frequency cap / missing mobile_software_wallet). Buttons: Watch the guided replay
(4 min) -> /present/?auto=1; Step through opportunity 1. Legend line. Footer: sandbox not mainnet, test USDC, one
disposable test payer funded both fictional advertisers.

Opportunity: header band "Opportunity n of 4", question in Wide 300 32px, outcome strip of jump links, Step through button
(J/K), Recorded replay mark. Left 520px sticky "In the app": HostChat (its own 12px radius, the one non-square shape,
caption "Owned reference publisher app, specimen"), user bubble, assistant organic answer (Actual output, "gpt-6.1-sol,
low, no advertiser material"), hairline, Sponsored slot. Right StepRail of 9 steps:
1 The moment (opportunityId, coarseIntent crypto_wallet_tools, required capabilities [taskConstraints], soft preferences,
  floor 0.001, slotId, createdAt; state.exchange.opportunities[id=T.opportunityId]).
2 Who may compete: EligibilityMatrix 3 campaigns x required; missing = taskConstraints - declaredConstraints; note
  "Funding is checked at auction time" (T.eligibility).
3 What each agent was shown: EvidencePacket per campaign: MethodBadge ("Vector match, cosine, BGE-768, cached" /
  "Lexical fallback, word overlap, not semantic"), observed example (prompt + creative, Observed, brands labelled
  "Observed historical reference, not an AXP advertiser"), similarity mono, linked hint (Inferred, tier), neighbours,
  quality flags in plain words, "View exact packet sent" -> inspector packet + packetHash (recomputable).
  (T.records[arm=history].retrieval/.packet/.packetHash)
4 What each agent decided: 3x2 DecisionCard grid (baseline column caption "research arm, never auctioned"): bid/skip,
  levels, ScoreRuler, creative choice + probability, elapsedMs, tokens; ArmDiff; policy line "Bid table applied to the
  baseline levels (3:2) would give 0.003; the history arm (3:3) gives 0.004. Only the history arm competed."
5 Auction: AuctionBoard rows (maxBid x table(levels) = amount), floor line, rejections, TieBreakNote "Equal bids are ordered
  by campaign ID: v3-clearvault before v3-keyforge.", winner ink rule.
6 Award (not a charge yet): award.id, price, creativeHash, expiresAt, MoneyState reserved. "Budget is reserved. Nothing is
  owed until the app proves delivery."
7 Delivery: card animates into slot; ack domInserted/sponsoredLabelPresent, recomputed ack hash ok; receivedAt, +25.4s.
8 Signed receipt: ReceiptSheet, 10 fields, receiptHash ok, signature ok, key local-publisher-v1. "This proves the app's
  assertion that it inserted a labelled card, not that a person read it."
9 Charge and voucher: accepted, sequence, channel; voucher increment -> cumulative, authorized, payloadHash; "See it settle".
Opp 2 (offline): lexical fallback, "overlap score 0.39" not cosine; 2 examples (adds OneKey) + 2 hints (one sparse);
  levels unchanged 3:2 both arms, "Unchanged" badge; 0.003 tie -> ClearVault; voucher #2 cumulative 0.007 "authorizes 0.007
  in total, not 0.007 more".
Opp 3 (repeat): same organic inputHash as opp 1 but a fresh completion (say so: the bridge is not a cache); ClearVault
  frequency cap stamp "already placed twice in this session (2 of 2)"; its card "Agent: bid (3:3), Exchange: not admitted";
  KeyForge 3:2 (2.49) -> 0.003 sole bidder; KeyForge voucher #1.
Opp 4 (mobile): all excluded missing mobile_software_wallet; execution deterministic-policy; records []; steps 3-9 collapse
  to NoFill "No agent was called (0 calls). No auction, award, receipt or charge."; chat shows full answer, slot shows a
  small grey publisher note "No sponsored placement for this turn" (never an empty ad box).
Step-through: before step 7 the slot is a dashed "Sponsored slot, awaiting auction"; organic answer visible from step 1;
  each advance scrolls/focuses, dims others to 35%, draws a 1px steel RouteLine to the chat region (420ms), reveals values
  (220ms). No count-ups, spinners or "thinking". Chip "Replaying recorded run, step n of 9". Recorded timings in mono.
  Hash updates per step. Reduced motion: instant.

Advertisers: H "How an advertiser joined this run"; sub "Three fictional advertisers. Their capabilities are declarations,
not verified product facts." 5-stage stepper x 3 columns: Declare (businessName, declaredConstraints chips, contextHints,
approvedText as SponsoredCard, destinationURL as text never linked; state.drafts[i]); Approve (approved, version 2,
campaignVersionId, creative hash; "Editing makes a new version; approved versions are immutable."); Limits (max 0.004, cap
0.008, frequency cap 2, floor 0.001); Fund (channels deposit 0.020 finalized; LeatherGuard pending_open 0 "Unfunded: no
channel opened"; "One disposable test payer funded both."); Frozen (freeze.contentHash, freeze.at). CTA "Draft your own
campaign (synthetic preview)". Campaign pages: CampaignSheet + per-opportunity row (eligible/reason, history levels, bid,
won/lost/not admitted, charge) + ChannelMeter. LeatherGuard leads "Why LeatherGuard never paid: excluded by rule and
skipped by its own agent" + leather-wallet evidence.

Publisher: display name + mono id/footnote, slotId, floor, publisherKeyId, publicKeyPEM (collapsible), payee; fill table
4 x {status, winner, price, receivedAt, receiptHash}; payout 0.007 + 0.003. H "What the publisher saw and earned"; "The
organic answer never receives advertiser material. No-fill turns still answer the user." Caveat: receipt is not attention.

Settlement: H "Two payment channels, three receipts, one settlement each." Lede "Each funded advertiser locked a 0.020 test
USDC deposit in its own channel. Every accepted delivery advanced a cumulative off-chain authorization (a voucher). At
close, the publisher received the last authorized total and the rest went back. No transfer per ad." Per channel:
ChannelMeter (20000 scale; hatch->solid segments; ink payout; outlined refund with return arrow); CumulativeLadder (seq,
charge->opp, increment, cumulative, status, payloadHash, voucherRecordHash; "#2 replaces #1's authority"); TxCards open/close
(signature copy, slot, finality, token deltas, fee lamports, new rent 4,711,920 / reclaimed 2,039,280, logs collapsible);
status row (phase finalized, "No reconciliation needed", protocolChannelId, termsHash, program, mint, payer, payee; "Same
disposable payer for both channels"). Totals: USDC deposits 0.040, paid 0.010, refunded 0.030; lamports fees 40,000, gross
new rent 9,423,840, reclaimed 4,078,560, gross fee+rent 9,463,840 vs cap 20,000,000 ok; "Fees and rent are paid in test SOL
(lamports) and never mixed with USDC. Reclaimed rent is not subtracted from the cap." Funding note "An approved one-time
sandbox faucet top-up funded the payer. Funding is not settlement." (text from V3_RESULT; never read sandbox-topup.json).
Logical mini-sequence open -> charge -> voucher -> ... -> close without timestamps. Never infer finality from a signature;
never add 4000+7000; never show absolute balances. LeatherGuard: one line "Unfunded: no channel".

Timeline: lane A exchange log events 1-33 (seq, plain-word type, relative time, summary), grouped by turn, mobile first;
lane B sandbox chain 4 txs by slot (452225151 open CV, 452225252 open KF, 452225945 close CV, 452226063 close KF), blockTime
labelled "sandbox clock". Banner "The two lanes use different clocks and are not aligned in time."

Evidence: manifest.counts (1,178 / 241 / 537 / 331), selection.niches, hint tiers (holdout 246, loo 42, sparse 43), sources
(aws 1,031, verseodin 147), method explanation, manifest.limitations verbatim; the 13 referenced records + 5 hints with
"Observed historical reference: not an AXP advertiser". No top-brands list.

Verify: island runs ~30 checks (WebCrypto subtle.digest + subtle.verify Ed25519) against /run.public.json (same file as
the download): 4 questionHash, 15 packetHash, 3 creativeHash, 3 ack hash, 3 receiptHash, 3 signatures, 3 linkage
(charge.receiptHash == receiptHash, voucher.chargeId == charge.id), 3 cumulative arithmetic, 2 conservation, 4 bid policy,
1 tie-break, 1 fee cap; restart evidence; proves / does-not-prove columns. Fail renders loudly with mismatch. Ed25519
unsupported -> "Your browser can't verify Ed25519 signatures; the hash checks still ran".

Try (synthetic, first to cut): SyntheticFrame banner "Synthetic preview. Runs in your browser only. No model, no evidence
retrieval, no money, and nothing changes the recorded run." No network, memory only. DraftForm mirrors packages/v3/service.mjs
saveCampaign: businessName <=400, 8 CAPABILITIES unique, creative <=800 with counter, hints <=400, reject emails (same regex),
creative+hints+34 <=1200 (packet_too_large), max bid integer base units 1..4000 (USDC + base units), budget <=8000, funded
toggle, presets ClearVault / LeatherGuard. Per recorded opportunity: eligibility via ported reason() (intent/destination
fixed, missing_constraint lists missing, below_floor if max<1000, frequency 0 of 2 shown, budget vs floor, unfunded ->
"channel unavailable at auction"); levels user-set (0-3) with ghost reference levels from a recorded campaign labelled
"Reference: another campaign's recorded agent output", borrowed -> stamp "Borrowed levels: your campaign was never
evaluated by an agent"; bid via ported computeBid with formula; reference line "Recorded winning price here: 0.004
(ClearVault)". No award/receipt/charge, no "you would have won". Footer lists what is not simulated + local lab
`npm run demo:v3`. src/lib/policy.ts parity-tested vs packages/contracts computeBid (16 level pairs x caps) and every
recorded exclusion/bid; page shows "Rules verified against the recorded run: N/N".
Bid table fit_intent_bid_v1: 2:2 50%, 2:3 or 3:2 75%, 3:3 100% of maxBid; bid needs relevance>=2 and intent>=2;
amount = min(maxBid*bps/10000, availableCampaign, availableChannel) BigInt; 0 -> budget_unavailable; <floor 1000 ->
below_floor. reason() order: campaign_paused, policy_excluded, missing_constraint, channel_unavailable, below_floor,
frequency_cap (>=2 awards same campaign+session), budget_unavailable. Auction: sort amount desc, tie campaignId
localeCompare asc, recheck reason(), first passing gets award.

## Present mode (/present/, ~4:00)
16:9 stage letterboxed on --stage, 1920x1080 design size scaled; CaptionBar 120px 22px max two lines; BeatTicks; Recorded
replay mark. Beats data in src/present/beats.ts {id,title,view,focus,steps[],caption(run),durationMs,exploreHref}; captions
computed from the projection. Keys: right/Space next, left back, Shift+right next beat, 1-9/0 jump, A autoplay, C captions,
E explorer, R restart, Esc exit, ? help. ?auto=1 timed, cursor hidden.
0 (0:00-0:15) HostChat: "Someone asks an AI app for a cheap hardware wallet. The answer is independent. The card below it is
  paid, and labelled."
1 (0:15-0:35) numbers + scope: "This is the saved record of one run: 4 questions, 15 agent decisions, 3 auctions, 1 no-fill,
  3 signed deliveries. Hosted Solana sandbox, test USDC."
2 (0:35-0:55) advertisers: "Three fictional advertisers. Two hardware wallets funded 0.020 each. LeatherGuard sells leather
  wallets and is unfunded."
3 (0:55-1:20) evidence: "ContextHint had seen this exact question before, next to a hardware-wallet listing. Agents get that
  history as evidence. Real brands are past observations, not bidders."
4 (1:20-1:50) decisions: "With history, intent edged from 2.38 to 2.52, crossing a rounding line: level 2 to 3. LeatherGuard's
  agent said no fit. Evidence can't add a capability."
5 (1:50-2:15) bid + tie: "Code, not the model, sets the bid: 100% of the 0.004 max at levels 3 and 3. A tie goes to the lower
  campaign ID. ClearVault wins."
6 (2:15-2:40) award to charge with live checks: "An award is not a charge. The app inserts the labelled card, signs a receipt,
  and only then is 0.004 charged. These checks just ran in this browser."
7 (2:40-3:05) cap + no-fill: "Asked again, ClearVault hits its frequency cap: a rule, not the agent. KeyForge wins at 0.003.
  A mobile-only request matched no one: zero calls, no ad, the answer still served."
8 (3:05-3:35) settlement: "Vouchers accumulate: 0.004, then 0.007 in total. One close each: 0.010 to the publisher, 0.030
  refunded. Fees in lamports, kept separate."
9 (3:35-4:00) verify + limits: "Restarted with models off: zero new calls, charges or signatures. Not mainnet, not attention,
  not targeting lift. Explore every hash yourself."
scripts/beats-to-srt.mjs emits SRT. Recording: Chrome clean profile, 1920x1080 viewport, DPR 2, ?auto=1, no auto-zoom.

## Projection contract (scripts/project-run.mjs, wired into `build`)
Inputs read-only: artifacts/v3/replay/run.json, artifacts/v3/replay/manifest.json. Never: sandbox-topup.json, .env*,
local-state/, voucher stores. Steps: sha256 inputs; sort (turns by questionIndex, charges by sequence per channel, events by
seq, txs by slot); join turn + opportunity + award + charge + receipt (by awardId) + voucher; reduce evidence to referenced
ids (examples[].id, neighbors[].associationIds, profile.contrastExamples, hint ids: ~13 records, 5 hints); aggregates; run
lib/policy.ts parity + verifyChecks in Node; write src/data/run.public.json, public/run.public.json, src/data/build-meta.json
(source hashes, projection version, sanitization report, self-checks).
Drop: organic agentId (+ provenance.agentId), agentRunId everywhere, openSalt, rpc, settlementLink, packetBytes, request (keep
requestHash), callEvidence, top-level retrieval, freeze.drafts/freeze.manifest, laboratory, full evidence catalogue,
postSnapshot balances, renderTokenHash. Keep receipt signatures + publisher publicKeyPEM (owner approved).
Fail build if output contains: surfnet, customUrl, openSalt, "agentId", agentRunId, packetBytes, PRIVATE KEY, rpc; any
numeric array > 64; counts != 4 opportunities / 15 decisions / 3 receipts / 33 events / 2 channels / 4 txs; conservation
broken; any bid != computeBid(levels); size > 300KB.
Shape axp.product-run.v1: source, scope, policy (+ bidTable, tieBreak), dataset, campaigns[], publisher, opportunities[]
{n, scenarioId, turnId, question, questionHash, mandatoryCapabilities, softPreferences, floor, opportunityId, coarseIntent,
createdAt, status, execution, organic{...}, eligibility{eligible, excluded[{campaignId, reason, missing}]}, decisions[{slotId,
campaignId, arm, category, admittedToAuction, decision, relevanceLevel, commercialIntentLevel, scores, legend, reasonCodes,
creativeVersionId, elapsedMs, usage, packet, packetHash, engine, retrieval{...}}], auction{bids, rejections,
winnerCampaignId, tieBreakApplied}, award?, delivery?, receipt?{fields, receiptHash, signature}, charge?, voucher?},
evidence{records, hints, aggregates}, channels[], fees, events[], restart, model, limitations{run, dataset}.
Types: src/data/types.ts (reuse unions from packages/v3/client.d.mts via path alias). Selectors src/data/select.ts.
Server Components import JSON at build time and pass slices to client islands; /verify fetches the public file on purpose.

## Testing
node:test in apps/product-ui/scripts: projection counts/order/joins/conservation/sanitization/size; policy parity; all
verifyChecks pass; tampered-byte fixture fails. tsc --noEmit. Browser pane: every route + deep link at 1440x900, 1920x1080,
390 wide, zero console errors, no off-origin requests, /verify all green, keyboard step-through, reduced motion, Present beats.
Claims lint over src/ (mainnet, conversion, lift, attention, partner, verified capabilit, sub-50, x402 settle, real money)
unless line marked `// claim-ok: negation`.
