# Flows and state machines

## Advertiser setup

Operator creates approved creative -> targeting/exclusions -> per-placement max
bid -> total budget -> test-mode channel authorization -> activates campaign.
Funding requires a separate bounded authorization, not an LLM-suggested action.
Paused campaign blocks new awards immediately; existing awarded obligations are
drained or expired before channel closure. Editing creates a new version.

## Publisher setup

Register the one owned app and payout identity -> configure sponsored-card slot,
floor and category restrictions -> enable minimal-context SDK -> test no-ad and
render acknowledgement. Publisher payout identity is frozen into the channel,
award and receipt; it cannot be replaced through a render payload.

## Buying flow

1. User asks a question; organic-answer path runs independently.
2. Local gate emits an opportunity only if ads are allowed and coarse intent is
   in the non-sensitive demo taxonomy. Unknown intent yields no ad.
3. Candidate filter applies hard exclusions. Eligible agents run concurrently,
   each through the configured DecisionEngine with a bounded deadline and strict
   output schema. They recommend participation and creative; code computes bids.
4. Coordinator records bid/skip/error; late bids cannot reopen a closed auction.
5. Deterministic auction sorts eligible bids and attempts an atomic reservation
   for the top bidder, revalidating campaign/channel/frequency state. If the
   reservation fails, try the next eligible bid under the same frozen auction.
6. Exactly one award with creative hash, exact price and expiring render token.
7. Renderer inserts approved text plus Sponsored label and emits acknowledgement.
8. Publisher backend signs the receipt, including the bound render acknowledgement.
9. Verifier validates receipt bindings; a transaction samples server time,
   consumes the still-live award and creates one durable charge. Expiry uses
   the same conditional transition, so only admission or expiry can win.
10. Bounded payment worker advances cumulative signed authorization, without
    changing already-recorded award prices. Channels settle accumulated totals.
11. Reports correlate model decisions, award, receipt, charge, voucher and chain outcome.

## State machines

Opportunity: created -> collecting -> closed -> awarded | no_fill | expired.
Award/reservation: reserved -> delivered | failed | expired; never delivered
after failed/expired. Duplicate receipt returns the previous result.
Charge: accepted -> authorization_pending -> authorized -> settlement_pending
-> settled. Unknown signature or RPC outcome adds reconciliation_required, not
a new charge. A signed-but-not-submitted voucher remains an obligation.
Channel: pending_open -> open -> draining -> closing -> finalized | unknown.
No awards while not open, draining or closing. No reopening a closed channel ID.

## Post-render financial boundary

The publisher is taking bounded delivery-before-voucher risk. A valid render
does not itself authorize payment: the deterministic payer-side policy signer
must accept its receipt. A receipt/signing rejection is visible as unpaid delivered
inventory, never a fabricated payment. Stop further awards on this inconsistency.
The owned reference app permits this MVP trust arrangement; no production
fair-exchange or cryptographic proof of physical rendering is claimed.

The SDK must support advancing authorization from accepted receipts, not
automatically billing model tokens/stream chunks. Failure of that feasibility
test requires a documented design revision before real-channel implementation.

## Failure/recovery behavior

- No match, blocked task, bidder failure or bids below floor: organic answer,
  no ad, no reservation or charge.
- Rendering fails/award expires: release reservation and frequency reservation;
  receipt afterward is rejected. Replay returns the expired outcome. A new
  opportunity requires a genuinely new user turn, not a new request key.
- Two simultaneous receipts: unique award charge + transaction CAS accept one.
- Restart after charge but before signing: resume persisted voucher intent.
- Restart after signing but before RPC acknowledgement: reconcile exact signed
  voucher/transaction identity; no fresh purchase or signature with a larger amount.
- Settlement unknown: hold obligations and block closure/reuse; query chain.
- Browser retry: idempotency key plus request hash; different payload same key
  gets conflict, not a second impression.
- Different request keys for the same publisher/session/turn resolve to the same
  business-unique opportunity; changed canonical input conflicts.
- Disputed delivered charge: flag dispute; do not pretend a signed cumulative
  voucher can be decreased. Corrections/refunds are separate explicit operations
  outside the MVP's autonomous path.

## Closure

Pause awards -> wait for all outstanding reservations to be admitted, explicitly
failed or expired -> finalize signer outbox -> freeze accepted cumulative
watermark -> settle/close -> observe chain
finality and account balances -> record payout/refund. Unknown closure never
releases money into a new channel budget. Top-ups require operator authorization
and are deferred from the first demo.

Draining permits valid receipts for existing awards until their expiry, but no
new awards. Freeze under the same database serialization boundary as admission,
only with zero outstanding reservations and no pending authorizations. After
freezing, no new charge can enter that channel. Network calls never hold the
database lock. Unknown signing/closure stays unresolved, not falsely drained.
