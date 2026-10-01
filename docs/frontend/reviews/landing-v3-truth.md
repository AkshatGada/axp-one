# axp.one landing v3: truth audit

Scope: tag `axp-landing-v3` (e64836e, branch `frontend`). Working tree has no diff vs the tag under
`apps/marketing` or `design-system/prospectus`, so the dev server on :3410 renders the tagged source.

Audited:
- Source: `apps/marketing/src/**`, `design-system/prospectus/**`, `src/data/{copy.ts,library.ts,run.ts,run.generated.json}`, `scripts/extract-specimens.mjs`, `scripts/lint-copy.mjs`.
- Rendered text, meta, alt, aria-label and title of `http://localhost:3410/` and `/design/` (curl, scripts and styles stripped).
- Ground truth: `docs/frontend/FRONTEND_PLAN.md` section 2, `LANDING_SPEC.md`, `SPECIALIST_HANDOFF_PROMPT.md`, `docs/build/V3_RESULT.md`, `artifacts/v3/replay/run.json` + `manifest.json`, plus `packages/contracts/index.mjs` (computeBid) and `packages/exchange/index.mjs` (tie rule).

Tooling results:
- `node apps/marketing/scripts/lint-copy.mjs`: passes (42 files clean, and out/index.html).
- Extractor has no `--check` flag and writes files, so it was run in a scratch mirror (symlinked `artifacts/v3/replay` and `recording`). All asserts passed; the regenerated `run.generated.json` is byte-for-byte identical in content to the committed one, and `walkthrough.vtt` is identical. `sha256(manifest.json)` = `e34448fa...2152a`, `sha256(run.json)` matches `manifest.files["run.json"]`.

Summary: **4 blockers, 16 warnings.** Every number on both pages traces to the run or to the owner figures (table at the end). No forbidden claim (lift, conversion, attention, viewability, partnership, pricing, mainnet, industry-first, ChatGPT algorithm) appears outside a negation, a limit or the Planned list. No em or en dash in rendered text. No conversion-probability field, agent id, payee, lamport or legacy publisher id reaches the page.

---

## BLOCKERS

### B1. Real brands shown without the required "not an AXP advertiser" label (hero Evidence plate)
- **Text:** `Ad  Mercari Nano Trezor Hardware Wallet NEW - New Electronics`, with only the "Observed" mark.
- **Where:** `apps/marketing/src/scenes/plates.tsx:93-106` (evidence plate, `observedCreative.split(" | ")[0]`). Rendered on `/` 3 times: the hero stack (pinned or still), the narrow still sequence and the Closing collapse. Also on `/design/` in `#stack` and `#motion`.
- **Why it fails:** owner decision: real observed brands may appear **only** labelled "Observed historical reference, not an AXP advertiser". This plate is the first place Mercari and Trezor appear on the page, and it has no label. The text is also cut at the `|` with no sign that it is an excerpt, so it is not a verbatim quote.
- **Fix:** add the label to the plate and mark the cut, for example:
  `Ad  Mercari Nano Trezor Hardware Wallet NEW - New Electronics ...` plus a line under the plate `Observed historical reference, not an AXP advertiser.` (reuse `CONTEXTHINT.brandNote`). Another option: show `Observed ad, brand withheld` on the plate and leave the named listing to the labelled Evidence Chain.

### B2. Changed outcome shown, unchanged outcomes left out (violates FRONTEND_PLAN section 2, trap 1)
- **Text:** Stage beat 4: `With history, both wallet agents rated intent 3 instead of 2.` Library Dive: `Intent rated 3, not 2.` / `The score moved from 2.38 to 2.52, across the rounding line. Bid or skip did not change.`
- **Where:** `src/data/copy.ts:84` (STAGE.beats[3]) and `:125-126` (CONTEXTHINT.chain.result, resultNote); rendered in "How it works" and the Data section.
- **Why it fails:** the plan requires `"unchanged" outcomes with the same weight as changed ones`. In the run, history changed nothing on the offline question (both agents: intent 2 in both arms, scores 1.93 to 1.97). Relevance levels were also unchanged everywhere, and each arm is one stochastic observation. The page shows only the changed case, and it shows it at the moat's payoff moment. The case is an exact-match retrieval (similarity 1). The resultNote's "The score moved" also suggests one score shifting. In fact these are two separate calls.
- **Fix:** beat 4: `... With history, both wallet agents rated intent 3 instead of 2 on this question. On the second question, history changed nothing.` resultNote: `Two separate calls, one each: 2.38 without history, 2.52 with it, across the rounding line. Relevance and bid or skip did not change, and on the uncached question history changed nothing. A demonstration, not a benchmark.`

### B3. "the tie rule picked the winners" is false for one of the three auctions
- **Text:** `In the run, agents returned levels and a creative. Policy set all three prices, the tie rule picked the winners, and only signed receipts became charges.`
- **Where:** `src/data/copy.ts:90` (STAGE.exitBody); rendered in the full-bleed "The rule" wall.
- **Why it fails:** two auctions were ties (cached and offline). The third (repeat) had a single bid: ClearVault was excluded by its frequency cap, and KeyForge won 0.003 unopposed (`state.turns[v3-repeat].outcome.bids` has length 1). The tie rule picked no winner there.
- **Fix:** `Policy set all three prices, a fixed tie rule settled both ties, and only signed receipts became charges.`

### B4. Evidence provenance misdescribed: "The same question had been asked before and recorded."
- **Where:** `src/specimens/EvidenceChain.tsx:55` (note on the Observed prompt step); rendered on `/` (Library Dive) and `/design/` (#evidence).
- **Why it fails:** the order is reversed and the asker is implied. The cached question was chosen to be exactly a prompt from the screened export, so existing embeddings could serve it (the extractor asserts `observedPrompt === cachedQ`). The source prompt comes from ContextHint's measurement probes: `manifest.limitations[0]` "Within the measured prompt panel; not all AI demand or real-world query volume", and the record has `probeNiche` and `customerGenerated: false`. The note reads as if a real person had asked this before, by coincidence. Nothing supports that.
- **Fix:** `This exact prompt is in ContextHint's measured prompt panel. We used it as the cached question so retrieval could match it exactly (similarity 1).`

---

## WARNINGS

Ordered by risk.

1. **"Paid $55" in the Mercari quote (owner asked for this to be flagged).** The text is quoted verbatim in `EvidenceChain` (`src/specimens/EvidenceChain.tsx:60-62`) and is correct as data. But it is set as plain body text, not as a quotation, on a page about payments. "Paid $55" can read as an AXP payment, or as a price claim for a Trezor device, and "NEW" and "Trezor" can read as an endorsement. Recommended handling: keep it verbatim, wrap it in `<q>` like the prompt is, and change the step note to `Observed listing text, quoted verbatim. Prices and product claims are the seller's, not AXP's. Observed historical reference, not an AXP advertiser.` Brands also appear in the inferred hint ("Trezor and Ledger"): add `Brands named are not AXP advertisers.` to that step's note.
2. **ContextHint traction lacks the "not AXP users" qualifier.** `copy.ts:109`: "ContextHint is our conversational ad intelligence product, already used by thousands of people, including paying customers." It is correctly framed as ContextHint's and invents no count. The handoff also says ContextHint users and customers are not automatically AXP users or advertisers, and "our" blurs the two products. Suggest adding to the context note: `ContextHint's users and customers are its own, not AXP users or advertisers.`
3. **Hero Agents plate and callout imply LeatherGuard was a normal entrant that chose to skip.** The plate shows `LeatherGuard Skip R1 I2`, and the callout says "Each judged the moment with its own campaign only. One said skip." (`copy.ts:42`, `plates.tsx:76-87`). LeatherGuard was ruled out in code before the auction. Its skip came from a research-arm comparison call. Suggest: `One was ruled out in code; asked anyway, its agent said skip.` Stage beat 2 and 4 wording is correct ("cannot enter the auction", "Asked anyway, for comparison").
4. **Organic-answer independence stated as absolute; the bridge caveat is missing.** "Written by an assistant that never saw an ad." (`copy.ts:39`), "Gets an organic answer from an assistant that never saw the ad." (`copy.ts:67`), "The answer was written without any ad in view." (`copy.ts:34`). Supported by `advertiserMaterialReceived:false` and the input hashes. But V3_RESULT and the run limitations say the completions came through an operator-recorded bridge, which is not a cryptographic proof of hidden context. Add to "What this run does not show": `Organic answers came through an operator recorded bridge; input hashes show no advertiser material, not cryptographic proof.`
5. **Payments meter animation has no Illustrative mark.** `page.tsx:101` Figure kinds `["settled"]`. The caption says "ClearVault's actual channel". The fill is scrubbed by scroll and does not show recorded timing. Add `Values are actual; the fill motion is illustrative.` to `PAYMENTS.caption`, or add `illustrative` to the kinds.
6. **Hero intro and Closing collapse motion are unlabelled.** The answer "types in" word by word and the card "lands" under an "Actual output: question, answer, card" mark (`HeroScene.tsx:166`). The answer was not streamed like that. The stack caption saying motion is illustrative appears only after scrolling. The Closing collapse (`ClosingStack.tsx`) has no Illustrative mark. Suggest appending `Motion illustrative.` to `HERO.frameCaption` and adding an Illustrative mark under the closing card.
7. **The organic answer is an excerpt but is presented as the answer.** HostChat labels it "Organic answer gpt-6.1-sol" and shows only the first two sentences. The full answer continues for several paragraphs. Suggest `Organic answer, opening lines` or a trailing `...`.
8. **`/design/` shows the full library stat grid without the US-heavy note.** `design/page.tsx:306-311` renders the five big stats and the SourceNote, but not `CONTEXTHINT.context`. The page is noindex but served publicly. Add the context note under that grid, or exclude `/design/` from the deploy.
9. **"real past prompts" and "the ad it drew" / "the prompts that drew them"** (`copy.ts:43, 83, 109`). The prompts are ContextHint measurement probes, and the records are raw observed associations (`semantics: observed_association_not_fit_label`), not proven causes. Suggest `real recorded prompts, the ads shown beside them and an inferred audience` and `the ad shown beside it`.
10. **"Each agent gets its own evidence."** (`copy.ts:83`). This is true per packet. But on the cached question ClearVault and KeyForge received the identical example and hint. A reader may assume the evidence differed. Optional: `... aligned to one advertiser (here both wallet agents drew the same record).`
11. **"LeatherGuard sells a leather wallet."** (`copy.ts:82`). Its declared capabilities are `physical_wallet, rfid_blocking`, and its approved text says "physical RFID-blocking wallet for payment cards". "Leather" comes only from the fictional name. Suggest `LeatherGuard sells a physical card wallet.`
12. **CTA targets 404.** Every "See the MVP" / "See the working MVP" / "Open the MVP" link goes to `/mvp/` (MVP_URL default). That path returns 404 on :3410, and no build step in the repo places product-ui there. A dead "working MVP" link undermines the proof claim. Set `NEXT_PUBLIC_MVP_URL` or a combine step before deploy. `og:image https://axp.one/og.png` also 404s: there is no `public/og.png`.
13. **Lint checks a stale build and skips `/design/`.** `out/index.html` (00:21) predates the tag commit (00:29), and its text differs (for example "text only" vs "question only"). `lint-copy.mjs` scans only `out/index.html`, never `out/design/index.html`. Rebuild before the final lint, and add the design page to the built-text check.
14. **`/design/` small wording.** "983 niches. One of them is ours." (`design/page.tsx:275`) can read as AXP-owned inventory; suggest `One of them is the run's.` The Channel meter frames "Opened with a deposit / First accepted card / Running total after two cards" carry the "Actual output" mark (`design/page.tsx:261`). That mark is defined as a model or app-agent response. Use the money-state or Settled marks. The motion demo hardcodes `11,730` (`showcase/Demos.tsx:126`) instead of reading `LIBRARY.advertisers`. The value is correct.
15. **Snapshot date precision.** The handoff gives the snapshot as "around September 26, 2026", but the page states "snapshot, September 26, 2026" and "dated September 26, 2026". Acceptable if the owner confirms. Otherwise use `around September 26, 2026`.
16. **Low-risk vision phrasing.** H1 "The advertising exchange for the agentic internet." is approved spec copy and reads as a tagline, not an industry-first claim. Keep it. "Network fees." in Building next could be read as a pricing plan, but it is under Planned and gives no amount: fine. Hero lede "Publishers are paid in stablecoins for each card they deliver" is present-tense vision, immediately qualified by the status line "Working MVP on a hosted Solana sandbox with test USDC." Fine.

Checked and clean (from the brief's list):
- **"lift":** appears only in negations.
- **LeatherGuard:** "cannot enter the auction" is used. "never reaches an agent" never appears.
- **Fields and ids withheld:** no conversion-probability field anywhere; the slice asserts `!/conversion/i`. The legacy `owned-travel-app` is never rendered; it is shown as "Our demo AI app" with the publisherNote footnote.
- **Receipts:** joined by awardId. The extractor maps each award to its receipt via `receipt.awardId`, and every displayed hash matches the right `run.receipts[i]`.
- **Payout and refund arithmetic:** correct.
- **Tie rule:** "0.004 bids tie" plus "campaign ID order" is verified against `packages/exchange/index.mjs:92`.
- **Planned vs demonstrated:** the split is correct. x402 appears only as planned. Story order vs run order is disclosed on the RunSheet.
- **Data hygiene:** two clocks never share an axis (no times shown). No absolute balances. No ms timings.
- **Library vs slice vs packet:** kept apart ("Three numbers, kept apart").
- **US-heavy note:** present with the data on `/`.
- **ContextHint links:** `https://contexthint.com`, with `rel="noopener noreferrer"`.
- **Mercari text:** verbatim in the Evidence Chain, including "Paid $55".

---

## VERIFIED: every number shown

`run` = `artifacts/v3/replay/run.json`; `st` = `run.state`; `owner` = `docs/frontend/SPECIALIST_HANDOFF_PROMPT.md` library table (mirrored in `src/data/library.ts`).

| Shown | Value | Source |
|---|---|---|
| Cached bids, tie | ClearVault 0.004, KeyForge 0.004 | `st.turns[v3-cached].outcome.bids[].amountBaseUnits` = 4000, 4000 |
| Tie rule | campaign ID order picks ClearVault | `packages/exchange/index.mjs:92` `localeCompare(campaignId)`; award `winningBidId` = ClearVault bid |
| Agent levels (cached, history) | CV R3 I3, KF R3 I3, LG R1 I2 (skip) | `st.turns[v3-cached].records[arm=history].decision.{relevanceLevel,commercialIntentLevel}` |
| Without history | intent 2 | same turn, `arm=text_only` |
| Intent scores | 2.38 to 2.52 (ClearVault) | `run.callEvidence[].rawOutput.answers.intent.score` (text_only 2.38, history 2.52) |
| Rounding line | 2.5 rounds to 3 | consistent with KF 2.50 to level 3 (cached) and KF 2.49 to level 2 (repeat) |
| Evidence packet | 1 example + 1 hint, vector, similarity 1 | `st.turns[v3-cached].records[CV,KF history].retrieval` (examples 1, hints 1, method vector, similarity 1) |
| Evidence ids | ads:mapping:1836866, ads:hint:88501 | `run.evidence.records[mappingId=1836866]`, `run.evidence.hints[88501]` |
| Mercari text | verbatim incl. "Paid $55" | `run.evidence.records[1836866].creativeText` (ASCII hyphen, byte-equal) |
| Organic excerpt | first two sentences, gpt-6.1-sol | `st.turns[v3-cached].organic.answer`, `.model` |
| Required capability | crypto_storage | `st.turns[v3-cached].scenario.mandatoryCapabilities` |
| LeatherGuard excluded | missing_constraint | `st.turns[v3-cached].eligibility.excluded` |
| Bid policy, auction | fit_intent_bid_v1, first-price | `st.freeze.policy.{bidPolicy,auction}` |
| Max bid | 0.004 | `st.freeze.policy.maxBidBaseUnits` 4000 |
| Levels 3,3 = full max | 10000 bps | `packages/contracts/index.mjs:85` computeBid table; extractor asserts every bid = computeBid(levels) |
| Floor | 0.001 | `st.exchange.opportunities[0].floorBaseUnits` 1000 |
| Budget cap | 0.008 | campaign `budgetCapBaseUnits` 8000 |
| Reserved / charge (cached) | 0.004 | award `priceBaseUnits` 4000; `st.exchange.charges[awardId=fe97d44c]` 4000 |
| Cached receipt hash | cdf946cc...5712b | `run.receipts[2]` (awardId fe97d44c), joined by awardId |
| Offline bids, winner, receipt | 0.003 x2, ClearVault at 0.003, 65d11b86...59afc | `st.turns[v3-offline].outcome`; `run.receipts[0]` |
| Repeat bid, winner, receipt | KeyForge 0.003, CV frequency cap, 687a3b9b...59cb7 | `st.turns[v3-repeat].outcome`, `.eligibility.excluded`; `run.receipts[1]` |
| KeyForge receipt fields | award-bb3d8921...0643, opp-387a1766...d1c7, creative 89ef64ba...d1e6e, render 4441967b...e40e6, sig 9OS+dl3YOInJwaOK..., local-publisher-v1, publisher-receipt.v1, sandbox | `run.receipts[1].receipt`, `.receiptHash`, `.signature` |
| Ed25519 | signature algorithm | `run.publishers[0].publicKeyPEM` (OID 1.3.101.112, Ed25519) |
| Mobile no-fill | all 3 ruled out, zero model calls | `st.turns[v3-mobile].eligibility.excluded` (3), `records` length 0 |
| Story vs run order | no-fill ran first | `st.turns[].completedAt` (mobile earliest) |
| ClearVault channel | deposit 0.020, vouchers 0.004 then 0.007, paid 0.007, refunded 0.013 | `st.payments[CV].{depositBaseUnits,vouchers[].cumulativeAmountBaseUnits,close.settledBaseUnits,close.refundBaseUnits}`; publisherDelta 7000 |
| KeyForge channel | 0.020 / 0.003 / 0.017 | `st.payments[KF]` |
| Totals | 0.040 / 0.010 / 0.030 | sum of `st.payments`; extractor asserts 4000+3000+3000=10000, 40000-10000=30000, payout+refund=deposit |
| Close tx | 4mH68D...ZV3i, 2fqrnu...gV3T | `st.payments[].close.txSignature` |
| Proof stats | 4 questions, 15 decisions, 3 auctions, 1 no fill, 3 cards with receipts | `st.turns` (4), all `records` (6+6+3+0=15), awarded turns (3), no_fill (1), `run.receipts` (3) |
| KeyForge lost two ties | cached + offline | `st.turns[v3-cached, v3-offline].outcome` |
| Four organic answers, no advertiser material | 4 | `st.turns[].organic.advertiserMaterialReceived` = false x4 |
| Restart | 4 turns, 3 receipts, 0 calls/charges/signatures | `run.restart` (newCalls/newCharges/newSignatures/newBroadcasts 0; beforeHash = afterHash; 3 duplicateReceipts) |
| Sponsored label checked in browser | yes | `apps/v3-ui/app.mjs:25` (DOM label check before `render({sponsoredLabelPresent:true})`); renderAcknowledgementHash in each receipt |
| Run id, manifest | v3-wallet-acceptance, e34448fa...2152a | `manifest.json` runId; sha256(manifest.json) |
| Models | jev-1.13.0, gpt-6.1-sol | `st.freeze.policy.{model,organicModel}` |
| Screened slice | 1,178 / 241 / 537 / 331 | `run.manifest.counts.{associations,normalizedPrompts,creatives,hints}` |
| Run niche | crypto hardware wallets self custody | `run.manifest.selection.niches[0]`; record `mappingNiche`. Membership among the 983 library niches is not checkable from this repo (field position is labelled illustrative). |
| Library | 11,730 advertisers / 45,947 creatives / 420,540 placements / 983 niches (970 with ads) / 7,121 sub niches (5,991 with ads) | owner table |
| Library geography | 330,777 US tagged, 67,430 no country, 12 Fresh Ads countries | owner text |
| Snapshot and window | September 26, 2026; June 19 to August 24 | owner text ("around September 26") |
| ContextHint traction | thousands of people, including paying customers | owner-reported (handoff); no count invented |
| Video | four minutes; chapters 0:00 to 3:30 | MP4 duration 240.0 s; `artifacts/v3/recording/walkthrough.srt` cue starts (10 cues) |
| Footer date | October 2026 | `manifest.createdAt` 2026-10-01 |
