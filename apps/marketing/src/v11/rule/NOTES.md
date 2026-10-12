# 05 Agentic payments, and the doors: builder notes (V5)

The folder is still `rule/` (the doors import `useEntry` and `keep` from it); the section is
`section#payments`. Nothing in this folder or in `../doors` imports `RULE`: it can be removed from
`v11/copy.ts`.

## What it is (after the owner's "fewer words, more picture" pass)
- `section#payments` (kit `Chapter`, mark "05 Agentic payments"), then `<Doors />` (`section#start`,
  untouched).
- Head: the heading at `x-h2`, one sentence per line, with the deck beside it (under it on phones).
- One picture with one-word labels (a plain `figure`, no caption, nothing focusable):
  - Left three columns: "Agents judge fit." (Wide, light, ultramarine) with its one short reason
    (`PAY.why[0].short`), beside the line of events; "Fixed rules decide money." (heaviest weight,
    ink, under a 2px ink rule) as the rail's title, with no reason line.
  - Decide: `QUESTION`, large. Two rigid ink frames catch only the words a keyword list would; a
    soft ultramarine wash takes in the whole sentence and resolves into a round mark, "HarborKey
    fits".
  - Deliver: three answer bars and the kit `Ad` (size "m", no domain line) below them.
  - Pay: a receipt of two states only ("Charge accepted", "Earnings accrued"), both marks filled. A
    thread runs mark, card, receipt, then drops from the charge side into the rail.
  - The rail: an ink baseline with many small ultramarine blocks, a rigid ink bracket over the
    newest ("Most per placement") and an ink wall at the end ("Total budget"). Under the total, a
    ledger's double rule, labelled "Settle" at its end.
- Removed at the owner's request: the foot row ("Illustration.", the limit line, the proof link and
  its label), the step sentences, the Settle sentence, "Exact limits. Code enforces them.", the
  "Receipt" header and the "Advertiser" / "AI app" side names. `PAY.steps[n].line`, `PAY.limit`,
  `PAY.why[n].line`, `PAY.why[1]` and `PROOF` are not rendered here.
- Visible words: 69 outside the card (58 without the question's 11), 16 in the card.
- Phones: the same line read downward on one vertical thread with a node at every step, joined to
  the receipt; the rail full width under it with "Settle" beneath; then the rule half.

## Motion (once, about 3.8s, then still; no loop)
Keyword frames cut on, the wash fades over the sentence, the mark resolves, the thread runs, the
card arrives below the answer, the receipt arrives and its marks latch, the charge drops under the
bracket. Then three more deliveries on their own. Last, the double rule is drawn and "Settle" sets.
Transform and opacity only. No loop: once the total is closed, further deliveries would be untrue.
Two keys on the board: `data-entry` (the early parts) and `data-late` (receipt, charges, bracket,
double rule). On laptops they are the same moment. On phones `data-late` follows the receipt's own
arrival.

## `useEntry` changes (both keep the doors' behaviour)
- The share of the element that must be visible is capped to what can show while its top is still
  in the lower half of the screen (a tall phone column could otherwise never play).
- Optional second argument `linger` (default 700ms, as before): how long a partly visible element
  waits before playing anyway. The figure uses 1800ms so it does not play while only its top peeks
  under the heading.

## Files
`index.tsx` (server), `Figure.tsx` (client, for the entrance only; all copy is in the server HTML),
`rule.module.css`, `useEntry.ts`, `keep.tsx` (kept only because `../doors/Wall.tsx` imports it).

## Heights (lab route, `#payments` only; gap to the doors in brackets)
- 1440x900: 651px, 0.72 screens (108)
- 1366x768: 624px, 0.81 screens (102)
- 1280x800: 634px, 0.79 screens (96)
- 390x844: 1146px, 1.36 screens (56)

## Open
- The shared receipt from `v11/film/` has not landed (no export there yet); the local receipt is
  still used, with both marks filled. Swap when the import path is given.
- The story's question and the card's approved words name Solana and Ethereum as what the wallet
  supports (frozen in `story.ts`); no network or token is named for payments.
- The phone's late entrance was confirmed by state (`data-late` goes wait to play) and by the
  settled frames; its motion was not caught mid-flight in a capture.

## Proposals for shared files
- `story.ts`: short labels for the two readings of the question (for example "Keyword match" and
  "Agent's reading") would let the Decide picture name them.
