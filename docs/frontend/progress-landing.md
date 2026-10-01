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

## In progress
- `axp-prospectus-v2` (coordinator request): /design as an editorial brand book with the real signature components
  (plate stack + scrubber, dark switchboard with beats 1 to 7, HostChat, ChannelMeter, EvidenceChain, niche field,
  RunSheet, Receipt), a Motion section with replays, depth/shape/grid specimens, real content only.
  Components live in `apps/marketing/src/specimens/` and `src/scenes/`, styles in `specimens.css` / `scenes.css`.

## Next
- Step 3: full static page, all sections in order (tag `axp-landing-v1`).
- Step 4: hero Exploded Card motion (tag `axp-landing-v2`).
- Step 5: Shutter + Stage, payments meter, Library Dive, RunSheet, closing, film mode.

## Notes
- Dev: `pnpm --dir apps/marketing dev` (:3410). Verify in own tab, not tab-1.
- Run order: mobile no-fill ran first (by exchange completion); page uses story order.
