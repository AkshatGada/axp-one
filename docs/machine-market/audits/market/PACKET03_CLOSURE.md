# Packet03 focused market closure

26 October 2026. **SIGNED OFF for the assigned architecture corrections.** No
remaining supported-flow contradiction was identified in this focused scope.
This is not executed proof, a security guarantee or implementation GO.

## Identity and method

Worktree: `/Users/akshat/agentic-dsp/.worktrees/axp-machine-market`.
Packet directory: `docs/machine-market/architecture/review-packets/v2-review-2026-10-26-03/`.
References below identify that snapshot.

Verified hashes before review and again before submission:

| File | SHA-256 |
| --- | --- |
| MANIFEST_V2.json | `d77ac0f699a29dd89812137007f3ccb1cbf1d271dbcb738c66fd63c3736a3f3c` |
| SELECTED_MODEL_V2.md | `718e0d0744008aa80266f249055a01e202db12f33b4eeefc86ca49242f5e72c3` |
| SPEC_V2.md | `22ab0c74014ebef3ca0b5f753318736278dc5f3104cb4392d78084db865c064a` |
| WIRE_V2.md | `836dc27d180eefa4571782d92cf2c33a821c314dcad29a7bc71ce3efdfdcbe08` |
| ACCEPTANCE_V2.md | `c99497498a5d26952cc5758f28c5e87307f0d9a2b0950a1b23b317079a0d7de5` |
| AUDIT_DISPOSITIONS.md | `73f3ac09f7f91e517d043b70a59e5cac6192802e11cc10922869c9936a196db6` |
| PLANNING_HANDOFF.md | `924c398f9f2633bcb93490ac5aa07d83b7f6470f2dce98a3a3225b3d40b916e0` |
| PACKET02_TO_PACKET03.diff | `de3fb049e888946551cd980f6c3d4a4953265f51db180097b921b5655dd10deb` |
| PHASE_METADATA.json | `9c15a9a828bc885469459a80b62c8ef699dfa4506be428eb425052d94ba4cbfd` |

Read my complete ROUND2.md (unchanged hash
`06cbf2b0b71b0829b3dde59f7fc7e589866345feddda74a74939167ca064a4b3`),
the complete exact diff, and affected actual spec/wire/acceptance sections. All
manifest-referenced hashes matched, including hash-only verification of other
Round2 inputs; their report contents and other focused verdicts were not consulted.
Only this report was written. No
research, implementation, tests/builds, installations, validator/RPC, transactions,
external writes, agents or messages to other chats. Free disk observed142GiB.

## Individual dispositions and counterexample checks

**MKT-R2-01 — original Low/B: CLOSED in the specification. Overlap SOL-R2-001
remains Medium/A, independently satisfied here for the assigned rights boundary.**
The combined obligation is treated as essential; the earlier market classification
does not downgrade it or imply closure by majority.

SPEC S2 lines78-100 and WIRE W3 lines95-99 now allow exactly (0,0), (1,1), (1,2),
(1,3). The original (transferable=0,maxTransfers=3) trace rejects at both issuer
admission and native IssueSeries, before state/counter change. No normalization
silently changes signed policy. A valid consume-only (0,0) Series has effective
rights0; ordinary primary minimum1 rejects before an order hold and again in native
Fund, even with otherwise valid native signers. Minimum0 permits consumption but
does not authorize secondary transfer.

WIRE W4 lines157-175 carries the same predicate through primary, secondary and
sponsored funding before economic effects. Ordinary primary leaves count0;
secondary increments count before computing remaining rights and must first be a
permitted transition. Thus max3/count2 leaves0: minimum1 fails and minimum0 may
fill, but count3 cannot resell again even with minimum0. For a sponsored purchase
of a transferable Series, effective rights remain0 and Fund.minimum must be0.
The adapter must preserve the admitted signed minimum exactly (WIRE164-165), so it
cannot lower minimum1 to0 merely to pass native validation.

ACCEPTANCE V7 lines82-97 explicitly covers invalid issuance, valid consume-only
primary rejection, direct native primary rejection, positive transferable minima,
resale exhaustion and the sponsor override. Failed native transaction fees remain
separate from the required zero principal/owner/OrderUse effect. These are adequate
finite planned closure cases; none has been executed in this review.

**Both-direction eligibility check: SATISFIED for this overlap.** SPEC S3 lines120-128
and WIRE W6 lines325-328 require the rights and exact-face filter before price/time
selection for incoming asks as well as incoming bids. V8 lines99-104 correctly
selects resting110/min0 for ask100 leaving0, skipping resting120/min1 without first
reserving it or attempting native funding. Execution110 is the eligible maker's
price;120 remains valid for another suitable Unit. Reverse-direction filtering
is explicitly required. Exact Series/lane/P compatibility remains intact.

**MKT-R2-02 — original Low/B: CLOSED in the specification.** SPEC S5 lines226-239,
WIRE W6 lines285-289 and SELECTED_MODEL's added provenance rule distinguish
`sponsored-fixed-price` from `book-maker-price`. The former is derived from funding
kind2 and is not represented as the global highest-bid winner.

V10 lines114-121 checks regular120 versus a sponsored exact-unit quote100 in both
reservation orders. Regular reservation first makes sponsorship unavailable without
grant, charge or substituted unit; sponsor reservation first excludes that Unit
from regular matching. SPEC235-238 and256-261 require the same atomic availability
guard and campaign reservation, so the lower sponsored price cannot authorize a
second sale or reuse old consent for another Unit. This is coherent issuer-authorized
procurement, not a new auction or cross-route best-execution promise.

## Scope, economics and remaining proof

No new schema fields, account-layout changes, mechanism or production subsystem
are required for these corrections. Rejecting invalid pairs is clearer than
silently normalizing signed rights. Eligibility-first matching is preferable to
reserving an invalid high bid and relying on native failure. Honest fixed-price
provenance avoids inventing a sponsor auction solely for uniform presentation.

Primary P escrow, immediate secondary Q-net/fee payment, current-holder original-P
claim, sponsor refund destination and premium risk are unchanged by the inspected
diff. Structural transfer rights still promise neither liquidity nor time beyond
useBy. Trusted fixture signing, matcher ordering, gateway durability, one writer
and the same intact current DB/ledger remain the accepted bounded model; production
custody, Sybil resistance, HA and arbitrary restoration remain unsupported.

The author must not convert this sign-off into native evidence. After root GO,
V7/V8/V10 and their T1-T4 groups must demonstrate exact codec/adapter/program
agreement, no forbidden principal/owner/order effects, both-direction selection,
and no double sale. Other domains retain their own focused verification authority;
this report does not close unrelated wallet-version or runtime questions.

**Final verdict: signed off for MKT-R2-01, MKT-R2-02 and the assigned economic/
rights overlap with SOL-R2-001, without downgrading Medium/A.** Earlier reports and
packets remain unchanged. Builders remain paused; root alone may issue GO after
reviewing the full packet and all required reports. Stop at this handoff.
