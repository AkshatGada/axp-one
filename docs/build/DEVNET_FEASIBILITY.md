# Devnet settlement feasibility (V3 recorded receipts)

Observed 2026-10-02, read-only (RPC reads and unsigned `sigVerify:false`
simulations only; no keys read, nothing signed or broadcast in Phase 1).

**Verdict: GO.** The MPP payment-channels program is live on Solana Devnet and
settles positive cumulative vouchers. The only blocker behind the 2026-10-01
Devnet failure (`artifacts/phase4/feasibility-devnet.json`, Custom 2401) is a
**treasury-account mismatch**: the pinned SDK hard-codes the mainnet treasury
owner, while the Devnet build of the program uses a different one. Fix = a
per-network treasury owner in our transport config (sandbox unchanged). No
program deployment, no custom program, no Rust toolchain needed.

## 1. Program on Devnet

- RPC `https://api.devnet.solana.com`, genesis
  `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`.
- Program `CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX`: executable,
  upgradeable loader; program account SHA-256
  `8d139929fe85d2acfbd67de55f6849ec58b2a158f676f199801e97f46dd7b7e0`.
  Program-data `CghQXkmw2F6p1exMETiZdNeUx9QGraWsNZ4eom1Cuiw1`, deployed at slot
  480232051 (block time 2026-07-31), deployment bytes SHA-256
  `acdb3abfc818a7350e876db42253d465fe31f5d52da0259c7ef3806191b3cf8b`
  (unchanged since the 2026-09-30 read-only observation; differs from the
  mainnet/sandbox build).
- It is in active use: the latest 200 program transactions (2026-09-30 to
  2026-10-01) all succeeded, including `distribute` (discriminator 7) calls.
- Deploying from source is **not needed** (and not attempted): no Rust/Solana
  toolchain is installed locally, and upstream source keeps a `0xBEEF`
  placeholder devnet treasury with a build guard.

### Root cause of the earlier Devnet failure

Error `0x961` = `PAYMENT_CHANNELS_ERROR__TREASURY_ACCOUNT_MISMATCH` (vendored
SDK `generated/.../errors/paymentChannels.ts`). Program source
(`TreasuryTokenAccountView::check`) requires the treasury token account to be
the initialized ATA of the cluster's compiled `TREASURY_OWNER`. The pinned SDK
(`server/session/on-chain.ts`) always derives the ATA of the mainnet owner
`Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP`.

Observed Devnet `distribute` transactions all pass treasury token account
`BSMX9adNvtMHhBSbiuDeaPZZbF82cmPJkSHyptJSHecz` = ATA(owner
`4zTeC5mVqWLruDexgU2mV66p9t5vCA9JyiZqdGDUspap`, devnet USDC). That owner is
also the program's upgrade authority (program-data offset 13), i.e. the
deployer's key. The mainnet-owner ATA on Devnet exists (initialized) but is
rejected, confirming the program compares against a different owner.

### Unsigned simulations (no keys; existing public payer/payee addresses)

One transaction each: `open` (deposit 20000) + Ed25519 voucher precompile +
`settle_and_seal` + `distribute`, signed voucher from an in-memory ephemeral
authorized signer (never persisted), payer
`D7GzU2o43V4whHJG1pv7k1o3UTU9yuC3Hohp1mdii6ST`, payee
`DB4GyrEU7KPXzC4oYfKPfvct5Ja2pxXa7WZnREk3URsV`:

| Treasury owner | Voucher | Result |
|---|---:|---|
| `Cs2zd…` (SDK default) | 7000 | `InstructionError [3, Custom 2401]` (reproduces the bug) |
| `4zTeC…` (Devnet) | 7000 | **success**, payee +7000, payer −20000 +13000 refund |
| `4zTeC…` (Devnet) | 3000 | **success**, payee +3000, payer refund 17000 |

So open, cumulative-voucher settle/seal and distribute (payout + refund) all
work on Devnet with the corrected treasury account.

## 2. Mint

Use Circle's Devnet USDC `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
(SPL Token, 6 decimals). It is the SDK's built-in `devnet` USDC, the mint every
observed Devnet channel uses, and the treasury ATA already exists for it. No
self-minted token is needed. Label: "Devnet test USDC" (no real value).

## 3. Wallets

Fresh disposable Devnet keypairs, generated locally with Node `ed25519` and
written only to `local-state/v3-devnet/secrets/test-wallets.json` (mode 0600,
gitignored by `local-state/` and `**/test-wallets.json`; same shape the native
transport already reads: `sponsor` = payer for both channels, mirroring the
recorded one-payer setup; `publisher` = payee). Secrets are never printed,
logged, committed or put in evidence. The authorized voucher signer is the
payer (as in the recorded run). No operator/treasury key is required: the
treasury ATA exists and receives 0 (no rounding residual with no splits).

## 4. Funding

- Rent on Devnet: 165-byte token account 1488440 lamports; channel PDA rent is
  read at preparation. Per channel: open ≈ channel PDA + escrow ATA + 5000 fee;
  close ≈ 10000 fees + publisher ATA rent once. Total well under 0.02 SOL;
  every transaction stays under the existing 20000000-lamport per-run cap.
- Devnet airdrop is rate-limited/unreliable and Circle's USDC faucet is a web
  form (not automatable here). Instead: **one funding transaction from the
  project's existing disposable Devnet test wallet** (`D7Gz…`, already
  user-authorized for Devnet on 2026-09-30; holds ~4.997 test SOL and 18.997
  Devnet USDC): 0.05 test SOL + create payer ATA + 40000 base units (0.040)
  Devnet USDC to the fresh payer. Explorer-visible, labelled as funding (not
  settlement).

## 5. Code paths

Reused unchanged: `NetworkPaymentAdapter` (durable intent-before-sign,
reconcile, cumulative voucher/close checks), `SQLitePaymentStore`,
`NativeSessionStore`, the verified vendored SDK loader, native transport
open/voucher/commit/close/lookup (it already allowlists Devnet RPC, genesis and
mint), `verifyReceipt`/`hash` from contracts.

Code changes (minimal, config-scoped, tested):

1. `packages/payments/sdk-transport.mjs`: treasury owner becomes a per-network
   allowlist value (`sandbox` = `Cs2zd…` as before, `devnet` = `4zTeC…`). The
   SDK-built `distribute` instruction's treasury account is retargeted only when
   the network owner differs from the SDK constant, after checking the SDK
   account is exactly where expected. Sandbox output is byte-identical.
2. New `packages/v3/devnet-settlement.mjs` + `scripts/demo/v3-devnet-settlement.mjs`:
   loads the three recorded charges from `artifacts/v3/replay/run.json`
   (read-only), verifies each publisher receipt signature/hash/award binding,
   builds Devnet terms, and runs the adapter with its own state dir
   `local-state/v3-devnet/`. `packages/v3/payments.mjs` (bound to the recorded
   sandbox run) is not modified. Nothing under `artifacts/v3/**` is written.

## 6. Risks

- Devnet deployment could be upgraded by its authority mid-run → program
  account/program-data hashes are re-checked before every signature.
- RPC rate limits (429) → lookup-only reconcile, never re-sign; saved identities.
- Open must land within the slot window/blockhash life → prepare immediately
  before signing (existing freshness guard).
- Devnet history is pruned eventually on public RPC/explorer; finalized
  transaction/account evidence is saved locally in `artifacts/v3-devnet/`.
- Same payer for both fictional advertisers (as recorded): not two independent
  advertiser wallets.

## 7. Execution plan (expected 5 on-chain transactions)

1. `wallets` (local only) → 2. `fund` (tx 1) → 3. `freeze` terms (salts,
expiry, hashes) → 4. `open v3-clearvault-channel` (tx 2), `open
v3-keyforge-channel` (tx 3) → 5. `authorize` each: off-chain cumulative
vouchers 4000→7000 (ClearVault) and 3000 (KeyForge), each bound to its recorded
charge/receipt → 6. `close` each (tx 4, tx 5): final voucher verified on-chain
by the Ed25519 precompile in `settle_and_seal`, `distribute` pays 7000/3000 and
refunds 13000/17000 → 7. `evidence`: wait for `finalized`, verify every
signature via RPC, write sanitized `artifacts/v3-devnet/settlement.json`.

## Executed (2026-10-02)

Executed as planned: 5 finalized Devnet transactions (1 funding, 2 opens,
2 cooperative closes), payouts 7000/3000, refunds 13000/17000. Evidence:
`artifacts/v3-devnet/settlement.json`, summary `artifacts/v3-devnet/RESULT.md`.
