# Existing-data-first MVP phases

Approved direction: user requested existing database/vector/hint reuse and then
approved starting, 2026-09-30. This supersedes older proposals to generate corpus
vectors afresh. It does not change auction/payment semantics or the final
frontend specialist's ownership.

## Start here

AXP uses the existing local compute corpus (`adsdb`, database `ads`) through a
new bounded, read-only AXP adapter. Do not clone PostgreSQL, migrate/write source
tables, start upstream APIs/generators, import upstream runtime modules or
regenerate existing corpus embeddings. The serving mirror is a different source:
`akshatapp_mirror` has no embedding rows in the inspected local copy.

Existing compute assets verified with READ ONLY queries: 146438 prompt vectors,
45315 creative vectors, 67605 hint vectors, 62130 inferred hints. Model label is
BAAI/bge-base-en-v1.5 and dimension768. Artifact revision is unrecorded: preserve
that limitation rather than inventing a revision or refusing all cached reuse.
A bounded sample of120 travel mappings had both cached prompt and ad vectors;
all336 travel hints had vectors. This is coverage evidence, not targeting quality.

Legacy prompt/hint keys use SHA256(lowercase + whitespace normalization). That
key is not the newer AXP Unicode/family grouping hash. Preserve source identities.
Cached ad vectors are keyed by source creative content_hash. Corpus normalization
does not authorize changing displayed text or attaching unrelated vector rows.

## Phases and exit evidence

1. **Existing intelligence:** fixed local read-only query transport, exact cached
   prompt lookup, bounded travel neighbors, connected observed creative and
   inferred hint, vector-free reference-console projection. Exit: actual existing
   DB lookup and explicit cache-miss outcome, no source changes/generation, and
   unchanged exchange/payment state. No new production indexes or corpus copy.
2. **Advertiser decisions:** compile versioned advertiser-owned profiles from
   approved evidence; connect the common engine; run actual bid/skip and bounded
   rules/data/model comparison. Retrieval is not itself an actual agent decision.
   Unseen task/fictional creative text requires either its existing cache entry
   or an explicitly separate, compatible task-only embedding runtime. Never
   silently regenerate the corpus or label a rule fallback as data/model output.
3. **Connected placement:** isolated actual buyers and independent organic answer
   -> existing deterministic auction -> disclosed DOM card -> accepted receipt
   -> one charge, then two legitimate charges on the same channel.
4. **Solana settlement:** compatible pinned MPP package/deployment -> charge-bound
   cumulative authorization -> actual Devnet payout/refund. Current compatibility
   blocker must be resolved; synthetic accounting is not channel evidence.
5. **Demonstration/handoff:** launcher, four-minute story, successful recording,
   read-only receipt replay, sanitized API fixtures and one focused blocker review.
   Final marketing/product visual frontend remains specialist-owned.

## Phase-1 contract

`createCachedCorpus().lookup(text,{limit:5,signal})` returns bounded existing
historical evidence, never a new campaign or authorization. Exact cache absence
returns `query_vector_unavailable`, not new embedding generation or similarity
invented from lexical rules. Public result has model/dimension/vector identity,
unrecorded-revision label, prompt similarity, mappings and inferred hints; no raw
vectors, response HTML, customer records or connection credentials.

Lookup is a separate preparation/evidence action, outside the auction transaction
and organic-answer input. `POST /v1/evidence/lookup` uses the local operator CSRF
boundary but performs no financial mutation. New source transport is opt-in with
`AXP_CORPUS_DB=ads`; no remote serving credential or source-service restart.

Prompt evidence is public/background only; request-associated prompts are
excluded. Original hint evidence must connect to the actual returned creative.
Sparse/holdout tiers stay visible; reconstruction AUC is not a conversion score.
Historical advertisers remain observed brands, not enrolled AXP bidders.

## Verification loop

For each phase: inspect the accepted seam -> implement the missing behavior ->
test its critical paths -> execute the actual bounded path -> reconcile evidence
and labels -> update BUILD_PROGRESS -> choose the next missing demo beat.
One focused review per connected slice; no broad production audit cycles.

Phase1 is not G2/actual agents, model quality, a full unseen-task embedding path,
or G5/settlement. Phase2 was executed2026-10-01: own profiles, actual cache
decisions,40 authored cases and28 bounded actual Jev calls including corrective
diagnostics. Three corrected probes give genuine model bid/skip but no quality
or latency advantage; keep rules default. See build/PHASE2_RESULT.md. Initial
failed comparison remains preserved, not replaced by successful diagnostics.
Final completion still requires the master plan's real demo gates. Existing AXP
code/history and ContextHint/What AI Cites remain untouched.

Phase3 executed2026-10-01: six actual Jev decisions feed the existing auction;
two real DOM cards/receipts create3000+3000charges on one synthetic channel.
Independent gpt-6.1-sol low answers use operator-recorded app-agent completions
after the standalone CLI rejected that model/login. Original failure retained;
recovery/replay do not re-auction or charge. Fresh review found no blockers.
See build/PHASE3_RESULT.md for exact bounds, evidence and runtime limitations.
This is operator-assisted local integration, not unattended model execution or
real channel settlement. Phase4 remains unresolved and is not silently passed.
