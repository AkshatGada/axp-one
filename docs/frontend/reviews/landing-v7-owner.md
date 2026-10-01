# Landing v7: complete rethink (owner, 2026-10-02). Highest authority.

Owner: "I really hate the landing page now. It's too text heavy. No stacked cards / they don't look good. The corners
don't follow the design system. Too much text everywhere. Solana should be purple, a whole page on Solana. Take
reference from the amazing design you did on contexthint.com. v3/v4 was better. The landing page needs to be
completely rethought. I like the card stack animation but it needs to be done properly; I see blurry images.
You've done a great job with the hero: I love option A. Put that same effort into the WHOLE website."

## Bar
Every section at the craft level of hero-lab A (the Exchange Wall) and the ContextHint home v4
(/Users/akshat/ch-home-v4/src/components/home/v4/: Wall, Hero fly-in, chapter openers led by questions, DeckScene
pinned sheets, bespoke product sheets, Rise, FooterReveal, motion.ts). Visual first; words are captions.

## Rules
1. **Hero = option A, the Exchange Wall** (apps/marketing/src/hero-lab/ExchangeWall.tsx), promoted to the real hero.
   Fix its follow-ups: the headline fits 3 lines at 1920; the reduced-motion desktop still shows the end frame.
2. **The camera dive lands in the card stack**, the exploded-card plates as the second beat, done properly:
   - **No blur.** The current blur comes from scaling or rasterizing layers. Render the plates at their final
     resolution, animate with scale ≤ 1 from a larger base, keep text as live text (no bitmaps), drop `will-change`
     at rest, avoid fractional translate on text, and use crisp hairlines.
   - Check frame by frame at 1x and 2x DPR.
3. **Minimal text.** Each section gets one big line (display), at most one short supporting sentence, then the
   visual. No paragraphs, no stacked caveat lines. One quiet source note per section at most. Target: under 450
   words on the whole page (now about 1,500 or more).
4. **One shape system, consistently.** Use the same radius scale as Ledger v2 (the owner approved its rounded
   corners): controls 6, cards and panels 10 to 12, large frames 16, pills full. Same shadow levels. No mix of sharp
   and rounded corners. Update design-system/prospectus tokens accordingly (approved change), and keep `/design`
   showing the new scale.
5. **Three immersive pillar chapters, each a full-bleed world in its own colour, each one screen or one pinned
   scene:**
   - **ContextHint** (vermillion world): scale words only, a wall of real observed ads in the ContextHint-v4 style,
     "Visit ContextHint".
   - **Jev** (ultramarine): one real judgment as a beautiful animated sheet (evidence in, scores out, code sets the
     bid). "Built with Jev by TypeSafe".
   - **Solana** (**a whole page in Solana purple**, #9945FF background, white type, Solana green #14F195 accents):
     the payment channel told visually (open, vouchers stacking off-chain, one close), then "Settled on Solana.
     Check it yourself." with Explorer buttons from the devnet evidence.
6. **How it works:** reuse B's resolved order-book row idea or the dark stage, whichever is more visual. Short.
7. **Inside the MVP:** an elegant, visual tour (framed captures or live mini-specimens), one line each.
8. **Proof and closing:** a few big numbers from the demo, a "Verify it yourself" action, the ultramarine closing.
   No caveat walls: one compact "What's real, what's illustrative" line or popover.
9. Keep: ultramarine identity, PolySans, lowercase axp.one wordmark, no internal IDs, scale words for datasets,
   truth labels (short, placed right), data from the extraction scripts, the copy lint, zero console errors, no
   overflow, contrast AA, reduced-motion stills, mobile static versions, CLS 0, the build never breaking dev.
10. Length: about 10 to 12 desktop screens; mobile about 14.

Deliver as `axp-landing-v7`, with screenshots of every section at 1440 (and key motion frames), plus 390.
