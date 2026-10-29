# Solana settlement/security review preparation

Date: 26 October 2026. Status: **ready for frozen spec; no architecture verdict**.

Review workspace: `/Users/akshat/agentic-dsp/.worktrees/axp-machine-market`.
Reference HEAD: `75c021907744cffc68526d3dc2e331c6b005f249`; the working tree contains concurrent, uncommitted product/prototype work. This HEAD does not freeze those files.
Frozen spec path/version/SHA256: **not yet supplied**. Current `NORTH_STAR.md` and `PLAN.md` are not the audit target.

## Scope and gate

- Independent domain: Solana program, settlement authority, custody, signatures, replay/conflict protection, recovery and local-network containment.
- Preparation consisted of source/document reads and public primary-source research. No dependencies, builds, tests, validator, RPC, credentials, transactions or implementation were run. No other review reports were read and no other threads were messaged.
- Only this preparation document is authored. Applicable root/worktree `AGENTS.md`, README, page map, architecture, reviewer guide and verification matrix were read. Instructions to run verification are superseded by this assignment's explicit preparation-only boundary.
- Implementation remains paused until audit rounds resolve critical/high issues and rights/settlement ambiguity, and the root parent explicitly issues GO. This reviewer cannot authorize implementation. Disk showed approximately 142 GiB available; no large output was generated.

## Reference observations, not findings against the future spec

| Reference | What it establishes for preparation |
| --- | --- |
| `packages/machine-market/core.mjs:100–113,144–161,185–230` | The prototype commits SQLite state, moves internal balances, and chooses acquisition outcomes through fixture fault state. Its `settleChain` function distributes internal trade escrow; it is not a Solana settlement program. Ordinary expiry and issuer-failure refunds are prototype policies requiring fresh specification. |
| `packages/payments/network-adapter.mjs:16–38,171–239,278–325,337–371` | Existing payment-channel code separates accepted charges, signed cumulative vouchers, persisted transaction identities, drain/freeze and finalized payout/refund. Its transport and caller ledger are explicit trust boundaries. These patterns do not establish order authorization or transferable inventory correctness. |
| `packages/payments/native-store.mjs:6–13` and `network-adapter.mjs:84–90` | Queues assume trusted local workers/store objects. They are not a substitute for onchain conflicting-fill prevention or coordination across independent processes. |
| `packages/payments/network-policy.mjs:2–16`; `sdk-transport.mjs:14–40` | Existing environments are fixed Devnet/external sandbox references with genesis/deployment checks. A loopback RPC override does not itself create a new local-validator trust domain. Do not weaken or reuse existing funded-state defaults for this market. |
| `packages/payments/sdk-transport.mjs:74–102,103–119` | Existing transport inspects finality, decoded channel data and token deltas and closes a cumulative channel. It does not supply the new market's instrument, match or issuer-obligation semantics. |

## Frozen-spec checklist and adversarial probes

All entries below are questions to resolve against the supplied freeze, not predetermined requirements to tokenize everything.

| Area | Required specification/evidence | Adversarial probe |
| --- | --- | --- |
| Instrument and obligation | Exact issuer, resource/version, quantity/unit, beneficiary, transfer limits, expiry, delivery promise, failure evidence, refund liability and dispute authority. Distinguish purchase, resale, sponsored access and delivery. | A sells to B, B resells to C, issuer withholds content. Who owes whom, how much, from which still-available collateral? Can expiry erase an already valid claim? |
| Minimum authoritative state | Inventory every account and each mutable field, transition, signer, PDA seed, owner and account size. Identify which onchain record prevents double payment/conflicting entitlement, and which promises remain gateway-enforced. No NFT assumption. | Matcher presents two internally consistent SQLite matches for the same seller right or remaining order quantity. What independently rejects the second? |
| Authorization and delegation | Canonical signed bytes and domain/version; deployment/run identity, order/instrument identity, side, payer, beneficiary, seller, asset, price, quantity, fee bound, expiry, nonce and partial-fill policy. Bind match-specific values or derive them under signed constraints. Specify revocation and cancellation ordering. | Change recipient, fee, resource version or sponsor beneficiary; replay an order after cancellation or into a different deployment; fabricate a matcher assertion. |
| Signature verification | Transaction signers versus detached orders explicitly chosen. If Ed25519 precompile introspection is used, bind the exact verified key/message to the actual action, with bounded offsets, counts and permitted instruction indices. | Include a valid signature on an unrelated message, a wrong instructions account, or a cross-instruction offset pointing to attacker-controlled data. |
| Custody and accounting | Explicit asset/mint/token-program policy; vault authority, deposit/withdrawal powers, source/destination ownership, available versus locked funds, fee/rent payer and conservation equations. Separate SOL fees/rent from token liabilities. | Substitute a different mint/program/vault, reuse one account in conflicting roles, withdraw reserved collateral, or donate unsolicited funds and inflate credited balance. |
| Replay and conflict | Stable economic operation ID independent of transaction signature; order fill quantities/versions, inventory consumption and terminal receipts enforced at the authoritative layer. Account close/recreation and nonce retention specified. | Re-sign the same match with a new blockhash, settle concurrently, settle versus cancel/refund, or close and recreate a receipt PDA to replay old authority. |
| Atomicity | List exactly which effects occur in one Solana transaction, and the recovery protocol across chain, SQLite and protected-content gateway. Explain what finality gates unlock/resale. | Chain succeeds, database commit crashes; database reserves, chain fails; gateway delivers while chain observation later disappears. A content hash cannot force delivery. |
| Refunds and exits | Refund authorization, timeout clock and precedence, payer/sponsor return address, fee treatment, partial settlement and any issuer bond. Define exits if matcher, publisher or beneficiary is offline. | Delivery and refund race; refund goes to beneficiary instead of sponsor; publisher asserts failure after resale proceeds have left escrow; cancel strands funds. |
| Account validation and privilege | Every instruction checks expected program ownership, discriminator/version/length, canonical PDA derivation and stored relationships, signer/writable privileges, executable CPI IDs and recipient constraints. Define upgrade/admin powers. | Fake program-owned data, alternate PDA bump, account substitution/alias, reinitialization, unauthorized CPI target, upgrade that redirects custody. |
| Arithmetic and resource bounds | Checked integer arithmetic, decimal/base-unit encoding, wider multiplication, rounding direction, partial-fill fee rounding, total bounds, fixed/bounded accounts and bounded work. Pin validator/runtime features and transaction format. | Zero/maximum quantities, overflow of price × quantity, split-fill rounding arbitrage, unbounded resale/refund chain, maximum account/packet/compute demand. |
| Confirmation and recovery | Persist exact signed bytes, signature, economic ID and validity bounds before send; explicit unknown states. Verify signature outcome, expected program state and transaction-local asset deltas at the required commitment. Define expiry/replacement and reservation release conditions. | RPC accepts then times out; null/pruned history; stale bank or fork; local restart/reset; later transaction changes balances before reconciliation. No fresh economic operation merely because status is unknown. |
| Local containment | Dedicated local manifest/ledger, pinned genesis/run ID, program identity/build and assets; explicit loopback endpoint policy with no redirects, external fallback, remote clone or inherited wallet/CLI defaults. Identify local RPC/operator trust. | `localhost` points at a proxy, process restarts with a new genesis, endpoint returns the wrong program, or old database/signed orders are reused after reset. A local RPC can lie; a hostname check is not independent chain proof. |
| Trust and product claims | Authority matrix for trader, matcher, issuer, gateway, sponsor, admin and program upgrade key. Separate cryptographic enforcement from attestations and operational trust. | Malicious matcher censors/reorders trades; publisher attests to unavailable content; sponsor attempts to condition payment on a favorable answer. Settlement cannot prove attention/comprehension. |

## Alternatives to evaluate without selecting an architecture now

- **Transaction co-signing vs detached signed orders:** co-signing binds the exact transaction but requires participant availability and re-signing on expiry; detached orders improve asynchronous matching but need rigorous canonicalization, fill/cancel state and onchain signature binding.
- **Per-trade escrow vs shared account vault:** isolated escrows simplify liability attribution at account/rent cost; shared vaults reduce account overhead but require independently enforced available/locked balances and careful concurrency limits.
- **Onchain entitlement state vs issuer/gateway commitments:** onchain versions can reject conflicting ownership transitions; an offchain issuer can keep private rights and inventory but must explicitly accept the consistency, enforcement and availability obligations. Neither makes protected bytes or answer quality atomically deliverable.
- **Immediate matched-trade payment vs conditional delivery escrow:** immediate payment settles a contractual right with issuer performance risk; delayed escrow retains recovery funds but requires a precise adjudication/timeout model and bounded resale liabilities. Reusing cumulative channels needs a demonstrated equivalence to the chosen trade obligations, not just an existing integration.

## Primary-source basis

Sources accessed 26 October 2026; links are reference material, not permission to execute their examples.

- [Programs](https://solana.com/docs/core/programs) and [Accounts](https://solana.com/docs/core/accounts): mutable state lives in data accounts; ownership and upgrade authority matter. Review inference: executable identity alone is insufficient to establish immutable custody rules.
- [PDAs](https://solana.com/docs/core/pda): deterministic derivation and program signing through `invoke_signed`. Review inference: derive and validate expected seeds/relationships; do not equate a PDA address with validated business authority.
- [Transactions](https://solana.com/docs/core/transactions): instruction state changes are atomic within a transaction, while failed execution can still incur fees. Review inference: database/content effects need a separate recovery protocol. Runtime feature-dependent limits must be pinned, not copied indiscriminately from a current documentation table.
- [Ed25519 precompiles](https://solana.com/docs/core/programs/precompiles): verification uses referenced signature/key/message byte offsets. Review inference: merely finding a successful verification instruction does not bind it to this trade.
- [Token transfers](https://solana.com/docs/tokens/basics/transfer-tokens): transfers operate on accounts for the same mint; checked transfers verify mint/precision, and authority/delegation rules vary by token program. Review inference: explicitly support or reject extensions and their extra authorities/fees.
- [sendTransaction](https://solana.com/docs/rpc/http/sendtransaction), [getSignatureStatuses](https://solana.com/docs/rpc/http/getsignaturestatuses) and [confirmation/expiration](https://solana.com/developers/cookbook/transactions/confirmation): RPC acceptance is not confirmation, history lookup is distinct from the recent cache, and blockhash validity needs explicit handling. Review inference: timeout/null is uncertainty, not permission to repeat the economic trade.
- [Anza test validator](https://docs.anza.xyz/cli/examples/test-validator/): local single-node cluster, genesis verification, configurable ledger retention and runtime features. Review inference: freeze the local run identity and features; localhost success does not establish public-network/fork resilience.

## Intake and reporting protocol

1. Receive the same exact spec path, version and SHA256 supplied to all independent reviewers; compute the hash locally and stop on mismatch. Freeze/hash any normative referenced appendices too, or identify them as unpinned dependencies.
2. Review independently before reading any other reviewer conclusions. Map each instruction and lifecycle to the obligations, authority, accounting and recovery tables above.
3. Round 1 report in this directory will give stable finding IDs, severity, exact spec/code/source evidence, concrete adversarial counterexample, alternatives/tradeoffs, remediation, residual risk and explicit bounded verdict. Missing information preventing a judgment will be stated, not assumed safe.
4. Round 2 will hash the revised freeze, inspect shared dispositions, verify each closure and revisit cross-layer invariants. A disposition or new prose alone is not proof that the counterexample is eliminated. Architectural closure will remain distinct from later implementation/test evidence.

**Preparation complete. Awaiting frozen-spec assignment. No implementation approval or architecture/security verdict issued.**
