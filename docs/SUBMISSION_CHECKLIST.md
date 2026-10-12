# AXP essential release journey

Scope: one advertiser owns an approved campaign; a separately owned AI app uses
its own SDK credential, displays a disclosed card and sees the same accepted
receipt in its earnings that the advertiser sees in spending.

The account-network candidate is separate from the public deployment. This list
distinguishes implementation, non-spending acceptance and funded release evidence.
Landing pages, shared demonstrations and historical recordings are preserved.

## Phase 1 — Owned setup and integration readiness

- [x] Dedicated Supabase Auth and PostgreSQL profiles, campaign versions, exact
  approval and owner-scoped app credentials are implemented.
- [x] Align generated SDK instructions with the app's actual serving mode.
- [x] Let the signed-in app owner inspect integration readiness without putting
  the server-only SDK credential in browser requests.
- [x] Verify ownership denial and that readiness performs no model or payment calls.

## Phase 2 — Private activity and money visibility

- [x] Show bounded saved opportunities, policy exclusions, genuine model skips,
  unavailable decisions, bids, wins/losses and delivery outcomes.
- [x] Keep campaign reports scoped to that advertiser and app reports to that app;
  omit raw questions, competitor declarations and credentials.
- [x] Receipt-linked accepted/reserved totals are separated by settlement network.
- [x] Channel interfaces distinguish accepted accrual, cumulative authorization,
  finalized payout and unused refund; these are not interchangeable states.

## Phase 3 — Complete non-spending acceptance

- [x] Separate advertiser/app accounts create and restore their own resources.
- [x] Save → approve → explicitly enable → scoped SDK request → render a separate
  Sponsored card → acknowledge → inspect both owners' reports.
- [x] Editing invalidates approval; pause, caps and app restrictions affect serving.
- [x] No-fill, unavailable model, rejected delivery, revoked/wrong-app keys and
  cross-owner access produce no accepted charge or private-data disclosure.
- [x] Duplicate and restarted turns recover saved outcomes without repeat calls
  or charges. Organic answers receive no advertiser material.
- [x] Exercise the account UI and independent SDK HTTP path, then run focused
  tests, typechecks and repository regressions on the same candidate.

Fixtures must remain labelled synthetic. Local acceptance does not establish
fresh hosted acceptance, actual Jev execution or participant-wallet settlement.
Broadcasts remain disabled; this phase makes no funds movement or paid model calls.

Phases 1–3 were verified locally on 12 October 2026 using separate fixture owners,
injected decisions and synthetic accrual. See [connected acceptance](accounts/CONNECTED_JOURNEY_RESULT.md)
for commands, browser checks and the precise remaining release gates.

## Phase 4 — Separately authorized funded and hosted acceptance

- [ ] Real advertiser/app wallet extensions prove ownership without spending.
- [ ] Agree explicit deposit, charge, fee/rent and model-call limits before funding.
- [ ] Finalized own-wallet deposit → genuine eligible decisions → accepted receipt
  → explicit cumulative authorization → finalized payout and unused refund.
- [ ] Recover uncertain attempts using saved transaction identities, without
  replacement purchases. Closing adds no delivery charge.
- [ ] Verify the hosted candidate with independent owners and an external chat app.

Current own-wallet scope is Solana Devnet/test USDC and cooperative closure,
not mainnet or unattended delegated buying. Historical demo settlements remain
separate evidence. See [finance verification](accounts/FINANCE_CLOUD_ACCEPTANCE.md).

## Phase 5 — Submission package

- [ ] Merge only approved candidate changes while preserving specialist frontend work.
- [ ] Pin the revision, SDK artifact, configuration instructions and evidence hashes.
- [ ] Verify public links and a concise captioned connected walkthrough; retain
  credential-free, mutation-rejecting offline replay.
- [ ] Application, repository, hosted product and recording describe the same
  verified scope. ContextHint library/combined traction is not AXP enrollment.
- [ ] Confirm organizer deadline, eligibility and entered-track requirements in
  the actual portal before submitting.

## Deferred

Password recovery for unrestricted public rollout, elaborate reporting, broad
responsive redesign, enterprise teams/SSO, infrastructure scaling, mainnet,
new payment rails, inference credits and agent-facing paywalls are outside this
slice. Ownership, exact approvals, correct recipients, duplicate safety and
truthful financial states are necessary product behavior—not optional hardening.

See [system architecture](ARCHITECTURE.md),
[account verification](accounts/STATUS.md) and
[account contracts](accounts/CONTRACTS.md).
