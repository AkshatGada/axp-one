# axp.one landing v5: truth audit (round 3, changes only)

Scope: `git diff axp-landing-v4 axp-landing-v5 -- apps/marketing design-system`. That is 40 files: copy.ts, library.ts,
the new run.landing.json and run.ts, the chapter, scenes, specimens, the lint and extract scripts, the build config and the
design-system touches. HEAD (5a3a2d8) differs from the tag only in product-ui, so the :3410 dev server renders v5. The
stripped text of `http://localhost:3410/` (924 lines) matches the text of `apps/marketing/out/index.html` exactly. The
only difference is the order of the `<title>`.

Ground truth used:
- `artifacts/v3/replay/run.json` + `manifest.json`
- `apps/marketing/src/data/run.landing.json`
- `apps/product-ui/src/data/build-meta.json` + `src/lib/verify.ts` + `src/components/VerifyRunner.tsx`
- `packages/contracts/index.mjs` (`computeBid`) and `apps/product-ui/src/lib/policy.ts` (`rankBids`)
- `landing-v4-truth.md`, `landing-v4-owner.md`, `landing-v4-fixes.md`
- the builder's screenshots in `shots/landing-v5-final/`

Tooling:
- `node apps/marketing/scripts/lint-copy.mjs`: passes (51 files clean, plus out/index.html). It now also scans `out/_next/**/*.js`.
- My own scan of the dev JS bundles (1.67 MB) and of `out/_next` found no `jev-*`, `gpt-6`, `fit_intent*`, run ID,
  manifest/receipt/state hashes, `ads:mapping|hint` or lamports.
- Rendered text and attributes have no em or en dashes, and none of these strings: "serving database", "owner supplied",
  "snapshot", "cached", "base units", "real questions" or "Motion is illustrative".

**Summary: 1 blocker (carried B1, wording fixed but placement not), 6 warnings.** Every number in the changed copy
traces to the run, the MVP build meta or the owner figures.

---

## BLOCKERS

### B1 (carried, partly fixed). "1,000+ marketers ... including paying customers" now sits directly on top of the brand-logo wall, and the disclaimer comes after the wall
- **Fixed:** the wording. `CONTEXTHINT.wallLabel` is now exactly the approved text: "Ads observed by ContextHint inside
  ChatGPT, shown as data. These brands are not axp.one advertisers, and no relationship with them is implied."
- **Not fixed:** the placement. `ContextHintChapter.tsx:19-56`. The traction block moved out of the wall's column, but into
  the row directly above the full-bleed wall (`.ch-open`, then `.ch-wallband`). The label renders *after* the wall
  (`<p className="px-wrap ch-wall-label">` follows `.ch-wall-frame`). The first frame that shows the wall therefore
  reads: a huge "1,000+", then "marketers use ContextHint every day, including paying customers", then Canva, Asana,
  LegalZoom, Figma, monday.com, Robinhood and Salesforce logos, with no disclaimer in view. See
  `shots/landing-v5-final/1440-ch-opener.png` and `390-ch.png`. This is still the "N customers + logo wall" pattern.
  Fix item 1 required the figure to sit "not beside the logos", and the brief requires "no implied relationship". The
  disclaimer is only visible once the wall has scrolled up (`1440-ch-band.png`).
- **Fix (layout, one move):** render the wall label *before* the wall, at the top of `.ch-wallband`, so it is the first
  line after "paying customers". Alternatively, put clear separation between the traction row and the wall, for example
  the library numbers or a divider and some space. The best option does both, and keeps the label also visible beside
  the 11,730 / 45,947 overlay.

---

## WARNINGS

1. **The Fresh Ads source implies a collection period the owner never gave.** `library.ts` `FRESH_ADS.source` renders
   "Fresh Ads collection by country, ContextHint data, October 2026." The footer renders "traction and Fresh Ads, October
   2026." The table was supplied on 2026-10-02 with no window, and "collection ..., October 2026" reads as "collected
   during October". This matches the orchestrator's approved wording (fix item 2), but the caller asked for it to be
   flagged.
   - Suggested source: "Fresh Ads collection by country, ContextHint data, reported October 2, 2026."
   - Suggested footer: "ContextHint figures: library data as of September 26, 2026; traction and Fresh Ads reported
     October 2, 2026."
   - The traction "October 2026" is fine: it is a present-tense claim, not a window.
2. **The new "48 checks" link and every MVP link 404 in the production export (v4 W6 carried, higher stakes now).**
   - In dev the links resolve to `http://localhost:3420/verify/` (200).
   - The production build bakes in `/mvp/` and `/mvp/verify/` (`out/index.html`: 4 and 2 hrefs), and `out/` has no
     `mvp/`. The merge is only planned (`docs/frontend/FRONTEND_PLAN.md:352`, "product-ui built with basePath '/mvp',
     merged into marketing out/"). No script does it.
   - Before deploy, either implement that merge or build with `NEXT_PUBLIC_MVP_URL` set to the MVP's real origin.
3. **"Verify the receipts yourself: 48 checks run in your browser."** The figure is correct:
   - `build-meta.json` `verify` reports 48 total, 48 passed.
   - `extract-specimens.mjs` reads it from "verify checks pass (48)".
   - `VerifyRunner` recomputes every check client-side against `run.public.json`.

   But only 12 of the 48 checks concern receipts (ack, receipt fields, signature and linkage, x3). The rest cover
   questions, packets, creatives, vouchers, conservation, bids, tie-break order, the fee cap and totals. Suggest "Verify
   the run yourself: 48 checks run in your browser." (or "the receipts and the money").
4. **Three soft spots in the "What's real, what's illustrative" panel** (`copy.ts` `REAL`):
   - (a) The real column says "The four questions and their answers, written with no advertiser material." That is
     stated as fact, but the same panel's limits say "Their inputs show no advertiser material; that is not a
     cryptographic proof." Suggest "The four questions and their answers; the recorded inputs carried no advertiser
     material."
   - (b) "ContextHint's ads, prompts and inferred audiences" sits under "Real, from the recorded run". It is ContextHint
     library data, and the page elsewhere calls the audiences hypotheses. Suggest "The ContextHint record each agent saw:
     a real prompt and ad, and an audience ContextHint inferred."
   - (c) Optional: add "The chat frames are redrawn for this page; the words in them are from the run." to the
     illustrative column. The "Our demo AI app" chrome is a marketing rendering, not a capture.

   The rest is accurate. All 15 judgments are Jev calls. Eligibility, prices and the auction are decided in code. There
   are 3 cards with app-signed receipts. 2 channels opened and closed, finalized. The motion, the per-ad lane, and the
   dot and niche layouts are illustrative. The limits list is the PROOF limits, unchanged.
5. **The hand-off line can read as "agents see the whole library".** "This is what each buying agent sees before it
   judges a moment." sits under the moat line about the whole collected record. The funnel just above says that an agent
   sees one packet (1 + 1). Suggest "Each buying agent sees one small packet from this record before it judges a
   moment."
6. **Campaign and turn IDs still ship in client JS** (low risk). `out/_next/static/chunks/585-*.js` contains the
   following IDs, used as keys in `run.landing.json`. They are not rendered, and they are not on the owner's banned list
   by name (run ID, record IDs and hashes are, and those are gone). Optionally, alias them in the landing slice.

   | ID | Count in the chunk |
   |---|---|
   | `v3-clearvault` | 21 |
   | `v3-keyforge` | 21 |
   | `v3-leatherguard` | 13 |
   | `v3-cached` | 4 |
   | `v3-offline` | 3 |
   | `v3-repeat` | 3 |
   | `v3-mobile` | 2 |

Informational:
- "A fixed, published tie rule". The rule is "equal amounts ordered by campaign ID, ascending" (`policy.ts:119`). It is
  re-run on the MVP's Verify page ("Tie-break order"), so "published" holds through the MVP, but the landing never states
  the rule itself.
- v4 W13 (wall source naming; the sandbox uses the mainnet USDC mint address and genesis hash) stands as before.
- Jev gets one extra factual mention, in the REAL panel ("made with Jev"), beyond the owner's listed places. It is modest
  and true.

---

## Checked in the changes: correct

- **Payoff, "0.004 instead of 0.003":** correct.
  - On the cached question, ClearVault's baseline arm is relevance 3 / intent 2, and its history arm is 3 / 3.
  - `computeBid` gives 3:2 = 7500 bps x 4000 = 3000 (0.003), and 3:3 = 10000 bps = 4000 (0.004, the full max bid).
  - ClearVault's budget and channel were untouched at that point: the mobile turn ran first and had no award. So no
    clamp applies.
  - The run's own offline turn (3:2) bid exactly 3000.
  - The MVP's present page says the same ("would have bid 0.003 USDC").
  - "The agent" refers to "Handed to ClearVault's agent". KeyForge moved the same way. "History changed nothing" holds:
    on the offline turn all arms are 3:2.
- **Stage beat 4:** "both wallet agents were a little more sure of the buying intent": both went from intent 2 to 3.
- **Stage beat 5:** "declared the same capabilities": both have `crypto_storage, hardware_wallet, offline_key_storage,
  ethereum, solana`. "Same ratings": both are 3:3. "0.004, the advertiser's maximum": `maxBid` is 4000 on both.
- **Rule wall reorder:**
  - "A mobile only question: all three campaigns ruled out, zero model calls, no ad." 3 exclusions, 0 decisions.
  - "On the repeat question ClearVault's agent said bid ... already been shown two times." ClearVault's repeat decision
    is bid 3:3, excluded with `frequency_cap`. The cap is 2. ClearVault won the cached and offline turns, and both
    completed before the repeat turn.
- **Solana hero line:** "Settled through Solana payment channels on a hosted Solana sandbox with test USDC." "Mainnet"
  appears only in "Sandbox, not mainnet." (limits) and "Devnet, then mainnet." (Building next).
- **Jev one-liner:** "Jev is the decision model each advertiser's agent uses to judge an opportunity." This is the
  approved text, word for word, with no sponsor, partner or speed claim.
- **Refund wording:** "refunded to the payer that funded both channels" (approved). The limits say "One disposable test
  payer funded both channels", which is consistent.
- **Per-ad lane:** now "A transaction per ad / A Solana transaction fee and a wait on every card", and the source line
  says "the per-ad lane is illustrative". "Network fee" now appears only in Why now, with "Planned, not in this demo".
- **Proof:** 4 questions, 15 agent decisions, 3 deliveries with signed receipts, 2 Solana channels settled. "In total,
  0.010 USDC paid to the AI app and 0.030 USDC refunded, across both channels." These match `totals` (10000 / 30000)
  and the finalized status on both channels.
- **Dates:** "as of September 26, 2026" applies only to the library headline and placements. "Recorded run, October
  2026" matches the manifest `createdAt` of 2026-10-01.
- **Niches:** "Our run drew on five niches": `manifest.selection.niches` has 5. The story record is crypto hardware
  wallets and self custody.
- **Fresh Ads definition:** reads as approved, and all calls are counted.
- **Funnel:** the line "Not to scale." is present, and widths 100 / 64 / 34 are strictly decreasing.
- **Payment plate:** "Paid 0.007" now sits between Deposit 0.020 and Refunded 0.013.
- **Ship hygiene:**
  - `out/` has no `design/`, `color-lab/` or `metal-lab/` (the labs moved to `apps/marketing/labs/`, and the build
    removes `out/design`).
  - The landing imports the slim `run.landing.json`, and `extract-specimens.mjs` asserts it carries no leaks.
  - `/design` source no longer renders the run ID or receipt hash.

---

## v4 items: status

| v4 | Status | Note |
|---|---|---|
| B1 wall implies ContextHint customers | **Partly fixed** | Wording fixed; traction still directly above the logos, label after the wall (see B1) |
| W1 Fresh Ads definition | Fixed | "A call counts as returning ads when..." |
| W2 footer dates everything Sep 26 | Fixed, new issue | Split dates; but "Fresh Ads, October 2026" implies a period (W1 above) |
| W3 "the niche our run drew on" | Fixed | "five niches; the record ... crypto hardware wallets" |
| W4 "refunded to the advertiser" | Fixed | "the payer that funded both channels" |
| W5 per-ad counterfactual / "network fee" | Fixed | Marked illustrative; "Solana transaction fee" |
| W6 MVP links 404 at landing origin | **Not fixed** | No merge step; now also the "48 checks" link (W2 above) |
| W7 internals in client JS; labs deploy | Fixed | Slim slice, JS lint, labs out of public; only campaign IDs remain (W6 above) |
| W8 /design internals | Fixed | Excluded from out/; run ID and hash removed from source |
| W9 funnel not to scale | Fixed | "Not to scale.", decreasing widths |
| W10 payment plate arithmetic | Fixed | "Paid 0.007" shown |
| W11 "cached question" jargon | Fixed | "On the first question" |
| W12 "four real questions" | Fixed | "Four questions" / "questions" |
| W13 wall source / sandbox mint | Informational | Unchanged |
