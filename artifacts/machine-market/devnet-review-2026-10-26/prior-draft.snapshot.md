# Proposed next Devnet phase — separate ROOT GO required

26 October 2026. Planning/read-only observations only. Finish and review the current
localhost prerequisites first; their actual runtime outcome is still pending this
proposal. No deployment, signature, key generation, transfer, top-up, token issuance,
source upload, push or commitment of funds was performed here. The wallet balance
below does not authorize spending and does not clear existing reservations.

## Decision and exact network

Deploy **one new marketplace program ID**, using the reviewed marketplace ELF.
The existing payment-channel program has a different ABI/economics and MUST NOT be
upgraded, reused as this program, or have its accounts/authorities changed. Create a
new Devnet Market nonce/domain/database; preserve all localhost and historical state.

- Endpoint allowlist: **https://api.devnet.solana.com**, no redirects/fallback.
- Required genesis: **EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG**.
- Asset: **Solana Devnet test SOL**, integer lamports only; no mainnet, USDC/SPL,
  new tokens, bridges or paid providers. Devnet is a public test cluster, not local
  validator evidence. See [Solana cluster documentation](https://solana.com/docs/references/clusters).
- Existing funding/operating public key:
  **D7GzU2o43V4whHJG1pv7k1o3UTU9yuC3Hohp1mdii6ST**.
  Its existing private configuration was NOT opened, copied or converted. The
  root-verified public identity/permission evidence is in DEVNET_PREFLIGHT.md.
- Candidate ELF: **241832 bytes**, SHA256
  **3335158a895ac7f483c9cbbcc4470e95e65098c54c7da1b7be4733b0594fea1a**,
  independently rehashed here. Any later binary change invalidates these estimates.

Current transport intentionally rejects HTTPS/non-loopback endpoints. Do not weaken
that guard or simply point localhost acceptance at Devnet. A separately reviewed,
explicit Devnet-only adapter/deployment outbox and finite three-unit driver are
prerequisites after GO; frozen local Packet03/128-attempt acceptance stays unchanged.

## Actual read-only observations

Official RPC at **14:01:01 UTC / 19:31:01 IST**, finalized slot **515354217**:
expected genesis; **4379560920 lamports = 4.37956092 test SOL**. Unsigned
getFeeForMessage samples returned **5000** lamports for one required signature and
**10000** for two. No message was signed, simulated or submitted. The two-signer
sample uses a public loader address solely to count fees, not as a usable signer.
An earlier delayed fee query returned null after blockhash expiry; it is preserved,
not treated as zero fee. See [fee RPC](https://solana.com/docs/rpc/http/getfeeformessage).

Current finalized rent quotes (lamports; data lengths in bytes):

| Account | Bytes | Rent |
|---|---:|---:|
| System wallet reserve | 0 | 650240 |
| Loader Program | 36 | 833120 |
| Loader upload Buffer | 241869 = 37 + ELF | 1229344760 |
| Loader ProgramData | 241877 = 45 + ELF | 1229385400 |
| Market / Series | 393 / 229 | 2646680 / 1813560 |
| Unit / Match / OrderUse | 383 / 619 / 178 | 2595880 / 3794760 / 1554480 |

These were queried live, not inferred from an older rent rate. Requote before any
signing; [getMinimumBalanceForRentExemption](https://solana.com/docs/rpc/http/getminimumbalanceforrentexemption)
returns the minimum for a specified data length. Sanitized requests/results and
arithmetic: `artifacts/machine-market/devnet-preflight/` (no wallet secrets).

## Deployment sizing, retries and peak rent

Installed pinned CLI reports **solana-cli4.3.2, src a2033000**. Its actual help and
local official source were inspected without loading wallet/config contents:

- `--max-len` defaults to the original ELF length, not twice its length. Explicitly
  pin **241832** and forbid auto-extension. [Pinned source, program.rs1430–1445](https://github.com/anza-xyz/agave/blob/v4.3.2/cli/src/program.rs#L1430-L1445).
- With payer=buffer authority=the existing operating key, explicit zero CU price,
  one loader Write plus CLI compute-budget instructions, the baseline transaction
  is271 bytes. `1232-271-1=960` payload bytes gives **252 writes maximum** before
  zero-chunk skipping. Reserve **256 writes**, and refuse a larger measured batch.
  This is serialization arithmetic, not an executed deployment count.
  [Chunk calculation](https://github.com/anza-xyz/agave/blob/v4.3.2/cli/src/program.rs#L2541-L2553),
  [write construction](https://github.com/anza-xyz/agave/blob/v4.3.2/cli/src/program.rs#L2605-L2629).
- CLI defaults to **five signing passes**, replacing expired write signatures.
  `--max-sign-attempts1` bounds that write loop; it does not make the entire CLI
  deployment an application-durable outbox. [Pinned option](https://github.com/anza-xyz/agave/blob/v4.3.2/cli/src/program.rs#L282-L299).
- The ordinary CLI can create an ephemeral buffer and print its recovery mnemonic.
  Do not use implicit program/buffer keys or global defaults. The existing application
  wallet JSON is not confirmed to be CLI keypair format; do NOT dump/convert it.
  The deployment path must use reviewed local opaque signing and persist every exact
  attempt BEFORE send. CLI help/source are sizing references, not deployment approval.
  [Default program key behavior](https://github.com/anza-xyz/agave/blob/v4.3.2/cli/src/program.rs#L1259-L1276),
  [ephemeral mnemonic reporting](https://github.com/anza-xyz/agave/blob/v4.3.2/cli/src/program.rs#L1447-L1454).
- Keep explicit RPC transport, preflight, finalized verification, zero priority fee,
  no fee bump, and one signature attempt per logical transaction. A timeout/expired
  unresolved write stops expansion. Only explicit reconciliation and same-byte
  valid rebroadcast are allowed; no CLI rerun, fresh buffer or new blockhash repair.

The CLI initially funds Buffer with the **ProgramData rent amount1229385400**, even
though Buffer minimum is1229344760. On initial deploy the loader drains Buffer to
payer BEFORE paying for ProgramData. Thus Buffer and ProgramData are **not two
simultaneous permanent rent deposits**. Program account rent833120 is additional.
Retained program rent is **1.23021852 test SOL**, not ~2.46.
[Buffer funding](https://github.com/anza-xyz/agave/blob/v4.3.2/cli/src/program.rs#L2579-L2590),
[atomic Buffer drain/ProgramData creation](https://github.com/anza-xyz/agave/blob/v4.3.2/programs/bpf_loader/src/lib.rs#L287-L302).

## One bounded three-unit Devnet acceptance

One synthetic Series, cap3, transferable/maxTransfers=(1,3), fixed sponsored price
10000 lamports. Three Units, at most five funded trades; no auction/load benchmark,
slot-equality timing race, induced process kill or replacement-signature test on
Devnet. Keep those controlled proofs in the localhost phase.

| Unit | Native path | Required proof |
|---|---|---|
| D0 | issuer→A10000; A→B15000; B Start/Finalize | Immediate secondary seller14850/fee150, unchanged primary escrow10000, old A denied, issuer9900/primary fee100, exact same private response replay |
| D1 | issuer→A10000; A→B15000; B Start; explicit source failure | Refund original P10000 to current B only; A keeps settled resale proceeds; no primary fee, historical clawback or bytes |
| D2 | sponsor pays10000 for A; negative assessment; Start/failure refund | Exact signed packet/consent and pre-consent Sponsored disclosure, nontransferability, refund sponsor10000, campaign consumed allowance not replenished |

D2 is a refund case: it does not claim successful sponsored resource-body delivery
on Devnet. That broader proof remains in the separate localhost prerequisites.

Issuer/buyerA/buyerB/sponsor must be four fresh distinct trading identities. The
legacy wallet label “sponsor” does not make it the new trading sponsor: propose
D7…ii6ST as payer/matcher/gateway/initializer/upgrade authority, with operating aliases
allowed by the program. Collector must be a separate fresh fee-only identity.
After explicit GO only: create four disposable trading handles, one collector,
one program-ID and one buffer handle (seven new handles total), locally under an
ignored private run directory. Do not copy existing secrets or use old participant
keys. Fund each trading wallet at most **0.02 test SOL**, collector **0.001**:
**0.081 test SOL total fixture capital**, not a fee or extra escrow budget.

Every transition requires original signature/finalized meta, coherent account
bytes, immutable receipts/OrderUses, exact unique-key cash/rent/fee deltas and a
same-current-DB checkpoint. Unknown principal/fee/outcome blocks subsequent spending.
Wallet sweep occurs only after all three Units and all attempts are fully resolved.

## Proposed hard ceilings for ROOT to approve

| Category | Maximum distinct signed transactions |
|---|---:|
| Deployment: Buffer create/init1 + writes256 + Program create/deploy1 | 258 |
| Market bootstrap: Init1 + Series1 + Units3 | 5 |
| Five Fund + three Start + three terminal effects | 11 |
| Four trading-wallet funds + collector fund | 5 |
| Five terminal fixture-wallet sweeps | 5 |
| Known-aborted buffer cleanup | 1 |
| Unallocated contingency, including failed attempts | 15 |
| **Total ceiling, including deployment/funding/cleanup** | **300** |

No contingency authorizes retrying an uncertain operation. Same-byte rebroadcast
is not a new signed attempt; distinct signatures, failures and bootstrap operations
all count. Local128 cannot contain this deployment: this is a **new proposed300**
Devnet ceiling, requiring explicit GO and one aggregate ledger across deployment,
application, funding and cleanup outboxes. Do not silently increase local caps.

- Fee quote ceiling **50000 lamports/transaction**, priority price0, total fee
  reserve **0.015 test SOL** (300×50000). Current indicative base fees for252 writes
  and the declared success path are about **0.001525**; this is not a guarantee.
- Rent deposits ceiling **1.30 test SOL**. Expected retained application rent for
  Market1/Series1/Units3/Matches5/OrderUses10 is **0.04676648**, plus program rent
  **1.23021852** = **1.276985 test SOL**. Buffer capital is recycled as above.
- Peak **unreserved** payer requirement **1.40 test SOL**, covering1.30 rent +0.015
  fee reserve +0.081 fixture capital + payer System reserve, rounded upward.
  Principal is already inside fixture capital; payouts do not replenish ceilings.
- Before first signature require fresh balance minus **all existing reservations
  and liabilities** >=1.40. Existing reservations are presently UNKNOWN to this
  planning worker. 4.37956092 is gross balance, not confirmed available capital.
  Do not clear reservations, top up, buy SOL or request a faucet to make this pass.
- Recompute exact messages/counts/rent before signing. Different authority aliases,
  added instructions, changed ELF/layout/fees or a larger batch require a revised
  bound. Market instructions retain the frozen200000CU/1232-byte constraints;
  loader deployment has its own measured CU configuration and cannot borrow that
  claim from marketplace tests.

## Public footprint, cleanup and evidence

Public: one241832-byte ELF with pinned SHA, loader Program/ProgramData, one Market,
one Series, three Units, five Match receipts, ten OrderUses, synthetic participant
pubkeys, hashes, slots, amounts and transaction signatures. No private publisher
text, sponsor packet bodies, SQLite, raw diagnostics, signer files or source tree
uploads. A limited binary marker check found no `/Users/`, `/private/` or private-key
PEM markers; that is not a complete sensitive-data audit. Verify the exact approved
binary/metadata again before publishing it.

Keep the new program upgradeable under the explicitly named authority for inspection;
no `--final`, authority transfer or program close in the default phase. Loader Buffer
should have zero lamports after successful deploy; verify, do not assume. A known
aborted buffer may be closed once after exact outcome/authority verification, within
the cleanup reservation. Never close an unknown deploy's buffer as “recovery”.
Sweep the five fresh System fixture balances back to D7…ii6ST after terminal proof;
retain local private handles/evidence until separately approved cleanup. Record exact
returned amounts, fees and zero/remaining balances. No sweep of legacy accounts.

Application PDAs are permanent tombstones with no close instruction: retain their
**0.04676648 test SOL** rent. Program/ProgramData retain **1.23021852** until a
separately approved future close; do not call retained rent refunded or silently
close the program to improve a result. Preserve DB/private responses for authorized
same-response recovery; public export contains only their digests.

For each finalized signature use
`https://explorer.solana.com/tx/<signature>?cluster=devnet`; program/account links use
`/address/<publickey>?cluster=devnet`. Export sanitized exact-byte transaction hashes,
pre/post deltas, decoded receipt hashes, loader/binary identity and separate fee/rent/
refund totals. Explorer alone is not the verifier. Account-only history recovery
stays narrower and never invents missing finality, transaction fees or attention.

## Gate checklist — still pending

1. Finish localhost runtime/acceptance and review final binary/hash; no success is
   inferred from source/unit checks or the running build.
2. Review a separate bounded Devnet RPC/deployment adapter, local opaque existing-key
   access, exact-byte deployment journal and aggregate300-attempt budget. No secret
   conversion, silent CLI re-sign, public-source upload or weakening of loopback code.
3. Verify current Devnet feature/loader compatibility of this SBPF ELF, exact fee/
   rent/serialization quotes and available balance after legacy reservations. Do not
   use skip-feature-verify. These checks are not satisfied by localhost alone.
4. ROOT issues a separate Devnet GO naming program/hash/network, identities, three
   cases,300 attempts,1.30 rent/0.015 fees/0.081 capital/1.40 peak and stop rules.
5. One declared run only; any unresolved financial outcome stops new spending and
   returns for review. No automatic extension, reset, new deployment or funded rerun.
