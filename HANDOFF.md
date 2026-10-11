# AXP handoff: October 2 baseline to the current product

Prepared 11 October 2026 for an agent whose last context is the October 2 release.
Read this before changing code, deploying, or operating payment channels.

## What this branch contains

The old `main` baseline is `f98518099c0553a82006edf24455c247664465f6` (October 2).
This branch, `hosting-sync-2026-10-11`, brings the completed October 7 product,
landing, SDK, payments, video, documentation and benchmark evidence into
`AkshatGada/axp-one`. It also updates public repository links to this repository.
It is a review branch: pushing it or creating its PR does **not** merge `main`.
The owner intends to review and merge the PR personally.

The existing website was deployed separately through the Vercel CLI during the
October 7 work. An old-looking GitHub `main` therefore does not by itself mean
the domain is serving the October 2 build. Conversely, a working domain does not
prove this PR was merged. Verify these two facts separately.

This handoff adds context, not new permission for paid calls, wallet operations,
fresh benchmarks, production deployment, or changes to cloud access.

## Read order and authoritative documentation

1. [AGENTS.md](AGENTS.md): operating boundaries and current release.
2. [README.md](README.md) and [pages.md](pages.md): setup, public routes and APIs.
3. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): implemented system and ownership.
4. [HOSTING.md](docs/product/HOSTING.md): durable state, secrets and recovery.
5. [PRODUCT_DEMO.md](docs/product/PRODUCT_DEMO.md): presenter flow and native modes.
6. [BENCHMARK.md](BENCHMARK.md) and [NETWORK_SCALE.md](docs/product/NETWORK_SCALE.md):
   measured results, limits, unresolved usage and operator recovery.

September plans and the original MVP documents remain historical context. Current
implemented-release documentation supersedes their pending work and design rules.
Recorded evidence keeps its original date; do not relabel it as a new execution.

## What changed after October 2

The original build was primarily an operator-run MVP and recorded explorer. The
new release adds usable advertiser and publisher surfaces around the same exchange
and payment foundations, preserving the original MVP and its artifacts.

| Surface | Current purpose |
|---|---|
| `/` | Product story: hero → ContextHint → whole flow → Jev → Solana → compact benchmark → closing |
| `/advertiser-dashboard/` | Advertiser account, campaign draft, context hints, approved creative, native funding, reporting and close/refund |
| `/sdk/` | Public shortcut to the publisher integration guide |
| `/publisher-demo/integration/` | Request → Render → Acknowledge; source SDK and example-app entry point |
| `/publisher-demo/` | Simple chat with an independent answer, a separate Sponsored card, and visual internal inspection |
| `/demo/` | Chaptered 1080p walkthrough with captions and downloadable video |
| `/mvp/` | Preserved original recorded explorer; secondary evidence rather than the main product tour |

The canonical public origin and guide examples use **https://axp.one**. Localhost
is only an explicit development override. Product APIs are `/api/product/*`;
the original MVP API remains `/api/runs/*` with its existing contracts.

### Advertiser journey

An advertiser enters its offer, declared capabilities, authored context hints,
approved Sponsored creative and financial limits. It reviews and approves a saved
draft, then launches a bounded, funded native Devnet campaign. Approval binds the
copy used for delivery. Dashboard reporting and payment operations use the backend
ledger rather than a separate UI simulation. Demo suggestions support editable
Tab completion for a quick human-operated walkthrough.

The three prepared fictional advertisers are **ClearVault, KeyArc and ColdNest**.
The presenter creates **HarborKey** as the fourth. These are demo identities funded
by a shared server-held sponsor, not independently onboarded advertiser wallets.
Current inventory, expiry and remaining budgets are mutable: inspect the live API
before presenting rather than assuming the original three channels remain usable.

### Publisher journey and model distinction

The SDK supplies ad request, safe Sponsored rendering and acceptance forwarding.
Its implementation and examples are in `packages/publisher-sdk/`. It is source
distributed, not a published npm package or public publisher signup service.
Publisher credentials belong on the publisher server, never in browser code.

**DeepSeek powers only the example chat's organic answer.** An integrating
publisher keeps its own answer model. No advertiser material enters the example
answer prompt. The ad request runs in parallel; the example displays the card
after the answer. Do not claim zero latency or organic endorsement.

**Jev makes the buying judgments.** Eligible campaigns receive evidence-backed
fit, intent and creative judgments through Jev. The deterministic exchange applies
integer bid policy, eligibility, budgets and a first-price auction. Jev does not
choose payment amounts, recipients or keys and never signs or transfers funds.

The chat's **View internals** dialog follows five stages: **Context → Buyers →
Auction → Delivery → Payment**. It includes retrieved evidence, distinct advertiser
hints, actual decisions, auction results, accepted receipt and native channel proof.
Payment inspection and coordinated close/refund stay inside the same dialog.

### ContextHint: the differentiation

ContextHint is an existing advertising intelligence platform specifically for
**ChatGPT ads**, with live-collected ChatGPT advertising data. The founders report
more than a thousand marketers using ContextHint daily, including paying customers.
That is ContextHint usage and a distribution starting point; it is not AXP customer
adoption or measured targeting lift.

AXP uses screened ContextHint evidence, embeddings and inferred context to inform
retrieval and buying judgments. There is **no newly trained AXP model**. The
committed serving corpus is a bounded crypto-storage snapshot under
`artifacts/v2/evidence`; it is not a fresh full-corpus export on every request.
Retrieval provenance distinguishes cached vector retrieval from lexical fallback.
Advertiser-authored hints and declared capabilities are separate from ContextHint
observed/inferred evidence. Preserve that distinction in UI, docs and pitches.

## Architecture and where to work

| Source | Responsibility |
|---|---|
| `apps/marketing/src/v7/`, `apps/marketing/src/data/copy.ts` | Landing sequence, current public proof and product entry points |
| `apps/marketing/src/app/demo/`, `apps/marketing/public/video/` | Video page, MP4 and captions |
| `apps/product-ui/src/components/advertiser-dashboard/` | Campaign editor, reporting and payment panel |
| `apps/product-ui/src/components/publisher-demo/` | Chat, minimal answer view, five-stage internals and native payment visualization |
| `apps/product-ui/src/app/publisher-demo/integration/page.tsx` | SDK guide |
| `packages/publisher-sdk/` | Server/browser/React SDK, types, examples and integration documentation |
| `packages/product/service.mjs`, `api.mjs` | Campaign lifecycle and API authority |
| `packages/product/decisions.mjs`, `packages/ml/` | Context retrieval and validated Jev decisions |
| `packages/exchange/` | Eligibility, integer bids, first-price auction, reservations and accepted charges |
| `packages/product/organic.mjs` | Independent DeepSeek admission and answer persistence |
| `packages/product/payments.mjs`, `native.mjs`, `packages/payments/` | Accepted-ledger vouchers, native channels and recovery |
| `packages/product/hosted.mjs`, `packages/hosted/` | Encrypted private state, conditional writes, leases and Vercel API |
| `scripts/build-site.mjs`, `vercel.json` | Combined static marketing/product/MVP export and Node API packaging |

There is one backend auction, financial ledger and signing authority. Do not build
a second implementation in the browser or introduce another payment protocol.

### Payment semantics that must remain intact

1. Opening a native channel deposits collateral on public Solana Devnet.
2. An eligible winning award reserves budget; reservation is not a charge.
3. Exact Sponsored insertion/disclosure is acknowledged through the publisher path.
4. One accepted signed receipt creates one charge; replay returns the same result.
5. Charges advance signed **cumulative off-chain vouchers**. There is no on-chain
   transaction for each ad, and cumulative totals must not be summed as new charges.
6. Closing the channel pays the saved latest authorized amount to the publisher
   and returns unused collateral. Fees/rent in SOL are separate from test USDC.

A receipt asserts app insertion and Sponsored disclosure, not human attention,
viewability, clicks or conversion. A voucher is authorization, not finalized payout.
Only finalized native evidence establishes settlement and refund.

Closing ends new placements for that campaign. The chat payment panel closes the
winning campaign's **whole channel**, including earlier deliveries, not just the
displayed turn. Settle last in a recording. Preserve signed identities, balances
and unknown outcomes: never reset or redeposit to repair uncertainty.

## Hosting and wallet continuity

Use the existing Vercel project **`lucario004/axp-one`**, with domains `axp.one`
and `axp-one.vercel.app`, connected to `AkshatGada/axp-one` production branch `main`.
Do not create a replacement project, Blob store, encryption key or demo wallet.
The last recorded October 7 production deployment was
`https://axp-r4qoqut5q-lucario004.vercel.app`
(`dpl_5NjfVgjPPAasihbj2MDSwAF4jMCr`). This is historical deployment context, not
a fresh October 11 assertion about the current domain or account state.

The hosted wallet was updated during the product work to these public identities:

- Sponsor: `FvZ2jvMmVveZYNvsQEQbpkPnHtUuBWburtHAYAWW4SLg`
- Publisher: `2thyaZ4skNqYyMdR4HSkkQ1VPUCnzi884AahjmXy6fXu`
- Circle Devnet test-USDC mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

These are public addresses, not secrets or a current balance report. Confirm the
configured payer/payee and preserved channel identities before any operation.

Server-only configuration includes `AXP_PRODUCT_ENABLED`,
`AXP_PRODUCT_WORKSPACE_ID`, `AXP_PRODUCT_FINANCIAL_MODE`,
`AXP_PRODUCT_DEVNET_SIGN`, `AXP_PRODUCT_DEMO_MODE`, `AXP_PRODUCT_DEVNET_WALLET`,
`AXP_STATE_KEY`, `BLOB_READ_WRITE_TOKEN`, `JEV_API_KEY`/`TYPESAFE_API_KEY`,
`DEEPSEEK_API_KEY`, and optional `AXP_PUBLISHER_API_KEY`/`AXP_PRODUCT_PASSCODE`.
See HOSTING.md for exact values and caps. Never print credentials, copy secret
values into this file, or expose them using `NEXT_PUBLIC_*`.

### Durable state and recovery

The hosted `demo` workspace intentionally preserves the migrated native channels.
Private financial and organic state use separate encrypted Blob snapshots.
Temporary SQLite state and warm server memory are not authoritative. Exact-value
CAS with strong ETags and leases fences stale writers; busy mutations return
retryable 429 responses. The stores do not form a distributed atomic transaction.

Durable checkpoints precede paid provider calls and signed native broadcasts.
Signed bytes, signatures, admissions and unknown outcomes survive cold starts.
Uncertain provider calls are not silently reissued; uncertain transactions are
looked up by their saved identity. Keep the workspace ID and encryption key stable.
Do not delete state or re-import over an initialized workspace to fix a failure.

`GET /api/product/health` is read-only and makes no model call or transfer. It
checks configuration/store reachability, not funding or a successful new payment.
Other safe checks are documented in pages.md and HOSTING.md. Any fresh chat turn,
campaign launch, native close or benchmark is a distinct external side effect.

The product is a bounded shared Devnet demo, without independent advertiser-wallet
onboarding or multi-tenant production authentication. This limits public claims;
it does not negate the recorded native channel implementation and proof.

## Recorded scale work: what actually happened

The benchmark goal was many off-chain vouchers followed by one native close per
channel. All funded benchmark channels are now financially closed; they are
isolated from the hosted presentation inventory. Do not repeat the workload.

| Evidence | Recorded result |
|---|---|
| Actual funded Devnet channels | 125 |
| Finalized native transactions | 250: 125 openings + 125 closes |
| Accepted deliveries / cumulative voucher updates | 824 |
| Test USDC deposited / publisher paid / sponsor refunded | 6.25 / 1.236 / 5.014 |
| Threshold-selected subset, included in the totals above | 26 channels, 676 vouchers, 52 transactions; 1.3 deposited / 1.014 paid / 0.286 refunded |
| Separate local fixture stress test | 1,052,672 updates over 16,448 simulated channels, 64 updates per mock close |

The local million-update test used **zero** provider calls, RPC calls, cryptographic
signatures or native broadcasts. Its measured authorization latency was 10.924833 ms
p50 / 21.922792 ms p95 and whole-run throughput 216.25586 fixture updates/second.
It establishes local state-machine behavior, not mainnet or hosted fleet capacity.

The actual load stage stopped at 825 started turns and 824 completed answers. Three
original signed openings expired/unfunded. Nine unknown-usage provider attempts
(eight Jev, one DeepSeek) retain their full conservative reservations. The original
128-advertiser / 1,024-turn targets were not achieved. Financial cleanup does not
erase those outcomes or clear unknown API usage.

Threshold closure was an **operator-selected** policy after load/drain: at least
0.03 test USDC authorized, at least two vouchers, accepted equal to authorized,
zero reservations and known native outcomes. The application has explicit close,
not an automatic production threshold watcher. Failed signed close identities and
their recovery provenance remain preserved in the proof.

Use `BENCHMARK.md`, `artifacts/network-scale/devnet-funded-acceptance.json`,
`devnet-funded-verification.json` and the threshold subset records for details.
The landing has a compact result summary; there is no `/network/` page or benchmark
API. Actual Devnet evidence and fixture counts must remain visibly distinct.

## Design and presentation decisions

Keep the existing PolySans fonts and the Prospectus/Ledger design system.
General product surfaces use ultramarine; ContextHint uses orange; Solana-specific
visuals may use Solana purple. Do not introduce generic gradients or new UI kits.
Use visual steps and concise labels. Put optional engineering details behind
inspection rather than filling the main chat or landing with dense explanations.

The revised human demo story is **landing → advertiser dashboard → SDK briefly →
example chat → View internals → finalized payment proof**. The old MVP is preserved
but does not need to interrupt this journey. The existing embedded 1:53 video is
a recorded walkthrough, not fresh execution. Presentation files were edited
separately; the repository documentation and dated artifacts are the technical
source of truth. Do not restart presentation editing as part of this code handoff.

## Verification and safe next steps

During preparation of this branch on October 11:

- Repository tests: **477 passed, 11 skipped, zero failed** (488 total).
- Marketing and product UI TypeScript checks: passed.
- Staged repository hygiene and whitespace checks: passed before this handoff;
  rerun after any further staged change.
- No fresh provider call, token transfer, benchmark or deployment was performed
  for this synchronization. Prior hosted acceptance is dated evidence.

Use Node 22.18+ and the pinned pnpm version from package.json. Main commands:

```sh
pnpm install --frozen-lockfile
node scripts/test.mjs
pnpm --filter @axp/marketing typecheck
pnpm --filter @axp/product-ui typecheck
node scripts/setup/check-repository.mjs
git diff --cached --check
npm run build:site
```

The native build uses pinned payment SDK packaging; follow the repository setup
guide if an ignored SDK artifact is missing. Do not commit local dependencies,
wallet JSON, env files, SQLite, private vouchers, state keys or raw provider logs.

Next agent: inspect this branch/PR and read the documents above before proposing
changes. Keep the existing project, wallet, private Blob state and route contracts.
Let the owner merge the PR. If asked to deploy afterwards, verify the exact
reviewed revision, current production environment and read-only route/API behavior;
do not spend a fresh call or create/close a channel merely to check documentation.
