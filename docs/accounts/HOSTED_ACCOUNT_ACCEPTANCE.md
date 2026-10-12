# Hosted account and SDK acceptance

On 12 October 2026, separate email-confirmed advertiser and AI-app accounts
completed an isolated hosted serving journey using the packaged
`@axp001/publisher-sdk@0.2.1`. Supabase Auth supplied identity; dedicated Supabase
PostgreSQL tables held owner-scoped profiles, campaigns, credentials and wallet
bindings. Encrypted private hosted snapshots held sessions and the serving ledger.

The run used synthetic delivery accounting with broadcasts explicitly disabled.
No native funds moved. The landing page and existing shared demo were unchanged.

## Exercised account journey

1. Both owners confirmed actual account emails and signed in. Profiles,
   organizations and owned resources persisted through independent requests,
   browser reloads and sign-out/sign-in. Signed-out resource access was denied.
2. The advertiser created a campaign, approved its exact version and explicitly
   enrolled it. Editing declarations withdrew approval and required reapproval.
3. The AI-app owner created an app and issued its server-only credential. Another
   organization could not access the campaign or manage the app's credentials.
4. A separate agent integrated the SDK tarball in a standalone chat consumer
   using package documentation, without backend implementation access. Its
   independent answer was an explicitly labelled deterministic fixture, not a
   paid organic-model response.
5. An eligible hosted request produced an actual Jev evaluation and bid. The
   browser SDK rendered the approved card below the answer with the Sponsored
   label; its render acknowledgement produced an accepted receipt.
6. Advertiser and AI-app reports reconciled to the same delivery and amount.
   A sibling app had no deliveries. Restoring the consumer after a server restart
   retained the answer, card and receipt; explicit SDK lookups recovered the
   accepted result without creating another opportunity.

## Reconciliation and isolation

| Observation | Result |
| --- | --- |
| Distinct opportunities | 2: one eligibility no-fill, one accepted delivery |
| Paid model evaluations admitted | 1 completed Jev evaluation |
| Accepted receipts and charges | 1 each |
| Synthetic accepted amount | 3,000 six-decimal base units; not a native USDC payment |
| Stable-input opportunity replay | Same award; no new model admission |
| Changed input for an existing turn | Rejected |
| Duplicate render acknowledgement | Same charge; no additional charge |
| Another app's award and saved-turn access | Denied or not found |
| Incorrect delivery token | Rejected |
| Browser-origin use of a server credential | Rejected |
| Receipt signature | Ed25519 verification passed; tampering was rejected |
| SDK key rotation | Previous key rejected; replacement retained its app scope |
| SDK key revocation | Revoked keys rejected |

The no-fill case excluded an undeclared required capability before calling Jev.
The consumer's answer remained usable. Provider-failure and response-loss paths
were exercised separately with injected offline transports; they are not counted
as hosted provider-failure evidence. Seventeen independent consumer checks covered
receipt binding, recovery, ownership, local request validation and durable bounded
admission.

## Wallet ownership

Existing disposable Solana test keys signed exact account-, resource-, origin-,
nonce- and expiry-bound ownership messages. Hosted advertiser funding and app
payout bindings persisted through Supabase and sign-out/sign-in. Tampered proofs
and cross-owner submissions were rejected; exact valid retries were idempotent.
The account UI reloaded the saved payout proof while showing broadcasts disabled.

This verifies hosted cryptographic ownership, not browser-extension connection
or wallet-prompt acceptance. No native channel, deposit, cumulative payment
authorization, settlement, payout or refund was exercised in this run.

## Release boundary

This is acceptance of one account-owned serving path, not a load test or a
multi-advertiser pricing benchmark. Hosted workspace contention can return a busy
response; concurrent serving and recovery acceptance remains a release gate.
Never turn an ambiguous request into an automatic fresh opportunity or payment.

Real extension-wallet prompts and a separately authorized funded testnet
lifecycle remain distinct acceptance gates. A delivery receipt establishes an
accepted app-reported insertion, not human attention or finalized payment.
See [the release verification checklist](FINAL_ROLLOUT_CHECKLIST.md).

Credential values, test identities, infrastructure access and raw operator
evidence are maintained outside the public repository. The SDK artifact is
packaged; this acceptance does not claim npm publication or production activation.
The acceptance campaign was disabled and its temporary SDK credentials revoked
after verification, preserving the saved receipt and account records.
