# Local publisher integration pilot

An ordinary fixture chat with a separately disclosed AXP Sponsored slot. The
baseline `answer-provider.js` is unchanged: `answer({ messages }): Promise<string>`.
Answers are deterministic fixtures, not live models. Ads use the operator's local
synthetic fixture exchange; accepted insertion is not human attention or payment finality.

## Install and launch

Requires **Node 22.18.0+** (the SDK minimum; tested on **25.5.0**) and npm. The app
uses built-in `node:sqlite`, `fetch` and `process.loadEnvFile`; SQLite may emit an
experimental warning. From this repository-local app directory:

```sh
cd /Users/akshat/agentic-dsp-sdk-cleanroom/experiments/sdk-pilot/app
npm ci --offline --ignore-scripts --no-audit --no-fund --cache .state/npm-cache
npm start
```

Dependency and lockfile reference only the supplied repository-local, committable
`../../../artifacts/sdk-pilot/axp-publisher-sdk-0.2.0.tgz`. These changes/artifact
are not claimed committed. Final archive SHA256:
`31d8bcfa13ae12b316f847687b3fa0a3ebe05d6ccddfb5ced759e824efdae83b`.

Open http://127.0.0.1:3473. No launch environment is needed. The CLI privately loads
`../../../local-state/sdk-pilot/integrator.env` on the server. Never print or commit
that file or copy its key into client code. The supplied fixture exchange must
already be running at http://127.0.0.1:3472/api/product. No remote exchange is allowed.
Startup itself submits no opportunity or acknowledgment.

Optional server-only overrides: `PORT`, `AXP_EXCHANGE_URL` (HTTP loopback only),
`PILOT_STORE` (use a private app-local path). Do not set `PILOT_TRANSPORT_FAULT` for
ordinary use; it is an opt-in lost/malformed-response test decorator.

## Use and recovery

- Sharing is unchecked by default and resets after each submission. Explicit opt-in
  shares only this current question for a developer-tool card, never organic history.
  Questions over 1,200 characters are not shared or truncated; the organic limit is 1,600.
- The independent answer completes without awaiting ads. No-fill or unavailable ads
  leave the answer working. Only exact, connected, visibly disclosed SDK cards are
  acknowledged. Sponsored copy never enters organic provider input or history.
- **Recover existing outcome** uses SDK lookups for the saved identities. Unknown,
  pending and missing outcomes remain explicit, without a replacement purchase.
  A recovered still-reserved award may be rendered and acknowledged as that same award.
- SQLite state defaults to `.state/pilot.sqlite`, including server-owned session/turn
  IDs, cookie ownership, canonical input, awards/scoped tokens and receipts/charge IDs.
  Refresh/restart restores the conversation using its HttpOnly session cookie.
  Accepted historical cards render without a token or another acknowledgment.
- **New chat** creates another conversation; it does not delete old state or reset
  exchange spend. Retrying an uncertain submission preserves its request identity.

`.state/` and `node_modules/` are ignored. State contains private prompts and delivery
capabilities: preserve it for recovery, do not expose, commit or reset it. This is a
single-process loopback pilot, not production authentication or multi-process storage.
At most 21 admitted turns per conversation; answers are plain text, at most 4,000 characters.

## Verification

```sh
npm test
npm run test:http
```

Completed runs: **29/29** targeted server/DOM-adapter tests and **5/5** actual fixture
HTTP tests. The second command uses isolated app processes on port 3474, preserves
3473, and shares the supplied 3472 exchange. **Serialize connected test runs.** A fresh
group adds five initial opportunities and three synthetic charges (9,000 units);
recovery/retry adds no replacement opportunities, decisions or charges. No live models,
wallets or payments are invoked. Tests retain private app-local runtime DBs.

See `TEST_OUTPUT.txt` for captured execution output and `INTEGRATION_REPORT.md` for
independent friction findings, exact evidence counts, and observed versus mocked limits.
The DOM adapter is not browser/layout proof; Main separately performed browser and
restart acceptance. This fresh same-model-family session is not unbiased certification.
