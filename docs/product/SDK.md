# Publisher SDK: one integration, two settlement rails

AXP adds a separately disclosed Sponsored card to an AI app through three steps:
**Request → Render → Acknowledge**. The publisher keeps its own answer model.
DeepSeek powers only AXP's example chat; Jev evaluates advertising fit.

The dependency-free SDK is distributed as repository source under
`packages/publisher-sdk`; it is not a published npm package. Use Node 22.18+ for
the server module. The browser helpers work with the app's existing frontend.
The public product guide is at [axp.one/sdk](https://axp.one/sdk/).

## Configure the publisher

Have the workspace operator provision a publisher key and payout route for each
supported rail. Public publisher configuration reports readiness but does not
issue credentials. Keep the key server-side:

```sh
AXP_EXCHANGE_URL=https://axp.one/api/product
AXP_PUBLISHER_API_KEY=<operator-provisioned server-only key>
```

Use the specific Preview exchange URL instead while evaluating an unmerged
integration. This branch does not imply Tempo is already enabled on Production.
Read `<exchange base URL>/publisher/config` for the placement and
`payments.networks` readiness registry.

Set optional `settlementNetwork` per opportunity:

| Value | Auction inventory | Payment token |
| --- | --- | --- |
| `solana-devnet` | Solana campaigns only | Test USDC |
| `tempo-testnet` | Tempo campaigns only | Test PathUSD |
| Omitted in a native workspace | Legacy Solana default | Test USDC |

The operator configures token metadata and publisher payout addresses. A browser
request cannot supply them. Mismatched-rail campaigns are excluded before Jev
calls. Switching rails starts a new conversation/session; explicit retries retain
the original rail and all original opportunity inputs.

## 1. Request alongside the independent answer

```js
// Your application server only.
import { AXPPublisher } from './packages/publisher-sdk/index.mjs';

const axp = new AXPPublisher({
  apiKey: process.env.AXP_PUBLISHER_API_KEY,
  baseURL: process.env.AXP_EXCHANGE_URL || 'https://axp.one/api/product',
  timeoutMs: 15000,
  receiptTimeoutMs: 45000,
});

const adTask = axp.requestAd({
  question,
  sessionId,                         // random per conversation
  turnId,                            // stable per submission/retry
  placementId: 'chat-sponsored-card',
  settlementNetwork: 'tempo-testnet', // optional; legacy default is Solana
});
const answerTask = yourExistingLLM({ question });

sendAnswer(await answerTask);
const ad = await adTask;
if (ad.status === 'awarded') sendSponsoredAward(ad);
// no_fill or error: keep the answer and leave the Sponsored slot empty.
```

`yourExistingLLM`, `sendAnswer` and `sendSponsoredAward` are your application
functions. The answer request receives no advertiser creative, campaign hints,
ContextHint evidence or bid context. Do not wait for the ad to display the answer.

The SDK validates the question, IDs and rail. It never automatically retries a
purchase. A timeout is an uncertain request outcome, not proof that the server did
no work. Keep session/turn IDs and the complete input stable for an explicit retry.

## 2. Render the exact approved card

```js
// Your application browser, after an awarded response from your server.
import { createSponsoredCard, createRenderAcknowledger }
  from './packages/publisher-sdk/browser.mjs';

const card = createSponsoredCard({
  document,
  award: ad.award,
  className: 'your-native-sponsored-card',
});
sponsorSlot.append(card);

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
```

Supply the connected `sponsorSlot` and your application's CSRF token. The helper
uses approved plain text, the original HTTPS destination and a visible literal
Sponsored label. Keep this card separate from the answer. No click is required.
The publisher key never enters the browser or an LLM prompt.

## 3. Acknowledge the observed insertion

```js
// Browser: checks the connected card before forwarding its observation.
const receipt = await acknowledge({
  node: card,
  award: ad.award,
  deliveryToken: ad.deliveryToken,
});

// Your /api/axp/render server handler, after app authentication and CSRF:
const receiptFromExchange = await axp.acknowledgeRender({
  awardId: body.awardId,
  deliveryToken: body.deliveryToken,
  observation: body.observation,
});
// Return receiptFromExchange to your browser.
```

These snippets run in separate browser and server contexts. An award reserves
budget; an accepted receipt creates exactly one charge. Replaying the same
accepted observation returns the original charge. Receipt v1 signed bytes remain
compatible with existing Solana integrations.

If the card cannot render, use `axp.failRender({awardId, deliveryToken,
reason: 'render_failed'})` from your server to release its reservation. Otherwise
it expires. An uncertain acknowledgement must be reconciled with the same award,
delivery token and observation; do not buy a replacement placement.

## Inspect financial evidence

The backend reports financial mode independently from model execution. Synthetic
credits do not establish native payment activity. Native payment evidence includes
its network, test token, channel, amounts, transactions and public voucher metadata.

On Tempo, accepted receipts advance cumulative off-chain vouchers. Explicit payouts
transfer only the newly earned delta while the same channel remains open. Final
closure pays the remainder and refunds unused collateral. On Solana, preserve the
existing close-and-settle flow. Neither payout replenishes campaign spending caps.

Use the chain-aware public helpers when presenting evidence:

```js
import { moneyUnit, nativeTransactionURL, isFinalizedNativeTransaction }
  from './packages/publisher-sdk/financial.mjs';

const unit = moneyUnit(payment.mode, payment);
for (const transaction of payment.transactions || []) {
  const url = nativeTransactionURL(transaction, payment.network);
  const finalized = isFinalizedNativeTransaction(transaction, payment.network);
  // Display the saved state; a submitted hash is not a finalized payout.
}
```

These helpers validate public metadata and construct pinned network links. They do
not query a chain, sign a voucher or authorize a transfer. Keep currencies separate
when displaying multiple campaigns. The browser and publisher SDK do not control
campaign funding, payout or closure; authorized workspace payment actions do.

In the example app, open Chat settings to select the rail, submit a fresh turn,
then inspect **View internals → Payment**. Optional details reveal vouchers,
channel identity and transaction proof without crowding the chat conversation.
For operator setup, explicit actions and recovery, see [Tempo settlement](TEMPO.md).
For the renderer's additional contracts and local examples, see the
[SDK source README](../../packages/publisher-sdk/README.md).
