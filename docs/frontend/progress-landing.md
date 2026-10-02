# Landing (apps/marketing) progress note

Owner of this file: the landing builder agent. Update at every milestone.

## Done
- `axp-prospectus-v1` (4a49366): Prospectus primitives in `design-system/prospectus/` (prospectus.css + Type,
  Actions, Layout, Figure, Stats, Blocks, SiteHeader, SiteFooter, VideoFigure) and `/design` showcase.
  Shared change: `@types/react` devDependency in `design-system/package.json` (+ lockfile) so the package's TSX
  type-checks from its own folder.
- Step 2 (0bcf0ff): `scripts/extract-specimens.mjs` (asserts: counts 4/15/3/1/3/33/2, 4000+3000+3000, conservation,
  vouchers, computeBid parity, tie rule, forbidden fields) -> `src/data/run.generated.json` (committed; re-verified on a
  fresh clone without artifacts). Video/poster/VTT copied to gitignored `public/media/`. `src/data/run.ts` (typed),
  `library.ts`, `copy.ts` (all copy, numbers interpolated), `scripts/lint-copy.mjs`. predev/prebuild/postbuild wired.

- `axp-prospectus-v2`: /design rebuilt as an editorial brand book (cover with large provenance glyphs + index, type,
  colour, depth/shape incl. the plate matrix, grid overlays, provenance, actions) and every signature component with
  real content: HostChat (+ load intro), the Exploded Card plate stack with an explode scrubber
  (`src/scenes/PlateStack.tsx`, `plates.tsx`), the dark Switchboard with beats 1 to 7 (`src/scenes/Switchboard.tsx`),
  ChannelMeter at four moments, EvidenceChain + score ruler, the 983-square NicheField, RunSheet, receipt exhibit,
  real rail/ledger/stats/now-next/tiles, and a Motion section with Replay demos.

- `axp-prospectus-v3` (c16ed91): owner pivot to ULTRAMARINE (metal rejected, hooks removed). Solid ultramarine
  primary action, accent words, winning bid, route + marker, Sponsored frame, key numbers; ContextHint vermillion only
  in its section, handing over to ultramarine in the evidence chain; lowercase `axp.one` Wordmark; full-bleed
  ultramarine brand-book cover. (`axp-prospectus-v2` = the earlier steel version, kept for comparison.)
- `axp-landing-v1` (25eb90b): the full static page, every section with final copy and still figures (this is also the
  reduced-motion / <900px baseline). Aesthetic risk: a full-bleed ultramarine wall with the rule "Agents advise. Code
  decides the money." at display size, and an ultramarine closing. Builds as static export, 115 KB first load,
  lint clean incl. rendered HTML, no overflow at 375.

- `axp-landing-v2` (ca4d142): hero Exploded Card scroll scene (pinned 330vh at >= 900px): headline lifts, chat travels
  to centre and lies down as a plate (mixed 2D matrices), hands over to the collapsed stack, explode along the route,
  line, callouts, Illustrative marker. Same markup is the still sequence below 900px / reduced motion / no JS.
- `axp-landing-v3`: Shutter (square clip aperture) + pinned seven-beat dark Stage on the switchboard (`StageScene`);
  payments meter scrubbed by scroll (`ScrubMeter`); pinned Library Dive (the run's niche square flies from the
  983-square field into the evidence chain, steps build; `LibraryDive`); closing collapse on ultramarine
  (`ClosingStack`); film mode `?film=1[&from=hero|stage|data|proof|close]` (`motion/FilmMode.tsx`, linear scroll in
  scenes). Build now uses `.next-build` (NEXT_DIST_DIR) so it never collides with dev's `.next`.
  Verified headless (Chrome via playwright-core) at 1440x900, 1280x800, 1920x1080, 390: no console errors, no
  failed requests, no horizontal overflow, all PolySans faces loaded; reduced-motion still render complete.

- `axp-landing-v4`: built from reviews/landing-v3-fixes.md + landing-v4-owner.md + judge/truth/design reviews.
  No internal details on the landing (lint fails the built page on IDs, hashes, policy names, model versions, R/I
  shorthands, run IDs, base units, legacy notes). MVP URL env-aware (dev http://localhost:3420/, build /mvp/).
  New order: hero (ContextHint badge, helpful excerpt) / Built on trio (ContextHint, Jev, Solana) / Why now /
  shutter + stage / rule wall + rules strip / Solana payments / ContextHint chapter (traction, ad wall with real
  local images, 4,205 dots into country bands, niche dive + payoff with changed and unchanged results, 12-country
  Fresh Ads chart + funnel, moat, Visit ContextHint) / proof (money pair, run sheet, video, card, plain receipt,
  limits) / next / closing / footer (ContextHint column, Jev + Solana credits). Fonts preloaded from /fonts (CLS 0
  at 1280/1440/1920, was 0.03 to 0.10). Shutter clips a viewport-sized plate. og.png + video-poster.png captured
  from /?still=1 and /poster/. Build: `rm -rf out .next-build && NEXT_DIST_DIR=.next-build next build && mv
  .next-build out` (Next exports straight into a custom distDir), so dev's .next is never touched.
  Heights: 18,854px at 1440x900 (20.9 screens; v3 27,732), 16,952px reduced motion, 25,555px at 390.
  Final shots: docs/frontend/reviews/shots/landing-v4-builder/ (untracked).

- `axp-landing-v5`: built from reviews/landing-v4-fixes.md items 0 to 25 (REJECTED items not done).
  Dev hygiene, root cause found: with output: "export" and a custom distDir, `next build` FORCES its compile
  artifacts into `.next` (node_modules/next/dist/build/index.js, hasCustomExportOutput) and only exports into the
  custom dir, so NEXT_DIST_DIR=.next-build never protected dev. Fix: `pnpm dev` serves from `.next-dev`
  (NEXT_DIST_DIR), `pnpm build` is a plain export to out/ (then lint both built pages incl. shipped JS, then drop
  out/design and out/poster). Verified: a full build while dev runs leaves dev at 200 with zero errors.
  Labs moved to apps/marketing/labs (axp-labs launch config repointed). Approved foundation token
  `--contexthint-ink` (#c2410c). The landing imports a slim render-only slice `run.landing.json` (no model versions,
  policy names, hashes or IDs in shipped JS; lint checks chunks). Truth, story and design fixes per the list.
  Heights: 1440x900 16,841px = 18.7 screens; 1920 17.0; 1280x800 19.7; 390 25.2. Contrast audit: 0 failures at
  1280/1440/390 (reduced motion, all text). CLS 0. Shots: docs/frontend/reviews/shots/landing-v5-final/ (untracked).

- `axp-landing-v6`: built from reviews/landing-v6-owner.md (highest authority) plus the applicable v5 design-critic
  items. Hero: v4 card-stack motion restored exactly; the only change is the H1 / "Behind one Sponsored card"
  hand-off (copy out by 0.10, line in from 0.10), checked frame by frame 0 to 1 in 0.05 steps at 1280/1440/1920
  (single clean cut, no overlap); at 1600px and up the chat top-aligns with the H1; the status line carries the
  "Settled on Solana Devnet, view on Explorer" link and clears the 1280x800 fold. New order: hero, three pillars
  (ContextHint vermillion, Jev ink/ultramarine, Solana purple), the dark stage (the shutter now opens inside the
  pinned plate and lifts as a wipe, so it costs no extra 100vh; narrower copy column for the board), ContextHint in
  one section (scale words only, label above the wall, moat line, Visit ContextHint), Jev (one real ClearVault
  judgment: inputs, Jev's relevance / intent / creative with confidence, the capped 0.004 bid, "Built with Jev by
  TypeSafe"), Solana payment channels in #9945FF (two lanes, the channel meter completes when its centre reaches 60%
  of the viewport, static end state below 900px, Devnet block with per-channel Open / Close / Channel explorer
  buttons and the program link, all URLs read by extract-specimens.mjs with asserts), Inside the MVP (four framed
  captures in public/tour/, a list beside one large frame on desktop, a swipe row on phones), compact Proof (counts
  sentence, verify and Devnet links, video, one real / illustrative / not-shown panel), ultramarine closing with
  "Agents advise. Code decides the money." folded in (phones show only the final chat). Dropped: why-now, rule
  wall, payments band, next, dot sort, niche dive, country chart, funnel (brand-book copy kept in copy-book.ts).
  lint-copy fails the built landing on any exact ContextHint count (read from library.ts and the run's screened
  slice, both formats) and on percentages other than Jev confidences. Approved foundation change: the 8 PolySans
  @font-face rules moved from steel.css to design-system/foundation/fonts.css (exported as
  @axp/design-system/fonts.css); product-ui still loads all faces via next/font. Mono figures now PolySans tabular;
  the wall's "Ad" tag is #5d5d5d (AA). Heights (static build): 1440x900 10,880px = 12.1 screens; 1280x800 12.8;
  1920x1080 11.2; 390x844 13,678px = 16.2; reduced motion 1440 12.7. Zero console errors, failed or off-origin
  requests, horizontal overflow or contrast failures (1440 and 390, all text); CLS 0; LCP 60 to 92 ms (H1).
  Shots: docs/frontend/reviews/shots/landing-v6-final/.

- `axp-landing-v7`: complete rethink per reviews/landing-v7-owner.md and the coordinator's must-keep list.
  Main run is now the LIVE Solana Devnet run (artifacts/v3-devnet-live-rehearsal; extract-specimens.mjs reads
  it with its own asserts: 11000 paid / 29000 refunded, price competition, one tie, frequency cap, no-fill;
  Explorer links from its chain evidence; AXP_LANDING_RUN overrides). Sections live in src/v7/: Hero (the
  Exchange Wall from hero-lab A, then a pinned dive that lands the tile at exactly 1x on whole pixels and lays it
  into six painted plates: 2D matrices, rounded translation, no will-change, no 3D at rest, checked at 1x and
  2x), How (four plain numbered steps with specimens over a dim order-book tape; slogan as tagline), the three
  pillar chapters ContextHint (vermillion, "the intelligence platform for ChatGPT ads", scale words, real ad
  wall labelled first), Jev (one real judgment sheet, fixed rule, code sets the amount, built with Jev) and
  Solana (purple world, channel told in four steps, live Devnet Explorer buttons), Tour (2x captures of the live
  MVP, bento), Proof (four numbers, Verify, video, a "what's real" disclosure, now/next with planned marked),
  Closing (ultramarine, the wall returns), Footer. One continuous story: Tone.tsx drives a single fixed colour
  layer that blends every seam in OKLCH (sections go transparent), and the live question travels through the
  pillar chapters as a token (evidence, judged, settled). Prospectus now uses the Ledger v2 radius scale and
  shadow levels (--px-r-*, --px-shadow-*), header tones ch and sol; /design is the v7 brand book. v6 scenes,
  sections, copy and the hero-lab routes are removed (src/hero-lab components kept).
  Measured (dev, headless Chrome): 1440x900 12.3 screens, 1280x800 12.5, 1920x1080 12.2, 390x844 13.9,
  reduced motion 10.3; about 450 words of copy (header and footer included, figure labels excluded); zero
  console errors and failed requests; no horizontal overflow; contrast AA at 1440/1280/390 and reduced motion;
  CLS 0 (dev and static export). Shots: docs/frontend/reviews/shots/landing-v7/.

- `axp-landing-v7.1` (patches on v7, from reviews/final-fixes.md items 3 to 8 and the MUST/should items of
  reviews/final-design.md; item 2, the video and its caption, belongs to the video agent, 664b402):
  - Truth: the Jev sheet shows Jev's own confidence for all three answers (creative 61%, not the chosen
    creative's 81% probability; `creativeConfidence` extracted) with one bar per row sized to the number
    beside it; the MVP's Decisions stage shows the same words and numbers for the same decision. Meta
    description says live on Solana Devnet. Proof carries "Replay of a live Solana Devnet run, Oct 1."
    (date from the run). Solana: a "Circle Devnet USDC" Explorer button (mint asserted by
    extract-specimens.mjs into devnet.json `mintUrl`), lede "so ads costing a fraction of a cent can be paid
    per delivery", planned list without "Advertiser wallets". Step 3 reads "kept out by a fixed rule".
  - Motion and seams: the Solana step follows the scroll position from mount (no finished diagram before
    the pin, no reset). Tone.tsx computes the layer's OKLCH blend itself and sets `--tone-o` per world from
    the contrast between that world's type and the colour behind it; copy marked `data-tone-text` (section
    heads, Solana proof, Tour head, Proof column and pills, closing) fades below ~2.3:1, full from 3.5:1.
    The tagline keeps a stage-colour backing. The token hides over `[data-visual]`/`[data-token-avoid]`.
    The closing is the last world: its wall fades before its edge, its foot blends into the footer's paper;
    the footer keeps its own paper outside the tone layer. How's four cards share subgrid rows (equal tops
    at 4 across). Chapter labels have no numbers. Jev section 82svh (gap to Solana 432 to 333px at 1440),
    sheet fills about twice as fast. Hero pin 294vh: `warpHero` plays the lone-tile stretch (v 0.27 to
    0.40) 2.5x faster; every other phase keeps its pace per pixel (frames checked at 1440).
  - Inside the MVP: the four 2x captures retaken from the MVP v7 static export (scratch script tour.mjs:
    1440x900 DPR 2, verify after tamper, cwebp -q 82).
  - Checked (static export on :3411, headless Chrome): 1280/1440/1920/390, motion and reduced motion: zero
    console errors and failed requests, no overflow, every header/hero CTA and all 29 section links are the
    top element under their centre (wrapped links: any line box). Heights 12.0/11.9/11.6/13.6 screens
    (reduced motion 10.3/9.9/9.5). Shots: docs/frontend/reviews/shots/final-fixes/L-*.png.
  - Not done (nice-to-have): the overlapping voucher cards, the flat "Open the MVP" tour tile.

## Next
- Phones are 16.2 screens; the hero's static plate list and the Jev / Proof blocks are the remaining length.
- The stale untracked folder docs/frontend/reviews/shots/landing-v5-builder can be deleted by hand.

## Notes
- Dev: `pnpm --dir apps/marketing dev` (:3410). Verify in own tab, not tab-1 (the owner views :3410 there).
- Dev serves from `.next-dev`; builds compile into `.next` and export to `out/`. They no longer collide.
- Run order: mobile no-fill ran first (by exchange completion); page uses story order.
