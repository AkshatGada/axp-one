# 04 For AI apps: builder notes

## The idea
One plate: the fictional assistant Tidewater, whole and at rest, drawn as a white sheet on the paper.
The four ideas are marginal notes that hang from fine leader lines running to the part of the plate
they describe. Two of the notes carry the builder's controls, so the annotation is the control.

- Left margin, at the answer: "Your model" with the scoped independence claim (once, quietly). Its
  leader ends in a bracket along the answer's text.
- Left margin, at the slot: "Your rules" with the rule latch (square ink `.x-sw`): Hardware wallets.
- Right margin, at the slot: "One slot" with a judgment latch (round, ultramarine): An ad fits.
- Right margin, off the card's foot: "You earn" with the accrual seal and the outcome in words.

The proof of independence is physical. The Sponsored card (kit `Ad`) stays in the flow of the slot
whether it is shown or hidden, so the slot keeps its exact place and the answer cannot move. When the
slot empties, four hairline corner ticks mark the reserved place, and a small "= Unchanged" mark
appears beside the answer's bracket for a moment.

## Files
- `index.tsx`: the chapter, heading, close line and action (server component).
- `Plate.tsx`: the figure, the performance and the two controls (client component).
- `apps.module.css`: all styles.

## The performance
Stages on `.stage[data-stage]`: `still` (server render and motion off: complete, card shown), `pre`,
`write`, `card`, `done`.
1. The answer writes in by word (opacity only) and leader 1 draws.
2. The card rises into the slot; leaders 2, 3 and 4 draw.
3. Confirmation: a small ultramarine token leaves the card's foot and travels the leader to the seal,
   which stamps to ink with a tick, and "Earnings accrued" (story `RECEIPT.app.state`) fades in.
   No figures, no payout language.
4. After a beat the judgment latch turns itself off: the card leaves, the ticks show, the outcome
   reads `APPS.empty`, and "Unchanged" marks the answer. Then it returns and accrues again.
5. The two latches ring once and the plate belongs to the reader.

Any click inside the movement, or any key press, stops it for good (scroll keys pressed outside the
movement are ignored so keyboard scrolling does not cancel a performance the reader has not seen).

## Never empty
- The server render is the whole plate. It is only cleared for the performance by JS, and only while
  less than a fifth of it is on screen. Nothing is hidden by CSS before hydration.
- It enters when 28 percent is on screen (the answer's first line is still below the fold at that
  point at every tested size). This is checked on scroll, before the frame paints.
- A jump (anchor link, flick, coming back up from below) is recognised because it lands well past
  the entry line in one step or with the plate's top above the screen. Then the plate is made whole
  in the same frame (`flushSync`), the writing is skipped, and only the empty slot is demonstrated.
- The kit's `useInView` is the fail safe: if it reports the plate seen but the plate has not entered
  within four seconds (a sliver at the bottom of the screen), the plate is made whole.

## Decisions
- Recomposition below 1180px: margins become too narrow for notes, so the notes move below the plate
  as a two column list and the two latches sit directly under the plate (control and slot in one
  view on a 390x844 phone). The desktop notes and the narrow notes are both in the HTML; one set is
  `display: none` at any width.
- The empty slot shows no words inside the app. The reason ("No ad fits. Nothing is shown." or "Not
  allowed. Nothing is shown.") is in the margin, in the builder's voice, so the app reads finished.
- "Not allowed. Nothing is shown." is my wording for the rule being off (there is no copy for it in
  `copy.ts`). See proposals.
- `Fig. 4` is my guess at the page's figure numbering.
- The section has no top padding of its own (the chapter mark is the top) and `--x-space` below.

## Proposals for shared files
- `copy.ts` `APPS`: add `notAllowed: "Not allowed. Nothing is shown."`, `unchanged: "Unchanged"`,
  and the latch labels ("Allowed", "Not allowed", "An ad fits", "No ad fits") so they are frozen.
- Kit `Fig`: agree the figure numbers across movements.
- Kit `Split` does not pass through data attributes; I put `data-reveal` on the wrapping header.

## Known issues and unknowns
- Visible words outside the app sheet at 1440: 70 counting everything (chapter mark 4, heading 4,
  four notes 27, claim 10, latch labels 6, outcome 2, figure caption 8, code line 5, action 4).
- Laptop fit depends on the masthead being hidden (it is, on scroll down).
- Safari and Firefox were not tested (captures are Chrome only). The margins use container query
  units (`cqw`), which need Safari 16 or later and Firefox 110 or later.
- The dev server sometimes logs an aborted `?_rsc` request for the lab route itself; it is Next's own
  dev behaviour, not a request made by this movement.

## Polish pass (after the orchestrator's review)
- Heading is now the kit `x-h1`, one line across the measure on a laptop (wraps below 1180px).
- The sheet has material: a white leaf with layered shadow and a second leaf under it. Tidewater's
  header has a "New question" control, an avatar and a waterline that drifts; the answer is set in
  the light wide face; the composer has an add control, a blinking caret and a send key. No words
  were added inside the sheet.
- Accrual: an ink tick lands on the card's foot (confirmed), the ultramarine token runs the leader,
  and an ink tab "Earnings accrued" is stamped on the leader's end. When nothing is shown the tab is
  an empty dashed outline.
- Empty slot: the reason is now stated inside the reserved place, in the caption voice, with the
  corner ticks. The margin no longer repeats it.
- One set of notes in the HTML. Below 1180px the plate's wrappers become `display: contents` and the
  plate's parts and the four notes share one grid: the sheet (`.sheet`, a separate element that also
  carries the entry measurement) spans the app's rows, and the notes sit in two columns under it,
  the two that carry a latch first. The earlier "Decisions" line about two sets no longer applies.
- Phone: the accrual tab now sits inside the "You earn" note with room around it.
