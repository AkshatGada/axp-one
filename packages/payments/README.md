# C06 bounded synthetic payment seam

Native Node 25 ESM, no npm dependencies. Import `packages/payments/index.mjs`.
The adapter is a trusted backend worker component; never register these methods
as unauthenticated browser/publisher/agent tools. It has no network or wallet
capability. All totals, signatures and close/reclaim outcomes are synthetic.

```js
import { SyntheticPaymentAdapter, SQLitePaymentStore } from './index.mjs';
const store = new SQLitePaymentStore('/absolute/private-runtime/payments.sqlite');
const payment = new SyntheticPaymentAdapter({ store });
payment.open({
  mode: 'synthetic', channelId: 'synthetic:channel-01', runId: 'run-01',
  advertiserId: 'adv-01', campaignVersionId: 'campaign-01',
  payer: 'synthetic:payer-01', payee: 'synthetic:publisher-01',
  depositBaseUnits: '1000',
});
const first = payment.authorizeCumulative({
  channelId: 'synthetic:channel-01', chargeId: 'charge-001',
  amountBaseUnits: '100', accepted: true, sequence: '1',
});
const second = payment.authorizeCumulative({
  channelId: 'synthetic:channel-01', chargeId: 'charge-002',
  amountBaseUnits: '250', accepted: true, sequence: '2',
});
const plan = payment.prepareClose({ channelId: 'synthetic:channel-01' });
const close = payment.confirmClose({ channelId: plan.channelId, planId: plan.id });
store.close();
```

All adapter/store methods are synchronous and can be awaited. `now` returns
integer Unix **seconds**, defaulting to the actual server clock. The fixture clock
is explicitly 2,000,000,000 seconds. Amounts are canonical unsigned decimal
strings bounded to u64; charge/deposit amounts must be positive. Optional clock
settings are `voucherExpiresAt`, `applicationDeadlineAt`,
`settlementMarginSeconds` and `idleTimeoutSeconds`. Defaults are now+7200,
now+1800, 60 and 3600 respectively. All identities and deadlines freeze at open.
Open requires `mode: 'synthetic'`; payer/payee must have `synthetic:` prefixes and
differ. Channel IDs are application identities, not publisher conversation IDs.

Exports: `SyntheticPaymentAdapter`, `createMemoryPaymentStore`,
`SQLitePaymentStore`, `PaymentError`, `SYNTHETIC_SIGNER`, `amount`,
`createSyntheticVoucher`, `verifySyntheticVoucher`, `DEVNET_CONFIG`,
`validateDevnetConfig`. Optional declarations are in `index.d.ts`.

The actual adapter interface:

| Method | Contract |
|---|---|
| `prepareOpen(input)` | Persist frozen synthetic terms; returns `id` for open plan, `termsHash`, `status: prepared` |
| `confirmOpen({channelId, planId})` / `open(input)` | Opens synthetic state, returns public channel projection; never deposits tokens |
| `reserveAward({channelId, reservationId, amountBaseUnits})` | Worker-only capacity reservation; accepted+reserved <= min(deposit, charge cap) |
| `releaseAward({channelId, reservationId})` | Remove failed/expired reservation, no charge/signature |
| `acceptCharge({channelId, chargeId, amountBaseUnits, accepted:true, sequence?, reservationId?, acceptedReceiptHash?, runId?, campaignVersionId?, payee?, mint?})` | Persist immutable accepted fixture charge. Consumes matching tracked reservation. Sequence defaults to next acceptance sequence; explicit sequence must match |
| `authorizeCumulative(input)` | Accepts the above accepted-charge input directly, or `{channelId, chargeId, amountBaseUnits?}` referencing an already registered charge. Returns status/charge ID/protocol delivery ID/sequence/exact increment/previous and cumulative strings/hash |
| `lookupAuthorization({channelId, chargeId})` | Read-only `absent`, saved `authorized`, or pending/`unknown` projection |
| `beginDrain({channelId})` | Stops new reservations; permits accepted delivery only against an existing reservation |
| `requestIdleClose({channelId})` | Records idle request and enters draining; no automatic close/signature |
| `prepareClose({channelId})` | Require zero reservations and all charges authorized; freeze sequence and saved final voucher hash; returns plan `id` |
| `confirmClose({channelId, planId})` | Reuses saved voucher; returns `status: finalized`, **`finality: synthetic`**, `txSignature: null`, payout/refund strings, no new signing |
| `reconcile({channelId, chargeId})` | Reconcile unknown synthetic authorization with exact saved voucher/provider receipt; no new signature |
| `reconcile({channelId, planId})` | Recover unknown synthetic close using saved outcome/attempt; no second close |
| `prepareReclaim({channelId, observedSlot, approved:true})` | Synthetic plan only; requires slot > openSlot+1500. Zero additional token refund; rent unmeasured |
| `getChannel(channelId)` | Public phase, accepted/reserved/authorized/settled/available/refundable strings, hashes and synthetic counters |

`accepted:true` is a **trusted fixture-ledger intake marker**, not independent
publisher receipt verification. C05 must validate/admit its receipt and persist
its own charge first, then call this worker with that immutable record. Optional
run/campaign/payee/mint fields must match terms; all supplied amount/sequence/
receipt bindings are checked on replay. The adapter owns only its synthetic
payment ledger; C05 remains the source of receipt truth. Register reservations
here or serialize C05's external ledger/drain with this worker before closure.
Do not treat arbitrary request fields as acceptance authority.

Use `chargeCapBaseUnits` at open for a lower synthetic ceiling. Authorization
changes the state of a charge and never spends its budget a second time. Charge
processing follows durable acceptance order. Retry returns the exact stored
result, including historical cumulative value, rather than signing a replacement.
Errors are `PaymentError` with `reasonCode`; unknown outcomes require explicit
`reconcile`, block new reservations, and block closure. Test-only `fault` values
are `after_signed`, `after_commit` for authorization and `after_close` for closure;
never expose fault controls as public API fields.

Injected store contract: synchronous `get(id)`, `list()`, `update(id, mutator)` and
`snapshot()`. `update` must atomically serialize synchronous mutations and reject
async mutators. Use one local worker; SQLite uses short `BEGIN IMMEDIATE`
transactions with no signing/network inside a mutator. State schema is 1;
unsupported state is refused and unknown provider fields round-trip. SQLite files
are owner-readable. Memory default is ephemeral; restore with
`createMemoryPaymentStore(privateSnapshot)` or reopen the SQLite store for
restart behavior. Snapshots contain private synthetic payloads/signatures and
must not be exported as evidence. `getChannel`, method results and smoke output
are sanitized projections.

The deterministic Ed25519 fixture key is public test material, unrelated to any
wallet. Payload format is domain-separated AXP JSON (`axp.synthetic-voucher.v1`),
**not** the pinned SDK's 50-byte MPP encoder. No upstream protocol handler,
SessionStore bridge, instruction builder, live signer or transaction submission
is implemented. F13 verifies the AXP synthetic idle guard; it does not verify
coexistence with the SDK watchdog. See `docs/build/PAYMENT_SPIKE_RESULT.md` for
executed and unavailable gates.
