# Phase 4 operator runbook

Status: completed test-network acceptance, 2026-10-01. Working directory:
`/Users/akshat/agentic-dsp`. Phase3 history is separate and unchanged.

## Start the reference console

Use the existing Node runtime with SQLite support and existing local credentials:

```sh
cd /Users/akshat/agentic-dsp
node --env-file=.env.local scripts/demo/phase4.mjs
```

Open `http://127.0.0.1:8789/`. If that port already serves Phase4, use that
instance rather than starting another one. This is the single console launcher.
The existing local `ads` container is queried read-only for cached evidence.
No corpus clone, new embeddings, global agent configuration or production edits.

The frozen run already has both turns. **Replay first placement — no new calls**
renders its saved answer and disclosed card; its duplicate receipt returns the
existing charge. It does not request a fresh model completion or new payment.
Channel accounting and network receipts show actual finalized sandbox outcomes.
The console has no wallet signing or payment-operation endpoints.

## Verify/replay the completed outcome

```sh
node scripts/demo/phase4-payment.mjs replay
node scripts/demo/phase4-payment.mjs evidence
node scripts/demo/phase4-verify.mjs
npm test -- --phase4-report
```

`replay` runs in a fresh process and asserts identical charge records, payment
record hash and model-admission count. It retrieves saved authorizations and
settlement, never creates another spending increment or broadcasts a transaction.
It is a replay of recorded publisher acknowledgements, not new deliveries.
`evidence` exports sanitized state; `verify` only reads the frozen sandbox RPC.
The latter can fail after the hosted sandbox resets; that does not authorize
replacing the channel or rerunning purchases. Preserve the captured evidence.
`npm test` discovers repository `tests/` only, excluding ignored vendor SDK tests.

Do not rerun the SDK/faucet feasibility setup or delete `local-state/phase4`.
Private state and existing external wallets are essential for safe recovery.
Do not commit `.env.local`, databases, signed spending vouchers or wallet keys.

## Executed acceptance sequence (not an instruction to purchase again)

1. A bounded Devnet simulation failed native closure compatibility. The official
   hosted sandbox corrective simulation succeeded. Freeze its endpoint, genesis,
   program, mint and terms before creating the channel.
2. `phase4-payment.mjs freeze`, then `open`: native transaction, saved signed
   identity and simulation/cost check before the single submission. Deposit was
   20000 test-USDC base units. The original implementation checked costs before
   broadcast, not before signing; the focused review correction now estimates
   unsigned native messages and checks the aggregate cap before either signer.
3. Start the console. Six actual Jev decisions were admitted across two turns.
   Two separately prompted gpt-6.1-sol low app agents generated organic answers
   without advertiser material; their outputs entered through the existing
   operator-recorded completion bridge. This is not unattended Codex CLI.
4. Browser **Run next actual-model placement** twice: each fictional TripDesk
   card was inserted with its Sponsored label, checked by the publisher client,
   and acknowledged. The authoritative exchange accepted two 3000-unit charges.
5. `authorize` rereads accepted ledger charges and saves each signed native
   cumulative voucher before native session verification: 3000, then 6000.
6. `close` drains/fixes obligations, uses the saved final voucher, prepares the
   cooperative seal/distribute and submits once after the cost check. It adds no
   charge. Finalized payout6000, unused-token refund14000.
7. `replay`, `evidence`, `verify`: retain correlated acceptance/restart evidence.

The original open transaction finalized while local receipt projection rejected
a floating-point metadata field. `reconcile` recovered that **same signature**;
there was no replacement payment. This is an actual reconciliation case, not a
deliberately fault-injected lost network acknowledgement.

The corrected unsigned-preflight ordering was verified using native SDK
ephemeral fixtures and fake-transport zero-signer tests, not another live
purchase. The finalized historical run's costs still reconcile below the cap.

Operator commands `open`, `authorize`, `close`, `reconcile` are terminal-only.
Unknown outcomes must reconcile existing intent/transaction identity; never
reset or start another channel. The accepted run is closed; no further live
presentation purchase is authorized by this phase.

## Evidence and limits

- `artifacts/phase4/frozen-environment.json`: exact network/terms binding.
- `connected-run.json`: decisions, answers, awards, signed publisher receipt
  records, immutable charges and public voucher/transaction correlations.
- `payment-state.json`: hashes/verification receipts, no spending voucher bytes.
- `chain-check.json`: finalized RPC/account and base-unit accounting checks.
- `restart-replay.json`: fresh-process unchanged-state proof.
- `placement-one.png`, `placement-two.png`, `final-replay.png`: browser evidence.
- `tests/payments/network-adapter.test.mjs`: duplicate/rejected charges, restart,
  lost acknowledgements, pending settlement and no-close-increment checks with
  explicitly fake protocol transports. These are not additional chain runs.

Signed receipt packets were reconstructed deterministically on operator replay
from the original accepted receipts and marked `recordedOnReplay`; they were not
saved as packets at original delivery time. Original charges/receipt hashes are
unchanged. Same-Mac operator approval is not isolated production authorization.

Native SDK sources are pinned to PayKit commit
`c294f8903f18efc746584e3cc2961d6033b8365c`, MPP0.11.0. Only required source modules
and pinned dependencies were built in ignored `local-state/phase4-sdk` (~90.5 MB);
this is not a build of the entire PayKit monorepo or every optional import path.
Native SDK session delivery/commit handlers verify cumulative vouchers. AXP
provides the trusted ledger/operator adapter; a public HTTP MPP gateway is not
part of this local demonstration. Official references:
[sessions](https://pay.sh/docs/building-with-pay/payment-channels/sessions) and
[sandbox networks](https://pay.sh/docs/pay-for-apis/sandbox-and-networks).

Recording, final frontend, four-minute presentation packaging, multiple-funded
bidder competition and any production deployment remain Phase5/later scope.
