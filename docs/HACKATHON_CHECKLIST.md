# axp.one hackathon checklist

The single list of what must happen around the hackathon. Any agent asked for "the hackathon checklist"
should read this file. Repo: /Users/akshat/agentic-dsp, branch `frontend` (local only; never push without the owner's
explicit ask). Owner decisions and the frontend state live in docs/frontend/FRONTEND_PLAN.md and docs/frontend/reviews/.

Track: **Solana**. Three pillars to show: ContextHint (data), Jev (agent decisions), Solana payment channels (settlement).

> **Owner decision 2026-10-02: the hackathon run is a FULLY LIVE run on Solana Devnet** (new opportunities for the
> 4 scenarios, new organic answers, new Jev decisions, auctions, receipts, and devnet payment channels), not only a
> re-settlement. Plan and runbook: docs/build/DEVNET_LIVE_PLAN.md (being prepared, with one rehearsal run).
> Timing: do the real live run the DAY BEFORE the hackathon if possible, so there are a few hours to rebuild both
> apps from it and re-check the story (live Jev outputs are stochastic: ties, levels and skips can differ from the
> recorded run, and the copy is being made data-driven to handle that). Section 1 below (re-settling the recorded
> receipts) remains the fallback if the live run fails.

> **Update 2026-10-02:** the live devnet rehearsal succeeded (run in `artifacts/v3-devnet-live-rehearsal/`, all
> transactions finalized, real price competition, two payers, DeepSeek flash organic answers). Owner decision: both
> sites feature it as the MAIN run now. The day before the hackathon, run a fresh live run with
> `scripts/demo/v3-devnet-live.mjs` (commands: init, fund, freeze, open, organic, run, serve, deliver, authorize,
> close, reconcile, verify, restart, export; runbook in docs/build/DEVNET_LIVE_PLAN.md, about 60 to 75 minutes,
> payment steps within 2 hours of freeze), point both apps' data at the new run directory, rebuild, and re-check.
> Owner to review two shared payment changes in packages/payments/sdk-transport.mjs (per-network treasury; 429
> retry that resends identical signed bytes).

---

## 1. Fresh Solana Devnet settlement (FALLBACK) (run JUST BEFORE the hackathon, on the day if possible)

Why: the devnet transactions should carry the hackathon's date, so judges opening Solana Explorer see fresh activity.
What: re-settle the SAME three recorded, publisher-signed receipts from run `v3-wallet-acceptance` through two NEW
payment channels on public Solana Devnet (test USDC only, no real value, no new auctions or model calls).
First devnet settlement (reference): run `v3-devnet-settlement`, 2026-10-01 21:01 to 21:02 UTC, evidence in
`artifacts/v3-devnet/` (RESULT.md, settlement.json, feasibility.json). Feasibility notes: docs/build/DEVNET_FEASIBILITY.md.

Steps (operator, terminal only; ask the backend/payments agent to do it if you prefer):
1. Keep the previous evidence: copy `artifacts/v3-devnet/` to `artifacts/v3-devnet-<previous-date>/` (never delete it,
   and never touch `artifacts/v3/**`).
2. Start from fresh local state for a new run: move `local-state/v3-devnet/` aside (it is gitignored and holds the old
   disposable wallets and terms). Use a new settlement run id that includes the date
   (for example `v3-devnet-settlement-<hackathon-date>`), so the two settlements never mix.
3. Read-only check that the program and mint are still live:
   `node scripts/demo/v3-devnet-settlement.mjs feasibility`
4. Fresh disposable wallets (local keygen only, keys stay in local-state, mode 0600):
   `node scripts/demo/v3-devnet-settlement.mjs wallets`
5. Fund the new payer (devnet only): `AXP_V3_DEVNET_SIGN=1 node scripts/demo/v3-devnet-settlement.mjs fund`
   (last time funded from the project's disposable devnet wallet D7GzU2o4…: 0.05 test SOL + 0.040 devnet USDC.
   If it's empty: Solana devnet airdrop or faucet for SOL, Circle's devnet faucet for USDC. Devnet only.)
6. `node scripts/demo/v3-devnet-settlement.mjs freeze`
7. For each of the two channels:
   `AXP_V3_DEVNET_SIGN=1 node scripts/demo/v3-devnet-settlement.mjs open <channelId>`, then
   `... authorize <channelId>`, then `... close <channelId>`
   (use `status` to list the channel ids; `reconcile <channelId> ...` if anything is uncertain. Never re-send blindly.)
8. Write and verify the evidence (lookup only, signs nothing):
   `node scripts/demo/v3-devnet-settlement.mjs evidence`. Expect 5 finalized transactions (1 funding, 2 opens,
   2 closes), payouts 0.007 + 0.003, refunds 0.013 + 0.017.
9. Run the full test suite: `npm test` (all pass; 6 optional skips are normal).
10. Commit the new evidence only (`git add artifacts/v3-devnet*` + any doc), author akshatgada@gmail.com. Don't push.

Note: the script was built for one run. If step 2's fresh state or a new run id isn't supported by the script's
current options, ask the backend agent to add a `--run-id`/state-dir option first (small change, with tests) rather
than overwriting the old evidence.

## 2. Refresh the frontend data from the new evidence

1. MVP: `pnpm --dir apps/product-ui build` (runs the projection scripts, including the devnet projection, then the
   static export to `apps/product-ui/out/`). Check `/settlement/` shows the new devnet links and today's slots.
2. Landing: `pnpm --dir apps/marketing build` (runs extract-specimens + lint-copy, static export to
   `apps/marketing/out/`). Check the Solana section's "View on Solana Explorer" links open the new transactions.
3. Click every devnet explorer link once (cluster=devnet) and confirm each shows "Finalized" and today's date.
4. Builds never break the dev servers (dev uses `.next-dev`); if a dev server shows "Cannot find module", stop it,
   delete its `.next-dev`, restart.

## 3. Final checks (both apps)

- Verify page: 48/48 passing plus the devnet check group; the tamper demo goes red, then Reset goes green.
- Zero console errors on every route at 1280x800, 1440x900, 1920x1080 and 390 wide; no off-origin requests.
- Landing copy rules: no exact library counts (scale words only), no internal IDs or hashes, real brands labelled as
  observed (no relationship implied), Solana described accurately (devnet re-settlement; recorded run on a hosted
  sandbox; never mainnet), Jev as "built with Jev", ContextHint traction framed as ContextHint's.
- The MVP buttons on the landing reach the MVP (in the merged build: `/mvp/`).
- Present mode autoplay runs about 4 minutes with no stuck beat.

## 4. Merge and deploy (only on the owner's explicit go)

1. Build the MVP with `NEXT_PUBLIC_BASE_PATH=/mvp` and merge its `out/` into the landing's `out/` under `mvp/`
   (single static artifact). Test the merged build locally (`npx serve` or `python3 -m http.server` on the merged
   folder): landing and `/mvp/` routes, deep links, Verify.
2. Deploy target, domain (axp.one) and any old-site replacement are the owner's call. PolySans is licensed for the
   public deploy (owner, 2026-10-02). Remove `noindex` only if the owner wants the site indexed.

## 5. Video submission

1. Record from the MVP's Present mode: `/present/?auto=1`, Chrome clean profile, 1920x1080 viewport, cursor hidden,
   no auto-zoom; two takes, keep the best.
2. Export 1080p H.264; burn in captions (Present has its own caption bar) and attach the SRT from
   `apps/product-ui/public/present.srt` (generated by the build).
3. Optionally record a short landing-page scroll in film mode (`/?film=1`) for the intro.
4. Swap the landing page's video (Proof section) for the new cut if it's better than the original recording.

## 6. On the day

- [ ] Fresh devnet settlement done (section 1) and committed
- [ ] Both apps rebuilt from it (section 2), links checked
- [ ] Final checks green (section 3)
- [ ] Deployed or ready to demo locally (section 4, owner's go)
- [ ] Video recorded and uploaded (section 5)
- [ ] Owner reviewed the shared payment change in `packages/payments/sdk-transport.mjs` (devnet treasury config)
