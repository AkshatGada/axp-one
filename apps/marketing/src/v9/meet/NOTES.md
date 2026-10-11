# D. Where they meet, and the doors: notes (V3)

V2 lives untouched in `v8/meet/`. This folder is the V3 level-up.

## The idea
Three things, one card, one receipt with two sides, two doors: 3 to 1 to 2. Left is the
advertiser's side and right is the app's side from the specimen down through the receipt, the
transition (`Part`, the integrator's) and the doors.

## Where they meet: a small machine with one living part
The scene plays before it is touched (motion on only):

1. The advertiser's limits slide in from the left, the app's rules from the right. Each throws a
   bolt: a solid ink rod with a jaw that lands on the card's edge with a hard stop.
2. The fit settles in from above, softer and slower, and its dotted line starts to flow.
3. Only then does the card come into being between the three, the ink line drops, and the receipt
   is printed out from under the card in steps.
4. After a beat the scene demonstrates itself once: a cue ring on the first switch, the bolt
   withdraws, the card falls away, the slip is gone ("No card. The budget is used up." /
   "No card, no receipt."), a hold, then it all returns.
5. "Switch one off." appears and the reader has it.

Any pointer, key or focus inside the specimen ends the autoplay for good and puts everything in
place. With motion off (or reduced motion, or no JS) it rests complete and agreed, and nothing
plays. The live region speaks only after the reader has acted, never during the autoplay.

Rule against judgment, felt and not captioned:

| | Fixed rule | Judgment |
|---|---|---|
| Body | white plate, ink border, 6px corners, hard offset shadow, a tick scale | tinted soft shape, dotted edge, breathing |
| Arrives | 380ms, straight in, exact | 820ms, eased, from above |
| Switch | square latch, 90ms linear | round, 460ms with a soft overshoot |
| Line | ink rod with a jaw; thrown in 240ms with a hard stop, withdrawn in 150ms | dots flowing toward the card; fades over 620ms |
| Pressed | plate drops 2px into its shadow | shape gives slightly |

The card: appears by scaling up once the last line holds; when any line lets go it tilts and falls
away. The receipt: printed (translate plus clip, eight steps) and never moved toward anyone.

Words: `MEET.rule` is split and set where it applies. "Agents judge fit." sits beside the
judgment in ultramarine under a flowing dotted stroke. "Fixed rules decide money." sits beside the
receipt in ink under a rod with a jaw. The colophon beside the slip is three quiet lines:
`RECEIPT.later`, `RECEIPT.limit`, and the proof link with its exact label.

Narrow: one column, a chain. The rule sentence sits above the chain; each agreement hands its own
line to the next thing down; the receipt is the last object before the colophon.

## Two doors
- The wall is alive: each column sways a few tens of pixels over 19 to 27 seconds; the page's own
  placement stays lit; every 4.4s another tile resolves (brightens, its slot fills, fades back).
  Sway and resolving stop when the panel leaves the view and never run with motion off.
- The two labels ("Advertisers", "AI apps") are white slips sitting on the perforation: the
  receipt halves from the transition above, landed. They drop in when the panel enters.
- Each side is a door. Hover or keyboard focus swings a leaf inward on its outer hinge (the two
  open from the middle like double doors); the opening is white, the type turns deep ultramarine,
  the label inverts, the action underlines and its arrow advances. Pressed pushes the leaf nearly
  flat. Focus adds a 3px ink ring on the white, drawn above the leaf. The two quiet links take a
  white ring on the ultramarine.
- The perforation with a bite out of each edge is kept.

## Sizes (motion off, lab route)
| Width | Meet opener plus specimen | Meet section with padding | Panel |
|---|---|---|---|
| 1440x900 | 739 | 998 | 783 |
| 1280x800 | 655 | 885 | 703 |
| 390x844 | 1159 | 1303 | 873 |

Visible words at rest: meet 107 (opener 15, the Sponsored card itself 19, colophon 31, rule 7,
everything else 35); doors 36.

## Local microcopy (meet/local.ts)
Unchanged from V2: "Switch one off." / state words / three one-sentence reasons / "No card." /
"No card, no receipt." / "All three agree. The card exists." (live region only) / twenty
illustrative wall questions (dimmed, `aria-hidden`).

## Copy proposals
- None needed. `MEET.agree[].v` stays as each switch's accessible description, not shown.

## Kit requests
- None required.

## For the integrator
- `Part`'s two halves are visible at rest directly under my receipt at 1280x800 and 1440x900, so
  the two states read twice in one view before any scrolling. My receipt is 420px wide from
  1273px up, the same as `Part`'s two 210px halves, so they line up; consider starting `Part`
  invisible until the receipt has left the upper half of the view.
- The door labels are left aligned in each door, not centred under where `Part`'s halves end.

## Known issues and things not checked
- Lab route: with motion on, parts of the specimen are held invisible until the script arms
  (to avoid a flash); if a script failed after motion was armed they would stay hidden.
- On a touch screen the door's open state shows on tap, as hover does.
- At 390 wide the specimen is 949px tall: taller than one phone screen by about 100px.
- Not checked: the integrated /v3/ page, `pnpm build`, built-output copy lint, Safari, Firefox,
  a real screen reader, real touch devices.
