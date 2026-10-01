# MVP v4 design review (tag axp-mvp-v4, 30d3864)

Critic: design. Read-only, headless system Chrome (playwright-core), localhost only. I did not open explorer.solana.com;
I only checked the link hrefs. Viewports: 1280x800, 1440x900, 1920x1080, 2560x1440 (Present), 390x844 (mobile emulation). Light only.
Tools: `tools/mvp-design/capture-v4.mjs` (modes bench, shots, shots2, present, auto, keys, verify, mobile, devnet). Raw data:
`tools/mvp-design/out/v4/` (bench.json = dev :3420, bench-static.json = static export, present.json, verify.txt) and
`out/v4-auto1440.log`. Shots: `shots/mvp-v4/` (26).

**Environment.** This time the dev server on :3420 was healthy for the whole session (it now builds into `.next-dev`). I did
not restart it. Dev mode ships unminified JS (~9.8 MB), so I took the perf numbers (LCP, first-load JS) from a snapshot of
`apps/product-ui/out/`. That export was built at 03:01:16, 10 s after the last product-ui commit (d710005), and I served
the copy from 127.0.0.1:3421. Its strings match HEAD ("A rule kept a bidder out", the Devnet section, "Upcoming").

## Verdict

v4 is the first round where every v3 structural complaint is closed:
- **The 1280 laptop layout works.** Chat and stage sit side by side, with a sticky stepper and "Upcoming" labels.
- **Present beat 8 is fixed** and the scale band is steady (1.65 to 1.9).
- **The Inspector is restyled.** Every stage has its own `I` record.
- **Hash, Back and the skip link work.**
- **The new Devnet material is careful and well separated.** Settlement gives it a separate section with its own numbers.
  Verify has a 7-check group. Overview and Present each mention it in one line. All 20 explorer links on the site are
  `?cluster=devnet`.
- **The tamper flow now changes a headline** ("Tampered copy: 46 of 48"), and Present beat 10 uses it as its closer.

What keeps it below 9.5:
- **Present has new composition problems.** Beats 5 to 7 are under-filled (0.82 to 0.84). Beat 11 repeats beat 1's three
  cards and says the claim three times.
- **Craft collisions recur.** The voucher-chart value labels sit on the dashed cap line on Settlement, the Charge stage and
  Present beat 9. The Verify tamper banner floats over table cells. A lamports KPI wraps its unit.
- **Settlement is now 4,220 px long.** The Devnet section mirrors the sandbox section block for block.

**Average: 9.05 / 10** (v3: 8.55, +0.50)

## Scores (MVP rubric)

| # | Line | v3 | v4 | Δ | Why |
|---|---|---|---|---|---|
| 1 | Cold orientation | 8.5 | 9.0 | +0.5 | The title is now a product sentence ("One recorded run of an ad exchange inside an AI app"). The first screen at 1280 shows the real chat, the app's own answer and the Sponsored card beside the KPI tiles. "Where a rule kept an agent out: opportunity 3" points a newcomer at the interesting moment. The run label is plain ("Recorded run, Oct 1"). A "Why Solana" panel sits next to Auctions. Still: the lede is about 50 words over 3 lines. The header scope chip "Hosted Solana sandbox + Solana Devnet re-settlement" is the longest and most jargon-heavy element in the chrome, and it uses a "+". The Auctions panel void is back (~110 px of empty table body above "Step through opportunity 1 →", because Why Solana is now taller). |
| 2 | Opportunity screen | 8.0 | 9.0 | +1.0 | At 1280x800 the layout keeps two columns: the stage starts at y=325 and J/K visibly move it. The stepper is sticky (`top: 52px`), later stages read "Upcoming", the stage follows the hash (J J, then Back, lands on Eligibility; setting `#receipt` jumps), and stage 9 offers "Next: Opportunity 2 →". Opp 4 still collapses cleanly to three steps. Remaining: the Delivery step value truncates to "25.4 s after aw…" at 1280 and 1440. At 1280 the Auction stage's Winner, Price and Rule row starts at y=700, and "Why the bids are equal" is below the fold. The decision ScoreRuler is still ~190 px wide, and its two markers nearly touch. |
| 3 | Honesty made visible | 9.5 | 9.5 | 0 | All A and B truth items are present in the rendered copy. "A rule kept a bidder out" with "no bid, no amount". "One observation per arm; not a measured lift" appears on the explorer and in Present. The tie rule is "fixed in the exchange code before the run". The fees note says 43% reclaimed, in test SOL, with no SOL-to-USDC comparison. VerseOdin is gone from visible copy (0 matches). Devnet is handled scrupulously: "Hosted Solana sandbox, not devnet or mainnet", "the numbers are never merged", and "these checks read the file, not a chain; the explorer links do". New nits: (a) Verify's headline is 48/48 and the nav says "48 checks", but the page shows 55 check rows. The 7 Devnet checks are never mentioned near the headline. (b) "46 of 46 build checks passed" (public file panel) sits on the same page as the tamper state "46 of 48". Same number, different meaning. (c) Internal IDs "v3-clearvault > v3-keyforge" still show in the Verify tie-rule row. |
| 4 | Decisions and auction | 8.5 | 9.0 | +0.5 | The opp 3 stage now tells the truth and reads well: a "Not admitted: frequency cap" bar lane, "Only bidder", and the amber "A rule kept a bidder out" callout. Opp 1 says "relevance 3, intent 3" instead of "Levels 3:3". The bid table's selected cell matches the lane. The decision ScoreRuler is still narrow (see 2). |
| 5 | Settlement | 9.0 | 9.0 | 0 | The order row is now a single arrow sequence (Open 0.020 locked → Voucher 1 → Voucher 2 → Close), so the v3 fix landed. The fees note is honest. The Devnet section is rigorous: per-channel receipt → charge → voucher rows, a "Superseded, off-chain" / "Settled on-chain" tag, devnet-only Explorer links, a funding panel, and a "How this differs" footer. Deductions: the page is now ~4,220 px at 1440, and the Devnet section repeats the sandbox section's KPI row (0.040 / 0.010 / 0.030), so the second half reads as déjà vu. The Devnet KPI "8,406,760 lamports" wraps its unit onto its own line, unlike every other tile, and the row heights are uneven. The rent cell "+1,488,440 / -1,488,440" is cryptic. The voucher chart's "0.004" and "0.003" labels sit on the dashed 0.008 cap line, which strikes through them. |
| 6 | Present mode | 8.0 | 8.5 | +0.5 | 11 beats, autoplay exact at 1440x900 (beats at 0, 14.4, 29.5, 51.5, 73.5, 98.6, 123.6, 148.6, 170.6, 200.5, 225.5 s; ends ~240 s and drops to manual; 0 errors). The frame is centred and inside the viewport at all 4 sizes. Zoom stays in 1.65 to 1.9, down from v3's 1.5 to 2.3, so type is steady. Beat 8 is fixed (labels clear, wider chart). Beat 10 is now the best slide in the deck: 48/48 Passing next to a red "Change one byte of a receipt, 46 of 48" with two Mismatch rows. Beat 9 "Why Solana: paid once per channel" lands the payment-channel argument with a "Re-settled on Solana Devnet, 5 transactions" tile. Deductions: beats 5, 6 and 7 fill only 0.84 / 0.83 / 0.82 (zoom capped at 1.9, ~70 px bands top and bottom at 1920). In beat 5, "ClearVault, opportunity 2" wraps to 2 lines, so its chip is out of line with its siblings. Beat 11 repeats beat 1's three Disclosed / Decided in code / Paid on delivery cards: the claim appears as a headline, again as cards and again as the caption, and the right ~45% above the cards is empty. Beat 1 (the "problem" opener) already shows the three solution cards, so the ending is given away in the first 15 s. Beat 9 has the same cap-line label collision. The digit keys reach only beats 1 to 10. The timer at the end reads "3:46" (elapsed at beat start), not 4:00. |
| 7 | Verify | 9.0 | 9.0 | 0 | 48/48 including Ed25519, plus a 7-of-7 Devnet group with hashes in mono and readable labels. The tamper flow now moves headlines: "Original file: 48 of 48" → "Tampered copy: 46 of 48" in the panel, plus a page banner ("The served file is unchanged: 48 of 48"). Reset restores everything, and the main KPI correctly stays 48/48. The tamper panel moved up beside the KPI row, which is right. Deductions: the floating banner (bottom-right, ~520x90) covers the "Recorded in the file" and "Computed" cells of opportunities 3 and 4 in the table under it. The Devnet group shows raw base units ("20000", "7000") with no unit or separators, while the rest of the product says "0.020 USDC". Its explorer links come two panel rows later, after "What this proves / does not prove". "devnet" is lowercase in the row labels but "Devnet" everywhere else. Load CLS is still 0.014 (group tags), unchanged since v3. |
| 8 | Visual craft | 8.0 | 8.5 | +0.5 | The Inspector is in v2 style: rounded leading edge, shadow, no 2 px rule, mono path, `pre` JSON. The LeatherGuard table is fixed: "Excluded" with the reason as a muted second line, and no 4-to-7-line cells. Run activity is HTML with fixed 13 px labels, the clustered organic markers show "2", and the chart becomes a list at 390. "RFID blocking" is capitalized. Present beat 8 is clean. Remaining: the cap-line label collisions (3 places), the lamports KPI wrap, the Auctions void, the tamper banner overlap, lowercase capability chips ("physical wallet", "ethereum, solana" in Present beat 3 and the opp 4 chips), and Inspector JSON that clips long IDs at the right edge with no visible scroll affordance. |
| 9 | Navigation | 8.5 | 9.5 | +1.0 | The skip link is the first Tab stop, and the focus ring (2 px accent) shows on every stop. `I` opens the stage's own record on all 7 stages tested, including Evidence ("Exact packet sent: ClearVault, with history") and Decisions. The stage follows the hash, Back steps back, and deep links work. The stepper is sticky. Stage 9 offers the next opportunity. Present keys all work (→, Shift+→ clamps at 11, ←, digits, R, ?). Nit: there is no digit for beat 11. |
| 10 | Robustness | 8.5 | 9.5 | +1.0 | 0 console errors, 0 failed requests and 0 off-origin requests on 19 route variants at 1440, 1280 and 390, on both dev and the static export. No horizontal overflow at 390 or 1280. CLS < 0.02 everywhere (max /verify 0.014). First-load JS is 150 to 159 KB gz. LCP is 36 to 72 ms (static). Present works at every viewport and shows the phone card at 390. All Devnet explorer hrefs are `cluster=devnet` (Overview 2, Settlement 10, Verify 8; 0 non-devnet Solana links). The dev server stayed up all session. |

## Did the v3 fixes land? (mvp-v3-fixes.md)

| Fix | Status |
|---|---|
| A1 "A rule kept a bidder out" | **Landed** (Overview, opp 3 callout, Present beat 8; 0 "changed the winner"). |
| A2 Research comparison scoped to opps 1 to 3 | **Landed** (string absent from opp 4). |
| A3 Fees callout (43%, test SOL, no SOL-to-USDC comparison) | **Landed** ("Network fees and rent, paid in test SOL", "(43%)"). |
| A4 Passing needs exactly 48 | **Landed per the progress note.** Not independently mutation-tested here; the visible states behave. |
| A5 "One observation per arm" | **Landed** (decision notes, Present beat 5, tie explainer). |
| B6 "fixed in the exchange code" | **Landed.** |
| B7 Values from the fetched file, "Not run yet" | **Landed** (the columns read "Recorded in the copy / Computed now"). |
| B8 No VerseOdin | **Landed** (0 visible matches). |
| B9 Jev glossary | **Landed** ("rounds them to levels"). |
| B10 "conversion field" | **Landed** ("model output fields the demo does not use"). |
| B11 Present video line | **Landed** (beat 7 caption). |
| B12 Why Solana | **Landed**: Overview panel with an Open → Voucher → Close mini-sequence, and Present beat 9. |
| B13 Problem opener, ends on the claim, ~4:00 | **Landed, with a composition issue.** Total 240 s, limits on beat 10. The opener already shows the claim cards (see Present). |
| B14 Tamper headline and banner | **Landed.** The banner overlaps table content. |
| B15 Product sentence and chat in the first screen | **Landed.** |
| B16 Jargon cut | **Mostly landed.** "Levels 3:2" and "vector guard" are gone. "arm" remains, deliberately, in "One observation per arm". |
| B17 owned-travel-app footnote | **Landed** (the id stays inside the signed JSON as decided). |
| B18 Stepper ends, sticky, Recomputable link | **Landed.** |
| C19 1280 layout | **Landed.** The stepper no longer says "Not reached …", but "25.4 s after aw…" still truncates. |
| C20 Present beat 8 | **Landed.** |
| C21 Zoom band | **Landed** (1.65 to 1.9; median body 20 to 28 px at 1920). |
| C22 Beats 7 and 10 | **Beat 10 landed strongly. Beat 7 traded overfill for underfill** (0.82; the middle card is half height). |
| C23 Inspector v2, own records, hash sync | **Landed.** |
| C24 Carry-overs | LeatherGuard table **landed**. Run activity **landed**. Skip link **landed**. Settlement order row **landed**. PolySans dedupe **landed** (one `polySans` family, 8 distinct woff2 files, no repeated hash; adfc11ac downloads once). Auctions gap **regressed** (fixed, then reopened by the taller Why Solana panel). |
| Rejected: merit-auction story, receipt publisher-id rewrite | Correctly not done. |

## Benchmarks (measured)

| Benchmark | Target | Result |
|---|---|---|
| Console errors / failed / off-origin (19 routes; 1440, 1280, 390; dev and static) | 0 | **0 / 0 / 0** pass |
| Horizontal overflow at 390 and 1280 | none | **none** (scrollWidth = viewport on every route) pass |
| Fonts | PolySans, no fallback | polySans 400/500/700, Wide 400/500, Mono 400/500 loaded, 0 failed, no duplicate file download. pass |
| LCP (static export, desktop) | < 2.0 s | 36 to 72 ms on every route. pass |
| CLS | < 0.02 | **pass**: /verify 0.014 (1280: 0.0095), /design 0.005, everything else 0.000 |
| First-load JS (gz, static) | ≤ 200 KB | / 157, /verify 159, /present 158, /settlement 150 KB. pass |
| Lighthouse | ≥85 / ≥95 | not run (not installed; not downloaded) |
| /verify | 48/48 incl. Ed25519 | **48/48** (28 hash, 3 signature, 17 sum and rule) + Devnet **7 of 7**. pass |
| Tamper demo | red, headline, reset | Nonce `…a97a`→`…a97b`. Receipt hash `48be239f30…` Mismatch, Ed25519 "signature does not match" Mismatch. Panel "Tampered copy: 46 of 48", page banner, button disabled. Main KPI stays 48/48. Reset → "Original file: 48 of 48". pass |
| Devnet links | devnet only | 20 explorer hrefs (2 + 10 + 8), all `explorer.solana.com/...?cluster=devnet`, 0 others. Not visited. pass |
| Present autoplay | 11 beats, 3:45 to 4:15 | 1440x900: 11 transitions as listed above, ~240 s total, ends in manual, frame inside throughout, 0 errors. pass |
| Present fit, per viewport | centred, uncropped | 1280 s=.667 frame (0,40)-(1280,760); 1440 s=.75; 1920 exact; 2560 s=1.333. All centred and inside, 0 clipped elements. Caption 14.7 / 16.5 / 22 / 29.3 px. pass |
| Present fill (content / stage height) | ~0.9+ | b1 .92, b2 .99, b3 .98, b4 .98, **b5 .84, b6 .83, b7 .82**, b8 1.00, b9 .98, b10 .99, b11 .95. Zoom 1.9 1.8 1.75 1.75 1.9 1.9 1.9 1.9 1.65 1.9 1.9 |
| Present at 390 | not blank | "Present mode is designed for a laptop or larger screen" card. pass |
| Keyboard | J/K, I, Back, skip, Present | All pass. The skip link is the first Tab stop. Back follows the hash. Digits cannot reach beat 11. |
| Copy: dashes / middots | 0 in UI copy | 0 on product routes, except the verbatim organic answers on opps 2 to 4 (one em dash each, recorded output). The Inspector path keeps a middot in mono. pass |

## Ranked fixes for v5 (impact first)

1. **Present beginning and end say the same thing.**
   - Beat 1 should show the problem only: the big line plus one picture of an AI answer with no disclosure (or an empty
     Sponsored slot). Don't show the three solution cards.
   - Beat 11 should be the only place the three claims appear. Each card should carry its proof number from the run:
     "3 of 3 cards labelled Sponsored", "15 decisions, every price from the bid table", "3 signed receipts → 0.010 USDC,
     2 channels, 48/48 checks". Fill the empty right half, or set the headline full width at a size that ends on the
     card row.
   - Don't repeat the claim in the caption. Use a closing line instead, for example "Open Verify and check it yourself".
2. **Under-filled Present beats 5, 6, 7 (fill 0.82 to 0.84).** The zoom is capped at 1.9, so use content, not scale.
   - Beat 5: shorten "ClearVault, opportunity 2" to "ClearVault, opp 2" (or "Opportunity 2") so all three titles take
     one line.
   - Beat 6: add the "Why the bids are equal" one-liner.
   - Beat 7: put the receipt hash and signature in the middle card (it is half height), or make the Sponsored card plus
     "What the app signed" row taller. Aim for 0.92 to 0.98 like the other beats.
3. **Voucher chart label collisions** (Settlement both channels, opp 1 Charge stage, Present beat 9). The "0.004" and
   "0.003" value labels sit on the dashed 0.008 cap line, and "0.007" touches it. Place value labels below the step when
   they are within ~12 px of the cap line, or give them a background knockout matching the panel.
4. **Verify tamper banner overlaps content.** The fixed bottom-right banner covers table cells (opps 3 and 4 hash
   columns). Make it a sticky bar under the top chrome, or reserve bottom padding on `main` while it is visible. It
   must not sit over data.
5. **Verify Devnet group legibility.**
   - Show the money as "0.020 USDC" / "0.007 USDC" (or say "base units" in the group subtitle, as the sum groups do).
   - Write "Devnet" with a capital D in the row labels.
   - Move "Check the Devnet re-settlement on chain yourself" (the explorer links) directly under the group, not after
     the proves / doesn't-prove panels.
   - Add "plus 7 Devnet checks, 7/7" under the 48/48 headline, and in the nav count, so 55 visible rows and "48 checks"
     don't contradict each other.
6. **Settlement length and repetition (~4,220 px).** Collapse the Devnet section's KPI row into one summary line
   ("Same amounts as above: 0.040 deposited, 0.010 paid, 0.030 refunded; 5 Devnet transactions, 8,406,760 lamports"),
   since the duplicate tiles add nothing. Optionally let the per-channel Devnet cards start collapsed, with the
   receipt → charge → voucher rows and Explorer links visible. Fix the lamports KPI so the unit stays on the number line
   like the others. Explain the "+1,488,440 / -1,488,440" rent cell in words ("1,488,440 created and reclaimed at
   close").
7. **Overview Auctions void (regressed).** The table body has ~110 px of empty space because Why Solana is taller. Use
   `align-items: start` and move the footer link into the panel flow, or shorten Why Solana (its Open/Voucher/Close list
   can drop the Devnet sentence, which the header chip and Settlement already carry).
8. **Stepper truncation and the 1280 Auction fold.** "25.4 s after aw…" truncates at 1280 and 1440. Use "+25.4 s" with
   a tooltip, or "25.4 s later". On the 1280 Auction stage, put the Winner / Price / Rule summary above the bars, or
   shrink the bid-table cells, so the result is above the fold.
9. **Shorter header scope chip.** "Hosted Solana sandbox + Solana Devnet re-settlement" is the longest chrome element
   and the "+" reads as a code token. Use "Solana sandbox, re-settled on Devnet". Lowercase capability chips: write
   "Ethereum", "Solana", "Physical wallet", "Crypto storage" (Present beat 3, opp 4 Must have / Nice to have,
   LeatherGuard declared capabilities).
10. **Small Present and Inspector nits.**
    - Bind a key for beat 11, for example `-`, or make `0` mean the last beat.
    - Let the timer read 4:00 on the last beat's end.
    - Inspector JSON clips long IDs at the right edge: show a horizontal scrollbar or fade-edge affordance.
    - Verify's tie-rule row still prints "v3-clearvault > v3-keyforge": show "ClearVault's ID sorts before KeyForge's".
    - Rename "46 of 46 build checks" to "every build check passed (46)" so it doesn't echo the tamper "46 of 48".

## Protect these

1. **Present beat 10** (48/48 Passing beside the red "46 of 48" tamper card) and **beat 9** ("Why Solana: paid once per
   channel" with the Devnet tile). Together they are the strongest close the product has had.
2. **The 1280 opportunity layout**: chat plus stage side by side, sticky stepper, "Upcoming", hash-synced stages,
   "Next: Opportunity n". Don't let any future breakpoint stack it above 1100 px.
3. **The Devnet honesty pattern**: a separate section with separate numbers, "does not query the chain; the explorer
   links do", devnet-only hrefs, and "not devnet or mainnet" on the sandbox. Tighten the layout (fix 6) but keep the
   wording and the separation.
4. **The /verify tamper story**: copy-only tamper, headline flip, main KPI unchanged, clean reset. Move the banner
   (fix 4), but keep the behaviour.
5. **Present's frame, the 1.65 to 1.9 scale band and the 4:00 pacing.** Fill sparse beats with content, never by
   widening the band.
6. **The calm honesty layer**: provenance pills, "One observation per arm", "A rule kept a bidder out… no bid, no
   amount". All specific and quiet.

## Key shots
`shots/mvp-v4/`:
- **Overview:** 01-overview-1280 (first screen), 02-overview-1440-full (Auctions void, Why Solana).
- **Opportunity:** **03-opp1-evidence-1280 (layout fixed)**, 04-opp1-decisions-1440, 05-opp1-auction-1280 (result at the
  fold), 06-opp1-charge-1440 (stepper truncation, cap-line label), 07-opp3-auction-1440, 08-opp4-nofill-1440.
- **Settlement:** 09-settlement-1440-full (length), 10-settlement-devnet-1440 (lamports wrap).
- **Verify:** 11-verify-1440, 12-verify-devnet-1440 (raw base units), **18-verify-tampered-banner-1440 (banner over
  table)**.
- **Other explorer pages:** 13-leatherguard-1440-full (table fixed), 16-inspector-auction-1440.
- **Present:** p01-1920 (opener shows the claim cards), p03-1920, p05-1920 (under-fill, wrapped title), p07-1280
  (under-fill), p08-1920 (fixed), p09-1920 and p09-2560 (Why Solana, label collision), **p10-1920 (tamper
  closer)**, p11-1920 (repeated claim, right void), p-390 (phone card).
- **Mobile:** m390-overview.
