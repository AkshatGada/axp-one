# C07/C08 integrated demo and frontend handoff packet

Historical planning packet; orchestrator-owned. **Superseded for the executed
demo by build/PHASE4_RESULT.md and build/PHASE5_TASK.md.** The completed story is
corporate travel, two TripDesk deliveries and native MPP sandbox settlement;
not the earlier hotel task/campaign-pause story below. The Phase5 presentation
is recorded evidence replay, not fresh execution. The implemented API is
`packages/client/openapi.json`, with setup in `docs/frontend/SETUP.md`;
CONTRACTS.md's inventory/bids/operator HTTP endpoints remain unimplemented plans.

## Purpose and non-goals

Show AXP as a working conversational advertising exchange, not an animation:
campaign -> opportunity -> advertiser bid/skip -> deterministic auction ->
disclosed rendered card -> accepted receipt -> cumulative channel payment.
Deliver a plain working UI, CLI harness and evidence that a specialist can style.
No final website, animation, production tenancy, deployment or acquisition study.

## Ownership and interfaces

- apps/reference-ui: plain campaign/publisher/chat/inspector screens, specialist
  may later replace visuals without duplicating exchange/payment logic.
- packages/publisher: small sanitized-opportunity client and render acknowledgement.
- tests/demo: fixtures, HTTP/browser/agent integration scenarios.
- scripts/demo and artifacts: future launcher, runbook, manifests and sanitized
  recorded run. No wallet secrets, raw corpus or customer conversations.
- Shared schemas remain orchestrator-owned under packages/contracts.

Campaign API, opportunity API, read-only correlated event stream, delivery API
and operator payment API come from CONTRACTS.md. Browser holds only rendering
capability. Publisher backend signs receipts; agent cannot approve deposits.
Evidence panel consumes sanitized records rather than reading private files.

## Story and fixture policy

Main task: Find a hotel near Marina Bay for TOKEN2049; free cancellation required.
BayStay and MarinaRooms declare Singapore/free cancellation; AlpineStay declares
Switzerland and a higher cap. Fictional brands and advertiser declarations must
be labelled. Actual price/availability or partnerships are not implied.

Follow the established DEMO_AND_AGENT_HARNESS.md case matrix. Real eligible-skip
fixture: broad hotel target with conference-group creative versus solo traveller.
Hard exclusions do not count as model skips. Freeze fixture before model run;
record a bid if the model bids. A04 stays unproven until an actual eligible skip.

Organic answer request never receives sponsor profile/creative. The ad call runs
independently; failures cannot block the organic answer. Sponsor card is visibly
separate and labelled Sponsored. Delivery acknowledgement requires DOM insertion
and label presence, not human attention or endorsement.

## Four-minute walkthrough

| Time | Action | Evidence displayed |
|---|---|---|
| 0:00–0:40 | Show fictional campaigns, rules and caps | Immutable versions and network/mode |
| 0:40–1:40 | Submit task, inspect decisions and auction | Actual agent bid/skip; off-target rejection; policy/amount trace |
| 1:40–2:20 | Render separate card | Award -> publisher receipt -> accepted charge; loser unchanged |
| 2:20–3:20 | New turn, visibly pause other campaign after first actual winner | Two charges same winner channel; cumulative vouchers; settle/refund |
| 3:20–4:00 | Explain targeting data and protocol | Actual chain evidence if passed; measured pilot results and limitations |

Do not force a winner or fabricate the second bid to complete the accumulation
story. Use the actual first winner and record failures honestly. Scenarios not
shown live can be linked as clearly labelled deterministic/recovery evidence.

## Harness flow (conceptual, not implemented)

1. Validate environment and manifest; create fresh run-scoped state, preserve
   prior evidence and payment obligations. Runtime model/provider is explicit.
2. Load frozen campaign/task fixtures; show operator-configured funding ceiling.
3. Check configured payment mode; synthetic opens are labelled, actual opens
   require the accepted payment packet/network configuration and bounded authority.
4. Run organic answer and opportunity exchange concurrently but independently.
5. Capture candidate rejections and each actual agent result with provenance.
6. Display award; render approved text; authenticated publisher submits receipt.
7. Show accepted charge and later cumulative authorization as separate events.
8. Repeat legitimate second turn on same winning channel; close after drain.
9. Reconcile ledger/chain state, export sanitized report, record successful flow.
10. Replay evidence read-only, without calling model, funding or settlement routes.

## Acceptance and fixtures

| Check | Expected observable outcome | Acceptance IDs |
|---|---|---|
| Primary story | Actual decisions, eligible auction, rendered card, charge, settlement linked by IDs | A01–A04, A06, A09, A11, A12 |
| Genuine eligible skip | Real engine skip provenance, zero bid/charge for that decision | A04 |
| No-fill/failed render | Organic answer still returned; no charge or voucher advance | A07 |
| Duplicate/restart | Existing outcome returned; no second charge/payment | A08, A10 |
| Expiry/closure | No hidden late charge after frozen settlement watermark | A05, A08–A11 |
| Evidence honesty | Model/synthetic/sandbox/Devnet/replay distinct; no false attention or lift claims | A13 |
| Frontend handoff | Contract fixtures match real responses; browser cannot sign/pay | A14 |
| Reproducible run | Documented launcher and recorded complete flow; fallback explicitly replay | A15 |

Actual network flow is required for payment claims. A blocked Devnet channel is
not passed by a synthetic fixture or old x402 transfer. Rendering test proves
owned-app acknowledgement only. Recording tooling chosen during implementation
from existing installed tools; no paid recording service required.

## Handoff deliverables

Versioned schemas/OpenAPI/client DTOs; sample requests/responses for awarded,
no-fill, expired, accepted charge, unknown/finalized settlement; SSE cursor and
retry contract; sanitized fixtures; setup commands; state-to-screen map; basic
browser integration tests; existing design-system references. Financial logic
stays server-side. Final frontend specialist may begin against frozen fixtures,
but launch claims must come from actual integration, not permanent mock APIs.

## Bounded review

One fresh final review checks actual run evidence, algorithm explanations,
receipt/payment correlations and reproducibility. Fix substantive demo blockers;
do not turn it into a production security/scaling or visual-design review.
