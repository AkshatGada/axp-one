# Landing v3: design critic review

Version: `axp-landing-v3` (e64836e) + `axp-prospectus-v3`, dev server http://localhost:3410/.
Method: headless Chrome (playwright-core) at 1440x900, 1280x800, 1920x1080, 390x844 (mobile UA, touch) and
1440 with reduced motion. Pinned scenes sampled at 25 progress points forward and backward at each desktop size.
Screenshots: `docs/frontend/reviews/shots/landing-v3/` (21). Scripts: `docs/frontend/reviews/tools/design/`.

## Scores (landing rubric)

| # | Line | Score | Reason |
|---|---|---|---|
| 1 | First impression | 7.5 | Clean, confident hero with the ultramarine "agentic internet." and a real HostChat specimen, but at load it is a conventional split hero (headline left, product mock right); the originality only arrives on scroll. |
| 2 | 10-second clarity | 8.0 | H1 + lede say what it is and how money flows; "for advertisers / AI apps" is implicit until the Shift section. |
| 3 | Story | 7.5 | Every question is answered in order (what, why, how, money, moat, trust, proof, next), but the page is long (27.7k px at 1440, 27k at 390) and repeats the rule three times (roles, wall, principles). |
| 4 | Stage explanation | 6.5 | Beats are clear and well written, but the board renders at 8 to 11 px at 1280/1440, has no ultramarine climax at the auction, agent cards overflow their borders, and the Shutter entrance is broken. |
| 5 | ContextHint moat | 7.0 | Big vermillion stats and an excellent evidence-chain end state; the 983-square field is pale grey noise (scale not felt) and the fly passes through the headline while half the viewport is empty. |
| 6 | Proof | 7.5 | Run sheet, card + receipt exhibits, settlement table and limits are specific and inspectable; the six-stat grid is generic and the video poster is a tiny illegible screenshot. |
| 7 | Motion craft | 6.5 | Pins are rock solid and fully reversible at 60 fps; but the Shutter shows ~700 px of blank paper then hard-cuts, the closing crossfade is muddy, the dive square collides with the H2, and the hero shifts during the intro (CLS). |
| 8 | Type and spacing | 7.0 | PolySans scale and rhythm are strong; faux italics (synthesized oblique) in the ruler and the Illustrative marker, text crossing borders in the switchboard, a weak rag on the wall, gutter misalignment of the pinned hero at 1920. |
| 9 | Mobile (390) | 7.0 | No overflow, readable, clean static sequences; but the dark stage has no visual at all below 900px, plates are tall empty boxes, receipt hashes wrap mid-token. |
| 10 | Performance and polish | 6.5 | Zero console errors / failed / off-origin requests, all faces load, LCP ~0.3 s (dev); CLS fails at every desktop size (0.033 to 0.100), `/og.png` 404s, Lighthouse not run. |

**Average: 7.1.** No line reaches the 8.5 exit bar yet.

## Hard benchmarks (measured)

| Benchmark | Result | Status |
|---|---|---|
| Console errors | 0 on `/` at all 4 sizes, `/design/`, `?film=1&from=close`, `?still=1` | pass |
| Failed requests | 0 (only the dev `N` indicator badge visible; not counted) | pass |
| Off-origin requests | 0 (all non-localhost requests were blocked and logged: none attempted) | pass |
| Horizontal overflow at 390 | scrollWidth 390, no element past the edge | pass |
| Fonts | all 8 PolySans faces `loaded` (Bulky 700 unused); no `<link rel=preload>` for any face, `font-display: swap` | pass, but causes CLS |
| LCP (dev server) | 320 ms (1440), 296 ms (1280), 276 ms (1920), 276 ms (390); element = H1 | pass (re-measure on export) |
| CLS | **0.037** (1440), **0.033** (1280), **0.100** (1920), 0.000 (390). Sources: `.pg-hero-copy`, H1 word spans, `NAV.px-nav` at ~280 to 320 ms (font swap reflows the vertically centred hero), then `DIV.sp-chat` at ~600 ms (intro typing) | **FAIL** (< 0.02) |
| First-load JS gzip | ~123 KB (excl. polyfills) measured on `apps/marketing/out/` dated 00:21, which predates the v3 commit (00:29); re-measure on a v3 export | likely pass |
| Lighthouse | not available offline (no global or cached `lighthouse`), skipped | not run |
| Scroll pins | hero 2070 px, stage 5121 px, dive 1350 px spans at 1440; sticky top = 0 at every sample at 1280/1440/1920; beats advance 0 to 6 in order and reverse 6 to 0 on back-scroll | pass |
| Shutter | aperture is a % of the 6,879 px section: with the section top at y=300 the dark plate is still 714 px below the viewport; it appears only in the last ~150 px of scroll | **FAIL (visual)** |
| Jank | real wheel scroll (Lenis) through the whole page at 1440: 1,280 frames, p50 16.7 ms, p99 16.8 ms, 0 frames > 50 ms (headless, indicative) | pass |
| Reduced motion | `data-px-motion=off`, 0 `[data-reveal]` elements hidden, every scene a complete still with the same words (21,020 px) | pass |
| OG image | `/og.png` referenced in metadata returns 404 | fail (polish) |
| Owner rule: no italics | `<i>` elements carrying text render synthesized oblique (ruler labels, "Illustrative" marker) | **violation** |

## Ranked fixes (most impactful first)

1. **Fix the Shutter** (`apps/marketing/src/scenes/StageScene.tsx`, `style={shutter}` on `#how`). `inset(38% 43.7%)` is computed
   against the whole 6,879 px section (head + 670vh pin), so the aperture's top edge sits ~3,000 px below the section top:
   for ~700 px of scroll the visitor sees empty paper under the roles (shot 05), then the dark slams in. Clip a
   viewport-sized layer instead (a sticky/fixed `::before` night plate, or compute the inset in px from the section's
   on-screen box: `inset(${topPx}px ${x}px ${bottomPx}px ${x}px)` with `bottomPx = H - (visibleTop + vh) + insetPx`).
   Impact: the entrance to the signature dark stage becomes the cinematic moment it was designed to be.
2. **Kill desktop CLS** (`apps/marketing/src/app/layout.tsx`, `design-system/foundation/steel.css`, `specimens/HostChat.tsx`).
   Preload PolySans SlimWide 300, Neutral 400, Median 500 and NeutralWide 400 (`<link rel="preload" as="font" crossorigin>`),
   add size-adjusted fallback faces (or `font-display: optional` for the display face), and reserve the chat answer/card
   height during the intro (render the full text and reveal by clip/opacity rather than growing the box). Both columns
   are `align-items: center`, so any height change moves the H1. Impact: CLS 0.03 to 0.10 to ~0, passes the benchmark
   and removes the visible hero jump at 150 to 600 ms.
3. **Agent cards overflow their borders** (`scenes/Switchboard.tsx`, agent rail). "Without history / intent 2" and
   "Own campaign only / no rival data" sit on the card's bottom border; LeatherGuard's "agent" wraps to a second line
   and "Relevance, intent 1, 2" crosses the dashed border with "Asked to compare / no auction" spilling outside
   (shot 14). Same LeatherGuard overflow on the mobile Agents plate (shot 20). Give the cards auto height or a taller
   fixed row, keep "agent" on the name line. Impact: removes the most visible "unfinished" detail on the dark stage.
4. **No faux italics** (`design-system/foundation/steel.css`; `specimens/EvidenceChain.tsx` ruler, `scenes/PlateStack.tsx`
   `.sc-marker`). Text inside `<i>` gets the UA italic and Chrome synthesizes an oblique PolySans: "2.38 question only",
   "from 2.5, intent rounds to 3", tick numbers and the hero's "Illustrative" marker are slanted (owner rule: no italics).
   Add `i { font-style: normal }` to the foundation (and prefer `<span>` for labelled parts). Impact: owner-rule
   compliance, crisper numerals on the key "3, not 2" ruler.
5. **Make the stage board legible and give it a climax** (`scenes/Switchboard.tsx`, `StageScene.tsx`, `scenes.css`). Board
   type renders ~8 to 11 px at 1280/1440 (shots 06 to 09, 18) and the board leaves a dead top-left quadrant inside the
   figure. Enlarge it (raise `maxH` to ~74vh, tighten the left copy to ~34%, pull the ContextHint feed up into the empty
   quadrant, drop the inner padding). Then give each beat one bold ultramarine moment as the design note demands: beat 5
   the winning row "ClearVault 0.004 Won" as a solid ultramarine bar (exactly like the hero's auction plate), beat 6 the
   Sponsored chip, beat 7 the paid segment turning ultramarine then ink. In beat 3 the ContextHint feed should carry
   its vermillion and hand over to ultramarine along the route into the agents (the sanctioned orange-to-ultramarine
   handoff). Impact: the stage stops reading as a dim wiring diagram and starts telling the money story.
6. **Hero explode: legibility and clipping** (`motion/motion.ts` `PLATE_M`, `scenes/plates.tsx`, `PlateStack.tsx`). With
   skew -36 and scaleY .58 the plate text is ~6 to 9 px and sheared (shots 03, 19); the "Actual output" mark on the
   Agents plate is cut by the plate above ("ctual output"). Reduce shear (~-26) and squash (~.66), enlarge plate type
   by ~20%, move plate marks to the unoccluded left/top edge. Make the travelling "Illustrative" chip smaller and
   attached to the route rather than floating over the evidence plate. Impact: the signature image becomes readable in
   a screenshot, not just impressive.
7. **Library dive composition** (`scenes/LibraryDive.tsx`, `specimens/NicheField.tsx`). At p≈0.3 the vermillion square
   flies through the H2 and parks on "agent." like a stray glyph, while the right half of the viewport is empty paper
   (shot 12). Arc the flight below the headline, show the chain as faint skeleton rows from the start so the
   destination exists, and make the field feel like mass: larger squares, "niche with ads" in ink at ~30 to 40% rather than
   `--silver`, maybe the field scaling up on entry. Impact: "scale is felt" (rubric 5) and the dive stops looking glitchy.
8. **Closing collapse** (`scenes/ClosingStack.tsx`). `stackO` (0.72 to 0.86) and `cardO` (0.74 to 0.90) overlap, so mid-scroll
   shows a translucent lavender chat with overlapping caption text on blue (shot 16); the end state is a lone card
   floating top right over empty blue, without "the answer". Make it literal and opaque: plates collapse into the
   HostChat and the Sponsored card lands under the answer (hero reversed), no simultaneous crossfade. Impact: a closing
   that rhymes with the opening instead of fading out.
9. **Hero pinned stage alignment and the empty pull-back** (`scenes/HeroScene.tsx`, `scenes.css` `.hs-stage`). At 1920 the
   "Behind one Sponsored card" H2 sits at x=88 and the stack caption at the right edge while the page gutter is x=200
   (shot 19): the pinned stage ignores the 1520 wrap. At p≈0.2 the screen is a small tilted card in an empty frame
   with no words and no header (shot 02); bring the pull-back line in earlier (from ~0.12) so no frame is empty.
10. **Mobile sequences** (`StageScene.tsx` `only-wide`, `plates.tsx`, `specimens/Receipt.tsx`). (a) Below 900px the dark
    stage is only text: show the fully lit board scaled to width after the beat list (it already exists for reduced
    motion on desktop). (b) Plates keep their desktop heights, leaving large empty interiors (Answer, Agents, Evidence,
    Payment in shot 20): size to content on mobile. (c) Receipt mono values wrap mid-hash ("award-bb3d8921...0 / 643"):
    stack label over value under 480px. Impact: mobile gets the signature visual and loses ~2,000 px of air.
11. **The rule wall's rag** (`app/page.tsx` `Rule`, `site.css` `.pg-wall-h`). At 1440 it sets "Agents / advise. Code /
    decides / the money." and runs below the fold at 900 high (shot 10). Set explicit balanced lines ("Agents advise. /
    Code decides / the money.") and size so the whole statement plus its lead fits one viewport at 1280x800.
12. **Generate `/og.png`** via `?still=1` (metadata points at it; it 404s). Cheap, and judges share links.
13. **Payments argument** (`app/page.tsx` `Payments`, `scenes/ScrubMeter.tsx`). The "one transfer per ad" lane is three
    identical dashed boxes ("Transfer / Network fee, then a wait") and does not argue anything visually (shot 11).
    Align it under the meter: three per-card transfers each with a fee tick and wait bar vs one voucher line and one
    close. Let the paid part pass through the money states (accepted hatch, authorized ultramarine, settled ink).
14. **Video poster** (`public/media` poster, `VideoFigure`). The poster is a small, unreadable MVP screenshot under a dark
    gradient. Use a designed frame (title + the real Sponsored card on paper) so the video block looks intentional.
15. **Proof stat grid** (`app/page.tsx` `Proof`, `PROOF.stats`). Six equal cells with "3" twice reads like a template.
    Lead with the money pair (0.010 paid / 0.030 refunded) at a larger size, and merge the counts into one sentence row.
    Also note the exported HTML is 398 KB raw (44 KB gzip); check for duplicated RSC payload of run data.

## Already excellent: protect these

1. **The hero Exploded Card and the pin engine.** Pins hold at sticky top 0 at 1280/1440/1920, beats advance and
   reverse cleanly, wheel scrolling stays at 16.7 ms frames. The chat lying down into a plate stack with
   provenance-marked callouts is the page's signature; improve legibility, do not replace it.
2. **The ultramarine identity at full volume.** "agentic internet." in ultramarine, the full-bleed ultramarine rule
   wall, the ultramarine closing and the giant lowercase `axp.one` footer wordmark with its square ultramarine dot,
   all on warm paper with PolySans Wide. Bold where it peaks, quiet elsewhere: keep the restraint.
3. **The evidence chain end state and the provenance system.** Observed prompt and ad (vermillion) to inferred
   audience to "Handed to ClearVault's agent" to "Intent rated 3, not 2" (ultramarine) with the score ruler is the
   most honest, specific data storytelling on the page (shot 13); the glyph-and-word provenance marks and the footer
   legend make every claim inspectable. Reduced-motion stills are complete and carry the same words.
