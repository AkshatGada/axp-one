# Independent specification review

Status: planning complete and ready for user review. Four findings addressed;
bounded recheck completed. No implementation sign-off or executed tests implied.

Reviewer: Archimedes, 01a0f236-55a1-7071-9d92-edfc649dcdc6,
gpt-6.1-sol high, fresh context, read-only. Read all 15 original README-linked
documents. Same-family role separation is not a guarantee of unbiased validation.

## Initial findings and remediation

1. P1: different keys could create opportunities for the same turn. CONTRACTS,
   ALGORITHMS and FLOWS now require business uniqueness and conflict semantics.
2. P1: receipt acceptance could race expiry/closure. CONTRACTS and FLOWS now
   serialize admission/expiry and drain reservations/signing before watermark freeze.
3. P2: AlpineStay policy exclusion was not a model skip. DEMO now labels it
   policy_excluded and defines a separate eligible soft-fit actual-agent case.
4. P2: two turns could charge different channels. DEMO now visibly pauses the
   competing campaign after the actual first winner, requiring two genuine
   accepted placements on the same channel without fabricated agent output.

Reviewer conclusion: ready for user review with four findings, not a clean
implementation sign-off. Unproven gates: receipt-controlled MPP metering,
test-network channels, replay/restart/payout/refund, model runtime and pinned
AdCP mapping. No false affirmative standards-conformance claim found.

## Recheck scope

Confirm these four corrections and consistency of the new Jev DecisionEngine
and benchmark docs with the architecture. No broad audit cycle, API calls,
installations, wallet access or payments. Record actual recheck result below.

## Bounded recheck result — 2026-09-30

Same fresh reviewer: "Ready for user review. No remaining concrete demo-blocking
specification defect found in this bounded recheck."

Reviewer confirmed all four fixes and Jev/architecture consistency. One
nonblocking wording issue (one invocation per opportunity versus eligible buyer)
was corrected to "at most one model invocation per eligible buyer/opportunity"
in ALGORITHMS.md. No further audit cycle required.

Protocol SDK feasibility, actual model/API performance and executed recovery/
settlement tests remain future implementation gates, not completed evidence.
