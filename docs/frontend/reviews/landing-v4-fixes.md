# Landing v5: merged fix list (from v4 reviews), orchestrator decisions

Sources: landing-v4-design.md (7.85), landing-v4-judge.md (5/10 "would this win", largely the dev-server crash),
landing-v4-truth.md (1 blocker), plus every owner rule in landing-v4-owner.md (still binding). Build to `axp-landing-v5`.

## Dev hygiene (blocker, recurring)
0. The :3410 dev server broke twice with "Cannot find module './707.js'" because builds wrote into its `.next`.
   Always build with a separate dist dir (as product-ui does: `NEXT_DIST_DIR=.next-build`, plus the `distDir`
   override in next.config). Never run a build that writes to apps/marketing/.next while dev runs.

## A. Truth (accepted)
1. **B1**: the observed-ads wall reads as a ContextHint customer-logo wall. Set `wallLabel` to "Ads observed by
   ContextHint inside ChatGPT, shown as data. These brands are not axp.one advertisers, and no relationship with them
   is implied." Move the "1,000+ marketers" traction figure away from the wall (separate row or column, not beside the
   logos).
2. Dates: the traction line is owner-supplied October 2, 2026; the Fresh Ads table is owner-supplied, from the
   ContextHint database (no date given, so say "owner-supplied"). The footer must not date everything to Sep 26.
   Remove the internal phrasing "serving database" and "owner supplied snapshot" from visible copy: use "ContextHint
   data, as of September 26, 2026" and "ContextHint data, October 2026".
3. "One of them is the niche our run drew on": the slice spans 5 niches; the crypto hardware wallet niche is the niche
   of the one record shown. Say so.
4. "0.030 refunded to the advertiser": both channels were funded by one test payer. Write "refunded to the payer that
   funded both channels".
5. The "a transaction for each ad / a network fee and a wait" lane is a counterfactual. Mark it illustrative in the
   one source line, and call it "a transaction fee", not "network fee" (that term is reserved for the Planned
   exchange fee).
6. Fresh Ads definition: "A call is one collection request. A call counts as returning ads when its answer carried at
   least one ad." (All calls are counted.)
7. The funnel bars must not imply scale: either make the widths strictly decreasing with "not to scale" in the line,
   or use a log feel; units spaced from the numbers.
8. Ship hygiene: the production export must NOT include /design/, /metal-lab/ or /color-lab/ (exclude them from the
   public build, or move the labs out of public/). Remove the run's internal fields (model version, policy name,
   hashes) from the client bundle: pass only what the landing renders.
9. "Four real questions": say "four questions" (only one came from ContextHint's recorded prompts) or describe them
   accurately.

## B. Story and clarity
10. "Solana" in the hero, as a short line next to the status ("Settled through Solana payment channels on a hosted
    Solana sandbox with test USDC"), keeping the three-pillar trio below.
11. One plain line explaining Jev where it first appears: "Jev is the decision model each advertiser's agent uses
    to judge an opportunity."
12. Replace the scattered "Motion is illustrative" lines (4+) and the heavy caveats with ONE compact "What's real,
    what's illustrative" panel near Proof. Keep one short source line per data figure only.
13. Stop setting 0.010 USDC as giant headline numbers; lead Proof with counts (4 questions, 15 decisions, 3
    deliveries, 2 Solana channels settled); amounts small, labelled per channel or total.
14. Rewrite the "intent 2 became 3" box in plain words: "With ContextHint's history, the agent was a little more sure
    the person wanted to buy, enough to bid the full 0.004 instead of 0.003. On the other question, history changed
    nothing." Keep the LeatherGuard guard.
15. Surface the MVP proof on the landing: a Proof line "Verify the receipts yourself: 48 checks run in your browser",
    linking to the MVP's /verify.
16. Ties: explain once in plain words (same capabilities and ratings gave equal bids; a fixed, published tie rule
    decides). Lead the "rules held" story with the frequency cap and the no-fill.
17. Length: keep the ContextHint chapter prominent (owner priority) but tighten it (about 4 screens) and make its
    link to the exchange explicit at the end ("this is what the agent sees"). The whole page should be under 19
    desktop screens.
- REJECTED: "get onto devnet / show a real Solana transaction with an explorer link". No new chain operations are
  authorized, and the sandbox explorer links embed the stripped RPC. REJECTED: "lead with an auction where bids
  differ". The recorded data has ties; we explain them honestly.

## C. Design (landing-v4-design.md top 12, accepted)
18. Dot sort lasts: pin about 230vh, hold the sorted state, band labels appear as the bands settle. The 12-country
    bars start filling earlier so every row is visible at 1280.
19. Vermillion contrast: add `--contexthint-ink` (about #c2410c) for vermillion text under 24px; keep #f65a20 for fills
    and display type; fix the white-on-vermillion button (darker fill or ink text). This is an approved
    foundation-token addition.
20. No mono for big numbers ("0 . 010" at 92px): PolySans Wide with tabular figures; remove the faux-bold weight 700
    on `.sc-big`.
21. Funnel: spaced units, strictly decreasing widths, vermillion turning ultramarine at the packet.
22. Hero pull-back: the H1 and "Behind one Sponsored card" must never overlap; run them in sequence and start the
    explode earlier (no near-empty frames at 180 to 300px).
23. The ContextHint hero badge sits above the fold at 1280x800.
24. Closing: no see-through chat mid-scroll.
25. Library dive: make the inactive chain steps legible; label the beat 7 paid segment; fix the gap under short beat
    titles; line breaks; duplicate font rules; shorter mobile (lighter static plates).
Protect: the dot-band end state, the 12-country chart, the legible stage and pin engine, the shutter, the ultramarine
identity (rule wall, moat line, closing return, wordmark), and the quiet one-line sourcing.
Verify as before; Lighthouse-equivalent a11y: no contrast failures. Report page heights and screenshots.
