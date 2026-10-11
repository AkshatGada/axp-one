# B. The advertiser's side: notes (V3.1)

## The idea
The question and one picture. Left: HarborKey's brief, its listed capabilities as a column of
chips on the card's edge. Centre: four conversation tiles, each led by its verdict. Right: the
approved Sponsored card with a seal on its corner, two labelled limits, the pause switch.

The connection has its own lane. Every chip has a short stub into one trunk beside the chips. One
branch leaves the trunk for each question that depends on what is listed, and enters that tile on
its left edge at mid height: solid when everything it needs is listed, dotted when something is
missing, and ending on the tile's edge in a stop mark where the question rules a listed capability
out. An unlisted chip's stub is dotted and stops short of the trunk. A second line runs from the
approved card to the slot it fills. The far column of tiles is dropped by half a tile, so each far
tile's mid height is a clear lane between (or below) the near tiles: one line per lane, nothing
bundled.

It plays. Scrolled into view, it performs once, left to right, in about 2.9 s: the brief; the chips one by one; the
tiles; stubs, trunk and branches drawing out; the three "Left alone" verdicts one after another;
the approved card and its seal; a pulse from the card and the card arriving in its tile with
"Appears here"; the limits and the wall. After a beat it lists Bitcoin for the reader (the pulse
travels chip, trunk, branch, tile; the tile turns to "Would appear"), holds, takes it back, and
gives the Bitcoin chip three soft rings. A pointer press, a key press or focus inside the scene
ends this for good. With motion off nothing plays and the scene rests complete.

## When the entry starts (fix after the integrated pass)
Nothing waits invisibly. The staged entry starts once a quarter of the specimen (or two fifths of
the screen) has scrolled into view. If the specimen is first seen already well inside the screen
(a jump, a flick, an anchor link, coming back up from below), or a second passes with any of it on
screen and the entry not started, the complete resting state is shown at once with no animation.
The demonstration keeps its own stricter condition (72 percent of the tile field in view, 92 on a
phone) and simply does not play if that is never met. In the lab route the scene is in view on
load, so it shows the resting state at once and then the demonstration; the staged entry is seen
by scrolling to it.

## V3.1 changes (from the two reviews)
1. Wires: stubs, one trunk, one branch per tile entering at mid height; a lane of 60px or more
   between brief and field (the chips overhang 14px into the 72 to 100px column gap); the blocked
   line ends on the tile's edge with its stop mark; orthogonal runs with rounded corners, on half
   pixels. The same construction on phones, in a 44px lane between a chip column and a tile column.
2. Entry is staged left to right over about 2.9 s (it was about 15 things in 750ms) and waits
   until the specimen is well into view.
3. Verdicts are the largest type on a tile (16.5px display, coloured by outcome); the question is
   a small quiet bubble. Words: "Appears here", "Left alone", "Would appear", "Held". Reasons:
   "No device wanted", "Learning, not choosing", "Bitcoin not listed", "Paused",
   "Awaiting approval". "Declared" is gone from the visible and spoken copy ("listed").
4. Edge states: with more than one thing missing the reason is "Not what you offer"; single
   reasons use short names ("Device not listed", "Offline keys not listed"); slots never grow.
5. Money: no currency and no figures. Two labelled limits, "Most per placement" and "Total
   budget", drawn as a short span between two walls inside a long span that ends in a heavy wall.
6. Pause uses the page's rule switch (`.v8-sw` with `data-on`) on my `button[role=switch]`.
7. The heading uses the shared `v8-q` size.
8. Phones: chips are small outlined pills (not filled slabs); the performance and the
   demonstration wait until nearly the whole field is in view, so the Bitcoin chip and its tile
   share the view.

## Numbers
See the report for measured heights and words (they are re-measured each round).

## Decisions
- `<Scene id="advertisers" tight>` with my own header (v8 type classes).
- `ADVERTISER.contexts` and `ADVERTISER.limits` are not shown (the limits by instruction).
- Short questions, verdict words and reasons are local (local.ts).
- Geometry is measured after hydration (wires.ts) and re-measured on resize. Without JS there are
  no lines, but every tile, verdict, word and setting label is in the server HTML.
- The tiles follow a copy of the state that updates when a pulse arrives (about 0.6 s), so cause
  and effect read as one event. Pause, resume and reset are immediate.
- The demonstration changes local state silently (no live region announcement, no focus move). If
  interrupted while Bitcoin is listed, it stays listed and Reset appears.
- Keyboard: chips are `button[aria-pressed]`, pause is `button[role=switch]`, Edit (accessible name
  "Change a word") becomes Approve in place; after Reset focus returns to the first chip. One
  hidden `role="status"` announces each change made by the reader.
- Nothing pins or sticks.

## Files
`index.tsx` (scene wrapper and opener, server), `Surface.tsx` (the specimen, client), `wires.ts`
(line geometry), `local.ts` (local microcopy and decision rules), `advertiser.module.css`, this
file.

## Copy proposals (not applied; shared files untouched)
- `ADVERTISER_SIDE.beats[].v` are unused here.
- story.ts reasons say "declared"; this scene now says "listed". If the page should use one word,
  pick it in story.ts.

## Kit requests
None needed. Optional: a mini `SponsoredCard` (tag, name, one line).

## Known issues and not checked
- Checked in the lab route only (/v3/lab/advertiser/), not inside the full /v3/ page.
- The learning tile has no branch (it is not about the offer), so it is the one tile no line
  reaches; its reason says why.
- On phones the mini card in the joined tile shows the Sponsored tag and a line, not the name.
- The seal overhangs the wrap's right edge by 13px on desktop (no page overflow).
- Not checked: a real screen reader, Safari and Firefox, real touch devices, the production
  build, the copy lint script (a manual grep for dashes and its terms is clean).
