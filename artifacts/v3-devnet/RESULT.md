# V3 recorded receipts, settled on Solana Devnet

Run `v3-devnet-settlement`, executed 2026-10-01 21:01–21:02 UTC (2026-10-02 IST).
**Public Solana Devnet**, Devnet test USDC only (no real value). Recorded run
`v3-wallet-acceptance` and everything under `artifacts/v3/**` are unchanged.

## What this is

The **same three accepted, publisher-signed receipts** from the recorded run
(sandbox auctions, Jev decisions and browser deliveries) are settled again
through two new MPP payment channels on Devnet. No new model calls, auctions,
deliveries or charges. Each receipt's Ed25519 publisher signature, receipt
hash and award binding were re-verified from `artifacts/v3/replay/run.json`
(SHA-256 `938a0ee8…dd48`) before any voucher was signed.

| Advertiser | Receipt → charge | Voucher (cumulative) | Payout | Refund |
|---|---|---|---:|---:|
| ClearVault | `cdf946cc…` → charge-award-fe97… 4000 | 4000 (off-chain) | | |
| ClearVault | `65d11b86…` → charge-award-b128… 3000 | 7000 (settled on-chain) | 7000 | 13000 |
| KeyForge | `687a3b9b…` → charge-award-bb3d… 3000 | 3000 (settled on-chain) | 3000 | 17000 |
| **Total** | 3 receipts, 10000 | | **10000** | **30000** |

Deposits 20000 each (40000). Amounts are 6-decimal base units (7000 = 0.007).
The final cumulative voucher of each channel is checked on-chain by the Ed25519
precompile inside `settle_and_seal`; `distribute` pays the publisher and
refunds the unused deposit in the same cooperative close transaction.

## Transactions (all `finalized`, re-verified via RPC)

- Funding (not settlement): [43tteXvD…](https://explorer.solana.com/tx/43tteXvDotteiduSm3JB2qxMtAzfT2Ht7atZULcK9a4gRgERLNPLNDytb8wqJB256ncN5bD8rYc3PCamhwxypa4?cluster=devnet)
- ClearVault open: [4K4aHrcK…](https://explorer.solana.com/tx/4K4aHrcKDS6F6MLffM7hZosMnP5sXU3xsbgCBAAo9YVnAZMLk8YHsRiFvZKLgSux2sF49U7LMiFLasNGMYgUtugQ?cluster=devnet)
- KeyForge open: [ppMyRTph…](https://explorer.solana.com/tx/ppMyRTphb7JPvmVpF446am7pNT97xp5bv7KLYdBoajEKRJTHz6jipCWHcg9Yiqh6jKXAxV4fzg7UaKVBaDZhBMT?cluster=devnet)
- ClearVault close (payout 7000 / refund 13000): [3q1Xpdek…](https://explorer.solana.com/tx/3q1XpdeKtGWb9JRwNhxNPB79scZdxpXq69Rn6jSHvyMQSBEPBqfcXVyqa8k1nnZWGrTF6MuKzvs2SdwViEyMXwyL?cluster=devnet)
- KeyForge close (payout 3000 / refund 17000): [2FXVkdaH…](https://explorer.solana.com/tx/2FXVkdaH4xjyUtFcepMrM3PsaMqitSPDrTj1Ce37NomQ7sF8kh4kBi6AiZVZ12FiNpT5tyTjMzv3H2eDLM74F5yo?cluster=devnet)

Channels (status `Distributed`, escrow token accounts closed):
[ClearVault GDsoVHnw…](https://explorer.solana.com/address/GDsoVHnw7QWMHT7KfieYmmFsp1khHYzTWHiKLRnbhKXK?cluster=devnet),
[KeyForge 3qZUw8kN…](https://explorer.solana.com/address/3qZUw8kNDZ6HnVF8mAdhgZAtsQbPNPYZkavU9b6Rktgq?cluster=devnet).
Program [CHNLxYvV…](https://explorer.solana.com/address/CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX?cluster=devnet),
payer [Fynaqs7T…](https://explorer.solana.com/address/Fynaqs7TWBQivEuR8e3uf1PYBeTzkmAbvJzZzWFDG2Md?cluster=devnet),
publisher [Bayi9yaT…](https://explorer.solana.com/address/Bayi9yaTabgtmEy6ykGf55p5SioWVSgpMfY5iN8ozVZ2?cluster=devnet).

## Fees and rent (lamports, separate from token amounts)

Settlement (2 opens + 2 closes): network fees 40000; gross new rent 8366760
(per open: channel PDA 1950720 + escrow ATA 1488440; publisher ATA 1488440 once);
escrow rent reclaimed at distribute 2976880; channel PDA rent 1950720 per channel
remains (reclaimable only after the 1500-slot window; no reclaim performed).
Gross fees+rent 8406760 < 20000000 cap. Funding: fee 5000 + payer ATA rent
1488440, paid by the funder; 0.05 test SOL and 0.040 test USDC transferred.

## Differences from the recorded sandbox settlement

- Network: public Solana Devnet (genesis `EtWTRABZ…`) instead of the hosted
  mainnet-fork sandbox; mint Circle Devnet USDC `4zMMC9sr…` instead of the
  mainnet USDC mint on the fork. Rent values differ by cluster; fees identical.
- Fresh disposable payer/publisher keys (local only, gitignored), funded by one
  transfer from the project's existing disposable Devnet wallet `D7GzU2o4…`.
  One payer still represents both fictional advertisers.
- New channel addresses, hence different voucher payload hashes; same charges,
  same cumulative amounts 4000→7000 and 3000, same payouts and refunds.
- Devnet's program build uses treasury owner `4zTeC5mV…`; the transport points
  `distribute` at that treasury account (0 tokens to treasury here). See
  `docs/build/DEVNET_FEASIBILITY.md`.

Public evidence: `settlement.json` (sanitized allowlist: no keys, wires or
voucher signatures) and `feasibility.json`. Reproduce read-only verification:
`node scripts/demo/v3-devnet-settlement.mjs evidence`.
