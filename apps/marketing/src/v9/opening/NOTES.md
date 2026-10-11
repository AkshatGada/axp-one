# The opening (hero and the opened card): builder notes

Status: V3 level-up done, three capture rounds. Files: `Hero.tsx`, `hero.module.css`, `Plates.tsx`,
`plates.module.css`, `index.tsx` (unchanged), this file. Concepts kept: the wall with one tile
lifted off it, then the dive into that tile and the stack of six plates on a dashed route.

## What changed

Hero
- The floating tile is larger (404px wide at 1440, was 322) so its words read at first glance, has
  a cast shadow on the wall, breathes a few pixels at rest and follows the cursor with the wall.
  It is now the page's own placement from `v9/story.ts` (the "compare" question, the app's answer,
  HarborKey's approved words), so it is the same conversation the next scene opens on.
- Its story plays once on load: it rises off the wall, the question is asked, the answer arrives,
  three bids fly in, the card lands, "Delivered". About 3.4s, then every child drops its animation.
- Load order: the headline is readable in the first frame (words only settle upward, no mask
  hiding them, no opacity), then lede and buttons, while the wall comes up out of the paper and
  the camera settles. The note fades in last.
- Headline a step larger (5.8vw). The fog is a clean paper field exactly behind the copy, so no
  tile text shows through the headline at 1280, 1366 or 1440.
- Wall: tiles have a soft cast shadow as well as the hard edge, two to four answer lines, and the
  clearing has rhythm: irregular gaps, sometimes two almost together, and about one in six is a
  question that takes no ad (one pulse looks, the slot stays empty). Pauses off screen, in hidden
  tabs and while the camera moves; the wall is not drawn at all once it has faded out.
- Buttons: lifted shadow, hover rise, pressed state, visible focus ring (scoped to the hero).
- Removed words: the "Product flow illustration." caption (`HERO.focalNote`), the card's domain
  line, "Sponsored slot" is now just "Sponsored". "Illustrative questions and bidding." stays.

The pinned scene
- 240vh (was 294vh). Travel 140vh (was 194vh). At 1440x900 the hero section is 2160px (was 2646).
- No time warp any more; one plain timeline (see the header comment in `Hero.tsx`). The landed
  tile no longer sits alone on paper for a stretch: it lies down almost at once and the line
  arrives with it. The plates open one after another with a slight settle. The hold at the end
  is about 14% of the travel.
- Hand-off (new): once the pin releases, while the stage scrolls away, the six plates gather back
  into one deck with the Answer plate on top, resting where the last plate was. It costs no pin
  length. The deck is the last thing of this scene on screen and sits directly above the next
  scene's reply tile as that scene rises. The stack centre moved to 66% of the width for this.

Plates (all six redrawn; very few words; fluid, so the same plate works at 480x210 and upright)
- Answer: the question bubble and three quiet lines.
- Card: the Sponsored label, the advertiser and its approved words, complete (not cut).
- Auction: two lanes, each bid inside a marked ceiling, the placed one in ultramarine. No amounts.
- Agents: four advertisers with a tick and "Fits" or a dash and "Passes". Words, never scores.
- Context: the advertiser's declared capabilities and the app's rules, as chips, from `story.ts`.
- Payment: ticks for accepted deliveries adding to one bar, "Running total" and "Settles when the
  campaign closes". No figures, no test wording. The settlement file import and `usdc` are gone.

Phones and motion off
- Below 900px: copy, then a band of the same wall (drifting, clearing) fading at both ends with
  the tile resting on it at full width, the note, then the line and the six plates upright, one
  under the other, on the same dashed route. They settle in one by one when they enter the view.
  The horizontal strip that was cut off is gone. No sideways scroll at 390 or 820.
- Motion off at 900px and wider: the still hero (tile in its floating pose, card delivered), then
  the line beside the still open stack.

## Measured (dev server, headless Chrome)
- Pinned length: 294vh before, 240vh after.
- LCP element: the H1 at 1440, 1366, 1280 and 1024. At 390 Chrome reports the lede paragraph
  (it did before as well, I believe, since each headline word is its own inline block; not checked
  against the old build).
- Console errors: none from this scene. Layout shift 0 at 1440.
- Frame times while resting and while wheel scrolling through the pin at 1440: no frame over 20ms
  in headless Chrome. Not measured on a real laptop GPU.

## Local wording (proposals; all in `Plates.tsx` `W`, none in the frozen copy)
"Fits", "Passes", "Placed", "its ceiling", "Advertiser", "AI app", "Running total",
"Settles when the campaign closes".

## Copy proposals for `v9/copy.ts` (not edited)
- `HERO.focalNote` and `HERO.slotLine`: the first is no longer used; the second ("Answer, then one
  Sponsored slot") is still in the tile's bar on wide screens and could go too.
- `HERO.appName` is "Example chat". The story's app is "Tidewater"; using it in the tile's bar
  would tie the hero to the app chapter. Left as is because the copy file is frozen.
- `STACK.note` ("What sits behind a placement.") repeats the line above it. Could be dropped.
- Plate note for Agents could be just "judge fit" (the picture shows fit only).

## Requests to the integrator (seams)
- The deck ends at about 66% of the width, above the next scene's reply tile. If the Moment's
  specimen column moves, `sx` in `Hero.tsx` (`vw * 0.66`) is the one number to change.
- `Rise` on the Moment lifts it 56px while the deck is still gathering; it reads well. If the
  Moment's top padding is reduced, check the deck does not touch its "The moment" label
  (clear in my captures at 1440 and 1280; the gap was not measured).
- The header is not mine; it hides on the way down, which keeps the pinned scene clear.

## Known issues and things not done
- The dashed route is mostly hidden behind the plates on wide screens (they nearly touch at
  laptop heights), as before. It shows in the gaps only.
- The story data says nothing about which other advertisers fit the "compare" question. The
  Agents and Auction plates show HarborKey and KeyArc fitting and ClearVault and ColdNest passing;
  that is my illustration, consistent with the story's other moments but not stated in it.
- While the tile lies down its text is squashed for a moment (as before); it is crisp but not
  pretty. It lasts about 13% of the travel.
- Safari and Firefox not checked. Touch devices checked only as an emulated 390 and 820 viewport.
