# Shared contract packet — review draft v0.2

Status: planning proposal, not executable schemas or validated compatibility.
Owner: orchestrator. Implementation requires user review of component packets.
This packet refines CONTRACTS.md; it does not replace payment wire standards.

## Goal and boundaries

Connect campaign -> sanitized opportunity -> advisory agent decision -> code-built
bid -> deterministic auction -> accepted publisher delivery -> charge -> cumulative
payment authorization -> settlement. No paid insertion into the organic answer.
No conversion prediction, model-controlled budgets or agent-controlled signing.

## Common types

- Record envelope: schemaVersion, id, runId, mode, correlationId, createdAt.
- Mode: synthetic, sandbox or devnet; actual network identity also recorded.
- Money: asset label, network, mint, amountBaseUnits as unsigned decimal string.
  Arithmetic uses integers; decimals are display-only. No implicit conversion.
- Every relationship binds immutable version IDs; no mutable campaign lookup can
  silently alter an already awarded price, creative or payee.
- Writes use principal/route/run-scoped request idempotency and canonical body
  hashes. Separate business uniqueness protects opportunities and charges.

## Component interfaces

| Object | Minimum fields beyond envelope | Authority / invariants |
|---|---|---|
| CampaignVersion | advertiserId, version, status, objective, allowedIntents, exclusions, publisherAllowlist, declaredConstraints, creativeVersionIds, maxBid, budgetCap, bidPolicyVersion, policyHash | Operator configures; declarations are not verified performance; edits create a version |
| CreativeVersion | campaignVersionId, brandName, approvedText, destinationURL, contentHash, fictional | Operator approves; model selects only listed creatives |
| Opportunity | publisherId, slotId, randomSessionId, turnId, coarseIntent, taskConstraints, floor, expiresAt, publisherPolicyHash | Publisher supplies sanitized context; one opportunity per run/mode/publisher/session/turn |
| AgentDecision | opportunityId, advertiserId, campaignVersionId, agentRunId, decision, creativeVersionId, relevance, commercialIntent, evidenceFieldIds, reasonCodes, engineProvenance | Advisory only; decision is bid/skip/abstain; no authoritative money field |
| ExecutableBid | opportunityId, advertiserId, campaignVersionId, creativeVersionId, agentRunId, amount, bidPolicyVersion, reasonCodes | Code constructs only from validated bid recommendation; bounded by policy/caps/floor |
| AuctionOutcome | opportunityId, status, consideredBidIds, rejectionReasons, winningBidId, awardId, auctionPolicyVersion | Code owns awarded/no_fill/expired; integer descending order then campaignId |
| Award | opportunityId, winningBidId, reservationId, publisherId, creativeHash, price, payee, channelId, expiresAt, renderTokenHash | Exact bindings freeze; client gets capability, not signer authority |
| DeliveryReceipt | awardId, publisherId, creativeHash, nonce, renderAcknowledgementHash, publisherKeyId, publisherSignature, receivedAt, status | Publisher backend signs; server admission time owns expiry; browser proof is owned-app acknowledgement, not attention |
| Charge | awardId, deliveryId, campaignVersionId, channelId, amount, acceptedAt, status | Exactly one per award; accepted receipt moves reservation to spend once |
| VoucherIntent | channelId, sequence, cumulativeAmount, orderedChargeCommitment, signedPayloadHash, status | Bounded signer; cumulative not incremental amount; AXP commitment separate from standard voucher bytes |
| Settlement | channelId, frozenWatermark, txSignature, finality, actualPayeeDelta, refund, feeAndRent, status | Adapter records actual evidence; no confirmed state from UI or simulated success |

Existing sessionId fields in Charge/VoucherIntent refer to a payment session,
not randomSessionId from the publisher conversation. Standardize application
records on channelId during schema implementation; retain any provider session
identifier separately as protocolSessionId. This is a proposed naming correction.

## DecisionEngine boundary

scoreOpportunity(sanitizedOpportunity, ownEligibleCampaign, deadline/policy)
returns an AgentDecision with own approved creative IDs only. Never disclose
competitor bids or campaigns to the buyer. EngineProvenance contains engine,
model/version if used, timing, outcome, fallback origin and failure reason.
ConversionProbability remains null; score rubric semantics are recorded.

Bid: require valid creative and evidence IDs plus bounded finite scores.
Skip/abstain: no bid is constructed. Invalid, late or failed responses are logged
as such; optional explicit rules fallback cannot erase the original failure.
Code maps fit/intent bands to a frozen bid fraction using integer arithmetic.
The fraction table and thresholds must be fixed in the targeting packet before
benchmarking. Auction rechecks campaign, frequency, budget and channel state.

## Lifecycle and errors

- Opportunity: collecting -> awarded/no_fill/expired through recorded auction.
- Award: reserved -> delivered/failed/expired via one conditional transition.
- Charge: accepted -> authorization_pending -> authorized -> settlement_pending
  -> settled. Unknown external outcomes require reconciliation, not new spending.
- Channel: pending_open -> open -> draining -> closing -> finalized/unknown.
- Semantic reason codes include policy_excluded, missing_constraint,
  agent_skip, agent_abstain, decision_invalid, decision_timeout, below_floor,
  budget_unavailable, channel_unavailable, receipt_invalid, award_expired,
  idempotency_conflict and reconciliation_required.
- HTTP status mapping: malformed 400; unauthenticated 401; unauthorized 403;
  missing 404; conflicting write/state 409; valid no-fill 200. Protocol adapter
  uses its standard payment handshake rather than these application semantics.

## Acceptance fixtures to freeze before code

1. Eligible buyer recommends bid; code calculates an allowed amount.
2. Eligible buyer genuinely skips; no mechanical skip answer or forced exclusion.
3. Off-target high bidder excluded before auction; declaration provenance visible.
4. Valid bids tie: fixed campaign ID tie rule determines winner.
5. Two request keys for same turn return same opportunity; changed body conflicts.
6. Accepted receipt creates one charge; late receipt and failed render cost zero.
7. Two concurrent receipts and restart/replay cannot add a second charge.
8. Two charges on one channel advance cumulative C1 then C1+C2, not double sum.
9. Unknown authorization/settlement blocks fresh spend and remains visibly unknown.
10. Closing drains outstanding awards before freezing cumulative obligations.

Fixtures are owned-demo inputs. Any benchmark outcome labels are frozen separately
from features derived from ContextHint to prevent target leakage.

## Dependencies and review checklist

Payment packet must resolve actual SDK, program, mint, network and voucher APIs.
ML packet must freeze feature/profile shape, score rubric, thresholds and splits.
Exchange packet must freeze campaign pause/version behavior and reservation tests.
Delivery packet must freeze canonical signed receipt bytes and expiry admission.

Reviewer checks contradictions at these seams, integer money, authority separation,
real versus synthetic evidence and whether the demo can run. Do not expand review
into multi-tenant production security or unrelated platform conformance.

## Next artifact

After payment research, reconcile any incompatible assumptions and version the
component packets. Generate JSON Schema, OpenAPI and DTOs only after planning
approval. No final frontend work, installations or transactions in this task.
