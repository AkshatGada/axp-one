# 02 One question: the film (builder notes)

## The idea (revision 1)
A framed screen, the full width of the page, holds one continuous world: the Tidewater conversation
(a white plate, the question set in display type), three readers beside it (each advertiser's agent
as a named sheet holding its own copy of the question), and below the readers the receipt. The
reader's scroll is the clock and the camera. Each beat has its own framing of that world and the
camera travels between them: close on the question as it is typed and sent; back as the answer
writes; across to bring the readers in beside the conversation; in on the slot as the card lands;
down to the receipt; and one wide look at the whole world for the coda. A one-line headline above the
screen changes by word with each beat; a five-step strip below it fills as the film plays (each step
is a button to its beat).

Everything an advertiser touches happens beside the conversation, never in it. The only thing that
crosses is the labelled card: it comes out from under the reader that fits, crosses the gap, and
lands in its own slot below the answer.

Beats
1. Asked. Close on the plate. The question is typed, large, in the box, then sent: it moves to its
   place and becomes the first line of the conversation.
2. Answered. The camera pulls back; the answer writes itself word by word. The frame is cut just
   below the answer, so the slot is never seen empty (on narrow frames, where the slot is in view,
   it is a drawn outline from this beat on).
3. Judged. The camera travels across; a line leaves the question; three readers arrive. A pass of
   ultramarine light crosses each reader's copy of the question; the words its judgment rests on
   light up. The two that sit out resolve first, each with its reason, and go quiet. HarborKey's
   three phrases light one at a time with its three reasons, then its judgment turns on: Fits.
4. Placed. The camera pushes in on the slot and holds still. The slot's outline is drawn and warms
   to ultramarine as the card comes out from under HarborKey's sheet, crosses, presses into the slot
   and settles; a ring opens around the word Sponsored.
5. Recorded. The camera drops to the receipt, which comes down out of its slot at reading size: it
   confirms the insertion, and its two sides (Advertiser: Charge accepted; AI app: Earnings accrued)
   latch one after the other. Two statements side by side; nothing moves between them.
Coda. The camera pulls back to the whole world. The first conversation lifts away; the other
question is asked and answered; a pass of light crosses each reader and every one sits out; the slot
stays an empty outline ("No ad. The answer stands alone."); where the receipt was, an empty outline
("No receipt."). The strip replays only its first three steps.

## Revision 2 (V5, 12 October 2026): calmer, shorter, no coda, no controls
Everything above describes revision 1. What changed:
- The coda is gone. `FILM.coda`, `NO_AD`, the second thread, the "No ad" slot, the "No receipt"
  outline, the readers' second layer and the sixth still are all removed. The film is five beats
  and rests on the receipt; `timeline.ts` has no state that takes anything away again, so progress 1
  is the whole story at rest.
- No controls. The strip is a plain mark (`div`/`span`, `aria-hidden`; the captions carry the same
  five beats as text). No button, link, tabindex, hover state or pointer cursor anywhere in the
  movement. The scroll is the only clock.
- Stage length: 3.6 (360vh) at every width, down from 4.6. Beats begin at 0, .167, .357, .595, .81.
- Quieter: the card travels level (no tilt), lands without the press and settle, and no ring opens
  around the label; its travelling shadow is neutral, not blue. The readers rise half as far. The
  pass of light is fainter, and fainter and shorter still on the two readers that sit out, which
  resolve quickly and go quiet (45 percent). The camera's slow drifts are smaller. The slot's
  outline is drawn only as the card sets out (on phones it used to stand empty from beat 2).
- Phone (below 1000px): the screen's em is set so the plate is 94.5 percent of the screen's width
  and every framing is drawn at scale 1; nothing is set below 1.56em (13.4px at 390). The two
  readers that sit out are short sheets (name, verdict, one reason); only HarborKey holds the
  question. The receipt's two sides are stacked. The placed framing shows the whole conversation
  when it fits; the recorded framing is HarborKey's sheet with the receipt below it, centred.
- Small sizes raised on wide frames too: the app's kind line, the answer's byline and the card's
  label are .8em (were .66, .72, .68), so the label is 13px or more at 1366 and 1280 in beat 5.
  In the stills the readers' row is .7em and the fit's reasons 1.14em (they were 11.7px).

Verified in revision 2 (lab route and /v5/, system Chrome headless, scripts in the scratchpad):
- 1440x900, 1366x768, 1280x800, 390x844: answer text, layout box and every word box identical at
  progress .36, .45, .59, .68, .725, .74, .76, .8, .9, .99; on-screen box identical at .725, .74,
  .76, .8 (camera still while the card lands); card top below answer bottom; 37 samples of the
  flight, 0 overlaps with the answer or the two other readers.
- Forwards and backwards give identical geometry, variables, beat and camera at 21 of 21 positions.
- 0 interactive elements, 0 pointer cursors, no horizontal scroll, no console errors.
- Smallest text on a 390 phone: 13px (the strip's labels and the Illustration note); inside the
  world 13.47px (the answer's byline, the card's label, the receipt's side labels).
- Motion off: five stills, smallest text 13.5px at 1440 and 390.

Known and not checked (revision 2)
- At 0.45 (readers arriving) the sheets show a name and question with the verdict area still blank
  for a short stretch; it is a passing state, not a rest.
- On wide frames beat 5 leaves the lower left of the screen empty (card top left, receipt right).
- Below 390 wide the plate still fits the screen but type scales with it (about 12.4px at 360).
- Not tried on a real phone, Safari or Firefox; no frame-rate measurement; tablet widths not captured.

## How it is built (revision 1 text; lengths and the coda are superseded above)
- `timeline.ts`: one pure function, progress (0 to 1) to every value of the picture.
- `camera.ts`: one pure function, progress to a framing (world point at the screen's centre, and a
  scale). Framings are fitted to the measured boxes of what they show, so they hold at any size.
  Wide and narrow frames have their own list of framings over the same world.
- `FilmStage.tsx`: measures the world with every transform switched off (on mount, on resize, when
  fonts are ready), then on each scroll change writes the timeline's values to custom properties on
  the frame and the camera's transform to the world. CSS draws with transform and opacity only.
  Discrete states (the judgment switch, the receipt latches, the lit step) are React state that
  changes only when a threshold is crossed.
- The world is laid out once at its closest size and is only ever drawn at that size or smaller
  (scale at most 1), so text is never enlarged. The world has no `will-change`, so the browser
  rasters it at the scale it is shown.
- Sizes inside the world are in em: the plate is 38em wide and the screen sets one font-size.
- Narrow frames (below 1000px): the same world and timeline; the type is set larger against the
  plate, and the camera takes one subject at a time (plate, readers, slot, receipt).
- Motion off and the server render: six stills in normal flow, drawn with the same parts.
- Stage length: 4.6 (460vh), all widths.

## Decisions and proposals for shared files
1. The phrases each reader's judgment rests on are a local table (`CARES` in `parts.tsx`):
   HarborKey "hardware wallet", "keys offline", "Solana" (one per reason, in the order of
   `AGENTS[0].why`); ClearVault "hardware wallet"; ColdNest "Solana". They are words of the frozen
   question; the pairing with reasons is mine. Move to `story.ts` if you want it frozen.
2. HarborKey's `why` ("A device, offline keys, Solana") is split at the commas into three reasons.
3. Wide frames: the readers stand in a row to the right of the plate, in the order of `AGENTS`, with
   the row's foot level with the end of the answer; HarborKey is nearest the plate, so its card
   drops straight down to the slot's level and crosses the gap with nothing in its way. The
   receipt's place is directly below HarborKey, level with the slot, so beat 5 frames the card and
   its receipt side by side. Narrow frames: the readers are stacked (HarborKey last) with the
   receipt below. They resolve in the order ClearVault, ColdNest, HarborKey.
4. The coda looks at the readers first (all three sit out), then at the conversation with the
   nearest reader and "No receipt." beside the empty slot.
4b. Small labels not in `copy.ts`: "Ask anything" (the composer's placeholder, hidden from assistive
   tech), "Sits out" as a capitalised verdict. The coda reason is `MOMENTS[learn].why`, shown on
   each reader.
5. In pinned mode the title "Follow one question." is shown in the caption's place until the film
   starts, and the flow header is hidden while motion is armed. With motion off the header is a
   normal `x-h1` above the stills.
6. The screen's ground is the foundation's second paper (`--paper-2`), inside a hairline frame.
7. The kit card is used as is; inside the world its paddings and type are restated in em (in
   `film.module.css`) so it stays in proportion to the conversation at every size.

## Verified (12 October 2026, lab route and /v4/, system Chrome headless)
- By script at 1440x900, 1366x768, 1280x800 and 390x844: the answer's text, its layout box and
  every word's layout box inside the plate are identical at progress 0.3, 0.45, 0.5, 0.612, 0.64,
  0.672, 0.8 and 0.83; its on-screen box is identical at 0.612, 0.64 and 0.672 (camera still while
  the card lands); the card's top is below the answer's bottom; over 35 samples of the flight the
  card never overlaps the answer or another reader.
- Scrolling backwards gives the same geometry, opacity and variables for every element (13 of 13
  positions, 1440 and 390).
- No horizontal scroll, no console errors, no failed or off-origin requests. Anchor load lands with
  #question at the top. Enter on a step scrolls to its beat. Typecheck clean; no dashes; copy lint
  reports nothing for this folder.

## Known issues and things not checked
- The world is drawn at a scale below 1 in most framings (0.6 to 0.96 on wide frames, 0.81 on a
  390 phone), never above 1. Sharpness was checked at 2x on the placed beat only.
- While the camera travels between framings, sheets are cut by the screen's edge (as in a pan).
- In the coda's final wide framing only the nearest reader is in view beside the conversation; the
  other two are shown sitting out in the framing just before.
- On a 390 phone the reasons and receipt captions are small (about 10 to 11px on screen).
- Not tried on a real phone, in Safari or Firefox; no frame-rate measurement; tablet widths
  (768 to 1024) were not captured in this round.
- The kit judgment switch animates on its own clock when its threshold is crossed.
