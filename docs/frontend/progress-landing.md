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

## Next
- 1280x800 is still 19.7 screens (pinned scenes scale with vh, content does not); the 8 stale @font-face rules in
  steel.css need a foundation split (fonts.css) to delete; product-ui has the same export distDir trap.

## Notes
- Dev: `pnpm --dir apps/marketing dev` (:3410). Verify in own tab, not tab-1 (the owner views :3410 there).
- Dev serves from `.next-dev`; builds compile into `.next` and export to `out/`. They no longer collide.
- Run order: mobile no-fill ran first (by exchange completion); page uses story order.
