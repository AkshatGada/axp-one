# Conversation fixture chat

A small local conversational chat app using Node built-ins and plain browser HTML, CSS, and JavaScript. The deterministic organic fixture remains independent. Optional AXP Sponsored placements use the operator's loopback exchange, labelled fixture advertiser decisions, and synthetic test credits only. No external answer provider, wallet operations, analytics, or production infrastructure.

## Run

Requires Node.js 22.18 or newer and npm. No `npm install` is needed. The public source-distributed SDK is copied unchanged into `vendor/publisher-sdk`; its server/browser modules have no runtime dependencies. The optional React adapter is not used.

```sh
npm start
```

Open http://127.0.0.1:3471. The server binds only to IPv4 loopback. Optionally set `PORT` to another port, for example `PORT=3472 npm start`.

For the operator-provisioned AXP integration, run exactly:

```sh
cd /Users/akshat/agentic-dsp-sdk-cleanroom/experiments/sdk-cleanroom/app
npm run start:axp
```

This expands to `node --env-file=../../../local-state/sdk-cleanroom/integrator.env server.js`. Node loads `AXP_EXCHANGE_URL` and `AXP_PUBLISHER_API_KEY` only into the server. Never paste the key into browser code, a command argument, or a committed file. Existing environment values override Node's env-file values. The launcher accepts only `http://127.0.0.1:3470/api/product`; it fails closed for a different URL or incomplete credentials. Startup does not call the exchange or a provider. Without either AXP environment variable, `npm start` retains organic-only chat.

```sh
npm test
```

Tests use Node's test runner and temporary loopback ports, with all SDK exchange traffic injected as mocks. No operator ledger writes, credentials, dependency installation, or external network are needed. A sandbox may require permission to bind loopback sockets. Latest result: **23 passed, 0 failed** on Node v25.5.0. Coverage includes the existing chat behavior plus independent organic timing, no-fill/errors/deadlines, bindings/CSRF, exact insertion/disclosure, release failure, late awards, and same-award retry after an uncertain receipt.

## Use

Enter a message and select **Send message**, or press Enter. Shift + Enter adds a line. The labelled **deterministic fixture responder** echoes your message, counts user turns, and references your previous message. It is not an AI model and does not answer general questions intelligently.

While waiting, the form shows loading state and prevents overlapping submissions. Errors are announced and leave the draft intact for retry; unsuccessful turns are not added to history. Requests time out in the browser after 15 seconds. **New chat** clears the conversation. The interface includes explicit labels, keyboard focus styles, a live conversation log, status and error announcements, and responsive layout.

AXP is opt-in through the labelled checkbox. Only the current trimmed message is shared, not conversation history; do not opt in for private or sensitive content. Messages over 1,200 characters or containing unsupported control characters still get their normal fixture answer and skip placement. An organic reply is shown without awaiting the ad. Awarded copy is rendered separately with literal **Sponsored** disclosure and explicit fixture/synthetic labels, then acknowledged through the browser SDK helper and this app's backend. No-fill leaves no card; ad errors do not remove the answer. An uncertain receipt offers only **Retry same receipt**, preserving its original award/token. Never repurchase to resolve an uncertain charge. **New chat** retires the previous ad session and attempts to release undelivered known awards; uncertain receipts are not failed.

## Files and provider boundary

- `server.js`: HTTP server, input validation, explicit public asset routes, and API.
- `answer-provider.js`: documented server-owned `answer({ messages }): Promise<string>` interface and deterministic fixture implementation.
- `public/index.html`, `public/style.css`, `public/app.js`: browser UI and in-memory conversation state.
- `test/server.test.js`: built-in test runner coverage.
- `axp-integration.js`: server-owned session/turn/award bindings, SDK orchestration and receipt forwarding.
- `public/sponsorship.js`: separate card insertion, browser observation and explicit uncertain-receipt retry.
- `test/integration.test.js`, `test/browser-integration.test.js`: offline integration coverage.
- `vendor/publisher-sdk/`: unchanged public SDK source installation, version 0.1.0.
- `INTEGRATION_LOG.md`: assumptions, documentation gaps, verification evidence and handoff limitations.

`POST /api/chat` accepts JSON `{ "messages": [{ "role": "user", "content": "Hello" }] }` and returns `{ "answer": "..." }`. Follow-up requests include the preceding user and assistant messages in order, ending with the new user message. The server validates history before passing it to the provider. Provider exceptions or invalid answers produce a generic HTTP 502 error without exposing internal details.

`createChatServer({ provider, publisher })` accepts server-owned dependencies; its default publisher is disabled, making tests and organic-only use independent of environment credentials. The launcher alone constructs the configured SDK. No provider selection or publisher credentials are sent to the browser. Public assets are explicitly allowlisted, including only the SDK's browser entry point, never its server source.

The browser initializes with `POST /api/axp/session`, receiving an HttpOnly SameSite=Strict cookie and CSRF token. Opted-in `/api/chat` requests include only `{ axp: { csrf, submissionId } }` as optional metadata; the server issues the exchange session and turn IDs. `/api/axp/placement`, `/api/axp/render`, and `/api/axp/fail` use that cookie, exact same-origin checks and `x-app-csrf`. The backend verifies the stored turn/award/token/hash binding, strips client-selected amounts/recipients, and leaves one-charge idempotency to the exchange. Ad requests have a 15-second SDK deadline; receipt requests have a separate 45-second deadline.

## Limits

- Conversation state lives in the tab's JavaScript memory. Refreshing or closing the page clears it; there is no database or persistence.
- At most 21 user turns per conversation, 32 KiB per JSON request, and 4,000 characters per API message or provider answer. The composer limits user messages to 1,600 characters so echoed fixture replies fit. Long conversations may reach the byte limit before the turn limit; start a new chat when prompted.
- No real answer provider, authentication, streaming, markdown rendering, or production deployment configuration. Text is rendered as text, not HTML.
- This is a loopback-only development app, not a public service. Provider calls are not cancelled server-side by the browser timeout.
- Automated tests cover the server and fixture; they do not replace manual browser or screen-reader testing.
- Integration state is process memory only, bounded to 100 active one-hour sessions and 100 placement submissions per session. Refresh/new chat replaces the cookie-bound session; multiple tabs sharing that cookie can invalidate each other's placement state. Restart, refresh, reset or expiry can prevent receipt reconciliation from this UI. The exchange remains the ledger authority.
- Award `expiresAt` is assumed to be epoch milliseconds; the public types do not specify its unit. Unknown reservations after transport deadlines rely on exchange expiry. Failed release is labelled unconfirmed, not assumed successful.
- Main owns the connected real-HTTP award/receipt and real-browser check plus reviewer follow-up. This handoff does not claim an actual product-ledger delivery or human viewability. See `INTEGRATION_LOG.md`.
