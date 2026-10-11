# SDK merge into the main AXP checkout

Date: 11 October 2026. Local integration only; nothing pushed or deployed.

## Merge and isolation

- Destination: the main `agentic-dsp` checkout, on its existing `frontend` branch.
- Destination before merge: `30999399907a96b992b0753188601685e35104f4`.
- SDK source: `codex/sdk-cleanroom-integration`, commit `e644640540a979e219fbe5442c6402068e884d85`.
- Normal three-way merge, preserving the destination's six newer landing-page commits. No conflicts.
- `apps/marketing` tree before merge: `110c7e0da5b32aaa77f3bf31be16f53710e5910f`.
- No changes to `apps/marketing`, `docs/frontend`, product UI source, or design tokens. Existing landing servers on ports 3410 and 3420 were left alone.

The merge brings in the documented SDK 0.2.0 fixes: durable opportunity recovery, accepted-receipt lookup, scoped publisher credentials and operator rotation, bound receipt validation, stable errors, optional publisher-only API mode, integration examples and cleanroom/pilot evidence. Publisher-only mode remains opt-in; the default dashboard and chat routes remain available.

## Verification

| Check | Result |
|---|---|
| `npm test` | 513 tests: 507 passed, 6 skipped, 0 failed |
| `pnpm --filter @axp/product-ui test` | 35 passed, 0 failed |
| Product-only optimized build | Passed compilation, type checking and static export of 26 pages |
| Repository hygiene and whitespace | Passed |
| Dashboard browser regression | Campaign details, pause, resume, duplicate and edited draft save worked |
| Publisher browser regression | Independent fixture answer, separate Sponsored card, accepted delivery and one charge worked |
| Receipt replay | Existing receipt returned; no additional charge |
| No-fill | Unrelated question retained its fixture answer with no sponsored suggestion and no extra charge |
| Accounting joins | Dashboard showed one accepted delivery, 3000 base units spent, 5000 remaining, no reservation |
| Final clean browser pass | No warning/error console entries |

Build command:

```sh
NEXT_PUBLIC_BASE_PATH='' NEXT_PUBLIC_LIVE_API=1 NEXT_DIST_DIR=.next-product-build pnpm --filter @axp/product-ui build:one
```

## Reproducible product smoke lab

After the build above:

```sh
node experiments/sdk-pilot/product-smoke.mjs
```

Open `http://127.0.0.1:3480/advertiser-dashboard/` and `/publisher-demo/`. The lab seeds one fictional ClearVault campaign into a newly created temporary directory, uses real product routes/ledger and SDK browser helpers, and does not load `.env.local`. It does not construct a native payment worker. Stop with Ctrl-C.

The UI deliberately requires the live-answer *wire contract*. The test-only facade supplies that marker to exercise the existing UI, while the underlying provider provenance remains `fixture`; the displayed model is `REGRESSION FIXTURE — no live model`, and the answer explicitly identifies itself as a regression fixture. This is mocked contract coverage, not proof of a live DeepSeek/Jev call. No production code was changed to permit fixture answers.

The first harness pass inserted a test banner into exported HTML, causing React hydration warnings. That harness-only mutation was removed; the unmodified build was retested in a fresh browser tab, with no warnings/errors. No product hydration fix was needed.

Final browser sequence: matching hardware-wallet question → accepted card → replay same receipt → unrelated astronomy question → dashboard shows one charge → pause/resume → duplicate/edit/save draft. The ledger recorded one fixture advertiser decision, two independent organic fixture inputs, one charge of 3000 synthetic base units, zero paid provider calls and zero wallet operations. Organic inputs contained only the independent-answer instruction and exact user question, with no campaign or historical ad material.

Screenshots: `artifacts/sdk-pilot/merge-receipt.png` and `merge-dashboard.png`. Machine-readable summary: `artifacts/sdk-pilot/merge-verification.json`.

## Limits

These checks establish local merged-code compatibility. They do not claim a deployment, fresh live provider execution, native settlement, or a production rollout. Existing funded workspaces and historical payment records were not used or modified.
