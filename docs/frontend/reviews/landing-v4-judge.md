# Landing v4: cold judge pass (Solana track)

Judge persona: Solana-track hackathon judge, never heard of axp.one, no docs or source read.
Session: 2026-10-02, about 3 minutes on http://localhost:3410/ in headless Chrome.
Shots: `docs/frontend/reviews/shots/landing-v4-judge/` (desk-*, desk-mvp-*, mvp3420-*, phone-*). Scripts: `docs/frontend/reviews/tools/judge-v4/`.

> **Two blocking issues before anything else**
> 1. **"See the working MVP" goes to a 404.** Every MVP CTA (`See the MVP`, `See the working MVP` x2, `Open the MVP`) links to `/mvp/` on :3410, and that page is Next's bare "404 This page could not be found" (`desk-mvp-01.png`). `Verify the receipts` → `/mvp/verify/` also 404s. The MVP actually lives at the root of **localhost:3420** (`/`, `/verify/`). `/mvp/` 404s on :3420 too, so no basePath catches it either.
> 2. **The landing dev server died mid-session.** Right after the CTA click, `http://localhost:3410/` began returning **500** (`Cannot find module './707.js'` from `.next/server/webpack-runtime.js`). It was still 500 20+ seconds later. `apps/marketing/out/` was rebuilt at 01:12 while `next dev -p 3410` was running, so this looks like the known dev/build `.next` collision. Per instructions I did **not** restart it. **Someone needs to restart :3410.** I took the mobile pass from the static export (`apps/marketing/out`, served briefly on 127.0.0.1:3499 and then stopped). It has the same content as the desktop page.

---

## 10-second impression
A confident, clean, expensive-looking page. The headline "The advertising exchange for the agentic internet." is big and clear. On the right, a real-looking chat answer gets a "Sponsored" ClearVault card animated in under it. Within 10 seconds I knew it was **ads in AI chat answers, bought by agents, paid in stablecoins**. "Solana" isn't in the hero copy, though. I only got it from the user's question ("supports ethereum and solana"), and that's a coincidence of the demo query, not a pitch. As a Solana judge I'd want the word above the fold.

## 60-second understanding
The exploded-stack diagram ("Behind one Sponsored card, a whole exchange.") is the best minute on the page. It shows answer, card, auction, agents, evidence and payment, each with a one-line caption. By the end of it I understood:
- AI app (publisher) asks a question and opens a sponsored slot with a requirement ("must store crypto").
- Advertiser agents (judging with "Jev") decide to bid or skip. Code enforces eligibility, caps the bid and runs the auction.
- The winner's card is shown, labelled Sponsored, separate from the answer, which was written without seeing ads.
- A signed delivery receipt turns the award into a charge, settled through a **Solana payment channel**: a deposit, off-chain running authorizations, one close that pays the app and refunds the rest.

That's a coherent and fairly sophisticated model, and I got it fast.

## My two-sentence explanation of axp.one
axp.one is an ad exchange for AI chat apps: advertiser agents bid for a disclosed Sponsored card next to the answer, with eligibility, price and the winner decided by deterministic code rather than the LLM. Publishers get paid in USDC only on signed delivery receipts, settled through Solana payment channels (one on-chain close per channel, not one transaction per ad).

## ContextHint, Solana, Jev: what I understood, and did each feel substantial?
- **ContextHint: substantial, maybe *too* substantial.** It's a sister product that has recorded real ChatGPT ads: 11,730 advertisers, 45,947 unique ads, 420,540 placements, 983 niches, collection across 12 countries, "1,000+ marketers use ContextHint every day." The ad-collage wall is the most "real company" moment on the page. In the exchange it's the evidence each buying agent sees ("one example and one inferred audience"). But it gets about 5 screens (two dot-grids, a country hit-rate table, "Three numbers, kept apart", and a full-bleed orange "ContextHint already collects it." CTA with a "Visit ContextHint" button). Halfway down, it felt like I had wandered into a ContextHint ad. The tie-back to the exchange is thin: the agent saw *one* record.
- **Solana: real but narrow.** Payment channels with a deposit, off-chain vouchers, one close and a refund are the right idea for micro-payments ($0.004 ads). "There is no Solana transaction for each ad" is a smart point, and the "A transaction for each ad vs One channel" comparison makes it land. But it's a "hosted Solana sandbox" with test USDC and no explorer link, transaction signature or program ID anywhere I could see. "Devnet, then mainnet" sits under *Building next*, so it isn't even on devnet yet. A Solana judge will ask "where's the tx?" and the page doesn't answer.
- **Jev: named often, never explained.** "Judged with Jev" appears about 8 times, with a link to docs.typesafe.ai. I learned only that it outputs bid/skip, relevance and intent. I couldn't tell you what Jev *is* (a model? an SDK?). It reads like a sponsor credit rather than a component I understand.

## Where I got lost, bored, or it felt fake or too long
- **Length.** About 3,500 words and about 19 desktop screens (about 30 on mobile). The story effectively ends at "Agents advise. Code decides the money." (screen 8). Everything after re-proves it.
- **The auction demo is a tie.** "Two bids of 0.004 USDC tied. A fixed rule, decided in code, broke the tie." The hero example of an *auction* has nobody outbidding anybody. Both ties in the run were broken by a "fixed rule" that's never stated. A judge reads that as "the auction didn't really do anything."
- **Jargon I couldn't parse:** "With history, intent 2 became 3." / "On the cached question… On the second question, With history, nothing changed." What's "history"? What's the intent scale? It's the one box (blue-bordered "Evidence an agent can show. Evidence that cannot buy a capability.") where I stopped understanding.
- **Hedging overload.** "Motion is illustrative." appears 4+ times, plus "Illustrative layout, counts actual." and "Observed historical reference, not an axp.one advertiser." There's also a full list under "What this run does not show." (fictional advertisers, one disposable payer, sandbox not mainnet, ran once, "not a cryptographic proof"). Honesty is good, but this volume makes the project feel defensive and small. It reads as if a lawyer was in the room.
- **Tiny-money proof.** "0.010 USDC paid to the AI app" / "0.030 refunded" as huge blue hero numerals in the Proof section. Rendered that big, a cent reads as a punchline, not proof.
- **Numbers that don't obviously reconcile.** The payment section shows "0.010 paid to the AI app" next to a channel diagram showing "Paid out 0.007 / Refunded 0.013". These are two channels vs one, but nothing says so at a glance.
- **"Recorded replay" everywhere.** Proof is a recorded run plus a silent captioned video. "Nothing executes again." Combined with the 404 MVP link, the impression is "this doesn't run live."
- **Odd jumps.** Opportunity order is "story order" vs "exchange clock" (the no-fill ran first). Being told this twice in footnotes is noise.
- Small craft nits: the final blue CTA's mock card has an "Answer" label that is unreadable white-on-cream. The desktop dark "How it works" intro has a visible lighter band and a 1px seam at the left edge (`desk-03-y3000.png`). The "Visit ContextHint" orange CTA competes with the page's own primary CTA.

## What impressed me
- The **exploded isometric stack** (`desk-01-y1000.png`). It's the single best explainer on the page, and it's genuinely memorable.
- The **pinned "How it works" walkthrough**. A system diagram (ContextHint → app → agents → eligibility → bid policy → auction → reserved → receipt → Solana channel) lights up step by step as you scroll ("The app offers a moment." → "Code sets the price." → "Settled once."). It's clear, calm and the right level of detail.
- **"Agents advise. Code decides the money."** It's the best line on the page and a real thesis: LLMs judge, deterministic code handles money. Its six rules ("An award is not a charge.", "Money cannot buy past eligibility.", "A restart cannot double charge.") read like real engineering.
- The **Proof table** (question → bids → outcome → receipt) with a no-fill row and a frequency-cap win reads like a real log. The rendered **delivery receipt** card is a nice artifact.
- **Visual craft overall:** a strict type system, one blue accent plus ContextHint orange, generous whitespace and no template smell.
- The **MVP app itself (on :3420)** is legit. It has an Overview with 4 opportunities, 15 agent decisions, clearing prices, "Verify 48/48, Recomputed in this browser just now", per-campaign spend vs cap and refunds, plus Present and Verify modes (`mvp3420-01.png`). That's far stronger proof than anything on the landing. It just isn't reachable from the landing.

## Do I believe it works? Did the MVP link deliver?
- **Partially believe.** The internals (receipts, caps, frequency cap, no-fill, refunds, verify page) are specific enough that I believe a real pipeline ran once. But "recorded replay", "hosted sandbox", "not a cryptographic proof", and no Solana tx or explorer link keep me at about 60% confidence that the Solana part is more than a simulated ledger.
- **The MVP link did not deliver.** It's a 404 on :3410/mvp/. A real judge would stop here, and on this machine the click also coincided with the landing going to 500. Once I opened :3420 directly, the MVP was the most convincing thing I saw.

## Scores (1-10)
| | Score | Note |
|---|---|---|
| First impression | 8 | Polished, confident, the hero card animation is good |
| 10-second clarity | 7 | "Ad exchange, AI apps, agents, stablecoins" lands; Solana missing above the fold |
| Story | 6 | Strong first 8 screens, then ContextHint and re-proof sprawl |
| Exchange explanation | 8 | Stack diagram and pinned walkthrough are excellent; tie-only auction weakens it |
| ContextHint data | 7 | Impressive numbers and wall; over-weighted, thin link to the exchange |
| Solana relevance | 5 | Payment-channel idea fits; no tx/explorer, sandbox only, devnet is "next" |
| Proof credibility | 4 | Recorded replay plus heavy disclaimers plus 404 MVP link; MVP itself would be 7 |
| Motion | 7 | Purposeful (stack, pinned steps, channel fill); "illustrative" caveats undercut it |
| Visual craft | 8 | Tight type and colour system; a few seams/contrast nits |
| Mobile | 7 | No horizontal scroll, readable, sensible stacking; very long (about 25k px) |
| Would this win | 5 | Top-third on craft; loses on "is it live on Solana" and the broken CTA |

## Top 10 changes (ranked)
1. **Fix the MVP links.** Point `See the MVP` / `See the working MVP` / `Open the MVP` to the actual MVP (localhost:3420 locally, the real deployed URL in prod) and `Verify the receipts` to its `/verify/`. Open it in a new tab. Today the primary CTA is a 404.
2. **Put a real Solana artifact on the page.** Add the channel open/close tx signatures with explorer links, the program/account address, and the cluster name. Move to devnet if at all possible. "Hosted sandbox" will cost you the Solana track.
3. **Say "Solana" in the hero.** For example: "…paid in USDC on Solana for each card they deliver." Add a small "Settled on Solana" proof chip next to the CTA.
4. **Cut length by about 40%.** Fold the ContextHint section (two dot-grids, country table, "Three numbers", orange CTA) into one screen: the collage plus 3 numbers plus one sentence on how the agent uses it. Drop the second ContextHint CTA block.
5. **Make the auction demo an actual auction.** Lead with a run where bids differ (e.g. 0.006 vs 0.004 → clears at second price/cap), or at least state the tie rule in plain words.
6. **Explain Jev in one line** at first mention (what it is and what it outputs), and drop the repeated "Judged with Jev" labels.
7. **Rewrite or remove the "intent 2 became 3 / cached question / history" box.** It's insider language. Replace it with one plain sentence on why evidence changes a bid but can't override eligibility.
8. **Consolidate disclaimers.** One honest "What's real / what's simulated" panel near Proof. Remove the repeated "Motion is illustrative." and "Observed historical reference, not an axp.one advertiser." captions.
9. **Reframe the money numbers.** Don't render 0.010 USDC as giant hero numerals. Show "3 of 4 opportunities filled · 3 signed receipts · 1 on-chain close · 48/48 checks verify" instead, and label per-channel vs total figures.
10. **Bring the MVP's best proof onto the landing:** a screenshot or embed of the MVP overview with "Verify 48/48 recomputed in your browser". Fix the small craft nits too: the unreadable "Answer" label on the final CTA card, the seam/band on the dark section, and the end-of-page CTA not leaving room before the footer.
