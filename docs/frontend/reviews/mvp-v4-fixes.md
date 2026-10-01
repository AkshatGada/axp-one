# MVP v5: merged list (from v4 reviews + owner's live-devnet decision)

Sources: mvp-v4-design.md (9.05), mvp-v4-judge.md (6.5 would-win; verified a devnet tx on Explorer).
Owner decision (2026-10-02): the hackathon run will be a FULLY LIVE run on Solana Devnet (plan in
docs/build/DEVNET_LIVE_PLAN.md, rehearsal pending). Tag `axp-mvp-v5`.

## A. Run-data-driven (the big one)
1. The MVP must render ANY run bundle in the replay schema, selected at build time (e.g. `AXP_RUN_DIR`, default
   artifacts/v3/replay; plus an optional devnet evidence file). The live devnet run is stochastic: ties, levels,
   skips, winners and cap events may differ from the recorded run.
2. Every outcome sentence becomes data-driven, with conditional phrasing computed from the data (examples:
   tie vs single bidder vs different bids; level changed vs unchanged; cap kept a bidder out (only if a cap
   exclusion exists); no-fill wording only when a no-fill happened; the "history moved X to Y" lines from the actual
   scores). No hard-coded run narrative anywhere (Overview, opportunity pages, glossary examples, Present captions,
   Verify group labels).
3. Projection asserts: keep the structural and conservation asserts (receipts join, payout + refund = deposit,
   bid = table(levels), hashes); replace hard-coded counts (4/15/3/33...) with consistency checks against the
   bundle's own manifest. A run must still fail loudly if inconsistent.
4. If the run's financial network is devnet, the scope chips, Settlement and Verify say so ("Live on Solana
   Devnet"), and the explorer links come from the run's own evidence. Keep the current recorded run + devnet
   re-settlement view working as the default until the live run exists.
5. Test: build against the recorded bundle (unchanged output), and against a perturbed copy (a script that flips one
   tie into different bids, removes the cap event, changes a level) to prove the copy adapts. Commit the fixture
   generator, not a fake run.

## B. Design (mvp-v4-design.md top 5 + 6 to 10)
6. Present: beat 1 = only the problem (no three claim cards); beat 11 = the claims WITH the run's own numbers and a
   closing line, filling the frame.
7. Present beats 5, 6, 7 underfilled (about 0.83 at the 1.9 cap): add real content, not scale; beat 5's title on one
   line.
8. Voucher chart value labels sit on the dashed cap line (Settlement, the Charge stage, Present 9). Move them.
9. The Verify tamper banner covers the hash cells. Dock it at the top of the tamper panel or as a sticky top bar.
10. Verify Devnet group: amounts in USDC, not base units; consistent "Devnet" casing; explorer links inside the group;
    reconcile the counts ("48 recomputed checks + 7 devnet consistency checks" everywhere; the nav and headline must
    match the page).
11. Settlement is 4,220px with a duplicated Devnet number row: collapse the lamports and rent detail into a
    disclosure; fix the rent column consistency (both closes shown the same way); the lamports tile unit wrap; the
    Auctions gap on Overview; the "25.4 s after aw…" stepper truncation; the long header chip; capability chip casing;
    a digit key for beat 11.

## C. Judge (mvp-v4-judge.md), accepted
12. Solana earlier in the story: mention Solana settlement on Present beat 1 or 2, and give the devnet proof its own
    Present moment (a channel card with its Explorer link, not just a stat tile).
13. "Why Solana" honesty: say plainly that this demo had 3 deliveries, so channels cost about as many transactions as
    deliveries here; add an illustrative line, clearly labelled, that a channel's chain cost stays one open + one
    close however many deliveries flow through it (e.g. "100 deliveries: still one open and one close").
14. Decisions slide: reduce to one before/after (without history: 0.003; with history: 0.004) with the ruler as
    secondary.
15. Define Jev, ContextHint and hosted Solana sandbox in one plain line each where first seen (Overview and
    Present).
16. Link each receipt row to the Devnet transaction that settled it.
17. Present: no 10 to 12 second late panel reveals (beats 1, 4, 8, 9, 10); remove the dark empty band above the
    header; the timer shows elapsed time, not beat start times.
18. Rename "Owned reference publisher app" to "Demo AI app (the publisher)" in main views (the legacy id footnote
    stays in the Inspector).
19. Shorten the Overview subhead.
- REJECTED: "make one auction actually competitive". We don't alter recorded data; the live devnet run may naturally
  differ, and the data-driven copy will show it.
Protect: Present beats 9 and 10, the 1280 two-column layout, the Devnet honesty pattern, the tamper story, the
zoom band and 4:00 pacing, the calm honesty layer.
Verify as in v4 (all benchmarks), plus the perturbed-bundle build.
