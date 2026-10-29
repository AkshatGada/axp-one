# Controlled agent-access research slice

29 October 2026. Implementation: `b27b3f4`; additive same-ledger resume and evidence
follow in this commit. [Original plan](AGENT_ACCESS_PHASE_PLAN.md) defines the fixed
scope. This slice is incomplete pending the human browser action described below.

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
deltas. These implemented journeys have **not** been executed on the validator.
No attention, semantic understanding, endorsement, MCP/WebMCP or Cloudflare integration
is claimed. Prior local acceptance remains 38/40; its exact-slot gaps are unchanged.

## Actual evidence

- Five finalized disposable-faucet funding requests: **0.216 LOCAL test SOL**.
- Six finalized setup transactions: Init, one Series and four registered Units.
- Setup rent: **20,337,120 LOCAL lamports**. Program plus faucet fees: **80,000**.
- **11/32** total attempt slots consumed. Zero access Funds, Starts, terminals,
  protected bodies, publisher payouts or refunds. The four cases remain `available`.
- Same-ledger restart verified the original genesis/program, Open/unfunded Units,
  six native signing slots and no unresolved operations. It generated no fresh
  keys, funding requests, setup transactions, signatures or deadline extensions.
- Four focused policy/resume tests pass. The resume test rejects a changed genesis,
  unknown funding, started case or completed workflow without rewriting the journal.
- Read-only view labels the saved state `RECORDED LOCAL NATIVE` and disables execution.

[Execution status](../../artifacts/machine-market/agent-access/EXECUTION_STATUS.json),
[setup receipts](../../artifacts/machine-market/agent-access/native-operations.json),
[readiness](../../artifacts/machine-market/agent-access/readiness.json) and
[screen](../../artifacts/machine-market/agent-access/screen-recorded-result.png) are
sanitized. Private keys, capabilities, SQLite, authorization cache and ledger remain
ignored under `local-state/machine-market/agent-access-local-20261028/`.

## Commands and remaining handoff

From the machine-market worktree:

```sh
# Offline saved inspection: no keys, RPC, signatures or transfers
node scripts/machine-market/agent-access.mjs inspect
# Read-only localhost screen, without validator or execution routes
node scripts/machine-market/agent-access.mjs view
# Resume only the SAME prepared ledger, funding and identities
node scripts/machine-market/agent-access.mjs resume --execute-local
# Stop the owned live runtime; Ctrl-C also stops its validator
node scripts/machine-market/agent-access.mjs stop
node --test tests/machine-market/agent-access.test.mjs
```

`start` refuses the existing experiment directory. `resume` accepts only this
prepared, unstarted state, verifies the original genesis, native program and Unit
state, retains signed envelopes/counters and skips funding/bootstrap. It refuses
unknown or started-case recovery; inspect those original identities rather than
resetting, resubmitting or generating another economic operation.

The human explicitly approved all four cases within **0.25 LOCAL test SOL** and
**32 total attempts**, then explicitly resumed after the pause. On 29 October,
automatic approval review still rejected the Run button, stating that native
settlement requires **human handoff at the final browser action** and that
pre-approval cannot replace it. The agent stopped and did not execute through an
API/CLI workaround. No further approval request is needed within the existing
limits; the required remaining action is for the human to perform the Run clicks.

After the human starts the same-ledger runtime, open `http://127.0.0.1:20990`,
discover the offer, and execute direct success first. Use Verify replay and ownership
after each completed case. Then select sponsorship, check explicit packet consent
and run sponsored success. Exercise each failure alternative with the failure
checkbox, selecting direct or sponsored funding as appropriate. Each case uses its
own Unit. Stop on any unknown or stopped outcome; do not start another case.

The supervisor preserves the original 20-minute cumulative active execution cap:
**786,773 ms used**, at most **413,227 ms remaining**, including subsequent startup.
The immutable Series deadline remains slot **6190**, read deadline **10190**; no
extension is allowed. The validator is stopped while idle. No new funded Devnet
run, mainnet, user wallet, paid provider call, hosted deployment or push is included.
The earlier terminal Devnet retry remains unchanged and separate.
