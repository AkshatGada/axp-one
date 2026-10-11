# 05 The rule, and the doors: builder notes

## The idea (after revision round 1)
One ultramarine sheet rises over the paper with rounded shoulders and widens to the full bleed. On
it, three lines at full measure: "Agents judge fit." across the top (PolySans Wide light, words
bloom on springs, a round stop that breathes), a hairline, then "Fixed rules decide money." on the
floor of the frame in two lines (PolySans Bulky, faint until each word is set with a hard cut, a
square ink stop). Then one figure: three large holds, each a bolt that runs to the Sponsored card
and bites into its edge (two square ink bolts that slam, one round white bolt that settles and
breathes). Release any one and the card does not exist; "No card, no receipt." takes the receipt's
place at display size. Then the ending: "Start from your side." and two tall doors, closed
ultramarine with a strip of paper light under them; on hover, focus and press the paper comes up
through the door, and that paper is the footer that follows.

## Files
- `index.tsx` server entry: `Chapter id="rule"` (bare) around the spread.
- `Spread.tsx` the sheet, the rising ground (scaleX by scroll), `data-on-blue`, `data-masthead="blue"`.
- `Manifesto.tsx` my own hold (120vh, not the kit `Stage`): live and still versions of the lines.
- `Figure.tsx` the three holds, the card, the receipt, the proof link, the auto demonstration.
- `Doors.tsx` `section id="start"`: heading, two quiet links, two doors.
- `rule.module.css` everything visual.

## Decisions
- Arrival: the blue is a cap one screen tall with rounded shoulders that rises with the scroll and
  widens from 84% to the full bleed (scaleX on a plain colour layer, scroll driven).
- Manifesto: a hold of 120vh (20vh of pinned travel). The soft words bloom on springs early in the
  rise; the hairline, "Fixed" and "rules" are set late in the rise, and "decide", "money" and the
  square stop in the short hold, each with a 90ms linear cut. Unset rule type shows at 20%. Sizes
  are set by the width (full measure) and capped by the height. On phones the judgment takes two
  lines and each rule word takes a line.
- The two full stops are drawn shapes (round white, square ink); the real "." stays in the DOM at
  font-size 0, and the heading carries the whole sentence in aria-label.
- I keep my own hold. It is armed in CSS from `html[data-px-motion="on"]`.
- Figure: each hold is one `button role="switch"` (words plus bolt); a visually hidden
  `role="status"` line speaks each change using frozen copy only. Rule releases cut; the fit
  release dissolves. The receipt is `inert` and hidden while it does not exist, and the statement
  (`RULE.none`) owns that space; the card's place keeps a dashed outline.
- Auto performance: three come to hold (about 1s), card, receipt written; after 3.4s the fit is
  released, 2.3s later it returns; then nothing runs. Pointer down, key down or focus inside the
  figure stops it for good. If the reader jumps past the figure, or reaches it from below, it is
  simply whole (no performance, no transitions).
- Receipt: no arrows between the sides, no amounts, no motion from one side to the other. Small
  print is 14.5px ink (13.5px on phones). The proof link sits in the receipt head with its label
  inside the link; omitted when `PROOF.href` is null.
- Doors: one `a` each, half the measure and 58vh tall (stacked, 37vh each, on phones). The paper
  layer is a clipped copy of the content (aria-hidden) that rises with a counter translate.
  Focus shows a white ring outside and a blue ring inside the opened door.
- Dropped in round 1: the small switches, the thin wires, and the two rails from the receipt to the
  doors (they cost a third of a screen of dead space).

## Heights (lab route, motion on, after round 1)
- 1440x900: 2579px (2.87 screens): hold 1080, figure 693, doors 743.
- 1366x768: 2241px (2.92): hold 922, figure 621, doors 644.
- 1280x800: 2312px (2.89): hold 960, figure 635, doors 661.
- 390x844: about 2790px (3.3): hold 1013, figure about 850, doors 892.

## Proposals for shared files
- (Round 1: the orchestrator reports the two kit items below fixed, and the masthead now follows
  `data-masthead="blue"`, which is set on my sheet. Kept here for the record.)
- kit `Stage`: it calls `useScroll({ target: ref })` while rendering the `flow` branch, where the
  ref is not attached. I saw one load (1366x768, dev) throw "Target ref is defined but not hydrated"
  and leave the stage progress dead for that page view. I could not reproduce it in six further
  loads, so I am not certain of the cause, but mounting the measured wrapper in both modes removes
  the possibility. Separately, `Stage` changes height at hydration (flow to pinned), which moves
  everything below it and makes anchors land short; arming the height in CSS from
  `html[data-px-motion="on"]` avoids that.
- Masthead: when it returns on scroll up over this movement it is a paper bar over ultramarine. A
  blue-aware variant (or keeping it hidden inside `[data-on-blue]`) would be cleaner. Not mine.
- kit `Ad`: `.adName` has no colour of its own, so it inherits white inside a white-on-blue parent.
  I set ink on my own wrapper class; a colour on `.ad` in the kit would be safer for others.

## Known issues
- Dev only: the capture log sometimes lists an aborted `?_rsc=` request for the lab route. It
  appears when the dev server recompiles under other builders' edits; my code makes no requests.
- The ink square full stop and ink latches are about 2.8:1 against ultramarine. They are marks, not
  text, and every state is also written in white words beside them.
- Phones have no hover, so a door opens only while pressed.
- The figure caption is the kit `Fig` caption moved to the top right by CSS; it reads "Illustration."
- On phones the kit `Ad` padding and text size are reduced from my module with `!important` so the
  switches and the card share one view. The card design is otherwise the kit's.
- When a rule bolt is held but another hold is released, that bolt still bites into the empty
  dashed place. I left it: it is what "two of three hold" looks like.
