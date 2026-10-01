# V3 fully live rehearsal on Solana Devnet

Run `v3-devnet-live-rehearsal-20261002`, executed 2026-10-01 22:09–22:17 UTC
(2026-10-02 IST). **Public Solana Devnet, Devnet test USDC only.** Everything is
new in this run: opportunities, organic answers, Jev decisions, auctions,
browser-rendered publisher receipts, charges, vouchers and settlement. The
recorded run `v3-wallet-acceptance` and `artifacts/v3/**` are untouched.

Replay bundle: `replay/` (same schema as `artifacts/v3/replay/`, manifest
`financialMode: "devnet"`, bundle hash `bfac185a…76be`, all story gates passed).
Chain evidence: `chain-check.json`. Restart: `restart.json` (identical state
hash, 0 new calls/charges/signatures). Organic answers: `organic/*.json`.

## What happened

| Turn | Jev history-arm bids | Winner (first price) | Delivery |
|---|---|---|---|
| cached | ClearVault 4000, KeyForge 3000 | ClearVault 4000 | browser receipt → charge 1 |
| offline | ClearVault 3000, KeyForge 3000 (tie) | ClearVault 3000 (deterministic tie-break) | browser receipt → charge 2 |
| repeat | KeyForge 4000 (ClearVault frequency-capped) | KeyForge 4000 | browser receipt → charge 3 |
| mobile | none (all excluded by policy) | no fill, 0 model calls | — |

LeatherGuard skipped (relevance 0–1) and was also excluded by policy.
Settlement (two payers, one per advertiser, same publisher):

| Advertiser | Deposit | Vouchers (cumulative) | Payout | Refund |
|---|---:|---|---:|---:|
| ClearVault | 20000 | 4000 → 7000 | 7000 | 13000 |
| KeyForge | 20000 | 4000 | 4000 | 16000 |
| Total | 40000 | | **11000** | **29000** |

Fees 40000 lamports; gross new rent 8366760; escrow rent reclaimed 2976880;
fees+rent 8406760 < 20000000 cap. Channel PDA rent 1950720 per channel remains
(reclaimable after the slot window; not reclaimed).

## Transactions (all finalized, re-verified via RPC)

- Funding (both payers, not settlement): [2MBqLwsb…](https://explorer.solana.com/tx/2MBqLwsbjtB3wGnjDX9pDm2zBjin2c8DPrbd3t9KjLeZQSDU4JamLTnL5AxnRxHVBn7VUtZnNLVT6Fj5EP82DaYE?cluster=devnet)
- ClearVault open: [41vPwWcK…](https://explorer.solana.com/tx/41vPwWcKmWpegmx6j9LZAow65RBs3anazJngismUyXXAdAnZ35i9FRWHRJFVEgD9ECm88gXZyAbx13x6kXxsWjcr?cluster=devnet)
- KeyForge open: [tK1qDyHZ…](https://explorer.solana.com/tx/tK1qDyHZWqyFr3BhcynYomB2XFRnCnRcwGfByio7DHG1FbDYpeZHaVGu9e1CpNbmRizbGN47tN8Z926GbWymH2E?cluster=devnet)
- ClearVault close (7000/13000): [5GeYRidt…](https://explorer.solana.com/tx/5GeYRidtqb5q2AkziUF5dxBC7zRmrkjuAQj8BrwV9mJriueC2f2Ki8Axv1VcgziDUY8Jmg1LWnFmrLRN2zsPmDzm?cluster=devnet)
- KeyForge close (4000/16000): [3kUvLYGd…](https://explorer.solana.com/tx/3kUvLYGdns7FQ82583KXpP7xW675egDrtKkbcCedUgheASMRFgs5FCifhBWQDH6Lqbi3pxxyCAeaVNVQ9oLJ6ckj?cluster=devnet)
- Channels: [ClearVault G9wtRR7R…](https://explorer.solana.com/address/G9wtRR7RBPYWT5HgfvU3gWZbXhd3F9EgGKeLEKKeEjsY?cluster=devnet),
  [KeyForge FGG7y5AQ…](https://explorer.solana.com/address/FGG7y5AQ94Qq8CbiVDe7Ua8RpAySQmjkoHJ9DD2Xv1Wj?cluster=devnet)
- Payers: [ClearVault 5VZd8fmK…](https://explorer.solana.com/address/5VZd8fmKFFHaWCWEVzB3hZsFKiuVdRk4527XRMoFzfBA?cluster=devnet),
  [KeyForge JALzFX11…](https://explorer.solana.com/address/JALzFX11sa5aYny2HV4XereXUYTUF2MpGSH2ALmerfWc?cluster=devnet);
  publisher [3QeqLZAh…](https://explorer.solana.com/address/3QeqLZAhWqd7ZvB3ea8h2u1SVDVdnbRkBTKs6BazQU9E?cluster=devnet)

## Model usage

- Jev `jev-1.13.0`: 15 calls (cap 24), all completed, 21346 input / 1655 output tokens.
- Organic: DeepSeek `deepseek-flash` (owner decision), temperature 0.2, one
  sponsor-free user message, no tools. 4 completed answers (input/output tokens:
  cached 164/1349, offline 175/1824, repeat 164/939, mobile 151/2757). 8 calls
  total: 4 earlier attempts returned no usable answer (token-limit truncation at
  1200/4000 max tokens, 3 of them with JSON mode on) and were retried; failures
  are logged, no answer was discarded for its content. Fixed: JSON mode off,
  8000 max tokens. Organic answers never enter auctions.

## Differences from the recorded run

- Network: public Devnet + Devnet USDC (recorded: hosted mainnet-fork sandbox).
- Two independent disposable payers (recorded: one payer for both).
- Organic model: DeepSeek flash API (recorded: gpt-6.1-sol app subagents).
- Jev outcomes: cached was won at 4000 vs 3000 (recorded: 4000 tie); repeat
  KeyForge bid 4000 (recorded 3000). Charges 4000/3000/4000 = 11000 (recorded
  4000/3000/3000 = 10000). KeyForge payout 4000/refund 16000 (recorded 3000/17000).
- Label quirk (owner decision: keep): each Jev slot record's `request.mode` reads
  `sandbox` (V3 policy constant, not sent to Jev). The network is the run's
  `financialMode: "devnet"` (manifest, state, frozen policy, receipts, charges).
- Operations: the KeyForge open's first broadcast did not land (submission
  error); the SAME signed transaction was rebroadcast before expiry and
  finalized (same signature). The KeyForge close landed but the in-process
  lookup errored; lookup-only reconcile confirmed it. Both are attributed to
  public-RPC rate limits; the transport now retries HTTP 429 with identical bytes.
