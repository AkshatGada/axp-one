# Arc Studio provenance and review

Project: [AXP Arc Nanopayments](https://studio.arc.io/app/0c07e997-5564-4b38-94f9-099ea3e95393)

- App: `0c07e997-5564-4b38-94f9-099ea3e95393`
- Thread: `0261dd3b-d6b0-4a63-b4c1-fa0b52538762`
- CLI session: `axp-arc-mumbai`; CLI version 1.2.2.
- Only repository input: `docs/arc/INTEGRATION_SPEC.md`, plus plain-language
  requirements. No repository clone, keys, environment, SQLite or private data.
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
specified Gateway Nanopayments. Studio's deployment listing was empty after the
scope correction; custom escrow output is excluded from this integration.

## Judge access

The workspace URL above identifies the real Studio project. A logged-in owner's
workspace is not proof of anonymous judge access. Verify its Share setting and
open the share URL from a signed-out browser before submission. The demo must show
Studio's chat, generated SDK/backend code and preview, alongside the integrated
AXP advertiser/chat flow. Record the final share URL and access check in the
submission checklist.
