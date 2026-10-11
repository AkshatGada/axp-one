# 01 The shift: builder notes

## The idea
"People used to search." is set large above a long, exact, cold search field holding three small
stiff keywords. On scroll the statement is replaced, at the same size, by "Now they ask."; "best" is
struck and falls away; the field's two hairlines part and become the rules of a plate; and the
surviving keywords (hardware, wallet, solana) grow out of the field into their places in the full
question, which fills the frame margin to margin in four lines (seven on a phone). The statement
steps back to a running head as the question takes the stage. Then each thing the question says
holds the stage alone for a beat: its words turn ultramarine with a drawn rule while the rest of
the sentence dims, and a marginal note in display type arrives beside its line. Last, the closing
line arrives under the plate and the question stands complete for movement 02.

The keywords are not copies. The words in the field ARE the sentence's own words, set at final size
and scaled down (never up) into the field, so they stay sharp.

## Files
- `index.tsx`: server entry, `<Chapter id="shift" no="01" title="The shift" bare labelledBy="shift-h">`.
- `ShiftStage.tsx`: client. The kit `Stage` (pinned frame and still sequence) and the one measurement.
- `model.ts`: derives everything from `SHIFT` in story.ts (which words travel, arrive, carry each
  "says" phrase, which keyword is dropped) plus line breaks, note positions and the clock.
- `shift.module.css`: all drawing and all interpolation.

## How it is driven
- Stage length: 2.2 (220vh), so 1.2 screens of held travel.
- One number. Progress is written to `--p` on the frame; every part declares a start `--a` and a
  length `--d` and derives its own 0 to 1 in CSS. Any `--p` is a full picture. Motion off is the
  same rules at `--p: 1`.
- JS measures only where each travelling word rests in the field (`--dx`, `--dy`): on mount, on
  resize, on fonts ready.
- Clock (progress): statement out .02 to .11; "best" struck .04 to .10, gone by .19;
  "Now they ask." in .115 to .22; field chrome lets go .13 to .20; keywords travel and rules part
  .17 to .43; statement shrinks to running head .19 to .36; new words arrive .42 to .66; three
  says beats from .67, .07 each; closing line .885 to 1.
- Words that shared the field ("hardware wallet") end in different places, so each goes to its
  line first and then slides along it; the rules open on the same curve, so no word crosses a rule.
- Colour uses `color-mix` driven by `--p` (paint only). Everything else is transform and opacity.

## Decisions (revision 1)
- Question size: about 140px at 1440x900 (9.72vw, capped by height), four lines
  ("Which hardware / wallet keeps my / keys offline and / works with Solana?"). Below 900px wide:
  seven lines at about 15vw (60px at 390).
- The statement pair swaps at one large size (7.4vw; 13vw on phones), then scales DOWN to a
  running head (never up).
- The field gained presence: taller, a lens, a caret, a submit cell with the kit arrow.
- Marginal notes sit beside the words that say them, in display type with a blue leader rule.
  "works with Solana" (wide screens) hangs under the right end of the last line, beside the closing
  line, because the last line fills the measure.
- "ready to choose" is said by the form of the question, so it lights "Which" and "?", and its note
  shows those two marks above it ("Which … ?") so the link is explicit.
- Underlines run behind the letters with a paper edge, so descenders pass through cleanly.
- Masthead: the frame keeps 84px clear at the top (74px on phones); the folio rule sits at 102px
  (92px on phones) with the masthead (68px / 60px) showing.

## Proposals for shared files
None open. (The Stage ref issue from round 0 is fixed in the kit; the local wrapper is deleted.)

## Known issues and things not checked
- The stage switches from the still sequence (server render) to the pinned frame on hydration, as
  the kit's Stage does by design; the block height changes then.
- `round()` is behind `@supports`. `color-mix` has no fallback (lit words would stay ink; rules and
  notes still light). `-webkit-text-stroke` with `paint-order` is used for the paper edge.
- Around progress .10 to .12 the statement slot is briefly almost empty (old line gone, new one
  arriving) while the field holds the frame. Deliberate, so the two lines never overlap.
- On short phones (390x664) the notes are 14 to 17px: legible, not large.
- Not tested: real Safari or Firefox, a real phone, measured frame rate, the seam into movement 02.

## Captures
Session scratchpad, `v4/shift/`. Final round is s9: `s9-<size>-all.png` (25 frames at 1440x900,
1366x768, 1280x800, 390x844), `s9-2x-final.png`, `s9-reduced-*.png`, `s9-abrupt-*.png`. Also
`s7-*-all.png` (49 frames), `s6short-*` (390x664, 768x1024), `s6page-*` (inside /v4/),
`s8-mast-*` (masthead showing).
