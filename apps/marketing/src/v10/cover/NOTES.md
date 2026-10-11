# 00 Cover: builder notes

## The idea (after polish pass 2)
A banner headline over one picture. The picture is a field of people asking: five rows of very
large display type, full bleed, drifting at different speeds in alternating directions. Quiet
words are a mid tone, the telling words of some questions are full ink, and the closing marks are
ultramarine. One whole row runs free between the headline and the sheet. Above the lower four
rows sits a white sheet (the fictional assistant, Tidewater) where one question is followed: it
arrives word by word, the app answers, and under the wallet questions the kit `Ad` lands as a
solid ultramarine slab that clears into the labelled card. Under every other question an empty
dashed slot draws with "No ad. The answer stands alone.".
When a moment starts, one drifting question lights ultramarine in the field, a copy of it travels
and shrinks under the sheet, and the sheet's words rise. It stays blue tinted in the field while
it is followed.

## Files
- index.tsx (server), Field.tsx (server), Sheet.tsx (client: loop, choice, lift),
  Drift.tsx (client: pointer lean), questions.ts (THREAD: eight moments, FIELD: five rows),
  cover.module.css.

## Decisions
- Headline, deck and actions are server rendered and never animate in. The h1 is the LCP.
- First paint is the composed frame: the story QUESTION, its answer and the HarborKey card. With
  motion on it is held for 1.7s after hydration, then the loop starts from the next moment.
- Motion off: that same frame with the full static field.
- The sheet follows whichever of its questions is in clear view in the field and was shown
  longest ago (never one of the last four). If none is in view it takes the least recent one
  without a lift.
- Cards only under wallet questions, and only the story's fictional advertisers: HarborKey
  (story creative, word for word), ClearVault and ColdNest. Three of eight moments carry a card.
- The lede sits on a paper halo with eased, long fades so no edge shows.
- Laptops 790px tall or less show the card without its address line so the sheet clears a whole
  row above it. Under 690px tall the small card is used.
- Phones: the lede on plain paper, then the field with the sheet over it and one whole row above.
- The loop pauses when the tab is hidden or the sheet leaves the screen. The sheet is
  role="img" with one description.
- Labels inside the picture: Tidewater, "A fictional AI assistant", "Sponsored", NO_AD.line.

## Truth notes
- The main answer is the first sentence of story ANSWER, word for word (approved).
- ClearVault and ColdNest are named in story.ts but have no creative there. Their card lines are
  written here to match the story's reasons ("It makes a phone app", "Solana not listed"):
  "ClearVault. A wallet app for Solana that keeps your keys on your phone." and
  "ColdNest. A hardware wallet for Bitcoin, and nothing else.", on clearvault.example and
  coldnest.example. KeyArc is not in story.ts and is not used. The orchestrator may want these
  two lines in story.ts.
- The two wallet questions that carry those cards are story MOMENTS questions.
- No invented brand names remain. No numbers.

## Known issues, not checked
- Headless Chrome only. The field uses container query units (cqh) and color-mix.
- Frame rate not measured. Five very wide text layers move by transform; one element changes
  colour (paint) when a question lights.
- Widths between 900px and 1100px were not captured.
