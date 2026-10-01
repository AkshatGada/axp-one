# Offline evidence-decision comparison

## Frozen declaration panel

Panel version `authored-declarations-12-v1`, frozen before any engine output was
read. These twelve distinct authored tasks are demonstration/declaration checks,
not independent true-fit labels, held-out quality evaluation or conversion data.
No expected winner, score or desired improvement is attached to a case. Keep
unchanged and changed results as observed; do not tune the main engine or replace
tasks to force a history advantage.

| ID | Preset | Authored prompt |
|---|---|---|
| travel-basic | tripdesk | Compare corporate travel booking tools for teams. |
| travel-offsite | tripdesk | Compare corporate travel booking platforms for a remote company offsite, shared itineraries, automated approvals, finance reporting, and per-employee pricing without a dedicated travel manager. |
| expenses-remote | tripdesk | Compare tools for a remote team's expenses and reimbursements, automated reporting, global travel, checkout policy, and per-employee pricing. |
| expenses-basic | tripdesk | Compare automatic expense capture tools for teams. |
| auth-basic | agentpass | Compare authentication and identity tools for AI travel agents. |
| auth-developers | agentpass | Compare authentication for product and engineering teams building AI travel agents, with secure identity for both human users and the agents themselves. |
| hotel-basic | hotelops | Compare hotel ERP software and expert vendor shortlists. |
| hotel-revenue | hotelops | Compare hotel ERP vendors for hospitality leaders evaluating revenue management, wary of AI-first vendor hype, seeking expert-built shortlists over algorithm-generated picks. |
| informational | tripdesk | Explain what corporate travel booking and expense management mean. |
| unknown | hotelops | Compare telescopes for observing distant galaxies. |
| required-mismatch | tripdesk | I need corporate travel booking with authentication and identity for AI agents. |
| wrong-capability | agentpass | Compare corporate travel booking and automatic expense capture for teams. |

Fixed evidence selections, inspected only as source data before execution:

- TripDesk: `ads:mapping:53989`, `189867`, `280148`, `688879`, `932235`
  (each abbreviated number has the same `ads:mapping:` prefix).
- AgentPass: `ads:mapping:110136`.
- HotelOps: `ads:mapping:4442`.

All campaign text/capabilities come unchanged from `PRESETS`. Synthetic IDs,
maximum bid `4000`, campaign cap `8000`, and hypothetical deposit `20000` are
fixed. The deposit is only an arithmetic input, not a created/funded channel.
`simulationOpportunity` makes twelve deterministic task projections using a
fixed fixture clock; no opportunity is submitted or persisted.

## Bounded harness

Owned paths only: `scripts/demo/evidence-decision-comparison.mjs`,
`tests/demo/evidence-comparison.test.mjs`, this document, and
`artifacts/advertiser/decision-comparison.json`. Main owns the scorer, service and
UI. The harness calls main's `compareDecisions` for both arms, never implements
or modifies the engine. It loads only the existing offline, hash-verified
18-association catalogue via `loadEvidence`; no source refresh or upstream reads.

Baseline uses own approved creative, description and context hints. History
adds bounded campaign-aligned historical prompt/hint packets. Declaration-fit
bounds and hard requirements apply to both arms. Missing or nonaligned support
is unavailable evidence, not negative demand or an absent product capability.

The explicit IDs are operator attachments, not an exclusive retrieval filter.
The engine can retrieve other campaign-aligned rows in the same frozen catalogue;
every selected ID, prompt, creative, inferred hint, coverage, affinity, capability
anchor and attachment flag is inspectable in the packet. No engine edits or task
changes were made to obtain the observed results.

## Executed results

Run locally on 2026-10-01 with Node `v25.5.0`, darwin/arm64. Twelve paired calls
produce 24 arm decisions. Eight pairs were unchanged; four changed. Of the four,
one changes participation and three change a relevance band/hypothetical amount.
Baseline constructs seven hypothetical bids; history constructs eight. None is
an auction result, reservation or charge. A change is the main engine's comparison
of participation, relevance level and executable-bid DTO, not provenance text.

| Changed task | Baseline | History |
|---|---|---|
| travel-offsite | level1, skip/no-bid | level2, hypothetical bid2000 |
| expenses-remote | level2, hypothetical bid2000 | level3, hypothetical bid3000 |
| auth-developers | level2, hypothetical bid2000 | level3, hypothetical bid3000 |
| hotel-revenue | level2, hypothetical bid2000 | level3, hypothetical bid3000 |

Unchanged: `travel-basic`, `expenses-basic`, `auth-basic`, `hotel-basic`,
`informational`, `unknown`, `required-mismatch`, `wrong-capability`. The last four
remain skip/no-bid in both arms. `required-mismatch` remains no-bid despite
retrieved travel support: history cannot supply authentication or agent identity.
Unknown/wrong-capability cases have no aligned historical support and explicit
text-only fallback. All twelve pairs pass declaration/bid/provenance assertions.

These are authored demonstrations, with wording informed by inspected source
records, not independent true-fit labels. Historical associations and inferred
hints are not product facts, real-world query demand, conversions or advertiser
enrollment. No accuracy, NDCG, causal effect, targeting lift or engine adoption
claim is supported. Baseline and history both use corpus-derived IDF; this tests
added historical packets, not removal of every historical-data influence.

## Integrity and reproducibility

- Frozen panel SHA-256:
  `aa9ed9eb4224e2e2ae19000171ca85353229f43536e93ce9fe7196eb30fed691`.
- Actual engine byte SHA-256:
  `1f58a7ffc1852cef1f6909282a561d1dbe7134c79b779c6e80749d22e4242fec`.
- Service input-module byte SHA-256:
  `ea13797f10ea3a91df3c0e27c69aeb2315bf8c860099fc010fbd0d8934f1d8ed`.
- Original catalogue canonical hash:
  `89ed0c791e7860fbe26297aaedd1942f3cc338cd28810820a6cec854ddf9fe6c`.
- Policy `context-evidence-prior-v1`, policy hash:
  `443c6a5b4f21d28b61d1bd43fbbf164b83abb77b4dea3a23b5ddf39fc15b7cea`.

The packet contains all18 canonical row hashes and original source hashes,
catalogue-file hash, actual engine and input-module byte hashes, harness hash,
each input hash, policy and selected-source details. Hashes prove local content
integrity, not independent attestation. Catalogue rows are not unique impressions;
distinct prompt IDs are counted separately. No original artifact is rewritten.
Fixture time is explicit and must not be treated as a historical observation
window; catalogue capture time is export provenance.

`contentHash` covers the deterministic packet excluding itself and `measurement`.
Two same-source runs reproduce the full deterministic payload, not only summary
counts. The observedAt/runtime/timing metadata is deliberately outside that hash.
Timing samples cover complete two-arm compare calls, including scoring and bid
arithmetic but excluding loader, harness validation, IO and exchange. One12-call
sequential pass is not a production latency benchmark, throughput measurement
or comparison of individual arm speeds. Consult `measurement` for actual samples.

From this repository, without credentials, DB, wallet or provider access:

```sh
node scripts/demo/evidence-decision-comparison.mjs
node scripts/demo/evidence-decision-comparison.mjs --write
node scripts/demo/evidence-decision-comparison.mjs --check
node --test tests/demo/evidence-comparison.test.mjs
```

Default prints summary only. `--write` writes only the new bounded packet path
(maximum256KiB); it never refreshes evidence. `--check` verifies saved canonical
hash and exact deterministic parity against the current source. Engine/input
module changes deliberately cause drift instead of silently accepting old results.

All10 focused tests passed with0failures/0skips. They check frozen task/count
integrity, reproducibility, runtime-compatible DTOs, requirements and capability
ceilings, selected-source text/hash bindings, exact integer bid policy/caps,
nonaligned fallback, duplicate-association noninflation, instruction-like creative
and depleted-capacity/above-max-floor safety. No positive-history winner or fixed
changed-count expectation is asserted. Stored artifact parity is checked, so
changing an outcome requires explicit regenerated evidence rather than a test
that insists history must improve.

A fresh empty-environment child additionally forbids state-writing functions,
SQLite construction, private-key/signing operations, HTTP/network operations,
fetch and subprocess launches while importing and building the packet. It passes,
and the original evidence file remains byte-identical. The service import loads
the SQLite module (Node emits an experimental warning) but no database/session
is constructed. Zero opportunities are persisted, and no channels, reservations,
deliveries, charges, models, embeddings, upstream queries or wallet operations
occur. This is a no-state/no-wallet counterfactual, not the service's runtime
auction/receipt acceptance evidence. Main owns service/UI integration and review.

Only the four assigned files were changed by this builder. No Git commit, live
API, key access, financial endpoint, deployment or original-artifact write.
