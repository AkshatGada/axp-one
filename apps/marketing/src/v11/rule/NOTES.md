# 05 The rule, and the doors: builder notes (V5)

## Arrangement: (a)
The rule is set on PAPER (ink type, ultramarine for the judgment line and its marks). The doors panel
(the V3 design) is the page's one large blue object. Nothing blue is full bleed, so
`data-masthead="blue"` and `data-on-blue` are gone from this movement.

## What it is
- `section#rule` (kit `Chapter`, with its mark "05 The rule"): the manifesto, the figure, the receipt.
- `section#start` (a sibling, rendered from `rule/index.tsx`): the doors, from `../doors`.
- Manifesto: two lines at the x-h1 scale, one 2px ruled line between them. "Agents judge fit." is
  Wide light in ultramarine with a round stop; "Fixed rules decide money." is the heaviest weight in
  ink with a square stop (set at .82em so both lines sit in the measure on one line each). No hold,
  no scroll travel: it sets once as it enters view (soft words rise, the line is ruled, the rule
  words are set with 90ms cuts), about 1.6s, and rests. On phones each sentence takes two lines.
- Figure (kit `Fig`, caption "Illustration."): three holds on the left, the kit `Ad` on the right.
  Each hold has its name (`k`), its `state` words with a small mark, and a bar that runs to the card
  and bites its edge: two rigid ink bars with square heads (rules), one ultramarine bar with a round
  head (the fit). Beneath, across the measure, the receipt: `RECEIPT.confirms`, the proof link (label
  inside the link, new tab, omitted when `PROOF.href` is null), "Charge accepted" and "Earnings
  accrued" side by side with no arrow or motion between them, and the two lines of small print.
- No controls. No switches, no release, no auto demonstration, no "no card" outcome, no live
  region. The only focusable element in `#rule` is the proof link.
- Entrance (once, about 2.4s): the card is there from the start, sitting loose (1.3 degrees off);
  rule one snaps on, rule two snaps on, the fit settles and the card comes square; then the receipt
  sheet arrives and is written top to bottom. Then nothing moves.

## Files
- `index.tsx` server entry: `Chapter#rule` then `Doors`.
- `Manifesto.tsx`, `Figure.tsx` client (only for the entrance hook); all copy is in the server HTML.
- `useEntry.ts` the entrance hook (also used by `../doors/Seen.tsx`).
- `keep.tsx` keeps a hyphenated word ("self-custody") on one line inside the approved words. The
  characters are unchanged.
- `rule.module.css`.
- `../doors/Doors.tsx` (server), `Wall.tsx` (client: drift on and off), `Seen.tsx`, `local.ts`
  (wall questions only), `doors.module.css`.
- Removed: `Spread.tsx`, `rule/Doors.tsx` (the V4 sheet and the V4 doors).

## The entrance hook (`useEntry`)
`data-entry` is absent (whole, at rest), `"wait"` or `"play"`. It is absent on the server, with
motion off, when the element is already on screen at load, when the reader reaches it from below,
jumps past it, or lands on it in one step (anchor, fast flick). It is `"wait"` only while the element
is below the screen with motion on, and `"play"` when it scrolls in from below (or after 700ms partly
on screen). All motion is CSS animation with `both` fill that ends in the base style, so the resting
state is the stylesheet's default and can not be missed. Transform and opacity only.

## Doors: what changed from V3
- Imports: kit `Ad` and `Arrow`, `DOORS` from `v11/copy.ts`, `QUESTION` and `ADVERTISER` from
  `v11/story.ts`. Tokens: `--x-blue`, `--x-paper`, `--x-ink`, `--x-r-xl`, `--x-shadow-blue`,
  `--x-ease`, `--x-out`. `x-wrap` for the frame.
- Heading on the x-h1 scale (was a little larger). Head of the panel a little shorter, and capped by
  the viewport height, to keep the movement inside its length.
- The small tiles are drawn locally. A dim tile is a question and answer lines only: the V3 dashed
  empty "Sponsored" slots are gone (the page does not show empty slots), and so is the V3 effect in
  which other tiles resolved now and then. The wall only drifts, at about half the V3 speed, runs
  only while the panel is in view, and is still with motion off.
- Underlines that grew by `background-size` now grow by `transform` on a pseudo element; colour
  changes on the door are cuts. The leaf, the white behind it, the label swap, the ink focus ring
  inside the opened door and the white ring on the quiet links are as in V3.
- Each door line with two sentences breaks between the sentences.
- Wall questions: three had a number word or a budget; reworded (texture, aria-hidden).
- `local.ts` lost the V3 switch copy.

## Heights (lab route, motion on; `#rule` top to `#start` bottom)
- 1440x900: 1894px, 2.10 screens (rule 982, gap 108, doors 804 with a 761 panel).
- 1366x768: 1720px, 2.24 screens (rule 896, gap 102, doors 722).
- 1280x800: 1715px, 2.14 screens (rule 897, gap 96, doors 722).
- 390x844: 2131px, 2.52 screens (rule 1175, gap 56, doors 899).

## Proposals for shared files
- kit `Ad`: a `white-space: nowrap` on hyphenated words (or `text-wrap: pretty`) would avoid
  "self-" at a line end everywhere; I do it locally with `keep()`.
- `PROOF.label` carries a date; fine inside the link, noted only because the page is otherwise
  dateless.

## Known compromises
- Phones: the three bars end at the right edge of the list and the card sits directly below; they
  do not touch the card as they do on laptops.
- Phones have no hover, so a door opens only while pressed (and on keyboard focus).
- The lab route has 70vh above the movement, so at 1440x900 the manifesto is already on screen at
  load and is simply whole there; its entrance shows on `/v5/`.
