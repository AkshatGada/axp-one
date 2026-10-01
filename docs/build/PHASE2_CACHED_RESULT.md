# Phase 2 cached profile and history decision builder result

2026-10-01. Local builder implementation and injected-fixture verification only.
Main owns actual DB/provider experiments, comparison-route integration and the
focused independent review. This result does not establish full MVP completion,
historical fit quality, conversion prediction or a model adoption decision.

## Owned files and dependency

Only four new files belong to this increment:

- `packages/ml/profiles/cached.mjs`
- `packages/ml/engines/cached-history.mjs`
- `tests/ml/cached-decisions.test.mjs`
- `docs/build/PHASE2_CACHED_RESULT.md`

Main's shared seam `c9d24ed` was cherry-picked as local commit `42f859a` without
builder modifications. It adds task text, travel-tool intent, capability fields,
cached-profile dispatch and optional contrast examples. Integrate this increment
after that seam; no index exports, adapter, core, base or rules files were edited.

## Exact APIs and behavior

`buildCachedCampaignProfile(campaign, {approvedTargetingText, selectedCreativeIds},
lookupResult)` and `validateCachedCampaignProfile(profile, campaign)` export the
frozen cached schema from the Phase 2 task card. Selected source creative IDs
are explicit, positive safe integers, unique, sorted and capped at five.
The compiler retains at most five observed mappings and two inferred hints,
restricted to selected creatives and retained mappings. Campaign content/version,
approved creative IDs, lookup snapshot, seed query and profile content are hash
bound. Validators reject unknown fields, vectors, financial fields, duplicate or
foreign source IDs, invalid hashes, fabricated revisions and invalid statuses.

Evidence packet prompt/hint text and advertiser labels are capped at 240
characters, using the existing compact evidence packet convention. Hint model
version is capped at 160; source creative text is screened at the adapter's 2400
limit. Oversized, private, credential or sensitive strings are omitted whole,
never truncated or rewritten while retaining cached provenance. Approved targeting
text remains capped at 1200. The snapshot hash covers the supplied screened
adapter lookup, including source vector metadata, not vector arrays.

One retained mapping plus a ready query cache makes `historyStatus=ready`.
This means retrieval is available, not that fit quality is established. Profiles
always carry `association_not_fit_label`, `revision_unrecorded` and
`no_independent_fit_labels`; fewer than three mappings adds `sparse_history`.
Inferred and sparse hints carry corresponding flags. The old multi-family,
multi-advertiser embedding readiness gate is not reused.

`CachedHistoryDecisionEngine extends BaseDecisionEngine`, constructed with
`{lookup, ...options}`, uses inherited `scoreOpportunity` and engine name
`cached_history_v1`. It calls the injected lookup once with task text and
`{limit:5, signal}`; validates the vector-free adapter projection and exact legacy
query-text hash; and considers only mappings of frozen selected source creatives.
Missing task/profile/lookup/query cache yields explicit abstention with no
fallback. Available cache with no own mapping produces relevance zero and skip.
Transport and timeout failures retain common failure provenance; raw diagnostics
are never copied. Model provenance is always null.

`CACHED_ASSOCIATION_HEURISTIC` freezes version `cached-association-bands-v1` and
thresholds 0.3/0.5/0.7. Maximum own-source association similarity maps to levels
0/1/2/3, respectively. This is an uncalibrated demo heuristic. Required capability
must occur in both campaign declarations and a candidate's declared tags; mismatch
caps relevance at one. Explicit negative preference tags also cap at one; missing
soft preference support caps at two. Unsupported intent gives zero. Creative ties
use lexicographic version ID; intent uses the shared base function.

Bids cite the chosen approved creative's declaration evidence. Optional profile
citations require the same frozen prompt/mapping/creative/text/advertiser or the
same frozen hint identity/content/tier/model on a returned own mapping. A new
mapping of a selected source creative can inform the association heuristic but
cannot cite an absent frozen mapping. Historical advertiser name alone never
grants association or citation support. Conversion probability remains null.

Supporting exports `validateCachedLookupResult`, `screenedCachedAssociations` and
`associationLevel` permit strict projection checks and inspection of the frozen
heuristic; they expose no database or vector-generation API.

## Verification and limitations

- `node --test tests/ml/cached-decisions.test.mjs`: 16 passed.
- `AXP_CACHED_CORPUS_LIVE=0 node --test tests/ml/*.test.mjs`: 61 total,
  60 passed, one live opt-in test skipped, zero failures.
- Checks include own-profile binding, rehashed structural corruption, missing
  cache/profile, capability mismatch, ordinal band boundaries, deterministic
  selection, unrelated historical creative rejection, no unsupported citations,
  timeout/cancellation, transport diagnostics and instruction-like content.
- All new decisions and labels are authored synthetic fixture assertions, not
  human-reviewed fit labels or evidence of empirical model quality.
- No actual DB lookup, source write, embedding generation, model/provider call,
  key access, payment, package install, clone, push or deployment occurred.

Main integration follow-up: the shared generic constraint validator in `c9d24ed`
still accepts scalar `requiredCapabilities`; the cached engine rejects this as
`capabilities_invalid` before lookup. Main should make this field array-only in
the shared contract for consistency across engines. Actual DB runs, bounded Jev
calls, provider measurements and the focused reviewer remain main-owned.
