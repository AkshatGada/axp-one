# Final design review: landing v7 and MVP v6

Critic: design (final round). I worked read-only, with headless system Chrome (playwright-core) on localhost only. I did not restart any server and did not edit any source file.

**What I reviewed**
- **Landing:** tag `axp-landing-v7` (8ad364b), checked on dev :3410 and on the static export already served on :3411 (built 05:02, after the last landing code commit).
- **MVP:** tag `axp-mvp-v6` + 6433a29, checked in three places:
  1. the `out/` export from 04:42 (one copy commit stale);
  2. dev :3420;
  3. the fresh `out/` hosted build from 05:40, which I served read-only under `/mvp` on 127.0.0.1:3422 and then stopped.

**Environment note.** Both dev servers went down mid-session and were restarted by someone else. The MVP dev server hot-reloaded during my captures (Fast Refresh full reloads), so one 2560 Present sequence mixed the live run and the first recording. That is an environment artifact, not a defect. Where the fresh 05:40 build already fixes something I saw in the tagged state, I say so and do not list it.

**Tools.** Scripts are in `tools/final/`:
- `lib`, `landing` (bench, frames), `pins` (pinned scenes frame by frame plus back-scroll), `fine`, `crisp` (2x), `closing` and `pix` (contrast under links), `hits` (click blocking), `nav`, `words`, `perf`, `rm`;
- `mvp` (bench, shots), `present` (beat stepper), `auto` (autoplay timing), `switch`.

Raw data is in `tools/final/out/`. Shots (30) are in `shots/final/`: `L01` to `L18` landing, `M01` to `M12` MVP.

---

## Landing (axp-landing-v7)

### Verdict

This is the best landing so far. The hero (Exchange Wall plus the dive into the card) is premium and original. The stack is crisp: in the 2x crops the plates use 2D matrices, `will-change: auto` and no filters, and the text stays live. The three pillar chapters read as one story: vermillion, then ultramarine, then a full purple Solana world, with the question token travelling through them. Copy is down to about 377 words outside figures.

What keeps it below 9 is motion craft at the joins:
- **The Solana scene resets:** it shows complete, then empties when the pin engages.
- **Headlines arrive in the wrong colour.** Every colour seam brings the next chapter's headline in while the background is still the previous world. Measured contrast at those moments is 1.2:1 to 1.3:1.

### Scores (landing rubric)

| # | Line | Score | Why |
|---|---|---|---|
| 1 | First impression | 9.0 | The Exchange Wall plus the crisp tile is striking and on-brand. The headline holds 3 lines at 1920. The hero is frozen, as the owner asked. |
| 2 | 10-second clarity | 8.5 | The H1 and the 2-sentence lede say it: agents bid, code sets the price, Solana pays. The trio chips (ContextHint, Jev, Solana) name the pillars. |
| 3 | Story | 8.5 | Hero, how it works, ContextHint, Jev, Solana, tour, proof, closing answer the questions in order. The ContextHint headline is a heavy 5-line, semicolon sentence. There are large empty colour ramps (about 0.5 screen) between Jev and Solana. |
| 4 | Exchange explanation | 8.5 | Four plain numbered steps with mini specimens, revealed by a short pin. The step cards start at four different heights. "no bid buys past this" is cryptic. |
| 5 | ContextHint moat | 8.5 | Scale words only (0 exact counts), a real ad wall with its label above it, and "Visit ContextHint". The persistent token card covers the wall's bottom-right ads. At 1440x900 the chapter overflows one screen (the CTA is cut at the fold). |
| 6 | Proof | 8.5 | Four run numbers, Verify, per-channel Explorer buttons and a tour bento of real 2x MVP captures. The big empty "Open the MVP" tile reads as filler. |
| 7 | Motion craft | 7.5 | The hero is smooth and reverses cleanly (back-scroll 0.5 equals forward 0.5 at 1280, 1440 and 1920), and How reverses cleanly too. Deductions: the Solana reset flash, invisible incoming headlines at 4 seams, the hard bottom edge of the closing wall, and a brief double-text cross-fade at the tile lay-down. |
| 8 | Typography and spacing | 8.5 | One radius system, PolySans, no dashes or decorative dots. Deductions: uneven How card tops, the Solana chip "3" sitting low, overlapping voucher cards, and three numbered chapter eyebrows (1, 2, 3), which break the "no numbered eyebrows" rule. |
| 9 | Mobile (390) | 8.5 | 13.9 screens, no overflow, clean static sequences, swipe rows for the stack and the tour. The seams still pass dark text over dark colour (the Proof pills and footer wordmark on ultramarine). |
| 10 | Performance and polish | 9.0 | 0 console errors, failed requests or off-origin requests. CLS 0. LCP 120 ms (desktop static), 460 ms (390 with 4x CPU). PolySans loads. JS sits at the budget line (below). Lighthouse was not run. |

**Average: 8.55 / 10**

### Benchmarks (landing)

| Benchmark | Target | Measured |
|---|---|---|
| Console errors / failed / off-origin | 0 | **0 / 0 / 0** at 1280, 1440, 1920 (motion and reduced motion) and 390, with a full scroll |
| Horizontal overflow at 390 | none | **none** |
| CLS | < 0.02 | **0.0000** (max 0.00006) |
| LCP desktop | < 1.8 s | **120 ms** static, H1 (dev mode reports 2.98 s only because of programmatic scroll) |
| First-load JS gz | ≤ 170 KB | **168 KB** (390, no Lenis). **173 KB** at desktop, where the lazy Lenis chunk (5.4 KB) loads after hydration. **At the limit.** |
| Fonts | PolySans, no fallback | 5 faces loaded, 0 failed |
| Words | < 450 | **377** outside figures (data-visual and aria-hidden excluded) |
| No internal IDs / exact dataset counts | 0 | **0 / 0** |
| Height | 10 to 12 desktop, about 14 mobile | 1280 12.5, 1440 12.35, 1920 12.1, reduced motion 10.3, 390 13.9 |
| Scroll pins | no stuck or skipped pin, clean back-scroll | Hero and How **pass** at 1280, 1440 and 1920. Solana **fails**: it shows the end state before the pin and resets at its start (defect L1). |
| Reduced motion | complete stills | **pass**: every scene is complete, with the same words |
| 2x crispness | no blur | **pass** for the hero tile and the plate stack |
| Header anchors | land on the section | **pass**: all 5, each landing at its section top |
| 1920 closing-link contrast (builder flag) | AA | **pass in the resting end state**: white links over #4451FD to #4F5CFC give 4.9 to 5.5:1. The wash goes pale only below the links. |
| Lighthouse | ≥ 90 / 100 | **not run** (not installed; not downloaded) |

### Landing defects, ranked

1. **[must] Solana scene resets on entry.** `Solana.tsx` starts at `step = 4` and changes only on `scrollYProgress` "change". Above the pin, progress stays 0, so the full diagram (Open, both vouchers, Close) shows while you scroll in. Then it empties to "Open" when the pin engages, and rebuilds. See L08 (y=5850, complete) and L09 (y=6075, empty).
   - Fix: initialise to step 0 when pinned, or drive the step from `p.get()` on mount.
2. **[should] Every colour seam brings the next headline in over the wrong colour.** The Tone layer blends around the viewport middle, so incoming headlines sit on the previous world while they enter:
   - ContextHint's ink headline over dark plum: **1.28:1** (L04);
   - How's white H2 over pale paper-lavender: **1.2:1** (L03);
   - "Settled on Solana" over the purple-to-paper blend;
   - the closing H1 over pale blue;
   - on 390, the Proof pills and the footer wordmark over ultramarine.

   Fix: blend earlier (finish before the next section's top passes about 75% of the viewport), or fade the incoming copy in with the colour.
3. **[should] Uneven How cards.** Step titles wrap to 2, 3 or 4 lines, so the four specimen cards start at different y positions (466, 489, 489 and 511 at 1280; L05). Align the cards to a common top, or clamp the titles.
4. **[should] Question token covers content.** The persistent bottom-right card covers the ContextHint wall's corner ads (L06) and, mid-scroll, the Solana Close block. It also adds a fourth floating element to every chapter. Either reserve its corner in each chapter's layout or hide it while the chapter visual is under it.
5. **[should] Closing wall has a hard bottom edge.** The wall ends on a straight horizontal cut with flat ultramarine below (1440 y≈840; 1920 y≈993; L13). At the end-of-page state the right third washes to near white with a hard line where the footer starts (L14). The "fades at its edges" fix covers the sides only.
6. **[should] Numbered chapter eyebrows** ("1 Data from ContextHint", "2 Decisions with Jev", "3 Settlement on Solana") break the standing "no numbered eyebrows" rule. The number already lives in the token; drop it from the eyebrow.
7. **[should] Long empty colour gaps.** About 430 px of empty ultramarine-to-purple sits between the Jev sheet and the Solana opener at 1440 (frames y=5400 and 5625). The hero dive also spends about 0.3 of its pin on a lone small card on empty paper. Pull the next chapter up, or give the ramp content.
8. **[nice] Jev sheet arrives half empty.** The rule bar ("Code sets the amount 0.004") and the scores arrive about 1.2 to 2 s after the sheet, so a reader who stops sees a large white void (L07; on mobile the sheet sits about 40% empty).
9. **[nice] The Solana chip's "3" sits low in its green circle.** It inherits `line-height: 30px` from `.label`; Jev's "2" is centred (L17).
10. **[nice] Voucher cards overlap awkwardly.** Voucher 2 overlaps Voucher 1 with a 6 px vertical offset, and only Voucher 2 carries "total". It reads as a collision rather than a deliberate stack.
11. **[nice] Cryptic step 3 copy.** "LeatherGuard ruled out: no bid buys past this" is unclear. Step 2 already shows LeatherGuard as "skip", so step 3 seems to contradict it. Name the rule plainly, for example "a fixed rule kept it out".
12. **[nice] Tour's "Open the MVP" tile** is a large flat ultramarine box with one label (L11). A small live-run specimen or the 47/47 mark would make it earn its space.

Fixed after the tag (seen on dev, not listed): the hidden hero line blocking clicks on the hero CTA (d8685a1). The video and poster also changed (664b402).

---

## MVP (axp-mvp-v6 + 6433a29)

### Verdict

The MVP is polished and calm. The Ledger v2 look is consistent, and the live Devnet run is the default and is clearly labelled.
- Opportunity, Settlement and Verify are instrument-grade.
- Present autoplays a clean 4:00.
- Verify is 47/47 with Ed25519, and the tamper demo still lands.

The working tree (05:40 build) has already fixed two things I saw in the tagged state:
- **/live/ dead end:** it now offers "Run it live on axp.one" and "Open the finished live run".
- **"Recorded replay" + "Live on Solana Devnet" chip clash:** it now reads "Replay of a live Solana Devnet run".

What remains is small: unit consistency between the two runs, one internal ID in prime chrome, and minor alignment.

### Scores (MVP rubric)

| # | Line | Score | Why |
|---|---|---|---|
| 1 | Cold orientation | 9.0 | A product-sentence title. Jev, ContextHint and Solana Devnet are defined in one line each (ContextHint now leads with the owner's wording and a contexthint.com link). The real chat plus the Sponsored card are in the first screen, and "Where a rule kept an agent out" points to opportunity 3. |
| 2 | Opportunity screen | 9.0 | Two columns at 1280, a sticky 9-stage stepper with "Upcoming" labels, the live-run frequency-cap and no-fill wording, and Next and Previous controls. |
| 3 | Honesty made visible | 9.5 | "Fictional advertiser", "Actual output", "Observed historical reference, not an axp.one advertiser", Devnet test USDC, and "numbers never merged" between runs. |
| 4 | Decisions and auction | 9.0 | The bid table cells, bar lanes with "Not admitted: frequency cap", the floor marker and the winner/price/rule row are clear. "Bid table v1" is an internal-sounding rule name. |
| 5 | Settlement | 8.5 | 2.7 screens. The per-channel open, voucher and close sequence, step charts, finalized transactions and an Explorer index are excellent. Deductions: fee units differ between runs; the rent column reads cryptic; the raw "pending open" status shows for LeatherGuard. |
| 6 | Present mode | 9.0 | Autoplay at 1920: 11 beats at 0, 14, 29, 51, 73, 98, 123, 148, 170, 200 and 226 s, ending at **4:00**, then manual. No stuck beat, 0 errors. The frame is centred at 2560 and pinned to the top at 16:10. Beat 4 is text-dense and uses "Cosine". |
| 7 | Verify | 9.0 | 47/47 Passing in the browser (28 hash, 3 signature, 16 sum and rule checks). The tamper panel runs on an in-memory copy. Proves / does not prove is clear. The page is 5.3 screens. |
| 8 | Visual craft | 8.5 | Consistent radius and type. Deductions: the Overview definition columns are now misaligned; the switcher shows an internal run ID; the auctions table clips at 390. |
| 9 | Navigation | 9.0 | Sidebar counts, the run switcher (live run and first recording), deep links, the Inspector and keys. /live/ no longer dead-ends in the fresh build. |
| 10 | Robustness | 9.0 | Static export: **57 route x viewport combos, 0 console errors, 0 failed, 0 off-origin, 0 overflow**, max CLS 0.007. Hosted build without the API: /live/ logs one 404 for `/api/live`. |

**Average: 8.95 / 10**

### Benchmarks (MVP)

| Benchmark | Target | Measured |
|---|---|---|
| Console errors / failed / off-origin | 0 | **0** on 19 routes x (1440, 1280, 390), including /first-recording/. Exception: the hosted build's /live/ with no API logs one 404 (`/api/live`). |
| Overflow at 390 | none | **none** (the auctions table scrolls inside its own box) |
| CLS | < 0.02 | **max 0.0078** (/verify) |
| LCP desktop | < 2.0 s | **28 to 72 ms** (static) |
| First-load JS gz | ≤ 200 KB per route | **121.6 to 148.0 KB** (desktop), 122.8 to 131.6 KB (390) |
| run.public.json | ≤ 300 KB, no vectors | **180.9 KB**, counts only |
| /verify | all green incl. Ed25519 | **47/47 Passing** |
| Present autoplay | 3:45 to 4:15, no stuck beat | **4:00**, 11 beats, clean hand-off to manual |
| Present 2560 | centred, inside the viewport | **pass** (2560x1440 frame) |
| Lighthouse | ≥ 85 / ≥ 95 | **not run** |

### MVP defects, ranked

1. **[should] Fee units differ between the runs.** The live run's Settlement shows fees and rent in lamports: the KPI "Fees and new rent, lamports 8,406,760" and lamport table columns (M04). The first recording shows the same idea in test SOL: "Solana network costs 0.0095 test SOL" and "Network fee, test SOL" columns (M08). A judge switching runs sees two unit systems for one concept. Use test SOL with lamports in the Inspector, as v4 asked.
2. **[should] Rent column reads cryptic.** "1,488,440 created, 1,488,440 reclaimed" on ClearVault's close sits beside "1,488,440 reclaimed" on KeyForge's. The data is true, but nothing explains why the two closes differ. A one-line note or a "net 0" rendering would help.
3. **[should] Internal run ID in prime chrome.** The run switcher shows `v3-devnet-live-rehearsal-20261002` in mono as the live run's subtitle (M07). "Rehearsal" in a judge-facing menu undercuts "live". Keep the ID in the Inspector.
4. **[should] Overview definition columns misaligned (fresh build).** ContextHint's definition grew to 3 lines plus a link, and the Jev and Solana Devnet columns now float with a blank line under their headings (M01, y 174 to 228). Top-align all three.
5. **[nice] Raw status string.** LeatherGuard's Settlement card says "Channel status pending open, deposit 0.000." Use "No channel was opened (unfunded)", as the header already says.
6. **[nice] Present beat 4 is the densest slide.** Long real-ad titles and "Cosine 1.000 / 0.742 / 0.682" make it the one slide that reads as data dump; "match" would read better than "Cosine". Beat 10's chat answer text is also long.
7. **[nice] Hosted build without the API logs a 404 on /live/.** It still shows the hosted-site note, but a judge replicating from the README sees a console error. Probe quietly, or use a HEAD request with no console noise.
8. **[nice] Title wording.** The document title stays "axp.one MVP: one recorded run" on the live-run default; the page says "One live run".
9. **[nice] Auctions table clips at 390.** Price and Outcome are cut at the right edge with no scroll affordance (M12). The MVP is desktop-first, so this is low priority.
10. **[nice] Present 16:10 band.** At 1440x900 the frame pins to the top and leaves an empty dark band (about 110 px) under the caption.

Already fixed in the working tree (05:40 build, not listed):
- the /live/ dead end on static builds;
- the "Recorded replay" + "Live on Solana Devnet" chip contradiction;
- ContextHint wording (6433a29).

---

## Top items across both apps

1. **Landing L1 [must]:** the Solana pin shows its end state, then resets to empty when the pin engages.
2. **Landing L2 [should]:** at every colour seam the incoming headline crosses the old world's colour at 1.2 to 1.3:1.
3. **MVP M1 [should]:** fee and rent units are lamports on the live run and test SOL on the first recording.
4. **Landing L3, L4, L5 [should]:** uneven How card tops; the question token covering wall and channel content; the closing wall's hard bottom edge.
5. **MVP M3, M4 [should]:** the rehearsal run ID in the switcher; Overview definition columns misaligned.
