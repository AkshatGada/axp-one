# Landing v3: cold read by a hackathon judge

Reviewed 2026-10-02 at http://localhost:3410/. Headless Chrome, 1440x900, then 390x844. I scrolled 500px at a time like a person would, with no project docs or source read beforehand.
Screenshots are in `docs/frontend/reviews/shots/landing-v3-judge/` (`desk-00…29`, `phone-00…23`, `mvp-00`). The script is in `docs/frontend/reviews/tools/judge/`.

Page length: **27,732px on desktop (about 31 screens)** and 27,064px on phone. The page has about 2,800 words.

---

## At 10 seconds

> "An ad exchange for AI chatbots. Agents bid, ads sit next to the answer, crypto payouts. For… AI app builders? Advertisers? Looks expensive and serious. Clean."

- **What it is:** clear enough. The headline is *"The advertising exchange for the agentic internet."* The subhead does the real work: *"Advertiser agents bid for a disclosed place beside the answer in AI apps. Code decides who wins and what it costs. Publishers are paid in stablecoins for each card they deliver."*
- **Who it's for:** not clear in 10s. The page could be aimed at advertisers, AI apps or agent builders. The three-up that answers this ("For the person asking / advertiser / AI app") sits 3 screens down.
- **What I felt:** trust in the craft. The right-hand mock (question → answer → Sponsored card) is the best thing above the fold, because I *see* the product. Then a small letdown: the demo answer reads *"I can't reliably name the cheapest hardware wallet without checking current prices…"*. The AI looks useless, and the ad looks like it fills a gap the assistant left. The card also says *"Fictional advertiser"* twice, which deflates it on the first screen.
- "agentic internet" is buzzword bingo. Every other team that weekend will say it.

## At 60 seconds

I understand the pieces:
1. An AI app has a question and asks for one sponsored slot beside the answer.
2. Each advertiser has its own "buying agent" that looks at the question and says bid/skip.
3. Deterministic code checks eligibility, converts the agent's judgment into a capped price, and runs the auction.
4. The winner's card is shown, labelled Sponsored, and the app signs a receipt.
5. Payment happens through a Solana stablecoin channel: deposit up front, vouchers per card, one settlement at the end with a refund.

The exploded isometric stack (*"Behind one Sponsored card, a whole exchange."*) made this click quickly. It is the best explanatory moment on the page. The six-party row (*"Six parties. One rule: agents advise, code decides the money."*) was also clear.

What I did **not** understand at 60s:
- Why I should care about ContextHint, or what it is.
- What the business is: who pays whom, and what the exchange's take is.

## At 3 minutes: two sentences for another judge

> **axp.one is an ad exchange for AI chat apps. When someone asks an assistant a question, each advertiser's AI agent judges whether its product fits and bids, plain code runs the auction, and the winner appears as a clearly labelled Sponsored card beside the answer, never inside it.**
> **The app is paid in USDC per delivered card through a Solana payment channel, and the buying agents are briefed with real historical ChatGPT ad data from the team's existing product, ContextHint. They showed it working end to end on a sandbox with four questions.**

I could write those two sentences, which is a good sign. It took the whole page to get there, though, and the second sentence depends on sections 5–7.

---

## Where I got lost, bored, skipped, or doubted

**Too long and repetitive**
- The same single example (hardware-wallet question, ClearVault vs KeyForge at 0.004) is told **four times**: the hero mock, the exploded stack, the "How it works" scrollytelling, and the Proof run sheet. By the third pass I was skimming.
- *"Agents advise. Code decides the money."* appears as a section headline, a full-bleed blue slab, a principle row, and in the six-party heading. That makes four uses. Once is a slogan; four times is padding.
- The exploded stack and the 7-step "How it works" diagram explain the same pipeline. I skipped most of the second one's steps.
- "Rules the money cannot break" (7 rows) mostly restates the walkthrough. I skimmed it.
- Big dead bands: at y≈1000 the viewport is **blank except one small tilted plane floating in the middle** (desk-01). It looked like the page had broken mid-animation. There are also tall empty margins between most sections.

**Jargon and internal labels (exact text)**
- `fit_intent_bid_v1`, `R3 I3`, `R1 I2`, `missing_constraint`, `crypto_storage`, `campaign ID order`, `jev-1.13.0`, `gpt-6.1-sol`, `ads:mapping:1836866`, `ads:hint:88501`, `similarity 1`
- *"Our demo AI app is the owned reference publisher app; its recorded ID is a legacy name."* This is an internal note on a public page.
- *"One observation per agent setting is a demonstration, not a benchmark."*
- *"An x402 payment adapter is planned"*, and the video chapters list *"MPP settlement"*. These are unexplained protocol names.
- *"Each accepted card raises one signed voucher for the running total, off chain."* Vouchers are never defined.
- "abstain" vs "skip". I don't know the difference, and it is never explained.
- The provenance legend has **10 markers**: Actual output, Observed, Inferred, Fictional, Policy, Settled, Recorded replay, Illustrative, Synthetic, Planned. I'm not going to learn a taxonomy in 3 minutes. The constant tags (*"Values are actual… The wiring and motion are illustrative."*) start to read like legal disclaimers rather than confidence.

**Confusing moments**
- **"Settled once."** The copy says *"ClearVault's voucher rose from 0.004 to 0.007 over two cards."* I had only been shown one card at 0.004, so where did the second card and 0.007 come from? It only makes sense after reading the run sheet much further down.
- **Tie-break by "campaign ID order".** Two bids tie at 0.004, and the winner is picked by ID order. A judge with ad-tech background will ask why there is no second price, quality score or randomization. It makes the "auction" feel arbitrary.
- **The ContextHint payoff undercuts itself.** The one demonstrated effect of all that data is *"The score moved from 2.38 to 2.52, across the rounding line. Bid or skip did not change."* So after 420,540 placements, the evidence changed nothing that mattered? That's honest, but as a pitch it lands as "our data moat had no effect."
- *"Retrieved by vector search, similarity 1."* A similarity of 1 reads like an exact-match lookup of the same question, not retrieval.
- The "observed ad" is a **Mercari resale listing** (*"Mercari Nano Trezor Hardware Wallet NEW … Open to offers Paid $55"*). That is a strange flagship example of ChatGPT ad intelligence.
- The **orange accent** in the Data section breaks the blue system. For a moment I thought I had landed on a different site, which turns out to be half true, since it's ContextHint's brand.

**What felt fake or staged**
- All three advertisers are fictional. LeatherGuard *"sells a leather wallet"* and is ruled out for missing crypto storage. That is a straw-man competitor built to demo eligibility.
- *"already used by thousands of people, including paying customers"* has no logo, no number and no link to proof besides "Visit ContextHint."
- Total money moved in the proof is **0.010 test USDC**. The proof is real, but it's tiny.

**Broken**
- **Every MVP button returns 404.** These are "See the MVP" (nav), "See the working MVP" (hero), "Open the MVP" (proof) and "See the working MVP" (footer CTA). All four go to `/mvp/`, which returns *"404 This page could not be found."* (`mvp-00-first-screen.png`). A judge clicks this first. **That single bug costs more points than everything else on this list combined.**
- The video works: a 3.2 MB mp4 with poster, `preload="none"`.

---

## What impressed me most

1. **The exploded isometric stack** (desk-02). The answer, card, auction, agents, evidence and payment are drawn as layers under one Sponsored card with callouts. It's the frame I'd remember, and the clearest explanation on the page.
2. **The hero mock.** I see the actual product (question, organic answer, separated Sponsored card) before reading a word.
3. **The run sheet + signed receipt** (desk-22/23): four real questions, bids, outcomes, receipt hashes, an Ed25519 signature and settlement tx IDs. The no-fill row (*"All 3 campaigns ruled out in code. No model calls."*) is a smart touch.
4. **"What this run does not show."** This kind of intellectual honesty is rare at a hackathon. It made me trust everything above it.
5. **The blue "Agents advise. Code decides the money." slab.** It's a striking typographic moment, the first time I saw it.
6. Typography overall. The wide grotesk display face plus the restraint read as a real company, not a weekend project.

## Do I believe it works? Did I want to click into the MVP?

- **Do I believe it works:** mostly yes. The receipts, hashes, settlement table, chapters of a 4-minute recording and the limitations list are hard to fake and specific. My doubts are about *significance*, not existence: sandbox only, fictional advertisers, 4 questions, 0.010 USDC, and a data advantage that didn't change any decision.
- **Did I want to click the MVP:** yes, immediately. It's the primary CTA, and the hero promised a "working MVP." **It 404'd.** As a judge, that flips me from "impressive" to "is the working part real?" The recorded video partly rescues it, but a recorded replay is exactly what a judge discounts.

---

## Scores (1–10)

| Area | Score | Note |
|---|---|---|
| First impression | **8** | Confident, clean, the product is visible above the fold. The weak demo answer and "Fictional advertiser" dent it. |
| 10-second clarity | **7** | The subhead explains it. The audience is unclear, and "agentic internet" is generic. |
| Story | **5** | A good arc (shift → parties → walkthrough → payments → data → proof → next), but 31 screens with the same example told 4 times. |
| Exchange explanation | **7** | The exploded stack is excellent. The walkthrough diagram has ~9–10px dimmed text and a confusing "Settled once" step. |
| ContextHint data section | **6** | Big numbers are credible and the "one niche → one record → one agent" chain is nice. The demonstrated effect ("Bid or skip did not change") undercuts it, and the orange accent jars. |
| Proof credibility | **7** | The run sheet, receipts and honesty list are strong (8–9 on their own), pulled down by the 404 on every MVP button. |
| Motion | **7** | The stack assembly and scroll-driven diagram are memorable. There's an empty transitional screen and long dead stretches. |
| Typography / visual craft | **8** | Disciplined and premium. Diagram microtext is too small; legend and tag noise. |
| Mobile | **6** | No horizontal page scroll and it stacks sensibly. Agent cards clip (LeatherGuard cut off at the right edge), the stack canvas renders at 636px inside a 390px viewport (clipped), the walkthrough diagram disappears, and the page is 27k px on a phone. |
| **Overall "would this win"** | **6** | It would be a top-third entry. Fix the MVP link and cut 40% of the page, and it's a 7.5–8 contender. |

---

## Top 10 changes, ranked by judging-score impact

1. **Fix `/mvp/` (404).** Every primary CTA (nav, hero, proof, footer) is dead. Nothing else matters until this works. Ideally the MVP is also *live* rather than replay-only, or says up front "live mode: ask your own question."
2. **Cut the page by ~40%.** Merge the exploded stack and the 7-step walkthrough into one explanation. Fold "Rules the money cannot break" into the blue rule slab, or drop it. Use the slogan once. Remove the empty y≈1000 transition screen and shrink the dead bands. Target ≤15 screens.
3. **Replace the hero demo answer.** *"I can't reliably name the cheapest hardware wallet…"* makes the assistant look useless and the ad opportunistic. Use a question where the organic answer is genuinely good and the Sponsored card is a relevant extra.
4. **Add the "why it wins" line near the top: market, business model, take rate.** Say who pays, what the exchange earns, and why now (ChatGPT ads exist, AI apps need revenue). Judges score viability, and today there is zero business-model copy.
5. **Make the ContextHint payoff land.** Show a case where historical evidence *flips* a decision (skip→bid, or a different winner), or reframe it as "agents bid with evidence, not guesses." Drop *"Bid or skip did not change"* from the headline beat. Explain "similarity 1", or pick a non-identical match.
6. **Strip internal identifiers from the narrative.** Remove `fit_intent_bid_v1`, `R3 I3`, `missing_constraint`, `jev-1.13.0`, `gpt-6.1-sol`, `ads:hint:88501`, "legacy name" notes, x402, MPP and "vouchers" (or define them in one plain sentence). Keep hashes only in the proof section, where they earn trust.
7. **Fix the "Settled once" step.** Explain that ClearVault won a second card later in the run before quoting 0.004→0.007, or show only this card's settlement.
8. **Cut the provenance taxonomy from 10 markers to 3** (Real run / Real data / Illustration). Stop tagging every block. One confident footnote beats twenty disclaimers.
9. **Raise diagram legibility.** Make the walkthrough diagram text at least 12–13px and the inactive nodes at least 50% opacity. Right now a judge on a projector or laptop can't read the dimmed boxes.
10. **Mobile polish and one accent.** Fix the clipped agent cards and the 636px overflowing stack canvas, and give phones a simplified diagram instead of dropping it. Bring the Data section back onto the single blue accent, or make the ContextHint hand-off deliberate. Also address the "campaign ID order" tie-break, even with one line on why it's deterministic by design, because ad-tech judges will poke at it.
