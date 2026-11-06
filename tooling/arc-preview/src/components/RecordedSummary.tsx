import { CheckCircle2, Info } from 'lucide-react'
import { attoToUsd, evidence, usdc3 } from '@/evidence'

const t = evidence.totals
const x = evidence.execution

const VERIFIED = [
  'Both Gateway transfers: amount, payer and publisher bindings.',
  'Both funding transactions (approve and deposit) and their native fees.',
  'Two public Ed25519 insertion-receipt signatures.',
  'The successful Gateway batch receipt that matches both transfers.',
]

export function RecordedSummary() {
  const cards = [
    { title: 'Gateway deposit', value: usdc3(t.depositedBaseUnits), sub: 'Onchain: approve then deposit, both finalized on Arc.', tone: 'text-[var(--ink-2)]' },
    { title: 'Deliveries accepted', value: usdc3(t.acceptedDeliveryBaseUnits), sub: `${x.domInsertionReceipts} DOM insertion receipts, 2 × 0.002.`, tone: 'text-[var(--ink-2)]' },
    { title: 'Gateway accepted', value: usdc3(t.gatewayAcceptedBaseUnits), sub: 'Offchain facilitator acceptance. Not a transaction.', tone: 'text-[var(--accent)]' },
    { title: 'Batch-finalized', value: usdc3(t.batchFinalizedBaseUnits), sub: "Both transfers completed in one Arc batch, in the publisher's Gateway balance. Not withdrawn.", tone: 'text-[var(--success)]' },
  ]
  return (
    <section aria-label="Recorded execution summary" className="space-y-4">
      <div role="note" className="card flex items-start gap-3 p-4 text-sm">
        <Info size={18} className="mt-0.5 shrink-0 text-[var(--accent)]" />
        <p className="text-[var(--muted)]">
          <span className="font-semibold text-[var(--ink)]">Recorded local execution, final observation.</span> Values come from a sanitized evidence export observed{' '}
          {new Date(evidence.observedAt).toUTCString()}. This Studio project did not make these payments and moves no funds. Provider responses were fixtures (
          {x.actualModelCalls} model calls, spend {x.actualModelSpendMicroUSD} µUSD); payment and chain outcomes were actual. An earlier acceptance snapshot is kept below as
          historical evidence.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.title} className="card p-5">
            <p className={`text-sm font-semibold ${c.tone}`}>{c.title}</p>
            <p className="display mt-2 text-[38px] font-semibold tabular-nums leading-none">{c.value}</p>
            <p className="mt-1 text-xs text-[var(--subtle)]">test USDC</p>
            <p className="mt-3 text-xs text-[var(--muted)]">{c.sub}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <dl className="card grid gap-4 p-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="eyebrow">Native gas paid</dt>
            <dd className="mt-1 font-semibold tabular-nums">{attoToUsd(t.nativeFeeAttoUSD)} USD</dd>
            <dd className="text-xs text-[var(--subtle)]">test USDC, approve + deposit</dd>
          </div>
          <div>
            <dt className="eyebrow">Withdrawn / refunded</dt>
            <dd className="mt-1 font-semibold tabular-nums">
              {usdc3(t.withdrawnBaseUnits)} / {usdc3(t.refundedBaseUnits)}
            </dd>
            <dd className="text-xs text-[var(--subtle)]">no wallet withdrawal or refund was performed</dd>
          </div>
          <div>
            <dt className="eyebrow">Publisher turns / answers</dt>
            <dd className="mt-1 font-semibold tabular-nums">
              {x.startedPublisherTurns} started / {x.preparedIndependentAnswers} prepared
            </dd>
            <dd className="text-xs text-[var(--subtle)]">only {x.domInsertionReceipts} produced paid receipts</dd>
          </div>
          <div>
            <dt className="eyebrow">Evidence note</dt>
            <dd className="mt-1 text-xs text-[var(--muted)]">{x.note}</dd>
          </div>
        </dl>
        <div className="card p-5">
          <p className="eyebrow">Independent verification, as reported by AXP</p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
            {VERIFIED.map((v) => (
              <li key={v} className="flex gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--success)]" />
                <span>{v}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[var(--subtle)]">
            AXP's read-only verifier made no payment, signature, model call or broadcast. This page does not re-run it; it only repeats the Gateway transfer lookup below.
          </p>
        </div>
      </div>
    </section>
  )
}
