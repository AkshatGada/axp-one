# The opening (hero and the opened card): builder notes

Status: V3 level-up done, then the V3.1 review fixes (see the section at the end). Files: `Hero.tsx`, `hero.module.css`, `Plates.tsx`,
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

## Local wording (all in `Plates.tsx` `W`, none in the frozen copy)
"Fits", "Sits out", "Placed", "its limit", "Advertiser", "AI app", "Running total".

## V3.1 fixes (one pass, from the two reviews)
1. Beams never cross words. Wall bids are now two short vertical lines that run in the gutters
   beside a tile and meet at its slot; the old horizontal and long vertical beams are gone. The
   floating tile's bids run inside its own side padding (clipped to the tile), so nothing leaves
   it. The clearing also keeps 130px away from the copy block. A paper field sits exactly behind
   the copy block (`.copyIn::before`), so the headline, lede and buttons are clean at every size.
2. The wall note has a paper backing with a soft edge.
3. Plate words: "Sits out", "its limit". Plate names 23px (were 19), notes 16.5px, body labels
   15.5 to 17.5px. Cut: the two blocked categories on the Context plate, "Settles when the
   campaign closes" on the money plate. The money plate follows the new copy ("Charge"); its
   picture is accepted deliveries adding to one bar labelled "Running total". The words payment
   and paid appear nowhere (only the frozen copy key `payment` in code).
4. The kit's `<Illustration still />` sits once under the line in the pinned version and once
   under the heading in the still and phone versions. `STACK.note` renders nothing when empty.
5. The deck: it gathers during the first 44% of the exit and has faded out completely by 62%,
   which is before the next scene's specimen is in view at 1440, 1366 and 1280. No sliver.
6. Phones: the plates are compact and tucked one under the other (answer lines, inner card
   shadow, the route and spare padding removed). They start as one closed deck and open downward
   when they enter the view. Six plates: 895px (the review measured about 1,500). The whole
   opening at 390: 2311px (was 2795). Space after the last plate inside this scene: 20px. The
   rest of the gap before "The moment" is that scene's own top padding (integrator).
7. The dive is one move: the tile comes down from the top right to where the stack will sit
   (66% across), the wall is gone by 0.33 and the line arrives from 0.31, as the tile lands.
8. Pre-filled wall tiles no longer carry "Delivered"; on a live clearing the mark shows for
   about 1.5s (was about 3.5s). The floating tile keeps its own.
9. "Separate from the answer" is dropped; a plain hairline divides the answer from the slot.
   `HERO.gap` is now unused.

Pinned length is unchanged at 240vh.

## Copy proposals for `v9/copy.ts` (not edited)
- `HERO.focalNote` and `HERO.gap` are no longer used. `HERO.slotLine` ("Answer, then one
  Sponsored slot") is still in the tile's bar on wide screens and could go too.
- `HERO.appName` is "Example chat". The story's app is "Tidewater"; using it in the tile's bar
  would tie the hero to the app chapter.
- Plate note for Agents could be just "judge fit" (the picture shows fit only).

## Requests to the integrator (seams)
- The stack and the landing tile sit at 66% of the width: `cx` and `sx` in `Hero.tsx`.
- On phones the gap before "The moment" is now that scene's top padding plus 20px of mine.

## Known issues and things not done
- The dashed route is mostly hidden behind the plates on wide screens, as before.
- Which other advertisers fit the "compare" question is my illustration, not in the story data.
- While the tile lies down its text is squashed for a moment (as before).
- At 390 Chrome reports the lede paragraph as the LCP element, not the H1.
- Around u 0.25 to 0.31 the wall is nearly gone and the line has not started, so the tile is
  briefly on faint paper. Short, but not zero.
- Safari and Firefox not checked. Touch devices checked only as emulated 390 and 820 viewports.
- The phone deck's opening animation was not captured frame by frame.
