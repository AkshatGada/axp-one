# Public pages and API map

Canonical origin: **https://axp.one**. Updated 7 October 2026 (Singapore).
Localhost URLs are for explicit development and replay instructions only.

## Live product

| Route | What to show | Source |
|---|---|---|
| `/` | Hero → ContextHint → whole product flow → Jev → Solana → compact benchmark → Closing | `apps/marketing/src/v7/` |
| `/advertiser-dashboard/` | Campaign editor, context hints, approval, funding, reporting and close/refund | `apps/product-ui/src/components/advertiser-dashboard/` |
| `/publisher-demo/` | Independent answer, Sponsored card, five-stage View internals, same-modal close/refund and finalized proof | `apps/product-ui/src/components/publisher-demo/` |
| `/publisher-demo/integration/` | Request → Render → Acknowledge; example-chat action; complete setup in disclosures | `apps/product-ui/src/app/publisher-demo/integration/page.tsx` |
| `/sdk/` | Redirect to the integration guide | `scripts/build-site/site-routes.mjs` |
| `/demo/` | 1080p product video, captions, chapters, download and both product entry points | `apps/marketing/src/app/demo/` |
| `/video/product-walkthrough.mp4` | Downloadable edited 1:53 H.264 video with English subtitle track | `apps/marketing/public/video/` |
| `/video/product-walkthrough.vtt` | Browser captions | `apps/marketing/public/video/` |

The dashboard and chat use the same durable `demo` workspace. The recording was
captured against an isolated workspace; it is a replay, not a newly executed chat.
The three prepared advertiser identities are ClearVault, KeyArc and ColdNest.
A presenter creates HarborKey as the fourth using editable suggestions.

The recording flow is landing → advertiser dashboard → SDK guide → example chat →
View internals. The same dialog shows Context, Buyers, Auction, Delivery and Payment.
Payment can close the exact winning campaign's whole channel, then show finalized
publisher payout, unused-deposit refund and Explorer proof without leaving chat.
Closing ends new placements for that campaign; perform it last in a take.

The landing page links finalized 7 October proof and ends with compact result
evidence: 1,052,672 local synthetic voucher updates and **125 funded Solana Devnet
channels / 250 independently verified transactions**. Actual paid-run counts are
824 accepted deliveries/off-chain vouchers, 6.25 test USDC deposited, 1.236 paid
and 5.014 refunded. Every funded channel is closed. The original load stage remains
partial: 825 started turns, 824 completed answers, three failed/unfunded openings
and nine unknown-usage provider attempts still fully reserved. These benchmark
channels are separate from the live demo's three prepared presentation channels.

The header has no network badge; payment proof still identifies Solana Devnet and
test USDC. Methodology and sanitized proof live in `BENCHMARK.md` and
`artifacts/network-scale/`, including the unchanged 26-channel threshold subset.
The million fixture counts and actual API/Devnet evidence remain separate. There
is no `/network/` page or benchmark API.

## Original MVP and recorded evidence

All these routes are under `/mvp/`, served by the recorded explorer in
`apps/product-ui/src/app/(explorer)/`. They remain separate from the live product and are secondary historical evidence,
not the landing page's main tour or a required stop in the current recording.

| Route | Purpose |
|---|---|
| `/mvp/` | Original recorded run overview |
| `/mvp/opportunity/1/` through `/mvp/opportunity/4/` | Correlated decision, auction and delivery details |
| `/mvp/advertisers/` and its campaign detail routes | Recorded advertisers |
| `/mvp/publisher/` | Recorded publisher deliveries |
| `/mvp/settlement/` | Recorded channel payout/refund and Explorer links |
| `/mvp/evidence/` | Recorded ContextHint inputs and provenance |
| `/mvp/verify/` | Read-only verification and tamper demonstration |
| `/mvp/try/` | Illustrative question inspection against recorded scenarios |
| `/mvp/present/` | Original MVP presentation |
| `/mvp/live/` and `/mvp/live/run/` | Separate original live-run workflow, subject to its own readiness and caps |
| `/mvp/first-recording/` | Earlier recorded sandbox run, labelled with its original mode |

The first recording includes its corresponding nested explorer pages. Design/lab
routes are development tools, excluded from the deployed export. `/mvp/try/` and
recorded presentation controls are not fresh Jev or DeepSeek execution.

## Product API

Base URL: `https://axp.one/api/product`. Implementation:
`packages/product/api.mjs`, with hosted durability in `packages/product/hosted.mjs`.

| Method and path | Purpose | Authentication |
|---|---|---|
| `GET /health` | Configuration and durable-store reachability | Public, no provider/payment action |
| `GET /publisher/config` | Placement, capabilities and provider readiness | Public; no key issuance |
| `GET /bootstrap` | Demo configuration and CSRF capability | Public bounded demo |
| `GET /state` | Public campaign/delivery/payment projection | Public bounded demo; no secrets |
| `POST /opportunities` | SDK ad request with stable session/turn identity | Server-only `x-axp-publisher-key` |
| `POST /awards/:id/render` | Exact inserted/disclosed creative observation | Publisher key and `x-axp-delivery-token` |
| `POST /awards/:id/fail` | Release an undelivered award | Same bound credentials |
| `POST /account`, `/campaigns` | Dashboard account/draft writes | Same-origin `x-axp-csrf` |
| `POST /campaigns/:id/approve`, `/launch` | Approve saved copy; fund and launch | Same-origin CSRF, empty JSON body |
| `POST /campaigns/:id/pause`, `/resume`, `/duplicate`, `/preview` | Campaign operations | Same-origin CSRF |
| `POST /campaigns/:id/authorize`, `/reconcile`, `/settle` | Exact-ledger payment operations and recovery | Same-origin CSRF; backend signing bounds |
| `POST /demo/answer` | Example chat's independent DeepSeek answer | Same-origin CSRF |
| `POST /demo/chat` | Example chat's ad proxy | Same-origin CSRF |
| `POST /demo/awards/:id/render`, `/fail` | Reference browser receipt/failure proxy | CSRF plus delivery token |

If configured, `AXP_PRODUCT_PASSCODE` additionally protects every product POST.
Do not invent public publisher signup or a key-download endpoint. This release
has one operator-provisioned publisher/workspace rather than multi-tenant auth.
Provider sends and channel actions have side effects; browsing/configuration do not.
Original MVP APIs remain under `/api/runs/*` with their existing contracts.

## Build and verification

`scripts/build-site.mjs` assembles static marketing, root product pages and the
`/mvp/` exports, then packages the Node API and pinned payment SDK. The static
asset verifier checks each required entry page. Vercel serves media byte ranges
for chapter seeking. Test public routes, referenced assets, guide content and
provider/payment readiness after deployment. Do not claim HTTP 200 alone proves
a new model call or finalized payment. See [hosting](docs/product/HOSTING.md) and
[the demo runbook](docs/product/PRODUCT_DEMO.md).
