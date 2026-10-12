# 00 Cover: builder notes (V5)

## What it is
One screen (100svh, min 600px), no pin. The 3D wall of AI conversations carries the picture on its
own; the headline, deck and two actions sit bottom left on clean paper; the bottom edge is plain
paper (owner round 3: no caption, no hairline; the shift opens with its own rule). Nothing is lifted off the wall (owner change, 12 October).

## Files
- `index.tsx` re-exports `Hero.tsx` (client, default export, no props, section id="top").
- `hero.module.css`, `questions.ts` (the orchestrator's mixed list of wall questions).
- Imports only `../kit` (Action, TextLink, useReduced), `../copy` (COVER), `./questions`,
  `motion/react`. Nothing from v9 or v10.

## Decisions
- Headline: `COVER.h1` in the `x-h1` face at a cover size, clamp(44px, min(5.9vw, 10.4vh), 112px);
  `COVER.accent` in ultramarine via `em`. One plain text block, so it is reliably the largest
  paint. Opaque from the first frame; it only settles 16px.
- A tile is one object: the question, answer lines and, on 14 of the 35 tiles, a Sponsored card
  attached below the answer INSIDE the same sheet. Three cards near the reader (bike lock,
  booking software, hardware wallet) have the "Sponsored" tag at 12px and one readable line,
  kept in `questions.ts` as `WALL_AD_LINES`; the other eleven are a small tag and quiet bars.
  No card stands alone between tiles.
- 11 cards are in place at first paint. The other 3 arrive in turn: the card settles in below the
  answer (opacity and a few pixels), stays about 16 seconds and fades; one starts every 1.7 to 3
  seconds if a tile is free. A tile waiting for its card keeps the card's space, so nothing in the
  wall ever moves in layout.
- Review round: the tick and the two gutter lines are removed. The event is only the card
  settling in.
- Clear zone: a paper field behind the copy block, wider up and to the right at heights of 820px
  or less, so no tile sits behind or touches the headline. Tiles within 170px of the copy block
  are never chosen for a placement.
- Loop is seamless: tiles carry their own bottom margin and both halves of a track are identical.
- Pauses: `data-paused="1"` on the section when it is off screen or the tab is hidden.
- Motion off: no animation; the wall at rest with all 14 cards in place (no tile waits).
- Phones (below 900px): copy, then a band of the wall filling the rest of the screen (min 292px),
  fading into the paper. `min-height: 100svh`.
- Focus: the page-wide ring from `v11.css` shows on both actions.

## For the orchestrator
- With the masthead transparent at the top, nav labels sit over faint wall tiles. I raised the
  paper wash over the top 7 percent of the cover; the tiles there are still faintly visible.
- Layout shift measures 0 on clean loads. In dev, a Fast Refresh triggered by anyone's edit
  causes a small shift (about 0.02); it follows the "[Fast Refresh]" console line every time.

## Not checked
- Headless Chrome only. Frame rate not measured. Hover states and the cursor lean not captured.
- Widths other than 1440, 1366, 1280 and 390.
