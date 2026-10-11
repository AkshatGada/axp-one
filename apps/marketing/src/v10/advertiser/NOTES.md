# 03 For advertisers: notes

## The idea
"You set the terms." Three enormous verbs, each with one object the reader can handle, then the reasons.

1. **Describe.** A sheet of paper on which the offer is typed (character by character, with a caret). The listed things settle out from under the sheet as solid ink blocks on a ledge. One block is an empty dashed slot: Bitcoin. Beside it, a Bitcoin question, the app's answer (grey lines) and, below the answer, a large card slot: "Left alone. Bitcoin not listed". Press the block: it drops in, the ledge takes the weight, one round ultramarine mark leaves the block, arcs across to the slot and bursts there, and the slot turns ultramarine: "Can appear. Bitcoin is listed". It toggles back.
2. **Approve.** The kit `Ad` (size l) on a white proof with printer's crop marks, held by a scalloped ink seal that stamps down on entry. "Change a word" swaps one word (underlined in ink as a proof mark), and the card comes off its marks: tilted, faded, struck through with an ink rule, a dashed outline left where it was, the seal split in two and faded: "Changed. Nothing runs." Pressing the broken seal (or "Approve again") snaps the card back onto its marks, the seal slams down, the proof jolts, and the words now on the card are sealed.
3. **Limit.** One heavy ink frame. Its top is "Most per placement", its side is "Total budget" (two quiet labels at the corner). Inside, two soft ultramarine bodies drift: one rises to the top, one moves to the side. Where they meet the ink they are cut flat; what they reach for stays outside as a dashed outline. No columns, no baseline, no axes, nothing countable. The pause is the kit rule latch (`.x-sw`, enlarged): it freezes both bodies mid-motion and fades them.
4. **See why.** Three questions set as display quotes between ink rules. Each gets a soft ultramarine reading pass, then its outcome in a word and its reason. Then the action, left aligned on the grid at display size.

## Form
Tall unpinned spread (no sticky stage). The verb (15vw PolySans Wide light) overlaps the top of its plate by a fixed share of its size (`--dip`) for Describe and Approve; for Limit the frame sits beside the verb; See why sits on its first rule. Each verb, its standfirst and its whole figure share one view at 1440x900, 1366x768, 1280x800 and 390x844 (measured: head to figure bottom is 388 to 546px on laptops, 458 to 633px on the phone).

Heights in the lab route (revision 1): 1440x900 2751px (3.06 screens), 1366x768 2625px (3.42), 1280x800 2478px (3.10), 390x844 2780px (3.29). Before the revision: 3747, 3582, 3382, 3055.

## Decisions
- Motion is CSS only, armed under `html[data-px-motion="on"]` and until the figure is `[data-seen]` (kit `useInView`). The still state is the default, so SSR, no JS and reduced motion all show the complete figure. Everything animates on transform and opacity (the old grayscale filter is gone).
- The Limit bodies loop slowly (7.6s) so the pause has something to still. The loop rests when the figure is off screen or the tab is hidden (`useOnScreen` in Seen.tsx). Nothing toggles by itself. With motion off, both bodies are shown pressed against the ink.
- The only auto-performed hint is a small nudge of the plus on the unlisted block (three times, starting about 3s after entry). It stops for good on any pointer or key press inside the figure.
- "Can appear" (not "Appears") after Bitcoin is listed: listing makes the campaign eligible; the agent still judges.
- Re-approval seals the words currently on the card. Changing again swaps the word back.
- Writing, approving and limits are ink (caret, blocks, seal, frame). Ultramarine is the card, the travelling mark, the reading pass, "Appears" / "Can appear", the bodies inside the frame and the action.
- The travelling mark's start and end are measured from the pressed block and the slot at press time (two `getBoundingClientRect` reads in the click handler), so it works in every layout.
- Controls announce through a visually hidden `role="status"` per figure. The pause is `role="switch"`; the Bitcoin block is a toggle button (`aria-pressed`); the seal is a button that is `aria-disabled` while sealed.
- Uses the updated kit `Ad` (node text) for the proof mark on the changed word; the focus radius overrides were removed.

## Words
147 visible words (149 before; the domain line and the sheet's name label were dropped, and the Approve verdict is now one word). Frozen copy is 44; story data in the figures (offer, listed, creative with its Sponsored tag and name, limits, four questions, outcomes and reasons) is about 90; my labels are 9 ("Approved.", "Change a word", "Pause", four "Illustration."). See why already had three rows. To get to 110 something frozen or a figure's story data has to go: for example dropping the "phone" row (17 words) and labelling the illustrations once instead of four times (3) would land near 127.

## Known issues and things to check
- Kit `.fig { margin: 0 }` has the same specificity as a single module class; plate margins are written as `.act .plate` for that reason.
- On the phone the travelling mark crosses the question bubble on its way down to the slot.
- A dev server compile error appeared once from `v10/film` (files briefly missing while that builder was writing); it cleared by itself.
- Not checked: real touch devices, Safari and Firefox, screen reader output by ear, frame rate under a profiler, widths between 480 and 1100 other than what the breakpoints imply, the abrupt-arrival strip after this revision (the entrance logic is unchanged).

## Proposals for shared files
- None open. (Both earlier proposals were taken.)
