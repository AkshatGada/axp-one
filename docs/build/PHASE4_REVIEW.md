# Phase 4 focused independent review

Reviewer: fresh `gpt-6.1-sol`, high reasoning; agent
`01a0f69f-802d-71c2-abe5-f3cedbe87665` (Dirac),2026-10-01.
Read-only scope: native payment adapter/integration, accounting artifacts and
demo claims. No network calls, private keys, signing, purchases or edits.
One initial review and one bounded recheck; not a production security audit.

## Initial result

Recorded native sandbox evidence passed: deposit20000, charges3000+3000,
vouchers3000→6000, payout6000/refund14000; grossfees/rent6771200lamports.
Six Jev admissions, two operator-bridged organic answers, independent loser
skips and one funded advertiser were consistent with artifacts.

One P2 finding: SDK transport signed open/close transactions before estimating
cost; adapter checked the aggregate before broadcast, not before the signer.
This violated the requested pre-sign fee/rent gate even though actual costs
remained below the approved cap.

## Main correction

- Native SDK noop signer/compiled unsigned messages prepare open and closure.
- Unsigned simulation and fee/rent estimation occur in preparation.
- Aggregate prior+planned fee/rent must pass before either key-bearing signer.
- Missing estimates fail closed without signer invocation.
- Signing uses the exact saved unsigned message; no fee-bearing message rebuild.
- Fake transports assert zero open/close signer calls on excess costs.
- Native ephemeral fixtures verify unsigned-open/signed-message identity and
  cooperative closure using two fixture signers; no RPC or real funds.
- Historical artifacts remain unchanged; docs distinguish the recorded
  pre-broadcast gate from fixture-verified corrected pre-sign ordering.

## Bounded recheck

**PASS — sole finding resolved; no substantive demo blocker remains.**
Reviewer confirmed the saved test report:214total,208passed,6skipped,0failed,
and final browser replay screenshot. No additional live purchase was required.

Replay's “zero signing” means zero additional **payment** signing. Publisher
receipt acknowledgements may be signed again on duplicate delivery replay;
that does not create another charge, voucher or settlement.

This review supports the bounded local sandbox demonstration, not independent
production authorization, full MPP HTTP gateway compatibility, attention,
absorption, conversion lift or multiple-funded-bidder competition.
