# AXP publisher SDK

The first reusable AXP integration requests one separately disclosed Sponsored card
for a user turn and forwards the app's DOM observation to the exchange. It works
with the user-created campaigns in the additive product workspace. Saved MVP/V3
runs, their contracts and recorded payment artifacts are unchanged.

This is repository-distributed source, not a published npm release. Node 22.18+ and built-in `fetch`
are sufficient. The server and browser modules have no runtime dependencies.
The optional React source adapter uses the app's existing React and TSX bundler.

## Connect to the hosted exchange

Canonical API: `https://axp.one/api/product`. The SDK defaults to this HTTPS origin;
set `baseURL` explicitly for a local or different exchange. Importing/constructing
it does not submit an opportunity or call a provider.

1. Read [publisher configuration](https://axp.one/api/product/publisher/config).
2. Have the workspace operator provision a server-only publisher key for that
   hosted workspace. Public configuration does not issue a key; there is no
   self-service publisher signup or browser key-download route in this release.
3. Copy this SDK directory into your project or add a local package dependency.
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

`question` is one sanitized turn, at most 1,200 characters. Do not pass raw chat
history, identity, sensitive attributes or private account data. Session and turn
IDs are 1–120 characters from letters, digits, underscore and hyphen. Session IDs
are random conversation IDs, not persistent cross-site identifiers. The API validates
the capability catalogue; use `GET /api/product/publisher/config` to discover it.

The SDK's default deadline is 15 seconds, matching a bounded Jev request path.
It aborts transport and returns an explicit error on timeout. Your answer should
be displayed immediately when ready. No latency reduction or zero added latency
is promised. A deadline may leave a server-side reservation until explicit failure
or expiry; it is not proof that the server did no work.

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

If your app cannot show a reserved award:

```js
await axp.failRender({
  awardId: ad.award.id,
  deliveryToken: ad.deliveryToken,
  reason: 'render_failed',
});
```

Failure releases the reservation. Otherwise server expiry does. An already
delivered award cannot be failed to erase an accepted charge.

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

The browser acknowledger deduplicates concurrent/successful observations by award,
and permits explicit retry after a failed post. The backend remains the source of
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
receipt. `financialMode: 'devnet'` uses six-decimal **test USDC** amounts on Solana
Devnet; `financialMode: 'synthetic'` uses local **test credits**. The public
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

The chat's budget stage shows the channel, payer, publisher payee, test-USDC mint,
voucher sequence and amounts, plus recorded open/close transactions. A transaction
counts as finalized evidence only when both `status` and `finality` are
`'finalized'` and a valid-shaped signature is present. The UI derives fixed Solana
Devnet explorer links from that signature; it does not use a supplied arbitrary
URL. Its “Refresh payment records” button reads the workspace without submitting
payments or model requests. After the dashboard closes a channel, use it to inspect
finalized token balance deltas, network fees, reclaimed rent and refunded collateral.
Synthetic workspaces remain supported and have no native transaction proof.

Ad requests default to a 15-second deadline; delivery acknowledgements use a
separate 45-second deadline. Configure `timeoutMs` and `receiptTimeoutMs` independently.
Neither timeout triggers automatic retries or a replacement purchase.

A receipt authenticates an app assertion about exact insertion and disclosure.
It does not independently prove human viewability, attention, conversion,
advertiser product claims or organic endorsement.

## Actual product API routes

| Route | Authentication and purpose |
| --- | --- |
| `GET /api/product/publisher/config` | Public publisher/placement/capability/engine configuration; no key |
| `POST /api/product/opportunities` | `x-axp-publisher-key`; generic server ad request |
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
