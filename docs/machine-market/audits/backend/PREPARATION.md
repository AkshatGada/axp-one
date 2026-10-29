# Backend review preparation — 26 October 2026

Status: **ready for frozen specification; no architecture verdict issued**.

Domain: backend consistency, crash recovery and adversarial acceptance. This is
an independent preparation checklist, not a review of another reviewer's work.
Implementation remains gated: multiple audit rounds must resolve critical/high
issues and rights/settlement ambiguities, and the root parent must explicitly
issue GO. This reviewer cannot authorize implementation.

## Scope and evidence boundary

- All repository reads and this sole document write used
  `/Users/akshat/agentic-dsp/.worktrees/axp-machine-market` explicitly. The initial
  project working directory was not changed. No agents or other chats were contacted.
- Read root `AGENTS.md`, README, page map, architecture, reviewer/verification
  guides and relevant prototype contract/code. The current PLAN/NORTH_STAR are
  not treated as a frozen audit target. No other reviewers' reports were read.
- Only local source inspection and public primary-source documentation research
  occurred. No installation, build, test execution, validator/RPC call, signing,
  credentials, feature edits, push or deployment occurred. Disk observation was
  142 GiB available, above both the assigned 40 GB and repository 50 GiB floors.
- Existing dirty/untracked work is preserved. Git HEAD was
  `75c021907744cffc68526d3dc2e331c6b005f249`; this does not identify uncommitted
  prototype contents. Relevant inspected file SHA-256 values:

| File | SHA-256 |
| --- | --- |
| `packages/machine-market/core.mjs` | `1d4634d38903f67a48638a98f732011bc3ae1ebccc017187ed1fc7cf7bdfcb92` |
| `packages/exchange/index.mjs` | `b4f40caba8b8e1bed7397e82a743e1b1f1aa16b96615f81a13cb7287efcb6c00` |
| `packages/publisher-sdk/index.mjs` | `b66ed6cfd01ee515bc4d52478ebb166f65d5f74bf3ec494d06982345dcbaa328` |

## Reference observations, not findings on the future specification

1. `packages/machine-market/core.mjs:99–113` reloads one JSON state inside
   `BEGIN IMMEDIATE`, checks invariants and commits; `:207–230` reserves inventory
   and funds but selects a synthetic outcome from fixture faults. This is a useful
   local concurrency reference, not a Solana transaction/outbox implementation.
2. `core.mjs:417–424` binds actor/key to a type/payload hash and checks redemption
   ownership before replay; `:271–292` and `:444–453` persist private delivery
   responses with consumption. These are useful recovery patterns, but a database
   commit cannot atomically commit an external blockchain effect or HTTP receipt.
3. `core.mjs:124–140` reserves storage for delivery and closure. The frozen design
   needs a new bound for its own journals, match fanout and uncertain transactions;
   copying prototype constants is not an argument for sufficient capacity.
4. `packages/exchange/index.mjs:12–22` supplies durable request keys and a local
   transaction wrapper. `:111–125` binds a signed receipt to the award/creative/
   publisher/channel and deduplicates charges. Its ad insertion semantics differ
   from transferable obligations and matched machine-access trades.
5. `packages/publisher-sdk/index.mjs:130–145` separates a failed request from
   read-only saved-result lookup. `tests/product/publisher-recovery.test.mjs:38–83`
   contains lost-response, restart, credential-revocation and unknown-admission
   cases. They were inspected as examples, not executed or credited as evidence
   for this market.
6. `packages/machine-market/api.mjs:110–113` explicitly uses selectable demo
   actors. It is not proof of authenticated trading authority. The frozen spec
   must state its localhost trust boundary and bind authorization accordingly.

## Frozen-spec intake requirements

- Receive the exact same path, version and SHA-256 as all independent reviewers;
  verify bytes locally and record the digest. Identify normative appendices,
  schema/API/program references and their versions. A mutable link is insufficient.
- Obtain the instrument/issuer obligation table, order and match rules, state
  machines, DB constraints, Solana settlement contract, recovery algorithm and
  acceptance matrix. Missing decisions remain explicit uncertainties.
- Keep off-chain order books, reasoning and private content valid design choices;
  do not require tokenization unless it solves a stated enforcement requirement.
  Require genuine Solana matched-trade settlement eventually demonstrated on a
  localhost validator. No simulated balance label can substitute for that proof.

## Review checklist and adversarial probes

| Area | Required specification and invariant | Counterexample to attempt |
| --- | --- | --- |
| Authority | Name the source of truth for cash escrow, spendable collateral, inventory, owner, order/fill, delivery and cancellation; define projection lag and reconciliation precedence. A read model must not authorize an effect. | Restore an older DB snapshot after a finalized trade; attempt to spend the apparent restored balance or resell the restored right. |
| Tradable obligation | Bind issuer, instrument/version, quantity/unit, eligibility, beneficiary, transfer limits, delivery deadline, expiry, refunds and enforceable remedy. Define whether settlement buys a right or pays for completed delivery. | Issuer sells identical scarce inventory through two venues, then cannot deliver; identify who bears the shortfall and what the backend can actually enforce. |
| Reservations | Linearization point and durable constraints for reserve, partial fill, release and recovery; shared collateral must not back concurrent orders beyond its available amount. | Two processes reserve the last unit or same buyer collateral from stale reads, each with a different request key. |
| Matching | Deterministic price/time rules, partial fills, self-trades, replacement priority, expiry, rounding and fees; accepted quantities conserve supply and escrow. | Cancel and match race; a replacement changes quantity/price while a matcher uses the old version; fragmented fills exploit rounding or exhaust fees. |
| Idempotency | Principal/market/operation scope, canonical payload and version binding, uniqueness constraints, retained result and authorization before replay. Durable economic obligation ID must be separate from transport-attempt ID. | Reuse a key with a changed beneficiary/mint/amount; send identical economic orders under fresh keys; replay a pre-revocation result. |
| Durable effects | One atomic DB decision persists reservations, immutable obligation and outbox; exact signed bytes/signature are durable before send. Specify every crash boundary and recovery owner. | Chain executes, process dies before DB commit, replacement worker signs again; DB says failed while the original transaction later finalizes. |
| Multi-process recovery | Persistent claims/fencing, stale-worker handling, retry budget, backoff, fairness and journal retention. A lease alone cannot unsend a signed transaction. | Worker A pauses after signing, B takes its lease, A resumes broadcasting; require on-chain replay/obligation protection or a proof that a second payable attempt is impossible. |
| Expiry/finality | Distinguish transport error, execution error, unknown, expired-unlanded and finalized success; define commitment, blockheight/history evidence and replacement preconditions. | RPC status is absent from recent cache or HTTP response is lost; timer releases reservation, old transaction lands or is later discovered. |
| Cross-layer races | State allowed for cancel, settle, refund, withdraw, redeem, transfer and expiry; commit conditional transitions against current versions. | Cancel releases buyer collateral during pending settlement; seller withdraws before a still-valid fill; delivery occurs while refund is pending. |
| Private delivery | Authenticated owner and instrument version checked at retrieval/replay; exact private response persisted before exposure; explicit retry/expiry/revocation semantics. | Old owner with cached URL/key fetches after transfer, or response is lost after consumption and retried; ensure one economic consumption with defined byte recovery. |
| Resource bounds | Bounded outstanding orders, fills, outbox attempts, payloads, receipt storage, lock time and reconciliation work; reserve cleanup capacity before admission. | Flood unique keys or tiny partial fills, pin a WAL reader, fill disk or keep obligations unknown until closure has no storage. |
| Privacy/security | Field-level API/log/event visibility, scoped capabilities, signing isolation, network/program/mint binding and rate limits. Hashes are not confidentiality for guessable content. | Cross-owner operation lookup, payload guessing through public hashes, untrusted issuer content steering an agent into a payment or signer action. |

Sponsor funding must not require a favorable answer or positive assessment.
Payment, receipt, access, delivery and comprehension are different claims. Review
any delivery oracle, trusted issuer or operator decision as an explicit trust
assumption, including who can dispute it and whether a refund is collateralized.

## Alternatives to compare when the frozen design arrives

- Single local DB writer simplifies serialization; multiple workers need durable
  claims and conditional updates. Neither makes a chain effect atomic with a DB.
- Pre-funded escrow can bound settlement risk but locks capital. Payment at match
  needs explicit nonpayment and inventory-release semantics. Neither resolves
  issuer delivery risk without a remedy and stated trust model.
- An on-chain consumed obligation identifier prevents economic replay across
  new signatures; it costs state/rent. Exact-byte retransmission prevents creating
  a new signed attempt, but does not by itself solve safe blockhash replacement.
- Batch settlement reduces overhead but requires defined atomicity/failure scope,
  partial recovery and allocation of fees; individual trades simplify attribution
  at higher transaction cost. Choose based on the specified instrument and bounds.

## Required acceptance evidence after explicit GO

No tests are executed in preparation. The eventual evidence plan must include:

1. **Properties/model:** conservation by asset, no negative available balance,
   no oversold inventory, matched quantity bounded by order quantity, unique
   economic settlement, authorization and terminal-state monotonicity. Generated
   adversarial schedules need seeds and minimal failing traces.
2. **Real DB concurrency:** independent OS processes/DB handles racing reserve,
   match, cancel, expiry, redemption and reconciliation. Check allowed sequential
   histories and durable state after restart, not only final row counts.
3. **Fault injection:** kill before/after each journal commit, signing, broadcast,
   chain execution, observation, projection commit and response; also busy/full
   disk, pinned WAL reader, stale worker, lost/duplicated/reordered responses and
   rollback restoration. Preserve original attempt identities and obligations.
4. **Local-validator settlement:** pinned source/program binary digest and local
   genesis identity; actual matched trade, finalized transaction, decoded relevant
   program state and token deltas, including fees/rent separately. Exercise replay,
   conflicting match/cancel, wrong signer/mint/program/beneficiary, expired attempt
   replacement and chain-success/DB-failure recovery through the real backend.
   Program mocks or reference tests alone cannot prove this integration.
5. **Delivery/auth:** lost response recovers permitted exact bytes without another
   charge; revoked/old owner and cross-tenant replay fail; content/version mismatch
   and issuer failure follow the specified remedy. No private bytes in projections,
   error bodies, event logs or public chain accounts.
6. **Bounded operations:** measure queue/DB/lock/storage growth at declared limits,
   retain enough capacity to reconcile/refund/close, and show a read-only status
   request causes no model call, signing, broadcast or hidden state transition.

Record test commands, source/spec digests, seed, environment, expected/observed
states and sanitized artifacts. Separate fixture, DB-process and local-validator
evidence. A single validator cannot establish public-network performance,
independent-provider consistency, adversarial consensus safety or production scale.

## Primary-source anchors consulted

- [Solana sendTransaction](https://solana.com/docs/rpc/http/sendtransaction): an
  accepted submission is not confirmation; retain the original signature.
- [Solana confirmation and expiration](https://solana.com/developers/cookbook/transactions/confirmation):
  use blockhash lifetime and appropriate confirmation evidence, not a wall-clock
  timeout as proof of failure.
- [Solana getSignatureStatuses](https://solana.com/docs/rpc/http/getsignaturestatuses):
  recent-cache lookup has limited history; a missing status is not independently
  sufficient evidence to release liabilities.
- [SQLite transactions](https://www.sqlite.org/lang_transaction.html) and
  [WAL](https://www.sqlite.org/wal.html): explicit transaction boundaries and
  writer contention matter; WAL has same-host and checkpoint constraints and does
  not supply cross-system atomicity.

## Report contract for the next rounds

Round 1 will report each finding's severity, exact frozen-spec/code/reference
evidence, concrete adversarial trace, alternatives/tradeoffs, remediation and
residual risk, followed by an explicit bounded verdict, never a security guarantee.
Critical/high unresolved correctness or authorization failures block a positive
recommendation. Material unspecified rights/settlement behavior is a decision gap,
not an assumption to silently fill in.

Round 2 will check revised frozen bytes, each original finding and the shared
dispositions for actual closure, regressions and cross-layer consistency. A
disposition saying "accepted" without a changed invariant or explicit residual
trust boundary is not closure. Only the root parent can issue implementation GO.
