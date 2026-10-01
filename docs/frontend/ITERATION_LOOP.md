# AXP frontend: autonomous build, verify, improve loop

Owner (2026-10-01): run the landing page and the MVP through repeated versions (v1, v2, v3 ...) without
waiting for the owner, the way contexthint.com went v1 to v4.4, so that after a few hours everything is
as good as it can be. The orchestrator (main session) runs this loop; agents do the work.

## The loop (per track: LANDING and MVP, run in parallel)

1. **Build**: a builder agent implements the next milestone or the fixes from the last review, verifies
   its own work (typecheck, build, tests, lint, browser at the standard viewports), commits, tags `vN`.
2. **Verify** (three independent critics, fresh context, read-only, own browser tab, never touching other tabs):
   - **Design critic**: judges visual craft against the rubric below at 1440x900, 1280x800, 1920x1080 and 390 wide,
     light only, reduced motion on and off. Captures screenshots of the key moments into
     `docs/frontend/reviews/shots/<track>-vN/` (key moments only).
   - **Cold judge**: a hackathon judge who has never heard of AXP opens the URL and reports what they understood at
     10 seconds, 60 seconds and 3 minutes, where they got lost, what impressed them, what felt fake or unclear.
   - **Truth auditor**: checks every visible claim and number against FRONTEND_PLAN.md section 2, LANDING_SPEC.md /
     MVP_SPEC.md traps and artifacts/v3/replay/run.json. Any violation is a blocker.
   Each critic scores the rubric 1 to 10 per line and lists fixes ranked by impact, in
   `docs/frontend/reviews/<track>-vN-<critic>.md`.
3. **Decide** (orchestrator): merges the three reviews into one ranked fix list
   (`docs/frontend/reviews/<track>-vN-fixes.md`): all blockers, then the highest-impact design and clarity fixes,
   then the next planned milestone. Rejects suggestions that break the owner's rules.
4. **Repeat** from step 1 with `vN+1`.

**Exit**: a track is done when all milestones in FRONTEND_PLAN.md are built, the truth audit has zero blockers,
builds/tests/lint are green, no console errors, and both the design critic and the cold judge score every rubric
line at least 8.5, and every hard benchmark below passes. **v7 is the last version (owner, 2026-10-01): never go
beyond v7**; if a track is not done at v7, stop and report the remaining gaps. Never push or deploy.

## Hard benchmarks (measured, not opinion; checked every version)
| Benchmark | Landing | MVP |
|---|---|---|
| Typecheck + `next build` static export | pass | pass |
| Node tests (projection, policy parity, verify checks, tamper fixture) | n/a | 100% pass |
| Copy/claims lint (dashes, forbidden claims) | 0 hits | 0 hits |
| Truth audit blockers | 0 | 0 |
| Console errors / failed requests on every route | 0 | 0 |
| Off-origin requests at runtime | 0 | 0 |
| Horizontal overflow at 390 wide | none | none |
| Lighthouse desktop performance / accessibility | >= 90 / 100 | >= 85 / >= 95 |
| Lighthouse mobile performance | >= 80 | >= 75 |
| LCP desktop / CLS | < 1.8 s / < 0.02 | < 2.0 s / < 0.02 |
| First-load JS (gzip) | <= 170 KB | <= 200 KB per route |
| Public data size | n/a | run.public.json <= 300 KB, no vectors |
| /verify in Chromium | n/a | every check green incl. Ed25519 |
| Fonts | PolySans loads, no fallback flash in screenshots | same |
| Reduced motion | every scene has a complete still with the same words | step-through instant, nothing hidden |
| Present mode autoplay | n/a | 10 beats, 3:45 to 4:15 total, no stuck beat |
| Scroll pins (landing) | no stuck or skipped pin at 1280/1440/1920, back-scroll reverses cleanly | n/a |

**Every version stays runnable for comparison**: tags `axp-landing-vN` / `axp-mvp-vN`; `git worktree add` an old tag
under /Users/akshat/axp-compare-<tag> (never /tmp) only when a side-by-side is needed.

## Rubric: LANDING (Prospectus)
1. First impression: does the hero stop you, and is it unmistakably premium and original (ContextHint v4 bar)?
2. 10-second clarity: can a stranger say what AXP is and who it is for?
3. Story: does each section answer the next question (what, why, how, money, moat, trust, proof, next)?
4. The exchange explanation (stage): understandable without prior knowledge; motion explains, not decorates.
5. ContextHint data moat: scale is felt, the link to agent decisions is clear, caveats present but not leading.
6. Proof: credible, specific, inspectable; obvious path to the MVP.
7. Motion craft: smooth (no jank, no flashes, no stuck pins), choreographed, reversible, reduced-motion stills complete.
8. Typography and spacing craft: Steel/Prospectus rules, hierarchy by size, no clutter, no dashes or decorative dots.
9. Mobile (390): works, readable, no horizontal scroll, scenes become clean static sequences.
10. Performance and polish: fonts load, no layout shift, no console errors, Lighthouse budgets.

## Rubric: MVP (Ledger)
1. Cold orientation: within 30 seconds a judge knows what this run is and where to click.
2. Opportunity screen: the chat and the exchange chain read as one story; each step is understandable.
3. Honesty made visible: provenance marks, scope chips, recorded-replay framing, no fake execution.
4. Decisions and auction: score ruler, arm diff, bid formula and tie-break are clear and correct.
5. Settlement: deposit, vouchers, payout, refund, fees understandable at a glance; two clocks never mixed.
6. Present mode: a 4-minute story that works as the video, captions readable, keys reliable, autoplay smooth.
7. Verify: checks run green in the browser, explained in plain words; proves / does not prove is clear.
8. Visual craft: instrument-grade Ledger look, consistent spacing/type, Steel rules, beautiful at 1440 and 1920.
9. Navigation: spine, deep links, inspector, keyboard; nothing dead-ends.
10. Robustness: zero console errors, no off-origin requests, no horizontal overflow at 390, static export works.

## Owner rules every iteration must keep
Light paper with one dark stage; PolySans only, mono only for real data; no em/en dashes, decorative dots, numbered
eyebrows, icon sets, gradients, purple or green; real observed brands labelled "Observed historical reference, not an
AXP advertiser"; never show the Jev conversion-probability field; no partnership, enrollment, lift, attention,
conversion, mainnet or x402-settlement claims; MVP self-sufficient (no backend, embeddings, network or Mac dependency).
Commit every step with `git add` limited to frontend paths; author akshatgada@gmail.com; never push.
