# B. The advertiser's side: notes (V3)

## The idea
The question and one picture. Left: HarborKey's brief, its declared capabilities as a column of
chips on the card's edge. Centre: four conversation tiles (the hero wall's atoms), each slot
holding its verdict. Right: the approved Sponsored card with a seal on its corner, the two limits
drawn as bounds ending in a wall, the pause switch. Lines run from each capability to every
question that asks for it, and from the approved card to the slot it fills.

It plays. Entering the view it performs once, in story order (about 3.3 s): the brief and its
declarations land; the tiles arrive with empty slots; the lines reach out, a pulse along each;
the verdicts land; the seal is stamped on the card; a pulse runs from the card to the joined tile
and the card arrives there; the bounds are drawn and the wall closes. After a beat it demonstrates
the one move that proves the idea: the Bitcoin chip is pressed for the reader, its line turns
solid, a pulse travels, the tile turns to "May join" (and a dotted line from the approved card
reaches it), it holds, then Bitcoin is taken back and the tile returns. Then the Bitcoin chip
gives three soft rings and the reader has control. Any pointer press or key press on the scene
ends the demonstration for good. With motion off there is no performance: it rests complete.

## What changed from V2, and why
- The scene performs and demonstrates itself; in V2 the reader had to find the Bitcoin chip.
- A tile now turns when its pulse arrives (the tiles follow a short delayed copy of the state).
  In V2 the slot blanked the moment the chip was pressed.
- Lines have craft: 2px round strokes on half pixels, the bundle through the gap opens out so each
  line has its own socket on the tile's edge, sockets are drawn over the cards so lines plug in,
  undeclared lines are dotted with a hollow socket, a ruled-out line ends in a stop bar short of
  the tile, the pulse is a soft tail with a bright head. Pointing at or focusing a chip or a tile
  thickens the related lines, runs a light along them, fades the rest and outlines the other end.
- Approval is an object: a seal sits on the card's corner and lifts off the moment a word changes
  (the card turns to a dashed draft, an ink pulse runs to the tile, the small card withdraws);
  approving stamps it back and the card returns to the tile.
- Spend: the budget bound ends in a wall; pause drains colour from the brief, the chips, the
  field, the card and every line, so the whole picture visibly stops.
- The opener is composed with the picture (question left, the one line right) and the section is
  about one laptop screen instead of 1.2 to 1.4.
- Phones have a real form of the picture: the chips stand in a column beside a single column of
  tiles, so the lines are drawn there too and a tap and the tile it turns share a view. The joined
  tile sits last, directly over the approved card, joined by a short riser.
- Fewer words: no actor labels, no "wants" bubbles, no hint line, shorter questions, "Approved"
  and "Edit" (its accessible name is "Change a word").

## Numbers
- Section height: 882px at 1440x900 (0.98 screens), 842px at 1280x800 (1.05), 864px at 1366x768
  (1.13), 1519px at 390x844 (1.80). Two-zone layout from 760 to 1239: 1034 to 1122px.
- Visible words at rest on desktop: about 124 in the scene; about 99 in the specimen, of which
  the approved ad is 18 and the action link 4.

## Decisions
- `<Scene id="advertisers" tight>` with my own header (v8 type classes). `tight` is my choice to
  reach the height target; the integrator may prefer to control the seam.
- The conversations HarborKey wants (`ADVERTISER.contexts`) are no longer shown: they were the only
  part of the brief that connected to nothing. Easy to restore inside the brief card.
- Captions are the four frozen beat titles, small and quiet; the beat bodies are not shown.
- Short questions and reasons are local (local.ts).
- Geometry is measured after hydration (wires.ts) and re-measured on resize. Without JS there are
  no lines, but every tile, verdict, word and setting is in the server HTML.
- The demonstration changes real local state silently (no live region announcement, no focus
  move). If the reader interrupts while Bitcoin is declared, it stays declared and Reset appears.
- Keyboard: chips are `button[aria-pressed]`, pause is `button[role=switch]`, Edit becomes Approve
  in place; after Reset focus returns to the first chip. One hidden `role="status"` announces each
  change made by the reader.
- Nothing pins or sticks. No numbers except the two settings.

## Files
`index.tsx` (scene wrapper and opener, server), `Surface.tsx` (the specimen, client), `wires.ts`
(line geometry), `local.ts` (local microcopy and decision rules), `advertiser.module.css`, this
file.

## Copy proposals (not applied; shared files untouched)
- `ADVERTISER_SIDE.beats[].v` are unused here.
- If "Approved" should read "Approved, word for word" again it fits on the row at 1440 only.

## Kit requests
None needed. Optional: a mini `SponsoredCard` (tag, name, one line) since the one in the tile is
local.

## Known issues and not checked
- Checked in the lab route only (/v3/lab/advertiser/), not inside the full /v3/ page; the
  performance starts when 22 percent of the viewport height is past the scene's top edge.
- At 1440x900 in the lab the whole section is under one screen, so the performance runs with the
  scene fully in view; in the full page its start depends on scroll position.
- On phones the mini card in the joined tile shows the Sponsored tag and a line, not the name.
- Reasons reachable only by removing two capabilities wrap to two lines in the slot.
- The seal overhangs the wrap's right edge by 13px on desktop (no page overflow).
- The bounds drawing hard codes the 1 to 5 ratio of the two settings.
- Not checked: a real screen reader, Safari and Firefox, real touch devices, the production
  build, the copy lint script (a manual grep for dashes and its terms is clean).
