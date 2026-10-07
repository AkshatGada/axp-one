# Publisher journeys

Implemented publisher journey, updated 7 October 2026. Public chat:
https://axp.one/publisher-demo/. Integration guide: https://axp.one/sdk/.
The publisher is the AI app operator. Advertisers create campaigns in the new
dashboard; this chat requests the same durable hosted inventory. Saved V3 recordings
remain separate read-only evidence.

## Developer: connect an AI app

1. Read publisher configuration: publisher ID, financial mode, buyer-engine
   readiness, supported placement and capabilities. Use `https://axp.one/api/product` and have the workspace operator provision
   a publisher key for that workspace; put it
   in a server environment variable. No key enters the browser or model context.
2. Import the dependency-free Node SDK. Keep one random session ID per conversation
   and one stable turn ID per user submission. Declare required capabilities and
   category exclusions when the app knows them.
3. Start the ad request alongside the app's existing answer request. The answer
   receives only the conversation; no advertiser creative, context hints,
   retrieved historical evidence or bid context enters its prompt. The buying path
   independently evaluates eligible user-created campaigns through Jev when
   configured, with actual engine provenance and errors exposed in the trace.
   Display answer tokens or the completed answer immediately when available.
4. An award reserves its exact price. Render a separate native card using the
   approved text, destination and literal Sponsored label. A no-fill or request
   error or deadline leaves the organic response usable and the slot empty.
5. Inspect the connected DOM, exact text, destination, disclosure and award binding.
   Only then send the observation through the app's backend with the scoped delivery
   token. The backend signs the receipt; browser code has no signing authority.
6. Inspect accepted receipt, charge and campaign spend. A reservation is not spend;
   accepted accrual is distinct from authorization, payout and refund. Rendering proves
   the app's observation, not human attention, conversion or endorsement.

## Chat user: ask and understand sponsorship

1. Open the reference publisher chat and ask an arbitrary question. Example prompts
   help discover supported inventory, but no fixed scenario runs automatically.
2. Choose a suggested question to autofill the composer, or press Tab in an empty
   composer for the hardware-wallet question. Edit it, then press Enter to send;
   Shift+Enter inserts a line, and subsequent Tab/Shift+Tab keep normal focus navigation. Each
   send creates a fresh turn and a fresh DeepSeek organic request. Without configured
   DeepSeek, sending is disabled with a setup requirement; no fixture is passed off
   as a live answer. A configured organic adapter uses only the sanitized question.
3. If an eligible active dashboard campaign wins, see its separate Sponsored card.
   Open its HTTPS destination optionally; no click is required for delivery.
4. See a clear no-fill when inventory, policy, frequency or budget prevents an award.
   Open “View internals” to inspect eligibility, observed/inferred evidence, actual buyer engine, decisions, campaign hints,
   exclusions and deadlines. Real Jev decisions and the reported financial mode
   are independent labels; one never implies the other.
5. Continue asking questions in the same session to exercise frequency limits.
   Start a fresh conversation to create a new random session and empty chat history.
   This changes conversation frequency scope; it never resets campaign spend.

## Failure and recovery

| Situation | User experience | Integration behavior |
| --- | --- | --- |
| Ads time out or API fails | Answer remains usable; ad path shows its failure | No automatic new purchase; retry explicitly with the original session and turn |
| DeepSeek unavailable | Composer explains the missing provider and links integration help | Sending is disabled; no deterministic replacement |
| DeepSeek fails after a send | Honest organic error, independent ad result | No automatic organic call replay; a new submission is a new turn |
| No campaign matches | Answer plus concise no-fill state | No card, receipt or charge |
| Creative or disclosure differs | Card delivery is not acknowledged | Explicit render failure; preserve organic answer |
| Receipt request is uncertain | Card remains; internals shows unconfirmed delivery | Retry the same award/token/observation; server returns the original accepted result |
| Award expires before acknowledgement | Delivery is rejected; no success claim | No replacement purchase on that turn |
| App omits or cannot render an award | Organic answer remains | Explicit fail releases reservation, otherwise server expiry does |
| Browser refresh | New turns use the existing random conversation session | No automatic replay or new purchase |

## Acceptance story

Create and activate a campaign in the advertiser dashboard. Ask a matching question
in `/publisher-demo`, inspect the actual Jev decision provenance, award and separate card, then inspect the accepted
receipt and dashboard accrual. Repeat two fresh turns in the same session to observe
frequency policy; ask an unrelated question for no-fill. Pause the campaign and
ask again. Retry one accepted render and confirm its charge ID is unchanged.
When using synthetic mode, this workflow uses test credits and does not establish
payment network activity. Devnet mode is a separate, explicitly selected workspace.

In a Devnet workspace, the advertiser dashboard opens a channel with actual test
USDC. The Payment stage shows the finalized deposit transaction independently of the auction.
Accepted delivery creates one charge and the backend authorizes its cumulative
off-chain voucher. The publisher browser never signs, selects a recipient or sends
a transfer. Unknown or blocked authorization is shown as accepted but unpaid and
requiring reconciliation. After the advertiser settles and closes the channel,
select “Refresh payment records” in the Payment stage to read the finalized payout/close evidence,
publisher/treasury/payer token deltas, refund, fees and reclaimed rent. This refresh
does not invoke Jev, DeepSeek or the payment signer. Submitted or uncertain
transactions do not count as finalized proof. Synthetic workspaces continue to use
test credits and carry no native transaction claims.


The connected acceptance on 2026-10-07 Singapore time (recorded
`2026-10-06T18:47:01.259Z`) finalized a 20,000-base-unit deposit,
one 3,000-base-unit accepted/authorized delivery, a 3,000-base-unit publisher payout
and a 17,000-base-unit refund. A second 200,000-base-unit deposit closed with zero
charges and a full 200,000-base-unit refund. Both openings and closes were finalized;
the organic answer used fresh `deepseek-flash` and the buyer used actual Jev.
Duplicate receipt acknowledgement returned the same charge. These connected results
are recorded in [the public acceptance artifact](../../artifacts/product/devnet-acceptance.json),
and are distinct from offline fixture finality or transaction counts.
`node scripts/product/verify-devnet.mjs` independently reads all four public
transactions and verifies finalized signatures, channel-program binding, test-USDC
deltas, network fees and conserved deposits. It uses no wallet, signing or model
requests. The record also reports receipt identity preserved and no additional
payments after service restart; its model assertions describe the connected run.

The public presentation uses the existing hosted workspace; no local server or
additional seed command is required. Do not initialize another signing authority
for its existing channels. For a separate local presentation, start the explicitly configured Devnet product server
with `AXP_PRODUCT_STATE_DIR=local-state/product-devnet-presentation`,
`AXP_PRODUCT_FINANCIAL_MODE=devnet`, `AXP_PRODUCT_DEVNET_SIGN=1` and
`AXP_PRODUCT_DEMO_MODE=1`, then run `npm run demo:prepare-devnet`. Preparation
funds three finalized channels for ClearVault, KeyArc and ColdNest, with zero model
calls. The presenter creates HarborKey as advertiser four using editable Tab
suggestions, then sends the editable chat question with Tab followed by Enter.
These fictional advertiser identities have real test-USDC channels funded by one
shared server-held demo sponsor, not independent advertiser wallet custody. The
original MVP and synthetic workspace stay separate. The publisher SDK example must
read the key from this selected state directory (or the server's explicit
`AXP_PUBLISHER_API_KEY` override), never an unrelated workspace key.

Voucher expiry is frozen at 24 hours after preparation, with an earlier signing
application deadline and settlement margin. Close before that deadline; do not
reset funded state or silently refresh an expired/uncertain channel identity.
See [the presentation runbook](PRODUCT_DEMO.md) for exact startup and settlement steps.

## Research reference

The developer lifecycle is informed by Gravity's official
[overview](https://docs.trygravity.ai/introduction/overview),
[AI platform quickstart](https://docs.trygravity.ai/ai-platforms/quickstart),
[JavaScript and React SDK guide](https://docs.trygravity.ai/sdks/javascript), and
[rendering guide](https://docs.trygravity.ai/ai-platforms/show-ads), reviewed
2026-10-07. These establish the useful parallel server request and native disclosed
rendering pattern. AXP's API, exact render receipts, explicit retry identities and
financial accounting are its own implementation. No Gravity code or pixel is used.

## Conversation-first interface

The public view is a quiet chat: a user question, the fresh independent answer,
a separate Sponsored card and a **View internals** button below it. Settings are
optional and open separately. The inspector never opens automatically on a new
submission. No receipt, budget, engine telemetry or setup panels occupy the chat.

The judge opens a focus-contained dialog with two independent visual request lanes.
Five selectable stages show one set of evidence at a time: Context, Buyers, Auction,
Delivery and Payment. The auction starts selected and compares exact admitted bids
on a shared zero-based scale, with the winner highlighted and the floor marked.
Buyer context, ContextHint evidence, raw records, hashes and voucher details expand
on demand. Payment preserves the distinction between accepted spend, authorization
and finalized payout/refund. Refresh is read-only; receipt replay stays bound to the
same award. Arrow keys select stages; Escape closes the view and restores focus.
The composer retains editable Tab autofill and Enter submission.
