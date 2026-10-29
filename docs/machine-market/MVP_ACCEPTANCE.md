# Bounded MVP acceptance handoff — 28 October 2026

The finishing phase is complete locally and stops for root review. No production
readiness, new funded execution or 40/40 native timing claim is made. Frozen Packet03
remains normative; the dashboard-heavy historical plan is superseded.

| Requirement | Implemented and usable | Exercised evidence | True remaining limitation |
| --- | --- | --- | --- |
| One price-time/maker-price mechanism, lanes, IOC/GTC and exact primary-face compatibility | Existing native trading store; CLI book/order/Match inspection | Existing local native T1/16-trade results and source tests; focused CLI reads expose lane/face/provenance | Devnet fixed-case driver does not itself prove order-book selection |
| Authenticated ordering, cancellation, balances and concurrent reservations | Existing `/api/trading` W2 contracts; explicit CLI submit commands | Existing native HTTP concurrency/recovery checks; changed client transport checks | Operator supplies signed envelopes through its existing context; no new wallet onboarding or signer service |
| Finite issuance and ownership | Existing Rust program; CLI Unit/receipt views | Local native issuance and completed Devnet one Series/three Units/five Funds | Fixture issuers only; no commercial onboarding |
| Original primary escrow/face and immediate secondary cash | Existing native settlement; inspector shows original 10,000 face and 15,000 resale → 14,850 seller/150 collector | Local premium/discount/recurring-owner checks; actual Devnet D0/D1 receipts/deltas | No SPL/USDC or new payment rail |
| Owner-bound delivery, replay and failure/refund | Existing coordinator/private response store; CLI start/process/read and Unit/operation views | Actual Devnet D0 success/current-owner replay/old-owner denial and D1 current-holder refund | Trusted gateway remains explicit; no claim of attention/reading/conversion |
| Sponsored access, distinct packet, negative opinion allowed, sponsor refund | Existing signed mandate/consent and nontransferable Unit | Actual Devnet D2 negative-assessment sponsor refund; native flag/recipient/zero principal verified | D2 was deliberately refund, not sponsored successful-body delivery |
| Sponsored successful content/payout | Existing JS funding→delivery→payout implementation and immutable source/packet separation | One new scripted-RPC host trace: four Fund signers, sponsor debit 10,000, issuer 9,900, collector 100, Consumed, same independent source hash, exact response/restart replay with zero extra sends/signatures | New successful sponsored path has **fixture/host evidence only**, not Rust program/validator/Devnet execution |
| Restart/unknown/replay discipline | Existing durable fences, byte persistence and reconciliation | Existing local crash/restart proof and preserved completed-Devnet expired-write recovery | No HA/arbitrary restore guarantee |
| Deadline equality | Existing strict native comparisons and deterministic Rust host tests | Existing Rust tests accepted as narrower timing-rule evidence | Local harness remains **38/40**; two exact-slot validator checks remain unproved, no new timing run |
| Minimal native inspection/operation interface | `npm run demo:market`; `npm run market -- live …/submit …/operator …` | Offline recorded-native usability pass; six GETs over actual loopback HTTP/native JS service fixture; zero extra signer calls/native sends | The configured native service must already be running; the client does not bootstrap/fund a new session |
| Honest entry docs and scope | Current runbook, status, package entrypoint, explicit recorded/live/synthetic modes | Focused changed-integration set and staged repository hygiene | Legacy untracked simulator is preserved, excluded and not presented as native |

## Fixed evidence and financial status

The funded Devnet run is terminal at `0faa13e8408203b77097728d3b6a6a12639e7116`.
Its 463 attempt slots/429 write slots, 458 finalized on-chain transactions and
1.279395 test SOL net spend (1.276985 retained rent +0.002410 aggregate fees) are
unchanged. No new native principal, fees, wallet keys or provider spend were added.
All five test wallets had been swept and principal escrow/unresolved outcomes were
zero at that verified completion. This finishing phase reads saved public proof;
it does not claim a new live RPC verification of those balances.

The new sponsored-success trace is a controlled **scripted Solana RPC fixture**.
It exercises actual JS core/store/outbox/delivery code, complete transaction signatures,
receipt/account reducers and private-response replay. The bank replies and payout
account transitions are scripted. Native program execution and public broadcasts are
zero. The six HTTP requests are real loopback GETs; there are no public RPC calls.
The separate trace records source hashes before/after, Sponsored packet, payout and
replay counts without private keys or protected user data.

The earlier broad-repository benchmark wall-clock failure remains historical; no
new broad regression/benchmark campaign was run or claimed green. Mainnet, auctions,
AMMs, partial fills, wallet onboarding, HA, new adapters, managed hosting and fresh
LLM execution remain deferred. The current task is the compact native MVP handoff,
not a production infrastructure phase.
