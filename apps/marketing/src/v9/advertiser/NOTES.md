# B. The advertiser's side: notes

## The idea (revision 1)
One scene, with the connection drawn. Left, **You** declare: HarborKey's brief, with its declared
capabilities as a column of chips on the card's edge. Centre, **The agent** decides: a small
staggered field of four conversation tiles (the hero wall's atoms). Right, **You** approve and
bound: the approved Sponsored card, the two limits, the pause switch.

A line runs from each capability chip to every question that asks for it: solid ultramarine when
declared, dashed grey when not, ink with a stop mark where the question rules the capability out.
A second kind of line runs from the approved card to the slot where that card appears. So "what
you declared decides what it may join" and "what appears is your approved card" are both things
the reader sees, not infers. A change sends a pulse along its lines and the tile turns when the
pulse arrives: add Bitcoin and its line turns solid, the pulse runs to the Bitcoin tile, the slot
becomes "May join" and a dashed line from the approved card reaches it. Change a word and an ink
pulse runs from the card to the tile, the small card withdraws and the slot says "Awaiting
approval". Pause and every line greys, the card withdraws, the slot says "Paused".

Each tile is the hero atom: a short question, two answer lines, one Sponsored slot. The slot is
the verdict: the small Sponsored card when it joined, otherwise two or three words ("Device ruled
out", "Learning, not choosing", "Bitcoin not declared", "May join"). No chips inside tiles; the
lines carry the requirement. Pointing at or focusing a capability thickens its lines, fades the
rest and outlines the tiles that depend on it; pointing at a tile does the reverse.

## Numbers
- Section height: 1108px at 1440x900 (1.23 screens), 1068px at 1280x800 (1.33), 1076px at
  1366x768 (1.40), 1733px at 390x844 (2.05). Two-zone layout from 760 to 1239: 1170 to 1315px.
- Visible words at rest on desktop: about 156 in the scene (31 in the kit opener, about 125 in the
  specimen including the action link). Previous round: about 220. First draft: about 390.

## Decisions
- Four tiles, not five: compare, mobile, learn, bitcoin (the ones the previous scene uses). The
  staking moment and the "outbid" verdict are no longer shown in this scene.
- Short forms of the story's questions are local (local.ts `ASKS[].short`): "Hardware wallet for
  Ethereum and Solana?", "Best mobile-only Solana wallet?", "How does offline key storage work?",
  "Cheapest hardware wallet for Bitcoin?". The words "Left alone" and "Joined" are no longer
  visible (the slot shows the reason or the card); they are kept for screen readers.
- Layout: three parts in one view at 1240px and up, the field's two columns offset by half a tile
  so lines pass through the gaps. From 760 to 1239 the brief and the field stay wired on top and
  the words, limits and action sit in a row below (no card line there). Below 760 one column: the
  chips sit directly above a 2 by 2 field so a tap and the tile it turns are in the same view;
  there is no room for lines at rest, so only the pulse travels, drawn over the content.
- Nothing is sticky any more (the 250px offset the integrator saw in d1440-bitcoin-on.jpg was a
  real state of the old sticky side columns after the capture script scrolled; it is gone).
- The action link sits at the foot of the right part, which is what brings the section to about
  1.3 screens.
- The limits stay a drawing of two bounds (ceiling inside budget, outlines only).
- Geometry is measured after hydration from layout offsets (wires.ts), re-measured on resize.
  Without JS there are no lines, but every tile, verdict, word and setting is in the server HTML.
- Keyboard: chips are `button[aria-pressed]`, pause is `button[role=switch]`; the edit button keeps
  its place and becomes "Approve"; after Reset, focus returns to the first chip. One visually
  hidden `role="status"` announces each change in a sentence.

## Motion (only when html[data-px-motion="on"])
Entry, once, about 2.5 s (timeline `T` in Surface.tsx): brief; chips pop one by one; tiles arrive
with empty slots; lines fade in and a pulse runs each live line; the verdict words land; the seal
is stamped; a pulse runs from the approved card to the joined tile and only then does that tile
take its outline and its card (this fixes the earlier glitch); the bounds are drawn. State changes
made through a line wait about half a second for the pulse; pause and reset are immediate. With
motion off: final state, instant changes, lines drawn, no pulses. Nothing pins or sticks.

## Frames reviewed
Entry (30 frames), bitcoin-on, solana-off, edit-words, approve, pause, resume at 1440, and
bitcoin-on at 390. Fixed from the frames: the slot turned blue before its pulse arrived (now
waits); the pulse was too faint and short (thicker, 700 ms); the joined outline preceded its
card; entry order of the column captions.

## Files
`index.tsx` (scene wrapper, server), `Surface.tsx` (the specimen, client), `wires.ts` (line
geometry), `local.ts` (local microcopy and decision rules), `advertiser.module.css`, this file.

## Copy proposals (not applied; shared files untouched)
- The beat body sentences (`beats[].v`) are not shown; the titles are the captions.
- If the short questions and short reasons should have one source, add `short` and `shortReason`
  to each moment in story.ts.
- Local labels: "Try adding Bitcoin", "Reset", "Approved, word for word", "Not approved",
  "Change a word", "Approve", "Undo", "Awaiting approval", "Paused", "per placement", "budget".

## Kit requests
None needed. Optional: a mini `SponsoredCard` without body text (the small card in the tile is
local), and a 2-line variant of the tile's answer lines.

## Known issues and not checked
- Checked only in the lab route, not inside the full /v2/ page.
- A long generated reason (for example "Hardware device, Solana not declared", reachable only by
  removing two capabilities) wraps to two lines in the 40px slot.
- At 1366x768 the section is 1.40 screens (the opener and section padding alone are about 0.7).
- On phones the pulse is a straight line drawn over the tiles for about 0.7 s.
- The bounds picture hard codes the 1 to 5 ratio of the two settings in story.ts.
- Not checked: a real screen reader, Safari and Firefox (the pulse uses SVG stroke-dashoffset with
  pathLength, which should be portable), real touch devices, the production build, the copy lint
  script (a manual grep for dashes and its terms is clean).
