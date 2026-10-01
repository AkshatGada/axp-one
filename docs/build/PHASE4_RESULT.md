# Phase 4 result — receipt-linked native channel settlement

Run `phase4-20261001-acceptance`, observed2026-10-01. **Actual official hosted
Solana payment sandbox**, not Devnet, mainnet or synthetic settlement.

## Executed story

Six fresh Jev1.13 decisions and two fresh gpt-6.1-sol low organic completions
produced two disclosed owned-publisher placements. Each accepted receipt created
one immutable3000-unit charge on the same TripDesk channel. Native MPP session
handlers verified saved cumulative spending vouchers3000→6000. One cooperative
settlement finalized, paying the publisher and returning the unused deposit.
AgentPass and HotelOps each chose skip in both rounds and incurred zero charges.
Only TripDesk was funded: this does **not** prove competing funded bidders.

| Accounting item | Observed amount |
|---|---:|
| Deposit |0.020 test USDC|
| Accepted charges |0.003 +0.003 test USDC|
| Authorized cumulative total |0.006 test USDC|
| Finalized publisher payout |0.006 test USDC|
| Unused payer token refund |0.014 test USDC|
| Transaction fees |20000 test lamports|
| Gross newly allocated rent |6751200 test lamports|
| Gross fees + rent |6771200 test lamports (<20000000 cap)|
| Escrow ATA rent reclaimed at distribution |2039280 test lamports|
| Channel PDA rent remaining |2672640 test lamports|
| Publisher ATA rent remaining |2039280 test lamports|

Rent is not a USDC refund. No optional rent-reclaim transaction or automatic
top-up was performed. One open and one settlement transaction; no exact-payment
substitution. Existing disposable identities were reused; keys remain outside
the repository. Sandbox fixture funding created only test SOL/USDC balances for
the existing payer, never fake channel/transaction outcomes.

## Network and correlated proof

RPC `https://402.surfnet.dev:8899`; genesis
`5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d` is mainnet-derived **fork** genesis.
Exact endpoint allowlisting prevents treating that hash as mainnet authorization.
Program `CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX`;
mint `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`, six decimals.
Native channel `7gtxLwQBRuNwug1wWk395goUzmEsbobJcPPp611cLcRR` is Distributed;
escrow ATA is closed. Finalized slots452166628/open and452167798/settlement.

- [Sandbox open transaction](https://explorer.solana.com/tx/5pvC7TCFRYkyxTAK4TFWVYNqiDs9gdZUr7So3cyTqjXcprNNnny7nDDBvuzh8X1GWCzBKHYnEcNhrn22sSLS8KWe?cluster=custom&customUrl=https%3A%2F%2F402.surfnet.dev%3A8899)
- [Sandbox settlement transaction](https://explorer.solana.com/tx/66oQbyfw6x9y4MAARyzJHuRnmxJ2U2vtFND4suBDkrSwnDQt3VccQwaNZxnYYvBvM38Nw44umKfD3idohQ8bQGqo?cluster=custom&customUrl=https%3A%2F%2F402.surfnet.dev%3A8899)

Hosted sandbox data can reset. Saved finalized transaction/account evidence is
in `artifacts/phase4`; explorer availability is not permanent storage.
All accounting uses exact base units; public exports omit signing material.

## Verification and interpretation

- Actual new-process replay returned the existing charges, authorizations and
  finalized settlement with identical payment record hash and eight model
  admissions. Browser restart/replay also rendered the recorded card without a
  new charge/model call. No additional signing/broadcast occurred on these paths.
- Unit integration tests cover rejected/duplicate delivery, losing campaigns,
  saved vouchers after restart, unknown/lost acknowledgements, pending settlement
  and closure adding no charge. Fault cases use fake transports, not extra chain
  payments. Live reconciliation recovered the same original open signature after
  a local metadata-projection failure; it did not prove a lost network ACK.
- Last full repository suite:208passed,6opt-in skipped,0failed (214total), saved in
  `artifacts/phase4/test-report.json`. Four native transaction/store/session checks
  and22 adapter tests are included. Vendor package
  tests are excluded from repository discovery; optional network/DB/CLI tests are
  not silently counted as passed.
- One focused fresh Sol6.1-high review and bounded corrective recheck passed;
  no substantive demo blockers remain. See `PHASE4_REVIEW.md`.

The reviewer found that cost estimation was pre-broadcast but post-sign in the
recorded run. This was corrected to unsigned native preparation/simulation and
aggregate-cap admission before either transaction signer. Native fixture tests
verify the exact saved message, while fake transports verify zero signer calls
on excess/missing estimates. No extra live payment was made to test that fix.

Organic answers came through isolated app-agent completions with an
operator-recorded bridge, not unattended CLI. Original browser insertions and
receipt hashes exist; signed receipt packets were recorded on later deterministic
replay and explicitly marked. An accepted receipt proves owned-app insertion and
disclosure, not attention, hidden context absorption, influence or conversion.

Jev calls took roughly1.24–1.51s in this run; this is not a sub50ms decision layer
or demonstrated latency/targeting advantage. Fictional creative capabilities are
advertiser declarations; real ContextHint observations are supporting evidence,
not enrollment or knowledge of ChatGPT's proprietary ranking algorithm.

See `PHASE4_RUNBOOK.md` for the exact launcher/operator commands. Phase3 history
is retained. No push, deployment, mainnet payment or ContextHint mutation.
Phase5 recording/polished frontend/presentation packaging remains deferred.
