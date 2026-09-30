# Decisions and feasibility register

2026-09-30. A decision-ready planning baseline, not an implemented final system.

| ID | Decision | Why / boundary |
|---|---|---|
| D01 | New local agentic-dsp repo | no modifications to AXP/live/citation apps |
| D02 | Product = AXP.one exchange; DSP = buyer module | user confirmed positioning |
| D03 | One owned AI app, 3 fictional campaigns, one card | show coherent complete marketplace, no fake partnerships |
| D04 | Rule-enforced agent buying + first-price auction | autonomous reasoning without model-held financial authority |
| D05 | Separate ad from organic answer | payment buys disclosed inventory, not endorsement |
| D06 | Proposed MPP session accumulated settlement | repeated use; test SDK semantics before implementation |
| D07 | Direct publisher payee, zero network fee | avoid pooled custody and unproven revenue splitting |
| D08 | SQLite modular monolith | smallest persistent concurrency-safe local system |
| D09 | Native contracts + narrow AdCP mapping | avoid invented compatibility or broad standards implementation |
| D10 | Basic reference UI here, final frontend external | user assigned specialist ownership |
| D11 | No quiz/document absorption gate | different purchased event from earlier AXP |
| D12 | No install/spend/push/deploy during planning | finish and review foundations first |
| D13 | Hackathon algorithm/protocol demo first | defer production tuning and broad audit cycles |
| D14 | Jev-powered advertiser buyer is an approved experimental role | each buyer evaluates its own campaign and recommends bid/skip plus approved creative; benchmark before default adoption |

## Approved Jev buyer role

The publisher offers inventory; the advertiser's buying agent decides whether
to participate. Jev may power that per-opportunity bid/skip judgment behind the
replaceable DecisionEngine interface. Each buyer receives only its own campaign,
approved creatives and sanitized opportunity, not competing bids or wallet keys.
Code validates the response, computes the permitted integer bid, enforces caps
and restrictions, runs the auction and authorizes payments. A Jev bid recommendation
is not permission to spend or a guaranteed auction win. Skip/abstain produces no bid.

Publisher-side Jev fit assessment is optional future work, not required for the
MVP; publisher eligibility rules remain deterministic. Approval of this role is
not a claim that Jev beats rules or embeddings. See DECISION_ENGINE.md and
JEV_BENCHMARK_PLAN.md for the comparison and fallback policy.

## Unresolved implementation gates, not hidden product decisions

- P1: pinned session SDK allows receipt-controlled dynamic pricing, not just a
  fixed stream meter. Must pass before channel integration begins.
- P2: intended Devnet channel program/mint/client/facilitator environment is
  available and testable; sandbox is not substitute evidence.
- P3: exact live-model/runtime access is verified, no silent model substitution.
- P4: concrete AdCP discovery schema scope and release are pinned before adapter.
- P5: delivery-before-voucher owned-demo trust is documented/tested; production
  enforceability remains outside MVP, not solved by a signature.
- P6: new operator spending ceiling covers network fees/rent/deposits/charges;
  no inherited AXP wallet authority or automatic replenishment.

## Deferred decisions

Publisher seller LLM, commercial network onboarding, fees/splits, conversion
attribution, bidder optimization/learning, interoperability certification,
production privacy/legal compliance, domain/public-site release, cloud hosting
and repository license. None should delay documentation review.
