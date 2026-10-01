# MVP v2 truth audit (axp-mvp-v2, apps/product-ui + design-system/ledger)

Auditor: truth reviewer, read-only. Date 2026-10-02. Tag `axp-mvp-v2` = HEAD of `frontend`. There were no
working-tree changes under `apps/product-ui` or `design-system/ledger`.

Scope:
- Source: `apps/product-ui/src/**`, `scripts/project-run.mjs`, `design-system/ledger/**`.
- Rendered text: curl of http://localhost:3420 for `/`, `/opportunity/1..4/`, `/advertisers/` plus the 3 campaign pages, `/publisher/`, `/settlement/`, `/evidence/`, `/verify/`, `/try/`, `/present/`, `/design/` and `/design/v1/`. `/timeline/` returns 404.
- The Present beat captions from `src/present/beats.ts` and `public/present.srt`.

Ground truth:
- `artifacts/v3/replay/run.json` (sha256 938a0ee8…dd48, matches manifest.json)
- `docs/build/V3_RESULT.md`
- `docs/frontend/MVP_SPEC.md` data traps 1-11
- FRONTEND_PLAN section 2
- the specialist handoff
- the owner decisions in the brief

## Tests

`pnpm --dir apps/product-ui test`: **18/18 pass, 0 fail.** The tests cover:
- computeBid parity (576 cases)
- reason and auction parity against `packages/exchange` in run order
- recorded exclusions
- the rankBids tie-break and validateDraft limits
- whether the projection is deterministic and equals the shipped file
- counts, story order and joins
- sanitization, the vector guard and the size budget
- structural-check failure on broken conservation
- 48/48 verify checks
- 8 tampered fixtures, each of which fails loudly

I also ran some tamper probes of my own (they are not in the test suite); see B2 and W6.

## Blockers

### B1. The Verify page overstates what was proven
- **Text:** "The record is internally consistent: every hash on these pages matches its content."
- **Location:** `src/app/(explorer)/verify/page.tsx:54`. It appears on `/verify/` under "What this proves".
- **Why:** This is false as written. These pages show hashes that are never recomputed:
  - `rawOutputHash` and `requestHash` (decision Inspector)
  - organic `inputHash` and `completionHash` (answer Inspector)
  - `retrievalHash`
  - voucher `payloadHash` and `voucherRecordHash` (charge Inspector)

  The Inspector itself labels them "Recorded hash only". The same page's "does not prove" list says raw outputs and completions are recorded hashes only, which contradicts this line.
- **Fix:** "The record is internally consistent: every hash marked recomputable (questions, packets, creatives, acknowledgements, receipts) matches its content. Hashes marked 'recorded hash only' are reported, not checked."

### B2. A tampered or missing publisher key shows as "browser unsupported", and the headline still says "Passing"
- **Location:**
  - `src/lib/canonical.ts` `verifyEd25519`: any `importKey` failure returns `supported:false`.
  - `src/lib/verify.ts` signature check: `supported:false` produces `skip`.
  - `src/components/VerifyRunner.tsx` and `src/components/v2/live.tsx` `LiveVerifyTile`: the chip reads `failed.length ? … : "Passing"`.
- **Probe:** I set `publisher.publicKeyPEM` to `""`, and separately truncated it, then ran `verifyChecks`:
  - result: 0 fail, 3 skip, 45/48 pass
  - the UI would show the green "Passing" chip
  - the UI would also say "This browser cannot verify Ed25519; hashes still ran"

  A tampered value therefore does **not** fail. The page also tells the viewer something false about their browser.
- **Why:** `/verify/` exists so a skeptic can catch tampering. The spec says "Fail renders loudly with mismatch".
- **Fix:**
  - Detect Ed25519 support once, with a hard-coded known-good test key and signature.
  - If the browser is supported and the file's key fails to import, mark the check `fail` ("publisher key unreadable").
  - Show "Passing" only when `skipped === 0`. Otherwise show "n not checked".
  - Apply the same fix to `LiveSignatureV2`, `LiveSignature` and `LiveVerifyTile`.
  - Add a tamper test for an empty or truncated PEM.

### B3. Real brand names appear without the "observed historical reference" label
- **Text:** On `/opportunity/1/`, `/2/` and `/3/`, step 3, under "Nearest prompts in the screened history", rows such as:
  - `Cosine 0.617 "How do I check multiple wallets for airdrops at once?" · WOLF 1834`
  - `… · Mercari`
  - `… · Yoder Leather Company`
  - `… · OneKey Limited`
- **Location:** `src/components/v2/stages.tsx` `EvidenceTab`, the neighbour rows (`· {r?.advertiser}`).
- **Why:** The owner decision is that real brands are shown **only** labelled as observed historical references. These rows carry no label. WOLF 1834 appears on the opportunity pages only in this unlabelled form. The `/evidence/` "Other nearby prompts" list does label every row, so the two pages are inconsistent.
- **Fix:** Add the label to each row, or put one caption under the list heading: "Brands are observed historical references, not AXP advertisers."

### B4. "Nothing here trusts the page that displays it"
- **Location:** `src/app/(explorer)/verify/page.tsx:15`, the PageBar sub on `/verify/`.
- **Why:** This is overstated:
  - The checking code ships with the page.
  - The publisher public key that verifies the signatures comes from the same `run.public.json` it is checking.

  The checks do avoid trusting the values printed on the pages. They do not avoid trusting the page.
- **Fix:** "Your browser downloads the public record and recomputes its hashes, the publisher's Ed25519 signatures (against the key published in the same file) and the money arithmetic. The checks use the downloadable file, not the values printed on these pages."

### B5. The Try page calls the local laboratory "the real stack"
- **Text:** "To run the real stack locally: npm run demo:v3."
- **Location:** `src/components/v2/TryApp.tsx` (last caption), on `/try/`.
- **Why:** V3_RESULT defines `npm run demo:v3` as a "separately isolated synthetic laboratory, providers off by default". "The real stack" on the synthetic page implies real models and money. That runs against the rule that Try never presents synthetic output as real.
- **Fix:** "The same exchange code runs locally as a synthetic laboratory (providers off by default): npm run demo:v3."

## Warnings

### W1. Trap 3: unchanged outcomes do not get equal weight
- On Present beat 5 (`src/app/present/page.tsx` decisions view and the `beats.ts` caption), only the changed results appear:
  - 2.38 to 2.52
  - 2.29 to 2.50
- The beat never says that both offline pairs stayed at level 2 (1.93 to 1.97).
- In the opportunity decision cards, "Level changed" uses `tone="brand"` and "Unchanged" is neutral (`stages.tsx`, DecisionsPanel).
- LeatherGuard's arms were unchanged on opportunities 1 and 2 (1:2/1:2 and 0:2/0:2) but are never marked "Unchanged".
- V3_RESULT says "Report changed and unchanged outcomes equally."
- **Fix:**
  - Add one line to beat 5: "On the offline question both arms stayed at level 2: unchanged."
  - Give both tags the same tone.

### W2. Solana is described without the sandbox qualifier in places
The owner rule is "hosted Solana sandbox". The scope chips and footers do disclose it, but these places do not:
- Overview lede: "Built on ContextHint data, Jev decisions and Solana settlement."
- Settlement `<title>`: "Solana settlement · axp.one MVP"
- Advertisers: "funded a Solana payment channel" and "0.020 test USDC locked in a Solana payment channel"
- Settlement mini-sequence: "Open on Solana" and "Close on Solana"

**Fix:** At minimum, change the lede and the title to "hosted Solana sandbox settlement".

### W3. Trap 7 is only partly met
- The intent rubric's level-3 criterion, "Find or book offer with destination and concrete feature, dates or event", is travel legacy. It appears verbatim in every "View exact packet" Inspector, with no footnote.
- The spec asks for this footnote: "rubric wording inherited from the earlier prototype; unchanged in this run".
- The raw id `owned-travel-app` is visible only inside the Inspector. Its note there is correct. The spec wanted the mono id and a footnote on `/publisher/`.

### W4. Idle states read as "verified" before anything is computed
- `LiveSignatureV2`: the idle text is "Ed25519 signature verified here".
- `LiveHashV2`: the idle text is "… recomputed here".
- Inspector hash rows: a ✓ in pass styling with "Recomputable, see Verify", computed nowhere.
- Overview: a static `Verified state="pass"` reading "Signed receipt; checked on Verify".

With JS off, or before the checks finish, these read as passed. `LiveHashV2` also has no `.catch`, so an error leaves it stuck in the idle label.

**Fix:** Idle text should read "Checking…". The Inspector should use a neutral mark.

### W5. Voucher charts mix two limits
- The vouchers are charted against the campaign budget cap, with the label "Cumulative authorization against the 0.008 cap". The channel deposit is 0.020.
- On campaign pages, "Refunded 0.013" sits next to the 0.008-cap chart, and the 0.020 deposit is not shown.
- This is not false (spend is bounded by the 8000 cap). But it combines the campaign-cap and channel-deposit limits, and the spec asked for a 20000-scale ChannelMeter.
- **Location:** `stages.tsx` ChargePanel (hard-coded "0.008") and the campaign page.

### W6. The browser checks do not cover some displayed values (disclosed, but worth knowing)
Tampering with any of these still passes 48/48:
- decision scores or levels (the 2.38 to 2.52 headline)
- the repeat ClearVault levels
- organic answers
- Evidence-page record text

The "does not prove" list covers model outputs. It does not cover the fact that the Evidence-page copies of records are not compared with the hashed packet contents.

**Suggested check:** Each `evidence.records[i]` prompt and creative text equals its copy inside a hashed packet.

### W7. The Try page attributes a skip to an agent
- **Text:** "No bid: levels below 2 mean the agent would skip".
- Under the real policy, a `bid` decision at levels below 2 is `below_threshold`. That is code, not the agent.
- **Fix:** "Levels below 2 get no bid under the bid table."

### W8. Present beat 3 embellishes LeatherGuard
- **Text:** "LeatherGuard sells leather wallets and is unfunded."
- Its approved creative and declarations say "physical RFID-blocking wallet for payment cards". "Leather" is only in the name.
- The text came from the spec, but a safer version is "sells physical RFID-blocking wallets".

### W9. The beat 7 caption is wrong in the recorded video
- **Text:** "These checks just ran in this browser."
- In the recorded video and `present.srt`, the viewer's browser ran nothing.
- **Fix:** Drop the sentence from the SRT, or say "ran live in the presenting browser".

### W10. `/timeline/` is a 404
The spec lists this route. Nothing links to it. Traps 1 and 2 are still disclosed elsewhere:
- the sidebar footnote on every page
- Overview "Run activity": an exchange-clock-only axis with a 70-minute break, saying chain times are never on this axis
- Settlement: the chain lane by slot, labelled "sandbox clock … not aligned"
- the opportunity 4 note

### W11. The sanitization chips on Verify are meaningless
- They render as "events events decisions decisions decisions decisions decisions decisions" (`field.split(":")[0]`).
- They sit next to a truth claim and read like a bug.

### W12. The Evidence lede says "real prompts"
- The dataset is a "measured prompt panel" (probe prompts), not organic user queries.
- Prefer "observed prompts". This is consistent with the allowed claim, "real conversational-ad observations".

### W13. The projection reads from the laboratory but reports it as dropped
- `freeze.campaignVersionsCreatedAt` is read from `state.laboratory.exchange.events` (`laboratoryOnly:false`).
- `build-meta` lists "laboratory (synthetic, never acceptance)" as dropped.
- It is not displayed anywhere, only shipped in the JSON.
- **Fix:** Source it from the acceptance events, or rename the field.

### W14. Minor
- Beat 1 says "Someone asks an AI app". The four questions were operator-authored scenarios.
- The receipt "Mode" row renders the field `mode: "sandbox"` as "Hosted Solana sandbox". The run's network is a hosted Solana sandbox, but that wording is an interpretation, not the field's value.

## Data traps

| # | Trap | Status |
|---|---|---|
| 1 | Story order is not run order, and this is disclosed | OK. Sidebar foot on every page; opportunity 4: "On the exchange clock this question ran first, about 70 minutes before the others" (13:47:28 vs 14:57:14); Overview activity axis. No /timeline/ page (W10). |
| 2 | The two clocks are never on one axis | OK. Overview axis uses exchange events 12-33 only. Chain times appear only in the Settlement slot lane, labelled "sandbox clock". |
| 3 | ScoreRuler and the ArmDiff wording | Wording is exact on /opportunity/1/ for both funded campaigns. Ruler has the 2.5 line. Equal-weight rule is partial (W1). |
| 4 | ClearVault repeat: "Agent said bid. Exchange did not admit it." with no amount | OK on the opportunity 3 card and auction row ("agent said bid · Not admitted: frequency cap", no value), the campaign page ("Bid, not admitted (cap)", bid "none"), Present beat 8, and the Inspector JSON (no amount). |
| 5 | LeatherGuard blocked twice | OK. "Blocked twice: excluded by rule (missing crypto storage) and its own agent chose no fit … the word 'wallet' is ambiguous". The campaign page leads with "Why LeatherGuard never paid: excluded by rule and skipped by its own agent." |
| 6 | Evidence hook | OK. Cosine 1.000 to ads:mapping:1836866 (Mercari Nano Trezor), labelled. |
| 7 | Legacy publisher id and rubric | Display name and footnote OK. Rubric footnote missing (W3). |
| 8 | Per-transaction deltas only | OK. No postSnapshot or balances in the JSON. "earlier balances are not shown". |
| 9 | settlementLink and rpc stripped | OK. Projection scan for settlementLink, rpc, customUrl, surfnet, openSalt, :8899 finds nothing. |
| 10 | No conversion-probability field | OK. Absent from the projection (the only "conversion" hits are dataset-limitation sentences), from decision Inspector JSON, and from packets. |
| 11 | Receipts joined by awardId | OK. `receipts[0]` in run.json is opportunity 2's award. The projection joins by awardId and verify's linkage checks it. |

## Sanitization

`run.public.json` is 176,387 bytes. I checked for each item below and found none:
- agentId, agentRunId, openSalt, rpc, customUrl, surfnet, packetBytes, PRIVATE KEY, settlementLink, callEvidence
- postSnapshot or pre/post balances, renderTokenHash
- local paths or emails
- any numeric array (so nothing over 64)

Nothing is read from `sandbox-topup.json`. The 0.026 top-up amount is not shown; the only top-up text is the V3_RESULT sentence. Receipt signatures, the publisher PEM, payer and payee are present, as the owner allowed. The organic provenance `engine: "codex-app-subagent"` ships in the Inspector JSON. This is harmless, noted only.

## Forbidden-claims sweep (source and rendered text)

These appear only as negations:
- lift, conversion, attention
- mainnet, devnet, independent wallets
- x402

These appear nowhere:
- partnership, pricing, industry-first
- ChatGPT or algorithm, sub-50ms
- ContextHint traction or customers

"Decided with Jev" is used consistently.

## Verified numbers

| Shown | Value | Source in run.json |
|---|---|---|
| Questions, decisions, auctions, no-fill, receipts | 4 / 15 / 3 / 1 / 3 | `state.turns`, `turns[].records` (6+6+3+0), `exchange.opportunities[].outcome.status`, `receipts[]` |
| Bids in auctions | 5 | `opportunities[].outcome.bids` (2+2+1) |
| Clearing prices | 0.004 / 0.003 / 0.003 | `outcome.award.priceBaseUnits` 4000/3000/3000 |
| Running totals | 0.004 / 0.007 / 0.010 / 0.010 | `exchange.charges[].amountBaseUnits` |
| Intent scores, cached | CV 2.38 to 2.52, KF 2.29 to 2.50 | `turns[v3-cached].records[].rawOutput.answers.intent.score` |
| Intent scores, offline | CV and KF 1.93 to 1.97 (level 2) | `turns[v3-offline].records[]` |
| Repeat | CV 2.51 (3:3, bid, not admitted); KF 2.49 (3:2) to 0.003 | `turns[v3-repeat].records[]`, `outcome.rejections` frequency_cap |
| Relevance scores | 2.82/2.89/2.85/2.81/0.71/0.67; 2.99/2.98/2.98/2.96/0.49/0.43; 2.85/2.83/0.71 | `answers.relevance.score` |
| Elapsed | 846, 370, 368, 477, 377, 356; 540, 315, 352, 322, 378, 367; 578, 342, 368 ms | `records[].elapsedMs` |
| Similarities | cosine 1.000/0.889/0.846/0.817; LeatherGuard 0.742/0.682/0.649; overlap 0.387/0.204; LeatherGuard 0.183/0.144/0.129 | `records[].retrieval.examples/neighbors[].similarity` |
| Delivery after award | +25.4 s, +31.2 s, +31.5 s | `charges[].delivery.receivedAt − awards[].createdAt` |
| Award expiry | 15:27:14, 15:28:39, 15:29:51 UTC | `outcome.award.expiresAt` |
| Exchange times | opportunities 14:57:14, 14:58:39, 14:59:51; mobile 13:47:28; 70-min gap | `events[16,17,23,29].at` |
| Chain times (sandbox clock) | 14:36:21, 14:37:01, 14:41:39, 14:42:26; slots 452225151, 452225252, 452225945, 452226063 | `chainEvidence.channels[].originalTransactions[].blockTime/slot` |
| Deposits, paid, refunded | 0.020 ×2; ClearVault 0.007 / 0.013; KeyForge 0.003 / 0.017; totals 0.040 / 0.010 / 0.030 | `state.payments[]` deposit/settled/refund; close `tokenDeltas` |
| Vouchers | ClearVault #1 4000, #2 7000 cumulative; KeyForge #1 3000 | `payments[].vouchers[]` |
| Fees and rent | fees 40,000 (5,000 open, 15,000 close); new rent 9,423,840 (+4,711,920 ×2); reclaimed 4,078,560 (2,039,280 ×2); gross 9,463,840 ≤ cap 20,000,000 | `originalTransactions[]`, `freeze.policy.aggregateFeeRentLamports` |
| Campaign limits | max 0.004, cap 0.008, frequency 2, floor 0.001 | `exchange.campaigns[]`, `freeze.policy.frequencyCap`, `opportunities[].floorBaseUnits` |
| Calls per campaign | 5 each; eligible ClearVault 2/4, KeyForge 3/4, LeatherGuard 0/4 | `turns[].records`, `turns[].eligibility` |
| Evidence slice | 1,178 / 241 / 537 / 331; tiers 246 / 42 / 43; sources aws 1,031, verseodin 147; 13 records + 5 hints used | `manifest.counts`, `evidence.hints[].tier`, referenced ids |
| Restart | 0 new calls, charges, signatures, broadcasts; before = after hash | `restart` |
| Tokens and model | 21,336 in / 1,655 out; jev-1.13.0; gpt-6.1-sol low | `state.model.usage`, `freeze.policy` |
| Verify | 48 checks (4 question, 15 packet, 3 creative, 3 ack, 3 receipt, 3 signature, 3 linkage, 3 cumulative, 2 conservation, 5 bid, 2 tie-break, 1 fee cap, 1 totals); 45/45 build self-checks | `src/lib/verify.ts`, `src/data/build-meta.json` |
| Try parity | "Rules verified 12/12" = 5 bids + 7 exclusions | `try/page.tsx` parity() over the projection |
| Present captions and SRT | every number matches the rows above | `src/present/beats.ts`, `public/present.srt` |

## Verify page integrity

`src/lib/verify.ts` genuinely recomputes the following with WebCrypto:
- sha256 of canonical JSON for turn inputs, questions, the 15 packets, creatives, acknowledgements and receipts
- Ed25519 over `"AXP.delivery.v1\n" + canonical(receipt)`
- BigInt arithmetic
- `computeBid` and `rankBids` re-runs

It runs against the same `/run.public.json` that is offered for download, fetched with `no-store`. One-byte tampering of a receipt field, signature, packet, voucher, bid, refund, creative or question fails loudly (tests plus my own probes). The exceptions are B2 (the key) and W6 (displayed values that no check covers).
