# Architecture readiness gate — not an implementation GO

Current candidate: SPEC_V1, hash in SPEC_V1.sha256. Round1 is in progress.
This checklist is evidence-driven; blank boxes are unresolved, not presumed passes.

## Architectural decisions

- [ ] Exact right, issuer obligation, transfer/refund claim and expiry/recovery policy.
- [ ] Compatibility including remaining rights, signed price/time and auction policy.
- [ ] One-unit quantity and replace/cancel/self-trade rules with concrete examples.
- [ ] Every monetary/reservation/cursor authority and cross-layer race identified.
- [ ] Native asset/fees/rent/custody scope explicit and accepted.
- [ ] Complete bounded program accounts, instruction metas/bytes, signer/alias rules.
- [ ] Match and quantity-one ORDER uniqueness across different units/restored DBs.
- [ ] Chain/DB/delivery state machines and terminal conflict precedence complete.
- [ ] Durable outbox for ALL native effects, restoration/fencing and uncertainty rules.
- [ ] Full-chain refund solvency and terminal account/transaction-size feasibility.
- [ ] Threat matrix with explicit issuer/gateway/matcher/operator trust and limits.
- [ ] Exact interfaces and error/status/idempotency semantics frozen before coupling.
- [ ] Bounded property/concurrency/SIGKILL/localhost-validator acceptance matrix.
- [ ] Pinned toolchain plan, outstanding size checks and hard disk limits.
- [ ] Reuse/adapt/new matrix and historical-versus-future evidence boundaries.

## Independent review

- [ ] All three full round1 reports submitted against unchanged identical hash.
- [ ] Every finding entered in disposition ledger with changed rule or justified scope.
- [ ] Revised self-contained specification plus normative appendices frozen and hashed.
- [ ] All three independent round2 reports verify remediations and cross-layer rules.
- [ ] No open Critical/High, rights, authorization or settlement ambiguity.
- [ ] Every Medium explicitly accepted/bounded or fixed with validation requirement.
- [ ] New high findings trigger another revision/review, not majority waiver.

## Final authorization

- [ ] Parent receives complete spec, manifests, reports, dispositions and residuals.
- [ ] Parent orchestration01a17200-435b-74c1-9fd0-24a82e3f60ee independently reviews.
- [ ] Parent explicitly issues GO naming final version/hash and allowed local phases.

Only after ALL applicable boxes pass may local Sol builders resume. No tool install,
program build, validator transaction or source feature work occurs merely because
a document says ready. No push or external deployment is included in any local GO.

## Future execution acceptance (not architecture proof)

After GO, the program must compile/deploy on the isolated validator and actual
transactions/account deltas must pass the frozen test matrix. Architecture review,
synthetic tests and host-language compilation cannot replace that evidence. Overall
MVP completion remains false until the native execution requirements are satisfied.
