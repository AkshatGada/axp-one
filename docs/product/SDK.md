# Publisher SDK integration

AXP adds one separately disclosed Sponsored card below an AI app's independent
answer through **Request → Render → Acknowledge**. Your app keeps its own model,
answer generation, user authentication, durable turn storage and interface.

## Account-owned integration

1. Sign in at [axp.one/account](https://axp.one/account/) and create an AI-app profile.
2. Save supported origin/category restrictions and issue the app's server key.
3. Run `npm install @axp001/publisher-sdk@0.2.1` and configure
   `https://axp.one/api/accounts/sdk` explicitly as its base URL.
4. Request alongside the independent answer, render the approved card below it,
   then forward its observed insertion through your own authenticated server route.
5. Save the original turn, award and receipt. Recover with read-only opportunity
   and delivery lookups rather than inventing a replacement purchase.

The [package README](../../packages/publisher-sdk/README.md) is the canonical
installation and code guide. It includes ESM/browser/React exports, request/result
contracts, same-origin acknowledgement, receipt binding and restart recovery.
Version 0.2.1 is [published on npm](https://www.npmjs.com/package/@axp001/publisher-sdk)
under the MIT license for the SDK only.
See the [release verification](../sdk-cleanroom/NPM_RELEASE.md).

```js
// Your application server only; never ship the key to a browser or answer model.
import {AXPPublisher} from '@axp001/publisher-sdk';

const axp = new AXPPublisher({
  apiKey: process.env.AXP_APP_SDK_KEY,
  baseURL: 'https://axp.one/api/accounts/sdk',
});
```

Installing the SDK does not enable inventory or native payments. The account
integration currently uses synthetic accounting with broadcasts disabled.
Readiness indicates configuration, not a guaranteed matching ad or winning bid.
No-fill and errors leave the independent answer usable.

## Application responsibilities

- Persist stable session/turn IDs and the original request before its first POST.
- Send only context the app has permission to share; do not send private histories
  by default or include advertiser material in the answer model's input.
- Authenticate the app user and validate CSRF before forwarding a render observation.
- Load the user's saved award/token on the server; never accept arbitrary prices,
  recipients or an unrestricted exchange-forwarding path from the browser.
- Render exact approved plain text, HTTPS destination and visible Sponsored
  disclosure below the answer. Keep the answer independent of ad availability.
- Bind accepted receipt results to the saved award's ID, hash, amount and mode.
- Preserve unknown/pending states; timeout is not cancellation. SDK retries are explicit.

App keys are server-only, scoped and independently revocable. Human sign-out does
not revoke an app's server credential. An accepted receipt establishes app-reported
insertion and disclosure, not human attention, conversion or completed payout.

## Shared demonstration compatibility

The older operator-provisioned shared demo integration uses `/api/product`.
The SDK constructor retains that default for compatibility. Account-issued app
keys require `/api/accounts/sdk` explicitly and cannot be substituted for shared
demo credentials. Public configuration never issues a credential.

The example chat's organic provider is DeepSeek; Jev evaluates advertising fit.
Neither choice is imposed on an integrating app's answer model.

## Settlement metadata

`financialMode` identifies synthetic accounting versus native testnet execution.
`settlementNetwork` independently identifies a rail. Native shared-workspace
integration supports `solana-devnet` (test USDC) and `tempo-testnet` (test PathUSD)
where the corresponding server capability is enabled. Omitted legacy native
network values mean Solana. Cross-rail campaigns are excluded before Jev.

Token metadata and payment recipients come from trusted server configuration,
not browser-supplied amounts/addresses. Keep each currency separate. Switching
rails requires a fresh conversation/session; an explicit retry retains the
original input, identities and rail.

Solana closes against the latest cumulative authorization and returns unused
collateral. Tempo can first pay the earned delta while the same channel remains
open, then close and refund. Payout does not replenish the campaign cap. The SDK's
financial helpers format validated public metadata and construct pinned network
links; they do not query a chain, sign or authorize transfers.

See [settlement interfaces](TEMPO_INTERFACE.md),
[native lifecycle evidence](TEMPO_VERIFICATION.md),
[account contracts](../accounts/CONTRACTS.md) and
[verification scope](../VERIFICATION.md).
