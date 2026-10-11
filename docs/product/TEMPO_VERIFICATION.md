# Tempo release acceptance — 11 October 2026

The additive Tempo lifecycle passed on Moderato Testnet, followed by a fresh
Solana Devnet regression. All three isolated channels are financially closed.
Production at axp.one and its existing workspace, encryption key, Solana wallet
and receipt identity were preserved. Release activation requires PR review/merge.

## Actual outcomes

| Run | Deposit | Publisher paid | Refunded | Accepted deliveries / vouchers |
| --- | ---: | ---: | ---: | ---: |
| Tempo delivery channel | 0.05 test PathUSD | 0.018 | 0.032 | 6 / 6 |
| Tempo zero-delivery channel | 0.05 test PathUSD | 0 | 0.05 | 0 / 0 |
| Solana regression | 0.02 test USDC | 0.003 | 0.017 | 1 / 1 |

Each row conserves its own deposit. USDC and PathUSD are not combined.
Tempo paid 0.009 after the first three deliveries while keeping the channel open.
Three further accepted deliveries advanced the **same** cumulative authorization
from 0.009 to 0.018. Final closure paid only the remaining 0.009 and refunded 0.032.
The campaign cap stayed at 0.028 throughout; payout did not replenish it.

The six cumulative voucher values were 3000, 6000, 9000, 12000, 15000 and 18000
base units. These are authorization watermarks, not six amounts to add together.
An independent zero-delivery closure returned its entire 50000-unit deposit.

Tempo incurred five finalized transactions and **499 base units (0.000499 test
PathUSD)** in fees, separately from deposit conservation. The read-only verifier
checked canonical finalized receipts, event parties, channel descriptors/state,
TIP-20 transfer deltas, fee payer/token and historical payer/publisher balances.
The fee calculation is `ceil(gasUsed × effectiveGasPrice / 10^12)` in PathUSD base
units, using Tempo's attodollar gas-price denomination.

Solana's opening and final settlement both finalized. Independent readback checked
the native program, token owners/deltas, slots, network fees and deposit
conservation. Network fees totaled 20000 lamports. Opening allocated 3439160
lamports of rent; closing reclaimed 1488440. The gross fee/rent reservation used
was 3459160 lamports, below the approved 20000000 limit. Remaining token-account
rent is distinct from transaction fees and channel refunds.

## Evidence

- [Tempo acceptance](../../artifacts/tempo/testnet-acceptance.json): public channel
  identities, transactions, six voucher summaries, accepted receipt hashes and
  lifecycle checkpoints. No voucher signatures or private transaction bytes.
- [Independent Tempo readback](../../artifacts/tempo/testnet-independent-verification.json):
  five finalized transactions, canonical channel state and balance conservation.
- [Solana acceptance](../../artifacts/tempo/solana-regression-acceptance.json) and
  [independent readback](../../artifacts/tempo/solana-regression-verification.json).
- [Live idempotency](../../artifacts/tempo/idempotency-live.json): replaying an
  accepted receipt retained one charge; repeating the first payout retained the
  original transaction hash and open campaign, without another transaction.
- [Actual no-fill](../../artifacts/tempo/no-fill-observation.json): one original
  question reached the per-session frequency cap, causing no Jev call or charge.
  It was retained as no fill; subsequent questions used a fresh session.
- [Hosted verification](../../artifacts/tempo/preview-verification.json): durable
  budget, final channel summaries, cold-start revisions and read-only checks.

Public transaction links:

| Operation | Explorer |
| --- | --- |
| Tempo delivery opening | [Open](https://explore.testnet.tempo.xyz/tx/0x95991a0999669cdf02fbf672a90eeab72421d7b503309aebd2ae4ba35bf36a6c) |
| Tempo payout while open | [Payout](https://explore.testnet.tempo.xyz/tx/0x3ed8149c0f2058cf656201ccf9e6327464eda18b24d2be3a91ef07e9a2ae1563) |
| Tempo final payout/refund | [Close](https://explore.testnet.tempo.xyz/tx/0xee64435daa0c7f579228607c7b1ae5ad1258e7e6bc74f23b7c4e5f7208ea4617) |
| Tempo zero-delivery opening | [Open](https://explore.testnet.tempo.xyz/tx/0x91017150dc6fb3b85613115ac8d7c906cd2cb1c52a370092d7540df3c6e916c2) |
| Tempo full refund | [Close](https://explore.testnet.tempo.xyz/tx/0xbd9227d9c6dbf86741cc64bc30f42e79a97530301a9901305b9739c35d8ea891) |
| Solana regression opening | [Open](https://explorer.solana.com/tx/Li3QSnMvKxVAorMp2v9W2JDDBF9NwofuucUHPPKaDHKbNU5mrxFededTuSvcXfcaQ2aAuxVxPn57KdRP7Afy4Za?cluster=devnet) |
| Solana payout/refund | [Close](https://explorer.solana.com/tx/5aQUwrv5ftubAuYBm9yueLYwtSUUkA5QBa2ExLimwZeLzw3BxYR1iMSRVLroUGNKYEdi298QBWWgZv8yfto4Wua7?cluster=devnet) |

## Hosted execution and limits

[Dedicated Preview](https://axp-p2qmbchjj-lucario004.vercel.app) uses the isolated
`tempo-integration-20261011` workspace. The first three Tempo deliveries/payout
ran locally. After stopping its writer, both encrypted shards and the durable
provider budget were imported into Preview. The same funded channel and receipt
keys continued there. Both rails coexisted; a Tempo opportunity showed the active
Solana campaign excluded for network mismatch before the single Jev judgment.
Solana then delivered and settled through the same hosted facade.

A second deployment cold-started from the identical import package and preserved
the progressed, closed channels instead of reseeding them. Financial revision 66
and organic revision 13 were idle. Reading health, bootstrap, publisher config,
state and the operator proof endpoint left budget and both revisions unchanged.
The operator-only endpoint is not part of ordinary production builds.
The final dashboard shows seven accepted deliveries across both rails, with
separate 0.003 USDC and 0.018 PathUSD spend cards. Its SDK guide retains the three
integration steps. Those page reads also left budget and shard revisions unchanged.
Signing flags are now disabled for **future branch Preview deployments**; existing
bounded proof deployments retain their immutable configuration and closed state.

Eight fresh DeepSeek answers and seven Jev evaluations completed, with zero
admitted/unknown provider attempts at the final check. Conservative reservations
total **$0.345** against the $1 ceiling; this is reserved budget, not a provider
invoice. The run used two Tempo deposits totaling 0.10, one Solana deposit of
0.02, seven accepted deliveries and one real no-fill. It stayed within all
predeclared channel, provider, collateral and fee bounds. No further funded run
is authorized by this evidence.

## Offline and product checks

The initial baseline passed 477 tests with 11 skips. The final integrated suite
passed **541 tests with 11 skips and zero failures** (552 total). The final
dashboard's 21 focused tests and the Preview endpoint's eight fixtures pass.
Repository checks are recorded in [the release validation](../../artifacts/tempo/release-validation.json).
Both UI typechecks, app builds and the packaged site/function build passed.
Independent payment and UX reviews found no remaining blockers.

Coverage includes wrong rail before Jev, approval/network binding, duplicate
receipts, monotonic concurrent authorization, payout delta/budget accounting,
zero-delivery refund, lease loss, unsigned/signed transaction recovery, unknown
broadcast fencing, repeated payout, cold starts and Tempo-disabled Solana access.
Real chain outcomes and DOM insertion receipts above are separate from fixtures.

## Short demonstration

1. Dashboard: show campaign Spend/Review network selection and separate USDC /
   PathUSD summaries. Explain that approval binds the rail before funding.
2. SDK: show Request → Render → Acknowledge and the optional network enum in
   integration details. Server configuration controls token, recipient and keys.
3. Example chat: select the rail in settings. DeepSeek generates only the
   independent answer; ContextHint evidence and advertiser hints inform Jev.
4. View internals: Context → Buyers → Auction → Delivery → Payment. Point out the
   network mismatch exclusion and the accepted Sponsored insertion receipt.
5. Payment: show six off-chain vouchers, the first payout while open, continued
   delivery, final payout/refund and the finalized Explorer links. Show Solana's
   equivalent final settlement/refund using its own network and currency.

The verification channels are closed; this Preview is proof for inspection, not
an invitation to create additional deposits or spend the remaining API allowance.

## Rollout after review

Merge the reviewed branch, then perform a normal site build (without the operator
wrapper or its encrypted bootstrap). Preserve production's Solana identities,
publisher receipt keys, `demo` workspace, state encryption key and Blob connection.
Tempo remains disabled without its explicit enable/sign variables. Configure
separate Tempo server keys only when activating that rail; never reuse the
verification namespace as production or reset its financial snapshot.

After activation, check read-only health, both currency labels, SDK configuration
and Explorer origins. A new paid smoke test requires separately approved bounds.
Rollback disables **new** Tempo signing/admission; retain persisted obligations
and keys for explicit reconciliation. Never discard an uncertain channel or
replace its signed transaction identity. Settlement is explicitly invoked, with
no background timer, bridge, mainnet or advertiser wallet onboarding added.
