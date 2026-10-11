# 04 For AI apps: builder notes (V5)

## The idea
A calm heading and one plate: the fictional assistant Tidewater, whole, drawn as a white sheet on
the paper. The four ideas are marginal notes that hang from fine leader lines running to the part of
the plate they describe. Nothing is a control. The plate plays once as it enters and rests complete.

- Left margin, at the answer: "Your model" with the scoped independence claim (`INDEPENDENCE`, once,
  quietly). Its leader ends in a bracket along the answer's text.
- Left margin, at the slot: "Your rules" with a plain statement of the allowed category: a bare ink
  tick, "Hardware wallets" (`APP_RULES.allow`) and "Allowed" under it. No box, so it does not read
  as a checkbox.
- Right margin, at the slot: "One slot", a plain note.
- Right margin, off the card's foot: "You earn" with the ink tab "Earnings accrued"
  (`RECEIPT.app.state`). Words only, never a figure, never payout language.

## Files
- `index.tsx`: the chapter, heading, close line and action (server component).
- `Plate.tsx`: the figure and its one performance (client component). No event handlers on any
  element; the only listeners are passive `scroll` and `resize` on the window, used to start.
- `apps.module.css`: all styles.

## What changed for V5
- Controls removed: both latches, every click and key handler, the "stop on interaction" logic, the
  live status region and the hand-over ring. The only focusable element is the action link.
- "No ad" removed: the empty slot demonstration, the corner ticks, the reason line, the "Unchanged"
  mark, the dashed empty accrual tab and every not-allowed wording. The card is simply there.
- Heading set at `x-h2` (was `x-h1`), a plain `h2` with no reveal. At full measure `x-h1` was louder
  than the plate and out of step with the movement before it. With no reveal the heading can never be
  caught half built on an abrupt arrival.
- Restraint inside the plate: the three endless loops are gone (the drifting waterline under the
  header, the blinking caret in the composer, the breathing brand mark), so the plate truly rests.
  The answer mark moves only while the answer is being written. The accrual tab no longer scales
  (it was text scaled above its size) and the confirmation tick no longer overshoots; both simply
  appear. The token on the leader is smaller (7px). The card's blue shadow is softer.
- Figure caption is now exactly "Tidewater, a fictional assistant. Illustration." (the "Fig. 4"
  number is dropped; no other V5 movement numbers its figures).
- Section bottom padding reduced (the page seam between movements already adds air).

## The performance
Stages on `.stage[data-stage]`: `still` (server render, motion off, abrupt arrival: complete),
`pre`, `write`, `card` (rest).
1. The answer writes in by word (opacity only) and the bracket and leader 1 draw.
2. At 1.4s the card rises into the reserved slot below the answer; leaders 2, 3 and 4 draw.
3. At about 2s an ink tick lands on the card's foot, a small ultramarine token runs the leader, and
   the ink tab "Earnings accrued" appears at its end. Then nothing moves again.

## The answer never moves
The answer is one element no state touches. The card is in the flow from the first paint (hidden by
opacity and visibility only while waiting), so the slot's place is always reserved. Checked by
script: the answer's text and its box (relative to the sheet) were sampled every frame from before
the first page script through to rest, at four sizes, in the lab and inside /v5/: one value each.

## Never empty
- The server render is the whole plate. It is only cleared for the performance by JS, and only while
  less than a fifth of it is on screen. Nothing is hidden by CSS before hydration.
- It enters when 28 percent is on screen, checked on scroll before the frame paints.
- A jump (anchor link, flick, coming back up from below) lands well past the entry line in one step
  or with the plate's top above the screen. Then the plate is made whole in the same frame
  (`flushSync`, stage `still`, transitions off for that frame) and there is no performance.
- The kit's `useInView` is the fail safe: seen but not entered within four seconds means whole.

## Narrow screens (below 1180px)
One set of notes in the HTML. The plate's wrappers become `display: contents`, the plate's parts and
the four notes share one grid: the sheet spans the app's rows and the notes sit in two columns under
it in reading order (Your model, One slot; Your rules, You earn). The leaders, bracket, token and
the tick on the card's foot are desktop only.

## Proposals for shared files
- `copy.ts` `APPS`: freeze the one word "Allowed" used under the category in the "Your rules" note
  (`RULE.agree[1].state` already has the same word; it could be exported for reuse).
- `index.tsx` passes `className={s.action}` to the kit `Action` with no such class defined. Harmless
  (left as it was).

## Known issues and unknowns
- Safari and Firefox were not tested (captures are headless Chrome only). The margins use container
  query units (`cqw`), which need Safari 16 or later and Firefox 110 or later.
- At 1366x768 the heading, plate and caption fit one view with about 11px to spare when the section's
  top rule is at the top of the screen and the masthead is hidden (it hides on scroll down). After an
  anchor jump the masthead is shown and covers the chapter mark (a page matter, not this folder).
- On a phone the accrual tab is in the "You earn" note under the plate, below the first view, so its
  arrival is usually not seen; the note is complete by the time the reader reaches it.
- While sibling folders were being edited the dev server returned 500 at times and once swapped
  fonts mid run (hot reload). Not reproduced in later runs; not caused by this folder.
