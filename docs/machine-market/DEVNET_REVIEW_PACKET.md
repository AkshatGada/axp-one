# Devnet preparation/review packet — 26 October 2026

**Preparation is complete; this phase authorizes no transactions.** The parent asked
whether up to **1.40 test SOL** may be allocated from the existing payer or is reserved
elsewhere. The user replied **"ys u can"**: allocation up to1.40 for this run is
**APPROVED**, superseding the earlier pending state. ROOT separately gated adapter
implementation/key preparation and every signature/deployment/transaction. No further
broad liability or secret search is needed. This phase ends with this review handoff.

The completed local run and all its evidence remain unchanged at `a054281`. Its eight
Units are financially drained, but only38/40 harness proof checks passed. Exact use-by/
lease equality remain pending, and only2/65 transactions were re-read from current RPC;
63 rely on retained execution-time finality evidence. Devnet must not be called a
continuation or retrospective completion of those missing local proofs.

## Fresh public observations

Official endpoint `https://api.devnet.solana.com`, no redirects/fallback. At
**2026-10-26 16:42:24.970 UTC**, finalized balance slot **515394781**:

| Item | Observation |
| --- | --- |
| Required/observed genesis | `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG` |
| Existing public payer | `D7GzU2o43V4whHJG1pv7k1o3UTU9yuC3Hohp1mdii6ST` |
| Gross balance | **4379560920 lamports =4.37956092 test SOL** |
| Account | System-owned, nonexecutable, empty data |
| RPC version | `4.4.0-beta.1`, feature-set3993424257 |
| Reviewed ELF |241832 bytes; flags3; SHA256 `3335158a895ac7f483c9cbbcc4470e95e65098c54c7da1b7be4733b0594fea1a`|
| SBPF v3 feature |Feature-owned activation at slot461808000; active before observation|
| Unsigned base-fee samples |1/2/3/4 signatures→5000/10000/15000/20000 lamports|

The four-signature quote was refreshed at slot515395740. Fee/rent quotes are estimates
for a future plan, not debits, simulations, compatibility passes or deployment results.
The metadata check found the existing credential file still owner-controlled/0600;
its contents were **not read**, copied, converted or exported. Current private JSON
network/key binding and signing interface are not established by a public balance.
No signer, key generation, simulation, broadcast, model call or actual ELF upload occurred.
Fee messages contain only synthetic zero payloads and existing PUBLIC size placeholders;
those placeholders are not prospective program/trading identities.

[Public observations](../../artifacts/machine-market/devnet-review-2026-10-26/public-observations.json),
[four-signature quote](../../artifacts/machine-market/devnet-review-2026-10-26/four-signer-fee.json),
[requests](../../artifacts/machine-market/devnet-review-2026-10-26/rpc-requests.json),
[responses](../../artifacts/machine-market/devnet-review-2026-10-26/rpc-responses.json).
Solana documents [unsigned fee queries](https://solana.com/docs/rpc/http/getfeeformessage)
and [data-length-specific rent queries](https://solana.com/docs/rpc/http/getminimumbalanceforrentexemption).
Requote before any subsequently authorized signing; null/expired quotes are not zero.

## One new program; roles and authority

Propose one **new** loader-v3 Program/ProgramData pair with exact max length241832.
Do not overwrite/upgrade the existing channel program or any current account/authority.
No mainnet, USDC/SPL/PathUSD, bridge, faucet, top-up, purchase, provider credential or
paid RPC is in scope. SBPF v3 activation supports a prerequisite, not full verification
that this ELF will deploy under current Devnet features. Do not skip feature checking.

Only after a later explicit phase authorization: four fresh, distinct trading handles
(issuer I, buyer A, buyer B, sponsor S), a separate fee-only collector C, a new Program-ID
handle and a buffer handle: **seven new opaque handles**. No new keys exist in this
packet. The legacy wallet's label “sponsor” does not make it the new trading sponsor.
Propose D7…ii6ST as payer/initializer/matcher/gateway/buffer authority/upgrade authority;
these operating aliases are allowed, trading identities remain distinct. A sponsored
Fund has **four distinct native signers**: S,A,I,D7. Ordinary Funds have three.

Existing-key access is a separate implementation/review prerequisite. Its format is not
confirmed to be CLI keypair JSON. Use a reviewed local opaque capability that derives
and checks the public key inside the host, validates the entire pinned run/message and
never emits a seed, mnemonic, private JSON, generic signing endpoint or exported key.
Do not use CLI defaults/ephemeral-mnemonic paths or broaden legacy credential access.
Retaining upgrade authority means the new program remains mutable under D7's control;
verify exact ELF/authority before spending. No authority transfer, `--final` or program
close is included. [Solana authority semantics](https://solana.com/docs/programs/deploying).

## Separate adapter and deployment journal are not implemented

`createLocalRpc` and `localEndpoint` remain literal-loopback-only. A new explicit Devnet
adapter must keep that global invariant, bind the exact HTTPS endpoint/genesis/new
program/hash, reject mainnet/redirects/query tricks/env overrides, and use a new
Market nonce/domain/private DB. The HTTP service remains bound to127.0.0.1.
Reuse reviewed codec/observation rules through the new adapter; do not silently point
the localhost driver at HTTPS or generalize its single-instruction transaction guard.

Loader deployment needs a separate bounded multi-instruction builder/outbox for only
CreateBuffer/WriteBuffer/DeployNewProgram/known-aborted-Buffer-close and the named
fixture funding/sweeps. One aggregate journal counts every distinct signed transaction
across deployment, application and cleanup. Commit exact intent, message, signer set,
fee/rent/principal reservations and Signing fence before opaque signing; persist verified
full signed bytes before send. Preserve every failed/expired/unknown attempt. CLI's
normal expired-write re-sign loop is not a recovery policy for this phase.

Propose at most4 upload writes in flight. Give each not-yet-signed logical offset its
own freshly checked blockhash; do not pre-sign all252 under one expiring hash. Admit a
wave's complete reservations before its first signer call. Any unknown stops expansion;
reconcile all already-admitted attempts before another wave. No fresh signature replaces
an unresolved write. Valid same-byte rebroadcast requires explicit reconciliation.
A failed/expired unresolved upload returns for review, not a CLI rerun/new buffer.

## Concrete three-Unit cases

One synthetic Series, cap3, transferable1/maxTransfers3, sponsored price10000 lamports.
Use only owned synthetic bytes/packet metadata. Bind all deadlines once after deployment;
never extend a right after funding. Execute cases serially; no load/slot-race benchmark,
process-kill test or real model/provider call. Keep publisher bytes/packet/response ready
before each lease; actual slot/finality, not a timer, governs eligibility.

| Unit | Planned path | Evidence required |
| --- | --- | --- |
| D0 |I→A10000; A→B15000; B Start/Finalize|Secondary14850 to A/fee150 immediately; primary face10000 unchanged; old A denied before cached response; issuer9900/fee100; exact response replay to current authorized owner|
| D1 |I→A10000; A→B15000; B Start/source failure/refund|Current B receives original10000; A keeps settled resale proceeds; no primary fee or delivered bytes|
| D2 |S pays10000 for A with exact consent and negative assessment; Start/source failure/refund|Pre-consent Sponsored disclosure, immutable packet/unit/price binding, sponsored nontransferability, sponsor10000 refund, consumed campaign allowance not replenished|

A negative assessment is an unverified opinion, not an eligibility override; decline
must spend nothing. D2 tests refund, **not successful sponsored-body delivery**. That
success claim is also not established by the local U3 refund path and remains outside
this three-Unit plan. No automatic fourth Unit is authorized.

Four declared **zero-principal** native negatives run on D0 after its resale but before
its real Start (no active lease): wrong owner→Custom2; missing owner signature→Custom2;
foreign Unit account→Custom2; stale cursor→Custom6. Exact descriptor/bytes/signature
exceptions require their own reviewed private catalog. Only those four may bypass
preflight to record real fee-only rejection; normal service transactions retain
preflight. No extra Fund is signed for a negative probe. This preserves the hard
five-Fund/60000-lamport gross bound even if a rejection behaves unexpectedly. Sponsor
resale and order-reuse HTTP refusals/current receipts/same-byte replay are narrower
Devnet evidence; native adversarial Fund/nullifier probes remain local evidence.

Every expected rejection must leave principal/state unchanged, charging only its known
fee. Unexpected success/error, native-versus-HTTP mismatch, unknown usage/outcome, failed
persistence or mixed identities halts expansion. No wrong-owner native effect is silently
accepted as a passed case. Reserve up to3 of the unused slots for explicit TimeoutRefund
of existing rights only when all earlier outcomes are known and no terminal succeeded;
no race with an unknown finalize/refund, no new funding or reset. A fallback financially
drains the right but does not pass its originally intended success/failure trace.

## Upload arithmetic and 300-attempt ceiling

The pinned Agave source constructs loader Write plus explicit price0 and CU-limit
instructions. The reproduced empty-write transaction is **271 bytes**; CLI's one-byte
shortvec allowance gives **1232−271−1=960** payload bytes. The full unsigned template
is1232 bytes. **ceil(241832/960)=252**, and all252 ELF chunks are nonzero: no zero-chunk
savings are assumed. This is sizing, not a deployment. Keep legacy format; do not rely
on newer v1 larger packets or silently change the reviewed builder/toolchain.

| Category | Maximum distinct signed transactions |
| --- | ---: |
| Buffer create/init |1|
| Loader writes (252 measured;4 capacity-only slots) |256|
| New Program create/deploy |1|
| Init + Series + three Units |5|
| Five Funds + three Starts + three terminals |11|
| Four trading-wallet funds + collector fund |5|
| Five fixture sweeps |5|
| Known-aborted buffer close, only after exact safe outcome |1|
| Four named authorization negatives |4|
| Unallocated reserve (3 conditional terminal drains;8 not auto-consumed) |11|
| **Hard proposed ceiling** |**300**|

Nominal maximum is **284 transactions** with252 writes and four expected rejections,
without abort close or contingency. The extra16 slots are reserved capacity, not
permission for additional cases or uncertain retries. Same-byte replay is one original
signature. Every distinct signature, failed probe, setup, cleanup and conditional drain
counts. The old localhost128 cap is unchanged;300 is a proposed separate Devnet cap
that requires explicit approval. Unsigned W2 authorizations are separately capped64.

At today's1/2/3/4-signature quotes, the nominal base-fee arithmetic is **1535000
lamports (0.001535 test SOL)**, including the four negatives and fixture-paid sweep
fees. It is not a guarantee. Pin priority price0, fee quote<=50000/transaction and a
**15000000-lamport (0.015 SOL) aggregate fee reservation** for300 attempts. No fee bump.
Market transactions retain<=1232 bytes/200000CU; loader templates use an explicit
1400000-CU bound but have not been simulated or executed. A fee quote does not prove
execution fits CU. [Fee semantics](https://solana.com/docs/core/fees),
[legacy size/atomicity](https://solana.com/docs/core/transactions).

## Rent, principal and peak capital — not automatically refunded

Live quotes: wallet0/650240; Program36/833120; Buffer241869/1229344760;
ProgramData241877/1229385400; Market393/2646680; Series229/1813560;
Unit383/2595880; Match619/3794760; OrderUse178/1554480 (bytes/lamports).

The buffer is initially funded to the ProgramData rent1229385400 (40640 above its own
minimum). Pinned loader code drains it to payer **before** creating ProgramData within
the same atomic deploy. It is not two simultaneous permanent1.23-SOL deposits.
Expected retained program+ProgramData rent is **1230218520 lamports (1.23021852 SOL)**.
Application Market1/Series1/Units3/Matches5/OrderUses10 retain **46766480 (0.04676648)**.
Total expected retained rent is **1276985000 (1.276985)**. **It is not automatically
refunded.** Application tombstones have no close instruction. Program close is separate
future authorization; do not close it or revoke authority to improve a result.

| Hard proposed bound | Lamports | Test SOL |
| --- | ---: | ---: |
| Retained/new rent ceiling |1300000000|1.30|
| Total fee reserve |15000000|0.015|
| Fixture wallet funding (4×0.02 + collector0.001) |81000000|0.081|
| Cumulative actual market gross (3×10000 +2×15000) |60000|0.00006|
| Cumulative primary escrow deposits |30000|0.00003|
| Max single actual trade gross |15000|0.000015|
| **Required explicitly allocated, unreserved payer capital** |**1400000000**|**1.40**|

Principal is already inside fixture capital, not another additive peak requirement.
Conservative rent cap+fee reserve+wallet float+payer System reserve is
1300000000+15000000+81000000+650240=**1396650240**, rounded to1.40. With current quoted
rent the corresponding sum is1373635240. Buffer capital recycles atomically; balances
returned by payouts/refunds do not replenish any ceiling. Sweep only the five fresh
System wallets after every right/attempt is resolved, retaining exact return/fee proof.
No legacy sweep. Expected program/application rent remains on-chain after sweeps.

## Existing liabilities and allocation status

Gross balance alone is not an authorization. The parent's allocation question received
the direct user answer **"ys u can"**. Up to **1.40 test SOL is APPROVED for this run**;
no repeat allocation question or broad liability search is needed. This does not clear
legacy reservations or make the entire4.37956092 balance available. Record the approved
run-specific allocation in its own ledger before future spending, after ROOT reviews
the implementation/manifest. Recheck the public balance before signing; a lower balance
or a new unresolved outcome stops expansion rather than triggering a top-up or silently
using someone else's reservation. The arithmetic residual2979560920 is not a proved
legacy-reservation amount. No current full D7 reservation ledger was read or released.

Historical benchmark evidence records1.28005 test SOL in retained fee reservations,
five expired close identities, three expired openings and nine reserved provider-usage
attempts. Its recorded payer is **FvZ2…WW4SLg**, not D7, so do not attribute/subtract or
release that amount from D7 based on this packet. The live demo's three prepared channels
remain separate. API USD, test USDC, PathUSD and LOCAL SOL are separate ledgers; the
local9.001 SOL balance is not Devnet capital. Financial cleanup of125 old channels did
not clear every reservation. Human allocation and the owning run's accounting are the
proper gate, not a guess that gross balance is free.

## Clock-gap assessment without another funded run

Existing Rust host tests already stub Clock/Rent deterministically. `processor.rs`
tests302–344 reject use-by equality without effects;350 onward finalizes at lease−1;
427–450 reject finalize at equality, reject timeout at E−1 then allow at E, and reject
unused expiry at E−1 then allow at E. These are processor predicate evidence, not SBF
bank execution, signatures, network fees or finality. Rerunning/renaming them cannot
turn the old E+32 traces into exact-slot native passes. No test or runtime was launched
in this preparation phase.

An isolated future SBF bank test could use the exact ELF, synthetic prefunded account
fixtures and `ProgramTest::prefer_bpf(true)` with consistent bank slot/Clock set to
E−1/E/E+1, recording actual executed bank slot and state/lamport rollback. It would make
no public RPC call, faucet request or network-funded run, and would not reset the old
ledger. `set_sysvar` alone can create artificial states; do not pass a Clock-only stub
as real bank-slot evidence. The pinned source supports `warp_to_slot` and `set_sysvar`,
but the market Cargo.lock does not include program-test and the reviewed release
validator build excluded test-only units. A new harness/dependency build may be needed;
its cold cost is not established as cheap within the20GiB cap. Assess/authorize that
separately before installing/building/running anything. Even a correct new controlled
runtime addendum leaves the original executed trace unchanged; ROOT must decide what
closes the acceptance gate. No new funded run is justified merely to rename timing proof.

## Evidence, public footprint and remaining decisions

A future run would publish one reviewed ELF/new program plus public synthetic keys,
Market/Series/three Units/five Match/ten OrderUse tombstones, slots, integer amounts,
consent/response digests and transaction hashes/signatures. Private publisher text,
packet bodies, SQLite, configuration and key handles stay private. Archive each exact
signed transaction, finalized metadata and coherent account proof immediately before
next spending; do not rely on public RPC/Explorer retaining old history. Official RPC
is one provider, not independent-provider consensus. A second provider requires a new
explicit allowlist decision; no automatic fallback/paid service. Explorer links must
name `cluster=devnet` and be corroborated by RPC bytes/meta, not substituted for them.

ROOT decisions remain: (1) record the already-approved up-to1.40 allocation, without
asking again; (2) review these
caps, rent retention, default D2 refund scope and local acceptance/history limitations;
(3) authorize a separate implementation/opaque-key-preparation phase, still no
transactions; (4) review the actual public manifest, exact messages/outboxes and signer
capability; (5) issue a distinct financial Devnet GO before first signature/deploy/
transaction. No phase follows automatically from this packet or an elapsed wait.

[Bounds and liability record](../../artifacts/machine-market/devnet-review-2026-10-26/bounds-and-liabilities.json),
[readiness](../../artifacts/machine-market/devnet-review-2026-10-26/readiness.json),
[source/evidence manifest](../../artifacts/machine-market/devnet-review-2026-10-26/MANIFEST.json).
The prior draft is preserved as an unchanged snapshot in the packet; its “localhost
pending” statement is historical, not current status. All work and commits remain local.
