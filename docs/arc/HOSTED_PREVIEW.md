# Interactive Arc Preview

This integration stays on `feature/arc-integration`. It is not merged or promoted
to production. The current designated deployment is:

- [Judge overview](https://axp-6ecvsn0yy-lucario004.vercel.app/arc/)
- [Arc advertiser dashboard](https://axp-6ecvsn0yy-lucario004.vercel.app/arc/advertiser-dashboard/)
- [Arc example chat](https://axp-6ecvsn0yy-lucario004.vercel.app/arc/publisher-demo/)
- [Configuration-only health](https://axp-6ecvsn0yy-lucario004.vercel.app/api/arc/health)

All three pages and the isolated `/api/arc` backend were checked anonymously.
The user removed Preview protection. `/arc/` is the presentation/evidence entry;
the dashboard and chat are interactive applications. Ordinary `/api/product` and
account-owned APIs keep their original configuration.

## Try the product

Open **StackPilot · Try Arc Nanopayments** in the dashboard, then open the Arc
chat and choose the developer-tools suggestion. The independent fixture answer
and separate Sponsored card lead to a signed insertion receipt. Open View
internals → Payment to submit the exact saved payment and check batch status.
The dashboard reports the same durable charges after reloads and cold starts.

The human approved one additional 0.020 test-USDC allocation, a 0.010 campaign
cap and 0.001 per placement. Its funding transactions finalized and Gateway
funding was observed. The original campaign is paused with its four accepted
0.002 deliveries preserved. Both campaigns share the unchanged global 0.016
accepted-obligation ceiling; at the recorded handoff this left 0.008 of usable
new spend. Read current state before another take; do not promise ten remaining
placements from the campaign cap alone.

Buyer judgments and answers are labelled fixtures. Auction, DOM insertion,
Ed25519 receipts, accounting, exact EIP-3009 authorizations and Arc/Gateway
payments are actual. No paid provider credentials are passed into this demo.
Gateway acceptance, batch finality and wallet withdrawal remain distinct.

## Isolation and deployment guard

The backend requires all of the following:

- Vercel environment `preview`.
- Git branch `feature/arc-integration`.
- Deployment-specific `AXP_ARC_PREVIEW_ENABLED=1`.
- Deployment-specific `AXP_ARC_PREVIEW_COMMIT` exactly matching the deployment SHA.

Activation flags are **not shared Preview or Production variables**. Only the
Arc wallet and dedicated encryption key are stored as sensitive variables scoped
to this feature branch. Automatic Git previews remain disabled unless explicitly
activated. The private Blob namespace is `axp:product:arc-mumbai-preview-v1`,
separate from the production demo. Neither Solana nor Tempo signing is enabled
in this Arc workspace. Production's original wallet identities and encryption
settings were not changed.

The `axp.one` alias was independently confirmed on original deployment
`dpl_FbPgmunyqMgfnWf565ooxAu7zo26`; `main` remained at
`88c9bfbb9ce5d3b532e1a4bff2a276d4c1c1baa4`. No promotion occurred.

## Preserved state handoff

The original local writer was stopped before its state moved into the local
encrypted executor. After recording, that writer was stopped before cloud
migration. The exact encrypted financial and organic shards were imported using
a separately guarded, HMAC-authenticated import-only deployment. Both snapshots
are authenticated before either can be written. Existing target records are never
overwritten; exact replay is idempotent. Import mode rejects ordinary demo traffic.
Migration performed zero model calls, signatures, deposits or transfers.

Arc keys stayed outside snapshots. `HOSTED_OWNER` and `CLOUD_OWNER` markers fence
the archived local writers. **Do not remove those markers, reset state, or restart
a local financial writer against either archive.** `npm run arc:hosted-local` was
the local review command; that funded workspace is now cloud-owned.

`export-hosted-import.mjs` creates only ignored encrypted body/proof files and
refuses export while the local server listens. The operator import endpoint is
available only in explicit import mode on the pinned Preview commit. Never put
its proof, wallet, environment or encrypted private snapshots in Git or Studio.

## Validation

The local hosted review passed 845/853 repository tests (eight optional skips),
91 UI tests, both typechecks, SDK parity and production UI build. Subsequent
import/Arc/hosted tests passed 31 checks, including authenticated import, replay,
no-overwrite and production/other-commit refusal. Packaged checks passed both
interactive pages and 45 referenced assets. The pinned Circle SDK is bundled
without shipping its source/types/tests; the complete function is 167.8 MB.

[Hosted evidence](../../artifacts/arc/hosted-acceptance.json) is an allowlisted
public API observation, separate from the original local snapshots. Recheck it:

```sh
node scripts/arc/verify-evidence.mjs artifacts/arc/hosted-acceptance.json
```

The verifier reads only public RPC/Gateway data and receipt signatures. It creates
no signatures or broadcasts. Newer Gateway finality may exceed the frozen export.

The final redesigned deployment is pinned to source `3579a57`. A fresh clean
review passed 828/854 repository tests (26 optional skips), 91 UI tests and all
review checks; the separately installed official SDK enabled 16/16 Arc tests.
All four preserved payments now verify batch-completed and the hosted ledger
was reconciled by lookup only. See the [final public snapshot](../../artifacts/arc/hosted-finalized.json)
and [publication checks](../../artifacts/arc/hosted-preview-verification.json).
