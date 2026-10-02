# MVP explorer build progress (apps/product-ui, Ledger)

Resume notes for the MVP builder. Spec: docs/frontend/MVP_SPEC.md + FRONTEND_PLAN.md section 4.

## Status
- [x] Step 1: data layer (checkpoint A)
- [x] Step 2: Ledger primitives + /design showcase (tag axp-ledger-v1)
- [x] Step 3: Opportunity screen x4 + step-through (tag axp-mvp-v1)
- [x] Present mode (10 beats, keys, autoplay, captions, SRT) tag axp-present-v1 (commit a8502d1)
- [x] Settlement, Overview (v1 look), Verify pages (v1 look)
- [x] Ledger v2 design system on /design/ (v1 archived at /design/v1/), docs/frontend/LEDGER_SYSTEM.md, tag axp-ledger-v2
- [x] Ledger v2 approved by the owner (as is)
- [x] MVP v2 on Ledger v2, tag axp-mvp-v2: product shell (top bar + run switcher + sidebar), Overview exchange dashboard,
      opportunity pipeline (one stage at a time via J/K/click/hash, "Show all stages" with ?all=1), Campaigns + campaign
      detail, Publisher, Settlement (Solana payment channels, step charts, tx table, chain lane by slot), Evidence
      (ContextHint), Verify, Try (synthetic), Present (rebuilt on v2, 4:00 total). Timeline dropped as a route (owner).
- [x] MVP v3 (docs/frontend/reviews/mvp-v2-fixes.md A, B, C), tag axp-mvp-v3

## Checkpoint A (data layer)
- `scripts/project-run.mjs` -> `src/data/run.public.json` (committed), `public/run.public.json` (generated, gitignored; `predev`/`build` regenerate), `src/data/build-meta.json`.
- Shared logic in TS, run by Node 25 type stripping: `src/lib/canonical.ts`, `src/lib/policy.ts`, `src/lib/verify.ts`.
- Tests: `pnpm --dir apps/product-ui test` (node:test, scripts/test/*.test.mjs): computeBid parity (16 level pairs x 3 decisions x 4 max bids x 4 budgets x 3 floors = 2,304 cases) vs packages/contracts; reason/auction parity vs packages/exchange replaying the run in run order; recorded exclusions; projection determinism, counts, joins, sanitization, vector guard; all 48 verify checks; 8 tamper fixtures.
- Output 176,387 bytes (budget 300KB). 45 self-checks, 48 verify checks (4 question, 15 packet, 3 creative, 3 ack, 3 receipt, 3 Ed25519, 3 linkage, 3 cumulative, 2 conservation, 5 bid, 2 tie-break, fee cap, totals).
- Node requirement: >= 22.18 (type stripping) for the build script and tests. Local is 25.5.

## Decisions made
- Ack payload `{awardId, creativeHash, domInserted:true, sponsoredLabelPresent:true}` is reconstructed per contract (packages/exchange acceptDelivery) and verified against the receipt's recorded hash.
- "Question" check = turn input hash (includes the question) for all 4, plus sha256(question) vs the per-call question hash where recorded (not for mobile: no calls).
- Bid check uses budget available at auction time (cap or deposit minus earlier awards).

## Steps 2 and 3
- Ledger (design-system/ledger): ledger.css, frame.tsx (AppFrame, ScopeBar, RunSpine, Wordmark), primitives.tsx, specimens.tsx (all domain specimens), client.tsx (InspectorProvider/Drawer/Button, CopyHash, ClampText, RouteLine).
- Identity: ultramarine (owner, foundation a1e9eef). Brand = live/winning/selected (primary buttons, active step, route line, replay chip, winning bid row, selected bid level, live checks, Sponsored frame, key numbers). ContextHint vermillion on observed/inferred glyphs + evidence borders; `Handoff` gradient rule = evidence entering an agent. Metal rejected: no m-* hooks.
- /design (noindex, no chrome): cover, foundation, marks, frame (incl. static open Inspector), primitives, app states, evidence, decisions, auction to charge, settlement, records/verify (live pass + altered-copy fail), step rail, motion (3 replays), words.
- Opportunity: /opportunity/[1-4]/ server-rendered; StepThrough client (J/K/arrows/Esc, hash per step, dim 35%, RouteLine, slot awaiting until step 7, replay chip). Live checks in browser: packet, creative, ack, receipt hashes and Ed25519.
- Screens verified headless (puppeteer-core + local Chrome, scratchpad helper) because the Browser pane tab is backgrounded by other agents: 1440x900, 1920x1080, 390 wide, zero console errors, no off-origin requests.
- Build while dev runs: `NEXT_DIST_DIR=.next-build pnpm --dir apps/product-ui build` (export lands in .next-build/; plain `pnpm build` exports to out/).

## Ledger v2 (owner direction 2026-10-02)
- Owner rejected the v1 look for the product (too document-like, square, stiff type, too much mono). Ledger v2 is a
  dashboard system: radius 6/10/14/full, soft shadow tokens, PolySans Median/Neutral 14 px body, Wide only for big
  numbers, mono only for hashes/IDs, ultramarine = live/selected/winning, muted semantic states, ContextHint vermillion only for evidence.
- Code: design-system/ledger/v2.css (scoped to `.ld`, imported at the top of ledger.css), v2.tsx + v2-client.tsx
  exported as namespace `Ld` from @axp/design-system/ledger. Derived view helpers: apps/product-ui/src/components/v2/derive.ts.
- Other routes still use v1 classes; do not change them until the owner approves v2.
- Tag axp-mvp-v2 is reserved for the dashboard redesign (an earlier local axp-mvp-v2 on the Present commit was renamed axp-present-v1).

## MVP v2 notes
- Shell: components/chrome.tsx (Ld.Shell/TopBar/SideNav + v1 InspectorProvider restyled under .ld).
- Opportunity: components/v2/stages.tsx (server panels) + components/v2/OpportunityStages.tsx (controller, slot, hash).
- Pillars (owner): Solana named on Settlement and channel cards; "Decided with Jev" on decisions; ContextHint (vermillion,
  link to contexthint.com) on evidence; Overview line "Built on ContextHint data, Jev decisions and Solana settlement".
- Plain language in main views; IDs/hashes in the Inspector. Old v1 components remain only for /design/v1/.
- Dev cache can break after many file moves ("Cannot find module './707.js'"): stop the preview, rm -rf apps/product-ui/.next, restart.

## MVP v3 notes
- Present: 1920x1080 frame absolutely centred, scale min(vw/1920, vh/1080); per-beat auto-fit zoom (.pr-fit, 2.3 down to
  1.25) fills the frame; under 700px a card links to Overview. Checked at 1280x800, 1440x900, 1920x1080, 2560x1440, 390.
- Verify truth: Ed25519 support decided by a known test vector (canonical.ts PROBE); an unreadable key is a FAIL, not
  "unsupported". Headline "Passing" only when every check ran and passed. Rows laid out at build time ("Not run yet")
  so the table does not shift. Tamper demo flips one byte of opportunity 1's receipt nonce in an in-memory copy: receipt
  hash and signature go red ("Mismatch"), Reset restores green. Subtitle says the checks use the downloadable file.
- Opportunity: later stages show "Not reached yet" in one-stage mode; first paint follows ?all=1 / #stage via an inline
  boot script (html has suppressHydrationWarning). Eligibility copy explains research-only calls; nearest-prompt brands
  are labelled as observed historical references; ties explained in plain words (same capabilities, ratings, max bid;
  tie rule; history difference); opportunity 3 callout names the frequency cap rule.
- Settlement: one clock only (order and slot; blockTime only in the Inspector). Charts are deposit-scaled with a dashed
  cap line. Units everywhere (USDC, lamports), glossary terms for Jev, ContextHint, tie rule, hosted Solana sandbox.
- CLS: PolySans via next/font/local (src/app/fonts.ts) removes the font-swap shift. Measured load CLS: /verify 0.012 to
  0.014, every other route 0 to 0.004 (19 routes x 1280/1440/1920/390, zero console errors, no overflow).

## MVP v4 notes (docs/frontend/reviews/mvp-v3-fixes.md A, B, C + Devnet), tag axp-mvp-v4
- Truth: opportunity 3 says "a rule kept a bidder out" (ClearVault had 0.001 left; no amount implied). Eligibility
  research-comparison copy only where agents were asked (opps 1 to 3). Settlement fees callout states the real rent
  share (43% reclaimed) and never compares SOL with USDC. Arm comparisons carry "One observation per arm; not a
  measured lift". Tie rule is "fixed in the exchange code before the run".
- Passing needs exactly 48: `summarize()` in src/lib/verify.ts compares results with the build-time check IDs
  (build-meta.json `verify.ids`); deletions read "n not checked". Tests cover a deleted receipt, a cleared tie flag
  and a dropped opportunity. Verify shows values read from the fetched file, "Not run yet" before the run, and the
  tamper flow re-runs all 48 on a copy: panel tag and a floating page banner read "Tampered copy: 46 of 48".
- Solana Devnet re-settlement: scripts/project-devnet.mjs projects artifacts/v3-devnet/settlement.json into
  src/data/devnet.public.json (committed) + public/devnet.public.json, with asserts (5 finalized txs, payouts and
  refunds, receipt hashes equal the recorded receipts, devnet-only explorer links). Absent file = every devnet
  section hidden; the build passes (checked). Settlement has a separate "Recorded receipts, settled on Solana Devnet"
  section (numbers never merged); Verify adds a 7-check "Devnet re-settlement" group plus explorer links; Overview
  "Why Solana" links the channels; Present beat 9 mentions it; the scope chip says so.
- Overview: product sentence title, chat-plus-Sponsored-card picture in the first screen, "Why Solana" panel beside
  Auctions, plain run label ("Recorded run, Oct 1"), plain activity lanes, HTML activity chart with fixed-size labels
  and a list under 900 px.
- Opportunity: two columns down to 1100 px (1280 works), sticky stepper, "Upcoming" for later stages, stage follows
  the hash (Back and deep links), last stage offers "Next: Opportunity n", Evidence and Decisions have a primary
  Inspect. Inspector now renders inside the `.ld` scope (v2 look, JSON not wrapping to column 0).
- Present: 11 beats, 4:00. Problem opener, ends on "Disclosed. Decided in code. Paid on delivery." with limits one
  beat earlier; "Why Solana" in beat 9; live tamper result in beat 10; zoom band 1.65 to 1.9 at every viewport.
- Dev runs from .next-dev; `pnpm build` writes .next + out/.

## MVP v5 notes (mvp-v4-fixes.md A, B, C + owner: live Devnet run is the main run), tag axp-mvp-v5
- Any bundle at build time: `AXP_RUN_DIR` (default `artifacts/v3-devnet-live-rehearsal/replay`, the fully live Devnet
  run). The projection reads an optional sibling `chain-check.json` for the run's own explorer links (asserted against
  the run's signatures). Asserts are structural (conservation, joins, hashes, bid = table) and compared with the bundle's
  own records (manifest run id and mode, model counters, receipts, events, chain-evidence totals); no fixed counts.
  The verify check count comes from the run's structure (`expectedCheckCount`); "Passing" needs exactly that list.
- `pnpm build` = `scripts/build-all.mjs`: out/ is the live run; out/first-recording/ is the first recording (hosted
  sandbox, with its Devnet re-settlement). The run switcher links them; numbers never merge. `pnpm build:one` builds
  one run. Internal raw links go through `asset()` so base paths work.
- Story copy: `src/lib/narrative.ts` (pure, shared by pages, Present captions and the SRT script). Ties, single bidders,
  different bids, level changed or not, caps and no-fills are worded from the data only when they happened.
- Perturbed fixture: `node scripts/fixtures/perturb-run.mjs` (writes .fixtures/perturbed, never committed): first tie ->
  different bids, cap event removed (that agent skips), a level changes. Build it with
  `AXP_RUN_DIR=apps/product-ui/.fixtures/perturbed`; the copy adapts (checked: "Where bids differed", no cap wording,
  "Unchanged", Present beat 8 "A question with no fill"). Run `pnpm project` afterwards to restore src/data.
- Design: Present opener is the problem only; the claims close the deck with the run's own numbers; decisions beat is a
  before/after; a Devnet proof card on beat 9; reveals within 3 s; elapsed timer; `-` jumps to the last beat; frame pinned
  to the top on 16:10. Chart value labels avoid the cap line. Tamper alert docked inside the panel. Devnet checks in USDC
  with links inside the group and a "48 + 7" nav count. Settlement detail behind a disclosure; rent in words.
- Checked: 144 static route/viewport combos (both runs) with 0 errors, 0 overflow, max CLS 0.016; Present 1280 to 2560
  centred, zoom 1.7 to 1.9; tests 32/32; tamper flow on both runs (45/47 live, 46/48 first recording).

## MVP v6: Run it live, tag axp-mvp-v6
- Nav "Run it live" (/live/): explains the run in one line; passcode field only when the config asks; Start; live
  pipeline (queued, answers, decisions, delivery, settlement, record, done) built from the API's status; questions with
  the app's answers and Jev decisions; each winning card inserted in this page (Ld.SponsoredCard now carries
  `data-sponsored-label` and `data-creative-copy`) and acknowledged from the page's DOM with `acknowledgeCard`;
  settlement rows with explorer links as transactions land; states for paused, busy (someone else's run), daily caps,
  errors and aborts (no charge for undelivered cards; refunds at close); recent runs.
- /live/run/?id=: fetches the run's exact bytes from the API, projects them in the browser with the shared core
  (`src/lib/project-core.mjs`, pure-JS SHA-256), runs the structural and browser checks, and shows the run.
- The API client is a copy (`src/lib/live-client.mjs`) with a drift test against packages/hosted/client.mjs.
- Gate: only builds with `NEXT_PUBLIC_LIVE_API=1` look for the API; a static copy shows "Live runs are available on
  the hosted site" and never probes (no console errors). Hosted build for the local dev server:
  `NEXT_PUBLIC_BASE_PATH=/mvp NEXT_PUBLIC_LIVE_API=1 pnpm build`, then `AXP_LIVE_ENABLED=1 node scripts/hosted/dev-server.mjs`.
- Checked with one real run through the page (61 s, 3 cards acknowledged, 0 console errors), and its finished view
  projected in the browser (48/48 checks).

## MVP v7 (last version), tag axp-mvp-v7 (reviews/final-fixes.md items 9 to 19 + final-design.md)
- One phrase for what the site shows: the run switcher label is "Replay of a live Solana Devnet run, Oct 1"
  (`runPhrase` in narrative.ts; the first recording is "First recording, hosted sandbox, Oct 1" via
  build-all); the Recorded replay + Live chips are gone; Present's header shows the same phrase. The switcher
  hides the internal run id (Inspector keeps it) and never claims "the only run published here".
- Jev: Decisions shows each answer in words with Jev's own confidence and a bar sized to it (relevance,
  buying intent, creative; `confidence.creative` now projected), the same semantics as the landing sheet.
  Plain labels: "Without history, for comparison only", "With ContextHint history", ruler "level 3 from
  here", "Fixed bid table", similarity "Match"; disclaimer "One run, not a benchmark."
- Settlement (both runs, and the first recording's Devnet section): Circle Devnet USDC named with its mint
  link (when every channel holds mint 4zMMC9...); fees and rent in test SOL (`solText`, exact lamports in
  tooltips and the Inspector); `rentSolWords` + one plain `RENT_NOTE`; "Closed and final; nothing left to
  settle"; "Total owed so far"; "No channel was opened (unfunded)".
- Narrative: "rose" only when levels went up (`historyEffect().rose`); no-fill sentences check actual
  calls; tie-rule and eligibility glossary entries computed from the run (tied campaigns; paired vs
  unpaired research asks); opportunity 3 no longer claims a research comparison. Overview lane "Bids
  admitted". Live page: the browser checks each card; the app signs the receipts.
- Run it live without the API: links to https://axp.one/mvp/live/ (`NEXT_PUBLIC_HOSTED_LIVE_URL`), hidden when
  already on that origin, and opens the hosted end-to-end live run: `scripts/project-live-sample.mjs` copies
  artifacts/hosted-live-e2e into public/live-runs/<runId>/ (gitignored; hash and Devnet asserted) and writes
  src/data/live-sample.json; /live/run/?id= fetches those bytes and projects and checks them in the browser
  (48/48). A hosted build with the API flag still probes /api/live (one 404 if the API is missing).
- Present: a visible cue in manual mode ("Press -> or Space to continue", "for the next part (1 of 2)",
  last beat "Press R to restart or Esc to leave").
- Checked: tests 35/35, typecheck, `pnpm build` (both runs), headless sweep of the static export on :3431:
  15 routes x 2 runs x 1280/1440/1920/390 = 120 pairs, zero console errors, failed requests or overflow, no
  "rehearsal" in visible text; /verify 47/47 (first recording 48/48), tamper 45/47 and 46/48, reset
  restores; the finished live run 48/48 Passing. Shots: docs/frontend/reviews/shots/final-fixes/M-*.png.
- Note for the video: Present's beat 5 caption now ends "One run, not a benchmark." and the header shows the
  one-phrase label; the recorded video (664b402) predates both.
