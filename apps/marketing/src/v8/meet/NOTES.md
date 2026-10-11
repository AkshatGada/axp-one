# D. Where they meet, and the doors: notes

## The idea
Three things, one card, one receipt with two sides, two doors: 3 to 1 to 2.

**Where they meet** is drawn as a literal meeting. The advertiser's limits arrive from the left, the
app's rules from the right, the fit from above, and the Sponsored card sits where the three lines
join. Left stays the advertiser's side and right the app's side all the way down the page: the
receipt's left half is the advertiser's, its right half the app's, and the doors below keep the
same order.

The difference between rules and judgment is carried by form, never by a caption:

| | Fixed rule (advertiser's limits, app's rules) | Judgment (the fit) |
|---|---|---|
| Shape | ruled white plate, hard offset shadow | soft ultramarine shape, dotted edge |
| Switch | square latch, ink | round, ultramarine |
| Line into the card | solid ink | dotted ultramarine |
| Word beside the switch | Within limits / Within rules | Judged a fit |

The line from the card down to the receipt is solid ink: money follows the fixed lines only. The
frozen sentence `MEET.rule` is then set as the legend of the drawing: "Agents judge fit." under a
dotted ultramarine stroke, "Fixed rules decide money." under a solid ink stroke.

**The receipt** is a small slip under the card: a head (title and `RECEIPT.confirms`), a
perforation with a bite out of each edge, then two halves (Advertiser: Charge accepted; AI app:
Earnings accrued). No amounts, no bars, nothing moves toward anyone. `RECEIPT.later`,
`RECEIPT.limit` and the proof link sit beside it as three plain lines.

**Two doors** is the same anatomy at the largest scale on the page: one ultramarine object on the
paper with a head, a perforation with bites, and two sides. The head holds the wall again (my own
quiet echo built from the kit `Tile`, not the hero's `Wall`): white tiles at low contrast, and one
tile fully lit, which is the page's own placement (the compare question with HarborKey's card),
back in its place among the others. The two sides are the two doors.

## Interaction
Each of the three agreements is a native checkbox with `role="switch"` (Tab to reach, Space to
toggle; the whole plate is the label and click target). Releasing any one: its line breaks to a
grey dash, the card is replaced by a dashed "No card." with a one-sentence reason, and the receipt
becomes "No card, no receipt. Nothing is charged and nothing accrues." A visually hidden polite
live region announces the same. Local state only; labelled with the kit `<Illustration />`.
Server-rendered in the agreed state, so the still and no-JS views are complete.

## Motion
Meet, once on entering: the three lines reach the card, the card lands, the ink line drops, the
slip follows (about 1.5s in all, CSS animations gated on `html[data-px-motion="on"]`). State
changes cross-fade. Doors, once on entering: the wall rises 46px into place and the lit tile
comes up from dim. Nothing pins; with motion off or reduced motion everything is final.

## Decisions
- Centred opener (`Scene center`): this scene is symmetrical by meaning, and the change from the
  wide left-aligned chapters before it is the "small, precise" change of scale the plan asks for.
- Own wall instead of `Wall` from v7/Hero: it lets one tile be the story's placement, renders on
  the server, is static, and avoids pulling the hero module in again.
- If `DEVNET_URL` is null the link and its label are both omitted (the label has no referent
  without the link).
- The "also" links live in the foot of the panel so the panel is the terminal object.
- Door focus: the door turns white with a 3px ink ring inset; the two quiet links get a white ring.

## Text density (owner feedback, second pass)
Words are captions. Each agreement shows its name, a switch and a two or three word state. The
frozen `MEET.agree[].v` sentences are not shown; they stay in the DOM as the switch's accessible
description (`aria-describedby`). The receipt shows only its title, `RECEIPT.confirms` and the two
states; `RECEIPT.advertiser.note` and `RECEIPT.app.note` are not shown (their content is already in
`RECEIPT.later`). The "Fixed rule" / "A judgment" tags, the second void sentence and the "Or look
first:" lead-in were removed. Rough words visible at rest on desktop: meet about 117 (opener 15,
the Sponsored card itself 19, later/limit/proof 40, everything else 43); doors 36.

Release and restore play in order: the line breaks, the card fades out, "No card." fades in, then
the slip empties (and the reverse). The outgoing and incoming texts never overlap.

Narrow layout: one column as a chain. Each agreement hands its own line (ink or dotted) to the
next thing down, ending in the card, then the slip.

## Local microcopy (meet/local.ts)
"Switch one off." / "Within limits", "Outside limits" / "Within rules", "Outside rules" /
"Judged a fit", "Judged not a fit" / "No card." / "The budget is used up." /
"The app has no open slot." / "The moment does not suit the offer." / "No card, no receipt." /
"All three agree. The card exists." (live region only) / twenty illustrative wall questions
(dimmed, `aria-hidden`).

## Copy proposals
- `MEET.agree[].v` could be cut to two or three words each if the integrator wants them visible
  again (for example "Offer, words, budget", "Open slot, right category").
- `RECEIPT.later` (19 words) is the longest line in the scene; a shorter frozen version would help.

## Kit requests
- None required. A shared visually hidden class would save each builder writing one.

## Known issues and things not checked
- In the lab route the specimen is in view at load, so with motion on it can paint final for an
  instant before the entrance plays (MotionRoot arms motion after hydration). Not expected on the
  full page, where this scene is far below the fold; not verified there.
- The wall's lit tile is tilted text and is decorative (`aria-hidden`); it is legible on desktop
  but not meant to be read.
- Not checked: the integrated /v2/ page, `pnpm build`, the full copy lint on built output, Safari
  and Firefox, a real screen reader, touch hover behaviour on the doors.
- If `DEVNET_URL` is null the link and its label are both omitted.
