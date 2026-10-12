# Own-wallet account payment slice

12 October 2026. Local isolated branch `codex/account-owned-network`.

## What this connects

An advertiser signs in, owns a saved/approved campaign, and proves a Solana
wallet address. An independently signed-in app owner proves its payout wallet.
The backend freezes a campaign-version/app channel with those addresses. A
wallet-control signature is explicitly **not** spending permission.

The payer signs the pinned native MPP open transaction, depositing test USDC.
Finalized chain evidence is required before the channel can serve. Funding does
not activate ads: the advertiser explicitly enables that channel as well as the
saved campaign's catalogue opt-in. Each app has its own fixed recipient binding;
the campaign cap is shared across all its app routes.

Accepted publisher receipts create ledger charges, not automatic signatures.
The backend prepares cumulative native voucher bytes from the next saved charge;
the advertiser's wallet signs those exact bytes. Only verified native commit
evidence advances authorized totals. No inference/model receives wallet tools.
There is **no delegated/background signer** in this version. The advertiser must
return to authorize outstanding deliveries; this interaction is a limited-pilot
constraint, not a claim of unattended large-scale buying.

Cooperative closure requires **both** owners: the payer pays the transaction fee
and the app payout wallet seals the channel. They can sign sequentially, in
either order. The service merges validated partial signatures over the same
saved message. Settlement pays the frozen app address and refunds the frozen
payer; zero-spend closure needs no fabricated zero voucher. Solana's current
account path closes the whole channel; it does not promise partial withdrawal.

## Configuration and approval gates

The existing ignored environment is intentionally left unchanged. It continues
to use the phase-4 synthetic account namespace. Do not paste keys into this doc.
To enable the new slice **after separately approving/applying its migration**:

```dotenv
AXP_ACCOUNT_SERVING_ENABLED=1
AXP_ACCOUNT_PAYMENTS_ENABLED=1
AXP_ACCOUNT_FINANCIAL_MODE=devnet
AXP_ACCOUNT_PAYMENT_BROADCAST_ENABLED=0
```

Existing dedicated AXP Supabase URL/publishable/backend catalogue configuration
is required. `supabase/migrations/20261012_axp_account_finance.sql` is additive,
backend-private RLS/ACL-guarded persistence. It is **authored**, not automatically
applied. Missing migration fails closed; SQLite is an explicit fixture only.
No secret/service key, session token, signed voucher or vector goes to a browser.

`npm run dev:accounts` uses the existing isolated account launcher. Financial
state uses `axp-account-network-native-v1`; phase-4 synthetic state remains
`axp-account-network-v1`. The shared `/api/product` demo is never a fallback.
Native SDK setup remains the repository's existing pinned SDK setup; no runtime
dependency on another checkout is added. Tests may explicitly use an already
installed SDK path for offline format checks, but that is not a product path.

Changing `AXP_ACCOUNT_PAYMENT_BROADCAST_ENABLED` to `1` is an operator release
decision and requires separately bounded live-test authority. This build did not
fund wallets, request airdrops, broadcast, call models, deploy, merge or push.
Do not silently turn an old payment-run approval into permission for this path.

## Owner API

All paths below are relative to `/api/accounts`; authenticated cookie sessions
and session-bound CSRF protect POSTs. App SDK keys grant **none** of these powers.

- Campaign/app `.../wallet/challenge`: `{address,network:'solana-devnet'}`.
- `.../wallet/verify`: `{challengeId,signature}`; signature is base58 Ed25519
  over the exact UTF-8 challenge. The origin/account/org/resource/purpose/address,
  nonce and five-minute expiry are bound. Replaying a successful proof does not
  renew its authority or overwrite a newer binding.
- `GET .../wallet`: sanitized current verified binding, or null.
- Campaign `POST .../funding`: `{expectedVersion,appId,depositBaseUnits}`.
  Uses approved content, verified payer and verified app route, never a submitted
  payee/private key. Returns frozen terms hash and public channel summary.
- Campaign/app `GET .../channels`: only channels belonging to that resource.
- `POST /organizations/:org/channels/:channel/serving`:
  `{expectedVersion,enabled}`. Payer owner only; current approved version and
  finalized funding required before enabling. Pause stops new bids, not valid
  already-issued delivery obligations.
- Channel `open/prepare` → `open/sign {wireBase64}`.
- Channel `voucher/prepare` → `voucher/sign {signature}`.
- Channel `close/prepare` → each party `close/sign {wireBase64}`.
- Channel `reconcile {}` looks up the **saved** signed attempt/commit. For hosted
  snapshot rollback it can restore finalized-open native state and replay the
  **exact saved signed vouchers** in their original cumulative order; it never
  requests another signature or increases a charge. Unknown transaction outcomes
  block another signature, purchase or replacement channel.

Preparation responses expose only the signing bytes/required public addresses,
terms hash and estimated fee/rent. Reports expose public transaction identities,
not private voucher bytes. Wallet rejection is not success. Pending/submitted
is not finalized. Interrupted unsigned preparation can explicitly resume the
same obligation. Expired unsigned transaction plans can refresh, retaining old
partials/history. A signed/possibly submitted transaction is never replaced by
that path. Do not recreate a channel to evade stored uncertainty.

## Current bounded limitations

- Solana Devnet test USDC only for **own-wallet** accounts. Existing Tempo demo
  support is unchanged; own-wallet Tempo returns unavailable, never a Solana alias.
- Up to eight app bindings per campaign; deposits up to 200,000 base units,
  campaign cap up to 100,000 and max bid 4,000, inherited resource bounds.
- Aggregate estimated/actual fee and new-rent cap is 20,000,000 lamports per
  campaign across its channels. No automatic top-ups or channel replacements.
- One immutable channel per campaign/app pair. Campaign edits stop old-version
  new serving; they cannot mutate funded terms. For a new funded version in this
  slice, create a separate campaign rather than redirect the existing channel.
- An app's native recipient cannot change once any channel binds it. Profile
  edits and later wallet proofs do not redirect old funds. A distinct app identity
  is required for a different native payout route in this first slice.
- Catalogue restrictions and historical-evidence caveats remain as documented in
  `SHARED_SERVING_RUNBOOK.md`. No human-attention/conversion claim is made.
- Cooperative closure is implemented; an account-facing unilateral timeout/force
  exit is not. Expired/failed signed transaction attempts stay blocked unless
  their exact outcome is verified. No automatic signed-attempt replacement or
  unsafe inference of nonexecution from an absent RPC result is implemented.
- If voucher recovery occurs after native expiry, it cannot create an absent
  authorization. Preserve the record and stop; bounded live acceptance must close
  within the frozen window. Deadline/force-exit UX is a remaining pilot gate.

## Acceptance

Run the repository and account-component tests, the isolated SQL acceptance and
the optional installed-pinned-SDK offline test. All payment transport outcomes in
account integration tests are **fixtures**, including fake finality and balances.
Real cryptographic signatures and pinned native format checks do not themselves
prove successful live settlement. See the result report for exact run evidence.

Next live gate: approve the dedicated-project migration, then a bounded browser/
Devnet acceptance with separate advertiser and app wallet owners, two independently
verified payees, real receipt-linked vouchers, positive/zero closure and exact
fee/refund reconciliation. Only afterward propose a frontend-safe merge and
hosted rollout. `FINAL_ROLLOUT_CHECKLIST.md` orders the remaining product work.
