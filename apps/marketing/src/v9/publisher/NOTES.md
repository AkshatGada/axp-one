# Scene C, "The app's side" (V3): builder notes

Status: V3 built in `v9/publisher/`. Checked at 1440x900, 1366x768, 1280x800, 1024x768 and
390x844, motion on and off. Not committed. V2 (`v8/publisher/`) was not touched in this round.

## V3.2 (owner correction: the card sits BELOW the answer)
- On every width the thread is one reading column: question, answer, then the Sponsored card
  directly under the answer and above the composer. Never beside it, never inside it.
- The slot's place is always laid out under the answer (hidden with visibility when empty), so
  the composer, the window and the answer do not move. The reason text sits in that place, left
  aligned with the answer on desktop, centred on phones. The corner hold is unchanged.
- In the performance the card now rises into its place from below (it no longer slides in from
  the right); when it leaves it sinks slightly and fades.
- Rebalanced for height: the answer uses a 780px measure and sets in three lines on desktop
  (18px, 17px on short screens); the card is at most 520px wide with slightly tighter padding;
  top bar, bubble, gaps and composer are tighter; the reply tools row is hidden at viewport
  heights of 820px or less.
- Heights, with the section at the top of the view:
  1440x900: window 464px, object 521px, ends at 895 of 900; section 1070px (1.19 screens).
  1366x768: window 401px, object 452px, ends at 758 of 768; section 881px (1.15).
  1280x800: window 401px, object 452px, ends at 743 of 800; section 861px (1.08).
  390x844: window and controls 817px; section 1384px (1.64).
- Copy: the lede, the answer and `PUBLISHER_SIDE.empty` come from the shared files as changed.
  My read-out sentence now says "A labelled card sits below the answer."; no local wording says
  "beside". Earlier notes below that say "beside" or "from the right" describe V3 and V3.1.

## V3.1 (fixes from the two reviews)
1. No control without an effect. The bar is cut to the two controls that change the slot: a
   two-way choice and one rule switch. "Trading and leverage" and "Token sales" are gone from the
   scene (I chose cutting over inventing a second, refused advertiser).
2. Plain labels. The choice reads "An ad fits" / "No ad fits" (native radios); the rule reads
   "You allow" then "Hardware wallets".
3. The reason nothing is shown now sits inside the empty slot's own place, as quiet text, and
   takes no space (absolutely positioned in the slot's box). The black note on the bar is gone.
   Blocked wording is now "You do not allow this category. Nothing is shown."
4. The rule switch is the page's `.v8-sw` (square ink latch, `data-on`), on my real checkbox.
5. Laptop fit. At viewport heights of 820px or less the window is 385px and the whole object
   438px; with the section at the top of the view the object ends at 744 of 768 (1366x768) and
   729 of 800 (1280x800).
6. Opener matches the other scenes: who and the question at the shared `v8-q` size on the left,
   the lede on the right (same grid as the advertiser's). The bridge is one quiet sentence
   directly above the app; the glyph pair is removed.
7. Phones: the slot, the composer and both controls sit together at the foot of the window; the
   whole window and its controls are 790px and fit one 390x844 view.
8. On "Buy from the maker directly.": I agree it should change. Beside a maker's ad it reads as
   if the answer endorses the advertiser's channel. A neutral close would keep the independence
   claim clean, for example "Check how each one handles a lost recovery phrase." (story.ts is
   yours; not edited.)
9. One quiet line under the app: the scoped claim, the code line and the guide link.
   "A fictional AI assistant" stays inside Tidewater's sidebar (under the frame on small screens).

Section heights: 1064px at 1440x900 (1.18 screens), 867px at 1366x768 (1.13), 847px at 1280x800
(1.06), 1357px at 390x844 (1.61). The 1440 height went up from V3 because the question is back at
the shared size and sets in three lines.

## The idea
One composition: a two line question with the bridge above it, then one object, Tidewater, with
its controls on the frame. The app performs once when it enters view, so a builder understands it
by watching:

1. The window arrives; the person's question lands.
2. Tidewater writes its answer, word by word, with a caret.
3. While it writes, the Sponsored card arrives separately from the right and the accrual tab
   lands on it (tab rises, tick draws, a ring passes).
4. After a beat no ad fits: the choice on the frame moves to "No ad fits" by itself, the card
   leaves, four corners close on the answer and hold it, a faint trace of the slot passes, and
   the reason appears in the empty place.
5. The choice moves back, the card returns, the tab lands again, the controls pulse once and the
   reader has them.

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
- Two controls, each with an immediate effect (see V3.1).
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
- Heading is plain `v8-q` (shared size), max 16ch.
- "A fictional AI assistant" sits in Tidewater's sidebar foot on desktop and under the frame when
  the sidebar is hidden.
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
Local words: "An ad fits", "No ad fits", "You allow", "Hardware wallets" (the card's category),
"You do not allow this category. Nothing is shown.", and the app chrome ("Search", "New chat", "Today",
"Earlier", chat titles, "Ask a follow up").

Proposals for the integrator:
- story.ts could name the card's category ("Hardware wallets"); it is local here.
- `PLACEMENT.appRules.slots` and `PLACEMENT.appRules.blocked` are not used in this scene now.
- The no-ad sentence is the frozen `PUBLISHER_SIDE.empty` ("No qualifying ad. Nothing is shown.")
  while the control says "No ad fits"; "No ad fits. Nothing is shown." would match it.

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
