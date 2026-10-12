# Account concurrency and navigation verification

## Account presentation and entry points

The 13 October local presentation follow-up makes sign-in accessible from the
public desktop navigation and mobile menu, with a separate account link in the
shared dashboard. The existing demo route is not converted into a private account.
Account pages retain the same identity, ownership, campaign, SDK and finance APIs.

Sign-in leads with the form and a short role introduction. On narrow screens the
role list is omitted, while the financial-mode notice remains visible. Service
configuration, SDK examples, supported categories, receipt explanations and wallet
terminology expand on demand. Missing integration requirements, unsupported-rule
warnings, exact signature reviews and transaction-broadcast restrictions remain
visible. Saved service-status section links open the disclosure before scrolling.

Verification: 79 focused account/dashboard tests passed, including four new
presentation/recovery guards. Product and marketing typechecks and static exports
passed. Browser checks covered sign-in layout at desktop and 390-pixel widths,
mobile-menu account navigation, app setup disclosures, reports and account links.
Browser data in the local presentation check is explicitly injected fixture data;
it is not another Supabase signup, wallet-extension or funded acceptance run.

Busy session responses have an explicit Refresh account instruction. Sign-in and
other mutations are not automatically replayed. No backend, migration, auction,
publisher chat, wallet-signing behavior or recorded evidence changed in this pass.

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

## Main-checkout integration regression

On 13 October 2026, release checkpoint `40405ed` was integrated with the
main checkout's newer landing checkpoint `44a1f37`. The merge required no
conflict resolution. Landing assets/source, dashboard and publisher-demo source,
shared product/hosted implementation and recorded artifacts were unchanged.
Existing untracked files were not included in the merge.

The exact staged runtime was tested in a disposable copy without live credentials:

- Repository suite: 806 passed, 23 optional skipped, zero failed on the final run.
- Account/dashboard/chat component checks: 86 passed, zero failed.
- Recorded explorer projection checks: 35 passed after generating the required
  public replay projection from committed evidence; no new execution was made.
- UI typecheck and static export passed. Referenced assets were verified for
  account, advertiser dashboard, publisher chat and SDK integration guide.
- Generated React SDK adapter parity, staged whitespace and repository hygiene
  checks passed.

The first repository run hit the existing benchmark limiter's wall-clock timing
assertion; its isolated recheck and complete suite rerun passed without changes
to benchmark, demo or payment code. This is regression evidence, not a new hosted
