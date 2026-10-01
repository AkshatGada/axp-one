# MVP v3, cold judge review (Solana track)

Reviewer: hackathon judge, first time seeing axp.one. I clicked "See the working MVP" and spent about 5 minutes at http://localhost:3420/ (1440x900, headless Chrome). I didn't read any docs or source. I clicked like a person would, ran the Verify tamper demo, and let Present mode autoplay for about 2.5 minutes, then jumped to slides 8 to 10.
Server: healthy the whole session. Every route returned 200, and there were no console or page errors. (A stale `Internal Server Error` capture from the earlier outage was in the shots folder. I removed it.)

Shots (in path order): `shots/mvp-v3-judge/01` … `29`
01 landing · 02 landing full · 03/04 glossary hovers (ContextHint, Jev) · 05 opp 1 stage 1 · 07 eligibility · 08 evidence · 09 decisions · 10 auction · 11 delivery · 12 charge · 13 receipt Inspect drawer · 14 opp 3 auction (frequency cap) · 15/16 Settlement · 17 sandbox tx Inspect · 18 Verify · 19 Verify after tamper · 21–29 Present mode (slides 1, 2, 3, 4, 5, 6, 8, 10).

---

## First 30 seconds

- The header loads with four honesty chips: "Recorded replay · Hosted Solana sandbox · Test USDC · Fictional advertisers". I knew right away this is a replay and not a live system. That's honest, but it also deflates me a little before I've seen anything.
- The H1 is just "Overview". The one-line pitch is in the grey paragraph under it: "One recorded run of an ad exchange inside an AI app: four questions, advertiser agents, sealed auctions, disclosed Sponsored cards and test USDC settlement." I got it in about 10 seconds. It reads as a description of the record, not as a product claim.
- Six KPI tiles show 4 / 3 of 4 / 15 / 0.004 USDC / 0.010 USDC / 48/48 Passing. The blue box "Where a rule changed the winner: opportunity 3" is the first thing that told me there's real logic here, not a mock.
- On the right, "Latest delivery" shows the real artifact: a chat bubble with a "Sponsored" card under it. This is the clearest picture of the product on the page, but it sits below the fold line and to the right.
- Two CTAs: "Step through opportunity 1" and "Watch the guided replay". Both are obvious. I clicked Step through first.

After 30 seconds I understood: an ad exchange for AI chat apps where advertiser AI agents bid, code runs the auction, and Solana does the payment. I did not yet know why Solana, or what's novel compared with an ordinary ad server.

## Understanding after 5 minutes

The pipeline is shown as a nine-stage stepper (Moment, Eligibility, Evidence, Decisions, Auction, Award, Delivery, Receipt, Charge) next to a mock chat app.

1. The AI app answers the user organically, with no advertiser material, and offers one Sponsored slot with a coarse topic, must-have and nice-to-have capabilities, and a floor (0.001 USDC).
2. A hard rule filters campaigns by declared capability. LeatherGuard, an RFID leather wallet, is excluded from crypto questions.
3. Each advertiser's agent gets a packet of ContextHint history: real past prompts and the real ads that appeared next to them (Mercari Trezor listing, cosine 1.000).
4. A model called Jev rates relevance and intent on a 0–3 scale. A baseline arm runs without history and another arm runs with it. History nudged intent from 2.38 to 2.52, which crossed the rounding line.
5. Code maps the levels to a bid through a published bid table (3:3 → 100% of the 0.004 max). The highest bid wins and pays its own bid. Ties go to the lower campaign ID.
6. The award holds budget. The app inserts the card, acknowledges it, and signs an Ed25519 receipt. Only then is a charge created, and it advances an off-chain cumulative voucher on that advertiser's payment channel.
7. Settlement uses one open and one close transaction per advertiser on a "hosted Solana sandbox". The publisher is paid the last voucher total and the rest is refunded: 0.010 paid and 0.030 refunded from 0.040 deposited.
8. Verify downloads `run.public.json` and recomputes 28 hashes, 3 signatures and 17 arithmetic or rule checks in the browser. Tampering with one byte flips the receipt hash and the signature to "Mismatch".

Opportunity 3 is the best moment in the demo: "Agent said bid. Exchange did not admit it." The frequency cap is a rule outside the model. Opportunity 4 (mobile-only) shows a no-fill with zero agent calls. Both are good demonstrations of "rules beat the model".

## Two-sentence explanation (as I'd tell another judge)

axp.one is an ad exchange for AI chat apps: advertiser agents judge each question with a small model (Jev) using real historical ad data (ContextHint), but deterministic code sets eligibility, price and frequency caps, and the app only gets paid for deliveries it cryptographically signs. Payment uses USDC payment channels on Solana, with off-chain cumulative vouchers per ad and one on-chain open and close per advertiser, and the whole run is a public file you can re-verify in your browser.

## What's convincing vs. what feels fake

**Convincing**
- The model never names a price. The bid table is visible, and Verify recomputes "Bid equals the bid table" (5/5). That is a credible answer to "can't the LLM just overbid?"
- The receipt → charge → voucher chain, the voucher-replaces-voucher explanation ("0.007 in total, not 0.004 plus 0.007"), and the channel conservation check (7000 + 13000 = 20000). This is real payment-channel thinking, not hand-waving.
- The tamper demo works and is legible. It shows a red rail, "Tampered copy", the recomputed hash in red, "signature does not match", and Reset restores everything (shot 19).
- The honesty is extreme and consistent. "What it does not prove" lists no human attention, not devnet or mainnet, one test payer for both advertisers, and "one observation per arm; not a measured lift". A skeptical judge respects this.
- The real ContextHint data (Mercari, Ariat, Yoder Leather ads next to real prompts) makes the evidence layer feel grounded. The "wallet is ambiguous" LeatherGuard story is a nice touch.
- The restart check shows 0 new model calls, 0 charges, 0 signatures, which suggests idempotency was actually engineered.

**Feels fake or weak**
- **The Solana part can't be checked independently.** The page shows slots and a raw tx signature in the Inspect drawer (shot 17), but there's no explorer link, no program ID, no cluster URL. Verify says it deliberately leaves out "the sandbox network address and settlement links". For a Solana track, this is the weakest point: the on-chain half is the one part I can't check, and Verify checks only the JSON's internal arithmetic, not the chain.
- "Hosted Solana sandbox, not devnet or mainnet" appears about 10 times. A Solana judge will immediately ask why it's not on devnet. Is this a local validator? Surfpool? If a deployed program exists, the demo hides it.
- It's all a recording of one run with four questions and three fictional advertisers, and one test payer funds both "independent" advertisers. Nothing is live to poke at. The "Draft a campaign" page explicitly says it "never shows a win".
- The money is tiny and fees exceed spend: 9,463,840 lamports (≈0.0095 SOL) of fees and rent against 0.010 USDC of ads. The page explains this honestly ("Why fees are larger than the ad spend here"), but it's still the visual takeaway.
- The ties are decided by "lower campaign ID". So two of three auctions were won by an arbitrary ordering, which undercuts the "smart auction" feel.
- The raw receipt JSON shows `"publisherId": "owned-travel-app"` for a crypto-wallet question (shot 13). This is a small slip, but a judge who opens the raw JSON sees a leftover name.
- The tamper demo doesn't update the headline. After tampering, the "Checks in your browser 48/48 Passing" tile above it stays green. I expected it to drop to 46/48 Failing.

## Jargon (quoted, all from the UI)

- "Admitted decisions", "Awards", "Charges" (Run activity lanes): internal state-machine nouns.
- "Coarse intent only; no user profile", "Must have / Nice to have" are fine. But "Levels 3:2" and "A level is the rounded score, from 0 to 3" mean I have to learn the notation "relevance:intent" first.
- "Baseline, research only" / "With history" / "arm" / "One observation per arm; not a measured lift": experiment-design language.
- "Packet hash recomputed here", "View exact packet", "Acknowledgement hash recomputed here".
- "Vector match: the exact question was stored", "Similarity is cosine … word overlap otherwise", "Leave-one-out tested", "Held-out tested", "BGE, 768 dimensions".
- "Cumulative authorization", "off-chain voucher", "Phase finalized, no reconciliation needed".
- "New rent, gross", "Reclaimed rent at close", "lamports": fine for a Solana judge, opaque for anyone else.
- "Organic completions use an operator-recorded isolated app-agent bridge" (Present slide 10). I couldn't parse this.
- "Projected from the run's saved record, whose hash matches its manifest. 45 of 45 build checks passed, including a vector guard".
- "Run v3-wallet-acceptance" in a monospace run picker in the header: this is an internal test-run name used as the product's face.

The glossary tooltips (dotted underlines) help a lot. The ContextHint and Jev tooltips are clear (shots 03 and 04). But the Jev tooltip covers the "Step through" CTA.

## Solana / Jev / ContextHint understanding

- **Solana:** I understood it as the settlement rail. Each advertiser has a USDC payment channel, there are off-chain vouchers per ad, and one open and one close per channel. It's clearly the right design for micro-payments. I could not tell what is actually on Solana: is there a custom channel program? Is it SPL-token escrow? There's no program ID, no explorer link, and no reason given for not using devnet. The Solana-specific insight ("vouchers make a 0.003 USDC ad viable despite tx fees") is there, but buried in a grey box at the bottom of Settlement.
- **Jev:** "The judgment model each advertiser's agent used. It rates relevance and buying intent as levels from 0 to 3. It never names a price; code does." This is clear. Who or what Jev is (in-house? third-party?) isn't said. The version string "jev-1.13.0" sits in the footer.
- **ContextHint:** "A recorded library of prompts and the ads that appeared beside them in AI answers, with inferred targeting hints." It's clear, it links to contexthint.com, and the Evidence page shows real scale (1,178 prompt–ad pairs, 537 creatives). This is the most differentiated asset, and it's undersold on the Overview.

## Present mode as a pitch

- 10 slides on autoplay, about 20–30 s each (≈3.5–4 min total), with a dark caption bar and progress ticks. Keys work: `?` shows Space/←/→/1–0/A/C/E/R/Esc. "E: open this in the explorer" is a nice bridge to the detail.
- The order works: question → one recorded run → advertisers → evidence → decisions → code sets price → award/receipt/charge → cap and no-fill → settlement → check it yourself. Slide 1 ("An AI app answers on its own. No advertiser material reaches the answer.") is a strong opener. Slide 6 ("Code sets the price") is the best slide.
- Weaknesses as a pitch:
  - There's no problem slide and no "why now / who pays / why Solana" slide. It goes straight into mechanics, so a judge watching it cold gets the how but never the why.
  - Slide 10 ends on "Not mainnet, not attention, not targeting lift." It closes on a list of disclaimers instead of a claim or ask. Autoplay then just sits on slide 10.
  - Slide 8's bid chart is cramped into a narrow card. The axis labels collide ("fl0or 0.001 0.004"), and the "Not admitted: frequency cap" label overflows the card edge (shot 28). Beats reveal progressively, so the right half is empty for the first seconds of slides 8 and 10.
  - A 45 px empty dark band sits at the top of every slide.
  - Settlement (slide 9) is the Solana moment, but it's second-to-last and has no on-chain proof (no tx link or explorer).
- As a pitch it's a solid 4-minute explainer of mechanics. It would lose a judging room that wants the problem and the Solana angle in the first 30 seconds.

## Scores (1–10)

| Area | Score | Why |
|---|---|---|
| Orientation | 7 | The one-liner and honesty chips are clear within 10 s; the H1 is "Overview" and the actual product picture (the Sponsored card in chat) is secondary. |
| Walkthrough (opportunity stepper) | 8 | The nine-stage stepper next to a live-looking chat app is excellent, and J/K keys work. Long stages push the stepper off-screen, and stage 9 dead-ends (Next disabled; you have to find "Opportunity 2 →" at the top). |
| Credibility | 7 | Rigorous hashes, signatures, rules and disclaimers. The chain half can't be verified, there's one payer and a recorded single run, and the `owned-travel-app` slip shows. |
| Decisions + auction | 8 | Baseline vs. history arms, the bid table and the frequency-cap override are a clear "model advises, code decides" story. Two tie-break wins by campaign ID weaken it. |
| Settlement | 6 | Correct payment-channel model with a great voucher chart. No explorer links or program ID, fees exceed spend, and it's labelled "sandbox" 10 times. |
| Present | 6 | Polished and well paced, but no problem/why-Solana framing, it ends on disclaimers, and the slide 8 chart is broken. |
| Verify | 8 | 48 checks in the browser and a tamper demo that clearly fails. The headline tile doesn't react to the tamper, and nothing touches the chain. |
| Visual craft | 8 | A calm, consistent, Linear-grade system with a single blue accent. Minor issues: the oversized "Recomputable on Verify" link in the Inspect drawer, the slide 8 overflow, and dense tables. |
| Navigation | 8 | The sidebar mirrors the story, breadcrumbs work, and prev/next works. The run picker has only one run, and Draft a campaign / Evidence / Publisher feel like appendices. |
| Would this win (Solana track) | 6 | Top-quartile engineering rigor and honesty, but Solana is the least demonstrable part. A Solana judge will ask "where's the program, where's devnet?" and the demo can't answer. It could place, but probably wouldn't win the Solana track as shown. |

## Top 10 changes (in priority order)

1. **Make the Solana half verifiable.** Deploy the channel program to devnet, or explain the sandbox, and show the program ID plus explorer links for the four open/close transactions on Settlement and in the tx Inspect drawer. Add an on-chain check to Verify, for example "close tx publisher delta = last voucher". This is the single biggest lift for the Solana track.
2. **Add a "Why Solana" beat** to the Overview and Present: per-ad cost is a signed voucher, so a 0.003 USDC ad is viable; one open and one close per advertiser; USDC-native. Move the "Why fees are larger than the ad spend" logic up and turn it into a selling point ("at N ads per channel, fees fall below X%").
3. **Give Present a problem and ask frame.** Add a slide 0: AI apps need revenue without corrupting answers; advertisers need agentic buying. End on a claim or next step, not the "Not mainnet, not attention, not targeting lift" disclaimer line (move it one beat earlier).
4. **Make the tamper propagate.** When "Tamper with one byte" is pressed, the headline should flip to 46/48 Failing (and the Overview Verify tile if it's shared). Right now the big green "Passing" stays put next to two red mismatches.
5. **Fix the Present slide 8 chart.** The axis labels overlap ("fl0or 0.001 0.004"), the "Not admitted: frequency cap" label overflows the card, and half the slide is empty. Give it the full width as slide 6 has.
6. **Fix the `"publisherId": "owned-travel-app"` leftover** in the receipts (and anywhere else in run.public.json). A judge who opens the raw JSON will see it.
7. **Change the H1 from "Overview" to a product sentence**, e.g. "An ad exchange for AI apps: agents bid, code prices, Solana settles", and move the chat-plus-Sponsored-card specimen to the hero, left of the KPIs.
8. **Show at least one auction that isn't decided by tie or cap.** Two of three wins are "lower campaign ID". Give the funded advertisers different max bids or capabilities so one opportunity is won on merit (levels or price). Otherwise the auction looks degenerate.
9. **Cut the jargon on the first-click path.** Rename "Admitted decisions / Awards / Charges" lanes to plain words. Explain "Levels 3:2" inline as "relevance 3, intent 2". Drop "operator-recorded isolated app-agent bridge", "vector guard" and "arm" from anything a judge sees in the first two minutes. Rename "Run v3-wallet-acceptance" to a human label ("Wallet demo run").
10. **Smooth the stepper ends.** At stage 9, turn the disabled "Next stage" into "Next: Opportunity 2 →". After Next on a tall stage, scroll the stepper back into view. Keep the Jev tooltip from covering the primary CTA. Fix the oversized underlined "Recomputable on Verify" in the Inspect drawer header.
