# Landing v5: cold judge pass (Solana track)

Reviewer: a hackathon judge who had never heard of axp.one. No docs or source read. I spent about 3 minutes on http://localhost:3410/ at 1440x900, scrolling in human-sized steps, then clicked through to the MVP (localhost:3420) and the Verify page, then did a quick pass at 390x844.
Screenshots: `docs/frontend/reviews/shots/landing-v5-judge/` (desk-00..20, desk-scrolly-*, desk-mvp-*, desk-verify-*, phone-*).
Script: `docs/frontend/reviews/tools/judge-v5/judge.cjs` (+ `pass2.cjs`, `footer.cjs`).
Both servers returned 200 on the first try. There were no console errors and no horizontal scroll at either size.

## 10-second impression
"An ad exchange for AI chat apps, where bots bid and the money moves in stablecoins." The headline is big and confident, and the subhead does the real work: agents bid, code decides, publishers are paid per card. The best part is the hero mock: a real-looking chat answer, then a "Sponsored" ClearVault card that fills in after about a second. I knew what the product *is* before reading a word of the body. "Agentic internet" is buzzword-y, but the card makes it concrete. Solana appears only in grey small print at the bottom of the hero, so at 10 seconds it reads as an ads startup that happens to use Solana.

## 60-second understanding
By the end of the dark "What happens between the question and the card?" walkthrough I had the full pipeline:
- The AI app offers a moment.
- ContextHint gives each advertiser agent one real example plus an inferred audience.
- Jev judges whether to bid.
- Code checks eligibility, caps the bid and runs the auction, with a fixed tie rule.
- The app shows the card and signs a receipt.
- Only then is there a charge, accumulated in a Solana payment channel and settled with one close.

The 7-step diagram that lights up box by box is the clearest part of the page. "Agents advise. Code decides the money." then gave me the thesis in one line.

## My two-sentence explanation (as I'd tell another judge)
axp.one is an ad exchange for AI apps: advertiser agents use a judgment model (Jev) plus ChatGPT ad data from ContextHint to decide whether to bid for a disclosed Sponsored card beside an answer, while deterministic code sets eligibility, price and the winner. The app is paid in test USDC only after it signs a delivery receipt, through Solana payment channels that settle with one transaction per channel instead of one per ad, and every receipt can be re-verified in your browser.

## ContextHint, Solana, Jev: did I get them, and did they feel substantial?
- **ContextHint: understood, and substantial, almost too much.** It's a real product that records ChatGPT ads, the prompts they appeared beside and inferred audiences. The claims are 1,000+ daily marketers, 11,730 advertisers, 45,947 ads, 420,540 placements, 983 niches and a 12-country Fresh Ads table. The trace "one recorded prompt → the ad shown → the audience → handed to ClearVault's agent" is a great piece of evidence. But the section runs about 6 desktop screens with four different headline numbers (420,540 / 1,178 / 1+1 / the country call counts). Even with "Three numbers, kept apart" I had to work to keep them straight. It feels like the strongest moat, but it reads like a second landing page inside this one.
- **Solana: understood, and substantial in design but thin as evidence on this page.** The payment-channel idea is the best Solana argument: deposit, off-chain vouchers, one close, and a "transaction per ad vs one channel" lane. The MVP Settlement page has real-looking slots, lamport fees, rent and Inspect links. But it's a "hosted Solana sandbox", not devnet, and the landing page has no explorer link, program ID or transaction signature. As a Solana-track judge my first question is "can I see it on-chain?" and the page answers "sandbox". Solana also arrives late: it's small print in the hero, and the full section is about 8 screens down.
- **Jev: understood only as a name. Not substantial.** It gets one line ("the decision model each advertiser's agent uses to judge an opportunity") plus "Judged with Jev" labels. The one Jev-specific insight ("with history the agent was a little more sure… bid 0.004 instead of 0.003") is buried in the ContextHint section. I couldn't tell what Jev outputs, why it beats an LLM prompt, or what the "baseline vs with history" comparison means.

## Where I got lost, bored, or suspicious (quotes)
- **Bored / too long.** The page is about 16,800px on desktop (about 19 screens) and about 21,300px on mobile (about 25 screens). The middle third, the ContextHint data block, is where I started skimming.
- **Empty space.** "Why now", "Where does advertising go when the answer is a conversation?" has about 400px of dead space under three short columns (desk-02).
- **Lost.** "The screened slice: 1,178 ad and prompt records, 241 prompts, 537 ads, 331 inferred audiences." Then "1 + 1 example and audience." It took me three reads to see these are scopes, not results.
- **Lost.** The country table says India had 230 Fresh Ads calls, while the dot field says "India, Switzerland and Bangladesh: a handful each." This is explained in a caption ("Not part of the 420,540 placements"), but it looks contradictory at a glance.
- **Slightly fake-feeling.** "More than a thousand marketers use ContextHint every day, including paying customers." It's a big claim with no logo, quote or link to evidence. Also, "Mercari Nano Trezor Hardware Wallet NEW…" as the real observed ad is honest but odd-looking next to a polished fictional card.
- **Hedging fatigue.** "Illustrative layout, counts actual." / "a demonstration, not a benchmark" / "not a cryptographic proof" / "Brands named are not axp.one advertisers." The "What's real, what's illustrative" box is excellent. The same caveats sprinkled through every section start to read as defensive.
- **Mobile ordering.** On phone, the exploded-stack labels ("The auction.", "The agents.") sit above or below the wrong cards, so the label-to-layer link is lost (phone-02).
- **Minor.** A thin white seam appears at the left edge where the dark section starts (desk-03). The "Watch the four minute video" link is just an in-page jump.

## Impressive moments
1. The hero card filling in a Sponsored slot beside a genuine answer. It's instantly legible.
2. The exploded isometric stack (card / auction / agents / evidence / payment). It's beautiful and explains the architecture in one image.
3. The 7-step dark scrollytelling diagram. Each step lights up the right box, and the channel bar fills to "Paid 0.007 ← Refunded 0.013".
4. "Agents advise. Code decides the money." plus the six rule cards ("A cap holds, even when the agent wants in", "A restart cannot double charge"). These read like real system invariants, not marketing.
5. **The Verify page's "Tamper with one byte" button.** One click turns the receipt hash and Ed25519 signature red ("Mismatch"), and Reset brings them back. This was the single most convincing moment.
6. The MVP Settlement page: slots, lamport fees, rent, "2 opens, 2 closes, all finalized", and a cumulative-voucher step chart. It feels like a real system.
7. The question-by-question run table, including the no-fill and frequency-cap cases. Showing the failure and edge paths builds trust.

## Do I believe it works? Did the MVP links deliver?
**Mostly yes.**
- "See the working MVP" opened localhost:3420 in a new tab. It's a clean operator console with Overview, 4 opportunities, campaigns, publisher, settlement and evidence views, plus "Where a rule changed the winner: opportunity 3". The numbers match the landing page exactly (0.010 paid / 0.030 refunded, 15 decisions, 3 receipts).
- "Verify the receipts yourself: 48 checks run in your browser" opened /verify/ with 48/48 passing (28 hashes, 3 signatures, 17 sums and rules), a downloadable run.public.json and the tamper demo.

**Reservations:**
- It's a *recorded replay*, so nothing re-executes live. There's no "run a new question" button.
- Settlement is on a hosted sandbox, not devnet, with no public explorer.
- The video didn't preload in headless mode (readyState 0), though the file is served.

I believe the exchange logic and receipts are real. I believe the Solana part on trust plus the sandbox screenshots.

## Scores (1-10)
| Dimension | Score | Note |
|---|---|---|
| First impression | 8 | Confident type, a clear hero mock, restrained palette |
| 10-second clarity | 7 | What it is lands; why Solana does not |
| Story | 7 | Strong first half; the middle drags through ContextHint stats |
| Exchange explanation | 9 | Stack diagram, 7-step walkthrough and rule cards are best in class |
| ContextHint data | 7 | Real and impressive, but too many overlapping numbers |
| Solana relevance | 5 | Payment-channel design is good; sandbox-only, late, no explorer |
| Proof credibility | 8 | The Verify page and tamper demo are excellent; recorded replay caps it |
| Motion | 7 | The scrolly steps and channel fill are purposeful; dots and fills are subtle |
| Visual craft | 8 | Editorial and polished; minor seam and an empty Why-now block |
| Mobile | 7 | No overflow, everything readable; very long, stack labels misordered |
| Would this win (Solana track) | 6 | Top-5 polish and rigor, but a Solana judge wants on-chain proof and Solana-native novelty front and center |

## Top 10 changes
1. **Put Solana in the first screen with substance.** For example, a line like "One Solana transaction per channel, not per ad: 3 cards, 4 transactions total". Better still, a mini stat chip in the hero.
2. **Get onto devnet and link an explorer.** Show the open and close transaction signatures and the channel program ID on the landing page's payments section, each linking to explorer.solana.com. "Hosted sandbox" will cost points on a Solana track.
3. **Cut the ContextHint block by about half.** Keep the trace (prompt → ad → audience → agent) and one hero number. Move the dot field, niche grid, country table and "Three numbers" into a collapsible "The data" panel or the MVP.
4. **Give Jev a real moment.** Show one Jev input/output pair (the opportunity in; a typed judgment or probability out) and the "baseline vs with history → 0.003 vs 0.004" delta as a small visual next to the agents layer.
5. **Bring the tamper demo onto the landing page,** or at least a GIF or inline mini version in Proof. It's the most persuasive interaction and most judges won't click through.
6. **Consolidate the caveats.** Keep the single "What's real, what's illustrative" box and remove most per-section disclaimers.
7. **Shorten the page to about 12 screens.** Merge "Why now" into the hero follow-up and kill its empty space. Merge "Working now / Building next" with the final CTA.
8. **Back up or soften the "1,000+ marketers every day" claim** with a link to the public library or a dashboard screenshot, so it doesn't read as unsupported.
9. **Show one small live action in the MVP,** for example "replay opportunity 3 with the cap off" or "ask a new question (dry run)", so it's not purely a recording.
10. **Fix the mobile stack label order** (labels should sit directly above their own layer), the left-edge seam at the dark-section entry, and make "Watch the four minute video" scroll to and start the video.
