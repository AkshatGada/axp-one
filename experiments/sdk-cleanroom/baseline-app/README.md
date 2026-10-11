# Conversation fixture chat

A small local conversational chat app using only Node built-ins and plain browser HTML, CSS, and JavaScript. No dependency installation, credentials, external services, advertising, analytics, or payments.

## Run

Requires Node.js 20 or newer and npm. No `npm install` is needed.

```sh
npm start
```

Open http://127.0.0.1:3471. The server binds only to IPv4 loopback. Optionally set `PORT` to another port, for example `PORT=3472 npm start`.

```sh
npm test
```

Tests use Node's test runner and temporary loopback ports. They cover deterministic replies, multi-turn HTTP requests, validation, provider errors, request limits, and public asset boundaries.

## Use

Enter a message and select **Send message**, or press Enter. Shift + Enter adds a line. The labelled **deterministic fixture responder** echoes your message, counts user turns, and references your previous message. It is not an AI model and does not answer general questions intelligently.

While waiting, the form shows loading state and prevents overlapping submissions. Errors are announced and leave the draft intact for retry; unsuccessful turns are not added to history. Requests time out in the browser after 15 seconds. **New chat** clears the conversation. The interface includes explicit labels, keyboard focus styles, a live conversation log, status and error announcements, and responsive layout.

## Files and provider boundary

- `server.js`: HTTP server, input validation, explicit public asset routes, and API.
- `answer-provider.js`: documented server-owned `answer({ messages }): Promise<string>` interface and deterministic fixture implementation.
- `public/index.html`, `public/style.css`, `public/app.js`: browser UI and in-memory conversation state.
- `test/server.test.js`: built-in test runner coverage.

`POST /api/chat` accepts JSON `{ "messages": [{ "role": "user", "content": "Hello" }] }` and returns `{ "answer": "..." }`. Follow-up requests include the preceding user and assistant messages in order, ending with the new user message. The server validates history before passing it to the provider. Provider exceptions or invalid answers produce a generic HTTP 502 error without exposing internal details.

`createChatServer({ provider })` accepts an implementation of the documented interface, allowing another developer to replace the fixture on the server. No provider selection or credentials are sent to the browser. Only the three explicitly listed public assets are served; the provider module is not public.

## Limits

- Conversation state lives in the tab's JavaScript memory. Refreshing or closing the page clears it; there is no database or persistence.
- At most 21 user turns per conversation, 32 KiB per JSON request, and 4,000 characters per API message or provider answer. The composer limits user messages to 1,600 characters so echoed fixture replies fit. Long conversations may reach the byte limit before the turn limit; start a new chat when prompted.
- No real answer provider, authentication, streaming, markdown rendering, or production deployment configuration. Text is rendered as text, not HTML.
- This is a loopback-only development app, not a public service. Provider calls are not cancelled server-side by the browser timeout.
- Automated tests cover the server and fixture; they do not replace manual browser or screen-reader testing.
