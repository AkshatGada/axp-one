# AXP clean-room integration log

## Handoff state — 2026-10-11

Focused local integration implemented. Final existing-suite run: 23 passed,
0 failed, 0 skipped; Node v25.5.0, exit 0. No deployment, installs, provider calls,
wallet actions, commits, or operator ledger mutations were performed. All
verification-owned servers are stopped. The operator's pre-existing exchange was
not stopped or modified. Main owns connected real-HTTP/browser verification and
reviewer follow-up. No further optional tests or refactoring were added after the
finalization request.

## Information and edit boundaries

Read the entire supplied integrator brief, supplied app/README/tests, and public
publisher SDK README, package metadata, types and source. Read only the operator's
public publisher config endpoint; credentials were loaded through Node's env-file
mechanism, never printed or copied into the app. No internal exchange code/tests,
SDK example files, other docs, baseline-app, other repositories, reference
integrations or memory files were read. Every file edit used apply_patch and was
inside this app; narrowly escalated execution was needed for new directories and
loopback sockets. The upstream SDK was not edited.

## Installation and design choices

- Installed source-distributed SDK 0.1.0 by copying its nine permitted public files
  unchanged into `vendor/publisher-sdk`. No package-manager install, npm registry,
  symlink, build, or dependency download. Explicit local entry-point imports make
  the app self-contained; React is not used. Byte comparison verified all nine
  copies against their permitted source files.
- Organic provider and its input interface are unchanged. Ads start in parallel
  server-side, but `/api/chat` waits only for the organic answer. The browser loads
  the separate placement after displaying the reply. Only an opted-in current
  message is shared; full history and advertiser context never go to the ad input
  or organic input respectively. Opt-in is an integration privacy boundary, not a
  new provider or product feature. Long/unsupported messages skip ads unchanged.
- Random server-owned exchange session/turn IDs; browser submission nonce is only
  a deduplication key. Identical retries reuse the stored turn; changed canonical
  input cannot repurchase under the same nonce. Organic retries still work.
- Cookie-bound one-hour in-memory sessions, CSRF and exact same-origin checks
  anchored to the listening socket/allowlisted Host. Server stores original
  award/token/creative and verifies ownership before receipt/failure forwarding.
  Browser-selected amounts, recipients and signing inputs are not forwarded.
- Exact SDK Sponsored card is appended separately, then observed using the public
  browser helper before acknowledgement. Creative and creativeHash are not
  rewritten. The backend forwards the stored capability with its private key.
- No automatic opportunity or receipt retries. Receipt uncertainty offers one
  explicit same-award retry, relying on the exchange's documented one-charge
  replay semantics. Once any receipt is attempted, failure reporting is blocked
  conservatively; an accepted-but-lost receipt must not be erased or repurchased.
- New chat, provider failure and disconnected organic response retire/cancel
  undelivered turns; known/late awards get a best-effort fail request. Release
  failure remains unconfirmed and falls back to exchange expiry. Unknown awards
  after a transport deadline cannot be explicitly released without an award ID.
- Only the operator loopback exchange is accepted by the launcher. Placement
  rendering fails closed if award financial metadata is not synthetic. Explicit
  receipt financial metadata takes precedence; when absent, the already-bound
  award's financial metadata is used, as receipt metadata is optional in public
  types. Accepted delivery is labelled synthetic accrued test credits, not payout,
  human attention, organic endorsement or real-provider judgment.

## Public configuration observed

`curl --fail --silent --show-error --max-time 5 http://127.0.0.1:3470/api/product/publisher/config`

The sandboxed attempt could not connect; the same read-only command succeeded
with narrow loopback permission. Observed publisher `axp-demo-publisher`, placement
`chat-sponsored-card`, `financialMode: synthetic`, payments signing disabled,
engine `execution: fixture`, and organic `execution: unavailable`. This is public
configuration evidence only, not an award/receipt or proof of provider quality.
No opportunity, render or failure POST was sent to the operator exchange.

## Exact launcher

From this app directory:

```sh
npm run start:axp
```

Package script: `node --env-file=../../../local-state/sdk-cleanroom/integrator.env server.js`.
It requires the existing operator env file; Node's existing process environment
overrides env-file values. No key appears in a command argument, browser response,
log or committed file. Default UI URL: `http://127.0.0.1:3471`.

The existing launcher smoke check spawned this same Node/env-file command with
`PORT=3479`, fetched the app HTML, initialized its local session, and submitted an
organic-only fixture message (no axp metadata). Assertions passed: HTML 200,
session enabled, organic 200 with fixture label and no placement. Child stopped
with SIGTERM in finally; a subsequent fetch confirmed its listener was closed.
This tested credential loading and local startup only, not exchange authentication
or live placement. No further connected check belongs to this handoff.

## Tests and results

Exact test command, working directory this app:

```sh
npm test
```

It expands to `node --test`. Final run: 23 tests, 23 pass, 0 fail, 0 cancelled,
0 skipped, exit 0, duration 255.757917 ms on Node v25.5.0. Six original chat tests
remain unchanged; twelve new HTTP/SDK integration tests and five app browser
controller tests use only injected exchange mocks and a small DOM fixture. All
test-created loopback HTTP servers close through test cleanup. External network
and operator credentials are unnecessary. Coverage includes organic independence,
stable retries, no-fill/network errors/opportunity deadlines, receipt network loss
and deadlines, optional receipt financial metadata, CSRF/Host/Origin/ownership,
exact copy/disclosure, failed insertion/release, one-charge replay, late awards,
provider failure, expired sessions/awards, synthetic-only rendering, and private
asset boundaries.

Initial sandbox `npm test` failed on EPERM binding loopback (1 pass, 17 fail), not
application assertions. With socket permission the first suite exposed a test
harness issue: Node fetch ignored a forged Host, so that assertion now uses raw
HTTP to genuinely test rebinding rejection. Subsequent and final suites pass.

SDK byte-identity check: Node `readFileSync` compared the nine permitted source
files with their vendored copies using `Buffer.equals`; all nine matched. Runtime
SHA-256 anchors:

- index.mjs: `6a467d911c3751d958a9075f0caf23b45e189cf856744eb727d48a1ba7efd79b`
- browser.mjs: `60dcc02502d4451f142f1e158f956396dd9b26d3e6efdf889936f3b6047444e9`

## Ambiguities, questions and limitations

1. Public Award types define integer `expiresAt` without documenting units. The
   app assumes Unix epoch milliseconds; mocks exercise that assumption. Main
   should verify it on the connected path. No internal implementation was read to
   resolve this contract gap.
2. Public config has no typed/schema-versioned fixture provenance contract in the
   selected SDK types. This exercise uses the operator's explicit fixture/synthetic
   setup and observed public config. The UI is labelled accordingly, not represented
   as live Jev or DeepSeek output. No runtime call to an organic exchange endpoint.
3. Opportunity timeout may leave a reservation whose ID was never received. There
   is no documented public lookup/cancel-by-turn method in the SDK. No invented
   endpoint or internal repair: rely on exchange expiry. Same-turn canonical
   identity is preserved while in memory; no automatic retry or new-ID repurchase.
4. Receipt idempotency is documented but there is no receipt-lookup API in this
   SDK. Retry forwards the same award/token/observation; mocked one-charge replay
   is verified, but connected ledger acceptance/replay remains unverified here.
5. Sessions and retry bindings are memory-only: restart, one-hour expiry, refresh,
   new chat or competing tabs sharing the cookie may remove reconciliation access.
   Up to 100 sessions and 100 submissions/session; no durable recovery, background
   reconciliation, authentication platform or production hardening was added.
   Uncertain receipts are never auto-failed on session retirement.
6. The DOM fixture verifies app orchestration and helper-visible attributes, not
   actual browser layout, computed CSS, screen readers, human attention or clicks.
   Real-browser and connected operator checks remain Main's responsibility.
7. Input privacy cannot be inferred reliably from free text. Opt-in warns against
   private/sensitive content; only validated current text is shared, with no raw
   history, persistent identifiers, enrichment or external redaction provider.
8. A release failure or unknown receipt is explicitly unconfirmed, not silently
   repaired. Network failure recovery outside the retained binding is an operator
   concern. No SDK edits, payment actions or undocumented routes were introduced.

## Exact changed-file inventory (relative to this app)

Modified:

- README.md
- package.json
- server.js
- public/app.js
- public/index.html
- public/style.css

Added:

- INTEGRATION_LOG.md
- axp-integration.js
- public/sponsorship.js
- test/integration.test.js
- test/browser-integration.test.js
- vendor/publisher-sdk/README.md
- vendor/publisher-sdk/package.json
- vendor/publisher-sdk/index.mjs
- vendor/publisher-sdk/index.d.mts
- vendor/publisher-sdk/browser.mjs
- vendor/publisher-sdk/browser.d.mts
- vendor/publisher-sdk/financial.mjs
- vendor/publisher-sdk/financial.d.mts
- vendor/publisher-sdk/react.tsx

Unchanged: answer-provider.js and test/server.test.js. No files outside this app
were edited. No verification server remains running.
