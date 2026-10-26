# Architecture audit protocol

Implementation is paused by direct user instruction. This gate supersedes the
initial plan-complete/start-build rule. The parent coordinates exactly three local
GPT-6 Astra High review chats; this chat is the sole architect/reconciler.
No duplicate reviewer or replacement lead is created here.

## Independence and scope

Round1 reviewers receive the SAME frozen SPEC_V1.md and SHA-256. They may inspect
relevant source/primary docs read-only, but must not read one another's reports or
receive each other's conclusions before submitting independent initial findings.
Domains: market/matching/economics; Solana/program/security/settlement; backend/
consistency/crash/recovery. Each includes cross-layer boundary checks.
Only assigned audit Markdown may be written. No source edits, tests, installs,
validator execution, paid calls, remote mutations, push or implementation workers.

Every finding: stable ID, severity(Critical/High/Medium/Low), exact spec section,
concrete adversarial trace or counterexample, impact, required correction, alternatives
considered, residual risk and proposed falsification/acceptance test. Distinguish
normative spec gaps from unimplemented work and uncertain toolchain facts. Review
severity is reasoned, not a numerical quality score. Return PASS/CONDITIONAL/FAIL
for the domain, with explicit unresolved questions.

Lead produces disposition ledger: accepted/rejected/deferred, reason, exact revised
section, required test and remaining risk. Rejected critical/high findings require
a reasoned reviewer resolution; absence of majority agreement is not approval.
Freeze SPEC_V2.md and its hash; retain v1 and every original report unchanged.

Round2 reviewers inspect v2 plus the disposition ledger and all initial findings,
verify remediation and cross-layer consistency, and write new signed-off reports.
Any unresolved critical/high or economic/authority ambiguity blocks implementation.
New high findings trigger a further frozen revision and explicit verification.
Medium findings require bounded scope or accepted residual rationale and test.

Final packet: latest frozen spec+hash, reuse matrix, toolchain/disk feasibility,
all reports, disposition ledger, explicit gate checklist, deferred work, exact
implementation assignments and planned acceptance commands/evidence. Native results
are future requirements, never inferred from prototype success.

Parent chat01a17200-435b-74c1-9fd0-24a82e3f60ee independently reviews the packet.
Only its explicit GO after the user-defined criteria permits resuming Sol builders.
Until then report packet-ready/waiting; do not self-authorize a build.
