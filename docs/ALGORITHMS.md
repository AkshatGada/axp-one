# Algorithms and decision boundaries

## Opportunity gate

Small fixture taxonomy: hotel_booking, hotel_comparison, informational, blocked.
Input is user-approved sanitized task context: category, destination, dates if
provided, stated constraints. Missing geo is unknown, not inferred physical
location. Classifier may propose fields; schema/policy checks own eligibility.
One placement per user turn; session frequency default two per campaign, keyed
to a random ephemeral session ID, never a cross-site profile.
Enforce business uniqueness per run/mode/publisher/session/turn independently
of HTTP idempotency keys. Retrying a failed turn cannot create another purchase.

No inferred demographics, sensitive traits, private identifiers or raw transcript
forwarding. Destination Singapore does not imply user residence Singapore.

## Hard eligibility

Campaign active/version-valid; creative approved; publisher/category allowed;
task matches at least one allowed intent; no exclusion matches; advertiser
declared constraints compatible; bidfloor <= maxbid; open funded channel; deadline
and frequency limits met. Product claims remain declarations. Missing mandatory
constraint -> skip. High bids cannot bypass these checks.

## Buying agent

Agent input: normalized opportunity, non-financial campaign policy and creative
choices, plus rubric/engine versions. Budget/ceiling snapshots remain in the
deterministic bidder wrapper, not the model input. Code-built executable output:
`{decision: bid|skip, amountBaseUnits?, creativeVersionId?, reasonCodes,
evidenceFields, explanation}`. Exactly one valid decision per agent/opportunity.

The replaceable DecisionEngine (including an experimental Jev-powered buyer)
recommends bid/skip and an approved creative based on task fit and advertiser
objective. Deterministic code computes the amount using a frozen score-band
policy and ceiling; the model does not supply authoritative financial arithmetic.
The bid DTO above is constructed by code from the validated engine result.
No conversion-probability or expected-profit estimate is treated as measured
without training/outcome evidence. We do not call this reinforcement learning.
The initial policy is maximum-bid-bounded scoring; pacing/learning later.

Three isolated advertiser contexts with the same explicitly recorded model and
effort. At most one model invocation per eligible buyer/opportunity; proposed default 10-second
deadline, measured rather than claimed as real-time adtech latency. No hidden
mechanical answers supplied to real-agent trials. Errors -> skip with provenance.

## Deterministic baseline

The same hard filter plus predefined per-intent bids. Compare baseline vs agent
on a frozen task matrix; record eligibility errors, bid/skip differences, latency,
token/model cost and cap violations. Without conversions this measures policy
behavior, not advertising effectiveness. Baseline fallback must be explicitly
labelled; it never masquerades as a model decision.

## First-price auction

Validated bids are sorted by integer amount descending, then campaign ID
lexicographically. At deadline, atomically attempt winner reservation; no model
call inside the transaction. Record every rejection reason. No second-price,
negotiation, pay-to-bid or refunds-to-losers in the MVP. Winner pays its exact bid
only after accepted render delivery; loser spend remains zero.

## Budget arithmetic

All amounts are six-decimal test-USDC base units as integer strings; parse to
integer arithmetic, never binary floating point. Let B be immutable campaign
limit, C accepted charges (includes pending/authorized/settled exactly once),
R active reservations. Award must satisfy C + R + proposed_price <= B.
Separately channel accepted obligations + active reservations cannot exceed the
confirmed deposit or authorized operator ceiling. A shared channel, if added,
requires aggregate campaign reservations; first version uses one per advertiser.

Accepted delivery moves price from R to C in one transaction; authorization and
settlement do not increment C again. Failed render decrements only R. A signed
voucher is monotone: authorize total C for that channel, not C plus previous
voucher. Per-channel signer worker serializes signing to prevent races.

## Performance and novelty evidence

Measure intent gating, bidder time, exchange compute, render and settlement
separately. Slow model/RPC time cannot be hidden in an off-chain throughput claim.
Potential value: transparent bounded autonomous buying and receipt-linked
channel accounting for conversational slots. Existing AdKit/AdCP/ARTF make a
first-ever agentic advertising claim unsupported.
