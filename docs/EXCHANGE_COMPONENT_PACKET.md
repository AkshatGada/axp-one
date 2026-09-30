# C03/C04/C05 agent, auction and delivery packet

Planning draft by orchestrator. Assigned gpt-6.1-sol high adviser failed with
model-at-capacity before a final packet; this is not its completed report or audit.
Uses ALGORITHMS.md, FLOWS.md and SHARED_CONTRACT_PACKET.md.

## C03 buying agents

Purpose: actual advertiser participation decisions against a sanitized opportunity.
Non-goals: strategic planning, arbitrary tools, wallet access, campaign mutation.
Owner paths: packages/dsp/runner; tests/agents. C02 owns engine implementation.

Input: one eligible immutable campaign/profile, approved creatives, sanitized
opportunity, deadline and rubric version. No competitors, money or secrets.
Output: strict AgentDecision. Three isolated contexts use the same configured
engine/model. Only eligible buyers run. Real model runs get actual provenance;
deterministic fixtures are separately labelled. Invocation-specific settings only.

Pseudocode: freeze inputs -> invoke configured engine once per eligible advertiser
concurrently -> validate bindings/levels/IDs/deadline -> persist result -> pass
only valid bid recommendations to C04. Late/invalid/error => no bid, visible reason.
No mechanical answer supplied to real-agent trials; no retries hunting for a skip.

Fixtures: eligible group-block offer for solo traveller remains eligible but
should earn a real soft-fit skip; geographic exclusion is not a skip; invented
creative or money output rejected; timeout cannot reopen auction. Actual model
bid and eligible skip required for A04; synthetic assertions do not satisfy it.

## C04 exchange and auction

Owner: packages/exchange/campaigns, opportunities, bidding, auction, reservations.
Inputs: operator-approved versions/slot, opportunity, validated decisions, frozen
fit_intent_bid_v1 policy and current ledger/channel state. Output: ExecutableBid,
AuctionOutcome and at most one Award. Orchestrator owns shared schemas.

Stable campaignId identifies campaign across immutable campaignVersionId edits.
Pause blocks new awards; existing awarded obligations drain under frozen terms.
Opportunity unique by run/mode/publisher/randomSession/turn, independent of
request keys. Same input returns existing outcome; changed input conflicts.

Hard filter: active version, approved creative, allowed task/publisher, mandatory
declarations, frequency, max bid >= floor, channel open and available capacity.
Declarations are not independently verified product claims.

Bid policy from C02: relevance/intent >=2; fractions in basis points are
(2,2)=5000, (2,3)=7500, (3,2)=7500, (3,3)=10000. Compute floor(maxBid*fraction/10000)
with integers, clamp to available campaign/channel capacity; never raise to floor.
Ranking scores do not directly choose auction winner.

Pseudocode: close collection at fixed server deadline -> reject invalid/late bids
-> sort amounts descending, campaignId ascending -> transactionally recheck each
candidate's version/activity/frequency/budget/channel -> reserve first valid price
-> persist one award and all reason codes -> no_fill if none. No model/RPC in lock.

Budget: accepted charges C plus outstanding reservations R plus price <= immutable
cap B; channel obligations separately bounded by confirmed deposit/operator cap.
Reservation rejection tries next fixed bid, not a fresh model decision.

Fixtures: T01 Bay bid4000 wins over Marina3750 and excluded Alpine9000; tie4000
resolved by campaignId; remaining capacity999 versus floor1000 => no bid; two
concurrent awards with cap5000 and bids4000 cannot both reserve; changed same-turn
body409; paused winner rejected at award. Supports A01–A05, A08, A12.

## C05 delivery and accounting

Owner: packages/exchange/delivery, ledger; packages/publisher receipt helper.
Input: award capability and authenticated publisher-signed receipt. Output: accepted
DeliveryReceipt, exactly one Charge and durable pending authorization intent.
Payment adapter owns signing, not this module. No fraud-proof viewability claim.

Signed canonical receipt object binds schemaVersion, runId, mode, publisherId,
publisherKeyId, awardId, opportunityId, creativeHash, nonce and
renderAcknowledgementHash. Canonical encoding and domain separation must be
frozen with schemas before implementation. Do not sign secret render capability
into public artifacts. receivedAt is server admission time, never client authority.
Acknowledgement records DOM insertion and Sponsored label in the owned app.

Pseudocode: authenticate publisher -> validate signature/bindings -> admission
transaction samples server time -> if prior accepted receipt return outcome ->
require live reserved award and receivedAt < expiresAt -> one conditional transition
reserved to delivered -> decrement R, increment C once -> create charge(unique award)
and durable outbox -> commit. Expiry uses same conditional state transition.
At equality with expiry reject. No browser or HTTP arrival time extends validity.

Voucher worker serializes channel charges. Payment authorization cumulative equals
durable accepted total; no second accounting increment on signing/settlement.
Mapping: chargeId => SDK delivery ID; channelId distinct from randomSessionId.
Unknown submission reuses recorded payload identity and requires reconciliation.

Close: no new awards -> drain existing reservations to delivered/failed/expired
-> finish authorization intents -> freeze cumulative watermark under transaction
-> payment close. No database lock during external calls; unknown outcome remains
unknown, not silently refundable or newly spendable.

Fixtures: duplicate receipt twice => one charge; admission just before expiry can
win versus expiry worker, at/after expiry cannot; failed render => zero charge;
cap1000 and charges100/250 => accepted total350, not signed100+350=450; restart
after charge before signing resumes same obligation; close with unresolved award
cannot freeze. Supports A05, A07–A10, A12–A14.

## Dependencies, review and build gate

C03 depends on frozen C02 request/result and model access. C04 can start against
deterministic decisions. C05 can use synthetic adapter until C06 compatibility
passes. All depend on orchestrator-generated contract fixtures after user review.

Focused review: agent isolation, integer auction/tie rule, pause/version handling,
business uniqueness, receipt signature/expiry boundary, spend conservation and
two-charge cumulative arithmetic. One substantive-fix recheck; no production
identity federation or broad fraud/security rollout. Actual network/payment tests
belong to C06 and full-system evidence; this packet is not test execution.
