# C06 adviser packet

Planning proposal returned by gpt-6.1-sol high thread
01a0f27e-c899-70f1-a30d-4bc75ed55c90. Orchestrator reconciliation in
COMPONENT_PLAN_REVIEW.md takes precedence over conflicting proposals. No spending
authorization is supplied by this packet.

**C06 payment component packet v0.1 — proposed for orchestrator reconciliation**

Planning only. No repository edits, installations, wallet/key reads, transactions, funding, pushes or deployments occurred. Public upstream source was read to resolve the SDK choice and clarify adapter requirements. No protocol tests were executed.

**1. Purpose and non-goals**

C06 converts C05’s immutable, accepted delivery charges into advertiser-signed cumulative payment authorization, then reconciles channel settlement and unused-deposit recovery.

The required demonstration is two accepted placements on **one advertiser-to-publisher channel**, with charges `100` and `250`, cumulative vouchers `100` then `350`, and closure using the saved `350` voucher without additional spend.

Non-goals: custom channel-program development, mainnet, automatic top-ups/refunds, pooled custody, multiple publishers or revenue splits, production fraud prevention, x402 exact integration, stream/token billing, and proof of human attention. Deposit is collateral; it is not advertising spend.

**2. Research, provenance and SDK artifact decision**

Reuse the completed findings in `/Users/akshat/agentic-dsp/docs/research/MPP_FEASIBILITY_REPORT.md`. This packet adds targeted source verification; it does not repeat deployment research or claim current chain compatibility.

**Selected artifact: a source-built `@solana/mpp` package from the immutable PayKit commit `c294f8903f18efc746584e3cc2961d6033b8365c`.** Its package declares `0.11.0`. Do not install npm `latest`, presume a published `0.11.0` artifact exists, or switch to the previously inspected npm `0.7.0` package without a recorded contract revision. The inspected source exports the client and server interfaces needed by this proposal. [Package manifest](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/package.json), [client exports](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/client/index.ts), [server exports](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/server/index.ts).

Build provenance must retain:

| Item | Pin or requirement |
|---|---|
| SDK source | PayKit commit above; `typescript/packages/mpp` |
| Package manifest SHA-256 | `906817cfd7e04994f9667d3a4b4d3bad676945a66c4aa78af978038d7d3b0b01` |
| Upstream lockfile SHA-256 | `58a00a82f021fdb06dbba0d8114f02c1770a19dfd92d26711741648429db749d` |
| Recorded upstream tooling | Node engine `>=22.13.0`; `pnpm@11.13.0` |
| Relevant locked dependencies | `@solana/kit@6.10.0`, `mppx@0.8.15`; compiler resolution `typescript@5.9.3` |
| License | MIT; retain upstream notice |
| Built artifact | Future package archive SHA-256 and exact runtime version; currently unavailable |

Use an isolated, filtered SDK build after approval. The full workspace lockfile also contains unrelated local x402 archive dependencies; do not expand the spike into a whole-workspace build or replace missing dependencies silently. A filtered build failure is an artifact gate failure. [Workspace manifest](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/package.json), [lockfile](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/pnpm-lock.yaml), [license](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/LICENSE).

The following source findings inform the adapter:

- `ActiveSession.prepareVoucher(total)` signs an absolute cumulative total without advancing local state; `recordVoucher` advances state after acceptance. Use these explicitly. [Client session implementation](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/client/Session.ts#L593).
- The SDK commit permits an increment **up to** the reservation amount. AXP must enforce equality between the charge and increment before commit and verify equality in the returned receipt. [Commit implementation](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/server/Session.ts#L1216).
- The pinned signed voucher is 50 bytes: version magic, channel address, cumulative amount and expiry. AXP receipt/charge commitments remain separate. [Voucher encoder](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/shared/voucher.ts).
- The server close handler accepts replay of the current highest valid voucher. `ActiveSession.closeAction(finalIncrement)` instead signs an increment; do not use that convenience helper. [Close verification](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/server/Session.ts#L1019), [client close helper](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/client/Session.ts#L730).
- SDK session storage defaults to memory. Its submission helper returns a broadcast signature, which is insufficient evidence of finalized settlement. [Store contract](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/server/session/store.ts), [submission helper](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/server/session/on-chain.ts#L1024).

**3. Concrete protocol decisions**

1. One advertiser payer, one owned publisher payee, one channel; payer and payee must differ. Empty distribution splits and zero AXP network fee.
2. Advertiser-side bounded signer controls client-signed vouchers. Buyer agents, browsers and publisher receipts cannot invoke arbitrary signing.
3. C05 accepts the receipt and creates the charge first. Only then does C06 create an SDK metering reservation using the immutable charge ID and exact amount.
4. Ad retrieval, opportunity creation, bidding, awards, candidate reads and failed/rejected render events never advance a voucher.
5. Serialize authorization per channel. Process charges in a durable sequence assigned during charge acceptance; do not use timestamp ordering.
6. For a new charge:  
   `newCumulative = previousAuthorizedCumulative + exactChargeAmount`.
7. Retry preserves charge ID, protocol delivery ID, cumulative total, expiry, signed payload and signature. Never create a replacement charge or larger authorization to resolve uncertainty.
8. Store signed voucher bytes privately before protocol submission. Export hashes and correlated IDs, not signing material.
9. Close only after outstanding awards drain and every accepted charge is authorized. Freeze the ledger watermark and reuse its saved final voucher.
10. Uncertain or inconsistent signing, commit, open or settlement outcomes block new awards and financial advancement until reconciliation.

The signed voucher itself does not bind all application terms. The signer verifies the channel’s immutable network, mint, payer, payee, signer and deposit terms, and signs a separate application ledger commitment linking the voucher watermark to accepted charge IDs. The chain does not verify advertising receipts.

**4. Devnet compatibility gate**

Proposed configuration, pending compatibility evidence:

| Field | Proposed fixed value |
|---|---|
| Application mode | `devnet` |
| SDK network | Explicit `devnet`; reject defaults |
| RPC | Explicit approved Devnet endpoint; record observed genesis hash |
| Channel program | `CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX` |
| Test-USDC mint | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| Token program | `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` |
| Decimals | Require observed `6` |
| Treasury | Unresolved deployed identity; must match SDK-built distribution accounts |
| Payer | Previous authorized disposable Devnet wallet; public identity unverified here |
| Payee | Owned publisher identity, separately frozen and different from payer |

The mint and token-program candidates come from pinned SDK constants. Supply the explicit mint address rather than allowing currency resolution to fall back to another network. [Network constants](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/constants.ts).

The SDK distribution builder embeds treasury owner `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP`. The separately inspected payment-channel source has a Devnet treasury placeholder and build guard. Neither identifies the treasury used by the actual Devnet deployment. [SDK treasury](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/server/session/on-chain.ts#L90), [program cluster constants](https://github.com/solana-foundation/payment-channels/blob/3ffa4d6728ad88e4a9667a76ad9ccd68a302c696/program/payment_channels/src/constants.rs#L78).

Require a compatibility report with one of:

`unverified → compatible | incompatible | blocked`

`compatible` requires evidence covering **open, voucher verification, settle/seal, distribution and reclaim**, including:

- Devnet genesis identity and finalized observation slot.
- Executable program, loader/program-data identity and deployment byte hash.
- Credible deployed-version/IDL relationship to the SDK instruction and account encoders.
- Deployed treasury identity and canonical treasury ATA.
- Mint owner/decimals and payer/payee token-account mint, owner and address derivation.
- Ed25519 voucher signer support, positive deposit/grace and expected account constraints.
- No missing required account or unsupported instruction.

Program presence alone does not pass this gate. A failed treasury/account simulation does not authorize patching the SDK, deploying a program, changing the mint or substituting sandbox.

**5. Versioned input/output interfaces**

Application adapter version: `axp.payment-adapter.v1`.

Every record uses the shared envelope: `schemaVersion`, `id`, `runId`, `mode`, `correlationId`, `createdAt`. Money uses unsigned decimal strings and integer arithmetic, bounded to the protocol’s `u64`; reject floats, negatives, overflow and implicit conversion.

Application records use `channelId`. Retain `protocolSessionId` separately where needed by provider messages.

Required inputs:

- **ChannelTerms:** advertiser/campaign/run bindings, network/genesis, program, mint/token program/decimals, payer, payee, authorized signer, rent/fee payer, deposit ceiling, zero-fee policy, grace, idle timeout, application deadline, voucher expiry and compatibility-report hash.
- **OperatorApproval:** immutable approval ID, terms hash, deposit ceiling, accepted-charge ceiling, transaction/fee/rent limits and execution deadline. Wallet reuse is not this approval.
- **AcceptedChargeRef:** charge ID, durable sequence, award/delivery/campaign IDs, channel ID, exact amount, accepted-receipt hash and immutable ledger-record hash. C06 rereads the authoritative ledger; request fields alone are insufficient.
- **VoucherIntent:** previous/target cumulative amounts, charge sequence, ordered-charge commitment, terms hash, fixed expiry, canonical payload hash and private signed-payload reference.
- **SettlementIntent:** frozen sequence/total, final voucher hash, approval ID and immutable transaction-attempt identity.

Proposed adapter methods are **AXP interfaces**, not claims that identically named SDK functions exist:

| Method | Input → output and authority |
|---|---|
| `prepareOpen` | Terms + approval → immutable unsigned open plan, expected channel identity, account/instruction hashes and fee/rent estimate; no signing/broadcast |
| `confirmOpen` | Approved persisted attempt → same signed transaction submitted or looked up; `submitted`, `finalized`, `failed` or `unknown` |
| `getChannel` | Channel ID → local lifecycle, observed chain state/slot and financial totals; read-only |
| `authorizeCumulative` | Accepted charge reference + intent ID → persisted voucher/commit outcome; worker-only |
| `lookupAuthorization` | Intent/charge ID → matching durable SDK commit and payload identity, absent, inconsistent or unknown; no signing |
| `prepareClose` | Frozen settlement intent → native close action carrying saved final voucher and bounded transaction plan; no new voucher |
| `confirmClose` | Approved persisted close attempt → submit/lookup same transaction and report observed result |
| `reconcile` | Operation/attempt ID → evidence and proposed durable state update; no new purchase, deposit or increment |
| `prepareReclaim` | Finalized channel + observed eligibility + approval → reclaim plan; execution remains separately bounded |

Guard the SDK’s delivery/commit routes as internal worker surfaces. They must not accept publisher-selected prices or arbitrary vouchers. Use native protocol structures inside that boundary.

Minimum output fields include `status`, `reasonCode`, immutable IDs, expected/observed amounts, source/config hashes and evidence references. A returned transaction signature is labelled `submitted` until chain verification establishes finality.

Additional errors:

`compatibility_unverified`, `artifact_unavailable`, `approval_missing`, `terms_mismatch`, `charge_not_accepted`, `charge_amount_mismatch`, `authorization_conflict`, `voucher_invalid`, `voucher_expired`, `cap_exceeded`, `close_not_drained`, `settlement_amount_mismatch`, `reclaim_not_eligible`, `reconciliation_required`.

**6. States, persistence and lifecycle**

Keep the shared channel phases:

`pending_open → open → draining → closing → finalized`

Use `unknown` with the last known phase and operation ID; never release collateral or create a replacement channel because an acknowledgement is missing.

Keep the shared charge lifecycle:

`accepted → authorization_pending → authorized → settlement_pending → settled`

Voucher-intent detail:

`prepared → signed_persisted → commit_pending → committed`

An uncertain outcome carries `reconciliation_required`. Signing already creates an authorization obligation even before server commit; reports must expose that distinction.

Required durable state includes application intents/outbox, private payload references, SDK session state, pending/committed deliveries, highest voucher, opening challenge identity, channel terms and transaction attempts. Implement the SDK `SessionStore` contract with restart-safe storage. Reject newer unsupported SDK state schemas and preserve provider fields according to its store contract. [SDK store requirements](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/server/session/store.ts).

Use one payment worker and per-channel serialization for this local MVP. Short SQLite transactions persist intent and results; no database writer lock spans signing or RPC. The SDK can perform RPC inside an asynchronous store mutator, so the store bridge and submission wrapper must be tested explicitly for this boundary.

Proposed demo settings:

- Idle timeout: `3600` seconds.
- Application run deadline: `1800` seconds after opening.
- Voucher expiry: fixed at run start plus `7200` seconds.
- Grace and settlement-window margin: `60` seconds.

These are proposed settings, subject to compatibility and operator approval.

A long timeout alone does not protect closure. The SDK idle watchdog can initiate close without draining AXP awards. The adapter store must reject a close-pending transition unless AXP has frozen a drained watermark, record `idle_close_requested`, and route it through the orchestrator’s drain procedure. Broadcast guards must also require a persisted approved settlement intent. If these guards cannot coexist with the pinned SDK lifecycle, the spike fails. [SDK idle lifecycle](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/server/session/lifecycle.ts).

**7. Protocol pseudocode**

```text
authorizeCharge(chargeId):
  serialize work for the channel

  charge := reread immutable C05 ledger record
  require accepted receipt, unique charge and matching frozen channel terms
  require channel open, or draining an already-awarded obligation
  require no unresolved earlier authorization
  require compatibility and authority appropriate to actual mode

  if charge already authorized:
    return stored result without reserve/sign/commit advancement

  reconcile any existing intent before preparing another

  previous := last committed authorized cumulative
  target := previous + charge.amount
  require target equals sum of ordered accepted charges through this charge
  require target <= approved charge cap and confirmed deposit
  require charge belongs to frozen campaign/run/payee/mint bindings

  persist VoucherIntent(previous, target, chargeId, fixedExpiry)
  obtain or recover SDK reservation:
    protocol deliveryId = charge.id
    reservation amount = exact charge.amount

  require reservation identity, currency and amount match

  signed := retrieve persisted signed voucher
            or bounded signer prepares target and persists its exact bytes

  require signed.channelId == channelId
  require signed.cumulative == target
  require target - previous == charge.amount
  require signed expiry and signature satisfy pinned verifier

  persist commit outbox before protocol submission
  commit the same deliveryId and saved signed voucher

  require receipt deliveryId/channel/amount/cumulative all match intent
  atomically mark intent committed and charge authorized

  advance or reconstruct ActiveSession watermark from durable state
  return authorized result
```

```text
closeChannel(channelId):
  atomically stop new awards and enter draining
  allow valid existing awards to complete or expire
  finish or reconcile all accepted-charge authorizations

  atomically require:
    zero outstanding award reservations
    zero unresolved authorizations
    accepted total == authorized total == SDK committed cumulative

  freeze ordered-charge watermark and enter closing
  load saved final voucher
  require voucher matches frozen total and retains settlement margin

  prepare native { action: "close", channelId, voucher: savedFinalVoucher }
  do not call closeAction(finalIncrement)
  persist approved signed transaction identity before broadcast

  submit or reconcile that exact attempt
  require finalized transaction without execution error
  verify channel state and token payout/refund against frozen obligations
  mark settlement finalized only after reconciliation

  prepare reclaim only when observed program conditions permit
  keep rent recovery separate from token refund
```

If a signer result is lost, preserve the immutable payload intent and stop advancement until its identity is recovered or safely reconciled. If acknowledgement is lost after commit or broadcast, query first. Never regenerate a larger total, replace a funded channel or purchase another delivery.

**8. Deterministic no-value fixtures**

All fixtures use `mode=synthetic`, no RPC/broadcast capability and test-only signing material unrelated to the existing wallet. Mock account identities must be visibly synthetic. Crypto fixtures use valid encoded public keys and deterministic test signatures; they cannot serve as network evidence.

Freeze:

- Clock `T0 = 2,000,000,000` seconds, explicitly a fixture clock.
- Run `c06-fixture-v1`, advertiser `adv-01`, publisher `pub-01`.
- One channel, campaign budget/deposit/charge cap `"1000"`.
- `charge-001`: accepted receipt at `T0+10`, amount `"100"`, sequence `"1"`.
- `charge-002`: accepted receipt at `T0+20`, amount `"250"`, sequence `"2"`.
- Voucher expiry `T0+7200`; close at `T0+30`.
- No splits, fees or unrelated token movements in synthetic arithmetic.

| Fixture ID | Inputs/action | Expected outcome |
|---|---|---|
| C06-F01 | Candidate fetch, award only, failed render, expired or invalid receipt | No charge-driven reservation or voucher; cumulative `0` |
| C06-F02 | Accept and authorize `charge-001` | Increment `100`, cumulative `100`, one authorization |
| C06-F03 | Authorize `charge-002` on same channel | Increment `250`, cumulative `350`; never `450` |
| C06-F04 | Retry first charge, including concurrent calls | Same stored result; cumulative unchanged |
| C06-F05 | Lose commit acknowledgement; restart both adapter sides | Recover same payload/delivery identity; no additional increment |
| C06-F06 | Reserve `250`; attempt cumulative `349` from `100` | Reject `charge_amount_mismatch`, although SDK alone permits undercommit |
| C06-F07 | Same reservation; attempt cumulative `351` | Reject overcommit; retain prior state |
| C06-F08 | Wrong channel/signer, tampered signature, expired voucher, decreasing total or total `1001` | Reject without state advancement |
| C06-F09 | Close after two authorized charges | Saved `350` voucher; zero new payment-voucher signing calls; synthetic payout `350`, refund `650` |
| C06-F10 | Close with outstanding award, pending authorization or unknown commit | `close_not_drained` or `reconciliation_required`; no broadcast |
| C06-F11 | Receipt admission races close freeze | Charge included before freeze, or rejected afterward; never omitted from a closed watermark |
| C06-F12 | Lose close acknowledgement; restart | Lookup same transaction identity; no new close payment or channel |
| C06-F13 | SDK idle close while obligations remain | Guard blocks close transition/broadcast and requests draining |
| C06-F14 | Near-expiry saved final voucher | Closure rejected visibly; no extra increment to refresh it |
| C06-F15 | Mainnet RPC/genesis, different mint/token program/payee or incompatible treasury | Compatibility/configuration rejection before signing/broadcast |
| C06-F16 | Reclaim before/after simulated eligibility | Before: blocked. After: bounded plan; rent distinguished from token refund |

Conservation assertions:

```text
accepted charges + outstanding reservations <= min(campaign cap, deposit)
authorized cumulative <= accepted charges <= approved charge ceiling
settled amount <= authorized cumulative

after successful fixture close:
accepted = authorized = settled = 350
publisher payout = 350
unused token refund = 650
deposit = payout + refund = 1000
```

Authorization is another state of the same charge; do not subtract it again from available budget.

**9. Bounded future feasibility spike**

This is a prescription, not authorization to execute.

**Stage A — artifact and offline protocol gate**

After planning approval, build only the selected SDK artifact in an isolated disposable workspace. Record runtime, dependency closure, license and archive hash. Run the frozen no-value fixtures using the pinned client encoder and guarded server reserve/commit/close handlers.

Pass requires dynamic exact increments, receipt gating, durable restart/replay, saved-voucher close and controlled idle closure. Stop on a material failure; fix it and perform one focused recheck.

**Stage B — read-only Devnet gate**

Without wallet-key access or transaction submission:

1. Obtain the existing wallet’s public address from an explicitly public prior record or the operator; do not derive it by opening key/config files.
2. Query Devnet genesis, finalized program/program-data metadata, deployment hash, mint metadata and public token-account balances.
3. Establish deployed ABI, voucher format and treasury compatibility through trustworthy deployment/version evidence.
4. Derive and validate required channel/token/treasury account identities.
5. Record `compatible`, `incompatible` or the exact remaining blocker.

Historical exact-payment success is evidence about that prior flow, not channel compatibility.

**Stage C — build/simulation gate**

After approval to run the spike, prepare expected open/settle/distribute/reclaim instructions and conduct supported simulations with no broadcast and no existing-wallet signing. Label each result `simulation`.

If account prerequisites require funding, or simulation requires the existing key, stop at that boundary. Simulation cannot prove finalized settlement or refund.

**Stage D — optional bounded real Devnet evidence**

Only after all prior gates pass and a new operator approval specifies exact deposit, charges, transaction count, fee/rent ceilings and deadline:

- One channel; deposit ceiling `1000` base units.
- Exactly two accepted test charges: `100` and `250`.
- Cumulative vouchers `100 → 350`.
- One successful open and one cooperative close/distribute; at most one separately approved reclaim.
- No additional transaction identities or automatic retries outside the approval.
- Maximum active run `30` minutes; reconcile unknown results and stop spending.
- No top-up, replacement wallet, replacement channel or mint/network substitution.

SOL fee/rent ceilings remain unset pending estimates and approval. They must be concrete before execution.

Require finalized transaction evidence and transaction-specific token deltas: publisher `+350`, unused-deposit refund `650`. Relative to the payer’s pre-open test-USDC balance, the completed flow should net `−350`, absent unrelated transfers. Reconcile SOL fees, token-account rent and channel rent separately. Reclaim eligibility uses the actual program’s slot/state conditions; the inspected SDK identifies a 1,500-slot window relative to `openSlot`. [On-chain window](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/server/session/on-chain.ts#L80).

If Devnet cannot pass, return the failure evidence and request a documented scope decision. Sandbox/local-validator channels and exact transfers cannot satisfy Devnet channel acceptance.

**10. Ownership and dependencies**

Future C06 ownership:

- `/Users/akshat/agentic-dsp/packages/payments/` — adapter, bounded signer policy, SDK bridge, durable session-store implementation and reconciliation.
- `/Users/akshat/agentic-dsp/tests/payments/` — deterministic fixtures, protocol, restart, fault and compatibility tests.
- `/Users/akshat/agentic-dsp/docs/components/C06_PAYMENT_PACKET.md` — proposed packet destination.
- `/Users/akshat/agentic-dsp/docs/research/C06_COMPATIBILITY_SPIKE.md` — future measured gate report.
- `/Users/akshat/agentic-dsp/local-state/` — ignored private runtime state.
- `/Users/akshat/agentic-dsp/artifacts/` — sanitized evidence projections.

The orchestrator owns shared schemas, migrations, backend route registration, integration and the consolidated run manifest. C06 proposes changes to those files rather than editing across ownership boundaries.

Dependencies:

- C04 supplies immutable award/channel/payee/price bindings and capacity checks.
- C05 owns receipt verification, exactly-once charge acceptance, durable charge sequence and drain/freeze serialization.
- C06 supplies channel availability, payment authorization and settlement evidence.
- C08 owns the real demo’s run limits, sanitized evidence and reproducible launch.
- No ML/data dependency is needed for the synthetic payment spike.
- Actual demo prices remain actual auction results. The fixed `100/250` fixture does not authorize rewriting model/auction output.

**11. Acceptance IDs and evidence**

| Acceptance ID | C06 contribution |
|---|---|
| A05 | Channel capacity includes reservations and accepted unpaid obligations without double counting |
| A07 | Failed/expired/no-fill delivery produces zero authorization |
| A08 | Receipt/charge replay and restart cannot create a second payment increment |
| A09 | Two accepted charges on one channel advance the cumulative total correctly |
| A10 | Unknown signing/commit/settlement reconciles without new spend |
| A11 | Finalized payout, unused token recovery and separately reconciled rent/fees |
| A12 | Losing advertiser’s payment ledger/channel remains unchanged |
| A13 | Honest mode labels, authority separation and safe evidence projection |
| A14 | Frontend cannot sign, fund or override payment terms |
| A15 | Reproducible fixtures, source/config pins and labelled replay |

For each ID record `not_run`, `passed_synthetic`, `passed_simulation`, `passed_devnet`, `failed` or `blocked`, with evidence references. Synthetic or sandbox results leave required Devnet A09/A11 evidence unproven.

**12. Narrow review checklist and unresolved blockers**

The fresh reviewer checks:

- Selected artifact and dependency provenance match the tested build.
- Only accepted immutable charges advance vouchers.
- Every new increment equals its charge exactly.
- Two charges use the same frozen channel.
- Retries preserve identity and amount.
- Close drains/finalizes obligations and reuses the final voucher.
- SDK idle closure cannot bypass AXP draining.
- Restart retains SDK state and application outbox.
- No database writer lock spans network calls.
- Actual network/mint/program/treasury/recipient match approved terms.
- Finality and payout/refund evidence are independent of SDK response labels.
- Evidence contains no keys, private signed payloads or raw conversations.

Review only these payment/demo seams, then one bounded recheck of substantive findings.

Remaining blockers:

1. **Devnet deployment/treasury compatibility:** read-only deployed-version and treasury evidence, followed by bounded simulation.
2. **Existing wallet/public account compatibility:** public-address and mint/balance checks; key remains untouched.
3. **Source-build reproducibility:** filtered build/import test and resulting package hash; artifact choice is resolved, build success is unproven.
4. **Receipt-to-voucher recovery and lifecycle behavior:** execute the no-value fixtures, especially undercommit, restart and idle-close guards.
5. **New execution authority:** exact SOL fee/rent and transaction ceilings must be approved before existing-wallet signing or broadcasting.
6. **Actual Devnet acceptance:** A09/A11 remain unproven until receipt-correlated channel settlement and recovery execute successfully.

C06 is **specification proposed**. SDK source selection is resolved; Devnet compatibility and execution remain gated.
