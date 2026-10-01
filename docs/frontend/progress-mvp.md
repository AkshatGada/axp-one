# MVP explorer build progress (apps/product-ui, Ledger)

Resume notes for the MVP builder. Spec: docs/frontend/MVP_SPEC.md + FRONTEND_PLAN.md section 4.

## Status
- [x] Step 1: data layer (checkpoint A)
- [ ] Step 2: Ledger primitives + /design showcase (tag axp-ledger-v1)
- [ ] Step 3: Opportunity screen x4 + step-through (tag axp-mvp-v1)
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
