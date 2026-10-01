# Connected baseline runbook (P1, not the full MVP)

From /Users/akshat/agentic-dsp using the installed Node 25:

```sh
node --test
node scripts/demo/run.mjs
node apps/backend/server.mjs
```

Enable the separate existing-DB evidence panel without changing upstream code:

```sh
AXP_CORPUS_DB=ads node apps/backend/server.mjs
```

Docker `adsdb` must already be running. The adapter makes bounded READ ONLY
queries and never starts/reconfigures source services. In the ContextHint evidence
panel try `AI agent travel booking automation`. Cache misses are explicitly
unavailable; no vectors are generated. Retrieval changes no campaign/payment
state and is not yet the actual buyer's targeting integration. See
docs/DB_REUSE_PHASES.md for the revised existing-data-first sequence.

Open http://127.0.0.1:8788. Submit the default task. Inspect eligible bidders,
off-target rejection and first-price winning amount. The reference app inserts
an actual Sponsored card and submits its observed insertion/disclosure fields.
Publisher backend signs its assertion; only accepted receipt creates a charge.

Run another legitimate turn to accumulate on the same channel. Synthetic
authorize/close buttons show cumulative accounting and unused balance. These
are NOT MPP vouchers, Devnet transfers or paid model calls. The CLI evidence uses
fixture render acknowledgements, not DOM observations; browser evidence must be
captured separately. Receipts do not prove human viewership or absorption.

Rules and shared DecisionEngine rules are deterministic, not trained ML.
Codex option performs a real invocation only if that runtime supports the
configured model; errors remain unavailable, never silently become rules.
Organic rules output is reference guidance, not a real LLM answer.

Create a new campaign version through JSON or pause a campaign. Initial channels
are fictional and synthetic. Start a fresh run preserves prior SQLite rows.
Existing receipt key is a local publisher identity, NOT the disposable Solana
wallet. Keys/state remain in ignored local-state/demo; public report omits them.

This gate proves the connected baseline only. Actual corpus/embeddings/Jev,
actual organic/model behavior, actual payment channel, complete recording and
final frontend handoff remain open under BUILD_PROGRESS.md.
