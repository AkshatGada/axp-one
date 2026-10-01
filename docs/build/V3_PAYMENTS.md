# V3 bounded payment coordinator

Implemented component, not funded/network acceptance. V3_TASK.md and
packages/v3/config.mjs govern. Main owns terminal scripts, Exchange draining,
real operations and connected acceptance. No HTTP payment routes are added.

## Exact API

`createV3Payments({stateDir,runId,getLedgerCharge,getLedgerObligations,
signingEnabled=false, ...optionalTestSeams})` returns:

- `freeze({campaigns})`: validate the approved Exchange campaign DTOs, check the
  current native environment/balances and unsigned zero-close feasibility,
  persist frozen versions/creative/declaration hashes and distinct u64 salts.
  No short-lived opening transaction is prepared at freeze. No signing or funding. Same campaigns after
  restart return `already_frozen`; changed versions/copy/terms conflict.
- `open(channelId)`: prepare the unsigned plan immediately before the authorized
  opening, then confirm its saved identity. Requires
  `signingEnabled:true` for a new signature. Rechecks current genesis, deployed
  program/program-data, mint, canonical accounts and remaining deposit balance
  before signing. Native blockhash validity and a20-block remaining lifetime
  margin are checked before invoking the signer. Expired unsigned plans block;
  signed/uncertain identities are never regenerated. An unsigned guard rejection preserves the prepared identity.
- `authorize(channelId)`: read all obligations from both channels, validate
  total/count/caps, then authorize this channel's exact durable charge sequence.
  Returns `{status,channelId,authorizations:[safeResults]}`. No request amount or
  browser-supplied accepted flag. Replays reuse saved authorizations; uncertain
  results stop advancement and require lookup, not fresh signing/commit.
- `close(channelId)`: require the authoritative drained ledger, freeze its
  watermark, then prepare/confirm one native seal/distribute. Positive total uses
  the saved final voucher. Zero accepted total omits voucher entirely, does not
  reserve a fake delivery or sign a zero voucher, and refunds the deposit.
- `reconcile(channelId, operation?)`: operation is `'open'`, `'close'`,
  `{chargeId:'accepted-charge-id'}`, or omitted (latest transaction). Lookup-only,
  including after deadlines. No new signing, broadcast or replacement identity.
- `status()`: synchronous public `{status,runId,mode,signingEnabled,channels,
  payments}`; no SDK, wallet or RPC needed.
- `dispose()`: release the coordinator's database/transport handles. This is not
  channel closure. Wait for outstanding calls before disposing.

Signing disabled is the default even though execution code is available to main.
Main's terminal constructor explicitly supplies `signingEnabled:true` only with
the relevant operator authority. Never give this capability to HTTP, browsers,
buyer agents or organic-completion agents. Use one terminal payment worker; an
in-process shared queue serializes both channels, not a production worker fleet.

Optional trusted fixture seams: `preflight({simulate,expected})`,
`transportFactory({terms,statePath})`, `now()` (integer Unix seconds), and
`feasibilityPath` (defaults to artifacts/v3/feasibility.json). Test transports are
synthetic; none of these options is a request-controlled permission.

## Paths and main integration

Use `stateDir=<root>/local-state/v3/acceptance` and
`runId='v3-wallet-acceptance'`, exactly as `createSession`. Payment state uses
only `payments.sqlite`, `native.sqlite`, and `terms.json` in that directory.
External wallet remains at its existing path, never copied. SDK remains the
existing verified Phase4 source build: PayKit c294f8903f18efc746584e3cc2961d6033b8365c,
MPP0.11.0. No dependencies downloaded or source models called by this component.

`freeze({campaigns})` accepts frozen Exchange DTOs, not draft UI objects containing
displayName/contextHints. Stable funded campaign/advertiser/channel identities
must match ClearVault and KeyForge. New immutable campaign/creative versions,
edited copy, declared additions and soft-fit tags are valid before freezing.
Require active fictional campaigns declaring crypto storage, hardware/offline
keys, Ethereum and Solana, valid existing `validateCampaign`, max bid <=4000
and positive budget <=8000. Persist the exact selected approved DTOs. Lower
operator ceilings also constrain payment authorization, not just UI bidding.

The ledger functions use the existing Phase4 operator mapping:

```js
getLedgerCharge(id) // full immutable charge + string sequence,
                   // advertiserId, acceptedReceiptHash=receiptHash
getLedgerObligations(channelId) // {reservedBaseUnits,acceptedBaseUnits,
                               // charges: ordered full mapped charge refs}
```

Do not sort by timestamp, renumber, fill gaps or substitute current draft
campaign versions. Every charge must bind the frozen run, channel, advertiser
and campaign version. Across both channels <=3 accepted deliveries and accepted
plus reserved <=12000 units; each channel obeys its frozen lower budget ceiling.
All signing hooks reserve fees/new rent for both opens and both closes against
20000000 lamports, conservatively retaining gross costs after finality. There
are no top-ups, replacement channels, reclaim/funding methods or refunds beyond
the native unused-deposit distribution.

Main must synchronously call `exchange.drainNetworkChannel(id)` before
`payments.close(id)`, stop new awards, resolve/expire outstanding reservations,
and finish accepted authorizations. The coordinator cannot acquire a transaction
lock in the separate Exchange DB. It rereads the frozen obligations before
signing and settlement reconciliation and fails closed if they changed.

Public service imports:

```js
import {SQLitePaymentStore} from '../../packages/payments/store.mjs';
import {projectV3NetworkState,paymentEvidenceV3} from './payments.mjs';
const store = new SQLitePaymentStore(paymentPath, {readOnly:true});
const networkState = id => projectV3NetworkState(store,id);
```

These projections use Phase4's Exchange field shape. Uncertain authorization on
an otherwise open channel projects `phase:'draining'`, blocking new awards.
Evidence uses an allowlist, not arbitrary private provider receipt spreads.
Importing payments.mjs does not import native SDK modules or load keys; native
transports also defer wallet access until an explicit signing operation.

## Actual feasibility and limitations

One builder read-only sandbox pass observed 2026-10-01T13:23:19.611Z:
payer14000 test-USDC units, payee6000, payer15268080 lamports. Required deposits
total40000; shortfall26000. Conservative two-open/two-close fee/rent reserve
9453840 lamports, below20M. No funding, wallet access, real signing or broadcast.

The first unsigned open + zero-seal + distribute simulation failed at instruction2
with Custom1; SPL logs say insufficient funds. Opening failed, so zero closure
never ran. Classify `zeroCloseCompatibility:'blocked_insufficient_test_balance'`,
not SDK incompatibility. The report preserves that actual failed simulation and
the original label correction. Future preflight returns the balance gate before
simulation if balances are insufficient. An explicit later attempt retains the
first failed report in `previousAttempts`; no automatic retry/faucet is provided.
Main's separately requested exception/funding decision is outside this build.

Current program account hash matches Phase4. Current program-data hash is
1b15152c73203b9ecbd78733225a4955a8045f64686a6b071e01a3a3610fed71.
Phase4's public artifacts did not record a sandbox program-data hash, so matching
deployed bytecode cannot be established from them. A matching program-account
hash only identifies the upgradeable-program metadata/PDA, not unchanged code.
Positive closure is **historical Phase4 only**, not fresh V3 positive-close
verification. Native offline tests establish instruction/session compatibility,
not current chain payout. Actual V3 zero/positive closure, deposits, fees and
refunds remain main's connected-run acceptance gates. No further network attempts
were made after the user's stop instruction.

## Verification and preservation

Focused command: `node --test tests/v3/payments*.mjs
tests/payments/network-adapter.test.mjs tests/payments/native-session.test.mjs`.
46 passed, zero failed/skipped. Expanded payment/Exchange compatibility command
`node --test tests/v3/payments*.mjs tests/payments/*.mjs tests/exchange/*.mjs`:
75 passed, 3 optional codec checks skipped, zero failed. Preservation manifest:
205 files unchanged. `git diff --check` and native-transport syntax check pass.
Existing Phase4 positive-path tests were not
edited. Native SDK fixtures use unsigned/no-op public identities or the existing
tests' unrelated ephemeral fixture signers, never the external wallet. New
coverage includes zero voucher omission, frozen version edits, unique salts,
three-charge sequence, lower caps, aggregate pre-sign budgets, lookup-only
restarts, balance gating, immutable charge rejection and safe public projections.

Changed scope: packages/v3/payments.mjs; packages/payments/network-adapter.mjs,
sdk-transport.mjs, store.mjs, v3-feasibility.mjs; tests/v3/payments.test.mjs,
payments-native.test.mjs, payments-feasibility.test.mjs; this document;
artifacts/v3/feasibility.json.
No commits, push, deploy, source DB/export/embedding/model calls or live payments.

## Main's later completed connected acceptance

The preceding paragraphs preserve the builder's earlier blocked handoff. After
the user's separate exact26000-unit sandbox faucet approval, main performed one
corrective unsigned simulation and froze the same environment. Both finalized
native20000-unit deposits backed actual competition; three accepted charges
produced ClearVault cumulative4000→7000 and KeyForge3000. Both positive-spend
closes finalized: payouts7000/3000 and refunds13000/17000. Zero-spend close is
unsigned simulation/fixture coverage, not a third live channel or transaction.
Actual fees40000 and gross rent9423840lamports remain below the20M aggregate cap.
Saved chain/account metadata, restart with original signed receipts, sanitized
replay and detailed limitations are in V3_RESULT.md and artifacts/v3/.
No additional payments are required or authorized merely to present replay.
