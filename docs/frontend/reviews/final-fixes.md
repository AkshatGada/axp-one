# Final fixes before launch (from final-truth.md, final-judge.md; final-design.md to be folded in when it lands)

Orchestrator-approved. MVP gets its last version `axp-mvp-v7`; the landing gets patch commits on top of
`axp-landing-v7` (owner's v7 cap), tagged `axp-landing-v7.1`. Owner is wrapping up: ship quality, no new features.

## Landing (patches)
1. DONE by orchestrator (d8685a1): the hidden hero line blocked clicks on the hero CTA, the ContextHint chip and
   the Explorer link. Verify it stays fixed.
2. Truth B1: the video caption/extraction must match the actual video. The video agent is recording the live
   Devnet demo (artifacts/v3-devnet-live-rehearsal/recording/axp-live-demo.mp4). Until it exists, keep the old caption.
   Chapter titles must equal the new video's timestamps.
3. Truth B2: the Jev sheet's "Creative: Fits, 81% confident" uses the chosen creative's probability; Jev's own
   confidence for that answer is 0.61. Show "61% confident" (consistent with the relevance/intent rows), or relabel
   "81% likely". Also the judge saw "Ready to buy 51% confident" with a FULL bar: bars must be proportional to the
   value shown, and the landing's Jev numbers must match the MVP's for the same decision.
4. W1: the meta description still says "hosted Solana sandbox": the main run is live on public Solana Devnet.
5. Live vs recorded: one phrase everywhere: "Replay of a live Solana Devnet run, Oct 1" (MVP header/landing proof),
   and the video caption matches.
6. The "Agents advise. Code decides the money." tagline shows light blue on orange during a scroll transition
   (unreadable): fix its colour at the seam.
7. Solana: label the token as "Circle Devnet USDC" (mint 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU) with a link,
   since Explorer only says "tokens". Planned list: drop "Advertiser wallets" (the live run already used one test
   wallet per advertiser) or reword to "Advertiser-owned mainnet wallets".
8. W8: "so sub-cent ads work" softens to "so ads costing a fraction of a cent can be paid per delivery".

## MVP (v7, last version)
9. "Run it live" on a build without the API must not dead-end: link to the hosted site (https://axp.one/mvp/live/
   once deployed) and to the live-run e2e recording/bundle view (artifacts/hosted-live-e2e as a viewable run), so
   judges always see a live run.
10. Header: replace the "Recorded replay" + "Live on Solana Devnet" chip pair with one phrase "Replay of a live
    Solana Devnet run, Oct 1"; the first recording says "First recording, hosted sandbox, Oct 1".
11. W2: the Overview "Run activity" lane "Agent decisions 5" counts admitted bids: rename "Bids admitted".
12. W3: opportunity 3's "asked for the research comparison" (that question ran history only): fix the wording.
13. W4: "your browser … signs off delivery": the browser checks the card; the app signs the receipt. Fix.
14. W5: rebuild the static export after all copy changes; the run switcher must not say "The only run published
    here" when two runs exist.
15. W6, make narrative.ts robust: say "changed" not "rose" unless the level went up; the no-fill sentence checks
    actual calls; the tie-rule glossary names the campaigns that actually tied.
16. Jev numbers consistent with the landing (same decision, same displayed confidence semantics, proportional bars).
17. Plain words in the Decisions and Settlement stages: replace "Baseline, research only", "2.5 rounds up",
    "One observation per arm; not a measured lift" (keep the meaning: "one run, not a benchmark"), lamports and
    "reconciliation" with plain phrasing (technical terms stay in the Inspector/glossary).
18. Present: show a visible "Press → or Space to continue" cue in manual mode; beat 2's double-press issue.
19. Circle Devnet USDC label + mint link on Settlement.
REJECTED: "self-minted USDC" (false: Circle's devnet USDC); "a run with many vouchers" (needs a different run; the
illustration covers it); "evidence changing who won" (didn't happen in the run).
Verify: tests, typecheck, static export (both runs), headless sweep at 1280/1440/1920/390, zero console errors,
/verify all green with the correct count, the tamper flow.
