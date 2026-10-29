# Devnet retry review — 28 October 2026

Status: local correction and review packet only. No replacement run, signature,
broadcast, deposit, new keypair or change to the original financial state occurred
in this phase. The original run remains terminal at `f764727`; its full buffer
refund and incomplete D0/D1/D2 outcome remain unchanged.

## Timing correction

The [reviewed plan](DEVNET_REVIEW_PACKET.md) required application deadlines to be
bound once **after deployment**. The launcher instead fixed them before upload.
The original 172 successful writes spanned slots 515432041–515436002: 3,961 slots
between first and last write. Projecting 252 writes at that observed pace consumes
about 5,838 slots, before recovery, deployment and application work. The original
6,000-slot window was therefore too short when anchored before upload.

Fresh manifests now declare `deadlinePolicy: after-deployment-v1` with null absolute
deadlines. Upload and deployment use that immutable manifest identity. Before
application sealing, application transactions and W2 authorizations are unavailable.
The launcher completes deployment, verifies the pinned program/ELF/loader/authority,
then records one `application-deadlines` checkpoint against its finalized deployment
signature and slot. A fresh finalized slot determines useBy +6,000 and read-valid
+10,000; these are the original application durations, not a longer funded right.

The application plan is rebuilt from that durable checkpoint under the same
manifest hash, journal, prior attempts and budgets. A reopened application plan
must match the committed seal and finalized deployment. Restarting or funding
cannot extend deadlines; repeated sealing returns the original checkpoint. Private
and public seal files are projections of the journal checkpoint, not new authority.
The direct unsealed `run()` entry refuses before any upload; callers use the explicit
deploy → seal → reopen → application sequence, as the launcher now does.

The launcher rejects a terminal original run read-only with `RUN_ALREADY_CLOSED`
before key loading or RPC. It does not reset, redeposit into, or reuse the closed
original journal. Old manifests/evidence remain readable and unchanged.

## Capacity adjustment proposed for review

The original attempt/write ceilings have not changed in code. Refunded collateral
does not erase old attempts or replenish an attempt, fee or campaign allowance.

| Capacity | Original ceiling | Prior counted | Remaining | Proposed additional ceiling | Proposed cumulative ceiling |
| --- | ---: | ---: | ---: | ---: | ---: |
| Native attempt slots | 300 | 178 | 122 | 300 | 478 |
| Loader write slots | 256 | 176 | 80 | 256 | 432 |
| W2 authorizations | 64 | 0 | 64 | 64 | 64 |

A replacement upload needs 252 fresh writes; the old buffer was closed, so its
172 successful chunks cannot be resumed. The ordinary full fixture path uses 284
native transactions and 252 writes. Counting the original run gives 462 expected
cumulative attempt slots and 428 expected cumulative write slots, with the proposed
ceilings retaining finite recovery/cleanup capacity. This is a proposed capacity
change, not an approved or silently applied increase.

Only one replacement is proposed: same owned synthetic content, reviewed ELF,
one new program deployment, one Series/three Units, D0/D1/D2, five Funds, four
zero-principal probes and existing sweeps/cleanup. Reuse exactly the seven existing
authorized local keypairs and D7 payer; generate or copy no private keys. A new
public manifest/domain and separate private journal must reference those existing
handles, preserve all original records and carry the original net fee spend.

## Monetary allocation stays 1.40 test SOL across runs

No further monetary allocation is requested. Existing test-SOL/keypair permission
must not be requested again. The proposed execution must enforce these aggregate
figures, rather than treating a new journal as a fresh allowance:

| Accounting item | Lamports | Test SOL |
| --- | ---: | ---: |
| Aggregate allocation across both runs | 1,400,000,000 | 1.40 |
| Prior finalized net fees | 875,000 | 0.000875 |
| Prior retained collateral/liabilities | 0 | 0 |
| Remaining allocation for new liabilities/spend | 1,399,125,000 | 1.399125 |
| Aggregate fee ceiling | 15,000,000 | 0.015 |
| Remaining fee allowance | 14,125,000 | 0.014125 |
| New rent ceiling | 1,300,000,000 | 1.30 |
| New fixture funding ceiling | 81,000,000 | 0.081 |
| Prior collateral deposited and fully returned | 1,229,385,400 | 1.2293854 |

With the prior wallet rent-reserve quote of 650,240 lamports, the worst listed
combined reservation is 875,000 prior fees +1,300,000,000 new rent +14,125,000
remaining fee allowance +81,000,000 fixture capital +650,240 wallet reserve
=1,396,650,240 lamports, leaving 3,349,760 beneath the original aggregate cap.
Fresh quotes must fit; a changed rent/fee/balance does not grant a top-up.

Gross historical rent allocation plus proposed new rent may reach 2,529,385,400
lamports; 1,229,385,400 of that historical amount was already returned. This is
turnover accounting, not simultaneous exposure or fee spend. Peak exposure and
cumulative nonrefunded spend must still include the prior 875,000 fees and remain
within 1.40 SOL. No refund replenishes the 0.015 SOL total fee ceiling. New gross
trade/primary ceilings stay 60,000/30,000 lamports; fee-per-transaction stays 50,000.

## Verification and remaining execution gate

Focused offline verification covers an upload that outlasts the old absolute window,
post-deployment seal persistence, same manifest/journal/attempt accounting across
reopen, all three fixture application cases, refusal of an uncommitted/extended seal,
and read-only refusal of a closed run. These are fixture/source checks, not new
Devnet deployment evidence. Full focused regressions and hashes are recorded in
`artifacts/machine-market/devnet-retry-review/`.

The current local sample is 149,626,806,272 free bytes, 7,978,180,608 task bytes and
3,284,992 original app bytes. The original journal has 174 FinalizedSuccess actions,
no writer owner and four archived expired-unsent slots. The 40 GB free-space floor,
20 GiB task ceiling and 50 MiB app ceiling remain. Prior public proof and historical
native evidence are preserved by hash; this phase makes no new network claim.

Before any new signature, review the cumulative 478/432 capacity adjustment; bind
the new reviewed manifest and separate journal to the existing seven handles without
rewriting their index or the original journal; seed the prior 875,000 fees into
aggregate fee/peak enforcement; and refresh read-only genesis, program compatibility,
rent/fees, payer availability and storage against the remaining aggregate allowance.
The old executable command must not be rerun. No new live execution has been
started by this local review phase.

## Final prior-fee binding and go/no-go

The proposed live deferred manifest must declare `priorFeesLamports: 875000`.
Omitting it or setting it to zero is refused before signer access. This value is
part of the immutable manifest/journal identity. Journal summary and every admission
include it in aggregate fees and peak exposure before the first new signature.
The initial remaining aggregate fee allowance is therefore 14,125,000 lamports.
Reopening after the application seal retains that same baseline.

The next journal's initial payer balance already reflects the old fee debit, so
current payer conservation subtracts only current-run fees plus current rent.
Subtracting carried fees from that initial balance again would double-count them;
new tests verify that it does not happen. Carried fees also reject an over-budget
new native reservation before any signer callback.

The **1,396,650,240-lamport worst listed reservation includes prior fees exactly
once**. Its wallet reserve uses the prior 650,240-lamport quote and its other inputs
are ceilings, not new live estimates. A refreshed wallet reserve above the remaining
3,349,760-lamport headroom, required rent/fees above their ceilings, insufficient or
unexplained payer funds, resource failure or unresolved native outcome invalidates
the proposed execution. Recalculate from fresh quotes without raising the 1.40 SOL
aggregate cap or treating the prior collateral refund as new fee allowance.

Timing regression suite: 187 passed. After the final prior-fee change, nine targeted
accounting/deadline/host-binding checks passed. These sets overlap; their counts
must not be summed into a unique-test total. No additional broad review was run.

**NO-GO for live retry:** cumulative 478-attempt/432-write capacity approval is still
pending. The old 300/256 implementation caps remain unchanged. The next manifest
and separate private journal also need their reviewed link to the existing seven
key files; no key generation, copy, index overwrite, old journal reset or live
signing occurred here. Monetary permission remains the already agreed 1.40 test SOL
total; this packet requests no additional monetary allocation.

The machine-readable proposal is
[RETRY_PROPOSAL.json](../../artifacts/machine-market/devnet-retry-review/RETRY_PROPOSAL.json).
