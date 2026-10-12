# AXP publisher SDK

Request a contextual ad from your server, render a separate **Sponsored** card
below your app's own answer, and acknowledge its insertion. Your app keeps its
model, answer generation and interface.

## Install

The `@axp001/publisher-sdk@0.2.1` release candidate is prepared for npm;
registry publication is pending. Until published, install a locally packed copy:

```sh
# From the AXP repository; the destination directory must exist:
npm pack ./packages/publisher-sdk --pack-destination /absolute/path/to/packages
# From your application's directory:
npm install /absolute/path/to/packages/axp001-publisher-sdk-0.2.1.tgz
```

After registry publication, installation will be:

```sh
npm install @axp001/publisher-sdk
```

Requires Node.js 22.18+ with built-in fetch and ESM imports. Core and browser
helpers have no runtime dependencies. The optional React adapter uses React 19.
MIT applies to this SDK only, not AXP's backend or data.

## Connect your AI app

Create an AI app profile in AXP and issue an app-scoped SDK credential. Keep the
one-time key on your server. Never put it in browser code, an LLM prompt, a
public environment variable or a log. Each app uses its own credential.

Configure the account-owned SDK endpoint explicitly:

```js
// Server only
import {AXPPublisher} from '@axp001/publisher-sdk';

const axp = new AXPPublisher({
  apiKey: process.env.AXP_APP_SDK_KEY,
  baseURL: process.env.AXP_SDK_BASE_URL,
});
```

Set `AXP_SDK_BASE_URL` to `https://<your-enabled-AXP-host>/api/accounts/sdk`.
Use the host supplied for your integration; installing the package does not
enable an exchange deployment. The constructor's backward-compatible default
is `https://axp.one/api/product`, the separate shared workspace. **Account-owned
app keys must use `/api/accounts/sdk`, not that default.** HTTP is allowed only
on loopback hosts for local development.

## 1. Request alongside your answer

```js
const input = {
  question: 'Compare hardware wallets with offline key storage.',
  sessionId: session.id,
  turnId: turn.id,
};

// Start the separate ad path; never pass its result to your answer model.
const adPromise = axp.requestAd(input);
const answer = await generateYourOwnAnswer(input.question);
await saveAnswer({input, answer});
sendAnswerToClient(answer); // Do not hold the answer for an ad timeout.

const ad = await adPromise;
await saveAdResult({sessionId: input.sessionId, turnId: input.turnId, ad});
sendAdResultToClient(ad);
```

Your app supplies answer generation, streaming/response transport, authenticated
sessions and durable turn storage. Persist input and result against the user's
turn before sending. For a one-response API, return the answer first and expose
the ad result through your own authenticated turn-status route.
There are three results: `awarded`, `no_fill`, and `error`. Only an awarded
result has an award and delivery token. No-fill and errors must leave the answer
usable; do not render an empty placeholder. There are no automatic retries.

Send only context you have permission to share. Questions are limited to 1,200
characters before trimming. Session, turn and placement IDs contain 1–120 letters,
digits, underscores or hyphens. Preserve IDs across retries. Do not send private
conversation histories by default.

Optional fields are `placementId`, `requiredCapabilities`, `excludedCategories`
and `settlementNetwork`. Restrictions use supported catalogue identifiers;
unsupported restrictions can produce no-fill. Omit a network unless explicitly
configured for your integration.

## 2. Render and acknowledge

```js
// Browser only — no SDK server key
import {createSponsoredCard, createRenderAcknowledger}
  from '@axp001/publisher-sdk/browser';

if (ad.status === 'awarded') {
  const card = createSponsoredCard({document, award: ad.award});
  sponsoredSlotBelowAnswer.append(card);
  const acknowledge = createRenderAcknowledger({
    post: async (_axpPath, observation, deliveryToken) => {
      const response = await fetch(`/api/chat/turns/${turnId}/ad-render`, {
        method: 'POST', credentials: 'same-origin',
        headers: {'content-type': 'application/json', 'x-csrf-token': csrfToken},
        body: JSON.stringify({observation, deliveryToken}),
      });
      if (!response.ok) throw new Error('render_ack_failed');
      return response.json();
    },
  });
  try {
    const receipt = await acknowledge({
      node: card, award: ad.award, deliveryToken: ad.deliveryToken,
    });
    showAcceptedDelivery(receipt);
  } catch (error) {
    showDeliveryPending(); // Do not claim acceptance or payment.
  }
}
```

Your app supplies the authenticated turn route, CSRF token, slot and UI callbacks.
Render the exact approved plain text and HTTPS destination, keep Sponsored visible,
and style the card natively. Do not put the ad inside the answer.

Your same-origin server route must authenticate the user, check CSRF, load the
saved turn belonging to that user, and use its saved award/token. Do not build an
arbitrary forwarding proxy or accept browser-selected prices or recipients:

```js
// After authentication, CSRF validation and loading the user's saved turn:
if (savedTurn.ad.status !== 'awarded') throw new Error('no_award');
if (body.deliveryToken !== savedTurn.ad.deliveryToken) throw new Error('wrong_token');
const receipt = await axp.acknowledgeRender({
  awardId: savedTurn.ad.award.id,
  deliveryToken: savedTurn.ad.deliveryToken,
  observation: body.observation,
});
await saveReceipt(savedTurn.id, receipt);
return receipt;
```

The helper observes a connected card, exact creative text and destination, and
a visible Sponsored label. It deduplicates in-flight and accepted observations
per helper instance. Server-side identity and recovery remain necessary across
tabs, reloads and restarts. A receipt confirms an accepted app-reported insertion,
**not human attention or ad effectiveness**.

## React (optional)

```jsx
import {SponsoredCard} from '@axp001/publisher-sdk/react';

<SponsoredCard
  award={ad.award}
  deliveryToken={ad.deliveryToken}
  acknowledge={acknowledge}
  onReceipt={handleReceipt}
  onError={handlePendingDelivery}
/>
```

Use only for an awarded result, below the answer. `acknowledge` is the browser
helper shown above, connected to your same-origin server. The adapter ships
compiled JavaScript and TypeScript declarations; consumers need no TSX loader.
React is an optional peer, not installed for non-React apps.

## Recover without creating a new purchase

```js
const opportunity = await axp.lookupOpportunity({sessionId, turnId});
const delivery = await axp.lookupDelivery({awardId, deliveryToken});
```

These authenticated lookups are read-only. An opportunity can be `not_found`,
`pending`, `unknown` or `resolved`; a delivery can be `reserved`, `expired`,
`failed` or `accepted`. Preserve the original IDs, result and delivery token.
An accepted delivery returns its saved receipt. Pending or unknown is not a
reason to invent a new turn or mark a delivery paid. A timeout is not cancellation.
If you know the card was never inserted, report the original award with
`axp.failRender({awardId, deliveryToken, reason: 'render_failed'})`.

`requestAd` returns explicit error results rather than throwing transport errors.
Lookup, acknowledgement and failure methods throw `PublisherSDKError`, with a
safe `code` and optional HTTP `status`. Request timeout defaults to 15s; receipt
timeout defaults to 45s. Both are configurable from 1–120,000ms.

## Accounting is separate from settlement

An award reserves budget; an accepted insertion creates a charge. Neither proves
a completed payout. Use returned financial metadata: synthetic credits and native
test-network USDC are different modes. Never infer mainnet funds or settlement
from `status: 'accepted'`, a model decision, or a signature field. Native account
funding and payout require separately verified wallet/channel bindings and payer
authorizations. This SDK does not create a wallet or sign transactions for you.

Use `@axp001/publisher-sdk/financial` for presentation, and
`@axp001/publisher-sdk/receipt` for structural receipt validation. Structural
validation is not independent cryptographic signature verification.

## References

- [Account integration documentation](https://github.com/AkshatGada/axp-one/tree/main/docs/accounts)
- [Source and integration tests](https://github.com/AkshatGada/axp-one/tree/main/tests/publisher-sdk)
- [Report an SDK issue](https://github.com/AkshatGada/axp-one/issues)
