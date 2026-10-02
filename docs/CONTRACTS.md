# Contracts and data ownership

Historical planning contracts v0.1. **Not the implemented frontend API.**
Phase5 freezes the actual route registry in `packages/client/schema.mjs` and its
generated OpenAPI3.1/types. See `docs/frontend/SETUP.md`. The runtime implements
`/v1/demo/turn`, `/v1/awards/{id}/render`, campaign create/pause and local events;
it does not implement the inventory/bids/payment-session/versions/activate/report
routes proposed below. Payment signing remains an operator terminal operation,
not a browser API. Read-only presentation uses only `/v1/replay/*` GET routes.
The current runtime uses turn/session identifiers and canonical body checks,
not an HTTP Idempotency-Key requirement. Future envelopes/permissions below
remain design proposals and must not be inferred as deployed or callable.

## Common envelope

`schemaVersion`, `id`, `runId`, `mode: synthetic|sandbox|devnet`, `createdAt`,
`correlationId`. Time is an actual server timestamp, not dataset import time.
Unknown fields rejected at write boundaries; documented read extensibility.
Amounts are `{asset: test-USDC, network, mint, amountBaseUnits: decimalString}`.
Every mutable request needs Idempotency-Key scoped to authenticated principal,
route and run; stored canonical body hash; mismatch returns 409. Reads don't pay.
Independently of request keys, enforce one opportunity per
`(runId, mode, publisherId, randomSessionId, turnId)`. A different key or slot
cannot buy a second placement on the same turn. Same canonical body returns
the existing opportunity/outcome; changed body returns 409. Failed/expired
turns cannot be repurchased by changing the request key.

## Canonical records

| Record | Required bindings |
|---|---|
| CampaignVersion | advertiserId, version, status, objective, allowedIntents, exclusions, publisherAllowlist, maxBid, budgetCap, policyHash |
| CreativeVersion | campaignVersionId, brandName, approvedText, destinationURL, contentHash, fictional flag |
| PublisherSlot | publisherId, slotId, format=sponsored_card, floor, categoryPolicy, policyVersion, payee |
| Opportunity | publisherId, slotId, randomSessionId, turnId, coarseIntent, taskConstraints, floor, expiresAt, publisherPolicyHash |
| Bid | opportunityId, advertiserId, campaignVersionId, creativeVersionId, amount, agentRunId, decision, reasonCodes |
| Award | opportunityId, winningBidId, reservationId, publisherId, creativeHash, price, payee, expiresAt, renderTokenHash |
| Delivery | awardId, publisherId, creativeHash, nonce, renderAcknowledgementHash, publisherSignature, status, receivedAt |
| Charge | awardId, deliveryId, campaignVersionId, sessionId, amount, acceptedAt, status |
| VoucherIntent | sessionId, sequence, cumulativeAmount, orderedChargeCommitment, signedPayloadHash, status |
| Settlement | sessionId, frozenWatermark, txSignature, finality, actualPayeeDelta, refund, feeAndRent, status |

Currency/network/creative/policy hashes freeze at award. Render acknowledgement
contains DOM-inserted + sponsored-label-present under reference-app semantics,
not seconds of human attention. Delivery timestamp eligibility uses server
receivedAt sampled inside the admission transaction against award expiry;
client time or HTTP arrival time is metadata, not authorization. Validate receipt
authenticity and bindings before atomically accepting delivery and moving the
reservation into exactly one charge. The expiry worker uses the same conditional
state transition: admission before expiry wins; admission at/after expiry rejects.
There is no queued, unaccepted receipt that silently earns payment.
Publisher key ID binds an authenticated registered publisher to a signature over
canonical delivery bytes. Browser does not hold the publisher signing key.

## HTTP responsibilities

- Operator advertiser: POST /v1/campaigns; POST /v1/campaigns/{id}/versions;
  POST /v1/campaigns/{id}/activate or /pause; GET /v1/campaigns/{id}/report.
- Publisher: GET /v1/inventory; POST /v1/opportunities;
  GET /v1/opportunities/{id}; POST /v1/awards/{id}/delivery.
- Buying-agent service: POST /v1/opportunities/{id}/bids with authenticated
  campaign-scoped credentials; cannot activate/fund/change a campaign.
- Operator payment administration: POST /v1/payment-sessions/prepare;
  POST /v1/payment-sessions/{id}/open-approved; POST /close-approved;
  GET /v1/payment-sessions/{id}. Approval binds exact network/payee/cap/expiry.
- Read-only evidence: GET /v1/runs/{id}/events (SSE with resume cursor);
  GET /v1/runs/{id}/report and /evidence. Never returns raw keys, bearer tokens
  or arbitrary private model transcripts.

Paths are application contracts, not new x402 headers or AdCP task names.
Payment adapter mounts standard protocol routes separately after the spike.
Endpoint writes are not all available to the same user/session role.

## Permissions and projections

Advertiser sees own campaigns, bids and charges; publisher sees own opportunities
and revenue; agent sees only its bid input; local operator sees correlated demo
events. Cross-advertiser visibility is disabled outside an explicitly labelled
owned-demo evidence projection. Session binding uses random IDs, not user accounts.

Client receives a short-lived award render capability only. No signer, host key,
private raw data or budget override in browser. Browser acknowledgement must be
proxied through authenticated publisher backend before delivery acceptance.

## AdCP/OpenRTB mapping gate

Phase 1 scopes an inventory-discovery mapping to pinned AdCP get_products schemas.
Validate actual request/response and capabilities, including unsupported-feature
errors. Do not expose create_media_buy or report delivery as standard-conformant
until their full schemas, commercial semantics and tests are implemented. MVP
native auction is not AdCP Trusted Match or an OpenRTB endpoint.

Future OpenRTB: bid request IDs -> opportunity IDs; imp -> slot; bid -> our bid;
CPM -> explicit per-placement conversion; USDC rail -> documented extension.
Schema similarities are a mapping proposal, not proof of transport compatibility.
