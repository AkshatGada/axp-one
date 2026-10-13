# Account-owned Solana Devnet acceptance

On 2026-10-13, one isolated account-owned channel completed **deposit → rendered
Sponsored cards → cumulative authorization → payout and refund** using the
public npm SDK, real confirmed accounts and Solana Devnet test tokens.

## Verified result

| Item | Result |
| --- | --- |
| Deposit | 0.020 test USDC |
| Accepted placements | Two, at 0.004 test USDC each |
| Authorized and paid | 0.008 test USDC |
| Unused deposit refunded | 0.012 test USDC |
| Recorded network fee and new-rent total | 0.004947600 test SOL; below the 0.020 cap |
| Native transaction fees | 0.000020 test SOL across open and close |
| Channel | Finalized and closed |
| Cleanup | Campaign enrollment off; temporary app key revoked and rejected; test owners signed out |

The payer and publisher were different confirmed users in different organizations.
Each proved control of a fresh disposable wallet through the resource-bound
Ed25519 challenge. A foreign owner could not read the campaign's wallet binding.
Frozen terms explicitly preserve the token's six decimals through the native
adapter; the fixture regression now asserts this field too.

The installed `@axp001/publisher-sdk@0.2.1` requested ads from the actual isolated
account API. Its browser helper inserted exact approved plain text and a visible
Sponsored label **below** an independent fixture answer. Both acknowledgements
created one charge each, and read-only delivery lookups recovered the same charges.
The payer authorized cumulative totals of 4,000 then 8,000 base units. Both parties
signed the final close. Independent finalized RPC reads verified the native
program, fees, payer refund, publisher payout and closed channel account.

## Inspect the evidence without signing

The [screened record](../../artifacts/accounts/devnet-acceptance.json) contains
public identifiers and transaction signatures, not secrets or signed wire payloads.

```sh
node scripts/accounts/verify-devnet.mjs
```

This command only reads Solana Devnet. It verifies finalized signatures, slots,
native-program involvement, token deltas, fees, conserved deposit and account closure.
UI observations, identity checks and credential cleanup are acceptance observations,
not facts inferred from the chain.

## Exact scope

Execution used an **isolated local account runtime**, real dedicated Supabase
profiles and the existing pinned native SDK. Ad decisions and the independent
answer were explicit fixtures; there were no paid model calls. Wallet signatures
came from disposable test keys, not a browser wallet extension. This is not a
hosted production-payment or real-money claim.

Only that isolated process enabled broadcasts. A live read after settlement
confirmed axp.one still uses synthetic accounting with broadcasts disabled.
Production configuration, landing page and shared-demo files were not changed.

A separately approved bootstrap transfer supplied 0.015 test SOL from an older
disposable Devnet sponsor to the fresh payer. Its 0.000005 test-SOL fee was below
its separate 0.000010 cap. The sponsor was not installed as an account signer,
and existing demo channels/configuration were not reused.

An intermittent profile-provider failure on the second request was reconciled
with its original stable turn ID. A read-only lookup confirmed no opportunity
existed before retry; no duplicate charge or replacement financial transaction
was created.
