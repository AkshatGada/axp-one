# AXP connected product journey

AXP connects an advertiser's approved campaign with an independently owned AI
app, a disclosed placement and matching receipt-linked reports. The account
console is deployed at [axp.one/account](https://axp.one/account/), separately
from the public shared dashboard and example chat.

## Advertiser

- Sign in and save a business profile within an owned organization.
- Save a versioned campaign, approved creative, eligible context and bid/budget limits.
- Approve the exact version and explicitly enable serving; editing requires reapproval.
- Inspect private saved activity, accepted charges and matching receipts; pause serving.

## AI app

- Save an app profile with supported origin/category restrictions.
- Issue and manage its scoped server credential; keep the credential out of browsers.
- Request through `/api/accounts/sdk` alongside the app's independent answer.
- Render the approved Sponsored card below that answer and acknowledge its insertion.
- Inspect app-scoped receipts/earnings and recover saved outcomes without another purchase.

## Verified behavior

Separate-owner local and hosted acceptance exercised the connected flow, resource
persistence, exact approval, isolation, scoped credentials, accepted delivery and
matching reports. Duplicate/restart recovery preserves the original charge.
No-fill leaves the answer usable. Invalid disclosure, foreign resources and
revoked/wrong-app credentials are rejected.

Account serving uses synthetic accounting with broadcasts disabled. Hosted wallet
bindings verify exact cryptographic ownership and persistence without payment.
Recorded Solana and Tempo testnet settlements are distinct identified runs, not
account cash payouts. Participant wallet-extension prompts and an account-owned
funded lifecycle have separate acceptance scope.

## Review resources

- [Reviewer guide and source map](REVIEWER_GUIDE.md)
- [Verification matrix and executable checks](VERIFICATION.md)
- [Hosted account/SDK acceptance](accounts/HOSTED_ACCOUNT_ACCEPTANCE.md)
- [Recovery and concurrency verification](accounts/ACCOUNT_CONCURRENCY_VERIFICATION.md)
- [Current release](accounts/STATUS.md), [contracts](accounts/CONTRACTS.md) and [architecture](ARCHITECTURE.md)

The guides identify implemented behavior and evidence scope so reviewers can
reproduce and assess the connected product.
