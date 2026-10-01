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

## Next
- Step 4: hero Exploded Card motion, pinned ~320vh (tag `axp-landing-v2`).
- Step 5: Shutter + Stage, payments meter, Library Dive, RunSheet, closing, film mode.

## Notes
- Dev: `pnpm --dir apps/marketing dev` (:3410). Verify in own tab, not tab-1.
- Run order: mobile no-fill ran first (by exchange completion); page uses story order.
