# Scene A, "The moment": builder notes

Status: revision round 1 done (length, mobile cause and effect, alignment, and the owner's
"visual first, far less text"). Files: `index.tsx`, `moment.module.css`, this file.

## Idea
Four nearby questions on one topic, and one reply at human size. The picture carries it.

- Left of the specimen: the four questions as chat bubbles. They are the control (a radio group).
  Under each: one word for the person (Choosing or Learning) and a small slot glyph with a name
  (HarborKey, ClearVault, No ad, ColdNest). That row is the whole story as a still.
- In the chosen bubble the words that decide light up: blue with a blue underline where
  HarborKey offers it, grey where it does not. "hardware wallet" lights blue and "only needs to
  hold Bitcoin" grey in the same sentence, which is the point of the scene in one glance.
- Right: the reply. Neutral answer lines (identical in every state) and one slot. The slot is a
  dashed outline that is always there; HarborKey's blue card lands on it, or another advertiser's
  neutral card does, or it stays empty with `MOMENT.noAd`. The tile is blue edged only when the
  card is HarborKey's. A hairline runs from the chosen bubble to the reply.
- One line of why under the reply (the story's `reason`). Nothing else is captioned.

## What changed in revision round 1
- Removed: the premise sentence, the question repeated inside the tile, both margin notes and
  their labels ("This person is", "The question needs", "Beside the answer" as visible text),
  the "Answer" label, the card's domain line, "Another advertiser", and the "'s card" suffixes.
- Length: on a laptop the kit opener sits beside the specimen (question left, picture right) and
  the section has its own shorter padding. Section height including padding: 637px at 1440x900,
  641px at 1280x800 (was 1095 and 1052). Heading, lede, questions, reply and reason are all in
  one view.
- Mobile: the chosen bubble is the question, the reply sits directly under the four bubbles and
  the reason under that. From "Pick a question" to the end of the reason is 708px at 390, so a
  tap and its whole result share one 844px view. Section height at 390: 1080px (was 1579).
- Alignment: there is no overhanging box any more. Every bubble, chosen or not, has the same
  box on the same left edge; only its fill and border change.
- Motion on a change (about 0.6s, measured in frames): the bubble is chosen and the hairline
  draws, the deciding words light one after another, the old slot content is gone at once, the
  new card lands on the outline (or the outline stays and the sentence fades in), the reason
  follows. On entry, once: bubbles rise in a short stagger, the reply follows, then the same
  sequence plays for the default state (about 1.5s in all).

## Decisions
- Moments used: compare, mobile, learn, bitcoin. "staking" (outbid) needs bidding words.
- `DECIDES` in index.tsx lists the lit phrases (exact substrings of the frozen questions) and
  whether HarborKey declared each. This is local annotation derived from `ADVERTISER.capabilities`;
  it belongs in `story.ts` if it stays. Blue or grey is never the only cue: blue also has an
  underline, and the person word, glyph, slot and reason say the same thing.
- Every state is rendered and stacked in the same grid cell (slot, reason); only the chosen one is
  visible, the rest are `visibility: hidden` and `aria-hidden`. The specimen is the same size in
  all four states at 1440, 1280, 820 and 390 (measured with JS on).
- Own markup instead of kit `Tile`, `Choices` and `EmptySlot`: the questions are the control, and
  the slot needs stacked states over a persistent outline. The HarborKey card is the kit
  `SponsoredCard`, untouched (without `domain`). Look matches the kit tile.
- Other advertisers' cards stay neutral ink (approved).
- Radio group is `role="radiogroup"` labelled by the hint, with native radios: Tab in, arrows
  move and select, wraps. A hidden `aria-live="polite"` line announces person, slot and reason
  after a change.

## Structural dependency on the kit (please check)
To put the opener beside the specimen and shorten the padding, the CSS reaches the kit's `Scene`
markup through the `className` I pass: `section.sec` (padding), `.sec > div` (the wrap becomes a
two column grid at 1040px and up), `.sec header` and `.sec header + div`. If `Scene` changes
shape this breaks. A kit prop for "opener beside body" and a "compact" padding would remove it.

## Copy
- Visible local strings now: "Choosing", "Learning", "No ad". Hidden (screen readers only):
  "Beside the answer".
- Word count below the heading went from about 150 to about 100. Of those, 19 are the frozen
  lede, 41 the four questions and 17 the HarborKey card; my own captions went from about 75
  words to about 25. To reach a true half, the lede could go (the specimen and the reason line
  say it), or the reason line could show only for the non placed states. I kept both: the lede is
  the integrator's, and the reason is the only sentence left.
- The reasons speak to "you" ("what you declared", "You did not declare Bitcoin"). With the
  premise gone, "you" is carried only by the lede's "what you offer".

## Known issues and things not checked
- 700px to 1039px: the opener stacks above the specimen (779px section at 820x1000).
- In the lab route the scene is at the top of the page, so with motion on the specimen is
  visible, hidden, then animates in at hydration. On the real page it is below the fold.
- My frame script reloads and screenshots during hydration; Playwright injects a caret style on
  inputs for screenshots, which shows up as a Next dev "1 Issue" badge (a hydration attribute
  mismatch on the radio inputs) in the mobile frame sheets. It does not occur in a normal load
  (console clean in every state capture run).
- Not checked: a real screen reader, a browser with JS disabled (only server HTML earlier),
  Safari and Firefox, the scene inside the integrated `/v2/` page, `pnpm build`.
