# Final judge pass: axp.one (Solana track)

Reviewer stance: Solana-track hackathon judge, never seen axp.one, no docs or source read. About 8 minutes at 1440x900 in headless Chrome (2026-10-02).
Path: landing http://localhost:3410/ (scrolled in ~500px steps), then MVP http://localhost:3420/ covering Overview, Opportunity 1 (all 9 stages), Settlement, one Solana Explorer tx, Verify with tamper, Present (~75 s), Run it live and Evidence.
Screenshots: `docs/frontend/reviews/shots/final-judge/01..28`. Scripts: `docs/frontend/reviews/tools/final-judge/`.

---

## 10-second impression of the landing

It looks expensive. The huge type for "The advertising exchange for the agentic internet." sits over a field of tilted ChatGPT-style answer cards with "Sponsored" slots, and a crisp demo card shows a real answer plus a disclosed ClearVault ad. The three chips (ContextHint, Jev, Solana) tell me the sponsor stack straight away. The subline "Code sets the price; Solana pays the app." is the best sentence on the page.

Then I clicked the big blue **See the working MVP** button and nothing happened (see Broken).

## What I understood after the landing (two sentences)

When someone asks an AI app a buying question, advertiser agents use Jev to judge whether the moment fits them (with ContextHint's real ChatGPT-ad history as evidence), and plain code runs a sealed auction for one labelled Sponsored card shown beside the answer, never inside it. The winner pays only after the app signs a delivery receipt. Those payments are off-chain vouchers on a Solana payment channel, so sub-cent ads settle with one open and one close on chain instead of one transaction per ad.

## Did the landing make me want to open the MVP?

Yes, strongly. "Behind one Sponsored card, a whole exchange" (the stacked layers: Answer, Card, Auction, Agents, Evidence, Payment) and "Settled on Solana. Check it yourself." with real Open/Close/Channel Explorer buttons are the hooks. "It ran. Check it." with "47 checks run in your browser" sealed it. The hero CTA is dead, though, so I had to find the small header "See the MVP" button. Many judges would not.

## My explanation after the MVP (two sentences)

axp.one is a working, recorded exchange run: 4 questions, 15 Jev agent decisions, 3 auctions (highest bid, tie-break and frequency cap) plus 1 no-fill, 3 signed deliveries, and 0.011 test USDC paid to the publisher over 2 Solana Devnet payment channels whose open and close transactions are real and finalized. Every hash and Ed25519 receipt in the public run file can be recomputed in the browser, and flipping one byte visibly breaks the hash and the signature.

## How convincing each pillar felt

- **ContextHint (data): 6/10.**
  - The landing pitch is strong: real observed ads from Canva, Robinhood, Salesforce and Cursor, "More than a thousand marketers use ContextHint every day", and honest scale words.
  - The Evidence page has real numbers (1,178 prompt/ad pairs, 241 prompts, BGE-768 cosine retrieval, held-out-tested hints), which felt like real infrastructure.
  - What was actually fed to the winning agent undercuts it. The top evidence for the hero question is a Mercari used-goods listing ("Nano Trezor Hardware Wallet NEW ... Paid $55"), and the only measured effect is that history moved ClearVault's intent score from 2.34 to 2.51 across a rounding line (bid 0.003 to 0.004). The UI itself says "One observation per arm; not a measured lift." That is honest, but it makes the data feel decorative.
- **Jev (decisions): 7/10.**
  - "Agents advise. Code decides the money." is a clear, defensible design, and seeing 6 Jev calls per opportunity with timings, packets and Inspect buttons is credible.
  - The landing card ("Relevance Direct fit 87% confident / Buying intent Ready to buy 51% confident") does not match the MVP's "intent 3 of 3 (score 2.51)". The "51%" reads like the decimal part of 2.51 relabelled as confidence. A sharp judge will catch it, and it feels manufactured.
  - The confidence bars are fully filled at 51% too.
- **Solana (settlement): 7/10.**
  - Clicking through to the Explorer (ClearVault close, `5GeYRi...PmDzm`) showed "Success, Finalized (MAX Confirmations)", slot 506,422,686, +0.007 to the publisher token account, +0.013 back to the payer, and an Ed25519 SigVerify precompile in the tx. That last one is a nice signal that the voucher signature is verified on chain.
  - Payment channels with cumulative vouchers are a legitimately Solana-flavoured micro-payment design.
  - What holds it back:
    - The product's own copy admits "channels cost about as many transactions (4) as deliveries (3) here", so the run never demonstrates the scaling claim.
    - The "USDC" is a self-minted test token: Explorer shows mint `4zMM...` as "tokens", not Devnet USDC.
    - Opening a channel costs 3,439,160 lamports of rent to carry a 0.007 payment.
    - "Run it live" cannot run.

## Confusing, fake-feeling, jargon, broken or slow

**Broken**
- **Hero CTA unclickable.** The invisible second-scene headline (`div.hero_line`, the "Behind one Sponsored card..." block, opacity 0, z-index 5, pointer-events auto) covers x 79-511 and y 24-924 of the first viewport.
  - A real mouse click on **See the working MVP** does nothing (I verified that no tab opened). The **ContextHint** chip and **View on Explorer** link in the hero are blocked the same way.
  - The header "See the MVP", "Decisions Jev" and "Settlement Solana" still work.
  - This is the single biggest risk: it is the first thing a judge clicks.
- **Run it live is a dead end.** It says "Live runs are available on the hosted site" and "This copy of the MVP is a static site" but gives no link to the hosted site. It felt like the demo's one live claim was quietly withdrawn, and the remaining page is empty white space.

**Confusing or contradictory**
- The header badges "Recorded replay" and "Live on Solana Devnet" sit side by side on every MVP page. Is it live or not? (Answer: recorded from a live Devnet run on Oct 1, but no page says that in one phrase.)
- The landing says "From our live Devnet run", but the video says "From our earlier sandbox run." Which one is the demo?
- On the landing, "0.004, then 0.007 of 0.020" (Payment layer) is unreadable until you reach the Solana section and learn that vouchers are cumulative.
- On Opportunity 1, Delivery shows "+22.0 s". Does an ad take 22 seconds to deliver?
- In Present, beat 2 needed two right-arrow presses, with no cue that it has a sub-step. The Present button opens in manual mode; autoplay only comes from "Watch the guided replay".

**Jargon (quoted)**
- "Baseline, research only" / "With history" / "Level changed" / "2.5 rounds up"
- "One observation per arm; not a measured lift."
- "Fees and new rent, lamports 8,406,760 ... cap 20,000,000"
- "Phase finalized, no reconciliation needed."
- "Cumulative authorization in USDC, against the 0.020 deposit (campaign cap 0.008 as a line)"
- "Bid table v1", "Sealed, first price", "conservation"

**Fake-feeling**
- The Jev "51% confident" mismatch (above).
- The Mercari, Ariat and Yoder leather-wallet listings as "evidence" next to the polished Canva/Robinhood wall on the landing.
- The three fictional advertisers with `.example` domains are fine and clearly disclosed.

**Visual nits**
- At the How-it-works to ContextHint transition, "Agents advise. Code decides the money." renders light-blue on the orange background (unreadable).
- The landing is about 11,100px long, roughly 22 scroll steps.
- The MVP drops from the landing's bold editorial look to a plain grey admin dashboard, so it feels like two products.

**Slow:** nothing. Landing about 1.1 s, MVP navigation under 1 s, Verify ready in 0.6 s, Explorer loaded in 1.9 s.

## Most memorable moment

Tamper with one byte on Verify. One click turned the panel red: "Tampered copy: 45 of 47 pass. One changed character in opportunity 1's receipt breaks its hash and its signature. The served file is unchanged: 47 of 47." It showed the mismatched hash, and Reset restored 47/47. The runner-up is the landing's exploded "Behind one Sponsored card, a whole exchange" stack.

## Scores (1-10)

| Area | Score | Why |
|---|---|---|
| Landing first impression | 8 | Gorgeous, confident, clear. Loses points because the main CTA is dead |
| Clarity | 6 | The landing story is clear; the MVP buries it under precise but dense jargon |
| Story | 7 | Answer, then agents, auction, receipt, Solana is a tight arc; the "why ContextHint matters" beat is weak |
| Visual craft | 8 | Landing 9, MVP 7 (clean but generic); one contrast bug |
| MVP orientation | 7 | Good sidebar, the stage stepper (1-9 with J/K) and "Step through opportunity 1"; the overview is dense |
| Credibility | 7 | Real finalized Devnet txs, hashes and signatures; hurt by live-vs-recorded ambiguity, the 51% mismatch and the dead Run-it-live page |
| Solana relevance | 6 | Real payment-channel program plus Ed25519 precompile; scale benefit not shown (4 tx for 3 ads), test-token "USDC", Devnet only |
| Verify | 8 | Best page; would be a 9 if it also cross-checked the on-chain close amount |
| Present | 7 | Clean 11-beat deck with captions; manual by default; one sticky step |
| Overall "would this win" | 6 | Top-10 quality craft and rigor, but the Solana part reads as a thin settlement layer, and a broken hero CTA plus no live run cost it at judging time |

## Top 10 changes, ranked by judging impact

1. **Fix the hero click-blocker.** Give `.hero_line` `pointer-events: none` (or `visibility: hidden` / `inert` while its opacity is 0) so **See the working MVP**, the ContextHint chip and **View on Explorer** work. Every judge clicks this first.
2. **Make "Run it live" real or link out.** Link to the hosted live runner (or embed a 60 s screen recording of an actual live run with its fresh Explorer links). Never show a dead end with "available on the hosted site" and no URL.
3. **Prove the Solana scaling claim in-run.** Add or record a run where one channel carries many vouchers (for example 50 deliveries and 2 transactions), with a per-ad cost comparison against a transfer per ad, including rent reclaimed. The current honest caveat (4 tx for 3 deliveries) argues against the pitch.
4. **Resolve live vs recorded in one phrase.** Replace the paired badges "Recorded replay" and "Live on Solana Devnet" with "Replay of a live Devnet run, Oct 1, 22:10 UTC". Align the video caption ("earlier sandbox run") with it.
5. **Make the landing's Jev numbers match the MVP.** Show what the MVP shows (relevance 3/3, intent score 2.51 leading to level 3, and the bid table) or explain what "87% / 51% / 81% confident" are. Size the confidence bars to their values.
6. **Use real Devnet USDC, or say what the token is.** Either use the Devnet USDC mint or label it "test token standing in for USDC (mint 4zMM...)" so the Explorer's bare "tokens" doesn't surprise a Solana judge.
7. **Add an on-chain cross-check to Verify.** Fetch the close tx from Devnet in the browser and assert that the publisher received the last voucher total, the payer received the remainder, and the signer key matches the publisher key. Today the signatures are checked against a key "published in the same file".
8. **Upgrade the ContextHint evidence showcase.** Lead with evidence that looks like the landing's ChatGPT ad wall, not a Mercari used-Trezor listing. Show one example where evidence changed an outcome (who won or lost), not just a 2.34 to 2.51 rounding crossing.
9. **De-jargon the Decisions and Settlement stages.** Rewrite "Baseline, research only", "With history", "2.5 rounds up", "one observation per arm", "lamports", "reconciliation" and "conservation" in plain words. Keep the precise terms behind Inspect.
10. **Bridge the two visual worlds and polish Present.** Carry some of the landing's type and colour into the MVP header and overview hero. Make Present autoplay with a visible pause control and a cue for sub-steps. Fix the light-blue-on-orange "Agents advise. Code decides the money." line.
