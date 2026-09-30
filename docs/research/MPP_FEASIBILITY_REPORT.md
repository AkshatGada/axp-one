# C06 payment feasibility research report

Retrieved 2026-09-30 from completed read-only gpt-6.1-sol high task
01a0f26d-6751-7af3-9750-35c5a7676bf7. Research evidence is not an executed
integration test. Report preserved below; claims remain scoped to pinned source
and the researcher's read-only observations.

**C06 recommendation: proceed to a small receipt-gated feasibility spike. Explicit variable cumulative vouchers are supported by the SDK source; Devnet settlement compatibility remains unverified.** No repository writes, installs, wallet creation, secret reads, or transactions occurred.

Read the requested project documents, including `docs/CONTRACTS.md` and `docs/COMPONENT_EXECUTION_PLAN.md`.

**Pin and actual API**

- Research baseline: official `solana-foundation/pay-kit` commit **`c294f8903f18efc746584e3cc2961d6033b8365c`**. Its `@solana/mpp` package declares **0.11.0**; workspace Node requirement is **≥22.13.0**; license is MIT. [Package manifest](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/package.json), [Node requirement](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/package.json).
- `@solana/mpp/client` exports `ActiveSession`, `buildOpenPaymentChannelTransaction`, `createPaymentChannelSessionOpener`, `serializeSessionCredential`, `SessionConsumer`, and `HttpCommitTransport`. `@solana/mpp/server` exports `session` with `session.routes(...)`, `SessionStore`, `submitSettleAndDistribute`, and `buildReclaimInstruction`. [Client exports](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/client/index.ts), [server exports](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/server/index.ts).
- **Release mismatch:** public npm `latest` currently resolves to **0.7.0**, not 0.11.0. I inspected its archive in memory and verified its published checksum. It also exposes explicit voucher preparation and reserve/commit APIs, but its exports differ. Freeze either that exact artifact or the source commit before the spike; do not assume documentation, npm, and repository source match. [Published metadata](https://registry.npmjs.org/@solana/mpp/0.7.0).

**Feasibility distinctions**

| Requirement | Finding |
|---|---|
| Different auction-price increments | **Supported in source.** `prepareVoucher(total)` accepts an absolute cumulative amount; `prepareIncrement(delta)` accepts a variable increment. Neither advances local state until `recordVoucher`. |
| Authorization after application receipt acceptance | **Feasible through application orchestration.** SDK delivery acceptance does not sign; explicit `ack()`/commit does. The application must validate the publisher receipt first. |
| No billing on ad fetch | **Supported by keeping ad reads outside payment gates.** Use the dedicated reserve/commit surface only after accepting a charge. |
| Advertising receipt verification | **Not supplied by MPP.** SDK commit verifies payment authority and reservation constraints, not DOM insertion, disclosure, or publisher receipt authenticity. |
| End-to-end Devnet success | **Unverified.** Program presence is confirmed; compatible open, settle, refund, and reclaim have not been executed. |

Evidence: [`ActiveSession` methods, lines 593–666](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/client/Session.ts#L593), [explicit consumer acknowledgement](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/client/SessionConsumer.ts#L47), [reserve/commit implementation](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/server/Session.ts#L1147).

**Recommended component contract**

Use **client-signed vouchers**, controlled by the advertiser signer service. One advertiser channel pays one owned publisher; use empty distribution splits.

After C05 atomically accepts a delivery and creates its immutable charge:

1. Reserve an SDK delivery using that charge ID and exact amount.
2. Persist `VoucherIntent` with `newTotal = previousAuthorizedTotal + charge.amount`.
3. Call `prepareVoucher(newTotal)` and persist the signed payload before submission.
4. Submit the same delivery ID/payload on retries; verify returned IDs and amount before recording authorization.

Enforce **exact charge equality** yourself: SDK commit permits an increment *up to* the reserved amount. Wrap its routes with application authorization and ledger checks. Keep the charge commitment outside the standard **50-byte** voucher. [SDK commit checks](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/server/Session.ts#L1230), [voucher format](https://github.com/solana-foundation/payment-channels/blob/3ffa4d6728ad88e4a9667a76ad9ccd68a302c696/README.md#voucher-wire-format).

**Network and lifecycle constraints**

The official upstream end-to-end fixture targets **Solana Payment Sandbox**, `https://402.surfnet.dev:8899`, using mainnet mint identities on a hosted test validator. It is not Devnet. [Fixture](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/__tests__/playground-session-e2e.test.ts#L1).

A finalized read-only Devnet query at slot **505915775** confirmed executable program **`CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX`** and the SDK’s six-decimal Devnet USDC mint. However, Devnet’s deployed program-byte hash differs from sandbox/mainnet. The SDK also hard-codes the mainnet treasury, while program source still has a Devnet treasury placeholder/build guard. **Resolve deployment/treasury compatibility before calling Devnet supported.** [Devnet program](https://explorer.solana.com/address/CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX?cluster=devnet), [SDK treasury](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/server/session/on-chain.ts#L90), [cluster constants](https://github.com/solana-foundation/payment-channels/blob/3ffa4d6728ad88e4a9667a76ad9ccd68a302c696/program/payment_channels/src/constants.rs#L78).

Pin network, program, mint, token program, and canonical ATAs. Payer and payee must differ; deposit and grace must be positive; voucher signer must be Ed25519. Prefer ordinary SPL test-USDC for this spike. [Open constraints](https://github.com/solana-foundation/payment-channels/blob/3ffa4d6728ad88e4a9667a76ad9ccd68a302c696/program/payment_channels/src/instructions/open.rs#L249).

Cooperative close bundles `settleAndSeal + distribute`: publisher payout and unused-deposit refund occur immediately; channel-PDA rent may require later `reclaim` after the **1,500-slot** window. Forced recovery is `requestClose → grace → seal → distribute/withdrawPayer`. [Program lifecycle](https://github.com/solana-foundation/payment-channels/blob/3ffa4d6728ad88e4a9667a76ad9ccd68a302c696/docs/001-payment-channel-state-machine.md).

SDK idle timeout defaults to **300 seconds**, with permitted values **1–2,592,000**; zero is rejected. Pending reservations do not refresh activity. Use an explicit long demo timeout and drain obligations before closing. Reuse the cached last voucher for close: `ActiveSession.closeAction(finalIncrement)` signs additional spend. A returned settlement signature is submission evidence; verify finality and balances separately. [Timeout/lifecycle](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/server/session/lifecycle.ts), [close helper](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/client/Session.ts#L730), [submission helper](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/server/session/on-chain.ts#L1024).

**Minimum future spike and blockers**

First run a synthetic protocol fixture: deposit ceiling **1,000**, accepted charges **100 + 250**, vouchers **100 → 350**. Prove fetch/rejected receipt costs zero; identical retry adds zero; restart preserves payload identity; invalid vouchers fail.

Then, under separately bounded funding authorization, repeat on the selected test environment and prove publisher **+350**, payer refund **650**, finalized settlement, and rent recovery.

Remaining blockers are the SDK artifact choice, Devnet deployment/treasury compatibility, and demonstrated receipt-to-voucher retry/close behavior. Sandbox requires an explicit mode decision if Devnet remains required. No custom channel-program development is needed to test the core hypothesis.


