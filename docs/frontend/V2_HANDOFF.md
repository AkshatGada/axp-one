# V2 functional frontend handoff

Backend code and functional reference UI live in packages/v2, apps/backend/v2.mjs and apps/v2-ui. Final layouts and motion are specialist-owned; do not duplicate bidding, receipt validation, accounting or signing in a browser.

## Implemented routes
All servers bind loopback. GET `/health`, `/v2/bootstrap`, `/v2/state`, `/v2/evidence`, `/v2/retrieval?question=0&campaign=v2-clearvault`, `/v2/v1-payment`. POST `/v2/campaign`, `/v2/preview`, `/v2/run`, `/v2/close`, `/v1/awards/{id}/render`, `/v1/awards/{id}/fail`. Interactive POST requires bootstrap token in `x-axp-csrf`; all replay POSTs return405. No model/payment/signing endpoints exist in replay. Model execution requires the server operator flag, not a browser toggle. Evidence browsing and preview call no provider.

Thin client: packages/v2/client.mjs; DTO entrypoint: packages/v2/client.d.ts. Frozen actual run and labelled synthetic fixtures are generated into artifacts/v2/frontend/states.json. Historical evidence is read-only and independent of fictional onboarding.

## State-to-screen map
| State | Screen | Meaning |
|---|---|---|
| draft / approved | Onboarding | Independent fictional declarations and creative; no enrollment of historical brands |
| vector / lexical_fallback / unavailable | Retrieval | Existing exact cached vectors versus explicit deterministic fallback or missing packet |
| actual-jev / fixture / recorded-replay | Decisions | Execution provenance, independent of synthetic financial mode |
| bid / skip / abstain | Decisions | Agent output before policy eligibility and integer bid calculation |
| awarded / no_fill | Publisher | Reservation, not charge |
| reserved / failed / expired | Publisher | Undelivered creative, no accepted charge |
| accepted | Publisher / Accounting | Owned-app acknowledgement bound to IDs/hashes; not attention |
| authorized / settled | Accounting | Synthetic cumulative total and final simulated refund; never a transaction |
| separate V1 payment | V1 example | Original hosted sandbox run, original timestamps and amounts; not V2 settlement |

## Design provenance
Use existing `design-system/tokens.css`, `design-system/fonts.css` and PolySans WOFF2 assets from this repo. Preserve its neutral palette, spacing and restrained steel accents. Existing design-system provenance remains authoritative. Do not import components from ContextHint or modify that product. The reference UI is intentionally functional, not the final visual design.

## Claims
AXP uses real conversational-ad observations and inferred targeting evidence to inform advertiser-agent placement decisions. This is not reconstruction of ChatGPT’s proprietary algorithm, verified campaign performance, model training, human attention or conversion optimization. One stochastic output per paired arm does not establish lift.
