# Account network reviewer guide

AXP's signed-in advertiser and AI-app flows share an exchange while retaining
separate ownership and authority. Advertisers approve exact campaign versions;
apps use scoped server credentials and render a labelled Sponsored card below
their independent answer. The accepted receipt reconciles both owners' reports.

Start with the [technical reviewer guide](../REVIEWER_GUIDE.md) and
[verification matrix](../VERIFICATION.md), which include the source/test map and
the non-spending `npm run verify:review` command.

## Detailed account documentation

| Topic | Guide |
| --- | --- |
| Identity, sessions and API behavior | [Contracts](CONTRACTS.md) |
| Dedicated Supabase PostgreSQL and RLS | [Database verification](SUPABASE_DATABASE_RESULT.md) |
| Versioned campaigns and app credentials | [Resource integration](RESOURCE_OPERATOR_GUIDE.md) |
| Inventory, auctions and receipts | [Serving integration](SHARED_SERVING_RUNBOOK.md) |
| Own-wallet proof and immutable financial records | [Finance architecture](FINANCE_CLOUD_ACCEPTANCE.md) |
| Native channel interfaces | [Payment integration](ACCOUNT_PAYMENTS_RUNBOOK.md) |
| Real hosted account/SDK journey | [Hosted acceptance](HOSTED_ACCOUNT_ACCEPTANCE.md) |
| Concurrent reads and receipt recovery | [Recovery verification](ACCOUNT_CONCURRENCY_VERIFICATION.md) |
| Live release scope | [Status](STATUS.md) |

Accounts use synthetic accounting with broadcasts disabled; historical testnet
settlements remain separately identified evidence. ContextHint supplies screened
advertising intelligence and a distribution foundation, not automatically enrolled
AXP advertisers or AXP-only traction. See the verification matrix for the precise
scope of wallet, model, delivery and settlement checks.
