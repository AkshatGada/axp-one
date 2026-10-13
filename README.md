# AXP — Advertising for conversational AI

AXP connects advertisers with AI apps at the moment a person asks what to buy.
Advertisers approve campaigns and set limits; advertiser agents evaluate relevant
conversations, and a deterministic first-price auction awards one clearly
labelled **Sponsored** card below the app's independent answer.

**[Open AXP](https://axp.one) · [Sign in](https://axp.one/account/) ·
[Reviewer guide](docs/REVIEWER_GUIDE.md) · [Publisher SDK](packages/publisher-sdk/README.md)**

## Explore the product

| Entry point | Purpose |
| --- | --- |
| [Your account](https://axp.one/account/) | Personal profile, organization, owned campaigns, AI apps and server credentials |
| [Shared advertiser demo](https://axp.one/advertiser-dashboard/) | Explore campaign creation, review, controls and reporting without signing in |
| [Example AI chat](https://axp.one/publisher-demo/) | Independent answer, separate Sponsored card and inspectable auction/delivery evidence |
| [SDK guide](https://axp.one/sdk/) | Request → Render → Acknowledge from an app's own server and interface |
| [Recorded walkthrough](https://axp.one/demo/) | Product recording with captions and chapters |

The signed-in account and public demonstration have separate records and
authority. Account serving uses synthetic credits; account transaction broadcasts
are disabled. Recorded Solana Devnet/test-USDC and Tempo Testnet/test-PathUSD
settlements are separately identified evidence, not customer cash balances.

## One connected advertiser-to-app journey

1. **Create and approve.** An advertiser saves its business and campaign, chooses
   eligible conversations, sets bid/budget limits and approves the exact version.
2. **Connect an app.** An AI-app owner saves its profile and restrictions, then
   issues a scoped credential kept only on its server.
3. **Evaluate and auction.** Eligible advertiser agents judge fit using authored
   hints and screened ContextHint evidence. Deterministic rules enforce bids,
   limits, rail compatibility and winner selection.
4. **Render and acknowledge.** The app keeps its own answer model and renders
   the approved Sponsored card below the answer. Its observed insertion is
   acknowledged against the original award and delivery token.
5. **Reconcile.** The same accepted receipt appears in the advertiser's spending
   and the app's earnings report. Stable identities and recovery lookups prevent
   a repeated acknowledgement from becoming another charge.

Signed-in operations use `/api/accounts`; app integrations use
`/api/accounts/sdk`. The public shared demonstration uses `/api/product`.
Creating an account grants no access to another owner's resources or to the
shared demonstration's wallets and records.

## Built into the exchange

| Component | Implementation |
| --- | --- |
| Identity and persistence | Dedicated Supabase Auth, PostgreSQL profiles/resources and ownership checks |
| Campaign control | Versioned drafts, exact-version approval, eligibility, bid/budget caps and explicit serving controls |
| App integration | Scoped, expiring, rotatable/revocable server credentials; ESM/browser/optional React SDK |
| Auction | Off-chain deterministic first-price auction over validated advertiser-agent decisions |
| Delivery | Award-bound Sponsored rendering, accepted receipts, duplicate protection and saved-result recovery |
| Reporting | Private receipt-linked advertiser spending and AI-app earnings with outcome provenance |
| Payment architecture | Testnet channels, cumulative off-chain authorizations and payout/refund reconciliation |
| Hosted durability | Encrypted private snapshots, fenced writers and read-only committed-result recovery |

Jev evaluates advertising fit; it never controls monetary authority or keys.
DeepSeek generates only the example chat's independent answer. Integrating apps
keep their own model. No-fill and ad errors leave the answer usable.

### Payment channels

Solana Devnet channels collateralize test USDC, accumulate accepted charges in
off-chain cumulative vouchers, then settle the earned amount and return unused
collateral. Tempo Testnet uses Sessions v2 and test PathUSD, including payout of
the earned delta while the same channel stays open. Currencies and obligations
remain separate.

Account-owned Solana funding/payee bindings and exact wallet-control proofs are
implemented. Hosted acceptance verifies cryptographic ownership and persistence
without moving funds. A separate [isolated account-owned Solana run](docs/accounts/DEVNET_ACCEPTANCE.md)
completed deposit, accepted delivery, cumulative authorization, payout and refund
using disposable test signers and fixture ad decisions/answer. It does not enable
production payments or establish participant wallet-extension signing.
See the [verification matrix](docs/VERIFICATION.md).

## Evidence reviewers can inspect

| Evidence | Result | Read more |
| --- | --- | --- |
| Hosted account/SDK acceptance | Separate confirmed owners, standalone consumer, one actual Jev evaluation, accepted synthetic receipt and matching reports | [Account acceptance](docs/accounts/HOSTED_ACCOUNT_ACCEPTANCE.md) |
| Hosted recovery | Saved receipt/signature recovery, owner/app isolation, key revocation and sign-out without a new auction | [Recovery verification](docs/accounts/ACCOUNT_CONCURRENCY_VERIFICATION.md) |
| Account-owned Solana Devnet lifecycle | One isolated channel, two placements; 0.020 test USDC deposited, 0.008 paid, 0.012 refunded; finalized and closed | [Acceptance and read-only verifier](docs/accounts/DEVNET_ACCEPTANCE.md) |
| Public publisher SDK | Version 0.2.1 on npm; 47 SDK checks, credential-free installation and registry integrity verified | [Release verification](docs/sdk-cleanroom/NPM_RELEASE.md) |
| Solana Devnet measured run | 125 funded channels, 250 verified transactions, 824 accepted deliveries; 6.25 test USDC deposited, 1.236 paid, 5.014 refunded | [Method and measured scope](BENCHMARK.md) |
| Tempo isolated lifecycle | Two channels, six deliveries, five finalized transactions; 0.10 test PathUSD deposited, 0.018 paid, 0.082 refunded | [Lifecycle and public transactions](docs/product/TEMPO_VERIFICATION.md) |
| Local accounting measurement | 1,052,672 fixture voucher updates across 16,448 simulated channels | [Fixture result](artifacts/network-scale/offline-million.json) |

These are distinct executions. Fixture volume is local accounting evidence, not
chain throughput. A receipt confirms accepted app-reported insertion, not human
attention, clicks, conversions or finalized payment. Benchmark methodology retains
its original denominators and outcomes.

## Reproduce without accounts, model keys or funds

Use Node.js **22.18+** and the committed pnpm workspace lockfile:

```sh
git clone https://github.com/AkshatGada/axp-one.git
cd axp-one
pnpm install --frozen-lockfile --ignore-scripts
npm run verify:review
```

The review command runs repository tests, customer-interface component tests,
both UI typechecks, generated SDK parity, documentation links and repository
hygiene. It uses fixture transports and loopback HTTP without loading the
reviewer's provider credentials or provisioning cloud services. Optional
native-toolchain tests identify their prerequisites explicitly.

Replay preserved evidence independently of frontend installation:

```sh
npm run demo:v3:replay
# Open http://127.0.0.1:8794
node scripts/demo/v3-replay-check.mjs artifacts/v3/replay
```

For development, follow [standalone setup](docs/STANDALONE_SETUP.md).
For AI-app installation, use `npm install @axp001/publisher-sdk@0.2.1`.
The [published SDK](https://www.npmjs.com/package/@axp001/publisher-sdk) includes
ESM, browser helpers and an optional React adapter; follow its
[integration guide](packages/publisher-sdk/README.md).

## ContextHint and distribution

[ContextHint](https://contexthint.com) is our existing advertising-intelligence
product for ChatGPT ads and AXP's distribution starting point. A screened,
versioned snapshot supplies observed examples, embeddings and inferred context
for advertiser decisions. Advertiser-authored hints remain a separate input.
ContextHint usage is attributed to ContextHint, not presented as AXP network
enrollment or revenue. AXP does not claim ChatGPT auction access or measured
targeting lift.

## Technical documentation

- [Reviewer guide and code map](docs/REVIEWER_GUIDE.md)
- [Verification matrix and reproducible commands](docs/VERIFICATION.md)
- [Architecture](docs/ARCHITECTURE.md) and [page/API map](pages.md)
- [Account contracts](docs/accounts/CONTRACTS.md) and [database model](docs/accounts/SUPABASE_DATABASE_RESULT.md)
- [Campaign/app ownership](docs/accounts/RESOURCE_OPERATOR_GUIDE.md) and [shared account serving](docs/accounts/SHARED_SERVING_RUNBOOK.md)
- [Own-wallet finance](docs/accounts/FINANCE_CLOUD_ACCEPTANCE.md) and [payment interfaces](docs/accounts/ACCOUNT_PAYMENTS_RUNBOOK.md)
- [SDK integration](packages/publisher-sdk/README.md) and [settlement-rail contracts](docs/product/TEMPO_INTERFACE.md)
- [Benchmark methodology](BENCHMARK.md) and [recorded delivery/settlement](artifacts/product/recorded-walkthrough/README.md)

Dated build plans and historical experiment reports retain their original
execution scope; the guides above provide current review entry points.
The SDK's MIT license covers the SDK only, not backend code or ContextHint data.
