# Architecture

Proposal v0.1. A modular monolith with explicit adapter seams; no microservice
fleet, Kafka, Kubernetes, CDN or Cloudflare dependency for the local MVP.

```text
Advertiser operator -> Campaign API -> Immutable campaign/creative versions
                                         |
Publisher reference app -> SDK -> Opportunity gate and minimal context
                                         |
                                  Exchange coordinator
                                 /       |       \
                            Buyer A   Buyer B   Buyer C
                         (replaceable DecisionEngine)
                                 \       |       /
                       Deterministic bid policy + first-price auction
                                         |
                            Atomic budget reservation + award
                                         |
                          Publisher sponsored-card renderer
                                         |
                          Delivery verifier + durable ledger
                                         |
                      Bounded signer -> payment-session adapter
                                         |
                           Solana channel settlement/refund
```

## Proposed stack and layout

TypeScript, a supported Node LTS compatible with pinned PayKit, ordinary HTTP,
SQLite with transactions for the single-host MVP, schema validation and an
append-only event/outbox ledger. Choose exact package releases in the feasibility
phase; no unbounded latest dependencies. Amounts are integer base-unit strings.

Proposed future folders (not yet implemented):

```text
apps/backend/          HTTP API, local authorization, coordinator
apps/reference-ui/     plain advertiser/publisher/chat/testing UI
packages/contracts/   JSON Schema/OpenAPI + typed DTOs
packages/dsp/         context-isolated agent runner and deterministic baseline
packages/exchange/    eligibility, auction, reservations, ledger
packages/publisher/   opportunity + render acknowledgement SDK
packages/payments/    payment adapter, bounded signer, recovery
packages/adcp/        explicitly scoped standards mapping adapter
tests/                fixtures, concurrency, fault injection, integration
docs/                 source of truth
local-state/           ignored private state
artifacts/             sanitized correlated evidence
```

## Responsibilities

1. Campaign module: operator-controlled policy, approved creative and immutable
   versions. The model cannot modify its own budget or campaign activation.
2. Opportunity module: coarse intent, constraints, publisher/slot identity and
   consent eligibility. Raw chats never go to bidders by default.
3. DSP runner: each advertiser gets only its campaign, normalized context and its
   non-financial profile. Budget snapshots stay in deterministic bidder policy.
   Jev may recommend bid/skip and creative through DecisionEngine;
   code computes bounded integer bids. No competitors' bids, wallet key or account
   admin token. Strategic campaign-planning agents stay off this fast path.
4. Exchange: eligibility and auction rules; revalidates budget atomically at award.
5. Delivery module: expiring single-use render token and authenticated publisher
   receipt; accepted delivery consumes the reservation exactly once.
6. Signer policy: only durable accepted charges within network/recipient/campaign
   ceilings may advance a voucher. Models cannot directly request arbitrary signing.
7. Payment adapter: protocol-native messages, status lookup and on-chain reconciliation.
8. Reporting: distinguish reserved, accrued, authorized, settled and refunded money.

## Durable entities

Advertisers, publishers, campaign_versions, creative_versions, slot_policies,
opportunities, bidder_runs, bids, auctions, awards, reservations, deliveries,
charges, payment_sessions, voucher_intents, settlement_attempts, outbox, events.
Every entity includes schema version, run ID, mode, creation time and correlation ID.
Private auth and signer records stay out of reporting/export projections.

Single SQLite writer transaction serializes cap-sensitive updates. Outbox intent
is committed before any network side effect. No DB lock held during model/RPC
calls. The asynchronous worker reconciles durable intents after crashes.

## Standards boundaries

- AdCP: candidate negotiation/inventory/reporting adapter, not a replacement for
  exchange rules or a payment standard. Pin schemas and capability scope first.
- OpenRTB: vocabulary and future interoperability reference; CPM/unit conversion
  is mandatory for an actual adapter. No fake conformance claim.
- MPP: preferred repeated-payment wire interface, pending feasibility.
- x402: optional later exact-payment path; HTTP 402 is not a bid solicitation.
- MCP: optional agent tool transport; tools never elevate budget/signing authority.
- WebMCP/Cloudflare are not prerequisites for this MVP and are not payment protocols.

## Final frontend separation

The main builder owns stable contracts, mocked response fixtures, reference
components and integration tests. The specialist owns final layout, visual
design, animation and polished responsive screens. Both consume the same API;
no second ledger, auction or signer is implemented in frontend code.

See DECISION_ENGINE.md and JEV_BENCHMARK_PLAN.md: Jev is an approved experimental
buyer implementation, not a chosen dependency or demonstrated latency advantage.
