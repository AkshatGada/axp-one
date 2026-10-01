# Landing v4: merged fix list (from v3 reviews + owner)

Sources: reviews/landing-v4-owner.md (OWNER, highest priority), reviews/landing-v3-judge.md, reviews/landing-v3-truth.md.
The design critic's review (landing-v3-design.md) will be forwarded mid-round; fold it in when it arrives.
Order = priority. Build to tag `axp-landing-v4`.

## A. Blockers
1. **"See the MVP" 404.** Make the MVP URL environment-aware: dev default `http://localhost:3420/` (the product-ui dev
   server); the merged single-artifact build uses `/mvp/`. Every MVP action (nav, hero, proof, closing, footer) uses it.
2. **Truth blockers (landing-v3-truth.md):**
   - The hero Evidence plate shows the Mercari listing without the "Observed historical reference, not an axp.one
     advertiser" label and cuts the text with no ellipsis. Fix it in the plate, the closing collapse and /design.
   - Unchanged outcomes must get equal weight. History raised intent only on the cached question (2.38 to 2.52, across
     the rounding line); on the offline question nothing changed. Say both, in plain words, wherever the change is shown.
   - "The tie rule picked the winners" is false: only two of the three auctions were ties. Write "a fixed tie rule
     settled both ties".
   - "The same question had been asked before and recorded" is misleading. Write something like "This exact question
     is in ContextHint's recorded prompts, so the lookup found a perfect match."
3. **Owner rules (landing-v4-owner.md), all of them:**
   - No internal details anywhere on the landing (IDs, hashes, policy names, model versions, R3/I3, base units,
     campaign-ID wording, per-element provenance chips, the 10-glyph legend). At most one quiet human source line per
     scene. This also fixes the judge's "internal labels" complaint.
   - The ContextHint chapter becomes the second signature moment, with all the statistics presented creatively:
     the 420,540 dot field sorting into country bands, a wall of real observed ChatGPT ads with the numbers over it,
     niches into sub-niches, the 12-country Fresh Ads chart, the funnel "Three numbers, kept apart", the moat line,
     and the vermillion "Visit ContextHint" action.
   - Traction line: "More than a thousand marketers use ContextHint every day, including paying customers." Use it
     in the hero badge and as a big figure in the chapter. Add "ContextHint's users are not axp.one users" in the data
     note (truth warning).
   - A hero "Built on ContextHint's ad intelligence" badge, a "ContextHint data" nav item, contexthint.com linked in at
     least 6 places, all opening in a new tab.
   - Jev stays modest: "judged with Jev" in the agents stage beat and the Agents plate, plus one footer credit line.
     Nothing else.

## B. Story and length (cold judge: "far too long", 31 screens; target about 18 to 20 desktop screens)
4. Cut about 40%:
   - Use "Agents advise. Code decides the money." once (the ultramarine wall).
   - Tell the hardware-wallet example deeply once (hero stack + stage), and lighter elsewhere.
   - Fold the 7-row "Rules the money cannot break" into a compact 3-column strip or into the proof.
   - Remove the near-empty screen around y≈1000 (one small tilted plane on a blank screen looks broken). The hero
     pull-back must never leave an empty frame.
   - Shorten the pin lengths (hero, stage, payments, dive) so each beat earns its scroll.
5. Hero demo answer: the first sentence ("I can't reliably name the cheapest...") makes the assistant look useless.
   Show a truthful excerpt that starts at the helpful part, marked as an excerpt with a leading ellipsis, e.g.
   "…For a budget choice, compare entry-level hardware wallets by total delivered cost, then confirm the exact model
   supports both networks…". Do not alter the words.
6. Add a short "why this wins" block near the top (one screen, three short columns, no invented numbers):
   - the moment: people decide inside AI apps now;
   - who pays and who earns: advertisers pay only for delivered, disclosed cards; AI apps earn per card;
   - the exchange: a planned network fee on settled spend (mark it Planned, not in this demo).
7. ContextHint payoff: don't present "intent 2 to 3" as the whole value. The value is that every agent decides with
   real evidence it can show, and evidence can't buy a capability. Make LeatherGuard the clear example: its evidence
   matched leather wallets, and it was ruled out anyway. Pair it with the changed and unchanged results.
8. "Settled once" beat: don't quote two cards when one is shown. Write "Over the run, ClearVault's channel authorized
   0.004, then 0.007 in total. One close paid 0.007 and refunded 0.013."

## C. Craft and robustness
9. Walkthrough and stage diagram text is about 9 to 10px. Set a 13px minimum, raise inactive boxes to readable
   (≥0.45 opacity) and strengthen the active state.
10. Mobile (390): the stack graphic is 636px wide (overflow) and the agent cards clip. Below 900px use clean static
    stills, the walkthrough diagram must appear as stacked beat cards, and there must be no horizontal overflow.
11. Unlabelled motion (payments meter, hero answer typing, closing collapse) gets the quiet "illustrative" source line.
12. /design shows the library stats without the data note. Add it.
13. Make og.png with ?still=1. Make lint-copy check out/design/index.html too, and run it on a fresh build.
14. Keep the ContextHint chapter in vermillion (deliberate: it is ContextHint's identity). Everything else ultramarine.

Verify: typecheck, static build, lint-copy (both pages), headless at 1280, 1440, 1920 and 390, reduced motion,
zero console errors, no off-origin requests, no overflow, page height reported. Tag axp-landing-v4 and report.
