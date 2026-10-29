# Packet03 architecture review-closure phase handoff

26 October 2026. Delivered for FOCUSED INDEPENDENT VERIFICATION, not implementation
GO. All three Round Two reports were read in full. Market and backend passed their
bounded domains; Solana was conditional on SOL-R2-001 (Medium/A). Existing reports
and Packet02 are preserved byte-for-byte. No Goal controls, source implementation,
tests, builds, installs, validator/RPC, reviewer dispatch, external writes or push
were used in this phase. Builders remain paused; only root can issue implementation GO.

## Essential correction: one effective-rights contract

Canonical valid issuance pairs are exactly (transferable,maxTransfers)=(0,0),(1,1),
(1,2),(1,3). Backend issuer admission and native IssueSeries reject all others before
state/counter changes; no silent coercion. This supports useful consume-only ordinary
Series without exposing contradictory flag/count combinations. The alternative of
forbidding every nontransferable ordinary Series was unnecessary; allowing false/3
with UI-only explanation would leave a signed-rights mismatch.

Effective remaining rights after the proposed fill are zero when the Series is
nontransferable, Unit is sponsored or acquisition is sponsored. Otherwise they are
maxTransfers minus post-fill count:0 count for primary, current+1 for secondary.
Secondary still requires transferable, nonsponsored and currentCount<maxTransfers;
a zero bid minimum never bypasses that transition guard. Ordinary primary and
secondary fill must satisfy the buyer's exact signed minimum. Primary admission
rejects a minimum above its known Series rights before an order hold. Both matching
directions filter eligibility before price-time selection; signer reconstruction
and native Fund repeat the predicate. Sponsored Fund explicitly requires minimum0,
regardless of the underlying Series allowance.

Exact reported counterexample is in V7/T1/T2: false/3 issuance rejects; supported
false/0 cannot fund a primary minimum1 with otherwise legitimate signer roles;
minimum0 can acquire it for consumption only. True/3 remains supported through
resales leaving2,1,0; the fourth resale rejects. Sponsored true/3 still yields0rights
and cannot accept a positive Fund minimum. No future liquidity/price is promised.

## Every Round Two finding and disposition

| ID | Preserved severity/class | Delivered correction | Focused verification |
| --- | --- | --- | --- |
| SOL-R2-001 | Medium/A | Canonical issuance, effective rights across admission/matching/signing/native primary+secondary; sponsor0 override | S2/S3, W2/W3/W4/W6 and V7/T1/T2/T4 eliminate false/3 and false/0 minimum1 traces |
| MKT-R2-01 | Low/B | Same underlying correction; ID/class retained independently | Reuse V7; do not downgrade the combined issue from the Solana A classification |
| MKT-R2-02 | Low/B | Sponsored-fixed-price provenance, no highest-bid claim, shared atomic Unit/campaign reservation | S5/W6 and V10/T3/T4: regular120 versus sponsored quote100, either reservation order; no double sale or substitute consent |
| BKR2-N01 | Low/B | Local walletStateVersion/context watermark covers both balance and holds, atomic retirement, reject/refetch stale context outside writer | S3/W6 and V9/T3/T8: old higher balance cannot combine with newer retired hold, even under new operation ID |
| BKR2-N02 | Low/B | Same rights predicate in both matching directions before price priority | S3/W6 and V8/T1: incoming ask leaves0, skip120/min1 and execute eligible110/min0 at110 |

All four Low/B notes are addressed within existing acceptance groups, not deferred
or turned into independent test campaigns. All21 original finding IDs/severities
remain in the ledger, with accepted scoped Round Two dispositions preserved as
architectural evidence only. Their original reports remain unchanged. Five new
rows explicitly track the Round Two observations, including the overlap.

## Selected model and scope retained

No economic redesign: primary P alone secures the issuer obligation; secondary Q
pays seller Q-floor(Q/100) and collector floor(Q/100) atomically with owner/cursor
and the one original-P claim. Only the current ordinary holder gets P on admitted
failure/timeout; secondary premiums and historical proceeds are not refunded.
Sponsored rights are nontransferable and refund sponsor. One price-time book;
sponsored issuer-authorized fixed-price procurement is labeled separately, not a
second competitive auction or a global best-execution claim.

No account fields, binary layouts, instruction tags, byte budgets, fee/rent rules,
claim/clock semantics or deployment trust model changed. No production scope was
added: one writer/current intact DB/ledger; no HA, arbitrary restore, external wallet
repair, native auction, native campaign aggregate or production custody guarantees.
No frontend design work. The stale-wallet check uses one local version/watermark and
existing transactions; no RPC under lock or distributed subsystem.

## Changes and exact artifacts

The five normative snapshots reconcile the selected-model summary, spec, wire,
existing T1/T2/T3/T4/T8 groups and V7–V10, plus all findings. The complete exact
unified diff is PACKET02_TO_PACKET03.diff in this directory. MANIFEST_V2.json binds
every normative file, this handoff, the diff and preservation metadata. Do not use
older root-level drafts as Packet03 authority or modify Packet02 in place.

Static document validation: canonical pairs/formula/primary guard/sponsor0 agree
across layers; both directions and the incoming-ask vector agree; sponsor pricing
labels and shared holds agree; wallet version/refetch schedule agrees; original21
and new5 finding IDs are unique and present. All preserved audit/Packet02 hashes
were checked. These checks are not execution of any planned acceptance case.

## Remaining blocker and next authorized verification

No further essential design contradiction was identified by the author. However,
SOL-R2-001 is STILL pending independent closure: the author cannot convert its
proposed correction into a reviewer pass. The next scope is a focused static check
of Packet03's transfer predicate and V7, with market overlap/bidirectional eligibility,
sponsored provenance race and stale-wallet schedule cross-checked for consistency.
No broad redesign or new research is needed for that check. Root will separately
authorize the existing reviewers; this phase has not dispatched them.

Actual implementation/codec parity, native minimum rejection, concurrency schedules,
local-validator settlement/claim deltas, compiler/runtime/rent/size/CU/storage evidence
remain unexecuted. They are post-GO proof obligations, not reported passes. Independent
focused verification and explicit root GO are required before builders resume.
40GB free-disk floor preserved; observed149163464KiB (~142.3GiB) before this small
text-only phase. The phase stops with this handoff.
