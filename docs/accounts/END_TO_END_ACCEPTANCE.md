# Real account/profile acceptance — 12 October 2026

Executed against the dedicated AXP Supabase project through the loopback console
at `http://127.0.0.1:3495/account/`. This is actual Auth/PostgreSQL and browser
acceptance, not injected identity responses. No model calls or payments.

## Passed

1. Reused the human's confirmed, signed-in session; did not request/read a password.
2. Created one owned organization, `AXP Acceptance Test — 12 Oct 2026`.
3. Created `AXP Test Advertiser` with `https://advertiser.example.test/` and an
   explicit acceptance-test description, not a real enrolled advertiser.
4. Created `AXP Test Chat App` with `https://chat.example.test/`, allowed origins
   `https://chat.example.test` and `http://127.0.0.1:3495`, prohibited categories
   `gambling` and `alcohol`, and no payout declaration.
5. Reloaded: the same organization and app IDs, advertiser fields and saved app
   fields reappeared. The app was selected from its saved profile list.
6. Stopped and restarted the isolated server, then reloaded: the confirmed session
   and same saved profiles survived. No re-creation or additional signup occurred.
7. Read-only Supabase SQL independently confirmed both persisted profiles, their
   canonical URLs, origins/categories, matching organization bindings and null
   payout declaration.
8. Explicit Sign out returned `Signed out.`. After reload, the sign-in form was
   visible, advertiser/edit-app forms were absent and profiles required sign-in.
   No authenticated identity was silently restored.

The browser extension blocked direct navigation to the private organization API
URL during an optional post-sign-out probe. That navigation supplies no HTTP
authorization evidence. Actual browser acceptance is the sign-out/reload result;
server-side denial and session invalidation are additionally covered by API tests.

## Data and product boundary

The labelled test organization and profiles remain in the owner's Supabase
account for inspection. They were not deleted or presented as real advertisers,
publisher inventory or adoption. The human's personal display name is unchanged.
No SDK credential, campaign, wallet connection, payment or payout was created.
Profile declarations do not enable those separate capabilities.

Evidence screenshots were saved privately outside Git:
`profiles-persisted.png` and `profiles-signed-out.png` in the task's temporary
artifact directory. Public documentation excludes the person's email/identity,
opaque cookies, provider tokens and passwords.

## Checks before integration

- 57 focused account/client/static-packaging checks passed.
- Product UI production build passed, including `/account/`, advertiser dashboard
  and publisher chat (27 generated pages), using a separate build directory.
- Shared landing and financial state were not used for profile testing.

Integration status and post-merge regression results are recorded separately in
`INTEGRATION_RESULT.md`; this document alone is not a merge/deployment claim.
