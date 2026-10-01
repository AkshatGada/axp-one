# axp.one MVP: cold judge pass (v4)

**Who:** a Solana-track hackathon judge who clicked "See the working MVP" and has never seen axp.one. I didn't read docs or source.
**Where:** http://localhost:3420/ at 1440x900 in headless Chrome, about 5 minutes. I watched Present on autoplay through all 11 slides, then opened Settlement (Devnet section), ran the Verify tamper demo, and checked one Devnet transaction on explorer.solana.com.
**Screenshots:** `docs/frontend/reviews/shots/mvp-v4-judge/01..25`. Scripts are in `docs/frontend/reviews/tools/mvp-judge-v4/`.
**Console errors:** none on any page I visited.

---

## First 30 seconds (01, 02)

- The H1 tells me what this is: "One recorded run of an ad exchange inside an AI app." The subhead gives the whole pipeline in one sentence: "Advertiser agents decide with Jev, using ContextHint history; code sets the price; the app shows one labelled Sponsored card; payment settles on a hosted Solana sandbox only after a signed delivery."
- On the left is a chat answer with a clearly labelled **Sponsored** card under it. I understood the product from that picture alone, before reading anything.
- Six KPI tiles (4 questions, 15 agent decisions, 0.004 USDC, 0.010 paid, 4 sandbox txs, Verify 48/48) tell me it is instrumented and checkable.
- The honesty chips in the top bar ("Recorded replay", "Hosted Solana sandbox + Solana Devnet re-settlement", "Test USDC", "Fictional advertisers") set expectations straight away. A judge trusts that more than a demo that pretends to be live.
- There are two obvious CTAs, "Watch the guided replay" and "Step through opportunity 1". I knew where to click.
- Friction:
  - The subhead is one 50-word sentence with three proper nouns I don't know yet: Jev, ContextHint and "hosted Solana sandbox".
  - "Hosted Solana sandbox" raised a flag straight away: is the main settlement not on a public chain?

## Understanding after 5 minutes

The exchange sits inside an AI chat app. When someone asks a shopping question, the app writes its own answer first, untouched. It then offers one Sponsored slot with coarse topic and requirement tags and a floor price. Advertiser agents receive a packet: the question plus historical evidence from ContextHint about which ads have shown up next to similar prompts. Each agent uses Jev to rate relevance and intent on a 1–3 scale.

Deterministic exchange code then does the rest:
- turns those ratings into a bid from a fixed table (a percentage of the advertiser's max bid);
- enforces eligibility (must-have capabilities), frequency caps and a tie rule;
- runs a first-price sealed auction.

The publisher app inserts the winning card and signs an Ed25519 receipt. Only then is the advertiser charged. The charge advances an off-chain voucher in a per-advertiser Solana payment channel, and one close per channel pays the publisher and refunds the rest. Everything is written to one public JSON file, and the browser re-verifies it (48 checks).

The original run settled on a "hosted Solana sandbox". The same 3 receipts were later re-settled on public Devnet, with explorer links.

## Two-sentence explanation (as I'd repeat it to another judge)

axp.one is an ad exchange for AI chat apps. Advertiser agents judge each shopping question with an LLM, but deterministic code sets the bid, the caps and the winner, and the app shows one disclosed Sponsored card next to its untouched answer. Advertisers pay only after the app signs a delivery receipt, through Solana payment channels with off-chain vouchers. The recorded run's receipts were re-settled on Devnet, and you can re-verify all of it in the browser.

## Convincing vs. fake

**Convincing**
- **The Devnet proof is real.** I opened the ClearVault close tx `3q1Xpde…yMXwyL` on explorer.solana.com (devnet), screenshot 21.
  - It shows Success and Finalized at slot 506,403,970, with a fee of 15,000 lamports. Both match the Settlement page exactly.
  - Its token changes are exactly what the page claims: +0.007 USDC to the publisher, +0.013 back to the payer, −0.02 from the channel vault.
  - The mint is `4zMMC9…ncDU`, which I recognise as Circle's Devnet USDC.
  - The transaction calls a custom program (`CHNLxY…yGsX`) and the **Ed25519 SigVerify precompile**, so the voucher signature is checked on-chain. That is a real Solana design, not a memo transfer dressed up.
- **The tamper demo works and is honest** (23, 24).
  - It changes one character of opportunity 1's receipt nonce in a copy held in the tab.
  - The result is 46/48: the receipt hash and the Ed25519 signature flip to Mismatch, with the recomputed hash shown.
  - It also says plainly that the served file is unchanged.
- **The run has realistic mess in it.** There is a no-fill (opportunity 4, mobile-only, zero agent calls) and a frequency cap that overrides an agent's "bid" (opportunity 3). An unfunded advertiser gets excluded by rule. The auction is decided by a tie rule ("the lower campaign ID"), and the page admits that. Faked demos usually show everything winning.
- **The caveats are self-aware.** The page says "One observation per arm; not a measured lift", "A signed receipt shows the app inserted a labelled card, not that a person read it", and "One disposable test payer funded both advertisers". Slide 10 even has a "What this run does not show" list. That buys a lot of credibility.
- **The money adds up everywhere I looked.** Deposited 0.040, paid 0.010, refunded 0.030, the same on Overview, Present and Settlement and in the Devnet section.

**Feels fake or weak**
- **The primary settlement is a "hosted Solana sandbox", not a public cluster.** A judge can't independently check slots like 452,225,151. Devnet came afterwards, as a "re-settlement" about 6 hours later: the Devnet tx timestamp is 21:02 UTC and the run was 13:38–15:00 UTC. So the live loop wasn't on a public chain, and on a Solana track that is the first question I'd ask.
- **The scaling argument is shown on numbers that undercut it.** "Sandbox transactions 4, for 3 paid deliveries" means more transactions than deliveries. The "Why Solana" thesis (amortise opens and closes over many vouchers) is only argued, not shown. One channel carries 2 deliveries and the other carries 1.
- **Everything is tiny and fictional.** There are 3 advertisers, two of them nearly identical (ClearVault and KeyForge have the same capabilities, max bid and ratings), so every real auction is a tie or a single bidder. The auction never shows price discovery.
- **Settlement and Devnet numbers differ quietly.** Fees plus rent are 9,463,840 lamports on the sandbox and 8,406,760 on Devnet, and the rent columns are inconsistent: ClearVault's close shows "+1,488,440 / −1,488,440" while KeyForge's close shows only "−1,488,440". A sharp judge will spot it and wonder.
- **Slide 10 overstates what Verify counts.** It says the 48 checks cover "…plus the Devnet re-settlement tied to the same receipts", but 28+3+17 = 48 doesn't include Devnet. Verify's own Devnet section says it "does not query the chain".

## Jargon (quoted, judge's reaction)

- "Ed25519 signature", "canonical JSON", "receipt nonce": fine for a Solana judge, but opaque to a business judge.
- "lamports", "New rent, gross", "Reclaimed rent at close", "+1,488,440 / −1,488,440", "reclaim window": too much Solana plumbing for the main Settlement view. It belongs in a details drawer.
- "Cosine 1.000": I had to infer it means "exact same question". Say "exact match" or "very similar".
- "Relevance 3, intent 3", "Level 2 to 3", "2.5 rounds up", "Baseline 2.38 / With history 2.52": this is the agent-decision slide, and it reads like a stats appendix. The point (history nudged the agent into a higher bid tier) gets lost.
- "One observation per arm; not a measured lift": honest, but "arm" is A/B-test jargon.
- "Owned reference publisher app": an awkward phrase that appears everywhere. "Demo AI app (ours)" would be enough.
- "Hosted Solana sandbox": never defined in place. Is it Surfpool, a local validator, or a hosted fork? It needs one line.
- "Superseded, off-chain" next to voucher 1: clear only after the caption "Voucher 2 replaces voucher 1". Good that the caption exists.
- "Exchange clock" vs "sandbox chain times": a subtle distinction the overview explains up front. Too much, too early.
- "Jev": underlined as a glossary term, but never introduced as "an LLM / judgment model" in plain words on the first screen.

## Solana / Jev / ContextHint: what I understood

- **Solana:** payment channels. Each funded advertiser locks a USDC deposit in a per-advertiser channel PDA (open = one transaction). Each accepted delivery is a signed off-chain voucher with a cumulative total. Close is one transaction that verifies the latest voucher with the Ed25519 precompile, pays the publisher and refunds the payer. Why Solana: cheap, fast finality, USDC, and the Ed25519 precompile. I got this clearly from slide 9 and the Overview "Why Solana" card. It is a sensible fit, not Solana bolted on.
- **Jev:** a model the advertiser agents use to rate relevance and intent of a moment against the advertiser's declared capabilities. Code, not Jev, turns those ratings into prices. I understood its role but not what Jev *is* (whose model, why it and not GPT).
- **ContextHint:** a dataset of real observed ChatGPT ads next to prompts. It is handed to agents as "history" evidence. Slide 4 made this clear: "ContextHint had seen this exact question before, next to a hardware-wallet listing." The LeatherGuard "wallet is ambiguous" example is a nice touch. I'm unclear whether ContextHint is a separate product, a partner or the team's own.

## Did the Devnet proof convince me?

**Mostly yes.** The transaction exists, is finalized, matches the page to the lamport and the micro-USDC, uses real Devnet USDC, and verifies an Ed25519 signature on-chain through a custom program. That is better than most hackathon "on-chain" claims.

What keeps it from a full yes:
1. It is a *re-settlement* after the fact. The recorded loop ran on a private sandbox.
2. Only 5 transactions for 3 deliveries, so it proves correctness, not the amortisation economics.
3. Nothing on the page lets me click from a receipt hash to the exact on-chain voucher data that carried it.

## Present as a pitch (03–17)

- **Strong arc:** problem, product shot, the run, evidence, decisions, pricing, award/receipt/charge, cap and no-fill, Why Solana, check it yourself, three-word close. "Disclosed. Decided in code. Paid on delivery." is a memorable tagline.
- **The pacing works.** About 3:46 total, with captions on a dark bar like subtitles and a segmented progress bar. It runs on its own while a judge watches, which is great for a booth.
- **Problems:**
  - **The reveals land late.** On slides 1, 4, 8, 9 and 10 the right half (or bottom row) stays empty for the first ~10–12 s of autoplay (03, 07, 11, 12, 13). The LeatherGuard packet, the mobile no-fill, the Devnet stat and the "What this run does not show" list come in late. For a judge glancing over, each slide looks half-built. In manual mode they need an extra keypress (16 vs 17).
  - **Slide 1 is mostly empty.** It is a big headline over a lot of blank space. The three pillars it promises only fade in later.
  - **A dark empty band (~45 px) sits above the slide header** on every slide. It looks like a layout bug.
  - **Slide 5 (decisions) is the weakest.** It shows three dot-on-a-number-line charts about 2.38→2.52, and the caption carries the meaning. It needs a single visual: "with history, ClearVault bid 0.004 instead of 0.003".
  - **Solana arrives only at slide 9 of 11.** On a Solana track I'd tease "paid via Solana payment channels, verified on Devnet" on slide 1 or 2.
  - **Devnet appears only as a stat tile and a caption.** No explorer screenshot or link is on the slide. This is the most persuasive artefact for a Solana judge, and the pitch hides it.
  - **The timer shows slide start times** (0:15, 0:30…), not elapsed time. That is mildly confusing.

## Scores (1–10)

| Area | Score | Note |
|---|---|---|
| Orientation | 8 | The H1, product picture and honesty chips land in under 30 s. The subhead is overloaded. |
| Walkthrough (opportunity stepper) | 7 | The 9-stage stepper with J/K keys and "Show all stages" is clear. It's dense, but the structure is right. |
| Credibility | 8 | Self-aware caveats, a no-fill, cap and tie shown honestly, numbers consistent. Docked for the private-sandbox primary run. |
| Decisions + auction | 6 | The rules are clear (eligibility, cap, tie). The auction never shows competition: there are only ties and single bidders. The decision slide is over-quantified. |
| Settlement | 7 | Very thorough and accurate. Too much lamport and rent detail up front, a small rent-column inconsistency, and the sandbox/Devnet split doubles the page length. |
| Solana relevance | 7 | A real channel program with the Ed25519 precompile on Devnet is a genuine fit. The amortisation thesis is undercut by 4–5 transactions for 3 deliveries, and the live loop wasn't on a public cluster. |
| Present | 7 | Great arc and tagline, works hands-free. Late reveals leave half-empty slides, the top band looks like a bug, and Solana and Devnet come too late or too faint. |
| Verify | 9 | The tamper demo is excellent: instant and specific (hash plus signature mismatch), with the served file untouched. A downloadable JSON and in-browser recompute is the right design. |
| Visual craft | 8 | Clean, calm, consistent type and colour, and good tables. Some empty space in Present and a toast that covers table data on Verify. |
| Navigation | 8 | The persistent sidebar with opportunities and campaigns plus the Present/Verify buttons in the header is easy to follow. "Evidence" vs "Verify" vs "Settlement" overlap a little. |
| **Would this win (Solana track)** | **6.5** | Top-quartile credibility and craft. To win it needs the live loop on Devnet and a demo where channels visibly amortise many deliveries. |

## Top 10 changes

1. **Run the live loop on Devnet, not a private sandbox.** Even if the original recording stays as is, record a fresh run that settles on Devnet in real time, so the headline chip reads "Solana Devnet". Drop "Hosted Solana sandbox + Devnet re-settlement".
2. **Prove the amortisation.** Add a "scale run" or a simulated burst: one channel, 100–1,000 vouchers, still 2 Devnet transactions. Show "1,000 deliveries → 2 on-chain txs → $X in fees vs $Y per-ad". Today the numbers argue against the thesis (4 transactions for 3 deliveries).
3. **Put the Devnet explorer proof in the pitch.** Slide 9 or 10 needs a clickable explorer link, or a screenshot-style card with the signature, finalized slot, +0.007 / +0.013 token deltas and "Ed25519 verified on-chain". Mention Solana on slide 1.
4. **Fix the Present reveal timing.** Reveal all panels within 2–3 s, or lay slides out so the first frame is never half-empty. Remove the dark empty band above the slide header.
5. **Make one auction competitive.** Give KeyForge a different max bid or capability so at least one opportunity shows a real price-setting auction rather than a tie or a lone bidder.
6. **Simplify the decisions slide (slide 5)** to one before/after: "Without history: intent 2, bid 0.003. With ContextHint history: intent 3, bid 0.004." Move the 2.38/2.52 number lines to the detail page.
7. **Define Jev, ContextHint and "hosted Solana sandbox" in one plain line each** where they first appear, for example "Jev, a judgment model that rates relevance and intent". Don't rely only on dotted-underline tooltips.
8. **Collapse the lamport and rent plumbing on Settlement** into an "On-chain costs" disclosure. Lead with USDC flows and explorer links. Fix the rent-column inconsistency ("+1,488,440 / −1,488,440" vs "−1,488,440") and explain why sandbox and Devnet fees differ.
9. **Link receipt → voucher → on-chain close.** From each receipt hash on Verify and Settlement, deep-link to the Devnet tx that settled it, and show the voucher bytes the Ed25519 precompile verified. Also either count the Devnet consistency checks in "48" or stop saying they are included (slide 10).
10. **Polish:**
    - Make the tamper toast not cover the table (dock it, or auto-dismiss).
    - Make the Present timer show elapsed time.
    - Rename "Owned reference publisher app" to something human, for example "Demo AI app (ours)".
    - Shorten the overview subhead to two short sentences.
