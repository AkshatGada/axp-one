# MVP v3 design review (tag axp-mvp-v3, f15a725)

Critic: design. Read-only, headless system Chrome (playwright-core), localhost only.
Viewports: 1280x800, 1440x900, 1920x1080, 2560x1440 (Present), 390x844 (mobile emulation). Light only.
Tools: `tools/mvp-design/capture-v3.mjs` (modes bench, shots, present, auto, keys, verify, mobile). Raw data:
`tools/mvp-design/out/v3/` (bench.json, present.json, verify.txt, auto-1280.txt, auto-1440.txt). Shots: `shots/mvp-v3/` (26).

**Environment note.** The dev server on :3420 returned HTTP 500 on every route for the whole session. At 02:00 a
`next build` wrote a production build into `apps/product-ui/.next` (it has BUILD_ID and export-marker.json), which is
the dev server's own directory. That is the `.next` collision the build notes warn about. I did not restart it.
Instead I measured the **static export of the same commit**: `.next-build/` was built at 02:00 and includes the pass-2 strings
("A rule changed the winner", the "Mismatch" tag). I served a snapshot copy from 127.0.0.1:3421. This is the
deployable artifact, so the LCP/CLS/bytes numbers are more meaningful than v2's dev-server numbers. The
orchestrator needs to restart `pnpm dev` (rm -rf .next first) before the next builder pass.

## Verdict

v3 fixed both of v2's structural failures. **Present now works at every laptop and desktop size**: it is centred,
letterboxed and fills 92 to 98% of the stage on every beat, and it shows a proper card on phones. **/verify is truthful, stable and now
has a tamper demo that turns red and resets cleanly.** The stepper no longer gives the ending away, the Award stage
is fixed, opportunity 4 collapses to three steps, and the honesty layer has lost its internal leaks. What still keeps it
under 9 is one new layout regression at 1280 (the opportunity page stacks and the stage drops below the fold), one
visibly broken Present beat (8), the Inspector still in v1 styling, and a short tail of v2 craft items that
were not picked up.

**Average: 8.55 / 10** (v2: 7.75, +0.80)

## Scores (MVP rubric)

| # | Line | v2 | v3 | Δ | Why |
|---|---|---|---|---|---|
| 1 | Cold orientation | 8.0 | 8.5 | +0.5 | Units now sit on the KPI baselines ("0.004 USDC", "0.010 USDC"), the tiles say plainly what they count, and the new "Where a rule changed the winner: opportunity 3" callout points a newcomer at the interesting moment. Glossary underlines on ContextHint, Jev and hosted Solana sandbox. Still: the lede is 3 lines and about 50 words, the Auctions panel leaves a ~90 px void beside Latest delivery, and at 1280 the price tiles wrap "USDC" onto its own line. |
| 2 | Opportunity screen | 7.5 | 8.0 | +0.5 | The stepper shows progression ("Not reached yet", hollow numbered circles). Award has Reserved and Expires side by side with the creative full width. Opp 4 collapses to Moment, Eligibility, "Steps 3 to 9, did not run", with required capabilities only plus a "also listed as a preference" note. The tie explanation and opp 3 callout read well. **Regression at 1280x800**: `app.css:220 @media (max-width:1280px) .op2-grid {1fr}` stacks the chat above the stage, so the stage panel starts at y=838 on an 800 px screen. Pressing J changes nothing you can see, and the stepper truncates to "Not reached …". It is fine at 1366 and up. |
| 3 | Honesty made visible | 9.0 | 9.5 | +0.5 | "Tier loo" and "Source: aws" are gone (now "Leave-one-out tested", "Stored ad library", "VerseOdin prompt panel"). Topics are sentence case. Every brand row has a label ("Brands in this list are observed historical references…"). Eligibility copy is now honest about the research comparison. The /try footer says "synthetic laboratory, with model providers off by default". "Hosted Solana sandbox" appears everywhere Solana is named. Small inconsistency: "not an AXP advertiser" (cards) vs "not axp.one advertisers" (lists). |
| 4 | Decisions and auction | 8.0 | 8.5 | +0.5 | "Why the bids are equal" and "What history changed here" make the ties explicable. The opp 3 warning callout ("A rule changed the winner…") lands. The "Missing crypto storage" note is offset off the floor tick, and units are on every number. The decision ScoreRuler is still ~190 px wide in the explorer cards. |
| 5 | Settlement | 8.5 | 9.0 | +0.5 | No wall-clock times beside chain events ("Ordered by slot… no clock times are shown here"). KPI uses "9,463,840 lamports", the same as the table. The voucher chart is scaled to the 0.020 deposit with a dashed 0.008 cap line. A plain "Why fees are larger than the ad spend here" note. The "In order (no clock times)" sequence still wraps as chips onto two rows. |
| 6 | Present mode | 6.0 | 8.0 | +2.0 | Centred and fully inside the viewport at 1280x800, 1440x900, 1920x1080 and 2560x1440 (scale 0.667 / 0.75 / 1 / 1.333). Fill is 0.92 to 0.98 of the stage on 9 of 10 beats, the phone shows a "designed for a laptop" card, autoplay is exact and every key works. Deductions: **beat 8 is visibly broken** ("fl0or 0.001" axis labels collide, the "Not admitted: frequency cap" note box overflows the panel edge, the bar chart is squeezed to ~190 px). The fit algorithm picks zoom 1.5 to 2.3 per beat, so body type jumps from about 20 px (beat 10) to about 30 px (beat 3) between consecutive slides. Beat 7 overfills (1.04, cards 7 px from the caption bar). Beat 10's left column is ~40% empty. |
| 7 | Verify | 8.0 | 9.0 | +1.0 | 48/48 including Ed25519. CLS dropped 0.482 → 0.014. Rows render "not run yet" before checks resolve, the KPI headline reads "Passing" only after the run, and the copy says exactly what is recomputed (28 hashes, 3 signatures, 17 sums and rules) and that the key comes from the same file. The tamper demo flips one nonce character: the receipt hash and Ed25519 rows go red with "Mismatch", a "Tampered copy" tag and a danger rail, and Reset restores ✓. The main KPI correctly stays 48/48 because the file is untouched. Nits: "signature does not match" is prose set in mono, and there is still a 0.014 shift from the group tags. |
| 8 | Visual craft | 7.5 | 8.0 | +0.5 | The receipt prose is in body type with mono only for hash, signature and key. The Campaigns table edge is fixed. Award is balanced. At 2560 Present is crisp. Detractors: the Inspector is still v1 (square, 2 px accent rule on the leading edge, a 20 px underlined display-type "Recomputable on Verify" link, JSON wrapping to column 0), the LeatherGuard decision table is still cramped (eligibility cells wrap to 4 to 7 lines), Run activity labels still scale with width (10 px at 390, 16 px at 1920) with the 13:38 organic markers still overlapping, the "Fictional" chip's hollow square still reads as a checkbox, and "rfid blocking" is lowercase. |
| 9 | Navigation | 8.0 | 8.5 | +0.5 | `I` now opens the active stage's record on stages that have one (Auction → "Auction outcome", Receipt → "Signed publisher receipt"), and the JSON is pretty-printed. J/K/arrows clamp correctly. Present keys (→, Shift+→, 1 to 0, ←, R, ?, A, C, E, Esc) all work. Still: Evidence and Decisions have no primary Inspect, so `I` falls back to "Organic answer". The stage is read from the hash only on mount, so setting the hash or pressing Back does not change the stage. There is no skip link. |
| 10 | Robustness | 7.0 | 8.5 | +1.5 | 0 console errors, 0 failed requests and 0 off-origin requests on 17 routes at 1440, 1280 and 390. No horizontal overflow at 390 or 1280. CLS < 0.02 everywhere (max /verify 0.014). First-load JS ~155 KB gz. Present works at every viewport. Deductions: the 1280 stacking regression, beat 8 overflow, and the dev-server collision (a process issue, not app code, but it broke the review target). |

## Did the v2 fixes land?

| v2 fix | Status |
|---|---|
| 1 Present stage positioning | **Landed.** Centred and inside at all 4 desktop sizes, with a card at 390. |
| 2 Fill the 16:9 frame | **Landed, with side effects.** Fill is 0.92 to 0.98, but the per-beat zoom (1.5 to 2.3) makes type size inconsistent. Beat 7 overfills, beat 8 breaks, beat 10's left column is empty. |
| 3 /verify CLS | **Landed.** 0.482 → 0.014. /try and ?all=1 are now 0.000. |
| 4 Stepper progression | **Landed.** |
| 5 Award void | **Landed.** |
| 6 Inspector: active record and v2 style | **Half.** The right record opens on stages with a primary button and the checkbox look is gone. The v2 restyle was not done, and Evidence and Decisions still fall back to the Organic answer. |
| 7 Receipt mono | **Landed.** It also shows the truncated hash and signature. |
| 8 Campaigns table edge | **Landed.** |
| 9 Run activity text scaling | **Not landed.** Labels still scale (10 to 16 px), organic markers still overlap, and at 390 only the first time segment is visible. |
| 10 Overview balance | **Half.** Tile baselines are aligned, but the Auctions panel void remains. |
| 11 No-fill stepper | **Landed.** |
| 12 Internal labels | **Landed.** Verify rows now read "Opportunity 1, ClearVault, baseline". |
| 13 LeatherGuard table | **Not landed.** It was not in the v3 merged list. |
| 14 Settlement sequence and units | **Half.** Units match, but the sequence still wraps. |
| 15 Middots, skip link | Middots are gone from UI copy (0 on every product route; 56 remain on /design only). **No skip link.** |

Also from the v3 merged list: the truth fixes (A3 to A7, B15, B16, C24, C25) are all present in the rendered copy. The
glossary (B11) is present as dotted-underline Terms.

## Benchmarks (measured)

| Benchmark | Target | Result |
|---|---|---|
| Console errors / failed / off-origin (17 routes; 1440, 1280, 390) | 0 | **0 / 0 / 0** pass |
| Horizontal overflow at 390 and 1280 | none | **none** (scrollWidth = viewport on every route) pass |
| Fonts | PolySans, no fallback | PolySans, Wide and Mono loaded, 0 failed. pass. Note: PolySans 400 is downloaded **twice** (design-system `@font-face "PolySans"` and next/font `"polySans"`, same file hash adfc11ac, ~30 KB), and unused 700 faces are declared. |
| LCP (static export, desktop) | < 2.0 s | 40 to 212 ms on explorer routes, 316 ms on /present. pass |
| CLS | < 0.02 | **pass on all routes**: /verify 0.014 (group tags), /design 0.005, everything else 0.000, including /try and ?all=1 |
| First-load JS | ≤ 200 KB | ~155 to 157 KB gz (/, /verify, /present). pass. Overview also fetches run.public.json (172 KB, 29 KB gz) for the live tile. |
| Lighthouse | ≥85 / ≥95 | not run (no Lighthouse installed; not downloaded) |
| /verify in Chromium | 48/48 incl. Ed25519 | **48/48** (4 question, 15 packet, 3 creative, 3 ack, 3 receipt, 3 Ed25519, 17 sums and rules). "48/48" already at 200 ms. pass |
| Tamper demo | red, then reset | Tamper → nonce `…97a`→`…97b`, receipt hash `48be239f30…` **Mismatch**, Ed25519 "signature does not match" **Mismatch**, tag "Tampered copy", Tamper button disabled. Reset → "Original file", both ✓. Main KPI stays 48/48 (correct). pass |
| Present autoplay | 10 beats, ~4:00, no stuck beat | 1440x900: beats at 0, 14.6, 34.6, 54.5, 79.5, 109.6, 134.6, 159.6, 184.6, 214.7 s, ends at 240 s and drops to manual. 1280x800 is identical (±0.2 s). Frame stayed inside the viewport throughout. 0 errors. pass |
| Present fit, per viewport | centred, uncropped | 1280x800 frame (0,40)-(1280,760) s=.667; 1440x900 (0,45)-(1440,855) s=.75; 1920 exact; 2560x1440 s=1.333. All centred, all inside. Caption 14.7 / 16.5 / 22 / 29.3 px. pass |
| Present fill (content / stage height) | ~0.9+ | b1 .98, b2 .96, b3 .92, b4 .98, b5 .96, b6 .97, **b7 1.04 (overfills)**, b8 .98, b9 .94, b10 .95. Zoom chosen: 1.55, 1.8, **2.3**, 1.75, 2.0, 1.65, 2.1, 2.05, 1.95, **1.5** |
| Present at 390 | not blank | "Present mode is designed for a laptop or larger screen" card with Overview button. pass |
| Keyboard | J/K, I, focus, Present keys | J/K clamp at #charge, focus ring 2 px accent on every Tab stop. `I` is correct on stages 1, 2 and 5 to 9 and falls back to Organic answer on 3 and 4. Present: every key works. Hash change or Back does not move the stage. No skip link. |
| Copy: dashes / middots | 0 in UI copy | 0 dashes in UI copy (one em dash in each of opp 2, 3 and 4's verbatim organic answers). 0 middots on product routes. pass |

## Ranked fixes for v4 (impact first)

1. **Opportunity layout stacks at exactly 1280.** `apps/product-ui/src/app/app.css:220`
   `@media (max-width: 1280px) { .op2-grid {1fr} }` puts the chat above the stage on a 1280x800 laptop, so the stage
   panel starts at y=838 and J/K appear to do nothing. Lower the breakpoint to about 1100 (content width at 1280 is ~1000 px, enough
   for a 380 px chat plus a 600 px stage), or narrow the chat column between 1100 and 1366. Also stop the stepper truncating
   to "Not reached …" at 1280: drop the second line for upcoming stages, or use "Upcoming".
2. **Present beat 8 is broken.** The `0` and `floor 0.001` axis labels overprint ("fl0or"). The "Not admitted: frequency cap"
   note has a white box that runs past the panel's right border. The bar chart is ~190 px wide, so the 0.003 bar reads as tiny.
   Give the bids panel more width (a 1fr / 1fr split instead of ~0.6 / 1), hide or offset the "0" label when the floor sits near it,
   and remove the note's background or clip it to the track.
3. **Consistent type scale across Present beats.** The fit loop (`PresentStage.tsx`, the zoom search from 2.3 down to 1.25) picks 1.5x on beat 10 and
   2.3x on beat 3, so body text jumps ~50% between slides and beat 3 looks like inflated UI (30 px card body, giant chips).
   Clamp zoom to a narrow band (for example 1.6 to 1.9), or pick one zoom for all beats, and fill sparse beats with content, not scale.
4. **Present beats 7 and 10 composition.** Beat 7 overfills (1.04, cards 10 px under the header and 7 px above the caption bar):
   drop a line or tighten the gap. Its "What the app signed" panel is half empty: show the truncated receipt hash and signature there.
   Beat 10's left column is ~40% empty under the KPI tiles: add the tamper outcome (one red row: "Change one byte → Mismatch") or
   the /verify URL with the download size. That is the strongest closer the product has.
5. **Inspector in Ledger v2.** `design-system/ledger/client.tsx` InspectorDrawer: radius on the leading edge, shadow instead of the 2 px
   blue rule, "Recomputable on Verify" as a small success tag (not a 20 px underlined display link), and JSON with `white-space: pre`
   plus horizontal scroll so wrapped values don't restart at column 0. Give Evidence ("Exact packet") and Decisions (the active
   card's decision) a `primary` Inspect so `I` never falls back to "Organic answer".
6. **Sync the stage with the hash.** `OpportunityStages.tsx` reads the hash only on mount. Listen to `hashchange` (and push, not
   replace, on J/K if Back should step back) so deep links, Back and in-page `#auction` links work.
7. **LeatherGuard decision history table** (v2 #13, still open). `/advertisers/leatherguard/`: eligibility cells wrap to 4 to 7
   lines ("No: missing crypto storage, mobile software wallet"). Give the table full width (move Creative and Declared
   capabilities below), or show "Excluded" with the reason as a second muted line, and `nowrap` the level cells.
8. **Run activity chart** (v2 #9, still open). Labels are SVG text in viewBox units (10 px at 390, 13 at 1440, 16 at 1920).
   Render the axis and lane labels as HTML positioned over the SVG (fixed 12 to 13 px at every width), fix the overlapping organic markers at 13:38,
   and at < 900 px show a compact list, because today the second segment (all auctions and charges) is scrolled off and the chart looks empty.
9. **Overview Auctions void.** The table panel ends ~90 px above Latest delivery. Add a footer row ("Step through opportunity 1 →")
   or `align-items: start` on both. At 1280, keep "USDC" on the number line in the price tiles (smaller unit, `nowrap`).
10. **Settlement "In order (no clock times)".** Render it as one non-wrapping arrow sequence (Open → Voucher 1 → Voucher 2 →
    Close), not wrapped chips. The ClearVault row currently breaks after two chips.
11. **Small craft and copy.** The "Fictional" chip's hollow square still reads as an unchecked box: use the same tag without the glyph. Write
    "RFID blocking", not "rfid blocking" (LeatherGuard capability chip, Present beat 3). The Delivery stepper value "+25.4 s" needs a
    word ("25.4 s after award"). The tamper "signature does not match" is prose, so set it in body type. Use one name for the label:
    "not an axp.one advertiser" everywhere. The Present 1280 caption is 14.7 px: consider a 26 px base so laptops get ~17 px.
12. **Plumbing.** Add a "Skip to content" link (still missing since v2). De-duplicate the PolySans `@font-face` (one source,
    drop the unused 700 faces). Make sure builders only ever run `NEXT_DIST_DIR=.next-build pnpm build`: today's plain
    build into `.next` took the dev server down for this whole review.

## Protect these

1. **Present's frame and pacing.** The absolute-centred, letterboxed 16:9 stage and the 4:00 autoplay with exact beat timing.
   Beats 2, 6 and 9 at 1920 and 2560 look like a real keynote slide. Don't regress the centring when you tune zoom.
2. **The /verify story.** Truthful scope ("28 hashes, 3 signatures, 17 sums and rules", the key from the same file), "not run yet" idle
   states, and the tamper demo that goes red with "Mismatch" while the main KPI correctly stays 48/48. It is the best proof moment in the product.
3. **Chat plus stage, with the slot that fills at Delivery and the stepper that now withholds the ending.** "Not reached yet",
   then the slot fills at stage 7. Keep it, and make it work at 1280 (fix 1).
4. **Settlement as built**, now with clock-free chain ordering and the fees note. It is still the strongest page.
5. **The calm honesty layer.** Provenance pills, per-list brand labels, "Why the bids are equal", the opp 3 rule callout. All
   specific and quiet. Don't escalate any of it into banners.

## Key shots
`shots/mvp-v3/`: p01-1280, p03-1920 (over-zoom), p04-1920, p06-1280 and p06-2560, p07-1440 (overfill), **p08-1920 (beat 8
collisions)**, p09-1920, p10-1440 (left void), p-390 (phone card), 01-overview-1280, 02-overview-1440-full,
**10-opp1-evidence-1280 (stacked layout)**, 04/05/06/07 opp1 stages at 1440, 08-opp3-auction, 09-opp4-nofill,
11-settlement-1440-full, 12-verify-1440, **17-verify-tampered-1440**, 13-leatherguard-1440-full, 16-inspector-receipt-1440,
m390-opportunity_1_decisions, m390-run-activity.
