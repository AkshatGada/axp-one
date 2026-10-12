# Account concurrency and navigation verification

Verified locally on 13 October 2026. These are injected offline transport and
browser-fixture results, not new paid provider or native settlement evidence.

## Account execution boundaries

SDK authentication is independent of the human-session writer. SDK configuration,
saved-opportunity/delivery recovery and private report projections read the latest
committed serving snapshot, including during an admitted auction. Readers cannot
start auctions, accept deliveries or invoke native finance through that projection.

Competing serving writes retain the existing fenced lease and return a busy
response. Explicit same-turn retry after completion/restart preserves the original
award and charge. Retained-lease fault injection verifies readable committed
outcomes and expiry recovery without another model admission. It does not establish
the cause of a previous hosted lease-release failure or unlimited concurrency.

Five regressions cover overlapping reads/auctions, independent logout, competing
apps with a shared campaign cap, credential/token isolation, and retained-lease
recovery. No shared-demo lease or payment transport implementation changed.

## Account navigation

Saved campaign, app receipt, wallet and settings section links restore their
owning view after reload. Unknown fragments do not select a different view.
Three focused navigation tests cover sidebar routes, all mapped section links
and unknown/nonlocal fragments.

The isolated browser fixture exercised advertiser pause/resume with reload,
independent app-owner access, an exact Sponsored insertion below the answer,
same-turn/duplicate receipt reuse and no-fill with the answer preserved. The app
report matched the browser receipt; no-fill and retries left its two synthetic
receipts and 8,000 accepted base units unchanged (one seeded, one browser delivery).
Both identities signed out. This is local fixture persistence, not a new Supabase
signup or browser-extension wallet acceptance run.

## Reproduce

```sh
node --test tests/accounts-hosted-concurrency.test.mjs
npm test
node scripts/setup/check-repository.mjs
# From apps/product-ui:
node --test src/components/accounts/*.test.ts src/components/accounts/*.test.mjs \
  src/components/advertiser-dashboard/*.test.mjs src/components/publisher-demo/*.test.mjs
node node_modules/typescript/bin/tsc --noEmit
node node_modules/next/dist/bin/next build
```

Repository verification: 806 passed, 23 optional skipped, zero failed.
Account/dashboard/chat component checks: 86 passed, zero failed.
UI typecheck and static export passed in an isolated copy. The account-only
Preview packager verified its referenced account assets and excluded landing and
demo pages. Local HTTP tests require loopback listener access.

## Hosted recovery followup

The isolated account Preview deployed runtime checkpoint `35d89e3` on 13 October
2026. Its served account JavaScript matched the verified static build exactly.
Shared demo and product API routes were absent from that account-only bundle;
their existing public deployment was unchanged.

Two existing Supabase owners signed in independently. Parallel SDK configuration,
saved-opportunity/delivery lookups and an owner report recovered the original
accepted receipt and verified its Ed25519 signature. Both reports still showed
one accepted receipt and 3,000 synthetic base units; the campaign remained paused.
Existing wallet ownership bindings persisted. Cross-owner access, a wrong delivery
token and browser-origin credential use were denied. The temporary same-app key
was revoked and confirmed rejected, and both verification sessions signed out.

No fresh opportunity or delivery acknowledgement was requested. The recorded
daily model admission counter remained 1, with zero added model calls, broadcasts
or funds movement. This verifies deployed read/recovery behavior, not a fresh
hosted auction, wallet-extension prompt or funded settlement. The held-auction
and retained-lease scenarios above remain offline fault-injection evidence.

Real extension prompts and separately authorized funded account-owned settlement
remain distinct release gates. See
[hosted acceptance](HOSTED_ACCOUNT_ACCEPTANCE.md) and
[release checklist](FINAL_ROLLOUT_CHECKLIST.md).
