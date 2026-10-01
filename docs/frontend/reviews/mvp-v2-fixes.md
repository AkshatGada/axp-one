# MVP v3: merged fix list (from v2 reviews), orchestrator decisions

Sources: mvp-v2-design.md (7.75), mvp-v2-judge.md (6/10 overall), mvp-v2-truth.md (5 blockers). Each item was checked
against the data/code before acceptance. Build to tag `axp-mvp-v3`. Owner rules still apply (Ledger v2 approved;
plain language in main views, IDs/hashes in the Inspector; Solana/Jev/ContextHint named clearly; no faked data).

## A. Blockers (accepted)
1. **Present mode only works at 1920x1080** (design + judge). ledger.css ~437: the grid centres a fixed 1920x1080 child,
   so the frame lands off-centre and gets cropped. Use absolute centring `left:50%;top:50%;transform:translate(-50%,-50%) scale(s)`
   with s = min(vw/1920, vh/1080). Test at 1280x800, 1440x900, 1920x1080 and 2560x1440. At under 700px show a
   "Present mode is designed for a laptop or larger screen" card with a link to Overview (not solid navy).
2. **Present must fill the 16:9 frame.** Every beat leaves 150 to 200px empty top and bottom. Apply the 1.25x surface
   scale, compose each beat to fill, and give sparse beats (6, 7, 10) richer, still-real content.
3. **Verify truth fixes:**
   - "every hash on these pages matches its content" is false. Say exactly which hashes are recomputed and which are
     recorded only.
   - Ed25519 key handling: probe support with a fixed known-good test key. If the file's key fails to import, that is a
     FAIL, not "unsupported". The headline shows "Passing" only when 48/48 ran and nothing was skipped.
   - The subtitle "Nothing here trusts the page that displays it" overstates it; rewrite honestly (the checks run in
     your browser on the downloadable file; the public key comes from that file).
4. **Unlabelled real brands** in the opportunity pages' "Nearest prompts" rows (stages.tsx EvidenceTab: Mercari,
   WOLF 1834, Yoder Leather, OneKey). Label every one "observed historical reference, not an axp.one advertiser"
   (one label per list is fine).
5. **/try footer** calls `npm run demo:v3` "the real stack". It is a synthetic laboratory with models off by default.
   Say that.
6. **The copy contradicts itself on eligibility.** "Checked before any agent is asked" is false: LeatherGuard's agent
   was asked in the research comparison. Say "Eligibility decides who can enter the auction. For the research
   comparison every agent was asked; an excluded campaign can never bid."
7. **The two clocks on Settlement look out of order** (closes at 14:41 shown near charges at 14:56). Show Solana
   transactions by order and slot only, with no wall-clock times beside exchange times. Keep the sandbox-clock times
   in the Inspector.

## B. Experience
8. **The pipeline stepper gives the ending away.** Stages after the current one look upcoming (hollow, no value) until
   reached in step mode; in "Show all stages" mode all are shown.
9. **Verify feels self-referential** (judge). Add a "Tamper with one byte" demo: a button that flips one character of
   a receipt in an in-memory copy and re-runs that check, which turns red with the mismatch shown, plus a Reset.
   (Rejected: an explorer link. It embeds the stripped sandbox RPC, and sandbox explorers reset. Keep the transaction
   IDs copyable.)
10. **The ties** (judge: "auction looks degenerate"). Do NOT change data. Explain why in plain words on opportunity 1
    and 2 and in Present: both wallets declared the same capabilities and got the same ratings, so the bids matched;
    a fixed tie rule decides, published in advance. Show the real difference history made (without it 0.003, with it
    0.004). Lead the "interesting" moment with opportunity 3 (frequency cap changes the winner).
11. **Units on every number** (0.004 USDC; levels "out of 3"; percentages). Add a small glossary popover (Term) for
    Jev, ContextHint, cosine similarity, lexical fallback, lamports, rent, voucher, payment channel, tie rule.
12. **Internal labels leaking into plain views**: "Tier loo", "Source: aws", repeated `events`/`decisions` chips on
    Verify, heavy middle-dot separators. Replace with plain words or move to the Inspector.
13. **Opportunity 4 no-fill** walks through seven identical "Did not run" stages. Collapse to one clear no-fill panel.
    The `mobile_software_wallet` required + preferred duplication: show required only, with a note if preferred too.
14. **Equal weight for unchanged outcomes** in Present beat 5 and on tags: "Unchanged" gets the same visual weight as
    "Level changed".
15. **Sandbox qualifier**: wherever Solana is named in prose (overview lede, settlement title/lines, advertiser
    pages), say "Solana sandbox" or "hosted Solana sandbox".
16. **Fees vs revenue** (judge): one plain note on Settlement. Fees and rent are paid in test SOL; rent is mostly
    reclaimed at close; one open and one close are shared by every ad in a channel, which is why channels exist.
    No economics claims beyond that.

## C. Craft and robustness
17. CLS: /verify 0.482, /try 0.035, show-all 0.029. Reserve space for the KPI grid and check rows before checks run.
18. Award stage layout: Reserved and Expires side by side, with the creative card full width below.
19. The Inspector: `I` opens the wrong record; restyle it to v2; "Recorded hash only" marks must not look like
    unchecked checkboxes or passes.
20. The receipt card's plain text is in mono: use body type and keep mono for the hash values only.
21. The Overview campaigns table's last column touches the panel edge; "Refunded at clos" is clipped.
22. Run activity chart labels scale down to about 4px on mobile: use fixed-size labels.
23. Checks must not look passed before they run (idle states: "Not run yet").
24. Voucher charts scaled to the 0.020 deposit, with the 0.008 cap as a line.
25. Small copy: the /try "the agent would skip" becomes "the bid rule needs at least 2 and 2"; the beat 3 LeatherGuard
    "sells leather wallets" becomes "sells RFID-blocking wallets"; the beat 7 SRT "These checks just ran in this
    browser" becomes "These checks run in your browser"; the evidence lede "real prompts" becomes "prompts from
    ContextHint's recorded prompt panel"; the travel-era rubric wording in the packet inspector gets a footnote.

Protect: the chat-plus-stages layout with the slot filling at Delivery; Settlement as built; the calm honesty layer.
Verify: typecheck, tests, static export (NEXT_DIST_DIR=.next-build only), headless at 1280x800, 1440x900, 1920x1080,
2560x1440 (Present) and 390; zero console errors; CLS < 0.02 on every route; /verify 48/48 plus the tamper demo.
Tag axp-mvp-v3 and report with screenshots.
