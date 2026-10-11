# Scene C, "The app's side" (V3): builder notes

Status: V3 built in `v9/publisher/`. Checked at 1440x900, 1366x768, 1280x800, 1024x768 and
390x844, motion on and off. Not committed. V2 (`v8/publisher/`) was not touched in this round.

## The idea
One composition: a two line question with the bridge above it, then one object, Tidewater, with
its controls on the frame. The app performs once when it enters view, so a builder understands it
by watching:

1. The window arrives; the person's question lands.
2. Tidewater writes its answer, word by word, with a caret.
3. While it writes, the Sponsored card arrives separately from the right and the accrual tab
   lands on it (tab rises, tick draws, a ring passes).
4. After a beat the network returns nothing: the "Qualifying ad" switch on the frame flips off by
   itself, the card leaves, four corners close on the answer and hold it, a faint trace of the
   slot passes, and a note on the frame says why nothing is shown.
5. The switch flips back, the card returns, the tab lands again, the switches pulse once and the
   reader has the controls.

Any pointer press, key press or focus inside the object ends the performance for good (the
write-in is left to finish; nothing scripted happens after). With motion off there is no
performance: the scene rests complete with the card shown.

## Why it is a level above V2
- It plays. V2 waited for the reader; V3 shows cause and effect before any touch, using the same
  real controls the reader then gets.
- The answer's independence is physical, not labelled. The "Your answer, unchanged" pill is gone;
  a hold (four corners and a tick) closes on the answer for about a second whenever the slot
  changes, then leaves the product clean.
- Tidewater is a product of its own: a serif reading voice for the answer and wordmark, a soft
  sidebar with search, grouped chats and window lights, a composer with attach, voice and a
  blinking caret, hover states on its chrome, layered depth on the window. The kit's card is the
  one blue object in it.
- One control language: four identical switches (what the network has, and the three categories
  the app carries), with a thumb that stretches when pressed.
- Shorter and quieter: the kit opener is replaced by a heading composed with the v8 classes.

## How the constancy is kept
- Every word of the answer is in the server markup, in the same nodes for the whole life of the
  page. The write-in changes only opacity, per word. `textContent` of the answer equals
  `PLACEMENT.answer` at every sampled moment.
- The slot is always laid out and only hidden with visibility, so the answer never reflows.
- The caret is absolutely positioned on each word, so it takes no space.

## Decisions
- Scene uses `<Scene id="publishers" tight>` with no kit opener; the h2 keeps id `publishers-q`.
  The section itself therefore has no `aria-labelledby` (the kit sets it only with `question`).
- Heading is `v8-q` with a smaller clamp (30px to 54px) so it sets in two lines beside the lede.
- The bridge is the sentence plus two small tile glyphs (card lit, then answer lit and ringed).
  The first glyph is a link to `#advertisers` with a spoken name; no printed labels.
- "A fictional AI assistant" sits in Tidewater's sidebar foot on desktop and under the frame when
  the sidebar is hidden.
- The reason nothing is shown is an ink note on the frame, under the empty place, instead of a
  separate text row.
- Entry and performance start when the object's top passes 62% of the viewport height.
- The serif is a system stack (`--tw-serif`: Iowan Old Style, Charter, Palatino, Georgia). No
  font files, no new dependency. One variable to revert if the page should stay all PolySans.
- "Where the slot sits" is still not a control (beside on desktop, below on phones).

## Files
- `index.tsx` server wrapper (kit `Scene`, id `publishers`, `tight`).
- `Stage.tsx` the client specimen: heading, object, performance, controls. Local state only.
- `words.ts` local microcopy.
- `publisher.module.css` styles and motion.

## Copy
Used from the frozen copy: who, question, lede, bridge, points[0] (k and v), empty, code, action.
Not printed: points[1], points[2]. Used from story: PLACEMENT question, answer, app,
appRules.blocked; ADVERTISER; RECEIPT.app.state.
Local words: "Network", "Qualifying ad", "You carry", "Hardware wallets" (the card's category),
"You block this category. Nothing is shown.", and the app chrome ("Search", "New chat", "Today",
"Earlier", chat titles, "Ask a follow up").

Proposals for the integrator:
- story.ts could name the card's category ("Hardware wallets"); it is local here.
- `PLACEMENT.appRules.slots` is not printed in this scene.

## Kit requests
- `Scene` could accept an `aria-labelledby` (or a heading id) when a builder composes the heading.
- `SponsoredCard` background is `--white` (warm); inside the white window I set it to #fff.

## Known issues and things to know
- In the lab route at 1440x900 the object is in view at load, so the performance starts at once.
  In the page it starts on scroll.
- A full page screenshot taken without scrolling shows the object blank when motion is on. Scroll
  to it first, or use `?still=1` or reduced motion.
- During the window's own entry (about 0.75s) everything inside rises with it; the answer is not
  yet visible then. From the first written word on, the answer's box never changes.
- The serif renders with whatever the visitor's system has; only macOS Chrome was looked at.
- The slot keeps its space on phones, so the empty state leaves white space above the composer.
- The `#advertisers` link assumes the advertiser scene keeps that id.
