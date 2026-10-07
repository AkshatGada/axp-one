# User-operated product demo

The advertiser dashboard and publisher chat are live at https://axp.one and use
a durable encrypted private Blob workspace. Local development uses separate SQLite state.
They are additive to the existing MVP explorer, saved V3 runs, verification pages,
presentation and recorded Devnet evidence. Those original artifacts remain separate
from the new product workspace; their campaigns and money are never merged.

## Hosted presentation (no local server)

Open [the dashboard](https://axp.one/advertiser-dashboard/),
[the chat](https://axp.one/publisher-demo/), [the SDK guide](https://axp.one/sdk/)
and [the recorded product walkthrough](https://axp.one/demo/).
Use the keyboard judge flow below against this hosted workspace. Do not start
another local signing authority or seed/reset the already-funded hosted channels.
The three prepared advertisers are ClearVault, KeyArc and ColdNest; create HarborKey
as the fourth. Read `/api/product/publisher/config` and `/api/product/bootstrap`
for current readiness and caps. The initial inventory and budgets can change
through actual user actions; refresh the dashboard before presenting.

The edited recording is 1:53 at 1080p and includes finalized 0.003 test-USDC payout
and 0.017 refund. Repeated idle holds were cut; retained interactions and external
operation waits play at their recorded speed. Its separate four-channel recording workspace was fully closed.
[Public recording evidence](../../artifacts/product/recorded-walkthrough/acceptance.json)
is distinct from the live presentation inventory. The original MVP recording and
its historical provider/payment modes remain available under `/mvp/`.

Before presenting, inspect channel expiry and readiness. Native voucher expiry is
fixed at 24 hours from preparation, with an earlier signing deadline. Never reset
funded state to extend it; reconcile and close existing identities through the
coordinated payment workflow. Local commands below are for explicit development
or an operator-managed separate workspace, not required to use axp.one.

## Execution and payment modes

| Path | Current behavior | Evidence to show |
| --- | --- | --- |
| Advertiser setup | Saved account, editable drafts, advertiser-authored hints, declared capabilities, approved creative and immutable launched campaign | Dashboard campaign and its saved values |
| Organic answer | A fresh independent `deepseek-flash` API request for each newly submitted turn when DeepSeek is configured | Answer model and `answerMode: actual-api-model`; no advertiser material in its supplied prompt |
| Buying decision | Eligible campaigns are evaluated through Jev; advertiser-authored hints are separate model inputs | Decision provenance, declared hints, exclusions and retrieved evidence in the turn trace |
| Card delivery | Approved copy is inserted with a separate literal Sponsored label; the app acknowledges exact insertion | Accepted signed receipt and one charge ID |
| Financial accounting | Backend-selected `synthetic` credits or `devnet` native Test USDC channels; reservation, accepted charge, cumulative authorization, settlement and refund remain separate | Explicit `financialMode`, channel phase, saved voucher totals and finalized transaction evidence |
| Devnet funding | The shared demo sponsor has been funded for authorized native integration; synthetic workspaces remain separate | Native confirmed deposit and finalized payout/refund evidence, rather than wallet balance alone |

Jev and DeepSeek being real API calls does not make the financial ledger a real
payment channel. A signed receipt authenticates an app insertion/disclosure
assertion. It does not prove human attention, viewability, clicks, conversion or
organic endorsement. A preview is only an eligibility/copy check: `previewOnly`
and `providerCalls: 0`, with no Jev judgment or predicted win.

The user funded the fresh product demo sponsor with 5 Devnet SOL and 20 Circle
Devnet test USDC and authorized native integration. A connected acceptance run
subsequently finalized both channel deposits and both closes, as recorded below.
Wallet funding alone does not establish those outcomes. Keep wallet readiness,
backend financial mode and finalized product evidence separate. Advertiser
identities have separate channels funded by the shared server-held demo sponsor;
they are not claims of external advertiser wallet ownership. Native acceptance
is established by the connected run and its finalized transaction records, not by UI
or offline fixture tests.

## Local startup

Requirements: Node 22.18+ and installed workspace dependencies. From the repository
root, use the existing ignored `.env.local` configuration for `DEEPSEEK_API_KEY`
and `JEV_API_KEY` (or the supported `TYPESAFE_API_KEY` alias). Process environment
variables override that file. Never put provider keys in `NEXT_PUBLIC_*`, browser
code, screenshots, prompts or committed files.

For a **synthetic rehearsal**, prepare a separate ignored workspace with three active
fictional hardware-wallet advertisers: ClearVault, KeyArc and ColdNest. Preparation
makes zero provider calls and no native transactions. It does not touch the existing
product workspace or original MVP data.

```sh
node scripts/product/prepare-demo.mjs
AXP_PRODUCT_FINANCIAL_MODE=synthetic AXP_PRODUCT_DEVNET_SIGN=0 \
AXP_PRODUCT_DEMO_MODE=1 AXP_PRODUCT_STATE_DIR=local-state/product-presentation npm run demo:product
```

`npm run demo:product` reads the financial mode and workspace selected in ignored
`.env.local`; it does not guarantee an empty or synthetic workspace. Use the explicit
synthetic flags above when rehearsing with local credits. To rehearse the
three-to-four advertiser story again, stop the presentation server and run
`node scripts/product/prepare-demo.mjs --reset`, then restart the command above.
**Do not run this reset against a funded native workspace.** Stop and inspect its
channels; coordinate settlement before replacing native state.
Reset preserves the previous synthetic presentation directory as an ignored backup before
preparing the three seeds. Do not reset a running workspace.

The product origin is `http://127.0.0.1:3430`. Its Next UI upstream is port 3432
with polling enabled; interact through port 3430 so UI and API share one origin.
The launcher creates ignored state in the selected product directory, including
the publisher server key and receipt signing key. Startup does not submit an
organic question, buy a placement or sign a wallet transfer. A chat submission
makes a real configured DeepSeek request and can invoke Jev for eligible campaigns.

Open:

- [Advertiser dashboard](http://127.0.0.1:3430/advertiser-dashboard/)
- [Publisher chat](http://127.0.0.1:3430/publisher-demo/)
- [Publisher configuration](http://127.0.0.1:3430/api/product/publisher/config)

Before presenting, check configuration reports `organic.ready: true`, organic
execution `actual-api-model`, model `deepseek-flash`, and Jev readiness. Missing
DeepSeek returns `503 organic_key_unavailable`; the main product has no canned
replacement answer. Do not claim a real answer from an injected fixture, a stored
replay or a configuration value alone. The returned answer and its actual turn
provenance establish what ran.

The current caps are 20 admitted organic requests per UTC day and the configured
Jev daily cap (50 by default). Failed or uncertain provider admissions count. A
same-turn retry does not silently issue a new paid request. A newly submitted user
question has a fresh turn identity and is a new call. An explicit new conversation
changes frequency scope, not campaign spend or daily provider caps.

## Keyboard judge flow

1. Open the dashboard and show the three actual active advertisers: ClearVault,
   KeyArc and ColdNest. The **Demo autofill** switch is enabled by the presentation
   server's explicit demo flag and remains visible and editable. Select **Create
   advertiser & campaign**. A brand and website origin define a distinct advertiser
   inside the agency workspace.
2. The empty Campaign name field receives focus. Press **Tab** once to fill the
   entire blank Offer step with HarborKey launch, HarborKey, its HTTPS website and
   hardware-wallet description. Review the editable values, then Continue (or Enter
   from the field). The next Tab navigates normally. Suggestions never overwrite
   filled fields or intercept Shift+Tab, buttons, selectors or capability search.
3. Context focuses the empty hints textarea. Press **Tab** once to fill the supplied
   advertiser-authored Jev hints. Tab to **Use suggested capabilities** and press
   **Enter** to explicitly declare Crypto custody, Hardware wallets, Offline key
   storage, Ethereum and Solana. Continue. These declarations are hard eligibility
   facts; the hints are model guidance, separate from retrieved ContextHint history.
4. On Creative, press **Tab** in the empty field to fill the exact Sponsored copy:
   “Keep your keys offline with HarborKey. A hardware wallet for Ethereum and Solana
   self-custody.” Inspect the separate live card preview. Previewing or filling
   suggestions does not call Jev, count a delivery or predict a win.
5. On Spend, press **Tab** in the empty amount field to fill 0.004 maximum bid,
   0.016 campaign cap and 0.02 channel deposit in Devnet test USDC (or a 0.02
   test-credit allocation in a synthetic workspace). Review and Continue. The
   **Fill this step** button provides the same visible alternative on each setup
   step. Existing amounts remain unchanged.
6. Review the fourth advertiser, its hints, declarations, exact copy and limits.
   Explicitly check the approval acknowledgement and Launch. Tab never approves,
   launches or purchases. The backend saves the draft, approval and immutable
   campaign version. In Devnet, **Fund channel & launch** opens the approved
   channel and activates the campaign only after deposit finality. The active-advertiser count now comes from four persisted
   advertiser identities, rather than a UI fixture.
7. Open Publisher chat. With its explicit demo autofill enabled, **Tab** in the
   empty composer fills a hardware-wallet comparison question; **Enter** submits a
   fresh turn. The independent DeepSeek answer and complete Jev buying/auction/
   delivery path execute separately. Show the actual `deepseek-flash` answer when
   it arrives, the separate Sponsored card if awarded, and accepted delivery.
8. Open **View internals**. Inspect actual candidate eligibility, advertiser hints,
   retrieved evidence or its unavailability, Jev decisions, bid policy, auction,
   award reservation, exact insertion acknowledgement and accepted receipt/charge.
   The question and suggested bids do not force HarborKey to win. If there is
   no-fill, present its recorded reason. Return to the dashboard to show real
   accepted spend, reservation, authorization and mode-specific settlement states.

Optional inspection after the core story: replay an accepted receipt to show its
unchanged charge ID; ask a fresh turn to demonstrate the per-conversation frequency
cap; pause an advertiser's campaign and inspect its exclusion. A new conversation
never resets campaign spend. Synthetic closing remains a test ledger operation. Native closing must show
finalized Solana Devnet publisher payout and unused-deposit return. The original
recorded MVP Devnet channels remain separate.

## Technical review: publisher SDK

The hosted [SDK guide](https://axp.one/sdk/) and
[SDK README](../../packages/publisher-sdk/README.md) are the technical-review entry
points. Use `AXP_EXCHANGE_URL=https://axp.one/api/product` with a server-only key
provisioned for that hosted workspace. Do not use an unrelated locally generated
key. The public config endpoint never issues credentials. For local development,
start its example in a second terminal after the product server has created its
ignored publisher key:

```sh
AXP_EXCHANGE_URL=http://127.0.0.1:3430/api/product \
  node packages/publisher-sdk/examples/server.mjs
```

Open [SDK example](http://127.0.0.1:3433). The server reads the publisher key locally
and keeps it out of the browser. The SDK example reads the key from the selected `AXP_PRODUCT_STATE_DIR` (merged
server environment and ignored `.env.local`), falling back to `local-state/product`.
For the native presentation, use `AXP_PRODUCT_STATE_DIR=local-state/product-devnet-presentation`
when starting the example, or use the same value already selected in `.env.local`.
`AXP_PUBLISHER_API_KEY` overrides the local key file; never print it. A key from
another workspace will not authenticate this inventory. It requests the same user-created campaign
inventory through the reusable SDK. The example forwards an independent question to the live DeepSeek answer endpoint
on the product server and requests ads through the SDK in parallel. It requires
configured DeepSeek and holds an award until the answer arrives. Use the main
publisher chat for the full View internals judge flow. SDK ad requests can invoke
configured Jev. The SDK's purpose
here is to show server request, native card rendering and exact receipt forwarding
without changing an app's independent organic model path.

## Failure behavior

- Missing DeepSeek configuration is a setup requirement, not a reference answer.
- A failed or uncertain organic turn is not automatically reissued. Submit a new
  turn explicitly for a fresh call after resolving the failure.
- Missing Jev configuration, malformed model output, a deadline, cap or eligibility
  exclusion has explicit provenance and no forced bid. The organic request remains
  independent.
- An unrendered award is not a charge. Exact accepted insertion/disclosure is needed.
  Explicit failure releases a reservation; otherwise expiry does.
- Reconcile an uncertain receipt using the same award, token and observation. An
  accepted duplicate returns the original charge, rather than purchasing again.
- Editing a draft invalidates approval. Launched campaigns are immutable; duplicate
  into a new draft to revise the offer or hints.

## Focused verification

```sh
node --test tests/product/*.test.mjs
node --test tests/publisher-sdk/*.test.mjs
```

Product tests use isolated temporary SQLite state and injected provider fixtures.
They cover approval invalidation, immutable launch, separate Jev hints/capabilities/
evidence, eligibility exclusions without model calls, exact receipt and monetary
replay, hostile monetary hints, provider response validation, durable uncertain
admissions, fresh organic turns and independent organic prompt construction. The
DeepSeek wire fixture verifies the pinned model, disabled thinking, bounded output,
strict response handling and no automatic retries. The native product tests use
explicit offline payment transport fakes to cover durable draining, exact cumulative
vouchers, duplicate receipt identity, lost acknowledgements/signature recovery,
positive and zero-charge refunds, and pre-signing limits. Fixture transaction counts
and fixture finality do not establish actual network outcomes. These tests make no paid calls
or wallet changes, and do not establish actual provider behavior or decision quality.

Secrets and local state are ignored by `.gitignore` (`.env.*` except `.env.example`,
`local-state/`, private-key PEMs and SQLite files). Preserve those exclusions and
never commit or print their contents. Keep existing MVP/V3 harnesses, replay bundles
and original public routes intact when presenting or extending the new workspace.

## Connected native acceptance (2026-10-07 Singapore time)

The connected product acceptance ran a fresh `deepseek-flash` answer and actual Jev
buying decisions, then exact Sponsored DOM insertion and a signed receipt. Its one
accepted charge authorized 3,000 base units (0.003 test USDC). Replaying that receipt
returned the same charge without another economic operation.

| Accepted channel | Finalized deposit | Accepted and authorized spend | Finalized publisher payout | Finalized unused-deposit refund |
| --- | ---: | ---: | ---: | ---: |
| Delivery channel | 20,000 (0.02 test USDC) | 3,000 (0.003 test USDC) | 3,000 (0.003 test USDC) | 17,000 (0.017 test USDC) |
| Zero-delivery channel | 200,000 (0.20 test USDC) | 0 | 0 | 200,000 (0.20 test USDC) |

Both channel openings and both closes reached finalized Solana Devnet evidence.
The positive close conserves its exact deposit: 3,000 paid plus 17,000 refunded;
the zero-charge close refunds the full deposit without a voucher charge. SOL
network fees and rent are separate from these test-USDC amounts. These are actual
connected results, not the synthetic transport fixtures used by the test suite.
The public record is [devnet-acceptance.json](../../artifacts/product/devnet-acceptance.json),
observed at `2026-10-06T18:47:01.259Z` (2026-10-07 in Singapore). It also records
payer token balance 20 → 19.997 test USDC and publisher balance 0 → 0.003 test
USDC, plus unchanged economic results after restart and repeated settlement.

The independent read-only verifier checks all four signatures against Solana
Devnet, native program binding, exact token deltas, network fees and deposit
conservation:

```sh
node scripts/product/verify-devnet.mjs
```

This command reads public RPC evidence; it loads no wallet, signs or broadcasts
nothing, and makes no model calls. It verifies network results, not the quality of
Jev decisions or the answer. The artifact's model and browser-flow assertions
summarize the separate connected acceptance observations.
The original MVP evidence, synthetic workspaces and these completed acceptance
channels remain distinct from the fresh judge presentation inventory.

## Native payment presentation

Start the authorized native mode with the existing server-held wallet and a
separate durable workspace. The ignored `.env.local` may select these same values;
process overrides below make the intended workspace explicit:

```sh
AXP_PRODUCT_FINANCIAL_MODE=devnet \
AXP_PRODUCT_DEVNET_SIGN=1 \
AXP_PRODUCT_STATE_DIR=local-state/product-devnet-presentation \
AXP_PRODUCT_DEMO_MODE=1 npm run demo:product
```

`AXP_PRODUCT_DEVNET_WALLET_PATH` can select the existing ignored wallet file; the
default is `local-state/product/secrets/devnet-wallet.json`. Never print or copy
the file into the UI. With that server running, prepare the three initial advertisers
through normal API draft, approval and launch actions:

```sh
npm run demo:prepare-devnet
```

This script opens finalized 0.20 test-USDC channels for ClearVault, KeyArc and
ColdNest, each with a 0.10 test-USDC campaign cap and its saved maximum bid. It
makes no Jev or DeepSeek calls, but it **does fund native channels**; preparation
is a signing action already authorized for this demo. It preserves existing seeds
and refuses to treat pending, closed or uncertain seeds as ready. It never resets
funded state. Confirm the dashboard has three active, finalized channels before
starting the keyboard story above; the presenter then creates HarborKey as the
fourth advertiser with a 0.02 test-USDC channel deposit. Keep the completed acceptance
workspace separate so the live presentation starts with unspent inventory.

Native voucher expiry is frozen at 24 hours from channel preparation. The signing
application deadline is earlier (23 hours 45 minutes), with a settlement margin;
close channels before that deadline. Expired or uncertain identities are never
silently refreshed or re-signed. Do not reset a funded workspace to renew a demo;
inspect and reconcile/close its existing channels first. All advertiser channels
share the server-held demo sponsor and publisher custody; this does not implement
independent advertiser wallet deposits or mainnet payments.

Native bounds are at most eight channels, 2 Test USDC total deposits and
0.1 Devnet SOL in aggregate fee/rent reserve. Each campaign has at most
0.2 Test USDC deposit, 0.1 Test USDC spending cap and 0.004 Test USDC maximum bid.
These ceilings are backend authority; form limits cannot expand them. Confirm `/api/product/bootstrap` reports `financialMode: devnet`,
`payments.network: solana-devnet` and `payments.ready: true` before native launch.
No browser or advertiser form controls keys, signing authority, network, mint,
fee/rent limits or publisher payee. The original MVP and synthetic workspaces are
unchanged. Synthetic preparation/reset commands above
are for unfunded synthetic rehearsals.

1. In Spend and Review, verify the exact Test USDC bid, cap and channel deposit.
   Select the approval checkbox and **Fund channel & launch**. Wait for opening
   finality; an opening or uncertain campaign does not compete.
2. After a fresh publisher question and accepted Sponsored insertion, inspect one
   accepted charge, its saved cumulative authorization and unchanged campaign
   spend. Acceptance creates the charge; authorization does not charge it again.
3. Inspect Devnet opening transaction, confirmed deposit and cumulative voucher
   sequence. Pause/resume uses this same channel.
4. Select **Close & settle Test USDC** when the backend enables it. Wait through
   draining/settlement pending, then show finalized publisher payout and unused
   deposit return, transaction signatures, finality and token deltas. Inspect SOL
   fee/rent evidence separately from Test USDC charges. In the chat, select
   **Refresh payment records** in the Payment stage to read the newly finalized payout/refund
   without another question, model request or signing operation.
5. An unsigned opening blocker can expose **Retry saved channel opening**. It
   refetches current state and reuses the same campaign; it never retries signed
   or uncertain identities.
6. If a result is uncertain, use **Reconcile status** to look up its saved identity.
   When certainty is restored and accepted charges still exceed the authorized
   total, **Authorize accepted deliveries** advances only the durable charge
   ledger. Do not issue a fresh deposit or reset the workspace to recover a timeout.

The advertiser UI’s focused fixture tests cover explicit financial-mode labeling,
pending/uncertain launch language, exact accepted-ledger recovery controls and
Devnet-only explorer links. They make no native or provider calls and cannot
establish current chain finality, payout or refund.
