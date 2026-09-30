# Research and reference register

Inspected 2026-09-30. Public primary sources only. These are references, not
executed dependencies or proof of compatibility. No third-party source copied.
README promises are not performance evidence; exact versions must be pinned
before implementation. Product decisions below are ours, not standards mandates.

## R1 — OpenRTB vocabulary

[IAB OpenRTB 2.x](https://github.com/InteractiveAdvertisingBureau/openrtb2.x)
is the primary reference for bid-request/response semantics. Reuse the separation
of opportunity, impression/placement, bid, floor, currency and notifications.
Our canonical prices are per-placement USDC base units, not OpenRTB CPM. Any
later adapter must explicitly convert price units and keep conversation fields
in a namespaced extension. MVP is not certified OpenRTB-conformant.

## R2 — Agentic real-time advertising precedent

[IAB ARTF](https://github.com/IABTechLab/agentic-real-time-framework) includes
an agent-driven OpenRTB mutation reference with MCP/gRPC surfaces. It demonstrates
that agentic advertising infrastructure is not an untouched category. Learn the
bounded extension-point pattern; do not use it as a conversational DSP or payment
implementation. Its reference code is AGPL-3.0; its specification has separate
terms. No code imported and no repository-wide license selected here.

## R3 — Auction-server architecture

[Prebid Server](https://github.com/prebid/prebid-server) is an established open-source
auction-server reference. Use adapter boundaries, deadline isolation and rejection
observability as design references. Do not adopt its large runtime for one local
publisher; don't claim a specific latency because another system supports RTB.

## R4 — Direct comparable demo

[AdKit](https://github.com/dinxsh/adkit) describes agents purchasing research and
bidding for ad space using x402/Solana. Its README includes multiple paid services
and outbid/refund behavior. This is prior-art inspiration, not proof of dependable
settlement or an audited production exchange. We choose reservation-before-render
and receipt-accounted accumulation rather than paid bids followed by refunds.

## R5 — Payment implementation candidate

[Solana PayKit](https://github.com/solana-foundation/pay-kit) has TypeScript and
payment-session examples. GitHub tree observed at commit
`c294f8903f18efc746584e3cc2961d6033b8365c` (not installed or executed).
Inspected pinned `typescript/package.json`, `docs/snippets/session.client.ts`
and `docs/snippets/session.server.ts`. Client uses session fetch/opener;
server explicitly mounts voucher, deliveries, commit and receipt routes.
Example server sets mainnet: never run it unchanged. No inference that its
automatic stream metering supports arbitrary auction prices or post-render billing.

Pinned source entry points:

- [Client snippet](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/docs/snippets/session.client.ts)
- [Server snippet](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/docs/snippets/session.server.ts)
- [Session implementation directory](https://github.com/solana-foundation/pay-kit/tree/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/server/session)

## R6 — Repeated spending versus one metered call

[pay.sh comparison](https://pay.sh/docs/building-with-pay/payment-channels/choosing)
distinguishes x402 upto for one metered call from MPP session for many deliveries.
This supports choosing session as the candidate for repeated buying; it does
not prove our desired ad-delivery timing is supported by its SDK.

[Session documentation](https://pay.sh/docs/building-with-pay/payment-channels/sessions)
describes cumulative vouchers, idle closure and refund/force-close behavior.
Our integration must test these transitions and timeout rules explicitly. A
cumulative voucher is a total, not a delta to sum repeatedly. Default idle-close
behavior must not silently close the session during a slow agent auction.

## R7 — Standard payment messages

[x402 Foundation](https://github.com/x402-foundation/x402) separates payment
schemes and network implementations. Keep HTTP payment challenges distinct from
auction bid requests. x402 does not establish relevance, inventory quality or
delivery verification. We do not rename channel accumulation to the specifically
named x402 batch-settlement scheme without implementing that scheme.

## Local prior work, read-only

`/Users/akshat/axp-agent-ad-experiments/protocol/docs/FULL_DEMO_ACCEPTANCE.md`
was read. It records an exact Devnet report purchase and durable replay, plus
limitations of model/host provenance. Reuse lessons: immutable price/resource
binding, durable correlation, unknown-outcome reconciliation, clear mode labels.
Do not import historical records as results of this repository. No credentials
or databases inspected/copied. ContextHint data was not accessed in this phase.

## R8 — AdCP and conversational advertising

[AdCP repository](https://github.com/adcontextprotocol/adcp) separates negotiation
tasks (MCP/A2A) from serve-time decisioning. It is a useful interoperability target,
not our auction or payment rail. [Sponsored Intelligence overview](https://docs.adcontextprotocol.org/docs/sponsored-intelligence/overview)
resolved to documentation version 3.1.24. Its conversational capabilities must
not be equated to our static card without a format/schema mapping.
Public tree observed at `df4a0c436a9d207260b475b73b6b68e145c691d8`.
We inspected the repository description, public docs and source-path inventory;
full task schemas were not reviewed yet. Phase 1 must pin and validate a narrow
inventory-discovery adapter before any AdCP-compatibility claim. Broad media-buy,
SI chat sessions and Trusted Match execution are deferred from the first MVP.

## R9 — Commercial precedents, not audited deployments

[AdMesh terms](https://useadmesh.com/terms/) describe brand agents and constrained
intent-based auctions. [Thrad](https://www.thrad.ai/) positions itself as a DSP for
LLMs. These are direct positioning precedents, not independently verified scale,
conversion, financial-rail or product-quality evidence. Their public statements
do not establish our differentiation or the absence of stablecoin support.

## User-supplied research intake

Read both exchange-positioning attachments (same text) and the competitive
landscape attachment. Retain exchange/DSP distinction and standards layering.
Reject as unproven: no dominant competitor, first-ever intent pricing, verified
exposure, conversion assumptions, or stablecoins uniquely required for agent
buying. Fiat APIs can also automate; channels must earn their place through
measured bounded settlement/accounting behavior.

Other leads in the attachment: Imprezia, Koah, Elo, Dappier, Apostra, Instinct,
AD402 naming projects. Not independently checked in this planning pass; do not
reproduce its green-check competitive matrix as verified facts. Their study is
a later commercial-research task, not a reason to expand the MVP code scope.

Positioning approved: AXP.one is the exchange for the agentic internet. Technical
precision: we auction a disclosed placement in a classified context, not ownership
of human intent, guaranteed attention, an organic answer or a conversion.

## Research conclusions versus unresolved questions

Supported: existing auction/agent/payment building blocks can guide the design;
per-placement accounting need not require per-placement blockchain settlement.
Unproven: Devnet channel program availability, SDK release suitability, dynamic
prices, receipts-before-authorization timing, failure recovery and end-to-end
integration. All are explicit phase-1 gates, not hidden assumptions.
