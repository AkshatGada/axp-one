# AXP benchmark

Updated 7 October 2026. Methodology and sanitized proof stay in the repository.
The landing page has a compact result summary; there is no separate benchmark
page or endpoint.

**The million-update local fixture test is complete.** Its 1,052,672 updates are
synthetic state-machine operations, with no provider calls or native transactions.
**The paid Devnet run remains partial.** A 26-channel threshold-selected subset
has independently verified opening and closing transactions. Full funded-channel
cleanup is still in progress. Approved workload ceilings remain distinct from
achieved results.

## Current paid-run checkpoint

The load phase stopped with **125 funded advertisers, 825 started/completed
publisher turns and 824 accepted deliveries**. Three original signed openings
expired without landing. They remain failed/unfunded with their original signed
identities and reservations; no replacement deposits were created. Workers 11,
14 and 15 each have seven active campaigns and are excluded by the allocator's
eight-active-campaign requirement. The original 128-advertiser stage did not pass.

Nine terminal provider attempts have unknown usage; their full conservative
liabilities remain reserved. One DeepSeek transport failure produced no answer.
Two allocated turns were cancelled before starting and are not fresh calls.
These outcomes remain in the journal. The run is partial, not a successful
1,024-turn workload.

The predeclared 30,000-base-unit policy selected **26 channels**, each with
26 cumulative vouchers authorizing 39,000 base units. The subset has **676 accepted
deliveries/off-chain voucher updates**, 26 finalized deposits and 26 finalized
closes. Independent read-only RPC verification passed all **52 transactions**:
finalized signatures and slots, native program/mint binding, token balance deltas,
network fees and deposit conservation. Its 1.3 test USDC deposit paid **1.014 test
USDC** to the publisher and returned **0.286 test USDC**. See the
[acceptance record](artifacts/network-scale/devnet-threshold-acceptance.json) and
[verification report](artifacts/network-scale/devnet-threshold-verification.json).
This proves the subset, not financial completion of all 125 funded channels.

At the current cleanup checkpoint, 61 funded channels are closed and 64 remain.
These changing cleanup counts are separate from the independently verified
26-channel proof above. Ordinary final closure encountered expired signed
closes and pre-signer checkpoint blockers; remaining financial cleanup continues.
A separate reviewed operator policy preserves every expired signed identity and
all fee reservations, proves the original channels still Open with full escrow,
and refreshes only a close of the same cumulative obligation. No new deposit,
charge, voucher or model call is admitted by cleanup. Record its final proof and
hash after verification; no completed financial outcome is claimed here yet.

## Approved actual workload

One local coordinator runs 16 isolated ProductService workers. Each has eight
fictional hardware-wallet advertisers and up to 64 distinct publisher turns:
128 advertisers, 1,024 fresh turns and up to eight Jev evaluations per turn.
Campaigns share a declared product scope and use fictional names and `.example`
destinations. Questions rotate four hardware-wallet needs and include a distinct
household/comparison identifier. This is a controlled workload, not a broad topic
corpus or 128 real customers.

The workers reuse product eligibility, screened ContextHint retrieval, Jev buying
judgments, deterministic first-price auctions, the accepted-charge ledger, and
native Solana Devnet channels. DeepSeek supplies each admitted example answer
independently of advertiser material. Advertiser authored hints and retrieved
ContextHint evidence remain distinct. Record the actual retrieval method; lexical
fallback over screened evidence is not fresh query embedding inference. There is
no newly trained model, ChatGPT auction reconstruction or targeting-lift claim.

The private browser driver uses the publisher SDK to insert the approved card,
then observes connected DOM insertion, exact copy, destination and the readable
Sponsored label before forwarding acceptance. A receipt authenticates app
insertion and disclosure; it does not establish human attention or conversion.
Stable turn, award and receipt identities prevent replay from adding calls or
charges.

Every funded advertiser has a separate Devnet channel under one shared sponsor.
An accepted charge advances a signed cumulative voucher off-chain. It does not
require a native transaction for each insertion. Finalized closure establishes
publisher payout and unused deposit refund. Deposits, reservations, accepted
charges, authorized totals, settlement and refund are recorded separately.

The payment-channel focus is **many off-chain cumulative voucher updates to one
finalized native close per channel**. The close pays the latest authorized
cumulative amount and refunds unused collateral. Opening the deposit is a
separate native transaction. Compare update counts with finalized close counts;
do not sum cumulative voucher values as though each were a new charge.

The actual-run settlement threshold is predeclared on 7 October 2026:
**30,000 base units (0.03 test USDC) per channel**, applied by the operator after
the load phase and drain. A channel qualifies only when its latest authorized
cumulative amount meets or exceeds the threshold, it has at least two authorized
vouchers, accepted equals authorized, no amount remains reserved, and all native
operation outcomes are known. Drain releases undelivered reservations. The operator
closed the qualifying channels first and is closing the remaining channels at
end of run. The 26-channel threshold subset is verified; the full paid run remains
partial. Do not open extra channels or make extra model calls to manufacture proof.

Record the eligibility values, trigger and finalized close proof. The current
application exposes explicit close; it has no automatic production threshold
watcher. Threshold handling here and in the larger offline stress workload is an
external experiment policy, not an implemented production watcher.

| Boundary | Approved ceiling |
|---|---:|
| Funded fictional advertisers | 128 |
| Fresh publisher turns | 1,024 |
| Jev API attempts | 8,192 |
| Total provider liability | $3: $1 Jev, $2 DeepSeek |
| New collateral | 6.4 test USDC |
| Accepted delivery charges | 2.048 test USDC |
| SOL fee/rent reservation | 1.6 Devnet SOL |
| Publisher concurrency ramp | 1, 4, 8, 16 |

Each channel deposits at most 0.05 test USDC, with a 0.04 spending cap and a
0.002 maximum bid. The global accepted-charge ceiling is stricter than the sum of
individual campaign caps. At most 32 Jev requests may be in flight; admission also
caps Jev requests and tokens per second. The executable profile is
[packages/network-scale/profile.mjs](packages/network-scale/profile.mjs).

API liability is durably reserved before requests. Unknown usage or outcomes keep
the conservative reservation and block automatic expansion. DeepSeek recorded
costs use peak cache-miss prices as a conservative usage estimate, not verified
billing. Native fee/rent reservations and charge liability have separate durable
bounds. Openings progress cumulatively through 16, 64 and 128 advertisers after
verified stages. Existing hosted product caps and funded presentation channels
are unchanged.

## Measured output and proof

Exported proof goes to `artifacts/network-scale/run.json` when available. The
export records `execution`, status, timestamps, source commit and profile hash;
`targets` remain separate from `measured`. Offline fixtures carry
`execution: offline-fixture` and cannot establish actual-run outcomes.

Record these actual results before drawing a conclusion:

- Funded advertisers, attempted/completed publisher turns, completed answers,
  provider attempts and valid bid/skip/abstain outcomes, including errors/no-fill.
- Accepted insertions and their signed receipt hashes, cumulative voucher
  updates, authorized amounts and replay/deduplication proof.
- Native signed and finalized transaction counts, Explorer signatures,
  finalized publisher payout/refund, fees and account rent.
- Answer, opportunity and turn latency percentiles, observed concurrency,
  throughput over the recorded interval, token usage and known/reserved API cost.

A channel is settled only when its recorded close is finalized. A receipt or
voucher alone is not payout proof. Partial execution stays partial; report its
achieved counts, halt reason and unresolved financial state without extrapolating
to the approved ceiling. Preserve pending signatures and identities during
recovery instead of replacing a channel or deposit.

A separately sourced recovery run must record its own source hash while retaining
the original failed or unknown-usage API rows and their full cost reservations.
Fresh requests remain subject to the original global spend and execution caps;
a new unknown outcome halts expansion again. Recovery must not erase uncertainty
or count a failed attempt as a valid decision.

Keep public channel/receipt evidence and the sanitized export in the repository.
Wallets, RPC/provider credentials, SQLite journals, delivery tokens and private
signed vouchers remain in ignored private state. Read-only verification and replay
must not send new provider calls or native transactions. Operator commands and
recovery are documented in [NETWORK_SCALE.md](docs/product/NETWORK_SCALE.md).

This measures one bounded local coordinator and isolated workers. It does not
establish the hosted demo's capacity, independent advertiser-wallet onboarding,
production fleet scale or mainnet readiness.

## First measured local ledger stress test

The offline run completed on 7 October 2026 at 11:29:42 UTC with
`execution: offline-synthetic-fixture`. The checked operator-workspace records
are retained as [the result](artifacts/network-scale/offline-131k.json),
[the cold replay](artifacts/network-scale/offline-131k-cold-replay.json), and
[the experiment policy](artifacts/network-scale/operator/offline-131k-policy.mjs.txt)
in the repository proof bundle. The run used source commit `9909b97` and executable
source hash `94915966420b135d794b8567fd456cf1999a61372fd96c0673d7cd6342982c7f`.

| Cohort | Fixture voucher updates | Mock closes | Storage |
|---|---:|---:|---|
| Large local stress | 131,072 | 2,048 | Memory transitions, SQLite checkpoint after each closed channel |
| Durable proof | 1,024 | 16 | SQLite for every payment-adapter transition |
| Total | 132,096 | 2,064 | Separate storage paths above |

Each channel accumulated 64 updates before an explicit mock close at 64,000
fixture base units. The external test policy invokes closure; it does not install
an automatic threshold watcher. Deterministic Exchange auctions use fixture
buying decisions, and accepted charges are explicitly injected after the auctions.
There is no browser insertion or signed publisher-receipt verification. Native
outcomes and signature-shaped values are inert mocks, with no token value.

The whole invocation took **982.133 seconds**, averaging **134.50 fixture voucher
updates/second**. Authorization latency was **6.189 ms p50 / 11.350 ms p95** over
132,096 samples. These are mixed-cohort local state-machine timings; the large
cohort does not durably write every voucher transition. Provider calls, RPC calls,
wallet access, cryptographic signatures, native broadcasts and real on-chain
settlements were all **zero**.

Recorded checks include reservation-blocked closure, mutated-charge rejection,
lookup after a lost commit acknowledgement, budget exhaustion, and duplicate
voucher/close replay. All 2,064 channel records have accepted, authorized and mock
settled totals equal. A separate cold process passed replay over 48 sampled saved
channels: 96 voucher replays and 48 close replays, with zero transport calls.
That sample is not a cold replay of every channel.

This test shows batched cumulative state and tested accounting/replay constraints
holding across the fixture workload, including the separate fully durable cohort.
It establishes local state-machine behavior under these storage choices, not
Solana capacity, provider throughput, real delivery authentication or production
end-to-end throughput. Synthetic counts and mock settlement amounts remain
separate from the paid run.

## Completed million-update local ledger test

The four-process extension completed at **2026-10-07 13:26:11 UTC** using Node
24.19 on macOS arm64. The [compact result](artifacts/network-scale/offline-million.json)
retains its source hashes, runtime, cohorts, fault checks, counters, accounting,
job exit codes and limitations. All four workers exited with code 0.

| Cohort | Fixture voucher updates | Mock channel closes | Storage |
|---|---:|---:|---|
| Large local stress | 1,048,576 | 16,384 | Memory transitions; SQLite checkpoint per closed channel |
| Durable proof | 4,096 | 64 | Actual SQLitePaymentStore for every adapter transition |
| Total | **1,052,672** | **16,448** | Four isolated local processes |

Each simulated channel accumulated **64 voucher updates** before one explicit
mock close. The latest cumulative 64,000 fixture base units were settled; the
unused 16,000 were refunded in the simulated ledger. Earlier cumulative values
were superseded rather than added together. No real funds moved.

The whole invocation took 4,867.715 seconds and averaged **216.25586 fixture
updates/second**. Authorization latency was **10.924833 ms p50 / 21.922792 ms p95**.
Independent [raw latency verification](artifacts/network-scale/offline-million-latency-verification.json)
checked each worker's SHA-256, byte/sample count and every finite nonnegative
value, then reproduced the exact combined nearest-rank percentiles over all
1,052,672 samples. These are mixed-cohort local timings, not network throughput.

[Read-only persisted-state verification](artifacts/network-scale/offline-million-persisted-state-verification.json)
passed every one of the 16,448 saved channel snapshots and 1,052,672 voucher
records: immutable charge/voucher hashes, ordered charge commitments, cumulative
sequences, final voucher identity and mock payout/refund conservation. A separate
[cold replay](artifacts/network-scale/offline-million-cold-replay.json) passed a
**192-channel sample**, with 384 voucher replays and 192 close replays, using zero
transport calls. That sample is not a cold replay of every saved channel.
The [64-update specimen](artifacts/network-scale/offline-million-specimen.json)
shows the complete cumulative sequence and final mock close.

Policy, controller, extraction and verifier source copies are in
[the operator proof directory](artifacts/network-scale/operator/). Raw local
latency records, full result and retained SQLite databases remain in the operator
workspace; the compact public proof binds them with hashes and verification
reports rather than committing multi-gigabyte databases.

Provider calls, RPC calls, wallet access, cryptographic signatures, native
broadcasts, actual Jev decisions, organic answers and real on-chain settlements
were **zero**. Native outcomes and signature-shaped values are inert mocks;
accepted charges are injected fixtures after real Exchange auctions, without
browser receipt authentication. Each worker awaits one voucher operation at a
time. Threshold closure is external experimental policy; the product has no
automatic threshold watcher. Four local processes shared the Mac with other work,
and the large cohort checkpoints closed snapshots rather than every transition.
The test establishes local accounting/replay behavior under these storage choices,
not production fleet, Solana or provider capacity. Its counts are never added to
the paid run.
