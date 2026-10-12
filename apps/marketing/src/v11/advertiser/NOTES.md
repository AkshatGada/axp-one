# 03 For advertisers: notes (V5)

## What it is
"You set the terms." One calm section: the chapter mark, the heading at `x-h2`, four equal parts on
the twelve columns (three columns each) under ink hairlines, and the one action, left aligned. No controls: the only focusable element is the action link.

Each part is a verb in `x-h3`, its one frozen line, and one small figure. All four figures share
one box (`--fig-h`, 156px on laptops), one ink, one hairline, white sheets on paper, and one
ultramarine accent.

1. **Describe.** The offer on a small white sheet; the four listed things settle out from under it
   as ink tokens.
2. **Approve.** The kit `Ad` (size "s") with the approved words; a small ink seal with a tick lands
   across its lower edge, and the card takes the press.
3. **Limit.** The money figure of section 05, small: an ink baseline carrying a row of ultramarine
   blocks, an ink bracket over the newest ("Most per placement"), an ink wall the row stops short
   of ("Total budget"), and two ink bars as the pause mark. No numbers. Sized in `cqw`.
4. **See why.** A small page (grey answer lines, the card below them in ultramarine) with a leader
   from the card to "Fits" and the film's reasons (`AGENTS[0].why`).

## Files
- `index.tsx` (server): the layout. `Figures.tsx` (server): the four figures. `Seen.tsx` (client):
  an `<article>` that sets `[data-seen]` through kit `useInView`. `advertiser.module.css`.
- V4's `Describe.tsx`, `Approve.tsx`, `Limit.tsx` were removed (they are in git and in `v10/`).

## Decisions
- The still state is the default CSS. `Seen.tsx` holds its own copy of the `v11/rule/useEntry.ts`
  logic and sets `data-entry` on each part: "wait" only while the part is below the screen with
  motion on, "play" only when a scroll brings it in by its edge (lower 70% of the screen), and
  nothing at all (whole, at rest) on any jump: anchor link, already on screen, reached from below,
  or landed well inside the screen in one step. Stricter than the rule copy: a jump never plays.
- CSS keyframes play once (`backwards` fill), transform and opacity only. No loops.
- Laptops: the four parts stagger by column (110ms). Two columns and phones: no stagger.
- Rows share a CSS subgrid so verbs, lines and figures align when a line wraps.
- Text floor 13.5px for everything I set (tokens, labels, reasons). The kit card's body is raised
  to 13.5px from this folder (`.approve .card p`); its "Sponsored" tag stays at the kit's 10.5px.
- The seal carries no word (`role="img"`, `aria-label="Approved"`).
- 1041px and wider: four across. 641 to 1040px: two by two. 640px and narrower: stacked.

## Measured (lab route, after the review fixes)
- Heights: 1440x900 753px (0.84 screens), 1366x768 756px (0.98), 1280x800 732px (0.91),
  390x844 1194px (1.41).
- Visible words: 83. Focusable elements in the section: one, the action link.
- Abrupt arrival (top, middle, from below, anchor) at the four sizes: every part on screen is
  whole at +60ms. Stepped downward scroll: the parts play.
- No horizontal scroll, no console errors from this section, no failed or off-origin requests.

## Not checked
Safari and Firefox (subgrid and `text-wrap: balance` are relied on), real touch devices, a screen
reader by ear, widths between 641 and 1040 (two by two) by capture, no-JS rendering by capture.

## Proposals for shared files
None.

## Owner pass (less text)
The "Illustration." line is gone (owner decision). Figures are a little larger (box 196px, money tile 50px, offer 15.5px, page thumbnail 124px). The "See why" line states the principle and the figure shows one concrete reason, so both stay. Words: 82.
