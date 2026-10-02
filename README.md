# AXP.one — The advertising exchange for the agentic internet

Repository: `agentic-dsp`. Product positioning confirmed by the user on 2026-09-30.
The DSP is the advertiser buying subsystem; the exchange connects buyer agents
and AI publishers. The first beachhead is conversational AI sponsored cards.

Status (2026-10-02): V3 runs end to end on **public Solana Devnet** with Devnet test
USDC: real DeepSeek `deepseek-flash` organic answers, real Jev decisions, deterministic
first-price auctions, browser-acknowledged publisher receipts, cumulative vouchers and
per-run channel opens/closes. Judges can trigger such a run from the hosted MVP
([architecture](docs/build/HOSTED_LIVE_RUN.md)). Recorded runs replay offline with no
credentials. Fictional advertisers; not mainnet, not real money.

## Quickstart (judges)

Requirements: **Node 22.18+** (the `engines` field in `package.json`; it needs built-in
`node:sqlite` and TypeScript type stripping; tested on 25.5, 22.x untested) and
**pnpm 10+** (tested 11.9; `corepack enable`). Tested on macOS.

```sh
git clone <this repository> agentic-dsp && cd agentic-dsp
npm test                       # repository suite (no install, no keys, no network)
```

**1. Replay the recorded runs (no keys, no install).**

```sh
npm run demo:v3:replay         # http://127.0.0.1:8794 (AXP_V3_PORT to change)
node scripts/demo/v3-replay-check.mjs artifacts/v3/replay   # read-only bundle check
```

If a port is already taken (`EADDRINUSE`), pick another one for that command:
`AXP_V3_PORT=8795 npm run demo:v3:replay`, `AXP_HOSTED_PORT=3101 node scripts/hosted/dev-server.mjs`.
The replay check covers the original sandbox recording (`artifacts/v3/replay`). The live
Devnet runs are verified by the MVP build instead (`apps/product-ui/scripts/project-run.mjs`
fails the build if any check fails) and by the MVP's Verify page (`/verify`).

Bundles: `artifacts/v3/replay` (first recording, hosted sandbox),
`artifacts/v3-devnet-live-rehearsal/replay` (live Devnet, terminal operator),
`artifacts/hosted-live-e2e/replay` (live Devnet, through the hosted API).

**2. The two sites (landing + MVP).**

```sh
pnpm install --frozen-lockfile
pnpm --filter @axp/marketing dev       # landing  http://localhost:3410
pnpm --filter @axp/product-ui dev      # MVP      http://localhost:3420
pnpm --filter @axp/marketing build     # static export -> apps/marketing/out
NEXT_PUBLIC_BASE_PATH=/mvp pnpm --filter @axp/product-ui build   # -> apps/product-ui/out
node scripts/hosted/dev-server.mjs     # both + the live API on http://127.0.0.1:3100
pnpm --filter @axp/product-ui test     # MVP projection tests
npm run build:site                     # the whole axp.one site as deployed: landing, /mvp/ and the
npm run serve:site                     #   /api function in .vercel/output; served at http://127.0.0.1:3200
```

Hosting (Vercel, framework "Other", settings in `vercel.json`): see
[hosted live run](docs/build/HOSTED_LIVE_RUN.md) sections 3 and 9.

**3. A live run of your own on Solana Devnet** (spends your Jev/DeepSeek credits and
Devnet test tokens only; a run takes about 1–3 minutes).

```sh
cp .env.example .env.local             # then set JEV_API_KEY and DEEPSEEK_API_KEY
# Payment SDK, rebuilt from the vendored, hash-pinned source (needs the npm registry once):
npm ci --ignore-scripts --no-audit --no-fund --prefix tooling/payment-sdk
node scripts/payment-spike/phase4-sdk.mjs --acquire
# Stable Devnet wallets: two advertiser payers + one publisher (0600 file, gitignored):
node scripts/hosted/wallets.mjs init   # prints the public addresses
```

Fund each **payer** address with at least 0.05 Devnet SOL (https://faucet.solana.com)
and 0.1 Devnet USDC (https://faucet.circle.com, network Solana Devnet). Or, from a
funded Devnet wallet file of your own (`AXP_TEST_WALLET_PATH`, shape
`{"network":"solana-devnet","sponsor":{"address","secret"}}`):
`AXP_HOSTED_DEVNET_SIGN=1 node scripts/hosted/wallets.mjs fund 0.25 1`.
Check with `node scripts/hosted/wallets.mjs status`, then:

```sh
AXP_LIVE_ENABLED=1 node scripts/hosted/dev-server.mjs
# open http://127.0.0.1:3100/__live/ and press "Start a live run": this page acts as the
# publisher's app, inserting each Sponsored card into its DOM before acknowledging it.
# or the same, unattended, through headless Chrome (AXP_CHROME_BIN if Chrome is elsewhere),
# saving the run's public files under artifacts/my-run/:
AXP_E2E_LIVE=1 node scripts/hosted/e2e-live.mjs --keep-artifacts artifacts/my-run
```

A run's files (`/api/runs/<id>/files/replay/run.json`, `.../chain-check.json`, ...) use the
same schema and layout as `artifacts/v3-devnet-live-rehearsal/`; render one in the MVP with
`AXP_RUN_DIR=artifacts/my-run/replay pnpm --filter @axp/product-ui build`.
More setup detail: [standalone setup](docs/STANDALONE_SETUP.md).

**4. Checks before sharing changes.**

```sh
npm test
node scripts/setup/check-repository.mjs   # no secrets, machine paths or private files staged
```

Baseline planning package reviewed 2026-09-30. The later data/ML and delegated
component-specification expansion is still being reconciled; see planning
progress. That earlier review does not certify the expanded plan or any build.

Advertiser agents buy disclosed placements inside participating conversational
AI applications, subject to campaign rules and authorized spending ceilings.
An off-chain exchange correlates accepted delivery events with accumulated
stablecoin settlement. It does not sell organic recommendations or agent attention.

## Review order

1. [North Star and MVP boundary](docs/NORTH_STAR.md)
2. [Research and open-source reference register](docs/research/REFERENCES.md)
3. [Architecture and ownership](docs/ARCHITECTURE.md)
4. [End-to-end flows and failure states](docs/FLOWS.md)
5. [Buying and auction algorithms](docs/ALGORITHMS.md)
6. [Payment model and feasibility gates](docs/PAYMENTS.md)
7. [API and data contracts](docs/CONTRACTS.md)
8. [Threat and evidence boundaries](docs/SECURITY_AND_EVIDENCE.md)
9. [Build sequence and acceptance matrix](docs/IMPLEMENTATION_PLAN.md)
10. [Frontend specialist handoff](docs/FRONTEND_HANDOFF.md)
11. [Decisions and remaining feasibility questions](docs/DECISIONS.md)
12. [Independent planning review](docs/audits/SPEC_REVIEW.md)
13. [Repository and domain separation](docs/REPOSITORY_MAP.md)
14. [Shared existing design system](docs/DESIGN_SYSTEM.md)
15. [Hackathon demo and test-agent harness](docs/DEMO_AND_AGENT_HARNESS.md)
16. [Replaceable DecisionEngine and Jev buyer](docs/DECISION_ENGINE.md)
17. [Jev comparison and benchmark plan](docs/JEV_BENCHMARK_PLAN.md)
18. [ContextHint corpus exploration and targeting advantage](docs/research/CONTEXTHINT_DATA_EXPLORATION.md)
19. [Plugin tools, backend APIs and deeper reuse map](docs/research/CONTEXTHINT_TOOL_API_MAP.md)
20. [ML-only component, data and Mac Studio plan](docs/ML_PLAN.md)
21. [Component execution, builder ownership and orchestration](docs/COMPONENT_EXECUTION_PLAN.md)
22. [Shared contract review packet](docs/SHARED_CONTRACT_PACKET.md)
23. [Planning progress and pending gates](docs/PLANNING_PROGRESS.md)
24. [Demo component and final frontend handoff packet](docs/DEMO_COMPONENT_PACKET.md)
25. [Consolidated component-plan review entry point](docs/COMPONENT_PLAN_REVIEW.md)
26. [C01/C02 data and targeting component packet](docs/DATA_TARGETING_COMPONENT_PACKET.md)
27. [C03/C04/C05 agent, auction and delivery component packet](docs/EXCHANGE_COMPONENT_PACKET.md)
28. [C06 payment component packet](docs/PAYMENT_COMPONENT_PACKET.md)

The ContextHint research supplement is a later read-only addition to the reviewed
baseline; data integration and its ablation tests are not implemented or covered
by the earlier spec recheck.

## What is new versus AXP

AXP demonstrated sponsor-funded access to an owned paid report. This repository
is an advertising marketplace: AI apps sell separate sponsored-card placements;
agents represent the advertiser buying those placements. No document quiz or
report-unlock gate is required. Earlier receipt, restart and budget lessons are
design inputs, not evidence that this new system already works.

The build includes backend plus intentionally plain functional and replay UIs.
Final frontend visual design belongs to the user's specialist agent. Historical
planning documents remain as research, with implemented APIs frozen separately.
