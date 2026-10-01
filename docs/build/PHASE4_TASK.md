# Phase 4 — approved receipt-linked channel settlement

Approved by the user 2026-10-01. This task supersedes older no-spend and
Devnet-only planning text for this bounded run, not for other projects.

## Goal and ownership

Fresh data-backed agent decisions, two real owned-app sponsored placements,
accepted receipts, native cumulative MPP vouchers, one network settlement and
unused-deposit refund. Existing Phase3 state/evidence stays unchanged.

Main owns network compatibility, SDK acquisition/provenance, shared exchange
integration, functional console, launcher and acceptance evidence. A
gpt-6.1-sol high builder owns the injected network payment adapter and its tests.
One fresh gpt-6.1-sol high reviewer checks the integrated payment/demo slice.
Final styled frontend, deployment, production infrastructure and broader audits
are not this task.

## Frozen limits

- Reuse existing external disposable wallet file; never copy keys into this repo.
- One payer/publisher channel. Deposit20000 test-USDC base units (0.020).
- At most two accepted placements; maximum4000 each/8000 total. Actual auction
  prices are recorded, not forced to the expected3000 each.
- At most six fresh Jev calls/two fresh independent gpt-6.1-sol low answers.
- One channel open, one cooperative settle/distribute, necessary account
  preparation and at most one eligible rent-reclaim; no top-up/replacement.
- Total network fees/rent bounded by20000000 test lamports (0.020 test SOL),
  checked against prepared transactions before signing.
- Devnet first. Official hosted sandbox explicitly allowed if Devnet deployment
  compatibility stays unresolved; mode/endpoint/genesis/program/mint freeze before
  funding. No mainnet and no x402-exact substitution.
- User revised the free-space floor to40GiB on2026-10-01. Dependency acquisition
  stays <=100MiB newly added assets, avoiding another full workspace install.
- One bounded feasibility pass and one targeted correction. Network capability
  failure is reported, not disguised as synthetic completion.

## Accounting and authorization

Exchange receipt admission creates the authoritative immutable charge. Worker
rereads it; browser/agent-supplied accepted flags/amounts do not authorize signing.
Only accepted charges advance a signed cumulative total. Persist intent before
signing, payload before commit and transaction identity before broadcast.
Unknown outcomes reconcile the existing identity; no new payment on replay.
Drain/freeze before closure; reuse the saved highest voucher without increment.
Deposit, reservation, accepted, authorized, settled and refund are distinct.
Losing campaigns have no funded token movement; declared test budgets are never
presented as confirmed escrow. No bidder is granted wallet tools.

## Verification and outputs

Two accepted charges on one channel; finalized payout equals their sum; refund
equals deposit minus actual payout. Token movements and fees/rent reconcile
separately. Duplicate/failed delivery, restart, lost acknowledgements and pending
settlement are tested without extra live purchases. Preserve sanitized correlated
receipt/charge/voucher/transaction evidence, actual network labels and an exact
operator runbook. A hosted fork is sandbox evidence, never Devnet evidence.

Initial read-only checks2026-10-01: Devnet and official sandbox are reachable.
Existing payer D7GzU2o43V4whHJG1pv7k1o3UTU9yuC3Hohp1mdii6ST had4997018120
lamports and18997000 devnet-USDC base units; existing publisher
DB4GyrEU7KPXzC4oYfKPfvct5Ja2pxXa7WZnREk3URsV had4000 base units. These
observations are not funding or channel compatibility. Sandbox reports a
mainnet-derived genesis; explicitly allowlisted endpoint plus deployment checks
must distinguish it from real mainnet.
