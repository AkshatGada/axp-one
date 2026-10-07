# Advertiser dashboard journeys

This surface creates and operates new persisted campaigns. The public entry is
[https://axp.one/advertiser-dashboard/](https://axp.one/advertiser-dashboard/). Updated
7 October 2026. Ledger v2 supplies the visual language and components.
The backend declares either synthetic test credits or native Solana Devnet payments.
Synthetic workspaces have no wallet transfer. Native workspaces use Test USDC
from a shared server-held demo sponsor, with separate advertiser channel identities.
These channels do not establish external advertiser wallet ownership. Actual campaign buying decisions use Jev when configured;
provider readiness and provenance are labelled explicitly.

## First campaign

1. An empty workspace explains the purchased event: a disclosed Sponsored card
   inserted into a participating publisher app. The operator creates an agency workspace
   with a name and website. One workspace can manage distinct advertisers; each
   advertiser is identified by its brand and website origin. No invented performance appears.
2. Create a campaign from a blank draft or an explicitly labelled example preset.
   A five-step editor groups Offer, Context, Creative, Spend and Review.
3. Offer records the campaign name, brand, destination and product description.
   Context records advertiser-authored hints that guide Jev, separately from
   factual capability declarations used for hard eligibility. These editable hints
   are not retrieved ContextHint historical evidence or audience identities.
4. Creative shows the exact approved Sponsored text beside the editor. A question
   can be checked against deterministic eligibility and copy rules. Preview does
   not invoke Jev, predict a win or count as delivery. Actual Jev judgment happens
   when a publisher submits an opportunity.
5. Spend uses decimal Test USDC or synthetic test-credit inputs converted exactly to six-decimal integer
   strings. The backend enforces maximum bid, total campaign cap and deposit.
6. Review summarizes the saved offer, contexts, creative and limits. Launch is an
   explicit action against the saved draft after a review acknowledgement and
   stored creative approval. Editing invalidates approval; launched versions are
   immutable. Saving and validation errors preserve the draft. A native launch attempt
   moves to payment status so an uncertain response cannot invite another deposit.
7. After launch, a clear next action opens the publisher demo, where the campaign
   can compete and a browser can acknowledge insertion. Delivery and spend appear
   only after the backend accepts the corresponding records.

## Returning advertiser

The campaign list offers status/search filters and saved drafts. Open a draft to
resume the editor. Open an operating campaign to see its actual delivered cards,
available cap, reserved awards, accepted spend, cumulative authorization,
settlement and refund in the explicit workspace financial mode. Reservations are not charges; authorization and
settlement do not add spend. Pause stops new competition;
resume reopens it. Duplicate creates a separate draft. Refresh reconciles server
state without inventing progress. The account can be edited separately.

## Failure and evidence boundaries

API unavailability has a retry action and preserves local edits. Validation errors
attach to fields; the editor focuses the first invalid field. Mutation failures
remain visible and do not claim success. Busy controls prevent repeat submissions.
A saved draft is distinguished from unsaved changes. Empty delivery tables explain
how to create a real event using the publisher demo. Delivery means card insertion,
not attention, impressions, clicks or conversions. No chart or effectiveness metric
is fabricated. Money labels consistently identify Test USDC on Solana Devnet or synthetic test credits.

## Interaction and layout

The shell separates Campaigns, Account and publisher testing. Primary actions stay
near the task. The editor offers Back, Save draft and Continue, with a sticky live
creative preview on wide screens and stacked panels on mobile. All controls have
labels, visible focus, keyboard operation and reduced-motion support.


## Keyboard presentation journey

The isolated presentation workspace starts with three prepared, active fictional
hardware-wallet advertisers. The presenter creates HarborKey as a fourth advertiser
and launches its first campaign; the UI never manufactures a fourth saved record.

1. Enable the explicit **Demo autofill** switch and select **Create advertiser &
   campaign**. The blank Offer step focuses its campaign-name field.
2. Press Tab in an empty named text field to apply the HarborKey suggestions to
   empty fields on that step. The next Tab follows normal focus navigation. Filled
   fields, Shift+Tab, buttons, selects, capability search and review checkboxes keep
   ordinary keyboard behavior. **Fill this step** offers the same visible action.
3. HarborKey's suggested offer is a hardware wallet with offline key storage and
   Ethereum/Solana support, at `https://harborkey.example/`. Suggestions are editable
   and carry no backend or model authority until saved, approved and launched.
4. On Context, Tab in the empty hints textarea adds advertiser-authored Jev guidance.
   This does not silently declare capabilities. Tab to **Use suggested capabilities**
   and press Enter to explicitly apply Crypto custody, Hardware wallets, Offline key
   storage, Ethereum and Solana declarations.
5. On Creative, Tab in the empty approved-text field adds the exact separate
   Sponsored copy. On Spend, Tab in an empty amount field applies suggested limits.
   **Fill this step** also populates empty spend fields. Existing amounts are never
   overwritten by keyboard suggestions.
6. Review the fourth advertiser, hints, declarations, exact copy and limits. Check
   the approval acknowledgement and activate Launch explicitly. Tab never saves,
   approves, launches, purchases or settles.
7. Open Publisher chat. Its separate demo mode can fill an empty composer with Tab;
   Enter submits a fresh question for independent DeepSeek generation and the full
   ad opportunity flow. Open **Peek inside** to inspect actual eligibility, Jev,
   evidence, bids, award, insertion and accepted receipt. A preset question does not
   force a winning advertiser.

The publisher SDK is available for technical review. It is outside this presentation
journey. Seeded inventory and keyboard suggestions do not modify the original MVP
recordings or campaign identity.

## Native Devnet channel journey

The backend payment readiness gate is independent of Jev and DeepSeek readiness.
Drafts remain saveable when payments are unavailable. Native review names the exact
channel deposit and acknowledges the shared demo sponsor before **Fund channel &
launch**. The campaign stays **Opening channel** until opening is finalized; it
competes only after the backend marks it active. A busy state describes the request
without fabricating transaction stages. Confirmation can take 20–45 seconds.

The detail view shows the confirmed deposit, available campaign cap, reserved awards,
accepted charges, cumulative authorized total, confirmed publisher payout and
returned deposit separately. Deposit is collateral. Accepted charges count once;
authorization and settlement do not add spend. SOL fees and rent are separate.

Native opening and closing transactions expose sanitized signatures, finality,
network fees, new/reclaimed rent and available token deltas. Explorer links are
pinned to Solana Devnet. The cumulative voucher list connects saved charge
sequences with exact increments and totals; no signing payload is exposed.

Accepted receipts automatically attempt exact-ledger authorization. If an accepted
charge remains above the authorized total, **Authorize accepted deliveries** can
advance the durable ledger without taking a user-supplied amount. Pending or
uncertain operations disable advancing actions. **Reconcile status** looks up the
saved operation; it does not replace a channel, sign a fresh deposit or purchase
another delivery.

**Close & settle Test USDC** is available only when the backend allows it. It drains
new awards and pending deliveries, closes with the saved final voucher, pays the
publisher and returns the unused deposit. **Settlement pending** remains visible
until finalized evidence exists. Zero charges yield a zero publisher payout and
an unused-deposit return, rather than a fabricated charged delivery. Uncertain
close/refund results remain unresolved until reconciled.

Pause and resume reuse the same funded channel and immutable native campaign
version. Duplicating creates an unapproved draft with a separate future channel.
Do not reset a funded presentation workspace as part of keyboard rehearsal; first
inspect and settle its channels through the coordinated payment workflow.

An unsigned opening blocker retains the same saved campaign. **Retry saved channel
opening** is explicit and refetches current state before `/launch`. It appears only
for a pre-freeze opening with no native payment record or a backend-approved
prepared opening without a signed identity. Signed, submitted, uncertain and
finalized identities never receive this retry action; their recovery uses lookup.
