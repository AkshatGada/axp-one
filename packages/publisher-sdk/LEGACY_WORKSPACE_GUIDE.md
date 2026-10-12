# AXP publisher SDK — legacy workspace guide (0.2.0)

Historical reference, excluded from the npm package. Use README.md for the
current account-owned SDK installation and endpoint.

The first reusable AXP integration requests one separately disclosed Sponsored card
for a user turn and forwards the app's DOM observation to the exchange. It works
with the user-created campaigns in the additive product workspace. Saved MVP/V3
runs, their contracts and recorded payment artifacts are unchanged.

Version **0.2.0** is repository-distributed source and an installable local tarball,
not a published npm release. Node 22.18+ and built-in `fetch`
are sufficient. The server and browser modules have no runtime dependencies.
The optional React source adapter uses the app's existing React and TSX bundler.

## Install the local pilot package (no publication)

From this checkout, choose a local output directory outside the repository:

```sh
npm pack ./packages/publisher-sdk --pack-destination /absolute/path/to/local-packages
# In your own app:
npm install /absolute/path/to/local-packages/axp-publisher-sdk-0.2.0.tgz
```

The output directory must already exist. Packing needs no registry, model or wallet
operation. Do not run `npm publish`; a `prepublishOnly` guard also refuses it.
The allowlisted tarball includes server, browser, financial and receipt modules,
their declarations, this README and the optional React source adapter. Repository
examples are excluded because their launcher depends on repository-local config.
Existing relative source entry points remain supported; installed apps can use:

```js
import {AXPPublisher, PublisherSDKError} from '@axp/publisher-sdk'; // server only
import {createSponsoredCard, createRenderAcknowledger} from '@axp/publisher-sdk/browser';
import {validateReceiptResult} from '@axp/publisher-sdk/receipt'; // browser-safe shape/binding check
```

These checks do not independently verify receipt signatures, recompute hashes,
prove human attention or submit payments.

## Manually provision an isolated pilot workspace

Before making requests, arrange provisioning with the exchange operator. The
public demo is not your isolated pilot inventory. Operator actions are manual,
separate from installing or constructing the SDK:

1. Provision a dedicated workspace/state store and endpoint for this publisher;
   keep its stable workspace identity and existing obligations intact. Confirm
   financial mode, placement and capability configuration with a read-only
   `GET /publisher/config` against that endpoint.
2. Have the operator issue a credential scoped to that workspace through its
   trusted operator tooling and deliver it privately to your server secret store.
   Public config cannot issue keys. Do not read a different workspace's key file,
   share the demo key, copy private state, or put the key in browser/model inputs.
3. For rotation, the operator issues a replacement for the same workspace, your
   server switches credentials, and the old credential is revoked. The `rotate`
   command revokes immediately, so coordinate the switch; use `issue` followed by
   an explicit `revoke` when an overlap window is needed.
   Confirm the new key authenticates read-only recovery and the old key is rejected.
   Previously saved award IDs, receipts and delivery tokens must survive rotation;
   do not regenerate tokens or create replacement opportunities to test it.
4. Keep the app's durable turn records and server-held delivery tokens through
   restarts. A wrong-workspace or revoked key is an authentication error, not a
   reason to purchase again. Ask the operator to restore correct access.

This pilot is one publisher per isolated workspace/endpoint, not shared-inventory
multi-tenancy, self-service signup or independent payout onboarding. Provisioning,
provider use, funding and deployment need their own authorization. The SDK never
creates wallets, chooses payment recipients or purchases automatically.

For a dedicated local endpoint, the operator initializes a **new isolated** state
directory (never the demo or another funded workspace), then starts the server:

```sh
AXP_PRODUCT_STATE_DIR=/absolute/path/to/ignored-pilot-state \
AXP_PRODUCT_PUBLISHER_ONLY=1 node scripts/product/dev-server.mjs --api-only
```

For hosted pilots, set `AXP_PRODUCT_PUBLISHER_ONLY=1` with a dedicated stable
workspace/endpoint and private store in the server environment. This removes
public dashboard, demo, state and workspace APIs; SDK-authenticated routes and
public publisher config remain. It does not turn the shared demo into multi-tenancy.
Check config before freezing an integration: `schemaVersion: 'publisher-config.v2'`,
`contractVersion: '0.2.0'`, `expiresAtUnit: 'unix_epoch_milliseconds'`,
`maxQuestionCharacters: 1200`, `restrictionLimit: 17`, `recoverySupported: true`.
The recovery routes below describe this pilot contract, not a claim of deployment
to the public demo.

From the exchange checkout, on an already initialized local operator workspace:

```sh
node scripts/product/publisher-key.mjs list --state-dir /absolute/path/to/ignored-pilot-state
node scripts/product/publisher-key.mjs issue --state-dir /absolute/path/to/ignored-pilot-state --out publisher.env
node scripts/product/publisher-key.mjs rotate --state-dir /absolute/path/to/ignored-pilot-state --key-id EXISTING_KEY_ID --out rotated-publisher.env
node scripts/product/publisher-key.mjs revoke --state-dir /absolute/path/to/ignored-pilot-state --key-id EXISTING_KEY_ID
```

`issue`/`rotate` optionally accept `--scopes comma,list`; use only operator-approved
scopes. `--out` is a fresh `.env` **filename inside that state directory**, not an
absolute output path. Secrets go only into the ignored 0600 output file, not stdout;
transfer that secret privately into your app's server environment. Do not commit
or print it. These commands are operator-only, not HTTP endpoints or SDK methods.
Coordinate local credential mutation with the single backend authority; for a
hosted durable store use its approved operator workflow, not a stale local copy.

## Connect to the hosted exchange

Canonical API: `https://axp.one/api/product`. The SDK defaults to this HTTPS origin;
set `baseURL` explicitly for a local or different exchange. Importing/constructing
it does not submit an opportunity or call a provider.

1. Read [publisher configuration](https://axp.one/api/product/publisher/config).
2. Have the workspace operator provision a server-only publisher key for that
   hosted workspace. Public configuration does not issue a key; there is no
   self-service publisher signup or browser key-download route in this release.
3. Install the local tarball above, copy this SDK directory, or add a local dependency.
4. Store `AXP_PUBLISHER_API_KEY` and `AXP_EXCHANGE_URL=https://axp.one/api/product`
   in your server environment. Use your own existing LLM for the independent answer.

Try [the live publisher chat](https://axp.one/publisher-demo/) and
[the integration guide](https://axp.one/sdk/) without a local server. DeepSeek powers
that example app only. Jev judges ad fit. The hosted shared demo uses Devnet test
USDC; authenticated ad requests compete against its actual campaign inventory.

To run the developer app locally while connecting to the hosted exchange, provide
the correct hosted key in its server environment, then:

```sh
AXP_EXCHANGE_URL=https://axp.one/api/product \
  node packages/publisher-sdk/examples/server.mjs
# Open the local example UI at http://127.0.0.1:3433.
```

Only the example UI runs locally; its exchange and example-answer requests use
axp.one. Sending a question consumes the shared provider allowance. Its demonstration
answer endpoint is not a requirement for integrations using their own LLM.

## Develop against a local exchange

From the repository root:

```sh
npm run demo:product
# Open http://127.0.0.1:3430/advertiser-dashboard/
# Complete onboarding, create a campaign, inspect/approve creative and launch it.
# Then open http://127.0.0.1:3430/publisher-demo/ and submit a matching question.
```

The launcher creates an ignored server key at
`local-state/product/publisher-api-key`. It also reports Jev readiness. Jev buying
decisions require the configured provider; financial mode is reported independently.
The judge-facing `/publisher-demo/` requires the configured live DeepSeek provider;
without it, sending is disabled with setup help. Each submission makes a fresh organic
request. Organic generation never receives advertiser copy, targeting hints,
historical evidence or buyer context. A real-provider failure remains an error.

The judge-facing app is `/publisher-demo/`. For a separate developer integration
example against the same workspace:

```sh
AXP_EXCHANGE_URL=http://127.0.0.1:3430/api/product \
  node packages/publisher-sdk/examples/server.mjs
# Open http://127.0.0.1:3433
```

This example reads the local publisher key on the server, without printing it.
Its source is `<selected AXP_PRODUCT_STATE_DIR>/publisher-api-key`, with
`local-state/product` as the default. Configuration merges ignored `.env.local`
with process environment overrides. For the funded native presentation workspace,
select `AXP_PRODUCT_STATE_DIR=local-state/product-devnet-presentation` in both
product and example configuration. A different workspace key cannot authenticate
that inventory.
Alternatively set `AXP_PUBLISHER_API_KEY` in the example's server environment.
Do not put the key in client code, a public environment variable or an LLM prompt.
The example's organic path calls the workspace's independent DeepSeek endpoint;
it requires live provider readiness and does not fabricate a fallback. Submitting
a question invokes the configured organic provider and may invoke Jev in the
parallel ad path. Startup itself makes no provider, payment or ad requests.

## Integrate your existing AI app

Copy `packages/publisher-sdk` into your project and import its local entry points,
or add a local package dependency. It is not necessary to install a remote package.

```js
// Your server, never the browser:
import { AXPPublisher } from './packages/publisher-sdk/index.mjs';

const axp = new AXPPublisher({
  apiKey: process.env.AXP_PUBLISHER_API_KEY,
  baseURL: process.env.AXP_EXCHANGE_URL || 'https://axp.one/api/product',
  timeoutMs: 15000,
  receiptTimeoutMs: 45000,
});

// Start both before awaiting either. The answer gets no sponsor material.
const adTask = axp.requestAd({
  question: sanitizedQuestion,
  sessionId: conversation.randomSessionId,
  turnId: submittedTurn.stableId,
  placementId: 'chat-sponsored-card',
  // Optional restrictions from your app, not from an advertiser:
  requiredCapabilities: ['software_development'],
  excludedCategories: [],
});
const answerTask = yourExistingLLM({ question: sanitizedQuestion });

sendAnswer(await answerTask); // stream independently if your app streams
const ad = await adTask;
if (ad.status === 'awarded') sendSponsoredAward(ad);
// no_fill or error: leave the slot empty and keep the answer.
```

`question` is one sanitized current turn, at most 1,200 JavaScript string characters
**before trimming**. The SDK trims leading/trailing whitespace for transport,
preserves internal whitespace, and never silently truncates. Keep the organic
answer input independent; the SDK does not modify your app's question or LLM call.
Do not pass raw chat
history, identity, sensitive attributes or private account data. Session and turn
IDs are 1–120 characters from letters, digits, underscore and hyphen. Session IDs
are random conversation IDs, not persistent cross-site identifiers. The API validates
the capability catalogue; use `GET /api/product/publisher/config` to discover it.
Each restrictions array accepts at most 17 entries. IDs are trimmed, deduplicated
and sorted lexically for canonical transport, using letters, digits, underscores
and hyphens (1–100 characters after trim). Unsupported catalogue IDs are rejected
by the exchange. Preserve the same canonical question, placement and restrictions
for a turn; do not change them during recovery.

The SDK's default deadline is 15 seconds, matching a bounded Jev request path.
It aborts transport and returns an explicit error on timeout. Your answer should
be displayed immediately when ready. No latency reduction or zero added latency
is promised. A deadline may leave a server-side reservation until explicit failure
or expiry; it is not proof that the server did no work. Transport abort/deadline
is **not server cancellation** and does not authorize another purchase or an
automatic failure call.

## Render a native card

Only send the award and its scoped delivery token to your frontend. The original
`creative` object and `creativeHash` stay intact. The separately supplied `brandName`
is display metadata; never insert it into the hash-bound creative object.

```js
import {
  createSponsoredCard,
  createRenderAcknowledger,
} from './packages/publisher-sdk/browser.mjs';

const acknowledge = createRenderAcknowledger({
  post: async (_path, observation, deliveryToken) => {
    const response = await fetch('/api/axp/render', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-app-csrf': yourCSRF },
      body: JSON.stringify({ awardId: ad.award.id, observation, deliveryToken }),
    });
    if (!response.ok) throw new Error('delivery_unconfirmed');
    return response.json();
  },
});

const card = createSponsoredCard({ document, award: ad.award });
sponsorContainer.append(card);
const receipt = await acknowledge({
  node: card, award: ad.award, deliveryToken: ad.deliveryToken,
});
```

The renderer uses `textContent`, never HTML interpolation. It creates an HTTPS
destination link with `rel="sponsored noopener noreferrer"`. Add your own native
styles through `className`. Keep the card distinct from the organic answer.
The acknowledgement helper requires a connected card, the matching award ID,
exact approved text, original destination and literal visible `Sponsored` label.
It rejects CSS-hidden nodes or disclosure. It does not require a click.

For a custom renderer use `inspectPlacement(node, award)` with these attributes:

```html
<aside data-award-id="the-award-id">
  <span data-sponsored-label>Sponsored</span>
  <p data-creative-copy>Exact approved text</p>
  <a data-sponsored-destination href="https://approved.example/">Visit sponsor</a>
</aside>
```

The optional `react.tsx` exports `SponsoredCard`. Supply an `acknowledge` callback
created by `createRenderAcknowledger`, plus `onReceipt`, `onError` and your app's
styles. Keep callbacks stable and preserve the award identity during a turn.

## Forward the observation from your backend

Your own backend authenticates its browser request and applies its CSRF controls.
It forwards only the observation and bound delivery token with its server key:

```js
const receipt = await axp.acknowledgeRender({
  awardId: body.awardId,
  deliveryToken: body.deliveryToken,
  observation: body.observation,
});
// receipt.status === 'accepted'
// receipt.charge.id identifies the one charge for this award.
// receipt.charge.amountBaseUnits is the accepted integer amount.
```

The exchange signs the receipt and admits exactly one charge transactionally.
The browser cannot set an amount, recipient, publisher identity or signing key.
The SDK posts only `creativeHash`, `domInserted` and `sponsoredLabelPresent`.
Receipt errors throw `PublisherSDKError` instead of masquerading as accepted delivery.
Server and browser helpers validate accepted status, nonempty charge/signature,
integer amount, hash shapes and award/creative binding. The browser also checks
the award's exact price and known financial mode (`financialMode`, falling back to
`mode`). Supplied response/receipt/charge modes must match that known award mode;
missing legacy mode metadata remains accepted. Optional charge award/hash/mode bindings are checked when
present. This is structural validation, not independent cryptographic verification.

If your app cannot show a reserved award:

```js
await axp.failRender({
  awardId: ad.award.id,
  deliveryToken: ad.deliveryToken,
  reason: 'render_failed',
});
```

Only `{status: 'failed', award: {id: <the same award ID>, ...}}` is accepted as a
failure response; malformed or mismatched HTTP 200 responses throw
`invalid_fail_response`. Failure releases the reservation. Otherwise server expiry does. An already
delivered award cannot be failed to erase an accepted charge.

## Recover without purchasing again

Your application, not the SDK's in-memory cache, must durably own each conversation
session and turn. Before the initial request, save the sanitized input, canonical
restrictions, session ID, turn ID and authenticated app-user ownership in your
server database. Atomically admit only one request per app turn; an HTTP retry or
page refresh must load that record instead of minting another turn. Persist the
result (including award ID, expiry and delivery token) before exposing it to the
browser. Store accepted receipts/charge IDs durably too. Keep delivery tokens
server-owned, disclosing only the exact award's scoped token when needed to render.
Do not log keys or tokens.

If the opportunity response is lost, use the saved IDs with the publisher key:

```js
const status = await axp.lookupOpportunity({sessionId: saved.sessionId, turnId: saved.turnId});
// GET /publisher/opportunities?sessionId=...&turnId=...
// No delivery-token header is sent.
if (status.status === 'resolved') {
  // Persist status.result in your own durable store before using it.
  // It is the saved awarded/no_fill result, not a new auction.
  // awardStatus may be reserved, expired, failed or delivered for an award.
}
```

The response discriminant is `schemaVersion: 'publisher-opportunity-status.v1'`:

| Status | Recovery behavior |
| --- | --- |
| `not_found` | No saved admission found; investigate the durable app record/endpoint. Lookup itself does not purchase. Any explicit resubmission must retain the original canonical input and IDs. |
| `pending` | Admission exists; wait or look up again explicitly, never start a replacement purchase. |
| `unknown` | Outcome is uncertain; retain original identity and ask the operator to reconcile. Do not retry a purchase. |
| `resolved` | Persist the saved `result`. No-fill stays empty. Do not render an expired/failed/delivered award as a new delivery. |

If an acknowledgement response is lost, recover the existing award with the
original bound token (both read-only GET routes require the publisher key):

```js
const delivery = await axp.lookupDelivery({
  awardId: saved.result.award.id,
  deliveryToken: saved.result.deliveryToken,
});
// GET /awards/:id/status with x-axp-delivery-token
if (delivery.status === 'accepted') {
  // Persist delivery.result: the saved accepted receipt and original charge.
  // No new observation, voucher authorization or payment is submitted by lookup.
}
```

Delivery uses `schemaVersion: 'publisher-award-status.v1'`. `reserved`, `expired`
and `failed` include `awardId`, `expiresAt`, and `financialMode`; `accepted` includes
`awardId`, `financialMode` and the validated saved receipt in `result`. A reserved
award is not accepted spend. If still reserved and unexpired, an app may explicitly
render/acknowledge the same award/token after observing exact insertion, or explicitly
fail an award it cannot show. Expired/failed awards are terminal for that turn.
An accepted result is not a finalized payout; unknown/blocked authorization remains
separate. No lookup runs a model, changes expiry, retries an operation, authorizes
a voucher or makes a payment.

`award.expiresAt` and delivery-status `expiresAt` are **Unix epoch milliseconds**,
not seconds, an ISO string or a TTL. Use `Date.now() < expiresAt` as a local
presentation check; server time/state remains authoritative. Do not reject a saved
expired award's shape or extend its deadline during recovery. GET does not expire
reservations as a side effect.

Lookup, acknowledgement and failure methods throw `PublisherSDKError` on input,
transport, schema or binding errors. `requestAd` alone fails open with
`{status:'error', error:{code, status?}}`. Non-2xx JSON `{error: stable_code}` retains
the safe lowercase alphanumeric/underscore code (up to 100 characters) and HTTP
status; malformed or unsafe bodies become `http_error` with that HTTP status.
Arbitrary server text is not echoed. HTTP 200 does not establish acceptance.

## Retries, no-fill and accounting

| Result | App behavior |
| --- | --- |
| `status: 'awarded'` | Render the approved card, then acknowledge observation |
| `status: 'no_fill'` | Keep the answer, omit the slot, inspect `trace` if needed |
| `status: 'error'` | Keep the answer; show/log `error.code` and optional HTTP status |
| `acknowledgeRender` throws | Show delivery as unconfirmed; reconcile the same award/token |

There are no automatic ad purchase retries. If a caller explicitly retries,
use the exact same question, placement, restrictions, session and turn IDs.
Changing canonical input on the same turn returns a conflict. A genuinely new
question creates a new turn. A failed or expired award is not repurchased by
inventing a new ID for that original turn.

The browser acknowledger deduplicates concurrent/validated successful observations by award,
and permits explicit retry after a failed post **or malformed fulfilled response**.
Wrong award/creative/price/known-mode bindings are rejected before caching. Its cache is only
in-memory convenience, not durable recovery. The backend remains the source of
truth: retrying an accepted render returns the existing charge with `replayed: true`.
The reference UI's “Replay same receipt” button exercises that server behavior.
Two accepted/reserved placements per campaign per conversation exercise the MVP's
frequency cap. A new conversation does not reset campaign spend or deposit.

Money uses integer base-unit strings. An award is a reservation, an accepted
receipt creates accrued spend, cumulative authorization is a separate state, and
settlement is separate again. `mode: 'synthetic'` means local test credits without
real funds or blockchain activity. A Devnet label requires actual corresponding
backend evidence. Jev model execution does not change that financial mode.

Prefer the API's explicit `financialMode` when present, including on an accepted
receipt. `financialMode: 'devnet'` denotes native test-network execution.
`settlementNetwork: 'solana-devnet'` (also the legacy default) uses six-decimal
**test USDC**; `'tempo-testnet'` uses six-decimal **test PathUSD** on Moderato.
`financialMode: 'synthetic'` uses local **test credits**. Keep monetary totals
separate by network. See [the dual-rail SDK guide](../../docs/product/SDK.md).
The public
`@axp/publisher-sdk/financial` helpers resolve this metadata and its denomination
without supplying payment credentials. An accepted delivery receipt is accrued
spend; it does not itself prove a finalized payout, channel closure or refund.
Only the payment backend can create and report those network outcomes. Publisher
SDK requests never accept a browser-selected recipient, amount or signer.

In Devnet mode, the render response also carries `payment` (the server's channel
snapshot) and `authorization: {status: 'authorized' | 'unknown' | 'blocked', reason?}`.
An accepted receipt stays accepted when its automatic voucher authorization is
unknown or blocked. Retrying that receipt must reuse its award and delivery token;
it does not create another charge. The payment backend owns reconciliation and
settlement. Authorization is an off-chain, receipt-controlled cumulative voucher,
not an on-chain payout.

For Solana, the chat's payment stage shows the channel, payer, publisher payee, test-USDC mint,
voucher sequence and amounts, plus recorded open/close transactions. A transaction
counts as finalized evidence only when both `status` and `finality` are
`'finalized'` and a valid-shaped signature is present. The UI derives fixed Solana
Devnet explorer links from that signature; it does not use a supplied arbitrary
URL. Its “Refresh payment records” button reads the workspace without submitting
payments or model requests. After the dashboard closes a channel, use it to inspect
finalized token balance deltas, network fees, reclaimed rent and refunded collateral.
Synthetic workspaces remain supported and have no native transaction proof.

Tempo evidence uses a verified chain ID, token, escrow and transaction hash.
Its payment stage shows funding, cumulative vouchers, payout while open and final
closure/refund; Explorer links are derived from the supported network and hash.
An interim payout does not replenish the campaign budget. Network configuration
belongs on the server; the request selects only the supported network enum.

Ad requests default to a 15-second deadline; delivery acknowledgements use a
separate 45-second deadline. Configure `timeoutMs` and `receiptTimeoutMs` independently.
Neither timeout triggers automatic retries or a replacement purchase.

A receipt records the app's assertion about exact insertion and disclosure. Billing
is accepted insertion, **not human attention**, a click or a verified view.
It does not independently prove human viewability, attention, conversion,
advertiser product claims or organic endorsement.

## Actual product API routes

| Route | Authentication and purpose |
| --- | --- |
| `GET /api/product/publisher/config` | Public publisher/placement/capability/engine configuration; no key |
| `POST /api/product/opportunities` | `x-axp-publisher-key`; generic server ad request |
| `GET /api/product/publisher/opportunities?sessionId=...&turnId=...` | Publisher key only; read saved opportunity status/result |
| `GET /api/product/awards/:id/status` | Publisher key plus existing delivery token; read saved delivery status/receipt |
| `POST /api/product/awards/:id/render` | Publisher key plus `x-axp-delivery-token`; admit exact observation |
| `POST /api/product/awards/:id/fail` | Same authentication; release undelivered award |
| `GET /api/product/bootstrap` | Reference UI CSRF/config; no publisher key |
| `POST /api/product/demo/answer` | `x-axp-csrf`; independent reference organic path |
| `POST /api/product/demo/chat` | `x-axp-csrf`; same-origin ad proxy |
| `POST /api/product/demo/awards/:id/render` | CSRF plus scoped delivery token; reference receipt proxy |

Opportunity input is `{question,sessionId,turnId,placementId?,requiredCapabilities?,excludedCategories?}`.
Award responses include `{status,mode,opportunityId,award,deliveryToken,trace,replayed}`;
no-fill responses omit `award` and `deliveryToken`. Trace decisions carry actual
engine provenance and retrieval summaries. Advertiser hints and retrieved inferred
ContextHint evidence are distinct inputs to buying, never rendered copy changes.
Non-wallet categories can have no historical evidence; the trace records that.

## Verification and references

```sh
node --test tests/publisher-sdk/*.test.mjs
# Optional actual loopback HTTP transport (requires local network permission):
AXP_SDK_HTTP_TEST=1 node --test tests/publisher-sdk/product-integration.test.mjs
```

Focused checks cover transport deadlines, failure/no-fill, stable retry identity,
key isolation, safe creative destinations, integer money, exact DOM/disclosure,
successful deduplication and uncertain delivery retries. Connected service tests
use injected test engines and cannot establish real Jev decision quality.

The journey is documented in `docs/product/PUBLISHER_JOURNEYS.md`. Gravity's
official [overview](https://docs.trygravity.ai/introduction/overview),
[quickstart](https://docs.trygravity.ai/ai-platforms/quickstart), and
[rendering guide](https://docs.trygravity.ai/ai-platforms/show-ads) informed the
server request/client rendering pattern, reviewed 2026-10-07. This is fresh AXP
code; no Gravity dependency, pixel, account onboarding or performance promise is used.
