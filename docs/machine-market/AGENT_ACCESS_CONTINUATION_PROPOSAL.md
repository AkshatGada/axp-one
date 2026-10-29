# Approved continuation — preparation checkpoint

29 October 2026. The human approved this proposal and the extra 600,000 ms. The
minimal partial-completion resume change is implemented. Five focused checks pass.
A same-ledger restart verified the original native state without new funding or
native operations. No human Run click arrived; the validator was stopped to preserve
the remaining window. Actual cumulative active time is **1,468,412 ms**, with
**331,588 ms** remaining under the approved **1,800,000-ms** cap. Financial usage
remains **14/32 attempts** and **0.216/0.25 LOCAL test SOL funded**. Direct proof,
direct workflow case and the original authorization cache retain their exact hashes.
The original proposal below records the approved scope; it is not a new allowance.

# Three untouched local cases — continuation proposal only

29 October 2026. No execution or cap change is authorized by this document.
Current evidence is in [the runbook](AGENT_ACCESS_RUNBOOK.md) and
[execution status](../../artifacts/machine-market/agent-access/EXECUTION_STATUS.json).

## Remaining scope

Only sponsored success, direct admitted failure/buyer refund, and sponsored admitted
failure/sponsor refund. Preserve the completed direct-success Unit and its source,
response, signatures and settled payout. Do not run direct success again.

The stopped run used **1,176,234 ms** of the original **1,200,000-ms** cumulative
active runtime allowance; exactly **23,766 ms** remains. That does not provide a
practical window for three native Fund/Start/terminal sequences and human handoffs.
Propose **600,000 ms (10 minutes) additional active runtime**, changing only the
cumulative runtime ceiling to **1,800,000 ms (30 minutes)**. Future active allowance
would be **623,766 ms**, including startup and human interaction. Stop when unused;
this is a ceiling, not a requirement to keep the validator running.

This runtime extension needs explicit human authorization before it is applied.
Existing financial approval remains bounded; it is not renewed by this proposal.

## Minimal same-ledger change needed before continuation

The current `resume --execute-local` rejects any started/completed case. Amend only
that prepared-state guard and its native restart validation to accept the one
already finalized direct case plus exactly three still-available cases:

- Keep the same run directory, ledger, genesis/program, five fixture keys and public
  identities, Series, four Units, campaign, signed authorization cache and all native
  operation/signature/attempt history. Never bootstrap or request another airdrop.
- Confirm the existing direct Unit is Consumed with its original terminal operation,
  response hash, owner, cursor and zero remaining principal; preserve it read-only.
- Confirm the three untouched Units remain Open/unfunded, all nine existing native
  operations are resolved/unblocked, and there are no pending/unknown native outcomes
  or principal/operating/fee/campaign holds before admitting a new case. Fail closed
  on any discrepancy; no generic in-flight recovery or retry feature is proposed.
- Preserve **Series useBy slot 6190** and **read expiry 10190**. Recheck actual slot
  headroom after startup; if insufficient, stop rather than extend either deadline.
- Carry forward cumulative elapsed time and original counters. Do not reset or replace
  the earlier allowance, signed transactions or economic identities.

Only implement this bounded continuation behavior when the human authorizes the
proposed additional runtime and same-ledger continuation. No redesign, recovery
framework, audit campaign or additional cases are included.

## Unchanged financial bounds and required human actions

Funding remains **216,000,000 / 250,000,000 LOCAL lamports**, with five original
finalized faucet requests and **zero new funding requests** proposed. Current
attempts are **14/32**. The remaining cases plan **nine** native transactions,
bringing the expected total to **23/32**; unknown outcomes retain their identity and
reservation and halt expansion. Program signing ceiling remains 27; all other fee,
rent, principal, sponsor-budget, W2 and resource ceilings in the original plan remain.
No user wallet, Devnet/mainnet, paid API, hosted write or push is included.

The human must perform each final browser **Run** click:

1. Sponsorship selected, explicit consent checked, failure unchecked → sponsored success.
2. Direct payment selected, failure checked → buyer refund.
3. Sponsorship selected, explicit consent checked, failure checked → sponsor refund.

Wait for each terminal result and agent verification before the next click. The agent
may prepare the page and verify finalized receipts, unchanged content, disclosure,
replay, exact denial codes, payout/refund deltas and zero remaining escrow. It must
not perform Run through the browser, API or CLI in place of the human. Stop owned
runtimes after verification and commit sanitized evidence. This proposal does not
assert that any of these three cases has executed or passed.
