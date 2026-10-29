# Sponsored continuation interruption — original Fund finalized

29 October 2026. Current local result is partial. Direct success remains verified
and byte-for-byte preserved. The human then clicked sponsored Run. The local
native client returned `SERVICE_UNAVAILABLE` from the sponsored-access submission;
the workflow stopped before creating a delivery request. The original Fund was
initially Unknown/blocked in the outbox. No replacement Run, signature, blockhash,
Fund or resend was made.

An explicit read-only reconciliation of that exact operation subsequently verified
**FinalizedSuccess**, using signature
`4ikXuPH72mC3FevcdXMtdUZypju6VizdKctwMkMtjDh2R6w2jDQSfGE5uVwQJPVyR7tfoRf4Wba25VC4fbAYFCKg`
and transaction slot **3390**, with finalized observation context **3468**.
The saved native observer proof is verified, has known fee/rent, and identifies:

- Unit `BP4DKE9xexmTQL1omeLkEwTtLa8ZJWbo8Cemh7ecmhgY`: FundedOpen, cursor 1,
  sponsored/nontransferable, original beneficiary, zero request/response/terminal hashes.
- Match `ESzjeWj3sWcp8Eazu59Zjzv6indpzGv2UMyWXbs1GcBQ`: PrimaryEscrowed,
  **10,000 lamports** principal, original sponsor refund key. No publisher payout.
- Sponsor mandate consumed gross **10,000**, count **1**, refunded gross **0**.
  The separate Sponsored packet and scripted unfavorable consent were accepted for
  funding. Successful sponsored content delivery has not been demonstrated.

[Finalized Fund proof](../../artifacts/machine-market/agent-access/sponsored-fund-proof.json)
contains the persisted exact native observer facts, original signature and message/
transaction hashes. [Reconciliation](../../artifacts/machine-market/agent-access/sponsored-fund-reconciliation.json)
and [interruption checkpoint](../../artifacts/machine-market/agent-access/INTERRUPTED_SPONSORED.json)
keep the identity and obligation explicit. A supplemental RPC capture returned
`PENDING_SETTLEMENT` before shutdown; it is not claimed as a second successful
capture. The finalized conclusion comes from the original persisted observer proof
and explicit reconciliation, not a synthetic receipt or the failed request response.
The precise cause of the local client failure remains undiagnosed.

## Exact stop boundary

The original ledger, keys, signed attempts and full reservations/history are preserved.
All **10 native operations are ResolvedSuccess and unblocked**. Principal, operating
and native-fee holds and active campaign reservations are zero; the **10,000-lamport
native escrow obligation remains**. Those two facts are distinct. No sponsored body,
StartDelivery, terminal payout/refund or grant was produced. Both refund cases are
still untouched; do not call the four-case phase complete.

Funding remains **0.216/0.25 LOCAL test SOL**. Attempts are **15/32**: five faucet
requests and ten native signing slots. Observed retained rent is **39,254,400** and
program plus faucet fees **130,000 LOCAL lamports**. No paid provider/API, public
Devnet/mainnet transaction, user wallet, hosted write or push occurred.

The approved **1,800,000-ms** cumulative active runtime guard stopped the validator.
The final shutdown checkpoint records **1,802,028 ms**, including **2,028 ms** beyond
the ceiling during the timer/shutdown boundary. No remaining runtime is claimed or
reset. All owned runtimes are stopped. Series useBy remains **6190**, read expiry
**10190**. The existing prepared/partial resume guard intentionally refuses this
funded stopped workflow.

## Remaining work — planning only

Prioritize this exact already-funded obligation. Inspect the local request failure
and reconcile its existing signed Fund; never re-run the purchase or refresh its
identity. A bounded continuation must resume from funded cursor 1, preserve the
original operation/consent/campaign/source hashes and only perform the original
remaining delivery/terminal stages through an explicit human final-action handoff.
No generic recovery framework, new funding, additional Unit or changed deadline is
proposed. Verify actual deadline headroom before any admitted operation; stop if
insufficient.

Completing this funded sponsored success needs two native operations; the two
untouched refunds would need six more. Their expected aggregate remains **23/32**
attempts with zero additional faucet funding. This is a plan, not execution authority
or proof. The current runtime allowance is exhausted; a further specifically bounded
runtime/recovery instruction is required before restarting or changing the stopped
workflow. No recovery implementation or additional execution was attempted here.
