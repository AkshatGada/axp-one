# MVP v2 design review (tag axp-mvp-v2, 322f80d)

Critic: design. Read-only, headless Chrome (playwright-core) against http://localhost:3420, localhost only.
Viewports: 1440x900, 1920x1080, 390x844 (mobile emulation). Light only.
Tools: `docs/frontend/reviews/tools/mvp-design/capture.mjs` (modes bench, shots, fold, present, auto, keys, verify, mobile) and `probe2.mjs`.
Raw data: `tools/mvp-design/out/bench.json`, `out/verify.txt`, `out/auto.txt`. Shots: `docs/frontend/reviews/shots/mvp-v2/` (26).

## Verdict

v2 is a real product now. The shell, Overview, Settlement and the opportunity pipeline read as a credible
Stripe/Linear-style dashboard, and the honesty layer is excellent. What keeps it below 8.5 is mostly
not taste: **Present mode is broken at any viewport smaller than 1920x1080**, **/verify has a 0.48 CLS**, and a
handful of layout voids and leftovers from v1 (the Inspector, the mono receipt) undercut the instrument-grade feel.

**Average: 7.75 / 10**

## Scores (MVP rubric)

| # | Line | Score | Why |
|---|---|---|---|
| 1 | Cold orientation | 8.0 | Overview answers "what is this" in one screen: title, lede, six KPI tiles, an Auctions table with outcome tags, and two clear CTAs. The lede is dense (three sentences, 50+ words). "Clearing prices 0.004 / Then 0.003 and 0.003" is an odd tile, and "Accepted spend" plus its Sandbox chip wraps to two lines, so its number sits lower than the other five. |
| 2 | Opportunity screen | 7.5 | The sticky chat next to one stage panel works. The slot stays "awaiting auction" until Delivery and then fills, which is a good beat. But the stepper shows every stage ✓ with its final value ("Charge 0.004") from stage 1, so there is no sense of progression and the stepper gives the ending away. The Award stage stretches three equal columns around a 210 px creative card, leaving two mostly empty panels. Opp 4 walks through seven identical "Did not run" stages. |
| 3 | Honesty made visible | 9.0 | Recorded chips, provenance pills (Observed by ContextHint, Inferred hint, Actual output), "Observed historical reference, not an AXP advertiser" on every brand, the receipt caveat, the two-clock lines, the frequency-cap card ("Agent said bid. Exchange did not admit it."), and "Borrowed levels" on Try are all present and calm. Internal leaks remain: "Tier loo" (evidence), "Source: aws / verseodin", raw slug topics. |
| 4 | Decisions and auction | 8.0 | The ScoreRuler with the 2.5 line, baseline vs history, ArmDiff and policy line, bid table tiles (2:2 50% ... 3:3 100%), bar chart with floor and tie-break note are all correct and legible. The ruler is tiny (about 180 px) inside the decision cards, and in the auction chart "Missing crypto storage" collides with the floor tick. |
| 5 | Settlement | 8.5 | The KPI strip, per-channel deposit bar, cumulative step chart with the "replaces, not plus" line, tx table with deltas, separate USDC and lamports totals, and the chain lane by slot are the best page in the product. The "In order, without timestamps" sequence wraps as a tag cloud. "9.46M" in the KPI vs "9,463,840" in the table is inconsistent. |
| 6 | Present mode | 6.0 | At 1920x1080 it is clean, captions are 22 px and readable, and autoplay is exact (beats at 0,15,35,55,80,110,134,159,185,215 s, 4:00 total, no stuck beat, 0 errors). But the stage is mispositioned below 1920x1080: at 1440x900 the frame is cropped right and bottom (caption cut off), and at 390 the screen is solid navy. At 1920 every beat uses only about 55 to 65% of the 872 px stage height (150 to 200 px dead bands top and bottom), and surfaces are not at the specified 1.25x. |
| 7 | Verify | 8.0 | 48/48 green in Chromium including 3 Ed25519 checks. Grouped tables show Recorded vs Computed here, plus restart evidence and What this proves / does not prove. It loses points for CLS 0.48 (results block pushes the KPI grid when checks resolve) and lowercase slug row labels ("1 · clearvault · baseline"). |
| 8 | Visual craft | 7.5 | Ledger v2 is applied consistently: radius, borders, PolySans, one accent, tabular figures, restrained semantic colour. Detractors: empty voids (Award stage, under the Overview Auctions table, Publisher caveat panel, Present bands), the Campaigns table's last column touching the panel edge, the receipt card set entirely in mono, the Inspector still in v1 styling, and SVG chart text that scales with width (Run activity labels about 16 px at 1920, unreadable about 4 px at 390). |
| 9 | Navigation | 8.0 | The sidebar with nested opportunities and campaigns, breadcrumbs, prev/next opportunity buttons, J/K and arrows (hash per stage, clamped at the ends), visible 2 px focus rings and 16/16 internal links all work. However, `I` opens the Organic answer instead of the record for the active stage. There is no skip link (12 tabs to reach content). The nav says "Campaigns" while the URL says /advertisers/. |
| 10 | Robustness | 7.0 | There are 0 console errors, 0 failed requests and 0 off-origin requests on 17 routes, and no horizontal overflow at 390 on any route. But Present is broken off-1080p, and CLS budgets fail: /verify 0.482, /try 0.035, ?all=1 0.029. |

## Benchmarks (measured)

| Benchmark | Target | Result |
|---|---|---|
| Console errors / failed requests (17 routes, 1440 and 390) | 0 | **0 / 0** pass |
| Off-origin requests | 0 | **0** pass |
| Horizontal overflow at 390 | none | **none** (scrollWidth 390 on all routes) pass |
| Fonts | PolySans, no fallback | PolySans 400/500, Wide 400/500, Mono 400 loaded, 0 failed. pass |
| LCP desktop | < 2.0 s | 88 to 656 ms (worst /opportunity/1/ cold, 656 ms) pass, dev server |
| CLS | < 0.02 | **fail** on /verify **0.482** (`.ld-cols-2` KPI grid shift at ~309 ms), /try 0.035 (`.try2-cap`), /opportunity/1/?all=1 0.029 (stage caption). Others ≤ 0.011 |
| /verify in Chromium | all green incl. Ed25519 | **48/48** (4 question, 15 packet, 3 creative, 3 ack, 3 receipt, 3 Ed25519, linkage, sums), 0 ✕ pass |
| Present autoplay | 10 beats, 3:45 to 4:15, no stuck beat | 10 beats, 4:00 total, transitions on schedule. pass (at 1920x1080 only) |
| Present at other viewports | usable | **fail**: 1440x900 frame offset by +240/+135 px (cropped), 390 blank |
| Keyboard | J/K, I, focus | J/K/arrows pass (clamps at #moment / #charge); focus ring 2 px accent pass; `I` opens the wrong record (partial) |
| Copy: dashes | 0 in UI copy | 0 in UI copy. Em dashes appear only inside the recorded organic answers (opp 2, 3, 4) and on /design. Acceptable as verbatim model output. |
| Lighthouse / first-load JS | ≥85/≥95, ≤200 KB | not measured (no Lighthouse run against the dev server; measure on the static export next round) |

## Ranked fixes (impact first)

1. **Present stage positioning (blocker for presenting on a laptop).** `design-system/ledger/ledger.css:437-439`.
   `.lg-present` is `display:grid; place-items:center` around a fixed 1920x1080 child, so the grid track grows
   to 1920 and `transform: scale()` from the centre leaves the frame offset by ((1920-W)/2, (1080-H)/2). Fix: make
   the frame `position:absolute; left:50%; top:50%; transform: translate(-50%,-50%) scale(s)`, or give the grid
   `grid-template: minmax(0,1fr) / minmax(0,1fr)` with `justify-self/align-self: center` and an `unsafe`-free
   wrapper of size 1920*s x 1080*s. Verify at 1280x800, 1440x900 and 390.
2. **Fill the 16:9 frame in Present.** `src/components/PresentStage.tsx` and the beat views. Every beat leaves
   150 to 200 px empty bands above and below. Apply the spec's 1.25x surface scale (about 18 px body, 50 px KPI numbers), lay
   beats out on a full-height grid (content area ~872 px), and give the sparse beats a second element:
   beat 6, add the winner/tie-break note under the bars; beat 7, enlarge the receipt panel (it is half empty);
   beat 10, centre "Explore every hash yourself." under both columns or drop it, because the caption already says it. Also make the
   "Inferred hint" pill on beat 4 fit its content (it stretches full width).
3. **Kill the /verify layout shift (CLS 0.48).** `src/components/VerifyRunner.tsx`. Reserve the KPI grid and
   group-table heights before checks resolve (render the 48 rows immediately with a neutral "Checking" state, then
   flip to ✓). Do the same for `.try2-cap` on /try and the stage caption on ?all=1.
4. **Pipeline stepper should show progression.** `components/v2/OpportunityStages.tsx` / `Ld.Pipeline`. Mark
   stages after the active one as upcoming (neutral numbered circle, value in text-3, or the value hidden until reached),
   so stage 1 does not already say "Charge 0.004 ✓" while the slot says "awaiting auction". This is the heart of the
   step-through story.
5. **Award stage void.** `components/v2/stages.tsx` (stage 6). The three equal-height columns wrap the creative card at
   210 px into 10 lines and leave Reserved and Expires 60% empty. Put Reserved and Expires as a two-tile row and
   the creative full width below (or a 1fr / 2fr split) with `align-items:start`.
6. **Inspector: open the active stage's record and adopt v2 styling.** `components/chrome.tsx` and the v1 InspectorProvider.
   On /opportunity/1/#auction, `I` opens "Organic answer". It should open the auction record (the stage's
   "Inspect record" payload). Restyle the drawer to Ledger v2 (radius 14 on the leading edge, shadow-3, no 3 px accent
   rule). Replace the square "☐ Recorded hash only" boxes, which read as unchecked form checkboxes, with a neutral
   tag ("Recorded hash only" vs "Recomputable ✓"). Pretty-print the JSON instead of showing `\n\n` escapes.
7. **Receipt card in mono.** Stage 8 `ReceiptSheet`. Statement, For, Publisher and Mode values are prose set in mono,
   which breaks "mono only for hashes/IDs". Use body type, keep mono for the key id and hashes, and consider showing
   the receipt hash and signature (truncated, with copy) since this is the receipt stage.
8. **Overview Campaigns table right edge.** The "Refunded at close" column ("0.013", "no channel") touches the
   panel border, because the last cell is missing right padding. Add 16 px (`--ld-panel-pad`) to the last column in `Ld` tables.
9. **Run activity chart text scales with width.** Overview chart (SVG with viewBox): labels are about 16 px at 1920 and
   about 4 px at 390. Render labels in HTML or fix the SVG width with a fixed-px text size, and at <900 px stack the lanes
   or show a compact table. Also fix the overlapping organic-answer markers at 13:38, which render as a clipped double dot.
10. **Overview balance.** The Auctions panel (275 px) sits next to the Latest delivery panel (370 px), leaving a 100 px void under the
    table. Either stretch the table panel with a footer ("Show all stages of opportunity 1 →") or align both to content
    height. Make the "Accepted spend" tile's Sandbox chip sit beside the number or in the footer so all six numbers share a baseline.
11. **No-fill opportunity stepper.** /opportunity/4/: stages 3 to 9 are seven identical "Did not run" panels. Collapse
    them into one "Steps 3 to 9 did not run" segment in the stepper (J from Eligibility goes straight to it), and title
    the panel "No agent was called" instead of "3. Did not run".
12. **Internal labels in plain views.** "Tier loo" (opp 1 evidence: write "Leave-one-out hint"), "Source: aws /
    verseodin" (Evidence: "Ad library scrape" / "VerseOdin panel" or plain source names), and slug topics
    ("crypto hardware wallets self custody") should get sentence-case display names. On Verify, rows
    "1 · clearvault · baseline" should read "Opportunity 1, ClearVault, baseline".
13. **LeatherGuard decision-history table cramped.** `/advertisers/leatherguard/`: in a 700 px column, opportunity names wrap
    to 3 lines and "Skip · 1:2" breaks across lines. Give the table full width (move Creative and Declared capabilities
    below) or `white-space: nowrap` on level cells.
14. **Settlement sequence and units.** Render "In order, without timestamps" as one non-wrapping horizontal sequence
    (Open → Charge 1 → Voucher 1 → ... → Close) instead of wrapped chips. Show "9,463,840" in the KPI (or "9.46M lamports"
    with the exact value in the subtitle) so the KPI and table use the same notation.
15. **Middle-dot separators and small polish.** "·" appears as a separator 4 to 30 times per page (the stage caption, chain lane,
    channel subtitles, Present header). It is not a decorative dot in the ornament sense, but against the owner's no-dots rule, prefer
    commas or a thin rule. Also: hide the J/K hint on touch widths, label the nav "Campaigns" consistently with the
    route (or rename the route), and add a "Skip to content" link.

## Protect these three

1. **The chat plus stage layout with the slot that fills at Delivery.** The sticky "In the app" specimen with the dashed
   "Sponsored slot, awaiting auction" that becomes the real card at stage 7 is the clearest explanation of the
   product. Keep it, and keep the one-stage default.
2. **Settlement as built.** Deposit bar, cumulative step chart with "replaces, not plus", separate USDC and lamports
   tables, chain lane by slot with its own clock. It is correct, readable and looks like a real payments console.
3. **The honesty layer's tone.** Provenance pills, the vermillion-only-for-evidence rule, the frequency-cap card
   ("Agent said bid. Exchange did not admit it."), "Borrowed levels" on Try, and What this proves / does not prove on Verify.
   They are calm, specific and never shouty, so do not convert them into banners or warnings.

## Key shots
`shots/mvp-v2/`: 02b-overview-full-1440, opp1-1..9-*-1440 (each stage), opp1-inspector-1440, opp3-decisions-1440,
opp4-evidence-nofill-1440, present-01/04/06/09-1920, present-01-1440 (cropped bug), m390-present_6 (blank bug),
m390-overview, m390-opportunity_1_decisions, r-settlement/evidence/advertisers/try-1440-full, f-verify-1440.
