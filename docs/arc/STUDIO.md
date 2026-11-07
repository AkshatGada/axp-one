# Arc Studio provenance and review

Project: [AXP Arc Nanopayments](https://studio.arc.io/app/0c07e997-5564-4b38-94f9-099ea3e95393)

- App: `0c07e997-5564-4b38-94f9-099ea3e95393`
- Thread: `0261dd3b-d6b0-4a63-b4c1-fa0b52538762`
- CLI session: `axp-arc-mumbai`; CLI version 1.2.2.
- Initial input: `docs/arc/INTEGRATION_SPEC.md` and plain-language requirements.
  Later selected public protocol source, sanitized evidence and the diagram/runbook
  were supplied for review and the read-only evidence viewer. No repository clone,
  keys, environment, SQLite or private payment payloads were uploaded.
- Studio produced a working reference app, Express backend and
  `sdk/axp-arc-x402/` nanopayments module using the official Circle SDK 4.0.0.
- Studio's `requirements.ts` supplies the requirement/challenge construction,
  authorization-to-delivery binding and exact-price validation used in
  `packages/arc/protocol.mjs`; its `reconcile.ts` supplies transfer stage semantics.
  The local transport consumes this module for every signed delivery payment.

## Review decisions

Downloaded selected `sdk/**`, `server/**`, `src/**`, tests and documentation into
a temporary review directory before adopting source. No environment files or
private sandbox state were retrieved. The existing AXP auction and receipt ledger
remain authoritative; Studio's illustrative delivery creation does not replace
actual AXP insertion acknowledgements.

The reviewed adaptation adds frozen chain/asset/payer/payee checks, exact matching
of the full accepted requirements, resource binding, private authorization
storage, durable before-send checkpoints, original-nonce recovery, full pagination
and RPC checks for reported batch transactions. It keeps Studio's exact per-charge
Gateway authorization flow. The signing domain/types come directly from the
unmodified official SDK. An extra day of authorization validity allows a human
to submit saved authorizations later while honoring Gateway's seven-day minimum.

The reference app's public debug trace included payment signatures, its fund
movement APIs lacked AXP's CSRF authority, and its high-level deposit/withdraw
methods did not checkpoint signed bytes before sending. Those paths were not
adopted. Local integration uses existing AXP API authority, exact persisted native
bytes and redacted public projections instead. Transfer amounts are atomic units
according to the current official API schema. Only `completed` plus a successful
RPC-verified batch receipt advances local finalized payment totals; `confirmed`
is shown separately and does not trigger withdrawal.

No custom escrow is required: the deployed Circle Gateway contracts provide the
payment stack. The first Studio prompt explored a custom escrow before the user
specified Gateway Nanopayments. A deployment listing initially returned empty while the first turn was still
running. The completed result later disclosed one already-deployed, unused testnet
escrow at `0x1ea0491f04873b012c0c19bf5da96030bd8d1c05`, transaction
`0x624283d89bfea4ee7edb4533152d7bb5acf91f7ef0bb0ae3c16642e4dbb81e16`.
No AXP funds are sent to it. Its source is archived in Studio and excluded from
this repository's integration. Verify its receipt/gas separately; do not treat
that deployment as nanopayment proof.

Studio first reported 32 passing offline adapter tests. After adding the final
evidence viewer it reported **44 tests / 227 assertions**, clean lint and typecheck.
These are Studio-reported results; they were not independently rerun locally.
Its own funded payment/withdrawal test did not run: its faucet role was denied. Those claims
remain distinct from the locally verified AXP tests and funded run.

## Judge access

The workspace URL above identifies the real Studio project. It opens for the
logged-in owner, but redirected to Studio's root in a private Safari window.
**Anonymous judge access is not verified.** Studio's Share menu offered hosting
connections, not a proven public workspace link. The auto-generated workspace
title still refers to the earlier escrow exploration; the preview identifies AXP
Nanopayments and explicitly excludes that escrow from payment evidence.

A reviewed static companion is preserved at `tooling/arc-preview`. It uses the
Studio-generated evidence frontend, with wallet providers, development tracing,
backend and signing routes excluded. It shows the final recorded batch, earlier
pending snapshot, architecture and public read-only Gateway status checks.
Its npm lockfile, typecheck and Vite build make the later deployment reproducible.
It contains only public source/evidence. It is not a hosted live AXP backend.

The human initially deferred a separate Vercel project, then authorized pushing
this branch to use the repository's existing Vercel Git integration. The site
build includes this companion at `/arc/`, using a separate `/arc/assets/` namespace.
It does not upload or activate the funded Arc workspace. No new Vercel connection
or cloud environment changes are needed. The preview's final URL and access
results belong in the submission checklist.

A public companion URL does not by itself establish public access to Studio's
source workspace; confirm the prize's accepted sharing method. Show Studio's chat,
generated SDK/backend code and preview in the video, alongside the integrated
AXP advertiser/chat flow. Record the final judge-openable Studio URL and access
check in the submission checklist.
