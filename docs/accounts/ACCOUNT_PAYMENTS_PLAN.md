# Account-owned funding and app payout bindings

12 October 2026. Worktree `codex/account-owned-network`. This is an additive
account-payment slice, not permission to fund, deploy or modify Supabase.

## Decisions and protected scope

The user chose **own-wallet signatures**, not operator-managed demo wallets.
Sign-in authenticates a person; an SDK key authenticates an app server; a wallet
signature proves control of a particular address. None substitutes for another.
Start with Solana Devnet USDC. Tempo remains explicitly unavailable for this
own-wallet path until its external-signature adapter is implemented and tested.
Existing Tempo/Solana demo workers and all landing/demo files remain untouched.
No private wallet keys, automatic top-ups, new models or native transactions in
this build's acceptance. Tests inject signers/transports; report them as fixtures.

## Phases and gates

1. **Freeze contracts.** Document authority, identities, persistence and states.
2. **Wallet ownership.** Expiring, one-use, origin/account/org/resource/network/
   purpose-bound challenges; verify Solana Ed25519 signatures. Advertiser funding
   and app payout proofs are separate. A profile payout declaration is not proof.
3. **Freeze channel terms.** One campaign version/app/payer/payout binding, unique
   opening salt, deposit/cap/fee bounds and exact terms hash. Both sides can read
   their own binding; only their respective wallet can provide its signature.
   Old channels never follow profile edits, new wallet proofs or new versions.
4. **External native signing.** Prepare/simulate exact pinned native messages,
   verify submitted wallet signatures against saved bytes, persist before any
   broadcast, reconcile unknown attempts without replacement. Payer signs open
   and cumulative vouchers. Cooperative close requires payer fee signature and
   app payout-wallet signature; browser/SDK never assigns a charge amount.
5. **Serving connection.** Separate native-account namespace; finalized funded
   bindings only. Accepted native ledger charges determine cumulative voucher
   amounts. Synthetic history cannot become native spending. Preserve shared
   campaign caps across apps and version changes; no payout replenishes a cap.
6. **Acceptance and rollout gates.** Two advertisers/two apps, foreign access,
   stale/replayed proofs, changed payees, restart, unknown/open/close, duplicate
   deliveries, zero-spend refund, aggregate caps and honest capabilities. Run
   repository regressions and one fresh review. Cloud migration, wallet/browser
   acceptance, hosted native acceptance, merge and deployment remain separate
   gates with bounded authorization.

## Frozen implementation interfaces

Backend financial repository (Supabase in real mode, SQLite explicit fixture):
`get(key)`, `create(key, value)`, `cas(key, revision, value)`,
`list(kind, resourceId)` -> records `{key,revision,value}`. Values have immutable
`kind,organizationId,ownerId,resourceId`; channels also bind counterparty app org
and owner. Fixed service-role-only RPC, bounded records/listing, compare-and-set.
No public table reads/writes, no raw secret/voucher projection. Service always
checks current authenticated ownership before repository access.

Native external transport:
`prepareOpen()`, `acceptSignedOpen({plan,wireBase64})`,
`submitOpen({plan,signed})`, `lookupOpen({plan,signed})`,
`reserveDelivery({channel,charge})`,
`prepareVoucher({channel,intent})` -> unsigned native payload/message,
`acceptSignedVoucher({prepared,signature})` -> verified native voucher,
`commitVoucher(input)`, `lookupCommit(input)`,
`prepareClose({channel,finalVoucher,watermark})`,
`acceptSignedClose({plan,wireBase64})`, `submitClose`, `lookupClose`, `close`.
Never load `walletPath` or call the old transport's signing methods. Validate
exact message, every required signature, frozen payer/payee and bounded fees.

Owner API extends `/api/accounts`, same session/CSRF boundary:
`POST /organizations/:org/(campaigns/:id|apps/:id)/wallet/challenge`
`POST .../wallet/verify`; `GET .../wallet`.
Campaign `POST .../funding` freezes terms using an enabled app payout route;
`GET .../channels` and app `GET .../channels` return sanitized bindings.
Channel operations are owner-authorized and use saved plans/ledger totals only;
unsigned signing payloads belong only to the appropriate authenticated signer,
not SDK credentials. Public SDK receives channel identity/status, not vouchers.
All money is canonical integer base units; deposits, reservations, accepted,
authorized, paid, refunded, fees and rent are separate.

## Ownership

Main: wallet-proof validation, owner API, service/serving integration, rollout
checklist and verification. Sol6.1-high builder: new financial repository,
additive SQL/rollback tests, no existing migrations. Sol6.1-high builder: new
external Solana transport and targeted tests, no old payment adapter edits.
Fresh reviewer: substantive authority, payment correctness and claimed readiness.
