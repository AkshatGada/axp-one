# Scene A, "The moment" (V3): builder notes

Status: V3 built in `v9/moment/`. Files: `index.tsx`, `moment.module.css`, this file.
V2 (`v8/moment/`) was not touched.

## Idea
The scene performs once, then hands over. Four nearby questions sit beside one reply, and
HarborKey's own card is a single persistent object with two places: seated in the reply's slot,
or held back outside it (tilted, lifted, hanging off the reply's lower corner).

For each question, in order: the bubble is chosen and a hairline runs to the reply; the deciding
words light (blue and underlined where HarborKey offers it, grey where it does not); the answer
writes itself as lines; the slot resolves.
- HarborKey fits: its card drops into the slot with a small overshoot, the reply's edge turns
  blue and a ring passes once.
- Another advertiser is placed: a neutral card slides in from the side, flat, while HarborKey's
  card stays held outside.
- Learning, not choosing: nothing arrives. The slot stays an empty well with `MOMENT.noAd`.
A small pill on HarborKey's card says why in a few words, wherever the card is.

## What is better than V2
- It plays. On entering the view it runs compare, mobile-only, learning, Bitcoin, then rests on
  compare (about 7.5 seconds since V3.1). The speaking bubble shows a thin hold bar while
  it plays. A choice, a key press or keyboard focus stops it for good. Hover and touch
  scrolling do not. With motion off it never starts and the scene is a still of the default.
- "Placed or withheld" is now something that happens to one object the reader can follow,
  instead of three different pictures swapped in place. The three outcomes move differently.
- The reply has material: a deeper sheet, a recessed slot well with a dashed rim that is always
  there, cards that sit on it with a hard shadow, and a lifted soft shadow when the card is held.
- Fewer words (see below), and the reason is attached to the card, not a sentence under the tile.
- The heading is composed here (`v8-who`, `v8-q`, `v8-lede`), beside the specimen, so nothing
  reaches into the kit's markup any more. `Scene` is used only as the wrapper, with its own
  padding untouched.
- Bubbles have hover (lighter fill, hairline), pressed (slight scale) and a focus ring that
  follows the bubble's shape.

## V3.1 (one pass, from the two reviews)
1. Scale. The reply is now the large object: about 440px wide and 375px tall at 1440 (was about
   295 by 320), HarborKey's card is drawn 1.2 times larger inside it (`zoom` on the kit card,
   so its type is about 18px), answer lines are heavier. The heading column is narrower, the
   bubbles sit in a slim middle column, and the reply runs to the page's right margin; the held
   card overhangs a little into the gutter.
2. The judgment is a real tag now, and it says whose it is. A white tag on the card's top edge
   carries the shared round "judgment" switch (`.v8-sw[data-kind="judgment"]`, on and blue only
   when it fits), a small "HarborKey's agent" label, and the verdict at 16.5px medium. It
   travels with the card. Seated, it sits in a gap left for it between the answer and the slot.
   "Rules out a device" is now "They ruled out a device".
3. Autoplay. The performance runs on its own clock, which advances only while at least 60% of
   the specimen is on screen and the tab is visible; otherwise it pauses (the hold bar pauses
   too) and resumes on return. It is about 7.5s in all (2.4s on the first question including the
   entry, then 1.7s each). It always finishes on the first question with HarborKey seated. If it
   is left out of view for more than 3.5s mid performance it settles on the first question and
   ends there, so it can never be found resting on another question. Touching the specimen to
   scroll no longer stops it (that was the likely cause of the "resting on Bitcoin" report: any
   pointer press used to stop it where it stood). Only a choice, a key press or keyboard focus
   stops it.
4. Phone. The reply is above the bubbles, so the slot, the held card and its tag are directly
   over the control. The whole specimen is 651px at 390 and fits one 844px view; the result zone
   plus the four bubbles is about 520px.
5. Grid. The reply's right edge is within 14px of the page's right margin.

Section heights now: 1440x900 709px, 1366x768 614px, 1280x800 603px, 820x1000 796px,
390x844 1036px. Specimen: 450px on laptops, 651px at 390. Same size in all four states.

Still true or new:
- Keyboard: tabbing in mid performance stops it on whichever question is then speaking (focus
  lands on the checked radio). That is the one way to stop on a non-first question without
  choosing; from there the arrows choose as usual.
- On a phone there is a reserved band (about 108px) between the reply and "Pick a question" for
  the held card; it is empty while the card is seated.
- If the reader scrolls so that the bubbles are at the very top of a phone screen, the reply
  above them is off screen. Without pinning that cannot be fully prevented; the layout keeps the
  result adjacent to the control instead.
- `zoom` on the card is supported in current Chrome, Safari and Firefox; without it the card is
  simply smaller.
- The scroll-away test was run on the full `/v3/` page at 1366 and 390 (short and long
  absences). The rest was checked in the lab route.

## Sizes before V3.1 (for reference)
1440x900: 634px. 1366x768: 620px. 1280x800: 626px. 820x1000: 750px. 390x844: 970px.
At 390 the specimen (hint to the end of the reply) is 581px, so a tap and its result share one
view. The held card overhangs the reply into the scene's bottom padding (56px at 390, about
68px on a laptop); it stays inside the section and never causes sideways scroll.
The specimen is the same size in all four states at every width measured.

## Visible words below the heading (default state)
About 58: lede 9, "Pick a question" 3, "Interactive illustration" 2, four questions 23,
HarborKey's card 17 (Sponsored, name, approved text), pill 4. V2 was about 100.

## Copy proposals (all local, in `LOCAL` in index.tsx)
- Shorter visible questions (the frozen ones are 41 words; these are 23):
  "Compare hardware wallets for Ethereum and Solana." / "Best mobile-only wallet for Solana?" /
  "How does offline key storage work?" / "Cheapest hardware wallet for Bitcoin?"
  A screen reader gets the frozen full question and full reason in the live announcement.
- Reasons as pills: "Fits what you offer", "They ruled out a device", "Learning, not choosing",
  "Bitcoin not declared".
- Lit words and whether HarborKey declared them (blue or grey) are local annotation derived from
  `ADVERTISER.capabilities`. In "Best mobile-only wallet for Solana?" "Solana" is blue and
  "mobile-only" grey; in the Bitcoin question "hardware wallet" is blue and "Bitcoin" grey.
  These belong in `story.ts` if they stay.
- The lede could be dropped: the pills and the picture say it. I kept it (9 words).
- Dropped from V2: the person word under each bubble, the names beside the glyphs (a screen
  reader still gets "Beside the answer: ..."), the reason sentence.

## Decisions
- "staking" (outbid) is still left out: it needs bidding words.
- The slot glyph in each bubble is real state (what ends up beside that answer), drawn like the
  slot: blue, neutral, dashed.
- Other advertisers' cards stay neutral ink with placeholder lines; no words invented for them.
- The answer is neutral lines, redrawn for each question.
- Timings use `--v8-ease` and `--v8-ease-out`; the one exception is the card's landing, a custom
  overshoot curve (`cubic-bezier(.3, 1.36, .45, 1)`), because none of the tokens overshoots.
- One sequence drives both the entry and every change; `--t0` delays it for the entry.

## Known issues and things not checked
- The landing of HarborKey's card finishes at about 0.75s after a change, its pill at about
  0.85s, and the ring fades out by about 1.15s. Other changes settle in about 0.7s.
- The held card overhangs into the bottom padding. If the integrator shortens this scene's
  bottom padding below about 70px it would touch the next scene.
- In the lab route the scene is at the top, so the specimen is visible, hidden, then animates in
  at hydration. On the real page it is below the fold. My entry frame sheets start a few hundred
  milliseconds into the entry for the same reason; the first bubbles rising are not in them.
- Autoplay does not pause if the reader scrolls away mid performance, or when the tab is hidden.
- Not checked: the scene inside the full `/v3/` page, a real screen reader, a browser with JS
  off, Safari and Firefox, `pnpm build`, the copy lint script. `pnpm typecheck` reports errors
  in other v9 folders (advertiser, meet); none in this folder.
