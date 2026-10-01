# Landing v4: design critic review

Version: `axp-landing-v4` (3fe09a2). Method: headless Chrome (playwright-core from chatgpt-pixel-helper, system
Chrome) at 1440x900, 1280x800, 1920x1080, 390x844 (mobile UA, touch) and 1440 with reduced motion. Five pinned scenes
sampled at 25 progress points forward and backward at each desktop size. Motion strips for the hero pull-back, the
shutter and the closing. Screenshots: `docs/frontend/reviews/shots/landing-v4/` (22). Scripts:
`docs/frontend/reviews/tools/design/` (`v4.mjs`, `strip-v4.mjs`, `zoom-v4.mjs`, `rm-v4.mjs`, `a11y-v4.mjs`,
`fonts-v4.mjs`, `montage-v4.mjs`; raw output in `out/v4/`).

**Environment note.** The dev server on :3410 returned HTTP 500 on every route for part of this review (`Cannot
find module './707.js'` from `apps/marketing/.next/server/webpack-runtime.js`). That is the known polluted-`.next`
failure. I did not restart it; by the end of the review it was serving 200 again. If it recurs, the fix is: stop dev,
`rm -rf apps/marketing/.next`, restart. One clean 1440 pass on dev completed first (0 console errors). Everything else was
measured on the static export `apps/marketing/out/` (built 01:12, contains the v4 polish CSS, and `apps/marketing` is
unchanged since the tag), served read-only on 127.0.0.1:3411. That is closer to production, so the LCP and JS figures
are production-like.

## Scores (landing rubric)

| # | Line | v3 | v4 | Delta | Reason |
|---|---|---|---|---|---|
| 1 | First impression | 7.5 | 7.5 | 0 | The explode is now legible and gutter-aligned, which is the real signature. The frame at load is still a conventional split hero, and the left column is busier than v3: three actions plus a boxed vermillion badge plus a footnote. The boxed badge reads like a form alert, not a brand line. The pull-back crossfades H1 and H2 on top of each other, then shows two sparse frames. |
| 2 | 10-second clarity | 8.0 | 8.5 | +0.5 | H1 and lede, then the "Built on" trio and a three-column "Why now" that finally says who pays and who earns. The ContextHint badge with the traction line is in the hero, but at 1280x800 it is cut by the fold. |
| 3 | Story | 7.5 | 8.0 | +0.5 | 18,854 px at 1440 (20.9 screens, v3 30.8). Clean order: what, why now, how, rule, money, moat, proof, next. The rule appears once. Some ContextHint re-explanation remains across the trio, beat 3, the chapter opener and the dive. Mobile is still 30 screens. |
| 4 | Stage explanation | 6.5 | 8.0 | +1.5 | The board is legible: 13 to 16 px text, readable inactive nodes, vermillion ContextHint handing over to ultramarine, a solid winning-bid bar, "Judged with Jev" on the agents. Remaining: a ~100 px dead gap between short beat titles and their body, an unlabelled white paid segment in beat 7, and ~170 px of unused board height. |
| 5 | ContextHint moat | 7.0 | 8.0 | +1.0 | Now a real chapter: the 1,000+ traction figure, a wall of real observed ads, 4,205 dots sorting into country bands (the best data image on the page), the 12-country chart, the funnel, the moat line at display size and the vermillion "Visit ContextHint". contexthint.com is linked 7 times, all new tab. Against that: the dot sort plays over ~160 px of scroll, so it is a flick, not a moment. The niche to sub-niche zoom is not built. The funnel units collide with the numbers. Small vermillion text fails contrast. Two internal phrases remain ("serving database, owner-supplied"). |
| 6 | Proof | 7.5 | 8.0 | +0.5 | The money pair leads, the counts sit in one sentence, there is a designed video poster with chapter marks, a clean run sheet, a card plus a plain receipt, and the limits. The display numerals are monospaced, so "0.010" reads "0 . 010" at 92 px. |
| 7 | Motion craft | 6.5 | 7.5 | +1.0 | The shutter is fixed and cinematic. Pins sit at top 0 at 1280/1440/1920 and the 7 stage beats reverse cleanly. Wheel scroll runs at p99 16.8 ms. Remaining: the hero double-headline crossfade, the sparse pull-back frames, a translucent lavender chat mid-closing, the dot sort too fast, and country bars that fill late with collapsed outline boxes. |
| 8 | Type and spacing | 7.0 | 7.5 | +0.5 | Italics, the agent-card overflow and the 1920 gutter are all fixed. New or remaining: monospaced display figures with gappy punctuation; faux bold from PolySans Mono at weight 700, which has no face; mixed families in one stat stack ("2" in Wide 300 above "0.010" in Mono); funnel units glued to the numbers; an orphan "A" ending line 1 of the moat line; "A transaction for each / ad". |
| 9 | Mobile (390) | 7.0 | 7.5 | +0.5 | No page overflow. The stage becomes stacked beat cards with fact chips, and the dot bands, chart and funnel all work static. Still 25,555 px (30.3 screens). The payments lanes are cramped into a narrow column, and the plate stack and ad wall are tall. |
| 10 | Performance and polish | 6.5 | 8.0 | +1.5 | CLS 0.0001 (was 0.03 to 0.10). LCP 88 to 96 ms (static). First-load JS 133 KB gzip. 0 console errors, 0 failed requests, 0 off-origin requests. og.png is present. But vermillion text at 2.93:1 means Lighthouse a11y cannot reach 100. There are 8 stale duplicate `@font-face` rules, a faux bold, and Lighthouse could not be run (unavailable offline). |

**Average: 7.85** (v3 7.1, +0.75). No line has reached the 8.5 exit bar yet. Line 2 sits exactly at 8.5.

## Did the v3 fixes land?

| v3 fix | Status |
|---|---|
| 1 Shutter | **Landed.** A viewport plate opens from the bottom, with no blank paper slab (strip 05). |
| 2 Desktop CLS | **Landed.** 0.0000 at load, 0.0001 after a full scroll (1440/1920), 0.0068 at 1280 from `.sc-fit` mid-scroll. |
| 3 Agent cards overflow | **Landed** on the stage and on the mobile plates. |
| 4 Faux italics | **Landed** (0 italic elements). There is a new faux bold, see fix 3. |
| 5 Board legibility and climax | **Mostly.** The type is legible, the vermillion handoff and the solid winning bar are in. The paid segment in beat 7 is white and unlabelled, not ink or ultramarine. |
| 6 Hero explode legibility | **Landed.** Less shear, notes are no longer occluded, the Evidence plate is labelled, the provenance line is quiet. |
| 7 Library dive composition | **Reworked.** The stray square is gone. The field is static, and "scale felt" moved to the dot bands. The sub-niche zoom is missing. |
| 8 Closing collapse | **Partial.** The end state now rhymes with the hero, but there is a translucent chat at about -100 px (strip 18). |
| 9 Hero gutter and empty pull-back | **Gutter landed** (x=200 at 1920). The pull-back still has a headline overlap and two sparse frames (strip 02). |
| 10 Mobile sequences | **Landed** as beat cards. The receipt no longer wraps hashes. |
| 11 Wall rag | **Landed.** Three balanced lines, and the statement fits at 1440x900. |
| 12 og.png | **Landed.** |
| 13 Payments argument | **Partial.** A Solana channel lane is added, but the per-ad lane is still three identical dashed boxes. |
| 14 Video poster | **Landed.** A designed ultramarine poster. |
| 15 Proof stat grid | **Landed.** The money pair plus one counts sentence. HTML is down to 285 KB raw (36.5 KB gzip), from 398 KB. |

Owner v4 rules (design view): no IDs, hashes, policy names, model versions or run IDs are visible, and the glyph legend
is gone. The ContextHint chapter is in vermillion and is the second set piece. The "Built on" trio is plain text with 3
links. Jev is modest (the trio, beat 4, the Agents plate callout, the footer credit). Solana is named in the trio, the
payments band, beat 7 and the Payment plate. **Two internal phrases remain:** "ContextHint serving database,
owner-supplied" (the country chart note) and "an owner supplied snapshot" (the footer).

## Hard benchmarks (measured)

| Benchmark | Result | Status |
|---|---|---|
| Console errors | 0 on `/` at all 4 sizes, `/design/`, `?film=1&from=close`, `?still=1` (export). The dev server :3410 is currently 500 (environment). | pass (page) |
| Failed requests | 0 | pass |
| Off-origin requests | 0 (all non-local requests were blocked and logged: none attempted) | pass |
| Horizontal overflow at 390 | scrollWidth 390. Only ad-wall internals extend past the edge, clipped by their parent. | pass |
| Fonts | all 7 local PolySans faces `loaded`. 8 stale duplicate `@font-face` rules (Bulky 700 etc.) stay `unloaded`. `.sc-big` asks for PolySans Mono 700, which has no face, so Chrome synthesizes the bold. | pass, with cleanup |
| LCP (static export) | 96 ms (1440), 88 (1280), 92 (1920), 88 (390); element = H1 | pass (< 1.8 s) |
| CLS | 0.0001 (1440), 0.0068 (1280, `.sc-fit` at 17 s mid-scroll), 0.0001 (1920), 0.0000 (390) | **pass** (< 0.02) |
| First-load JS gzip | 133.5 KB (+ 39.4 KB polyfills, nomodule) | pass (<= 170) |
| Lighthouse | not available offline, skipped. Predicted a11y < 100 because of vermillion contrast. | not run |
| Contrast | 12 text styles below AA. Every one is ContextHint vermillion `#f65a20` on paper (2.93:1) at 13 to 15 px, or white on the vermillion button (3.28:1). | **fail** |
| a11y basics | 1 H1, 0 heading-level skips, 96 images all with alt, 0 unnamed links or buttons, `lang=en` | pass |
| Scroll pins | hero 810, stage 2097, dots 270, dive 360, shutter 36 px spans at 1440. Sticky top 0 at every sample at 1280/1440/1920. The 7 stage beats advance in order and reverse 7 to 1. | pass |
| Pin pacing | the dot sort maps to 12 to 72% of a 270 px pin, so **about 160 px of scroll (one wheel tick)** | **fail (design)** |
| Jank | real wheel scroll through Lenis, whole page at 1440: 949 frames, p50 16.7, p95 16.7, p99 16.8 ms, 1 frame over 50 ms, 0 over 100 ms | pass |
| Reduced motion | `data-px-motion=off`, 0 hidden `[data-reveal]`, every scene a complete still with the same words (16,952 px) | pass |
| Page height | 18,854 (1440), 17,618 (1280), 20,901 (1920), 25,555 (390); 3,560 words | desktop ~21 screens; mobile 30 |
| Text below 12 px | only 11 px tags ("Separate from the answer", "Won", "Ad") | pass |
| contexthint.com links | 7, all `target=_blank rel="noopener noreferrer"` | pass |

## Ranked fixes for v5 (most impactful first)

1. **Make the dot sort a moment, not a flick** (`chapter/DotBands.tsx`, `chapter/chapter.css` `.db`). The pin is 1,170 px
   for a 900 px stage, which leaves a 270 px span. `seg(v, .12, .72)` sorts all 4,205 dots in about 160 px, one wheel
   tick. Give `.db` about 230vh, sort over 0.10 to 0.70, and hold the sorted state for the last 25%. Count the band
   labels up as their bands land. This is the owner's step 1 for the second signature moment, and right now most
   visitors will never see it happen. Also trigger the 12-country bars earlier (`CountryChart`). At 1280 the lower rows
   are still empty, and the empty outline boxes collapse into two horizontal hairlines (South Korea), which looks broken.
2. **Vermillion contrast** (`chapter/chapter.css`, hero badge, `ch-action`). `#f65a20` on paper is 2.93:1 and fails AA
   for every small vermillion label: "ContextHint data", "Built on ContextHint's ad intelligence", chain kickers,
   "Prompt", legend numbers. White on the "Visit ContextHint" button is 3.28:1 at 17 px. Add a text-only token (a
   darker vermillion reaching 4.5:1, around `#c2410c`) for text under 24 px. Keep `#f65a20` for fills, bars, dots
   and display type. On the button, use ink text or the darker fill. Without this, the Lighthouse a11y 100 budget
   cannot pass.
3. **Stop using the monospaced face for display figures** (`.pr-money-n`, payments facts, `.sc-big`, `.db-legend b`,
   chart counts). PolySans Mono gives the period and comma a full cell, so "0.010" at 92 px reads "0 . 010" (shots
   10, 17), "330,777" reads "330 , 777", and the payments stack mixes "2" in Wide 300 with "0.010" in Mono. Set
   display and stat figures in PolySans Wide or Neutral with `font-variant-numeric: tabular-nums`. Keep Mono for small
   tabular data only. Drop `font-weight: 700` on `.sc-big`: no Mono 700 face exists, so Chrome fakes the bold.
4. **Funnel: units and shape** (`chapter/Funnel.tsx`). The units are glued to the numbers: "420,540placements",
   "1,178records", "1 + 1example and audience" (shot 15). Add a gap, or set the unit on its own line under the number.
   The shape does not narrow: the packet bar is wider than the screened-slice bar, which breaks "kept apart, narrowing".
   Make the widths strictly decreasing and let the vermillion turn into ultramarine as the last bar narrows into the
   packet (the owner's brief).
5. **Hero pull-back** (`scenes/HeroScene.tsx`). At about 90 px of scroll the fading H1 and the incoming H2 ("Behind one
   Sponsored card") are drawn on top of each other. From 180 to 300 px the frame is a small tilted card on empty paper
   (strip 02). Take H1 out completely before H2 comes in (sequence, don't crossfade), keep the card at 70 to 80% scale
   through the lie-down, and start the explode by about 0.25 so no frame reads as empty.
6. **Hero left column: badge above the fold, less clutter** (`app/page.tsx` hero, `site.css` `.pg-badge`). At 1280x800
   the ContextHint badge is cut by the fold (shot 19), which defeats the owner's "first 10 seconds" rule. Three actions
   wrap to two rows at 1280 and 1440. Drop "Skip to the proof", since the nav has Proof. Make the badge an unboxed
   vermillion line directly under the lede or beside the actions, and drop the boxed border, which reads like an alert.
7. **Remove the last internal wording** (`data/copy.ts` / `library.ts` source strings shown on the page).
   "Fresh Ads collection by country, ContextHint serving database, owner-supplied." becomes something like "Fresh Ads
   collection by country, from ContextHint." The footer's "ContextHint figures are from an owner supplied snapshot
   dated September 26, 2026" becomes "ContextHint figures: snapshot of September 26, 2026." These are owner-rule
   violations (no internal details).
8. **Closing without the translucent chat** (`scenes/ClosingStack.tsx`). At about 100 px before the section top the
   chat is a pale lavender ghost over ultramarine (strip 18, frame 5). Let the plates slide under an opaque chat, or cut
   on arrival. Never show the chat below full opacity on blue.
9. **Niche to sub-niche, and a visible chain at the start** (`scenes/LibraryDive.tsx`, `specimens/NicheField.tsx`). The
   owner's step 3 (one niche splitting into its sub-niche grid) is not built: the field is static and the vermillion
   square just sits there. Zoom the run's niche into its sub-niche grid (5,991 with ads of 7,121 overall, so this niche
   gets a small grid), then hand over to the chain. Also raise the inactive chain steps from ~0.15 to at least 0.35
   opacity: at dive start the right column is almost blank (shot 13a in `out/v4`).
10. **Money lanes say something** (`app/page.tsx` Payments, `scenes/Switchboard.tsx` beat 7). The per-ad lane is still
    three identical dashed boxes. Give each a fee tick and a wait bar so the contrast with the single channel line is
    visual, not only captioned. In beat 7, fill the paid segment in ink or ultramarine and label it "Paid 0.007". It is
    currently plain white next to "Refunded 0.013".
11. **Stage copy rhythm** (`StageScene.tsx`, `.ss-copy`). On short beat titles ("Code sets the price.", "Settled
    once.") there is a ~100 px dead gap between title and body, because the block reserves the tallest title's height.
    Anchor the body to the title and let the block's top float. The board can also grow about 15% into the empty
    170 px below it.
12. **Rags and small cleanup.** In the moat line, "An auction is code. A / record of which..." leaves "A" dangling at
    the end of line 1. Set explicit lines, as the rule wall does. In payments, "A transaction for each / ad" should be
    one line or a shorter label. Delete the 8 stale `@font-face` declarations (the design-system faces superseded by
    `/fonts`). On mobile, cut the plate stack and ad wall heights to bring 390 below about 25 screens.

## Already excellent: protect these

1. **The dot bands end state and the 12-country chart.** 4,205 squares sorting into the US / no country / Australia /
   South Korea bands turn the US-heavy caveat into the picture itself (shot 13), exactly as the owner asked. The
   calls vs returned chart with hit rates is honest and readable. Make the sort take longer. Do not replace it.
2. **The legible dark stage and the pin engine.** Board type at a real reading size, vermillion ContextHint handing over
   to ultramarine, the solid winning bar, the 7 beats that reverse cleanly, sticky top 0 at every size, a 16.7 ms
   frame budget, and the new shutter entrance.
3. **The ultramarine identity at full volume, with the hero rhymed at the end.** The rule wall in three balanced lines,
   the moat line with "ContextHint already collects it." in vermillion, the ultramarine closing that returns to the
   hero's chat and card, and the giant `axp.one` wordmark with its square ultramarine dot. The page is now honest and
   quiet everywhere else: one human source line per scene, no chips, no legend.
