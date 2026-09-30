# Payment design and feasibility gates

Status: proposed, not executed. Planning does not authorize transactions.
On 2026-09-30 the user authorized reuse of the previous MVP's existing disposable
Solana Devnet wallet. Verify its public identity, Devnet balances and signing
configuration before integration; do not create a replacement unnecessarily.
Reuse does not inherit previous spending limits, authorize mainnet, or establish
that existing test-USDC matches the selected channel program's supported mint.
Keep the existing key server-side outside this repository and agent prompts;
never copy it into committed files or evidence. No mainnet or real funds in the MVP.

## Choice

Prefer MPP session on Solana for repeated placement accounting and accumulated
settlement. In the inspected [pay.sh comparison](https://pay.sh/docs/building-with-pay/payment-channels/choosing),
upto is one metered call while sessions cover many deliveries. x402 exact is
optional later for isolated fixed-price purchases, not needed to finish channels.
Do not call MPP session traffic x402 or label it the x402 batch-settlement scheme.

Per advertiser -> one confirmed channel -> one owned publisher payee. Exchange
does not custody pooled advertiser deposits. Network fee is zero in first demo.
Any later split changes require new bound terms and SDK support tests.

## Required adapter surface

### Research outcome (2026-09-30)

See [pinned feasibility report](research/MPP_FEASIBILITY_REPORT.md). Explicit
variable cumulative vouchers are supported in inspected source; advertising
receipt validation and exact charge equality remain AXP responsibilities.
Devnet program presence is not proof of SDK/deployment compatibility. The
researcher found a treasury/deployment mismatch requiring a bounded spike.
Repo source declares @solana/mpp 0.11.0 while inspected npm latest was 0.7.0;
freeze an artifact, not unbounded latest. No integration or payment was executed.

Use client-signed advertiser vouchers after accepted charges, with serialized
authorization and persisted payload identity. Closing must reuse the final
voucher, not sign an additional increment through a convenience close helper.
The pinned SDK signs a versioned 50-byte payload; high-level docs describe a
48-byte structure. Follow pinned encoder/program compatibility rather than
hand-encoding from prose or inserting AXP receipt fields into voucher bytes.

Proposed no-value test: cap 1000 base units, charges 100 and 250, cumulative
vouchers 100 then 350. Expected payout 350/refund 650 excludes fees and rent.
This is a test proposal, not authorization or measured execution.

`prepareOpen`, `confirmOpen`, `getChannel`, `authorizeCumulative`,
`lookupAuthorization`, `prepareClose`, `confirmClose`, `reconcile`,
`prepareReclaim`. Each returns typed status and immutable identities.
Signer service receives ledger commitments, never arbitrary LLM transaction bytes.

Bind network, mint, payer, authorized signer, channel program/account, payee,
deposit cap, campaign/run, expiry and cumulative watermark. Chain identifiers,
mint and program addresses must come from pinned supported-network configuration,
not text supplied by a model or an untrusted request.

Financial states: confirmed deposit, reserved, accepted unpaid, authorized,
settled, refundable/reclaimed. Deposit is collateral, not advertising spend.
Vouchers authenticate payment authority; a separate signed ledger commitment
correlates their watermark to accepted charge IDs. Do not invent extra fields
inside standard voucher bytes or imply the chain verifies advertising receipts.

## Critical mismatch to resolve first

Generic SDK stream delivery may authorize before content is served. Our chosen
billable event occurs after a sponsored card render acknowledgement. Also auction
prices vary rather than being a constant stream-chunk price. The spike must
prove explicit dynamic cumulative authorization and receipt-controlled metering
without automatic unrelated billing. We must not silently charge for fetching
an ad candidate or opening a stream.

## Phase-1 go/no-go checklist

1. Resolve exact SDK release or commit, module exports, license and supported Node.
2. Read session lifecycle and client/server metering implementation, not just snippets.
3. Establish supported test environments, channel program IDs, mint, payer and
   fee-payer constraints. Sandbox/local validator is not Devnet.
4. Prove open, two different placement-price increments, repeated same voucher,
   receipt-controlled authorization, close and unused-deposit recovery.
5. Restart payer/payee and reconcile unknown open/close outcome without more spend.
6. Reject decreasing/over-cap/wrong-channel/expired vouchers and wrong recipient.
7. Document idle-close configuration suitable for slow auctions. Disable new
   awards before closing; never race settlement with another accepted receipt.
8. Verify publisher token-account delta, payer remainder, network fees/rent and
   finalized transaction, not merely an SDK status or UI balance.

First no-value protocol tests use mocked/sandbox state, clearly labelled. A
later real Devnet test needs a new exact operator-approved ceiling for deposits,
charges, transactions, fee/rent and time. Existing AXP authority is not reused.

If Devnet channels are unsupported, pause and present evidence/options: local
validator channels labelled as such, another supported test network, or explicit
revision to exact payments. Never claim channel success from an exact transfer.

## Recovery and disputes

Commit intent before signing; persist signed payload privately before submit.
Reconcile same payload/identity on ambiguous acknowledgement. No fresh automatic
purchase, deposit or cumulative increment on retry. Signer cannot exceed the
operator cap even if campaigns collectively ask for more. A terminal settlement
must reconcile payment amounts separately from fee/rent.

Freeze closure watermark after obligations drain. If a delivered event is
disputed after voucher authorization, record dispute; decreasing signed
authorization is not a remedy. Autonomous refunds, top-ups and multi-publisher
distributions are deferred. This is an owned-demo delivery trust model, not an
atomic fair exchange between malicious strangers.
