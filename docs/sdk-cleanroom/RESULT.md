# Clean-room publisher integration result

## Outcome

A fresh agent integrated the unmodified, publicly documented source SDK into a
chat app built by a different fresh agent without an AXP brief. The connected
app successfully requested an award, rendered an exact separate Sponsored card,
and acknowledged it through its own backend to the actual local product API.
The local ledger contains one accepted charge of **3,000 synthetic base units**.
This is a successful integration exercise, not production certification.

Branch: `codex/sdk-cleanroom-integration`, base `8053135`.
Worktree: `/Users/akshat/agentic-dsp-sdk-cleanroom`.
The active Claude landing-page checkout was not edited. Nothing was pushed,
deployed, or committed by this exercise; changes are local to this worktree.

## What was separated

1. Kuhn built the conventional chat app in a temporary directory, with no AXP
   context. Its nine-file baseline and six original tests are preserved.
2. Gibbs received only that app, an integration brief, public SDK source/docs and
   an operator-provisioned local environment file. It copied nine public SDK files
   byte-for-byte; no internal reference application or exchange implementation
   was used, and no SDK fix was supplied during integration.
3. Main provided an isolated fixture exchange, then ran connected HTTP tests and
   the actual browser checks. Hooke prepared its acceptance checklist before
   inspecting the integration, then reviewed the frozen result separately.

Recorded agent turn durations: app build **296,555 ms**; integration **931,620 ms**.
These include reading, coding, environment issues, tests and documentation. They
are not human integration-time estimates or model-performance benchmarks. Main
sent scope/environment reminders, not implementation guidance. Fresh sessions
and constrained instructions reduce shared context; they are not externally
unbiased, independently operated or cross-model evaluation.

## Actual connected browser observations

The browser at `http://127.0.0.1:3471/` opted into sharing the current question:

> Recommend a developer tool to debug a TypeScript API.

It received a labelled deterministic organic fixture answer and a separate exact
StackPilot Sponsored card. The card's approved HTTPS link and
`sponsored noopener noreferrer` attributes were observed. Accepted delivery was
labelled accrued synthetic credits, not payout or attention.

- Opportunity: `opp-ddf55c595e61d2ecd9c7cb01`.
- Award: `award-e738da4e-d2d8-4388-95fa-a736dc513b9f`.
- Charge: `charge-award-e738da4e-d2d8-4388-95fa-a736dc513b9f`.
- Accepted / authorized: **3,000 / 3,000 synthetic base units**.
- Reserved / settled: **0 / 0**.

The follow-up “Compare hardware wallets for Ethereum and Solana.” returned actual
policy no-fill from the local API, with no second card or charge. The fixture
answer preserved the prior user message without introducing sponsor copy.
No browser error/warning was observed. A scrollable log initially clipped part of
the newly appended card; keyboard scrolling revealed the full insertion. No
viewport-impression or human-attention claim follows from acceptance.

Public evidence: `artifacts/sdk-cleanroom/connected-evidence.json`.
Screenshot: `artifacts/sdk-cleanroom/browser-accepted.jpg`.
Source manifests: `app-baseline.json`, `app-integrated.json`, `sdk-before.json`.

## Verification

| Scope | Result | Evidence type |
| --- | --- | --- |
| Frozen ordinary app | 6 passed | Original fixture chat tests, independently rerun |
| Integrated app | 23 passed | Includes original six; HTTP transport and DOM fixtures |
| New connected/harness/source checks | 7 passed | Actual app/product HTTP ledger, restart/replay, source hashes |
| Combined clean-room suite | 30 passed | No skipped checks |
| Existing SDK suite | 26 passed | Final run enabled actual local HTTP for connected SDK cases |
| Existing repository suite | 477 passed, 11 skipped | 488 total; optional native SDK fixtures skipped |
| Browser | Award + no-fill passed | Actual DOM and correlated local ledger |

The 26 SDK checks are already part of the repository suite; do not sum these rows
as distinct tests. The initial restricted repository run failed on loopback
`listen EPERM`; the successful reruns had scoped socket permission.

Connected tests establish same-charge duplicate replay, failed insertion release,
no-fill, actual SDK timeout/error fail-open behavior and organic input separation.
Exchange restart tests reuse the original award, charge and durable decision
admission with zero new fixture calls. Missing/hidden disclosure, altered or
detached DOM, uncertainty and session ownership checks use explicitly labelled
DOM/transport fixtures where stated, not a real browser for every negative case.

## What this does not establish

- Organic answers and advertiser judgments are **fixtures**. No genuine LLM/Jev
  answer/decision quality was tested. Actual HTTP and ledger execution do not
  make model responses live.
- No funds, blockchain payments, wallets, upstream DBs or hosted AXP workspace
  were used. Synthetic authorization is not native settlement.
- This app's session/turn/retry maps are memory-only. App restart, refresh,
  session expiry or cookie-sharing tabs can remove reconciliation access. Durable
  exchange replay passed; durable end-user app recovery is not implemented here.
- The SDK is source-distributed, not an npm release. Operator key provisioning
  remains necessary. Only this Node/plain-browser integration was demonstrated,
  not every platform or the optional React adapter.
- Receipts assert publisher insertion/disclosure, not independent viewability,
  human attention, organic endorsement or advertiser performance.

## Concrete follow-up items, not silently fixed

The integrator and reviewer independently identified public-contract gaps:
document numeric expiry units; specify over-length/sensitive-question handling;
define unknown-award and lost-receipt lookup/reconciliation; clarify canonical
retry inputs, error responses and receipt-validation boundaries. The app explicitly
skips over-length ad requests while preserving organic input, assumes epoch-ms
expiry (compatible with this connected run, not a general unit guarantee), and
never automatically repurchases.
See `app/INTEGRATION_LOG.md` for initial observations and `REVIEW.md` for the fresh
review verdict and anything not observed. These are next SDK/documentation tasks,
not evidence that the first attempt used a repaired library.

## Fresh review disposition

Hooke's focused review **passed this bounded local synthetic-fixture integration**
with no substantive blocker. It independently recomputed all 23 integrated-file
hashes, reran 30/30 checks and reconciled the live ledger with the saved evidence.
It visually inspected Main's screenshot but did not perform its own interactive
browser run. Missing coverage remains explicitly marked, including the complete
frequency-cap/new-conversation sequence and actual-ledger lost-acknowledgement
recovery through the app. Stored receipt/signature data is not an independently
verified cryptographic attestation. See `REVIEW.md` for exact evidence boundaries.

## Reproduce

```sh
cd /Users/akshat/agentic-dsp-sdk-cleanroom
node experiments/sdk-cleanroom/launch.mjs
```

Open `http://127.0.0.1:3471/`. Follow `RUNBOOK.md` for fixture opt-in, test commands
and evidence capture. The launcher generates its own ignored local credentials;
no credentials from the main project are needed.
