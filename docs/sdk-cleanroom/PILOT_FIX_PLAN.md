# SDK pilot gap closure

Scope: isolated `codex/sdk-cleanroom-integration` worktree only. Preserve the first
clean-room experiment, frozen SDK copy, baseline app and historical artifacts.
No paid providers, wallet operations, deployment, package publication or main-tree edits.

## Sequence and exit gates

1. Freeze public recovery contract. Add authenticated read-only GETs:
   `/publisher/opportunities?sessionId=...&turnId=...` and
   `/awards/:id/status` (publisher key plus bound delivery token).
   Results are `not_found`, `pending`, `unknown`, or `resolved` (saved opportunity
   plus `awardStatus`), and `reserved`, `expired`, `failed`, or `accepted` for award
   status. Reads never invoke models, authorize vouchers, expire reservations or
   create charges. Accepted status returns the saved receipt/charge; pending or
   unknown never invites a replacement purchase. Token recovery stays server-only.
2. Main: durable request admission before decision dispatch; read-only recovery,
   operator key issue/revoke/rotate and workspace isolation. Persist credentials as
   hashes and keep delivery-token derivation independent of rotated credentials.
   One publisher per isolated workspace/endpoint remains explicit, not a claim of
   multi-tenant shared inventory or independent payout onboarding.
3. SDK builder: recovery methods, validated receipt caching/failure responses,
   stable error codes, exact expiry/input docs and DTOs. Build an installable local
   tarball (no npm publication) with a documented version. Maintain old entry points.
4. Main: actual HTTP acceptance for lost responses, restart, revoked/wrong-workspace
   keys, read-only lookups, expiry, duplicate delivery, and preserved financial totals.
5. Fresh integrator: only packaged public SDK/docs and frozen baseline chat app;
   integrate into a NEW experiment app with durable server-owned turn bindings.
   No internal service/examples/previous integration reading. Test recovery, no-fill,
   exact Sponsored rendering and organic independence; report friction unprompted.
6. Run relevant suites plus repository regression, then browser acceptance and one
   focused review/recheck of substantive blockers. Record measured outcomes, not
   production certification.

## Contract specifics

`expiresAt` is Unix epoch milliseconds. Question is trimmed current-turn text,
max 1200 characters before trim, never silently truncated. Restrictions are unique,
trimmed, sorted capability IDs, max 17. Same canonical turn input must be reused.
Non-2xx JSON `{error: stable_code}` preserves safe code and HTTP status.
Receipt acceptance validates binding/shape, not independent signature authenticity.
Only valid accepted receipts are cached. An insertion assertion is not viewability.
No automatic purchases/retries or cancellations of uncertain outcomes.

## Not in this pass

Mainnet, self-service advertiser custody, billing system, viewability/fraud research,
cross-family model experiments, React packaging overhaul or a broad security audit.
Manual provisioned, isolated pilot endpoints are sufficient. Secrets stay ignored.

## Completion

All six bounded gates completed on 11 October 2026. Fresh integration passed
29 app/DOM checks and five actual HTTP loss/restart cases. Main's final combined
run passed 566 checks with 11 optional skips and zero failures, plus interactive
browser acceptance and the historical-card recheck. See `PILOT_RESULT.md`.
These are local fixture/synthetic results; nothing was published or deployed.
