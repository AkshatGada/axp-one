# 03 For advertisers: notes (V5)

## What it is
"You set the terms." One calm section: the chapter mark, the heading at `x-h2`, four equal parts on
the twelve columns (three columns each) under ink hairlines, one quiet "Illustration." line, and
the one action, left aligned. No controls: the only focusable element is the action link.

Each part is a verb in `x-h3`, its one frozen line, and one small figure. All four figures share
one box (`--fig-h`, 156px on laptops), one ink, one hairline, white sheets on paper, and one
ultramarine accent.

1. **Describe.** The offer on a small white sheet; the four listed things settle out from under it
   as ink tokens.
2. **Approve.** The kit `Ad` (size "s") with the approved words; a small ink seal with a tick lands
   across its lower edge, and the card takes the press.
3. **Limit.** A ceiling and a wall in ink, each named ("Most per placement" above the ceiling,
   "Total budget" at the foot of the wall). Two soft ultramarine bodies move up and across and are
   cut flat where they meet the ink. No columns, axes, figures or currency.
4. **See why.** A small page (a question mark of grey, three answer lines, the card below them in
   ultramarine) with a leader from the card to "Appears" and the reason from `MOMENTS`. Only the
   placement that appears is shown.

## Files
- `index.tsx` (server): the layout. `Figures.tsx` (server): the four figures. `Seen.tsx` (client):
  an `<article>` that sets `[data-seen]` through kit `useInView`. `advertiser.module.css`.
- V4's `Describe.tsx`, `Approve.tsx`, `Limit.tsx` were removed (they are in git and in `v10/`).

## Decisions
- The still state is the default CSS. Motion is armed only under `html[data-px-motion="on"]` and
  only until a part is `[data-seen]`; then CSS keyframes play once (`animation-fill-mode:
  backwards`) and everything rests. Transform and opacity only. No loops, no state, no listeners.
- On laptops the four parts enter together and stagger by column (110ms). At two columns and on
  phones each part plays as it arrives, with no column stagger.
- Rows are shared with CSS subgrid so verbs, lines and figures align across the row when a line
  wraps (it does at 1366 and 1280 for "See why").
- The question itself is not printed in "See why": with it the section was 96 words. It is drawn
  as a grey mark; the reader has just followed that question in movement 02.
- The seal carries no word. It is `role="img"` with `aria-label="Approved"`.
- 1041px and wider: four across. 641 to 1040px: two by two. 640px and narrower: stacked.

## Measured (lab route)
- Heights: 1440x900 737px (0.82 screens), 1366x768 740px (0.96), 1280x800 716px (0.89),
  390x844 1241px (1.47). The page seam adds its own space above.
- Visible words: 85 (innerText of the section, including "03" and "Illustration.").
- Focusable elements in the section: one, the action link.
- No horizontal scroll, no console errors, no failed or off-origin requests at the four sizes.

## Not checked
Safari and Firefox (subgrid and `text-wrap: balance` are relied on), real touch devices, a screen
reader by ear, widths between 641 and 1040 (two by two) by capture, no-JS rendering by capture.

## Proposals for shared files
None.
