# Fresh publisher integration exercise

You are a developer of a conversational AI platform. Integrate the supplied AXP
publisher package into the ordinary chat app, preserving the existing answer model
interface and keeping Sponsored material out of organic input and history.

## Materials

- Frozen ordinary app: `experiments/sdk-cleanroom/baseline-app/`.
- Installable local SDK: `local-state/sdk-pilot/package/axp-publisher-sdk-0.2.0.tgz`.
  Its README, types, implementation and included examples are public materials.
- Operator endpoint: `http://127.0.0.1:3472/api/product`.
- Local credentials: `local-state/sdk-pilot/integrator.env`. Server only. Do not
  print, commit or copy them into browser assets or reports.
- Operator evidence: `http://127.0.0.1:3472/__pilot/evidence` (read only).

Build ONLY `experiments/sdk-pilot/app/`, starting from the frozen ordinary app.
Do not read previous integrated apps, prior reviewer findings, product/backend
implementation, internal tests or financial adapters. Report any documentation gap
instead of filling it from internals. Do not change the SDK or backend.

## Acceptance

1. Start a normal chat and display its independent answer without waiting for ads.
2. With explicit current-message sharing enabled, request one developer-tool ad,
   render exact disclosed creative, and acknowledge only actual insertion.
3. No eligible ad or unavailable ad transport must leave the answer working.
4. Preserve stable server-owned conversation/turn identities and delivery bindings
   durably. Restart the APP and recover its existing outcome through public SDK.
5. Simulate a lost opportunity response and a lost accepted-receipt response over
   the actual local exchange. Recover without another opportunity, decision or
   charge. Keep unknown outcomes explicit; no replacement purchase.
6. Reject invalid/hidden/detached Sponsored insertion without acknowledging it.
   Test retry after a malformed HTTP200 response as supported by public contract.
7. Check browser assets and organic inputs for credential/ad-context leakage.

Use labelled fixture answers and the supplied fixture exchange. This tests SDK
integration and economic identity, not actual model quality or payment finality.
No network calls except loopback, paid providers, wallets, deployment or global config.
Keep tests reproducible, include observed vs mocked coverage, and write your own
integration report in the new app. Do not claim unbiased evaluation: you are a
fresh limited-context session of the same model family.
