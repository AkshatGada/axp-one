# Fresh limited-context integration report

2026-10-11. Practical local integration, not production hardening. This is a fresh
limited-context session of the same model family, **not unbiased external certification**.
I used only AGENTS.md, the pilot brief, frozen baseline, public packaged SDK and supplied
loopback config/evidence. I did not read backend implementation, previous integrations,
internal reviews or prior experiment results. No agents, SDK/backend edits, commits,
pushes, deployments, live models, wallets or payments.

## Package and app

Repository-local/committable (not claimed committed) SDK tarball 0.2.0 SHA256:
`31d8bcfa13ae12b316f847687b3fa0a3ebe05d6ccddfb5ced759e824efdae83b`.
Installed public files and lockfile integrity match this final candidate. An earlier
operator-supplied hash was superseded before acceptance. Offline install disables scripts.
Node requirement is 22.18.0+, tested on 25.5.0; README documents install, private envfile,
port 3473, built-in SQLite and durable private `.state/`.

Independent `answer({ messages })` source remains byte-for-byte baseline. Ads never
block the answer or enter organic history. Sharing is explicit per current question,
defaults off, and resets; over-1,200-character questions remain organic without truncation.
SQLite owns session/turn/request admission, canonical input, award/token and receipt/charge.
Recovery uses only public SDK lookups, retaining unknown/pending/not-found states without
replacement purchase. Receipt checks bind owner, award, token, creative, price and mode.
Mode binding was added following an explicit operator review note, not an independent
SDK-defect finding. Accepted historical cards expose no token and never re-acknowledge.

## Executed evidence

- **29/29 targeted tests passed**, zero skips. Real ephemeral app HTTP servers with
  mocked publisher responses, plus a small DOM adapter: answer/ad independence, organic
  history isolation, consent/length, admission deduplication/conflict, no-fill/unavailable
  transport, unknown/pending/not-found, ownership/CSRF/token, exact/hidden/detached/rewritten
  insertion, malformed fulfilled receipt retry, terminal awards, receipt bindings and
  private asset boundaries. The DOM adapter is not a browser/layout engine.
- **5/5 actual HTTP tests passed**, zero skips, against 3472 with isolated app processes
  on 3474. Lost opportunity, lost accepted receipt and malformed accepted HTTP200 responses
  were forwarded to the actual exchange before loss/corruption. Actual SIGTERM/new-process
  APP restarts recovered original outcomes through SDK lookup. Evidence counters were
  unchanged during recovery: no new opportunity, decision, charge or receipt.
- The fourth connected case rejected a malformed browser fulfilled response and explicitly
  retried the same app-saved receipt without another exchange charge. Its DOM is an adapter.
  The fifth observed sharing-off zero requests, actual unrelated-question no-fill and
  private assets/routes; server-key byte checks passed without printing credentials.
- My connected group started at **2 opportunities / 1 fixture decision / 1 award /
  1 charge+receipt / 3,000 synthetic units** (Main's preceding browser QA). It ended at
  **7 / 5 / 5 / 4 / 12,000** respectively: **+5 initial opportunities, +4 initial decisions,
  +4 awards, +3 charges = 9,000 synthetic units**. Paid-provider calls and network payments
  remained **zero**. Later reruns have their own initial work; these are dated counts.

Full captured output and nonsecret recovery IDs: [TEST_OUTPUT.txt](TEST_OUTPUT.txt).
Main separately reported real-browser sharing-off/opt-in/no-fill, exact Sponsored copy,
no console errors, restart survival and the historical-card recheck with the same original
3,000-unit charge. Main's final combined harness reportedly passed repository 502 tests
(11 skipped), original integration 30 tests, and fresh integration 34/34 including the
five connected cases. Those are Main's observations, not tests executed by this session.

## My integration friction findings

1. The card/request path is small; durable admission, ownership and recovery are most
   of the app work. Public docs state those obligations clearly, but the tarball lacks
   a standalone durable example. A copyable state-machine example would reduce effort.
2. Structural SDK validation and full app-known bindings are separate. The exported
   receipt validator is useful; integrations must supply saved price/mode on both
   direct acknowledgment and recovery, not merely trust HTTP200 or accepted status.
3. A fail-open network error is not proof of no purchase. Real lost HTTP left a saved
   reservation behind an app `unknown`; the documented lookup contract recovered it.
4. An unbundled app needs deliberate browser-safe module routes. Three allowlisted SDK
   modules worked without exposing the server entry point, private key or financial code.
5. Malformed fulfilled responses correctly do not poison the helper's success cache;
   persisted receipt identity, not in-memory cache, prevents another charge after restart.

Main found accepted cards disappearing on reload in my initial projection. The narrow
historical-display correction is implemented and Main reports the recheck passed.

## Limits

Synthetic fixture decisions and deterministic answers do not establish real model quality,
targeting performance, human viewability or payment finality. Receipts are structurally
validated publisher insertion assertions, not independently verified signatures. Persistent
exchange unknown/pending/not-found, unavailable transport and expired/failed states were
mocked; local unknown after actual lost HTTP was observed and resolved. Restarts were orderly
process exits, not kill-9/power failure/corrupt-disk or multi-process tests. One original lost-
opportunity award was deliberately left unrendered, with no failure/release or replacement
purchase; exchange expiry remains its responsibility. This is a single-process loopback pilot.

## Files changed

Only `experiments/sdk-pilot/app/`: `.gitignore`, `package.json`, `package-lock.json`,
`README.md`, `INTEGRATION_REPORT.md`, `TEST_OUTPUT.txt`, `server.js`, `store.js`,
`fault-fetch.js`, unchanged copied `answer-provider.js`, `public/{app.js,index.html,style.css}`,
`test/{dom.js,helpers.js,browser.test.js,server.test.js,http.test.js}`. Private generated
`node_modules/` and `.state/` are ignored. Main's 3473 app is left running. Source is frozen;
no further tests or features were added after the finalization request.
