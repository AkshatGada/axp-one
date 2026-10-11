# Publisher SDK clean-room integration

## Purpose

Test whether a developer without AXP implementation knowledge can integrate the
source-distributed publisher SDK into an independently built chat application.
This tests integration usability and correctness, not ad relevance, real model
behavior, payment settlement, or production readiness.

## Isolation and ownership

- Branch: `codex/sdk-cleanroom-integration`, based on `8053135`.
- Worktree: `/Users/akshat/agentic-dsp-sdk-cleanroom`.
- The active landing-page checkout is not edited.
- Agent A receives only an ordinary chat-app brief, in a separate temporary
  directory. Freeze its complete source with SHA-256 hashes before integration.
- Fresh Agent B receives that app, the SDK's public README, source package and a
  local operator-provisioned server credential. No internal example application,
  exchange source, internal tests or reference integration is supplied.
- Main owns the isolated exchange fixture, source snapshots, observations and
  integration evidence. A fresh reviewer verifies results after integration.
- Fresh sessions reduce shared context; they do not establish an unbiased or
  independently operated evaluator.

## Execution sequence and completion gates

1. Build and test a conventional chat app with an explicitly fixture answer
   adapter. Freeze its baseline. No AXP-specific scaffolding in this stage.
2. Start the actual product API/ledger in a new synthetic state directory, with
   explicit fixture advertiser decisions and no database/provider dependencies.
   It must not load `.env.local`, existing state, wallets or paid services.
3. Give Agent B only the public integration surfaces. Preserve SDK source hashes;
   do not patch the SDK during this attempt. Record ambiguities, interventions,
   time and failures, including failures that prevent successful integration.
4. Exercise real loopback HTTP requests and actual browser insertion, plus focused
   fixture checks for failure/retry paths. Compare app/provider inputs and ledger.
5. Fresh reviewer checks the integrated app, public contract and saved results.
   Fix app/harness blockers without quietly rewriting the original attempt.

## Acceptance checklist

- Ordinary organic answers continue with an awarded ad, no-fill, ad error or
  timeout; the answer does not wait for the ad.
- Exact separate Sponsored card insertion produces one accepted signed receipt
  and one synthetic ledger charge.
- Missing disclosure, changed copy/destination and disconnected nodes do not
  produce a qualifying browser observation.
- Duplicate/replayed acknowledgements preserve charge identity and spend.
- Failed insertion creates no charge and releases the reservation.
- Publisher credential stays server-side; browser requests have application
  session/turn/award ownership and same-origin/CSRF protection.
- Organic adapter receives no creative, advertiser evidence or bidding output.
- Restart reuses saved outcomes without new fixture decisions or charges.
- SDK source remains unchanged, and no native payments/provider calls occur.

## Claim boundary

Actual SDK calls, real HTTP, real DOM and a real local ledger are tested. Organic
answers and advertiser decisions in this first pass are explicitly fixtures;
money is synthetic. Publisher receipts assert insertion/disclosure, not human
attention or an independently attested display. A successful run is not proof
that any AI application can integrate without additional work, nor proof of live
Jev/LLM quality, mainnet readiness or settlement.

## Frozen baseline and preflight

- Independent app builder: Kuhn (`01a12b63-d052-74c1-a171-76e983f8218a`),
  fresh context, ordinary-chat brief only. Six baseline tests passed independently
  on rerun. Its ordinary provider interface accepts only validated message history.
- Baseline app tree SHA-256:
  `c6ec20d35debdc331c9e427132fce156989489f968f2338041cfe380d7fc861a`.
- SDK package tree SHA-256:
  `104582f1a3d02d019114b49aa3809c0372db1c0d6845455e697281dbea3a1636`.
- Fresh integrator: Gibbs (`01a12b68-990d-7053-a933-1fcf543faefc`). The
  integrator is explicitly denied internal examples/tests/implementation and
  cannot edit the SDK. Public source inspection remains allowed, as for a normal
  source-distributed library user; this is not a binary-only test.
- Existing SDK tests: 26 passed. Isolated real-HTTP harness checks: 2 passed.
- Repository preflight: 488 total, 477 passed, 11 optional native SDK tests
  skipped, zero failures after allowing loopback sockets. The first restricted
  run hit `listen EPERM`; it was not counted as a passing run.
- Fixture inventory is one fictional developer-tool campaign. This isolates SDK
  integration behavior; it does not replay the crypto targeting research or
  evaluate contextual matching quality.
