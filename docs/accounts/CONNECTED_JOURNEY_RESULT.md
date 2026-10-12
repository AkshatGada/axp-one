# Account-owned connected journey

Verified locally: 12 October 2026. Scope: account-network source candidate,
not a deployment, fresh Supabase/signup acceptance or native settlement claim.

## Implemented

- An owner-only app integration endpoint projects active credential, restriction,
  catalogue/inventory, provider allowance, funding and broadcast readiness.
  It uses the same SDK configuration without sending an SDK secret from a browser.
- Generated server instructions cover synthetic, Devnet and unavailable modes;
  they no longer incorrectly promise synthetic-only operation.
- Private activity reports derive from saved decisions, auctions and receipts.
  They separate bid/skip/abstention/unavailability, policy exclusion, win/loss and
  accepted/failed/expired/reserved delivery. A bid invalidated by a subsequent
  pause remains an excluded bid, not a fictitious uncalled or negative decision.
- Reports return the latest 100 entries with an all-matching count. Durable event
  sequence preserves chronology after hosted-style ID-ordered snapshot restoration.
- Existing per-network accepted/reserved totals and finance interfaces remain the
  money source of truth. No second ledger, migration or payment rail was introduced.

## Connected verification

The HTTP test starts with distinct advertiser and app identities and no resources.
It creates the business/campaign and app/key, rejects enrollment before approval,
approves and enables the exact saved version, then uses the ordinary publisher SDK
over loopback HTTP. An invalid disclosure acknowledgement creates no charge; the
accepted receipt appears with the same hash and amount in both owners' reports.
Restart/duplicate recovery preserves the receipt and call count. Revocation and
sign-out revoke their respective authorities. Cross-owner requests return 404.

Browser acceptance uses a separate local chat fixture with the unmodified browser
SDK. Its deterministic organic function receives only the question. With explicit
question-sharing consent, the SDK inserts an exact approved Sponsored card below
the answer and acknowledges a visible DOM observation. Same-turn retry and repeat
acknowledgement reuse the receipt; mobile-only no-fill removes the card and leaves
the independent answer usable. The app report shows three opportunities and two
accepted synthetic receipts (one seeded plus one browser delivery), not extra
charges from retries. Both owners' account views and sign-out were exercised.

Fixtures explicitly identify synthetic accounting and injected model provenance.
They are not evidence of new actual Jev calls, human attention or paid earnings.

## Reproduce without spending

```sh
node --test tests/accounts-connected-journey.test.mjs tests/accounts-shared-serving.test.mjs tests/accounts-serving-client.test.mjs
npm test
node scripts/setup/check-repository.mjs
# From apps/product-ui:
node node_modules/typescript/bin/tsc --noEmit
```

The browser fixture is gated and loads no environment/provider keys:

```sh
AXP_ACCOUNT_BROWSER_FIXTURE=1 node tests/support/accounts-network-browser.mjs
```

Open loopback port 3503 at `/account/` and `/fixture-chat/`. Fixture identities and
password are documented in `tests/support/account-network-fixture.mjs`; these
exist only in a disposable local database. Stop the launcher to remove that state.
The test-only chat proxy is never installed in production account routes.

Repository regression: **733 passed, 23 optional skipped, zero failed** (756 total).
UI TypeScript and repository hygiene checks pass. Frozen clean-room source
preservation checks also pass (three tests).

## Preserved and remaining

Landing-page/frontend-specialist sources, shared demonstrations, historical run
artifacts, recordings, payment transport and dependency locks are unchanged.
No cloud migration, provider spend, native signature, broadcast or funds movement
was performed in this slice. The existing Supabase repositories remain in place;
SQLite fixtures do not become a customer-data fallback.

Next gates: real participant wallet-extension ownership without spending;
separately authorized bounded funded acceptance; independent hosted SDK/account
acceptance; approved integration into the release candidate and submission assets.
Do not present this local synthetic journey as finalized account-owned payment.
See [essential release checklist](../SUBMISSION_CHECKLIST.md).
