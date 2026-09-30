# Security and evidence boundary

## Minimum MVP controls

Implementation priority is algorithm/protocol correctness for one owned local
demo. Lightweight role separation, safe rendering and no exposed signer remain;
multi-tenant production auth, user-account onboarding, generalized identity
management and fraud infrastructure are deferred. Do not turn this checklist
into a production hardening project.

- Local server binds loopback; explicit role/owner checks; CSRF for browser admin
  mutations; body limits, strict schemas, safe text rendering and HTTPS-only
  advertiser destinations (no active HTML/script creative).
- No bidder-supplied instructions can change policy, signer, network or recipient.
  Treat creative/opportunity content as untrusted data, including prompt injection.
- No automatic external URL fetch during bidding. Avoid SSRF and website/tool
  scraping costs in the first build. URL destination is an approved link.
- Immutable campaign/publisher versions and a transactional budget ledger.
- Enforce frequency caps at reservation time as well as delivery to avoid races.
- Keys server-side, private state owner-readable, secrets never exported. LLM
  bidder has no wallet/admin tools. Same-host service separation is not hardware
  isolation or independent third-party authorization.
- One actor-scoped idempotency identity per delivery/charge; persist before side
  effects; reconcile uncertain signatures instead of repeating purchases.
- Persist signed receipt and voucher bytes privately; export safe hashes and
  identities plus relevant amounts/finality for reproducible accounting.
- No raw user chat retention by default. Fixture prompts may be public, but
  advertiser agents receive only declared coarse context and constraints.

## What signatures prove

Publisher signature: registered publisher asserted this render event.
Payer voucher: authorized signer approved this cumulative payment ceiling.
Chain record: a transaction executed/finalized with these account changes.
None proves human viewership, relevance, ad absorption, endorsement or conversion.
Do not label a receipt fraud-proof, independently verified attention or proof of
placement beyond the owned application's observable execution.

## Economic risk

Receipts-before-voucher is deliberately not atomic fair exchange. A buyer may
refuse authorization after rendering; a publisher can assert false rendering.
For MVP use one owned publisher and explicit trust. Delivery inconsistencies
stop new awards and remain reported as unpaid, not hidden. A production network
needs separate dispute/fraud/collateral research. No promise that channels solve it.

## Organic answer integrity

Assistant answer input excludes paid creative and bid ranking. Sponsored card
is a separate structured object/UI region with clear label and destination.
Ad failure/payment latency must not suppress the organic answer. If future
formats include sponsored generated text, they need a new review and separate
disclosure contract; no automatic scope expansion.

## Reporting language

Use: opportunity, bid, award, reference-app rendered acknowledgement, accepted
charge, authorized cumulative total, finalized settlement, publisher payout,
refund/reclaim. Distinguish synthetic, sandbox, Devnet and receipt replay.
Do not use: actual human impression, conversion, CAC optimized, industry-first,
many publishers integrated, autonomous seller agent or AdCP conformance unless
specific evidence exists. Publisher policies are deterministic in this MVP.
