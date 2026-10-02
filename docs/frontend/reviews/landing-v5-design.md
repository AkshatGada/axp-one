# Landing v5: design critic review

Version: `axp-landing-v5` (fbde0f1; HEAD 5a3a2d8 has no `apps/marketing` changes since the tag). Method as in
v4: headless system Chrome (playwright-core from chatgpt-pixel-helper) at 1440x900, 1280x800, 1920x1080, 390x844
(mobile UA, touch) and 1440 with reduced motion. Pinned scenes sampled at 25 progress points forward and backward at
each desktop size. Motion strips for the hero pull-back, the dot sort and the closing. A wheel-driven jank run through
Lenis. Screenshots: `docs/frontend/reviews/shots/landing-v5/` (22). Scripts: `docs/frontend/reviews/tools/design/`
(`v5.mjs`, `strip-v5.mjs`, `a11y-v5.mjs`, `rm-v5.mjs`, `fonts-v5.mjs`, `montage-v5.mjs`, `m-v5.mjs`, `pay-v5.mjs`;
raw output in `out/v5/`).

**Environment.** The dev server on :3410 served 200 for the whole review with 0 console errors (the `.next-dev`
split works). Visual review is on dev. LCP and JS are measured on the static export `apps/marketing/out/` (built
02:05, which contains the final v5 CSS such as `.hs{height:156vh}`), served read-only on 127.0.0.1:3411, so those
numbers are production-like. Only localhost was contacted.

## Scores (landing rubric)

| # | Line | v4 | v5 | Delta | Reason |
|---|---|---|---|---|---|
| 1 | First impression | 7.5 | 8.0 | +0.5 | The left column is calmer: the ContextHint line sits directly under the lede as a left-ruled line (no box), with one row of two actions and the Solana status line below. The pull-back is now sequenced: H1 out, then "Behind one Sponsored card" in, with no overlap (shot 02). It is still a conventional split hero. Between 90 and 140 px of scroll, the frame is still one small tilted plate on empty paper, and at 115 to 136 px the lying chat and the incoming stack crossfade with doubled text (shot 03). |
| 2 | 10-second clarity | 8.5 | 9.0 | +0.5 | At 1280x800 the badge and the traction line are above the fold (shot 18). Solana is named in the hero. Jev gets its one-line explanation in the trio. "Why now" is tighter. Only the Solana status line is clipped at the 1280 fold. |
| 3 | Story | 8.0 | 8.5 | +0.5 | 16,841 px at 1440, which is 18.7 screens and meets the under-19 target (v4: 20.9). Proof leads with counts (4 / 15 / 3 / 2) and the money is in one sentence. There is one "What's real, what's illustrative" panel instead of scattered caveats. The chapter ends on an explicit hand-off: "This is what each buying agent sees before it judges a moment." Mobile is 25.2 screens (v4: 30.3). |
| 4 | Stage explanation | 8.0 | 8.5 | +0.5 | The dead gap under short beat titles is gone ("Code sets the price." has its body right under it). Beat 7's paid segment is ultramarine and labelled "Paid 0.007". The Reserved figure is set in Wide. Remaining: the board is width-bound, leaving about 160 px empty above it and 170 px below at 1440, and the small figures are still in Mono with gappy punctuation ("0 . 004", "Deposit 0 . 020"). |
| 5 | ContextHint moat | 8.0 | 8.5 | +0.5 | The dot sort is now a moment. The pin span is 900 px (was 270). Bands settle in order (US, then no country, Australia, South Korea) over about 450 px, then hold (shot 11). The 12-country chart fills every row at 1280 with no collapsed outlines. The funnel narrows (100/64/34, "Not to scale.") and turns from vermillion into ultramarine. The last internal wording is gone, and the wall disclosure sits below the band. Not done: the niche to sub-niche zoom (the dive is now a static composition, `usePinned() && false`). The wall's stats panel is a hard-bordered box over tilted cards. The library numbers (66 px) are smaller than the traction figure (130 px). |
| 6 | Proof | 8.0 | 8.5 | +0.5 | A four-count row in Wide, a quiet money sentence, "Verify the receipts yourself: 48 checks run in your browser", a run sheet beside the video poster, and a clean three-column real/illustrative/not-shown panel. Remaining: the run-sheet bids are in gappy Mono, there are three boxed chips in the run-sheet header, and the section is 3 screens long. |
| 7 | Motion craft | 7.5 | 8.0 | +0.5 | The dot sort, the closing cut (no translucent chat, shot 17) and the sequenced hero headline all landed. Pins are top 0 at every sample, and the 7 beats reverse cleanly. Wheel scroll: p99 16.8 ms, 0 frames over 50 ms. New or remaining: the 20 px hero crossfade ghost. The payments meter finishes its close only when the meter reaches the top of the viewport, so at reading position the "Paid 0.007" label is mid-crossfade on hatch and illegible (shot 08). The Library Dive lost all motion. |
| 8 | Type and spacing | 7.5 | 8.0 | +0.5 | Display and stat figures are now PolySans Wide or Neutral ("0.010" no longer reads "0 . 010"). There is no faux bold (0 elements at weight 600 or more). The moat line is set as explicit rows, so "A" no longer dangles. Funnel units sit on their own line. Remaining: 8 stale duplicate `@font-face` rules; Mono in small figures with gappy punctuation (stage board, run sheet, meter, plates); about 350 px of dead space between "Why now" and the shutter, with the opener's right 55% empty (shot 05); an orphan "0.003." in the payoff card. |
| 9 | Mobile (390) | 7.5 | 7.5 | 0 | Shorter (21,289 px, 25.2 screens), no page overflow, beat cards, and static dots, chart and funnel. Two new visible defects: the payments meter stays in its "accepted" state at reading position, and its "Voucher 1" / "Voucher 2" labels overprint (shot 20). The closing is 1,258 px tall, with about 500 px of empty ultramarine and a half-collapsed stack whose chat header is washed out (shot 21). |
| 10 | Performance and polish | 8.0 | 8.5 | +0.5 | LCP 64 to 88 ms (static). CLS at most 0.0049. First-load JS 132.8 KB gzip. 0 console errors, 0 failed requests, 0 off-origin requests. Labs, /design and /poster are excluded from the export. No model, policy, hash or ID strings are in `index.html` or `index.txt`. Contrast failures went from 12 styles to 1 (the 11 px "Ad" tag on wall cards, 2.94:1). The stale font rules remain. |

**Average: 8.30** (v4 7.85, +0.45). Line 2 is at 9.0. Lines 3, 4, 5, 6 and 10 now sit at the 8.5 exit bar. Lines 1, 7
and 8 are at 8.0, and mobile is at 7.5.

## Did the v4 fixes land?

| v4 fix | Status |
|---|---|
| 1 Dot sort a moment; chart rows earlier | **Landed.** The span is 900 px at 1440 (200vh pin, short of the suggested 230vh but enough). The sort runs over about 0.1 to 0.6, holds, and bands label as they land. Labels fade rather than count up. All 12 chart rows are visible at 1280, and no outline collapses. |
| 2 Vermillion contrast | **Landed.** `--contexthint-ink` is used for small text, and the Visit button is a dark-vermillion fill. One failure is left, outside the token: the wall's 11 px "Ad" tag. |
| 3 No Mono for display figures; no faux bold | **Landed for display** (`.pr-count-n`, `.pay-n`, `.sc-big`, `.fn-value`, `.ch-wall-n` are Wide; the legend and chart are Neutral). Small Mono figures remain (fix 6). |
| 4 Funnel units and shape | **Landed.** |
| 5 Hero pull-back | **Mostly.** No headline overlap, and the explode starts at 0.25. A short crossfade ghost and two sparse frames remain (fix 4). |
| 6 Badge above the fold; less clutter | **Landed.** "Skip to the proof" is gone. The badge is a left-ruled line, not a box. |
| 7 Internal wording | **Landed.** The footer reads "library data as of September 26, 2026; traction and Fresh Ads, October 2026." |
| 8 Closing without the translucent chat | **Landed** on desktop (a hard cut). On mobile the closing has its own problem (fix 2). |
| 9 Niche to sub-niche; legible chain start | **Partial.** The chain is fully legible, but only because the dive is now unpinned and static. The sub-niche zoom is still not built. |
| 10 Money lanes say something; beat 7 paid | **Landed** (fee ticks plus dashed waits; "Paid 0.007" on ultramarine). The payments meter has a new timing problem (fix 1). |
| 11 Stage copy rhythm; board growth | **Gap landed.** The board did not visibly grow (maxH 84vh, but the board is width-bound). |
| 12 Rags and cleanup | **Mostly.** The moat rows and "A transaction per ad" landed. Mobile is about 25 screens. The 8 stale `@font-face` rules are **not** removed. |

Owner rules (design view): no IDs, hashes, policy names or model versions appear on the page or in the shipped
payload. contexthint.com is linked 6 times (hero, trio, chapter text link, Visit action, closing, footer), all
`_blank noopener noreferrer`. Jev stays modest (trio line, beat 4, plate, footer). Solana is named in the hero,
trio, payments, beat 7, the plate and Proof. The one small-chip cluster left is in the run-sheet header (fix 12).

## Hard benchmarks (measured)

| Benchmark | Result | Status |
|---|---|---|
| Console errors | 0 on `/` at all 4 sizes, `/design/` (dev), `?film=1&from=close`, `?still=1`. The dev server stayed up the whole time. | pass |
| Failed / off-origin requests | 0 / 0 (`/design/` 404s on the export by design) | pass |
| Horizontal overflow at 390 | scrollWidth 390. Only ad-wall internals pass the edge, clipped by their parent. | pass |
| Fonts | 7 PolySans faces `loaded`. 8 stale duplicate faces `unloaded`. No weight-700 text, so no faux bold. | pass, cleanup open |
| LCP (static) | 88 ms (1440), 64 (1280), 64 (1920), 88 (390); element = H1. Dev: 264 to 448 ms. | pass |
| CLS | 0.0000 (1440, static), 0.0049 (1280, `.sc-fit`), 0.0000 (1920), 0.0000 (390) | pass |
| First-load JS gzip | 132.8 KB (+ 39.4 KB polyfills, nomodule). HTML 281 KB raw, 36.3 KB gzip. | pass (<= 170) |
| Contrast | 1 style below AA: `.gpt-tag` "Ad", 11 px, 2.94:1 (wall cards) | near pass |
| a11y basics | 1 H1, 0 heading skips, 96 images all with alt, 0 unnamed links or buttons, `lang=en` | pass |
| Ship hygiene | the export has no `/design`, `/poster`, `/metal-lab` or `/color-lab`. 0 matches for `fit_intent`, `jev-1.`, `gpt-6`, `ads:mapping`, `ads:hint` or `lamport` in `index.html` / `index.txt` / page chunks. MVP links use `/mvp/` in production (localhost:3420 only in dev). | pass |
| Pins (sticky top 0) | hero 448 / 504 / 605 px span (1280 / 1440 / 1920; v4 810 at 1440), stage 1304 / 1467 / 1760 (v4 2097), dots 800 / 900 / 1080 (v4 270), dive unpinned. Top 0 at every sample. | pass |
| Stage beats | 7 beats advance in order and reverse 7 to 1 at all 3 sizes | pass |
| Dot-sort pacing | about 450 px of motion, then a hold of about 300 px (was about 160 px in total) | **pass** (was fail) |
| Jank | real wheel through Lenis at 1440: 798 frames, p50 16.7, p95 16.8, p99 16.8 ms, 0 over 50 ms | pass |
| Reduced motion | `data-px-motion=off`, 0 hidden reveals, every scene a complete still (the meter at its closed state), 15,867 px | pass |
| Page height | 16,841 (1440, 18.7 screens), 15,783 (1280, 19.7), 18,397 (1920, 17.0), 21,289 (390, 25.2) | desktop pass; mobile long |
| Text under 12 px | only the 11 px tags ("Separate from the answer", "Won", "Ad") | pass |

## Ranked fixes for v6 (most impactful first)

1. **Payments meter: finish where people read it** (`specimens/ChannelMeter.tsx`, the Payments band's progress
   mapping in `app/page.tsx`). The close (`seg(t, .86, .96)`) only completes when the meter is about 50 px from the
   top of the viewport. With the meter centred, "Paid 0.007" is white text on the hatched segment, mid-crossfade, and
   unreadable (shot 08). Map progress so the close is done by the time the meter's centre reaches about 60% of the
   viewport, and hold it. On mobile and below 900 px, render `t = 1` (it currently sits in "accepted").
   At 390, "Voucher 1" and "Voucher 2" overprint (shot 20): stack them, or hide the first label when the
   gap is under about 80 px.
2. **Mobile closing** (`scenes/ClosingStack.tsx`, `.cs` under 900 px). The section is 1,258 px tall: the actions, then
   about 500 px of empty ultramarine, then a half-collapsed stack whose chat header text is white on paper (shot 21).
   Below 900 px, skip the collapse and show the final chat directly under the actions. Target about 700 px.
3. **Niche to sub-niche, or own the still** (`scenes/LibraryDive.tsx`, `specimens/NicheField.tsx`). The owner's
   choreography step 3 is still missing, and v5 removed the dive's motion (`usePinned() && false`), so the chapter
   now has one motion moment (dots) and then three static blocks. Either build the zoom (the vermillion niche scales
   up and splits into its sub-niche grid, then hands to the chain), or delete the dead pin path and give the static
   field a deliberate focus (the vermillion niche with its sub-niche count beside it).
4. **Hero pull-back: cut, don't crossfade, and fill the frame** (`scenes/HeroScene.tsx`). At v 0.23 to 0.27 (115 to
   136 px at 1440) the lying chat (opacity `1 - seg(.24,.27)`) and the stack (`seg(.23,.26)`) are both visible with
   misregistered text (shot 03). Swap them on one threshold, as the closing does. From 90 to 140 px the frame is still
   one small plate in a mostly empty field: raise `BIG` to about 1.6, or start `explode` at 0.2.
5. **Wall stats panel and number hierarchy** (`chapter/ContextHintChapter.tsx` `.ch-wall-stats`, `chapter.css`).
   The stats sit in a hard 1 px bordered paper box over the tilted cards. It clips an ad and leaves a peach sliver on
   its right edge (shot 10). Use a solid paper column on the band's left edge, or a borderless plate with a soft
   shadow. Set 11,730 / 45,947 at least as large as the 1,000+ figure: the owner wanted the library numbers "as big
   as the hero type", and right now the traction figure (130 px) outranks them (66 px).
6. **Retire Mono for small figures on the landing** (`.px-num` across `Switchboard`, `RunSheet`, `ChannelMeter`,
   `PlateStack`). "0 . 004", "Deposit 0 . 020 USDC" and the run-sheet bids still read with full-cell periods. Use
   PolySans Neutral with `tabular-nums`. The landing has no hashes left, so nothing needs Mono.
7. **"Why now" dead space** (`app/page.tsx` Why, `site.css` `#why`). About 350 px of empty paper sits between the three
   columns and the shutter, and the opener's right 55% is empty (shot 05). Cut the section's bottom padding before
   `.ss-shutter`, or set the question beside the three columns.
8. **Last contrast failure** (`chapter/AdWall` `.gpt-tag`). The 11 px "Ad" tag is 2.94:1. Darken it (about `#6b6b6b`
   on white), or mark the wall decorative (`aria-hidden` on the track; the band already has a text label). This is the
   only thing between the page and a Lighthouse a11y 100.
9. **Delete the 8 stale `@font-face` rules** (PolySans 400/500/700, Wide 300/400/500, Mono 400/500 from the
   design-system faces superseded by `/fonts`). This was carried from v4.
10. **Stage board fill** (`StageScene.tsx`, `.ss-grid`). At 1440x900 the board is width-bound, leaving about 160 px
    above and 170 px below. Narrow the copy column (about 360 px) or let the board size by height, so the 84vh `maxH`
    actually applies.
11. **Hero edges** (`app/page.tsx` hero, `site.css`). At 1280x800 the Solana status line is cut by the fold (y about
    795). Fold it into the badge block, or trim the lede-to-badge gap. At 1920 the chat card sits about 140 px below
    the H1 cap line, with about 220 px of dead middle. Top-align the chat with the H1.
12. **Small cleanup.** The payoff card's first column ends on an orphan "0.003.": rebalance its widths. The three
    boxed chips in the run-sheet header ("Hosted Solana sandbox", "Test USDC", "Recorded replay") are the last chip
    cluster on a page the owner wants chip-free: make them one plain line.

## Already excellent: protect these

1. **The dot sort and its end state.** It is now a real scroll moment (bands land in order, then hold) and is the
   best data image on the page (shots 11, 12). Do not shorten the pin again.
2. **The ContextHint data trio below the dots.** The 12-country chart with hit rates, the "Not to scale"
   funnel turning vermillion into ultramarine, and the moat triplet set as explicit rows with "ContextHint already
   collects it." in vermillion, then the ultramarine hand-off line.
3. **The stage engine and the board.** Sticky top 0 everywhere, 7 beats that reverse cleanly, a 16.8 ms p99, beat
   titles anchored to their bodies, and beat 7's labelled ultramarine "Paid 0.007".
4. **Proof's new shape.** Counts first, one money sentence, the verify line, and the three-column real / illustrative
   / not-shown panel. This is the honest, quiet sourcing the owner asked for, in one place.
5. **The ultramarine identity and the closing cut.** The rule wall, the closing that rhymes with the hero with no
   translucent chat, and the `axp.one` wordmark with its square dot.
