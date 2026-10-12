# AXP reviewer guide

AXP is an advertising network for the agentic internet. Advertisers describe
their products and intended conversations; AI apps request a separate Sponsored
placement while retaining control of their independent answer.

## Start with the product

The two sides of the network are connected through account-owned resources:

1. An advertiser signs in, creates a business profile and saves a campaign.
2. The advertiser approves an exact campaign version and sets bid and spend limits.
3. An AI-app owner creates an app profile and issues a scoped server-side SDK key.
4. The app requests a placement through the account SDK endpoint.
5. Eligible advertiser agents evaluate the opportunity; deterministic rules
   enforce capabilities, budgets and auction selection.
6. The publisher renders a separate Sponsored card and acknowledges the exact
   insertion. An accepted receipt links delivery to one charge.

The organic answer path receives no advertiser material. Historical ContextHint
observations inform evidence packets, not fictional product capabilities.

## Technical reading order

| Topic | Documentation |
| --- | --- |
| Account identity and API contracts | [Accounts contracts](CONTRACTS.md) |
| Supabase profile persistence | [Database verification](SUPABASE_DATABASE_RESULT.md) |
| Campaign ownership and app credentials | [Resource integration](RESOURCE_OPERATOR_GUIDE.md) |
| Shared auctions and publisher receipts | [Serving integration](SHARED_SERVING_RUNBOOK.md) |
| Own-wallet financial architecture | [Finance architecture and verification](FINANCE_CLOUD_ACCEPTANCE.md) |
| Native channel and voucher interfaces | [Payment integration](ACCOUNT_PAYMENTS_RUNBOOK.md) |
| Functional release checks | [Release verification checklist](FINAL_ROLLOUT_CHECKLIST.md) |
| Connected account/SDK acceptance | [Local connected journey](CONNECTED_JOURNEY_RESULT.md) |
| Standalone repository setup | [Setup guide](../STANDALONE_SETUP.md) |

## What to inspect

- Owner-scoped campaigns and app credentials, including cross-account denial.
- Approved-version identity, mandatory capabilities and deterministic budget caps.
- Actual agent decisions distinguished from exclusions and provider unavailability.
- A Sponsored card below the independent answer, with exact delivery acknowledgement.
- Opportunity, decision, award, receipt and charge correlation.
- Duplicate delivery and restart behavior without a second charge.
- Separation of synthetic accounting, historical testnet proof and own-wallet state.
- Supabase migrations, explicit repository boundaries and reproducible tests.

## Financial evidence

Cumulative authorizations aggregate accepted delivery charges; settlement pays
the app and returns unused deposit. Authorizing a wallet-control message does
not deposit funds or grant background spending authority.

The dedicated finance migration and actual Supabase backend access are verified.
The latest focused account-finance checks pass **55 automated tests**. Their
[verification report](FINANCE_CLOUD_ACCEPTANCE.md) distinguishes actual cloud
checks, cryptographic fixtures and the separate real-wallet/funded acceptance steps.

Historical Solana and Tempo records are evidence for their identified runs and
rails. They are not payment for a different run or proof that every account-facing
flow is deployed. Receipts establish accepted insertion, not human attention or
conversion lift.

## Product and evidence scope

The account-owned network implementation is an isolated source candidate.
Public-product behavior must be assessed against the identified deployed revision.
Real account-owned wallet-extension and funded lifecycle acceptance remain
separate from the verified migration and offline tests.

ContextHint is an existing intelligence product and AXP's distribution foundation.
Its observed advertisers, creatives, placements and usage figures describe that
product/library; they are not AXP network enrollment or independently measured
AXP advertiser revenue.
