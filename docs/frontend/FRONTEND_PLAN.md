# AXP frontend plan (hackathon, 2–3 days)

Owner decisions (2026-10-01): judges open a URL themselves and we submit a recorded
video; light paper with one dark stage; two design systems (see DESIGN_SYSTEMS.md);
presentation is everything. Specialist owns IA, design, motion and implementation.

## Architecture

- pnpm workspace at the repo root (`pnpm-workspace.yaml`): `design-system`, `apps/marketing`,
  `apps/product-ui`. The root `package.json` and the backend's `npm test` stay untouched.
- Both apps: Next.js (App Router) + TypeScript + CSS Modules on the Steel tokens, `motion` for
  animation, Lenis smooth scroll on the landing only. Static export (`output: "export"`) so either
  deploys anywhere with no backend, wallet, keys or database. **No deploy without the owner's OK.**
- The MVP reads a **public projection** of the recorded run, generated at build time by
  `apps/product-ui/scripts/project-run.mjs` from `artifacts/v3/replay/run.json` (+ chain-check,
  manifest). It strips: agent IDs, `openSalt`, RPC URL, full receipt signatures (kept as
  hashes + verify note), `packetBytes`, the 1.3 MB evidence catalogue (keep only records referenced
  by retrieval packets), duplicate `callEvidence`. Real brand names in historical observations
  (Mercari, Trezor, OneKey...) are shown only inside clearly labelled Observed evidence.
  `sandbox-topup.json`, `.env*`, `local-state/` and vouchers are never read.
- Optional local "Lab" link to `npm run demo:v3` (synthetic, models off) for the owner only; not
  part of the public build.
- Ports: marketing dev 3410, product dev 3420 (`.claude/launch.json` in /Users/akshat/openai-ads).

## Deliverable 1: the landing page (apps/marketing, Prospectus)

Story from a judge's seat: what is this, why now, how it works, why it is credible, proof it works,
what is next.

1. **Hero**: "The advertising exchange for the agentic internet." One line on what it does
   (advertiser agents bid on disclosed placements inside AI apps; delivery-linked stablecoin payments).
   Primary action: **See the working MVP**. Signature visual: a live-feeling chat in an AI app with
   a disclosed Sponsored card arriving, the bids behind it visible on the steel route.
2. **The shift**: AI apps create moments of decision (comparing, investigating, choosing). Search had
   an ad market; agentic apps do not. Short, visual.
3. **How the exchange works** (dark stage, scroll-pinned scene): five roles. Publisher offers an
   opportunity, advertiser agents evaluate against their own campaign, the exchange enforces
   eligibility and runs the auction, the disclosed card is delivered, a signed receipt creates the
   charge, the payment channel accumulates and settles. Each beat labelled Illustrative.
4. **Principles** (the trust contract as a selling point): agents advise, code decides money; an
   award is not a charge; sponsorship is always disclosed and separate from the organic answer;
   the organic assistant never sees advertiser material.
5. **Why payment channels**: thousands of tiny delivery-linked charges without a transaction per ad;
   cumulative authorization then one settlement; unused collateral refunded.
6. **The data foundation: ContextHint** (link https://contexthint.com). ContextHint is an existing
   conversational-ad intelligence product with thousands of users and paying customers (ContextHint's
   traction, not AXP's; no invented counts or revenue). Library snapshot, Sep 26, 2026: 11,730
   observed advertisers, 45,947 unique creatives, 420,540 observed placements, 983 niches (970 with
   ads), 7,121 sub-niches (5,991 with ads); placements span Jun 19 to Aug 24. How AXP uses it: retrieve
   historical prompt -> creative -> inferred-hint associations aligned to one advertiser and hand that
   compact evidence to its buying agent. The MVP used a screened slice: 1,178 associations, 241 prompts,
   537 creatives, 331 hints. Data context note: US-heavy coverage, snapshot date, historical counts not
   AXP enrollment, inferred hints are hypotheses. Never claim ChatGPT algorithm replication or targeting lift.
7. **It works today** (proof, links into the MVP): one recorded sandbox run. 4 real questions, 15 actual
   agent decisions, 3 auctions + 1 policy no-fill, 3 disclosed deliveries with signed receipts,
   2 payment channels settled (0.010 test USDC paid to the publisher, 0.030 refunded). Labelled
   hosted Solana sandbox, test USDC, recorded replay.
8. **Now and next**: demonstrated vs planned (campaign-planning agents, more publishers, x402 adapter,
   independent advertiser wallets, mainnet). Planned items carry the Planned mark.
9. **Closing**: See the MVP, watch the 4-minute walkthrough, ContextHint link. Footer.

## Deliverable 2: the MVP (apps/product-ui, Ledger)

The run explorer for `v3-wallet-acceptance`, recorded replay, honest about it everywhere.

- **Overview** (`/`): what this run is, the result in one sheet (questions, decisions, auctions,
  deliveries, settlement), scope labels (hosted Solana sandbox, test USDC, recorded replay), Start.
- **Advertisers** (`/advertisers`): onboarding as it happened: three campaign sheets (ClearVault,
  KeyForge, LeatherGuard) with declared capabilities, hints, approved creative, caps, version and
  approval, funding (two 0.020 channels, LeatherGuard unfunded). An onboarding form rendered read-only
  with a "Lab" note (live editing is the synthetic laboratory, not this run).
- **Opportunities** (`/run/[turn]` for cached, offline, repeat, mobile): the core screen.
  Left: the publisher app (HostChat): the user's exact question, the independent organic answer,
  the separate Sponsored card (or no-fill). Right, in order: eligibility, evidence packet per
  campaign (vector vs lexical fallback, observed prompt/creative, inferred hint), agent decisions
  (baseline vs history arms, bid/skip, levels, timing), auction (bids, tie-break rule, frequency-cap
  exclusion), award -> delivery -> signed receipt -> accepted charge.
- **Settlement** (`/settlement`): two channels: deposit, cumulative authorization steps
  (0.004 -> 0.007), payout, refund, fees and rent separately in lamports, open/close transactions,
  finalized status; event timeline; note that sandbox block times are not wall-clock order.
- **Evidence** (`/evidence`): the screened slice: counts, method, a browsable sample of the records
  actually used, quality flags.
- **Limits** (`/limits`): what this run proves and does not (from `limitations[]` and V3_RESULT).
- **Present mode** (`?present` or `P`): keyboard-driven guided walkthrough of the above in ~10 beats,
  1.25x scale, caption bar; also the source for recording the video.
- Every screen: provenance marks on every value; Inspector drawer with raw JSON and hashes.

## Claims guardrails (both deliverables)

Allowed: real conversational-ad observations and inferred targeting evidence inform advertiser-agent
placement decisions; deterministic auction; disclosed delivery; receipt-linked charges; cumulative
channel settlement on a hosted Solana sandbox with test USDC.
Never: AXP advertiser partnerships or enrollment counts, pricing, ChatGPT algorithm replication,
targeting lift, conversion optimization, viewability/attention, sub-50ms latency, mainnet, x402
settlement in this run, two independent advertiser wallets (one disposable payer funded both).

## Schedule

- Day 1: Steel foundation + Prospectus + Ledger (each with a `/design` showcase), run projection,
  landing v1, MVP opportunity screen v1.
- Day 2: landing scenes + motion, full MVP, present mode, owner review rounds.
- Day 3: polish, video recording from present mode, static builds, deploy only on owner's go.
Every UI step committed; each finished version tagged (`axp-landing-vN`, `axp-mvp-vN`). No push.
