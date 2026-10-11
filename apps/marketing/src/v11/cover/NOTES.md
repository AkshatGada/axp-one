# 00 Cover: builder notes (V5)

## What it is
One screen (100svh, min 600px), no pin. The 3D wall of AI conversations carries the picture on its
own; the headline, deck and two actions sit bottom left on clean paper; the bottom edge is a
hairline and the note. Nothing is lifted off the wall (owner change, 12 October: the large lifted
conversation card was removed, with its load story, shadow, pose and measurements).

## Files
- `index.tsx` re-exports `Hero.tsx` (client, default export, no props, section id="top").
- `hero.module.css`.
- Imports only `../kit` (Action, TextLink, useReduced), `../copy` (COVER), `@/hero-lab/data`
  (PROMPTS, the illustrative questions), `motion/react`. Nothing from v9 or v10. `../story` is no
  longer needed here because the lifted tile is gone.

## Decisions
- Headline: `COVER.h1` in the `x-h1` face (PolySans Wide, light, tight) at a cover size,
  clamp(44px, min(5.9vw, 10.4vh), 112px); `COVER.accent` in ultramarine via `em`. It is one plain
  text block (no per-word spans), so it is reliably the largest paint. With per-word inline
  blocks the deck sometimes won the LCP on phones.
- The headline is opaque from the first frame and only settles 16px. Deck, actions and foot fade
  in after it. The wall fades up out of the paper over 1.2s.
- A wall tile is a sheet (question and answer lines). A Sponsored card is its own small sheet
  BELOW the answer sheet, at the wall's scale and tilt. 17 of 35 tiles can receive a card; 7 hold
  one at first paint. Tiles without a card are simply conversations: no empty slot, no label.
- A placement: two thin ultramarine lines run in the gutters beside the tile (gutters hold no
  text), the card settles in below the answer, a small ink tick confirms, the card stays about ten
  seconds and fades. One starts every 1.3 to 2.4 seconds. Tiles under the headline, the masthead
  or the foot are never chosen.
- The confirmation is a wordless tick. `COVER` has no word for it and I did not add copy.
- Calmer than V3: drift is about a third slower, no rings or flashes, no "no ad" beat, smaller
  cursor lean (about 2 degrees, mouse only).
- Loop seam fixed: tiles carry their own bottom margin and the two halves of each track are
  identical, so the -50% loop is exact (V3 had a small jump every loop).
- Pauses: `data-paused="1"` on the section when it is off screen or the tab is hidden. That stops
  the drift, any running placement and the scheduler.
- Motion off (`data-px-motion` not "on", or prefers-reduced-motion): no animation at all; the
  wall at rest with its seven first-paint cards.
- Phones (below 900px): masthead clearance, headline, deck, both actions, then a band of the wall
  that takes the rest of the screen (min 292px), then the hairline and note. `min-height: 100svh`
  so a short phone grows instead of crushing the band.
- Focus: the page-wide ring from `v11.css` (2px ultramarine, 3px offset) shows on both actions.

## For the orchestrator
- `COVER.note` says "Illustrative questions, brands and bidding." The cover now shows no brand
  names (the wall cards are a Sponsored tag and quiet lines). The note is still true, but "brands"
  could go.
- The wall questions come from `@/hero-lab/data` PROMPTS, as the brief allowed. A few mention a
  price ("under $300 a month") as part of a question.

## Not checked
- Headless Chrome only (no Safari, no Firefox, no real phone).
- Frame rate not measured.
- Widths other than 1440, 1366, 1280, 390 (plus one look at 768 and 1600).
- Hover states and the cursor lean were not captured.
