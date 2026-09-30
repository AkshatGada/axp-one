# Consolidated component plan — review entry point

Status: consolidated planning draft ready for user review. Not implementation
approval, executed feasibility or a completed expanded-plan audit.

## Intended architecture

Offline ContextHint evidence -> frozen campaign profiles.
Online sanitized opportunity -> deterministic eligibility -> isolated advertiser
DecisionEngine -> code-computed bids -> first-price auction -> reservation ->
disclosed rendered card -> accepted receipt/charge -> cumulative MPP voucher ->
settlement. Organic answer remains independent.

## Proposed sequence and component gates

| Phase | Components | Exit evidence |
|---|---|---|
| 0 Research/spec | C01–C08 | All packets reconciled; user reviews contracts and unresolved choices |
| 1 Feasibility/foundation | C06 spike + C01 data + shared schemas | Pinned SDK/no-value tests; explicit network result; bounded snapshot/fixtures |
| 2 Synthetic exchange | C04/C05, C02 rules | One complete placement through receipt and ledger; no network claims |
| 3 Data/agents | C02/C03, C07 basic app | Real bid and eligible skip; fixed targeting comparison; separate organic answer/card |
| 4 Payments | C06 connected to C05 | Two accepted charges same channel; finalized payout/refund evidence |
| 5 Demo/handoff | C07/C08 | Reproducible recorded flow, labelled replay and final frontend API package |

Independent work can overlap; dependent integration gates cannot. Synthetic
exchange work need not wait for a finalized real-network payment, but a blocked
channel cannot be presented as a completed payment demo. No production scaling
or visual-design sprint is introduced to fill a payment delay.

## Orchestrator decisions to reconcile

1. Single canonical AgentDecision with no authoritative money; ExecutableBid
   constructed by code from a versioned policy.
2. campaignId stable across versions; campaignVersionId identifies immutable
   configuration. Auction tie rule uses stable campaignId.
3. channelId distinct from publisher randomSessionId; protocolSessionId is
   provider metadata, not interchangeable application identity.
4. Eligibility checks required declarations in code; soft-fit preferences remain
   an actual agent choice. High bids never bypass exclusions.
5. Accepted charge total is authoritative for cumulative vouchers; SDK delivery
   IDs map to charges, not browser opportunities or arbitrary ad fetches.
6. Actual source/test mode is explicit. Existing Devnet wallet reuse is approved,
   but network compatibility, mint, balances and spend limits are separate gates.

## Component review boundaries

One focused fresh review per connected slice, with one substantive-fix recheck.
Review observable algorithm, contract and demo correctness, not speculative
production resilience. Final system review evaluates actual run evidence, not
just plans or isolated unit tests. Previous baseline spec audit does not apply
automatically to this expanded component package.

## Expected user review choices

- Confirm the bounded travel/hospitality demo and fictional campaign story.
- Review score-to-bid policy, held-out benchmark labels and any paid-call ceilings.
- Review MPP artifact/network compatibility result; do not silently substitute
  sandbox for Devnet or exact transfers for payment channels.
- Approve implementation scope separately from token spending and deployment.
- Keep final frontend with the specialist; main team delivers basic functional UI.

## Reconciled scope decisions

- Canonical DecisionEngine accepts one advertiser's campaign per call. Models
  receive no budget/amount fields. Financial snapshots remain in deterministic
  bidder policy. Scores have explicit 0–3 levels, normalization level/3 and null
  conversion probability. C02 owns rubrics; C04 owns integer bid construction.
- Adopt the proposed fit_intent_bid_v1 bands and fictional 4000/5000/9000 maximum
  bid fixtures for review. These are not deposits or authorized token payments.
- Keep the 100/250/1000 arithmetic as a separate payment test. Actual demo charges
  come from actual auction results; never rewrite them to match protocol fixtures.
- C01 snapshot caps and grouped splits constrain the data study. If historical
  grouping is too interconnected for held-out partitions, report that study
  blocked; the frozen fictional-agent exchange demo can still proceed. Do not
  random-split rows or claim the data advantage proven by the fixture demo.
- The 40-case targeting pilot and latency comparison are bounded experiments,
  not blockers for a rules-backed working exchange. Start with one human review
  of task-fit labels if a second reviewer is unavailable; label results exploratory
  and retain the baseline for inconclusive engine-adoption evidence. Do not hold
  the hackathon demonstration hostage to a two-reviewer research study.
- The proposed $20/paid-call budget is unapproved. Freeze pricing and obtain the
  relevant paid-call authorization before execution; no unlimited calls or extra
  model arms follow from having a key.
- Pin the payment spike to the proposed PayKit source commit in C06, with filtered
  build/import verification. Build failure is evidence requiring an explicit
  artifact revision, not permission to spend days repairing an upstream workspace.
- First no-value tests cover exact cumulative increments, retry identity and saved
  final-voucher closure. Then read-only/simulation Devnet checks; funding only after
  compatibility and bounded authority. No custom program deployment in scope.
- C06 idle-close/store compatibility is an execution hypothesis, not a proven
  integration. Its failure requires a scoped design decision, not silent bypass.
- Publisher is the AI-app operator and advertiser is the buyer; existing old
  sponsored-report/document-quiz flow is not part of this new ad-slot MVP.

## Packet register

| Component | Packet | Author / status |
|---|---|---|
| Shared seams | [Shared contracts](SHARED_CONTRACT_PACKET.md) | Orchestrator; review draft |
| C01/C02 | [Data and targeting](DATA_TARGETING_COMPONENT_PACKET.md) | Sol 6.1 High; proposal reconciled above |
| C03/C04/C05 | [Agents, auction and delivery](EXCHANGE_COMPONENT_PACKET.md) | Orchestrator; adviser failed model capacity; not a completed agent audit |
| C06 | [Payments](PAYMENT_COMPONENT_PACKET.md) | Sol 6.1 High; proposal, network execution gated |
| C07/C08 | [Demo and handoff](DEMO_COMPONENT_PACKET.md) | Orchestrator; review draft |

Each packet contains purpose/non-goals, interfaces, paths/dependencies, algorithm
or protocol flow, fixtures, acceptance checks and focused review boundaries.
After user review: generate executable shared schemas, start bounded feasibility
and data work, then dispatch isolated component builders under this plan. No
builders or transaction tasks are authorized merely by completing this document.
