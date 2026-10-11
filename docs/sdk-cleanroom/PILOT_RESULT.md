# SDK pilot gap closure — 11 October 2026

Worktree: `/Users/akshat/agentic-dsp-sdk-cleanroom`.
Branch: `codex/sdk-cleanroom-integration`, base `8053135`.
Changes are local and uncommitted. No package publication, push or deployment.
The active marketing checkout and the original clean-room experiment are preserved.

## Fixes that matter to an integrating AI application

1. **Recover instead of repurchase.** Authenticated read-only opportunity and
   delivery lookups recover the original outcome and immutable receipt. Request
   admission is durable before decision dispatch. Interrupted, unresolved
   admissions remain `unknown`; restart never silently invokes another decision.
2. **Only cache a valid accepted receipt.** The browser and server share award,
   creative, price, charge and supplied financial-mode binding checks. Malformed
   HTTP 200 responses are rejected and evicted. This validates shape/binding,
   not independent cryptographic authenticity or settlement finality.
3. **A usable public contract.** SDK 0.2.0 documents current-question consent,
   1,200-character bounds, canonical restriction ordering, epoch-millisecond
   expiry, stable API error codes, timeout uncertainty and recovery ownership.
   It is an installable local package, not a published npm release.
4. **Operator provisioned access.** Scoped key issue/revoke/rotate persists hashed
   credentials and preserves existing delivery-token bindings. Dedicated
   publisher-only endpoints hide demo dashboard/state/mutation routes. One
   publisher per separate workspace is explicit; shared-inventory multi-tenancy
   and independent payout onboarding are not implemented by this change.
5. **Durable application example.** A fresh integrator uses the public package in
   a separate ordinary chat app with server-owned session/turn identities,
   persistent awards/receipts and an independent answer-provider boundary.

## Fresh integration method

Fermat received the frozen ordinary app, the public packaged SDK/documentation,
an integration brief and an operator-provisioned loopback endpoint. It did not
receive the earlier integrated app, earlier findings, backend source or internal
payment code. Main supplied environment coordination and two targeted review
notes: bind known financial mode in server recovery, and retain a historical
accepted card without acknowledging it again. This is limited-context role
separation in the same model family, not an unbiased external certification.

The original deterministic answer-provider source remains byte-for-byte intact.
All exchange decisions and organic answers in this exercise are explicitly
fixtures. Actual HTTP, database recovery and browser insertion were tested, but
there were zero paid model calls, wallet operations or network payments.

## Main's actual browser observations

At `http://127.0.0.1:3473/`:

- Sharing off answered normally and created zero exchange requests or charges.
- Sharing the developer-tool question rendered exact approved StackPilot text,
  a literal Sponsored label and the approved destination in a separate card.
- The unrelated mobile-wallet question returned `no_fill`, kept its organic
  answer and did not add a charge.
- A controlled app stop/relaunch and browser reload preserved answers and the
  original receipt. The exchange remained at one fixture decision call, one
  receipt and one charge of **3,000 synthetic base units**. Nothing settled.
- No console error/warning was observed during these browser checks.
- The bounded recheck also restored the accepted Sponsored card as historical
  display after restart, without a delivery token or another acknowledgement.
  The original chat retained exactly two requests and one charge of 3,000 units.

See `artifacts/sdk-pilot/browser-checks.json` for exact correlations and
`artifacts/sdk-pilot/browser-accepted.png` for the original accepted insertion,
and `browser-restart.png` for the restored history.
Negative hidden/detached/altered-card checks use DOM fixtures, not manual browser
observations. Lost-response coverage is separately identified in the agent report.

## Verification

Final combined verification and fresh integration findings are recorded in
`artifacts/sdk-pilot/verification.json` and
`experiments/sdk-pilot/app/INTEGRATION_REPORT.md`.

| Scope | Final result | Evidence |
| --- | --- | --- |
| Repository regression | 502 passed, 11 skipped (513 total) | Optional native SDK fixtures skipped |
| Preserved clean-room experiment | 30 passed | Original baseline and vendored SDK preserved |
| Fresh integration | 34 passed | 29 app/DOM checks and 5 opt-in actual HTTP cases |

That is **566 passed, 11 skipped, zero failures** across 577 checks. The focused SDK
and product-recovery run passed **50/50** with actual loopback HTTP enabled.
Those 50 are included in the repository suite, not additional distinct tests.

The fresh agent's five connected cases forward real exchange HTTP responses and
then deliberately lose/corrupt them. Actual app process restarts recovered the
original opportunity and accepted charge, with counters unchanged during recovery.
The browser-helper malformed-response case uses a DOM adapter plus actual HTTP;
it does not substitute for Main's separate interactive browser checks. These
serialized reruns add new initial synthetic test sessions, not duplicate charges
on the same recovered turn. See the agent report for its dated counter snapshot.

Final package: `artifacts/sdk-pilot/axp-publisher-sdk-0.2.0.tgz`.
SHA256: `31d8bcfa13ae12b316f847687b3fa0a3ebe05d6ccddfb5ced759e824efdae83b`.
Main compared the fresh app's installed public runtime/declaration files with
the final SDK candidate. Earlier unreleased candidate hashes are superseded.

## Reproduce and boundaries

Follow `PILOT_OPERATOR.md` for two-terminal fixture startup, local key management
and the independent app's README for its integration and failure scenarios.
Run `node experiments/sdk-pilot/verify.mjs --http` from the worktree root for the
combined repository, preserved experiment and fresh-integration checks.

A manually provisioned Node/plain-browser platform can now exercise the complete
SDK integration and reconciliation contract locally. Deploying these new routes,
configuring a real publisher's endpoint/payee and publishing a supported package
remain explicit release/integration steps. This does not certify every framework,
React build pipeline, streaming UI, mainnet billing or independent viewability.
An accepted insertion is not attention, endorsement, conversion or finalized payout.
