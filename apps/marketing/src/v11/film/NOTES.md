# 02 One question: the film (builder notes)

Current state: revision 3 (V5 after review and the owner's "less text" pass, 12 October 2026).
Revisions 1 and 2 are summarised at the end.

## The idea
A framed screen, the full width of the page, holds one continuous world: the Tidewater conversation
(a white plate, the question set in display type); on one side of it the sheet of the agent that
fits; on the other the receipt. The reader's scroll is the only clock and the camera: nothing can be
pressed. Each beat has its own framing; the camera settles first and the beat's object arrives
after, inside the frame, whole and at its own size. A one-line headline above the screen changes by
word with each beat; a five-step strip below fills as the film plays.

Beats (stage 360vh at every width; beats begin at 0, .167, .357, .595, .8)
1. Asked. Close on the plate. The question is typed, large, then sent to its place.
2. Answered. The camera pulls back; the answer writes itself word by word.
3. Judged. The camera pulls back again: the conversation on the left, HarborKey's sheet on the
   right (name, the question, a round mark, three reasons, all on the sheet from the moment it is
   visible). A pass of light crosses the question; the three phrases light one at a time and each
   reason comes up to full strength with its phrase; the mark fills and the word Fits appears.
   Under the sheet, two muted lines: ClearVault, Sits out; ColdNest, Sits out. No sheets, no reasons.
4. Placed. The camera pushes in on the place below the answer and holds; then the card comes up
   into it (a rise of about one em and a fade), at its final size. No flight, no outline, no ring.
5. Recorded. The camera moves to the pair: the receipt on the left, the answer with its card on the
   right, top and foot level; then the receipt comes up into its place the same way the card did.
   The film ends here; progress 1 is the whole story at rest.

## Words on screen
Kept: the chapter mark (02 One question), the heading, the five captions, the five step words, the
app's name, the question, the answer, HarborKey with Fits and its three reasons, the two muted
lines, the card's own text, the receipt's statement line and two states. Removed: "Illustration",
"A fictional AI assistant", "Ask anything", the step numbers, the receipt's title, side labels and
small print, the reasons of the two that sit out.
Visible words per beat at 1440 (picture / caption / strip / mark): 13/2/5/3, 52/7/5/3, 77/6/5/3,
56/7/5/3, 68/4/5/3. At 390: 13, 52, 37, 67, 28 in the picture. The answer alone is 39 words.

## How it is built
- `timeline.ts`: one pure function, progress to every value of the picture (custom properties).
- `camera.ts`: one pure function, progress to a framing. Framings are fitted to measured boxes.
- `FilmStage.tsx`: measures the world with transforms off, writes the timeline's values to the
  frame and the camera's transform to the world. CSS draws with transform and opacity only. The
  only React state is the lit step.
- `parts.tsx`: Tidewater's furniture, `Reader` (the fit), `Others` (the two muted lines).
- `Receipt.tsx` + `receipt.module.css`: the page's one receipt (see below).
- Wide world: plate 38em at x 0; the agent's column 31em wide to its right (sheet top level with
  the plate's top); the receipt 26em wide to the plate's left, its top level with the answer's and
  its foot with the plate's. The placed framing keeps the receipt's place clear on the left, so the
  move to the last framing is small.
- Narrow world (below 1000px): one column, so the camera only travels up and down: the agent's
  sheet above the plate, the receipt directly below it. Every framing is drawn at scale 1 (0.98 at
  progress 0). Judged shows the sheet with the question under it; the last frame shows the card
  and its receipt together.
- Motion off and the server render: five stills in normal flow, drawn with the same parts.
- The heading is `x-h2` in flow and in the pinned title (same computed size in both).
- The chapter mark is repeated above the caption while pinned (it fades in as the film starts).

## The shared receipt (for section 05)
`import { Receipt } from "../film/Receipt"` (from a sibling folder in v11;
`apps/marketing/src/v11/film/Receipt.tsx`, default export too). No client code. Props, all optional:
`confirms` (the statement line; default `RECEIPT.confirms`), `sides` (two `{ label, state }`;
default the advertiser and app from `story.ts`; both always drawn with a filled mark), `className`,
and three that nobody passes today: `title`, `labels` (show each side's label), `small`.
Sizes are in em: set `font-size` on it or its parent (the film uses 1.3em of its world em on wide
frames and 1.7em on phones). Smallest default text is 1.5em.

## Decisions and proposals
1. The three phrases HarborKey's reasons rest on are local (`PHRASES` in `parts.tsx`): "hardware
   wallet", "keys offline", "Solana". Its `why` is split at the commas into three reasons.
2. The receipt shows no side labels by default (the brief asked for the statement and two states,
   nothing else). Without them "Charge accepted" and "Earnings accrued" do not say whose they are.
   Pass `labels` if that is wanted back.
3. The receipt stands to the LEFT of the conversation on wide frames. On the right it would have to
   share a column with the agent's sheet, which then could not be large.
4. `APP.kind` and `RECEIPT.title/later` in `story.ts` are no longer used by this movement.

## Verified (revision 3; lab route and /v5/, system Chrome headless, scripts in the scratchpad)
- 1440x900, 1366x768, 1280x800, 390x844: answer text, layout box and every word box identical at
  progress .36, .45, .59, .69, .71, .74, .78, .9, .99; its on-screen box identical at .69, .71,
  .74, .78 (camera still while the card arrives); card top below answer bottom; 29 samples of the
  card's arrival: 0 overlaps with the answer or the sheet, 0 drawn smaller than its final size.
- Forwards and backwards identical at 21 of 21 positions. 0 focusable elements, 0 pointer cursors,
  0 switch marks, no step label overflow, no horizontal scroll, no console errors.
- Smallest text 13.5px at every size (the chapter mark and the strip); inside the world on a 390
  phone 13.8px (13.5 at progress 0).
- Motion off: five stills, heading 66.24px at 1440 and 34px at 390 (same as pinned), smallest 13.5px.

## Known and not checked
- While the camera travels between framings, objects are cut by the screen's edge (a pan or push).
  On phones this is now only ever the top or bottom edge.
- At 1440x900 the last frame leaves a band of paper under the pair (the frame is bound by width).
- Phone opening: the question sits just above the middle of the screen; the plate below it is
  still mostly white (its height is reserved for the answer and the card).
- Before the agent resolves, its mark is a hollow ring, the word Fits is not yet shown and the
  three reasons are faint.
- Not tried on a real phone, Safari or Firefox; no frame-rate measurement; tablet widths not
  captured.

## History
- Revision 1 (V4): 460vh, three reader sheets with switches, a card that flew from the reader to
  the slot, a printed receipt with small print, a coda about a question where no ad is placed, and
  step buttons.
- Revision 2 (V5 first pass): coda removed, strip made a plain mark, 360vh, quieter card flight,
  phone type raised to 13px or more.
