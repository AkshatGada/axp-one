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
