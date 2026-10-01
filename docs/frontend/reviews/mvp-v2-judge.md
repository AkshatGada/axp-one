# axp.one MVP v2: cold judge walkthrough

Reviewer: a hackathon judge who clicked "See the working MVP" with no context. I did not read docs or source.
Setup: http://localhost:3420/, headless Chrome at 1440x900, about 5 minutes, clicking visible controls and using J/K and the Present keys the UI advertises.
Screenshots, in order: `docs/frontend/reviews/shots/mvp-v2-judge/01..25`. Driver: `docs/frontend/reviews/tools/mvp-judge/step.cjs` (CDP stepper) and `present-check.cjs`.

---

## First 30 seconds (01, 02)

**What is this?** The header reads `Run v3-wallet-acceptance` with the pills `Recorded replay · Hosted Solana sandbox · Test USDC · Fictional advertisers`. The Overview sentence does the real work: *"One recorded run of an ad exchange inside an AI app: four questions, advertiser agents, sealed auctions, disclosed Sponsored cards and test USDC settlement."* Within about 10 seconds I knew it was an ad exchange that puts a labelled ad card next to an AI chat answer, with AI agents bidding for the advertisers and settlement on Solana.

**What do I do?** There are two buttons: `Step through opportunity 1` and `Watch the guided replay`. That's clear. The KPI row (4 opportunities, Fill 3 of 4, 15 agent decisions, 0.004 clearing, 0.010 spend, Verify 48/48) and the "Latest delivery" mock card next to a real-looking chat bubble sell the concept at a glance.

**Friction in those 30 seconds:**
- The numbers have no units. `Clearing prices 0.004` and `Accepted spend 0.010` don't say USDC until you read the small print, so a judge reads "0.004 what?".
- `Built on ContextHint data, Jev decisions and Solana settlement` names two things I've never heard of (ContextHint, Jev) in the first paragraph.
- The sidebar footnote *"Opportunities are in story order. On the exchange clock, the mobile question ran first."* is a caveat before I know the story. It makes me suspect something.
- `Run v3-wallet-acceptance ▾` reads like an internal test-run ID, not a product.
- On Overview the Campaigns table scrolls horizontally inside its card at 1440. The `Refunded at close` column is clipped to "Refunded at clos" and its values to "0.01" (02).

## What I understood after 5 minutes

An AI app (the "publisher") answers a user's question with its own model. Separately, it offers one Sponsored slot carrying only coarse intent: a topic, must-have and nice-to-have capabilities, and a floor price. The flow from there:
1. A code rule filters which campaigns may compete, based on the capabilities each campaign declares.
2. Each eligible advertiser's agent (an LLM, "Jev") gets a packet of historical ad observations from ContextHint and scores relevance and commercial intent as levels 0 to 3.
3. Code, not the model, turns those levels into a bid through a fixed table. A sealed first-price auction picks the winner.
4. The app inserts the card, labels it Sponsored, and signs an Ed25519 receipt.
5. Only a signed delivery becomes a charge. Each charge advances an off-chain voucher on a per-advertiser Solana payment channel, and one close per channel pays the publisher and refunds the rest.
6. The Verify page recomputes all the hashes, signatures and sums in your browser.

**The two sentences this MVP proves:** An AI app can sell a clearly labelled ad slot without letting advertiser material touch its answer: LLM agents judge fit, deterministic code sets the price, and the publisher is paid only for signed, verified deliveries. The whole money path (escrowed deposit, per-delivery vouchers, one settlement per channel) is auditable end to end from a public record that anyone can recompute.

## Where I got lost

1. **Present mode / "Watch the guided replay" (17-22, 25).** The slide frame is cut off on the right and bottom at 1440x900. The frame is scaled to 0.75 (1920 to 1440) but still offset by (240, 135), so about 240 px of the right side and the caption line are off-screen. On beat 5 the LeatherGuard card is invisible (21). On beat 9 the second channel is cut in half (22-beat9). I reproduced this in a fresh browser (19); at 1920x1080 the frame sits at 0,0 and looks right. **The primary CTA on Overview opens this broken-looking screen** on any laptop.
2. **Contradiction in the stage text.** Stage 2 says *"A rule in code, checked before any agent is asked"*, and LeatherGuard is excluded. Stage 4 then shows LeatherGuard *"Decided with Jev"* with two recorded agent calls (Skip, Skip), and Verify lists `1 · leatherguard · baseline/history` packets. So the excluded agent was asked anyway. A sharp judge will catch this. Either the copy is wrong or the pipeline order is.
3. **Clocks.** Overview has the "exchange clock" (13:38 to 15:00 UTC). Settlement has a "sandbox clock", and its channel closes happen at 14:41 to 14:42, which looks *before* the 14:56 to 15:00 charges. The page pre-empts this: *"These block times are not aligned with the exchange clock on the Overview and must not be compared with it."* Saying "don't compare these" makes me compare them, and it reads as if settlement happened before the deliveries.
4. **The stage stepper shows ✓ on all nine stages before I've seen any of them** (03). It looks like a progress bar that's already finished, which spoils the step-through. Stage 9 also previews opportunity 2's voucher (0.007) before I've seen opportunity 2.
5. **Evidence stage (05).** The tabs `ClearVault 1 · KeyForge 1 · LeatherGuard 3` have unexplained counts. `Tier loo` is an unexplained badge, maybe a truncated label or an internal tier code. Hitting `Cosine 1.000` in the first content block assumes ML literacy.
6. Esc from the Present key overlay didn't leave Present (it probably only closed the overlay). That's minor.

## Jargon and confusing text (exact quotes)

- "Jev decisions", "Decided with Jev": what is Jev?
- "ContextHint history", "Vector match: the exact question was stored", "Cosine 1.000", "Embedding model revision not recorded"
- "Tier loo"
- "Baseline, research only" vs "With history": the two arms are never explained up front.
- "Level changed · 2.5 rounds up · Baseline 2.38 · With history 2.52". This takes a minute to decode, and the takeaway ("history nudged intent across a rounding line") is weak, which the page admits: "One observation per arm; not a measured lift."
- "Bid table v1", "Levels 3:3 → 100%"
- "Cumulative authorization", "voucher", "Voucher 2 replaces voucher 1: 0.007 in total, not 0.004 plus 0.007"
- "lamports", "9.46M lamports, cap 20M", "New rent, gross", "Reclaimed rent is not subtracted from the cap"
- "Owned reference publisher app (ID from an earlier prototype)"
- "Phase finalized, no reconciliation needed."
- "Funding is not settlement"
- Verify > The public file: the chips render as `events events decisions decisions decisions decisions decisions decisions`. They look like unlabeled keys or a rendering bug (16).
- Opportunity 4: `mobile software wallet` appears under both **Must have** and **Nice to have** (23).
- "base units" on Draft a campaign (Max bid 3000 = 0.003 test USDC).

## What felt fake vs convincing

**Convincing**
- The organic answer is clearly a real model output, long and hedged, and it is visibly separate from the dashed "Sponsored slot, awaiting auction" box. The card fills only at the Delivery stage (09). This is the best single visual in the product.
- Code sets the price. The auction panel (07) is clean: four level-to-percent tiles, bars against the floor, Winner / Price / Rule, and an explicit tie-break.
- The no-fill (23): a mobile-only question excludes everyone by rule and makes 0 agent calls. The answer still serves the user. This is a strong, honest beat.
- Frequency cap on "Same question again" shows the exchange has rules beyond the highest bid.
- The Settlement arithmetic reconciles: 0.040 deposited = 0.010 paid + 0.030 refunded, with 4 transactions. The "Inspect" drawer shows a raw tx signature, slot and token deltas (13).
- The honesty is unusually good: "Fictional advertiser" on every card, "not devnet or mainnet", "not a measured lift", and a **What it does not prove** box. It builds trust.

**Felt fake or thin**
- Both real auctions are ties at the max bid (0.004 vs 0.004 and 0.003 vs 0.003), decided *alphabetically by campaign ID*. The only "competition" shown is two agents that both maxed out, with the winner chosen by ID. That's what a judge will remember about the auction.
- The economics: 9.46M lamports (about 0.0095 SOL) of fees and rent to settle 0.010 USDC. The fees and rent dwarf the ad revenue, and nobody addresses it.
- "Hosted Solana sandbox" means there's no explorer link. I can't check a single transaction outside this site.
- The three advertisers are fictional, one test payer funds all of them, and the publisher is "owned". Every party is the team, so "exchange" is a stretch for now.
- Draft a campaign (24) states *"this preview never shows a win"* and uses levels *"Borrowed from ClearVault's recorded agent"*. The one interactive feature can't evaluate my creative and can't win, so it feels like a disabled toy.

## Did Verify convince me?

**Partly. 6/10 as persuasion, 8/10 as engineering.** 48/48 checks recomputed in the browser is impressive, and the grouping is legible: question hashes, 15 packet hashes, creative and acknowledgement hashes, 3 Ed25519 signatures, voucher and conservation sums, the tie-break re-run, the fee cap. The "What this proves / What it does not prove" pair is the best copy on the site.

It didn't fully land, for these reasons:
- It verifies a file served by the same server against itself. *"Nothing here trusts the page that displays it"* is technically true, but the data and the checker come from one origin. It proves internal consistency, not that anything happened.
- There's no tamper demo. A "flip one byte and watch check #23 go red" toggle, or a "drop your own run.json here" box, would turn this into proof.
- There's no link from any on-chain check to an external explorer, because it's a sandbox.
- The "Recorded / Computed here" columns show identical truncated hashes for 48 rows. After the first table it reads as wallpaper.

## Did Present mode work as a pitch?

**Not at laptop size.** The 10-beat structure is good: question, run, advertisers, evidence, decisions, code sets price, award/receipt/charge, cap + no-fill, settlement, check it yourself. The captions are well written, and the keyboard map (→/Space, Shift→, 1-0, A, C, E, R, Esc) is solid presenter tooling. But at 1440x900 every slide is clipped on the right and bottom, so captions are cut mid-sentence and the right-hand cards (LeatherGuard, KeyForge) are missing. A judge watching this on a laptop or a projector set to 1440 sees a broken layout. At 1920x1080 it works.

On content, the ending (beat 10: 48/48 plus "0 new calls / 0 new charges / 0 new signatures") is a whimper. There's no "why this matters", no market, no ask. Beat 9 at a jumped-to state showed empty card bodies (22-beat9), so jumping by number may skip intra-beat reveals.

## Scores (1-10)

| Area | Score | Why |
|---|---|---|
| Orientation | 7 | The one-sentence summary and the two CTAs are clear. It loses points for unitless numbers, ContextHint/Jev name-drops, and the run-ID header. |
| Opportunity walkthrough | 7 | The 9-stage stepper with J/K and the live chat specimen is excellent. It loses points for pre-ticked stages, jargon in the Evidence and Decisions stages, and the "before any agent is asked" contradiction. |
| Honesty / credibility | 8 | It is scrupulously caveated. Credibility is dented by tie-at-max auctions, a sandbox chain with no explorer, and the clock mismatch. |
| Decisions + auction clarity | 6 | Auction is 8 on its own. Decisions is 4: two arms, decimal scores and rounding lines, a lot to decode for a weak point. |
| Settlement clarity | 7 | The deposit/paid/refund bars and the voucher step chart are clear. Lamports, rent and the fee cap are noise for a judge. |
| Present mode | 3 | Good script, broken framing at 1440x900, weak close. |
| Verify | 7 | Rigorous and well framed. It needs a tamper demo or an external anchor to be persuasive. |
| Visual craft | 7 | Linear-grade in the explorer. The clipped campaigns table, duplicate chips, "Tier loo" and the Present overflow cost it. |
| Navigation | 8 | Persistent sidebar, breadcrumbs, prev/next opportunity, "See it settle →", Esc-closable drawers. |
| Overall "would this win" | 6 | It's top-quartile on rigor and honesty, but it isn't a winner yet: the demo moment (Present) breaks on the judge's screen, the auction looks degenerate, and it never says why anyone should care. |

## Top 10 changes, ranked

1. **Fix Present-mode scaling.** The frame is scaled about its center but translated as if unscaled, which leaves a (240, 135) offset at 1440x900. Fit the frame with `left/top = (viewport − scaled)/2` or `transform-origin: top left` plus centering. Test at 1280x800, 1440x900 and 1920x1080. "Watch the guided replay" is the hero CTA, and it currently opens to this.
2. **Make one auction a real contest.** Show at least one opportunity where bids differ (e.g. 3:3 vs 3:2 → 0.004 vs 0.003) and the price is set by the bid table, not by alphabetical ID. Two of two tie-breaks undercuts "sealed auction".
3. **Resolve the "checked before any agent is asked" contradiction.** Either don't call excluded campaigns' agents, or change the copy to "the rule is enforced regardless of what the agent says" and show it as a second safeguard.
4. **Add a tamper demo to Verify.** One button corrupts a byte in memory and the affected checks turn red, then a reset button. Also allow dropping in a local `run.public.json`. This turns "trust us" into "see for yourself".
5. **Put units on every number** ("0.004 USDC (test)") and add a one-line glossary popover for Jev, ContextHint, level, voucher and channel the first time each appears.
6. **Remove the pre-ticked stage stepper and future spoilers.** Show stages as unvisited until reached. Don't preview opportunity 2's voucher at opportunity 1, stage 9.
7. **Simplify the Decisions stage for a first read.** Lead with "Both agents said: relevant, buying intent → bid 100%", and put the baseline-vs-history rounding analysis behind "Show the experiment".
8. **Fix the clocks story.** Either anchor settlement to the exchange clock ("closed N min after the last charge") or drop the absolute sandbox times from the judge-facing view. A visible "closed before charged" ordering invites suspicion.
9. **Give Present a closing beat about why it matters:** who pays, who earns, why AI apps need a disclosed, auditable ad slot, and what's next (devnet/mainnet, real publisher, real advertisers). Address the fee economics (batching, one close per channel per period).
10. **Polish fixes:** the clipped Campaigns table on Overview, the "Tier loo" badge, the duplicate `events/decisions` chips on Verify, `mobile software wallet` in both Must and Nice, "ID from an earlier prototype", the Run-ID header (rename to something like "Demo run · Wallet questions"), and let Draft a campaign show a hypothetical win instead of "this preview never shows a win".
