# Phase 3 — connected model placement

Frozen 2026-10-01 before provider execution. User requested plan and execution.
Owner: orchestrator; Codex adapter/tests delegated to gpt-6.1-sol high.

## Outcome

Connect the already measured decision layer to a real owned-app placement:
three isolated Jev buyers -> deterministic first-price auction -> separate
Sponsored DOM card -> authenticated publisher receipt -> one synthetic charge.
A second legitimate turn must add a second charge on the same winning channel.
An independent gpt-6.1-sol low answer receives only sanitized task context, never
campaigns, profiles, bids or a winning ad. Final visual design is not this phase.

## Frozen story and seams

Use Phase 2's fictional TripDesk, AgentPass and HotelOps declarations and reviewed
cached source IDs. Historical brands are evidence, not actual enrolled bidders.
Primary task: Find a tool for corporate travel booking and automatic expense capture.
Two distinct turn IDs use that same task in one run/session. All three offers
are hard-policy eligible, so an off-task skip must come from the actual engine.
Capability requirements are advisory task-fit inputs, not prefilter exclusions.
The normalized travel_tools opportunity has destination unknown, no mandatory
product declarations, and soft preferences identifying the explicit requested
capabilities. No private conversation is forwarded.

Phase 3 adds a configured session seam (campaigns, opportunity builder and
runtime providers), not a second exchange. Shared DecisionEngine outputs retain
the existing score rubric. The exchange still validates own creative/evidence
IDs and computes all amounts using its existing integer policy.
History IDs are not promoted into financial evidence; Jev returns the selected
creative's approved declaration IDs. No silent rules fallback or forced winner.

## Course of action

1. Add fresh-run opt-in runtime/launcher; preserve baseline rules and old state.
2. Reuse read-only cached profiles; wire isolated bounded Jev buyers and independent
   Codex answer, persist actual provenance and per-call budget admission.
3. Test full connected flow offline, including timeout/no-fill, failed render,
   duplicate/restart and two accepted charges on one synthetic channel.
4. Execute the frozen task in the browser twice with actual models, inspect the
   separate card before acknowledging delivery, export correlated run evidence.
5. Run existing tests and one focused fresh review, fix demo blockers once, update
   the phase result/gates. Do not expand into production hardening.

## Bounds

At most six new Jev calls (three own-campaign buyers per two legitimate turns),
and two Codex answer calls. These are a new Phase 3 integration bound; Phase 2's
28-call allowance remains exhausted. No automatic retries, no CLI fresh-run
reset reopening the allowance. Persist attempted-call admissions in run state
before network invocation so restart cannot repeat an admitted purchase.
No wallet/signing/token transfers, production changes, source writes/clone,
new embeddings, global Codex config, push or deployment. Existing Jev credential
is loaded server-side only; never sent to browser/model/logs. Stop if free disk
would fall below 50 GiB. Outputs should be small JSON evidence, not a corpus dump.

## Acceptance

- Fresh actual Jev outputs, including a genuine eligible skip, feed the auction.
- Actual sponsor-free Codex answer; its input hash/provenance recorded.
- Two actual DOM insertions/disclosure checks yield two signed accepted receipts.
- Only winner charged; second accepted charge uses same channel; synthetic
  authorization is the cumulative sum, not a new charge or real settlement.
- Replay/restart makes no model calls and creates no additional charge.
- Offline no-fill and failed-render tests preserve an independent answer/no charge.
- Reference console clearly separates actual model execution, historical evidence,
  synthetic financial accounting and recorded outcomes. No quality lift, full ad
  reading, attention, endorsement, verified performance or Devnet claim.

If the actual engine skips/abstains everywhere or winners differ, preserve that
result and mark the missing gate rather than supplying mechanical decisions.
Real payment-channel feasibility/settlement remains Phase 4, not satisfied here.

## Observed runtime correction (after first actual placement)

The bundled CLI rejected gpt-6.1-sol for the current login. Three actual Jev
decisions and the first DOM receipt/charge succeeded; the failed CLI answer is
preserved. Corrective runtime: two fresh gpt-6.1-sol low app subagents, each given
only the task and sponsor-free answer instructions. An operator-attested local
answer bridge connects those actual completions. It is not an unattended CLI
runtime or proof of external isolation. Record agent IDs and supplied-prompt hash.
The bound is now one failed CLI attempt plus two app-agent completions; six Jev
calls remain unchanged. No new auction/charge is allowed to repair the first
answer. Save its recovery separately from the original turn record.
