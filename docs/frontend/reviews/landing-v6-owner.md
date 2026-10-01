# Owner direction for landing v6 (2026-10-02). Highest authority; supersedes earlier owner notes where they differ.

Owner's words: "I see a lot of motion animation defects. The initial card stack in v4 was perfect; I don't know why it
was ruined in v5. The whole landing page feels too long. Don't show exact numbers of ads and placements: show scale
('tens of thousands of ads', 'hundreds of thousands of placements'). ContextHint should be one page, one section;
you've expanded it a lot. Talk about Solana channels; bring in a little of Solana's design system purple. Talk about
Jev. This landing page is for what happens in the MVP, so present it very nicely and visually."

## 1. Motion: restore, then fix only real defects
- **Restore the hero card stack exactly as it was in `axp-landing-v4`** (the HeroScene/plate stack choreography, timing,
  scale and explode). Diff v4 to v5 for the hero files and revert the v5 hero motion changes (the explode start 0.25,
  the 1.4x larger collapsed stack, the headline sequencing). Then fix ONLY the one real v4 defect, the H1 and
  "Behind one Sponsored card" overlapping, with the smallest change, and check it visually frame by frame
  (0 to 1 in 0.05 steps at 1280, 1440, 1920).
- Audit every other scroll scene for defects (stuck/skipped pins, flashes, overlaps, empty frames, jumps on
  back-scroll) and fix them. Fewer pinned scenes is better: every pin must earn its scroll.

## 2. Much shorter
Target **about 12 desktop screens at 1440x900** (now 18.7) and about 16 on mobile. Cut, merge, and remove scenes
rather than shrinking type.

## 3. No exact dataset numbers on the landing (standing rule)
Use scale words: "thousands of advertisers" (11,730), "tens of thousands of ads" (45,947), "hundreds of thousands
of ad placements" (420,540), "nearly a thousand niches" (983), "thousands of sub-niches" (7,121), "more than a
thousand marketers every day", "a dozen countries". No exact library counts, no country call counts, no hit-rate
percentages, no "1,178 / 241 / 537 / 331". Run facts from the MVP demo (4 questions, 15 decisions, 3 receipts,
2 channels, 0.004/0.003 USDC) are fine because they describe the demo itself, but keep them light. Exact figures live
in the MVP and on contexthint.com.

## 4. Structure: the page is the story of what happens in the MVP, plus the three pillars
1. **Hero** (v4 motion restored): headline, lede, primary "See the working MVP", the card stack.
2. **Built on three pillars**, one compact row, each in its own colour: ContextHint (vermillion), Jev (ultramarine
   with a neutral tone), Solana (Solana purple).
3. **How it works**: the dark-stage walkthrough (keep it; it's the most praised scene), tightened.
4. **ContextHint: ONE section, about one screen.** Scale words; one striking visual (the wall of real observed ads, or
   the dot field, pick one); the moat line; "Visit ContextHint". Labels as before (observed, not axp.one advertisers,
   no relationship implied), placed ABOVE the wall.
5. **Jev: one section, about half to one screen.** What Jev does for each advertiser agent, shown visually with one
   real decision from the run: the opportunity and the agent's own evidence go in; Jev returns relevance, buying
   intent and the creative that fits (with its confidence); code turns that into a capped bid. Plain words, no model
   version strings. "Built with Jev by TypeSafe", linking docs.typesafe.ai.
6. **Solana payment channels: one section, about one screen, in Solana purple.** Explain channels clearly and
   visually: a deposit opens a channel on Solana; each accepted, signed delivery raises a cumulative off-chain
   voucher (0.004, then 0.007 in total); one close on Solana pays the AI app and refunds the rest; no transaction per
   ad, which is what makes sub-cent ads viable. Real facts only (hosted Solana sandbox, test USDC; devnet links will
   be added when the devnet evidence exists: leave a slot that renders explorer links from an optional JSON).
   **Solana purple:** use Solana's brand purple (#9945FF), and optionally its green (#14F195) sparingly as a
   highlight, ONLY inside the Solana section and the Solana pillar chip (like ContextHint's vermillion is scoped to
   ContextHint). Keep ultramarine as axp.one's own colour everywhere else. No Solana logo files unless an official
   asset is available locally; a text wordmark "Solana" is fine. No sponsorship wording.
7. **Inside the MVP**: a beautiful visual tour of what the MVP shows, designed, not raw screenshots: crisp, framed
   vignettes of the real MVP screens (Overview dashboard, an opportunity's pipeline and auction, the Solana settlement
   channels, Verify with the tamper demo). Use the MVP's own Ledger components as specimens inside exhibit frames,
   or high-resolution captures of the current MVP (axp-mvp-v4 when ready) in elegant frames with short captions.
   Each links to that MVP page.
8. **Proof**: compact: what ran (light counts), "Verify it yourself" link, the video, one "what's real / what's
   illustrative" panel.
9. **Closing** (ultramarine, "Disclosed. Decided in code. Paid on delivery.") and footer.
Drop or fold: the separate payments band (into Solana), the long ContextHint sub-scenes (dot sort, 12-country chart,
niche dive, funnel: keep at most one), the rule wall (fold the slogan into the closing), why-now (one line in the
hero or pillars), the long principles list.

## 5. Keep
The ultramarine identity, PolySans, the lowercase axp.one wordmark, the no-internal-details rule, the truth labels
(in plain words, placed correctly), the dark stage, the ultramarine closing.
