# Fresh developer integration brief

Integrate the AXP publisher SDK into the supplied existing chat application.
Keep the organic answer provider independent and preserve existing chat behavior.

## Allowed information

- The supplied application's code, tests and README.
- `packages/publisher-sdk/README.md`, package metadata, public types and SDK source.
- The running exchange's public publisher configuration endpoint.
- A local operator-provisioned environment file containing the exchange URL and
  server-only publisher credential. Do not print or commit that credential.

Do not read internal exchange implementation, internal tests, SDK example app,
other applications, internal planning files, or ask a parent agent how to implement
the integration. No SDK source edits. If the public contract blocks you, record
the exact issue rather than silently repairing the SDK.

## Requirements

- Show the organic answer independently of ad completion/failure.
- Request a placement, render approved Sponsored copy separately if awarded, then
  acknowledge actual insertion using the browser helper and your own backend.
- Handle no-fill, errors, deadlines, failed insertion and uncertain receipt retries.
- Enforce server-owned session/turn/award bindings and same-origin browser requests.
- Keep publisher credentials server-side. Do not add advertiser material to the
  organic provider input.
- Preserve explicit synthetic/fixture labels. The operator exchange uses the real
  product API/ledger but fixture decisions and synthetic credits. The app's organic
  answers remain fixture answers. No external provider or wallet operations.
- Add focused tests, an exact launcher and an integration log recording ambiguities,
  assumptions, documentation gaps and questions, including anything not completed.

You own app integration design. Public source-distributed SDK installation is part
of the test; do not substitute a reference example application for the supplied app.
