# Repository and deployment map

Updated 7 October 2026. Submission repository:
[github.com/Gaganub/axp-one](https://github.com/Gaganub/axp-one).
Public product origin: [axp.one](https://axp.one).

## Current layout

| Directory | Role |
|---|---|
| `apps/marketing` | Landing page and product video |
| `apps/product-ui` | Live dashboard/chat/guide and original recorded MVP explorer |
| `apps/backend` | Earlier reference backend and preserved harnesses |
| `packages/product` | Current campaign, decision, answer, API and payment orchestration |
| `packages/publisher-sdk` | Source-distributed Node/browser/React publisher integration |
| `packages/exchange`, `packages/contracts`, `packages/ml`, `packages/payments` | Shared exchange semantics, contracts, data adapters and channel implementation |
| `packages/hosted` | Vercel function and durable store helpers |
| `design-system` | Shared PolySans assets, foundation, Prospectus and Ledger |
| `artifacts` | Sanitized public evidence, replay bundles and recorded acceptance |
| `local-state` | Ignored private development/financial state; never public runtime input |
| `docs` | Current guides and dated planning/research/results |

The application is self-contained. Ordinary build, retrieval and replay do not
import another checkout, a founder's local database or machine-specific paths.
Historical source paths in research records describe provenance, not setup.
The pinned native payment source is vendored with its manifest and MIT notice;
ContextHint uses a screened, committed snapshot and retains observed/inferred labels.

## Deployment

One existing Vercel project serves the domain. `vercel.json` installs pinned
workspace dependencies and runs `scripts/build-site.mjs`. Marketing and product
static exports share the Node `/api/*` function; the root product surfaces and
`/mvp/` explorer use separate asset namespaces. Domain/DNS/Blob are retained.
Runtime wallet, provider and encryption credentials are server-only environment
variables. Hosted campaigns and channel obligations persist in private Blob,
independently of Git commits and deployments.

Use [pages.md](../pages.md) for public routes and [HOSTING.md](product/HOSTING.md)
for configuration/recovery. Source review happens in a PR before an operator updates
the connected deployment branch. Preserve prior recorded bundles and private
channel identities; do not copy a running funded local database into a new authority.
