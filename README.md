# AXP.one — The advertising exchange for the agentic internet

Repository: `agentic-dsp`. Product positioning confirmed by the user on 2026-09-30.
The DSP is the advertiser buying subsystem; the exchange connects buyer agents
and AI publishers. The first beachhead is conversational AI sponsored cards.

Status: planning repository. No application, SDK integration, auction run or
payment has been implemented here. Local Git only; no remote or deployment.
Baseline planning package reviewed 2026-09-30. The later data/ML and delegated
component-specification expansion is still being reconciled; see planning
progress. That earlier review does not certify the expanded plan or any build.

Advertiser agents buy disclosed placements inside participating conversational
AI applications, subject to campaign rules and authorized spending ceilings.
An off-chain exchange correlates accepted delivery events with accumulated
stablecoin settlement. It does not sell organic recommendations or agent attention.

## Review order

1. [North Star and MVP boundary](docs/NORTH_STAR.md)
2. [Research and open-source reference register](docs/research/REFERENCES.md)
3. [Architecture and ownership](docs/ARCHITECTURE.md)
4. [End-to-end flows and failure states](docs/FLOWS.md)
5. [Buying and auction algorithms](docs/ALGORITHMS.md)
6. [Payment model and feasibility gates](docs/PAYMENTS.md)
7. [API and data contracts](docs/CONTRACTS.md)
8. [Threat and evidence boundaries](docs/SECURITY_AND_EVIDENCE.md)
9. [Build sequence and acceptance matrix](docs/IMPLEMENTATION_PLAN.md)
10. [Frontend specialist handoff](docs/FRONTEND_HANDOFF.md)
11. [Decisions and remaining feasibility questions](docs/DECISIONS.md)
12. [Independent planning review](docs/audits/SPEC_REVIEW.md)
13. [Repository and domain separation](docs/REPOSITORY_MAP.md)
14. [Shared existing design system](docs/DESIGN_SYSTEM.md)
15. [Hackathon demo and test-agent harness](docs/DEMO_AND_AGENT_HARNESS.md)
16. [Replaceable DecisionEngine and Jev buyer](docs/DECISION_ENGINE.md)
17. [Jev comparison and benchmark plan](docs/JEV_BENCHMARK_PLAN.md)
18. [ContextHint corpus exploration and targeting advantage](docs/research/CONTEXTHINT_DATA_EXPLORATION.md)
19. [Plugin tools, backend APIs and deeper reuse map](docs/research/CONTEXTHINT_TOOL_API_MAP.md)
20. [ML-only component, data and Mac Studio plan](docs/ML_PLAN.md)
21. [Component execution, builder ownership and orchestration](docs/COMPONENT_EXECUTION_PLAN.md)
22. [Shared contract review packet](docs/SHARED_CONTRACT_PACKET.md)
23. [Planning progress and pending gates](docs/PLANNING_PROGRESS.md)
24. [Demo component and final frontend handoff packet](docs/DEMO_COMPONENT_PACKET.md)
25. [Consolidated component-plan review entry point](docs/COMPONENT_PLAN_REVIEW.md)
26. [C01/C02 data and targeting component packet](docs/DATA_TARGETING_COMPONENT_PACKET.md)
27. [C03/C04/C05 agent, auction and delivery component packet](docs/EXCHANGE_COMPONENT_PACKET.md)
28. [C06 payment component packet](docs/PAYMENT_COMPONENT_PACKET.md)

The ContextHint research supplement is a later read-only addition to the reviewed
baseline; data integration and its ablation tests are not implemented or covered
by the earlier spec recheck.

## What is new versus AXP

AXP demonstrated sponsor-funded access to an owned paid report. This repository
is an advertising marketplace: AI apps sell separate sponsored-card placements;
agents represent the advertiser buying those placements. No document quiz or
report-unlock gate is required. Earlier receipt, restart and budget lessons are
design inputs, not evidence that this new system already works.

The immediate output is a reviewed plan for the user's approval. The later build
will include backend plus an intentionally plain functional UI. Final frontend
visual design belongs to the user's specialist agent.
