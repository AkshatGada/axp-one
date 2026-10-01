# MVP v4: merged fix list (from v3 reviews), orchestrator decisions

Sources: mvp-v3-design.md (8.55), mvp-v3-judge.md (6/10 "would win"; Solana not independently checkable),
mvp-v3-truth.md (5 new blockers). Each item was checked before acceptance. Tag `axp-mvp-v4`.
Dev server fixed: `pnpm dev` now uses `.next-dev` (commit 5a3a2d8), so builds can never break it; keep it that way.
Devnet: a separate backend agent is producing devnet settlement evidence. Don't fake it; leave a clean slot for
"Devnet explorer links" on Settlement and Verify that can be filled from a JSON file later.

## A. Truth blockers (all accepted; verified against run.json)
1. "A rule changed the winner" is false. ClearVault had 0.001 left under its 0.008 cap (7,000 of 8,000 spent), so it
   could not have outbid KeyForge's 0.003. Retitle everywhere (Overview callout, opportunity 3 callout, tie explainer,
   Present beat): "A rule kept a bidder out." Never imply ClearVault's bid size.
2. "For the research comparison every agent was asked" must not appear on opportunity 4 (0 calls). Scope the
   sentence to opportunities 1 to 3, and fix the glossary entry accordingly.
3. Settlement fees callout:
   - "most rent is reclaimed" is false (4,078,560 of 9,423,840 lamports, 43%); state the real share.
   - Retitle "Why fees are larger than the ad spend": don't compare test SOL with test USDC. Use "Network fees and
     rent, paid in test SOL", with the per-channel amortization explanation.
4. Every "Passing" tile (Overview, Present, design) must require exactly the expected 48 checks, all ran, all pass.
   Removing checks must not pass.
5. Restore "One observation per arm; not a measured lift" on the tie explainer ("History made a real difference to
   the price") and the Present "What history changed here" callout.

## B. Warnings and judge items (accepted)
6. Tie rule wording: "fixed in the exchange code before the run" (not "published").
7. Verify's "Recorded in the file" column must show the values from the fetched file, not build-time values;
   headline counts show "Not run yet" before the checks run.
8. Remove the third-party provider's name (VerseOdin) from visible copy. Describe sources as "ContextHint's
   collection" and "ContextHint's stored ad library". Keep the Evidence lede consistent with the source split.
9. Jev glossary: "Jev returns scores with probabilities; the exchange rounds them to levels 0 to 3."
10. Verify "Left out" list: drop the phrase "the conversion field" (say "fields the demo doesn't use").
11. The Present recorded video line: "These checks run in your browser when you open Verify."
12. "Why Solana": one short beat on Overview (a small panel) and in Present: per-delivery charges of 0.003 USDC only
    make sense if they don't each need an on-chain transaction; a payment channel turns many accepted charges into one
    open and one close on Solana. Plain words, no performance claims.
13. Present story: add a problem opener beat (people ask AI apps what to buy; there's no honest, disclosed way for
    advertisers to be there) and end on the claim ("Disclosed. Decided in code. Paid on delivery.") with the
    disclaimers just before it, not as the final words. Keep the total at 3:45 to 4:15 (rebalance durations).
14. The tamper demo also flips a headline: show a "Tampered copy: 46 of 48" state in the tamper panel header and a
    page-level banner while tampered; the file's own 48/48 is labelled "the served file".
15. Overview: replace the bare "Overview" title with a product sentence (e.g. "One recorded run of an ad exchange
    inside an AI app") and put the chat-plus-Sponsored-card picture in the first screen.
16. Cut jargon on the first-click path: "Admitted decisions", "arm", "Levels 3:2" (say "relevance 3 of 3, intent 2 of
    3"), "vector guard", "operator-recorded isolated app-agent bridge"; replace the header run ID with "Recorded
    run, Oct 1" (keep the run ID in the Inspector and run switcher menu).
17. The `owned-travel-app` id inside the signed receipt JSON stays (changing it breaks the signature). Show the
    footnote inline next to it in the Inspector and receipt card.
18. Stepper ends: stage 9 offers "Next: Opportunity 2"; the stepper stays visible on tall stages (sticky); the Jev
    tooltip must not cover the main button; the oversized "Recomputable on Verify" link gets fixed.
- REJECTED: "show an auction won on merit" (no such auction in the data; we don't invent one).
- REJECTED: rewriting the receipt's publisher id (signed data).

## C. Design (mvp-v3-design.md top 5 + carry-overs)
19. At 1280x800 the opportunity page stacks. Lower the breakpoint at app.css:220 to about 1100; check stepper labels.
20. Present beat 8 is broken: the axis labels overlap ("fl0or"), the not-admitted note overflows the panel, and the
    bar chart is squeezed.
21. Present text size jumps between beats (1.5x to 2.3x fit). Narrow the fit range (about 1.6 to 1.9) and fill sparse
    beats with content, not size.
22. Present beats 7 (overflow, half-empty panel) and 10 (40% empty): recompose. The tamper result makes a strong
    beat 10 element.
23. Inspector: the v2 restyle (radius, no 2px rule, normal link size, JSON wrapping indented); Evidence and Decisions
    get their own record for `I`; the stage follows the URL hash (Back and deep links work).
24. Carry-overs: the LeatherGuard table, the Run activity chart labels (fixed size), a "Skip to content" link, the gap
    under the Auctions panel, the Settlement order row not wrapping, PolySans 400 downloaded twice.
Protect: Present's centred frame and 4:00 pacing; truthful /verify and the tamper demo; the chat-plus-stage layout;
Settlement; the calm honesty layer.
Verify: tests, typecheck, static export (build writes .next and out/; dev uses .next-dev), headless at 1280x800,
1440x900, 1920x1080, 2560x1440 (Present) and 390; zero console errors; CLS < 0.02; /verify 48/48 + tamper flow.
Report with screenshots: Overview first screen, opportunity 1 at 1280x800, Present beats 1 (new opener), 8 and 10,
Verify tampered.
