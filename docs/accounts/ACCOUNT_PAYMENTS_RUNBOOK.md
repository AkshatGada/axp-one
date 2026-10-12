# Own-wallet payment integration

AXP binds an advertiser's approved campaign version to a verified AI-app payout
recipient. Supabase persists the financial records; the owners' wallets retain
signing control.

## Channel lifecycle

The advertiser proves its funding address and the app owner proves its payout
address. A wallet-control signature establishes address control only; it cannot
open a channel or authorize spending.

The backend freezes the approved campaign version, payer, app recipient, asset,
deposit and spend limits. The payer signs the pinned native MPP open transaction.
Finalized deposit evidence and explicit advertiser activation are both required
before that channel can serve.

Accepted publisher receipts create ledger charges. The backend prepares the next
cumulative voucher from saved accepted charges; the advertiser signs those exact
bytes. Verified native commit evidence advances the authorized total.

Cooperative closure uses both frozen owners' signatures, collected sequentially
over the same message. Settlement pays the app and refunds unused deposit to the
payer. Zero-spend closure uses the native no-voucher path. Closing creates no extra
charge.

## Configuration

Configure the repository's documented Supabase and durable-backend settings,
then select the account-native namespace:

```dotenv
AXP_ACCOUNT_SERVING_ENABLED=1
AXP_ACCOUNT_PAYMENTS_ENABLED=1
AXP_ACCOUNT_FINANCIAL_MODE=devnet
AXP_ACCOUNT_PAYMENT_BROADCAST_ENABLED=0
```

These are example configuration values, not an instruction to enable signing or
broadcasts in an existing environment. Broadcast remains off for ownership-only
verification. Enabling it is a separate explicit financial operating step.

The additive finance migration is applied to the dedicated AXP database; new
environments must provision it explicitly. Missing migration fails closed. The
real-provider path does not fall back to a fixture finance repository.

Account-native state uses `axp-account-network-native-v1`; synthetic account state
uses `axp-account-network-v1`. Neither falls back to the shared `/api/product`
demonstration. Start the isolated console with `npm run dev:accounts` after
installing the documented dependencies.

## Owner endpoints

All paths are relative to `/api/accounts`. Authenticated cookie sessions and
session-bound CSRF protect writes. Publisher SDK keys grant none of these powers.

| Endpoint | Input and behavior |
| --- | --- |
| Campaign/app `POST .../wallet/challenge` | `{address,network:'solana-devnet'}`; prepares an exact ownership message |
| Campaign/app `POST .../wallet/verify` | `{challengeId,signature}`; base58 Ed25519 over the UTF-8 challenge |
| Campaign/app `GET .../wallet` | Sanitized verified binding, or null |
| Campaign `POST .../funding` | `{expectedVersion,appId,depositBaseUnits}`; freezes terms from approved content and verified addresses |
| Campaign/app `GET .../channels` | Resource-owned public channel summaries |
| Channel `POST .../serving` | `{expectedVersion,enabled}`; payer-only activation/pause |
| Channel `POST .../open/prepare` | Prepares unsigned opening transaction |
| Channel `POST .../open/sign` | `{wireBase64}`; validates the signed saved opening message |
| Channel `POST .../voucher/prepare` | Derives the next cumulative authorization from saved accepted charges |
| Channel `POST .../voucher/sign` | `{signature}`; validates the payer's exact voucher signature |
| Channel `POST .../close/prepare` | Prepares closure after accepted obligations are authorized |
| Channel `POST .../close/sign` | `{wireBase64}`; collects and validates each frozen owner's signature |
| Channel `POST .../reconcile` | `{}`; checks the saved transaction/commit without a replacement purchase |

Campaign/app resources use
`/organizations/:org/(campaigns|apps)/:resource`.
Channel actions use `/organizations/:org/channels/:channel`.

## Signing and recovery behavior

Preparation responses expose only required signing bytes, public signer
addresses, terms hash and estimated fee/rent. Public reports exclude private
voucher payloads. Wallet rejection is not success; pending/submitted is not finality.

Interrupted unsigned preparation can resume the same obligation. Expired unsigned
plans can refresh while retaining prior partials/history. Signed or possibly
submitted attempts reconcile against saved identities rather than being replaced
because an RPC acknowledgement is missing.

Hosted snapshot recovery restores the saved finalized-open state and exact saved
vouchers in cumulative order. It does not request a new signature or increase
a charge.

## Operating model

- Own-wallet account support targets Solana Devnet/test USDC. Shared-demo Tempo
  evidence is separate; own-wallet Tempo is unavailable in this integration.
- Each cumulative increment requires the advertiser's wallet signature. There is
  no background delegated signer; cooperative closure requires both frozen parties.
- A campaign supports up to eight app bindings. Deposits are bounded to 200,000
  USDC base units, campaign charge caps to 100,000, and maximum bids to 4,000.
- Aggregate fee and newly allocated rent are capped at 20,000,000 lamports per
  campaign across its channels; no automatic top-ups or replacement channels.
- One immutable channel binds each campaign/app pair. Edits stop old-version new
  serving, not valid already-issued delivery obligations.
- A different funded campaign version uses a new campaign. A changed app recipient
  uses a distinct app identity; later profiles/proofs cannot redirect old funds.
- Closure is cooperative. Account-facing unilateral timeout/force exit and
  automatic replacement of signed failed/expired attempts are not provided.
- Voucher recovery cannot create absent authorization after native expiry;
  reconciliation preserves the obligation and stops further spending.

## Verification

[Finance verification](FINANCE_CLOUD_ACCEPTANCE.md) records the applied Supabase
schema, actual backend access and 55 focused passing checks. Payment transport
outcomes in automated account integration tests are injected fixtures.

Real user-selected wallet prompts and account-owned funded settlement have their
own acceptance steps in the [release checklist](FINAL_ROLLOUT_CHECKLIST.md).
Cryptographic format tests and historical shared-demo settlements do not replace
those checks.
