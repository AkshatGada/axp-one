# Controlled agent-access research slice

29 October 2026. Implementation: `b27b3f4`; additive same-ledger resume and evidence
follow in this commit. [Original plan](AGENT_ACCESS_PHASE_PLAN.md) defines the fixed
scope. The human-executed direct-success case is now verified. The slice remains partial: sponsored success and both refund alternatives are unexecuted.

The agent is a deterministic policy, with no model/provider call. It selects one
owned fictional route report from required fields before inspecting sponsorship.
It discovers a resource/version/beneficiary/expiry-bound offer, then chooses direct
payment or explicitly consents to a separate immutable Sponsored packet. A scripted
`not_fit` opinion does not deny consented sponsorship. Source content is separate
from that packet. The answer is calculated only from delivered report bytes.

The bridge uses the real native store, W2 authorization, price-time book, outbox,
HTTP `/api/trading` service and local Solana program. The four distinct Units are
for direct success, sponsored success, buyer failure/refund and sponsor failure/refund.
The screen displays content, disclosure, grants, actual terminal receipts and account
deltas. Direct success executed through the validator; the other three journeys remain implementation-only.
No attention, semantic understanding, endorsement, MCP/WebMCP or Cloudflare integration
is claimed. Prior local acceptance remains 38/40; its exact-slot gaps are unchanged.

## Actual evidence — one of four cases verified

- Five finalized disposable-faucet funding requests: **0.216 LOCAL test SOL**.
- Nine finalized program transactions: six setup plus direct Fund, Start and Finalize
  at slots **1739**, **1802** and **1865**. **14/32** total attempt slots consumed.
- The human clicked Run. The real native backend delivered the unchanged 318-byte
  fictional report and paid **9,900 lamports to the publisher + 100 to the collector**.
  The scripted answer correctly reports North's listed median of two days.
- Exact response replay used no extra native signature. A separately repeated
  wrong-owner read returned **HTTP 403 `INVALID_AUTH`**; a transport error was not
  counted as access denial. Source and response hashes remain in the saved proof.
- Direct principal escrow is zero. All nine outbox operations are `ResolvedSuccess`
  and unblocked. Principal, operating and native-fee holds and campaign reservations
  are all zero. The other three Units are still unstarted.
- Observed retained application rent: **29,795,760 LOCAL lamports**. Program plus
  faucet fees: **110,000**. No public-chain or paid-provider call was made.
- Same-ledger restart preserved genesis/program, keys, signed identities, funding,
  counters and immutable deadlines; it performed no new funding or setup operation.
- Five focused policy/resume tests pass. Repository hygiene checks pass. The saved
  view now selects the completed case and displays its recorded payout; replay and
  execution are disabled in recorded/offline mode.

The read-only verifier saved the successful direct proof before shutdown. Its
subsequent polling encountered the intentionally stopped server; this does not
establish a second case or invalidate the saved finalized/replay/denial evidence.
See [strict read-only checks](../../artifacts/machine-market/agent-access/read-only-verification.json)
and [direct case proof](../../artifacts/machine-market/agent-access/case-direct-success.json).

[Execution status](../../artifacts/machine-market/agent-access/EXECUTION_STATUS.json),
[native receipts](../../artifacts/machine-market/agent-access/native-operations.json),
[readiness](../../artifacts/machine-market/agent-access/readiness.json) and
[screen](../../artifacts/machine-market/agent-access/screen-direct-success.png) are
sanitized. Private keys, capabilities, SQLite, authorization cache and ledger remain
ignored under `local-state/machine-market/agent-access-local-20261028/`.

## Commands and current stop boundary

From the machine-market worktree:

```sh
# Offline saved inspection: no keys, RPC, signatures or transfers
node scripts/machine-market/agent-access.mjs inspect
# Read-only localhost screen, without validator or execution routes; Ctrl-C stops it
node scripts/machine-market/agent-access.mjs view
node --test tests/machine-market/agent-access.test.mjs
```

`start` refuses the existing experiment directory. The approved
`resume --execute-local` change accepts the original prepared state or this exact
partial state: direct success finalized, with three untouched Units. It validates
the direct owner/cursor/request/response/terminal operation, original Series deadline,
zero principal and holds, all nine known operations and remaining Open Units. Do not reset the ledger,
re-fund fixtures, extend deadlines, recreate Units or re-sign a new economic operation.
No runtime remains running. Read-only commands do not consume native transaction slots.

The human explicitly approved four cases within **0.25 LOCAL test SOL** and
**32 total attempts**, then approved the bounded continuation: **600,000 ms** more
active runtime, for a cumulative ceiling of **1,800,000 ms (30 minutes)**. The same
ledger resumed successfully with nine existing native operations and zero new
funding, signatures or native sends. Direct proof and case hashes and the full
original authorization cache hash remain unchanged.

No new human Run click arrived during that restart. The agent stopped the validator
to preserve the remaining allowance while awaiting human availability. Actual
cumulative active time is **1,468,412 ms**, leaving **331,588 ms**. Approval is already
recorded; only the human's availability and three final browser Run clicks remain.

The immutable Series deadline is **6190** and read deadline **10190**. Sponsorship
success and both refund paths remain unexercised. The live page was prepared with
sponsorship selected, explicit packet consent checked and failure unchecked. On the
next same-ledger start, the agent prepares those fields again, the human clicks Run,
and the agent verifies the terminal result before preparing each refund alternative.
No completed direct transaction is rerun. Stop on unknown state or exhausted bounds.

Financial ceilings remain intact: **0.216/0.25 LOCAL test SOL funding** and
**14/32 total attempts**. No new funded Devnet run, mainnet, user wallet, paid provider
call, hosted deployment or push occurred. The terminal Devnet retry and previous
local 38/40 evidence remain unchanged and separate. See the
[approved continuation scope](AGENT_ACCESS_CONTINUATION_PROPOSAL.md) and
[preparation checkpoint](../../artifacts/machine-market/agent-access/CONTINUATION.json).
