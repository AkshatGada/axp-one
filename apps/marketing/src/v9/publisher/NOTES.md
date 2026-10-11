# Scene C, "The app's side": builder notes

Status: built, checked at 1440x900, 1280x800 and 390x844, motion on and off. Not committed.

## Revision 1 (integrator's four points)
1. One set of real controls. "You carry" is now three real switches (checkbox, role switch); the
   radio is reduced to what the network returned (a qualifying ad, or none). The app's rule wins:
   Hardware wallets off means blocked whatever the network has. The other two switches can be
   turned on and change nothing in this placement. All 16 combinations checked.
2. Height and grouping. The controls sit on the window's frame as one tray (one row at 1440 and
   1280, stacked on phones). Window slack trimmed (one line question, 20px answer, tighter bars).
   The claim and the guide link are one quiet line. Scene uses the kit's `tight` prop. Section
   height: 1237px at 1440x900 (1.37 screens), 1116px at 1280x800 (1.40), 1641px at 390x844 (1.94).
   What is left above the specimen is the kit opener and scene padding, which I cannot trim.
3. Empty state. Answer column is now about 60% of the thread and the card column narrower, the
   question bubble spans the row, and a dashed trace of the slot appears as the card leaves and
   fades within about 1.2s (motion only; at rest and with motion off the place is simply empty).
4. Bridge marker. Now small text with two small glyphs, no container, no fill: an ordinary
   underlined link for the advertiser's side and plain bold text for the current side.

Removed the "where the slot sits" switch earlier (see Decisions). Remove `tight` in `index.tsx`
if the page rhythm wants the full top padding.

## The idea
One large close-up of Tidewater (the fictional assistant) holding the same placement the
advertiser chapter followed: the same question, the app's full answer, and the HarborKey card as
a separate blue object in the slot. On the window's frame the reader sets what the network returned (a
qualifying ad, or none) and the app's own category switches. The card leaves and returns; the answer, the
composer and the window itself do not move by a pixel. The picture carries the three promises, so
there is no list of label and sentence rows:

- Answer path: the answer is one DOM node whose text never changes; the slot is always laid out
  (hidden with visibility, not removed), so nothing reflows. A small ink note pinned to the answer
  ("Your answer") re-ticks and becomes "Your answer, unchanged" on every change.
- Rules: three real switches on the frame ("You carry"). Switching the card's category off makes
  the card leave: cause and effect in one glance.
- Earnings: a small ink note pops onto the card after it lands ("Earnings accrued", the exact
  receipt wording). It is an accrual mark, has no figure, and is not a payment.

The bridge is the sentence from the copy plus a two-face marker: the same miniature tile drawn
twice, once with the card lit (advertiser's side, a link back to `#advertisers`) and once with the
answer lit (app's side, current).

## Decisions
- Ink pills are our notes on the picture, not app UI (same language as the hero's settle tick).
- No "nothing here" placeholder in the app in the empty states: nothing is shown, and the app is a
  normal chat window. The sentence `PUBLISHER_SIDE.empty` appears under the control instead.
- "Where the slot sits" is not a control. I built a beside/below switch and removed it: keeping
  the answer still in both positions needed a reserved band of empty space inside the window that
  weakened the still. Desktop shows the slot beside the answer, phones below it.
- After the owner's text density note the three points row was removed. Only the first point is
  printed (it is the scoped claim and must be stated exactly); the other two are shown.
- Entry starts when the window's top passes 55% of the viewport height (own margin on `useInView`,
  observing the figure): window rises, card arrives from the right, accrual note pops.
- Motion off (or reduced motion): no transitions or animations, everything in its final state.

## Files
- `index.tsx` server wrapper (kit `Scene`, id `publishers`).
- `Stage.tsx` the client specimen (local state only, no network).
- `words.ts` local microcopy (state labels, pins, the fictional app's chrome).
- `publisher.module.css` styles and motion.

## Copy
Used from the frozen copy: who, question, lede, bridge, points[0] (k and v), empty, code, action.
Not printed: points[1] and points[2] (shown by the switches and the accrual note instead).
Used from story: PLACEMENT question, answer, app, appRules.blocked; ADVERTISER; RECEIPT.app.state.
Local words (words.ts): "Advertiser's side", "App's side", "The network returns",
"A qualifying ad", "No qualifying ad", "You carry", "Hardware wallets" (the card's category),
"Your answer", "Your answer, unchanged", "You block this category. Nothing is shown.", and the
app chrome (chat titles, "New chat", "Recent", "Ask a follow up").

Proposals for the integrator:
- story.ts could name the card's category ("Hardware wallets") so scenes B and D can use the same
  word; it is local here.
- `PLACEMENT.appRules.slots` ("One Sponsored card per answer") is no longer printed in this scene.

## Kit requests
- None required. The state control is a local radio group (native inputs, same pattern as kit
  `Choices`) because each option carries the miniature tile; if other scenes want pictured
  options, `Choices` could accept an optional node per option.
- `SponsoredCard` background is `--white` (warm); inside the white app window I set it to #fff
  through `className`.

## Known issues and things to know
- A full page screenshot taken without scrolling shows the window blank when motion is on,
  because the entry has not been triggered. Scroll to it first, or use `?still=1` or reduced motion.
- During the entry the whole window rises 28px, so the answer moves with it for about 0.7s. After
  that the answer's box is identical in every frame of every state change.
- The slot keeps its space on phones too, so the empty states leave white space above the
  composer. That is how a chat window looks; it also keeps the page from jumping.
- The mobile entry was not captured as frames in the lab (the window is already in view at load
  at 390x844); the desktop entry was.
- The `#advertisers` link assumes the advertiser scene keeps that id (the page nav uses it).
