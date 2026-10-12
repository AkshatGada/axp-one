# 05 Agentic payments, and the doors: builder notes (V5)

The folder is still `rule/` (the doors import `useEntry` and `keep` from it); the section is now
`section#payments`. Nothing in this folder or in `../doors` imports `RULE` any more: it can be
removed from `v11/copy.ts`.

## What it is
- `section#payments` (kit `Chapter`, mark "05 Agentic payments"), then `<Doors />` (`section#start`,
  untouched).
- Head: the heading at `x-h2`, one sentence per line, with the deck beside it (under it on phones).
- One figure (kit `Fig`, caption "Illustration."), a twelve column board:
  - Left three columns: the principle as a matched pair, each half beside what it describes and
    carrying its reason from `PAY.why`. "Agents judge fit." (Wide, light, ultramarine, under a blue
    hairline) sits beside the line of events; "Fixed rules decide money." (heaviest weight, ink,
    under a 2px ink rule) sits beside the rail.
  - Decide: `QUESTION` in plain language. Two rigid ink frames catch only the words a keyword list
    would (`SHIFT.keywords` that occur: "hardware wallet", "Solana"); a soft ultramarine wash takes
    in the whole sentence and resolves into a soft round mark with "HarborKey fits" (`AGENTS[0]`).
  - Deliver: "Tidewater", three answer bars, and the kit `Ad` (size "m") below them.
  - Pay: a two sided receipt (`PAY.sides`; filled square for the charge, hollow square for the
    accrual). A thread runs mark, card, receipt, then drops from the advertiser's side into the rail.
  - The rail: an ink baseline with many small ultramarine blocks (charges) of unequal width, a rigid
    ink bracket over the newest one ("Most per placement", always wider than the block under it) and
    an ink wall at the far end ("Total budget"), both labels from `ADVERTISER.limits`. Under the
    total, a ledger's double rule: settled, later. Then the Settle caption, `PAY.limit` and the
    proof link (label inside the link, new tab, omitted when `PROOF.href` is null).
- Nothing travels toward the app. No amounts, counts or figures. No controls: the only focusable
  element is the proof link.
- Phones: the same line read downward on a vertical thread (mark, card, receipt), the rail full
  width under the receipt, then the rule half.

## Motion (once, about 4.8s, then still; no loop)
Keyword frames cut on, the wash fades over the sentence, the mark resolves, the thread runs, the
card arrives below the answer, the receipt arrives and its marks latch, the charge drops under the
bracket. Then three more deliveries on their own: a ripple on the mark, a dot along the thread, the
bracket steps (a cut) and a block lands. Last, the double rule is drawn. Transform and opacity only.
No loop: once the total is closed, further deliveries would be untrue.
The rail, its bounds, the question and all captions are present before the entrance (the limits are
fixed in advance), so the figure is never empty.

## `useEntry` change
The share of the element that must be visible is now capped to what can show while its top is still
in the lower half of the screen. Without it a tall element (this figure on a phone) could never
play. Short elements (the doors panel) behave exactly as before.

## Files
`index.tsx` (server), `Figure.tsx` (client, for the entrance only; all copy is in the server HTML),
`rule.module.css`, `useEntry.ts`, `keep.tsx` (kept only because `../doors/Wall.tsx` imports it).
Removed: `Manifesto.tsx`.

## Heights (lab route, `#payments` only; gap to the doors in brackets)
- 1440x900: 929px, 1.03 screens (108)
- 1366x768: 892px, 1.16 screens (102)
- 1280x800: 878px, 1.10 screens (96)
- 390x844: 1699px, 2.01 screens (56)

## Known compromises
- Shorter than the 1.2 to 1.5 screens suggested: the why pair sits inside the figure, so nothing
  was added below it.
- The entrance runs a little over four seconds because the keyword and reading beat was added.
- On phones the whole entrance starts when the top of the figure enters, so the lower parts (receipt,
  rail) have usually finished by the time they are scrolled to.
- 900 to 1180px wide uses the laptop layout with a smaller receipt; checked only at 1024.

## Proposals for shared files
- `story.ts`: a short label for the two readings of the question (for example "Keyword match" and
  "Agent's reading") would let the Decide picture name them; today the reason text beside it does.
