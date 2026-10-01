# Demo-first execution, verification and completion loops

Status: execution policy approved for restart by user, 2026-09-30.
Complements MVP_MASTER_PLAN.md. Restart does not authorize paid calls or transfers.

Current slice override2026-10-01: user approved existing-cache-only reuse and
Phase2. PHASE2_TASK.md bounds its provider probe, and PHASE2_RESULT.md records
28 completed calls (bound exhausted). Existing source is reused read-only;
older lane proposals for fresh corpus vectors/exports are not current defaults.
No clone, source writes, full-corpus regeneration, model adoption or settlement
authorized by the experiment. Cached-only absence stays unavailable.

## North Star

Deliver an outstanding, truthful, reproducible hackathon demonstration of AXP:
data-informed advertiser agents buy a relevant sponsored placement, a publisher
renders it separately from the organic answer, and receipt-linked charges
accumulate and settle through an actual compatible test-network payment channel.

Winning is the ambition, not an outcome we can guarantee or a completion test.
Our controllable target is a compelling, functioning, evidence-backed demo.
ML results determine what we may claim; presentation never substitutes for execution.

## Fixed versus experimental versus feasibility-dependent

| Class | Parts | How to work | When to stop improving |
|---|---|---|---|
| Fixed semantics | Disclosed ad; organic answer independence; advertiser isolation; model has no monetary authority; canonical IDs/modes; accepted delivery billing; integer caps; duplicate/restart behavior | Implement the frozen contract and test critical paths | Acceptance passes in connected flow; no speculative production expansion |
| Fixed initial choices | Local modular backend/SQLite, one travel vertical, fictional campaigns, first-price auction, one card, one publisher, plain reference UI | Build simple baseline; change only for a documented concrete blocker | Demo works and specialist can consume API |
| Experiments | Historical-evidence retrieval/profile quality, relevance scoring, Jev vs simpler engines, creative choice, genuine agent skip, score-to-bid bands | Hypothesis, frozen comparison, bounded trials, decision | Adopt supported improvement or retain baseline and record inconclusive/negative result |
| Feasibility gates | Actual embedding runtime, configured Jev transport, real agent runtime, MPP artifact/deployed channel compatibility | Small pass/fail spike with explicit resource/authority boundaries | Capability demonstrated, or exact blocker/change proposal recorded |
| Presentation iteration | Functional publisher experience, decision explanations, research panel and demo sequence | Rehearse the connected story; remove confusing steps | Story fits four minutes, labels are clear, successful recording exists |
| Deferred | Production tenancy, fleet scaling, conversion optimization, strategic planning agents, broad integrations, final visual design by main builder | Keep out of active work | Only reconsider with a specific authorized scope change |

Fixed does not mean unchangeable or unimprovable. It means no ongoing research
is needed to implement it. Changes require a reason and dependent-test reruns,
not an arbitrary quest for the most sophisticated implementation.

## Demo beats and evidence obligations

1. **Configure:** advertiser shows approved ad, task rules and bounded spending.
2. **Match:** real task retrieves relevant ContextHint evidence; compare a simpler
   engine against the history-informed engine without claiming unmeasured lift.
3. **Decide:** actual isolated buying agents bid or skip; show supporting reasons.
4. **Auction:** show competing candidates and a rejected higher off-target bid.
5. **Deliver:** independent organic answer plus Sponsored card; accepted receipt.
6. **Accumulate:** second legitimate placement, same channel, two charges and
   saved cumulative authorization; no charge to the loser.
7. **Settle:** actual payout/refund evidence; finish with what the data supports.

Each task must name the beat it enables and the exact artifact proving it.
A task without a beat or a required correctness gate is deferred by default.
Do not force a desired model result, hide no-fill, invent evidence or substitute
a synthetic payment for the required actual settlement.

## Parallel lanes and merge gates

At most three component builders active. Main orchestrator handles shared
contracts, integration, state tracking and the rehearsal; no builder owns the
whole product. Final frontend stays specialist-owned.

| Lane | Work | Can start with | Required merge evidence |
|---|---|---|---|
| A Data/decision research | Real bounded export, live embeddings, profiles, benchmark and Jev adapter | Frozen snapshot/DecisionEngine contracts; approved call/resource bounds | Provenance + engine outputs + tests + measured comparison + limitations |
| B Exchange/publisher | Campaigns, opportunities, organic answer seam, agents, auction, delivery and reference API/UI | Frozen contracts and explicitly labelled fixture engines | One connected placement with receipt/charge and failure branches |
| C Payment feasibility/adapter | Small artifact spike, deployed compatibility, cumulative payment and close | Frozen accepted-charge seam; no wallet signing needed for first spike | Ready/blocked feasibility report; compatible adapter tests; actual network evidence only after bounded authorization |

Main integrates B's baseline while A and C work independently. A replaces the
baseline through the same interface; C replaces the synthetic payment adapter
through the same interface. Integrate small increments immediately, not all
components at the end. Fixture runs remain labelled while real adapters are absent.

If C is blocked, continue A/B and package their evidence, but do not call the
complete MVP finished. After one bounded attempt and one scoped corrective
attempt, report the blocker and alternatives rather than repeatedly repairing
upstream tooling or secretly changing the protocol/network.

Frontend specialist can consume frozen fixtures/API contracts in parallel once
available. The specialist's visuals must eventually connect to actual backend;
the reference console remains a working fallback, not a competing design project.

## Loop 1 — component self-verification

Every assigned component has a short task card:

```text
ID / owner / owned paths:
Demo beat and acceptance IDs:
Dependencies and frozen interface version:
Current baseline and missing behavior:
Planned change (or experiment hypothesis):
Tests and observable evidence required:
Time/call/storage/spend bounds and retry limit:
Stop condition / blocker escalation:
Result / artifact paths / remaining limitations:
```

Run: read contract -> implement one bounded increment -> test -> inspect real
outputs -> compare acceptance -> hand off. A failed test triggers a targeted
repair and rerun, not new unrelated features. Passing isolated tests advances
only to tested; main must verify connected behavior before integrated/demo-proven.

Builder handoffs include commit/changed paths, actual commands, results,
unresolved gaps and requested contract changes. No claims such as trained,
benchmarked, real agent, finalized payment or deployed without their evidence.

## Loop 2 — experimental improvement

Before execution, freeze:

- Hypothesis, comparator and exactly one change being evaluated.
- Dataset/campaign/profile/engine hashes and grouped partitions.
- Label provenance, task-fit rubric and withheld final test.
- Metrics, adoption rule, run/call/concurrency bounds and actual provider pricing.
- Failure counting, unavailable-arm treatment and next-step stopping rule.

Core four-arm pilot: rules, text embeddings, history embeddings, history Jev.
Jev without history may isolate the data effect at a fixed model if budget allows.
Start with the planned 40 labelled cases; any generated/agent-reviewed labels
must be distinguished from human-reviewed labels. No manufactured conversion labels.

Adoption order: preserve deterministic constraints; avoid worse task-fit/skip
behavior; then judge quality, total latency, failure rate and cost together.
Freeze the minimum worthwhile quality improvement and tolerated latency/cost
before seeing results. If evidence is inconclusive, keep the baseline and show
the experiment honestly. No predetermined requirement for Jev or history to win.

Allow the initial comparison plus one clearly motivated revision on validation
cases. Do not repeatedly tune on the final test. Report uncertainty and sample
size; 40 cases do not establish large-scale advertising effectiveness.

Experiments finish with a decision: adopt, reject, inconclusive or unavailable.
More model complexity is not itself success. A completed negative experiment
is useful evidence, while a functioning required model path is still necessary
for the actual agent demonstration.

## Loop 3 — orchestrator drift and integration check

Run at every handoff and before a new wave:

1. Which demo beat did this work advance?
2. Did it finish required behavior or only add scaffolding?
3. Does its interface still match the other lanes?
4. Which claims are backed by executed artifacts?
5. What currently prevents a full recorded demo?
6. Is the next task removing that blocker or polishing an already adequate part?
7. Is authorization/resource scope unchanged?

Update one live gate table in BUILD_PROGRESS.md. Track the actual critical path,
not the number of tasks, tests or documentation pages produced. Prefer connecting
the next missing demo step over optimizing an already-working step.

Current gaps: actual corpus export/unseen-task embedding, live Jev and agent
runtime, integrated publisher/API flow, compatible actual channel execution,
and complete recorded evidence. These are not resolved by adding more unit tests.

## Loop 4 — self-completion and rehearsal

After each integrated slice:

1. Run the relevant scripted story from fresh run-scoped state.
2. Capture actual model/provider, decisions, auction, delivery and payment mode.
3. Reconcile IDs and amounts through the evidence bundle.
4. Replay without side effects and exercise the required failure branches.
5. Mark gates pass/fail/blocked, choose the highest-impact missing gate, repeat.

Continue automatically through safe, approved local steps. Stop for an explicit
user pause, a required scope/authority decision, an exhausted experimental bound,
or actual completion. Persistence is not permission for unbounded calls, automatic
extra purchases or hidden protocol substitutions.

Proposed demo gates, with no compensating overall score:

| Gate | Pass condition |
|---|---|
| G1 Data grounding | Real bounded corpus/provenance, compatible live task vectors, retrieved examples |
| G2 Measured decisions | Frozen pilot/results; baseline comparison; actual bidder outputs and genuine eligible skip |
| G3 Exchange correctness | Relevant competition/off-target rejection, clear bid policy, no-fill and conserved caps |
| G4 Publisher experience | Actual independent answer and disclosed rendered card linked to accepted receipt |
| G5 Payment | Two accepted charges on one actual channel; finalized payout/refund; replay does not pay again |
| G6 Demo package | One-command launch, four-minute successful recording, sanitized correlated evidence and read-only replay |
| G7 Handoff/review | Stable frontend contract package; focused fresh review finds no unresolved demo-blocking claims/behavior |

All gates must pass for full completion. Synthetic results may pass development
checks but not G5. Completion does not depend on positive ML lift: it depends on
performing the comparison truthfully and demonstrating real agent behavior.

Before the final recording, freeze campaigns, dataset/model versions, interfaces
and script. No new algorithms during final rehearsal. Fix only demo blockers;
any behavioral change reruns the affected gates. Recording retries must not
automatically authorize additional transactions.

## Review policy

Self-verification does not establish unbiased quality. Use a fresh reviewer for
the experiment methodology and connected demo evidence, within the existing
bounded review policy. Review substantive algorithm/protocol/demo issues, fix
them once and do a focused recheck. Avoid broad production-hardening cycles.

## Immediate planning decisions before restarting

1. Review this workflow and the fixed/experimental component classification.
2. Freeze measurable ML adoption criteria and pilot/call bounds before execution.
3. Resolve the actual runnable agent/embedding/provider choices without silent
   model substitution; scope the smaller payment-artifact feasibility attempt.
4. Assign lane task cards from the master plan, then restart only approved work.

Local implementation restarted at the user's explicit instruction. Financial
operations retain separate bounded authority and feasibility gates.
