# MVP explorer build progress (apps/product-ui, Ledger)

Resume notes for the MVP builder. Spec: docs/frontend/MVP_SPEC.md + FRONTEND_PLAN.md section 4.

## Status
- [x] Step 1: data layer (checkpoint A)
- [x] Step 2: Ledger primitives + /design showcase (tag axp-ledger-v1)
- [x] Step 3: Opportunity screen x4 + step-through (tag axp-mvp-v1)
- [ ] Step 4: Settlement, Overview, Advertisers, Present, Verify, Evidence, Publisher, Timeline, Try

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
