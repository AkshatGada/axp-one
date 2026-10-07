# axp.one — The advertising exchange for the agentic internet

Live product: **[axp.one](https://axp.one)**. Updated 7 October 2026 (Singapore).

Advertisers create a campaign, supply context hints, approve a Sponsored card and
fund a Solana Devnet payment channel. A publisher requests an ad alongside its
independent answer. ContextHint evidence informs Jev’s fit and intent judgments;
the eligibility and first-price auction engines control bids and reservations.
An accepted delivery receipt creates one charge and cumulative off-chain
authorization. Channel closure pays the publisher and refunds the unused deposit.

This release uses **Solana Devnet and test USDC**, fictional demo advertisers and
one bounded shared sponsor/workspace. DeepSeek powers the **example chat only**;
it is not the exchange’s decision engine. Jev is the buying decision layer.

## Open the product

| Surface | Link |
|---|---|
| Advertiser dashboard | [Create and operate campaigns](https://axp.one/advertiser-dashboard/) |
| Example publisher chat | [Ask a question, then view internals](https://axp.one/publisher-demo/) |
| Publisher SDK guide | [Connect your own AI app](https://axp.one/sdk/) |
| Product walkthrough | [1:53 recording with chapters and captions](https://axp.one/demo/) |
| Original MVP explorer | [Recorded evidence and live-run console](https://axp.one/mvp/) |

The public product requires no local installation. The guide connects to
`https://axp.one/api/product`; external SDK integrations need a publisher key
provisioned by the workspace operator. Configuration endpoints do not issue keys.
The SDK is repository source, not a published npm package.

## Documentation

- [Page and API map](pages.md): public routes, source owners and recorded/live boundaries.
- [Current architecture](docs/ARCHITECTURE.md): request flow, data, decisions and channels.
- [Demo runbook](docs/product/PRODUCT_DEMO.md): Tab/Enter presentation and payment recovery.
- [Hosted operation](docs/product/HOSTING.md): private Blob persistence and server configuration.
- [Publisher SDK](packages/publisher-sdk/README.md): hosted integration and local development.
- [Advertiser journeys](docs/product/ADVERTISER_JOURNEYS.md) and [publisher journeys](docs/product/PUBLISHER_JOURNEYS.md).
- [Design system](docs/DESIGN_SYSTEM.md): actual PolySans fonts, Ultramarine, Prospectus and Ledger.
- [Build and acceptance register](docs/BUILD_PROGRESS.md).
- [Measured network run](docs/product/NETWORK_SCALE.md): isolated operator harness, spend bounds and exported proof.

## What the data contributes

We are the founders of [ContextHint](https://contexthint.com), an advertising
intelligence platform specifically for **ChatGPT ads**. More than 1,000 marketers
use ContextHint daily (founder-reported usage of ContextHint, not AXP adoption).
It collects observed ChatGPT ad placements and derives context intelligence.
AXP uses embeddings and inferred context from that data to retrieve relevant
examples for advertiser buying decisions. The committed screened crypto-storage
snapshot is bounded and versioned; AXP does not collect new ChatGPT ads at runtime.
We do not claim a newly trained AXP model, ChatGPT ranking access or measured
conversion lift. Advertiser-authored hints and retrieved ContextHint evidence
remain separate inputs to Jev.

## Reproduce locally

Use **Node 22.18+** and **pnpm 10+**. This release was built and tested with Node
24.19 and pnpm 10.12.4 on macOS. No runtime imports another project checkout.

```sh
git clone https://github.com/Gaganub/axp-one.git
cd axp-one
npm test
node scripts/setup/check-repository.mjs
```

Replay the original saved run without provider keys, npm installation or payments:

```sh
npm run demo:v3:replay  # http://127.0.0.1:8794
node scripts/demo/v3-replay-check.mjs artifacts/v3/replay
```

For development, install workspace dependencies and configure your own server
credentials using the blank `.env.example` template:

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
npm run demo:product   # http://127.0.0.1:3430
```

Local development defaults to synthetic test credits. Configure DeepSeek and Jev
for actual provider calls. See the demo runbook before enabling native signing;
use separate local state and never reset a funded workspace or run a second
signing authority against its channels. Secrets, wallets and SQLite state are
ignored; they are not available from a public clone.

Build the complete deployed site, including product routes and the original MVP:

```sh
npm run build:site
npm run serve:site     # http://127.0.0.1:3200
```

The initial native SDK build downloads hash-pinned dependencies from npm. Vercel
uses `vercel.json` and Build Output API v3. Runtime secrets belong in the project's
server environment; committed static output contains no wallet or publisher keys.
Detailed fresh-clone setup is in [STANDALONE_SETUP.md](docs/STANDALONE_SETUP.md).

## Recorded proof and operating limits

The [product recording evidence](artifacts/product/recorded-walkthrough/README.md)
records a real hosted flow: HarborKey creation, fresh DeepSeek/Jev execution,
accepted Sponsored insertion, receipt replay without another charge, and finalized
channel closure paying 0.003 test USDC and refunding 0.017. All four recording-only
channels were closed. This separate recording workspace does not alter the live
presentation's three prepared advertisers.

The [earlier native acceptance](artifacts/product/devnet-acceptance.json) also
covers a zero-delivery full refund. `node scripts/product/verify-devnet.mjs`
rechecks its public chain evidence without a wallet, model call or transaction.
Original MVP bundles preserve their original dates, providers and financial modes;
they are recorded evidence, not current workspace state.

The hosted product allows at most eight channels, 2 test USDC aggregate deposits,
a 0.1 Devnet SOL fee/rent reserve, 20 organic admissions per UTC day and the
configured Jev admission cap (50 by default). One campaign is bounded to a
0.2 deposit, 0.1 spending cap and 0.004 maximum bid. See HOSTING.md and the native
backend for enforcement. No independent advertiser wallet onboarding, multi-tenant
authentication, mainnet payments, impression/click/conversion billing or fleet-scale
benchmark is claimed. A receipt authenticates insertion and disclosure, not attention.

## Historical planning and research

The documents below preserve the September planning record and later experiments.
Their dated proposals, pending gates, old ports and earlier test totals are historical;
current product operation is defined by the documentation above and executable
contracts. Recorded evidence is never rewritten to resemble a newer run.


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
