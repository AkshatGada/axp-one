# Interactive Arc backend: local review before hosting

The interactive Arc pages use `/api/arc`, isolated from `/api/product` and the
production shared demo. The backend reuses AXP's existing encrypted snapshot,
compare-and-swap lease, checkpoint and original-operation recovery machinery.
It restores a private scratch workspace per request. The local runner deliberately
creates a fresh API instance each time, exercising the cold-start path.

## Review now

- Dashboard: http://127.0.0.1:3450/arc/advertiser-dashboard/
- Chat: http://127.0.0.1:3450/arc/publisher-demo/
- Configuration-only health: http://127.0.0.1:3450/api/arc/health

Start/restart after the one-time import:

```sh
npm run arc:hosted-local
```

On this machine the original `local-state/arc/product` writer was gracefully
stopped, and its original database, receipt identity and private payment records
were imported once into `local-state/arc/hosted-local`. The latter contains a
private local encryption key and file KV. A `HOSTED_OWNER` marker prevents the old
`arc:demo` / `arc:prepare` writer from resuming against the archived snapshot.
Do not remove the marker, reset either workspace or run both financial writers.
The original public execution exports remain unchanged historical observations.

For an explicitly authorized first migration on another preserved workspace:

```sh
# Stop the original local Arc server first; its worker lock must be gone.
npm run arc:hosted-local -- --import-local
```

Migration never overwrites an initialized financial/organic workspace. It imports
only the existing allowlisted financial database and publisher identity files;
Arc signing wallets stay outside snapshots. Startup/import make no model call,
signature, deposit or transfer. Read-only routes never submit payments.

## What the reviewer can do

Open the prepared StackPilot campaign, then the Arc chat and choose the developer
tools suggestion. Inspect the independent fixture answer, separate Sponsored
card, signed insertion receipt and exact authorization in View internals. Submit
saved nanopayments explicitly and reconcile their original transfer IDs. The
dashboard shows the same durable charges and batch state after a reload/restart.

At handoff the preserved campaign had 0.004 test USDC spent/finalized and 0.004
remaining under its original 0.008 spending cap: two further 0.002 deliveries.
Recheck current state before another take. No new allocation was funded for this
local backend migration. The existing global Arc ceilings remain enforced.

Buyer judgments and independent answers are labelled fixtures. Auction, DOM
acknowledgement, receipt signatures, ledger, EIP-3009 signatures and Arc/Gateway
payments are actual. No paid provider credentials are passed into this demo.

## Hosting is pending local approval

The human requested localhost review before hosting. These interactive changes
have not been pushed/deployed or enabled in Vercel. The earlier `/arc/` Vercel
page is still the read-only evidence viewer.

The adapter is gated to the `feature/arc-integration` Vercel Preview environment;
it stays disabled in Production and other branches. Hosted activation will need
the official Arc SDK packaged with the function, separate branch-scoped Arc wallet
and encryption settings, an isolated durable KV workspace, a one-writer migration,
and hosted verification. Existing Vercel Authentication also needs a judge-access
decision. Production state, Solana/Tempo identities and account-owned APIs remain
unchanged. No production merge or promotion is authorized by this local review.

## Validation for the local review

The Arc/hosted/Tempo regression group passed 33 tests. Full `verify:review` passed
845 of 853 repository tests, with eight optional checks skipped and zero failures,
plus 91 UI component tests, both UI typechecks, SDK parity, links and hygiene.
The product production build includes both new Arc pages. Read-only local HTTP
checks returned 200 for both pages and all four Arc bootstrap/config/state/health
endpoints; the imported campaign retained its original IDs and finalized totals.
These fixture and local checks do not claim a new hosted network execution.
