# Account release verification

The account-owned network connects approved advertiser inventory to app-scoped
SDK requests, Sponsored delivery and matching private reports. Its live account
configuration uses synthetic accounting with broadcasts disabled.

## Exercised account contract

| Area | Verified behavior |
| --- | --- |
| Identity | Confirmed owners, sign-in, profiles and organizations, persistence and sign-out |
| Campaign control | Owner-only drafts, exact-version approval, edit invalidation and explicit serving controls |
| App integration | Profile restrictions, server-only key scope, rotation/revocation and independent SDK consumer |
| Delivery | Separate Sponsored insertion, exact acknowledgement and matched advertiser/app receipts |
| Isolation | Foreign resources, wrong app/token, browser-origin credential use and signed-out access rejected |
| Recovery | Stable original IDs, duplicate charge protection, saved-result reads during serving and restart recovery |
| Wallet binding | Exact cryptographic proof, resource/account binding, expiry, replay and hosted persistence |

## Reproduce

```sh
pnpm install --frozen-lockfile --ignore-scripts
npm run verify:review
```

The [verification matrix](../VERIFICATION.md) explains local test dependencies,
component checks, optional SQL fixtures and the scope of each evidence source.
The [hosted account acceptance](HOSTED_ACCOUNT_ACCEPTANCE.md) used separate
confirmed owners, an independent SDK consumer and one real Jev evaluation.
[Hosted recovery](ACCOUNT_CONCURRENCY_VERIFICATION.md) recovered its receipt
without another opportunity or acknowledgement.

## Financial interpretation

Own-wallet account interfaces target Solana Devnet/test USDC with frozen payer,
payee and channel terms, explicit payer authorization and cooperative closure.
Automated finance tests use injected native transports. Hosted ownership proof
does not itself establish participant wallet-extension prompts or a finalized
account-owned deposit/payout/refund lifecycle.

The separate [isolated account-owned Solana acceptance](DEVNET_ACCEPTANCE.md)
does establish its identified finalized lifecycle: 0.020 test USDC deposited,
0.008 paid and 0.012 refunded. It used real confirmed owners, the public SDK,
disposable signers and fixture decisions/answer in a local account runtime.
It does not activate hosted production payments or verify participant wallet
extension prompts. The [SDK release](../sdk-cleanroom/NPM_RELEASE.md) records
public npm publication, SDK-only MIT licensing and consumer/integrity checks.

Historical Solana and Tempo lifecycle records retain their own channel identities
and currency. A receipt establishes accepted insertion, not attention, conversion
or completed payment. Account synthetic earnings are not withdrawable cash.

See [live source status](STATUS.md), [finance verification](FINANCE_CLOUD_ACCEPTANCE.md)
and the [reviewer guide](../REVIEWER_GUIDE.md).
