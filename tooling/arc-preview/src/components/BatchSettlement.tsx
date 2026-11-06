import { ExternalLink } from 'lucide-react'
import { batch, evidence, explorerTx, payments, snapshot, snapshotPayments, usdc3 } from '@/evidence'

export function BatchSettlement() {
  return (
    <section className="card p-5 sm:p-6" aria-label="Batch settlement and observation history">
      <p className="eyebrow">Recorded · Batch settlement</p>
      <h2 className="display mt-1 text-2xl font-semibold">One Arc batch finalized both transfers</h2>
      {batch ? (
        <div className="inner mt-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Gateway batch transaction</p>
            <span className="rounded-full border border-[rgba(141,216,159,0.5)] px-2.5 py-1 text-xs font-semibold text-[var(--success)]">{batch.finality}</span>
          </div>
          <a
            className="mono mt-2 inline-flex min-h-[44px] items-center gap-1 break-all text-xs text-[var(--success)] hover:underline"
            href={explorerTx(batch.transactionHash)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {batch.transactionHash} <ExternalLink size={12} className="shrink-0" />
          </a>
          <dl className="mt-1 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-[var(--subtle)]">Block</dt>
              <dd className="mono tabular-nums">{batch.blockNumber}</dd>
            </div>
            <div>
              <dt className="text-[var(--subtle)]">Transfers in this batch (from this evidence)</dt>
              <dd className="mono tabular-nums">
                {payments.length} · {usdc3(evidence.totals.batchFinalizedBaseUnits)} USDC
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[var(--subtle)]">Block hash</dt>
              <dd className="mono break-all">{batch.blockHash}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-[var(--muted)]">{batch.attribution}. The batch receipt is verified through Arc RPC; the link from each transfer to this batch comes from Gateway.</p>
        </div>
      ) : (
        <p role="alert" className="mt-4 text-sm text-[var(--danger)]">The two transfers do not share one batch proof in this evidence.</p>
      )}

      <h3 className="mt-6 text-sm font-semibold">Observation history</h3>
      <ol className="mt-3 space-y-3">
        <li className="inner p-4">
          <p className="eyebrow">Earlier snapshot · {new Date(snapshot.observedAt).toUTCString()}</p>
          <p className="mt-1 text-sm text-[var(--ink-2)]">Historical, pending at that time</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Both transfers were Gateway-accepted with transfer status "{snapshotPayments[0]?.transferStatus}" and no batch proof. Batch-finalized was{' '}
            {usdc3(snapshot.totals.batchFinalizedBaseUnits)} USDC. This is kept as it was recorded; it was not finalized then.
          </p>
        </li>
        <li className="inner p-4">
          <p className="eyebrow">Final observation · {new Date(evidence.observedAt).toUTCString()}</p>
          <p className="mt-1 text-sm text-[var(--success)]">Completed</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Both transfers show status "{payments[0]?.transferStatus}" with the batch proof above. Batch-finalized is {usdc3(evidence.totals.batchFinalizedBaseUnits)} USDC.
          </p>
        </li>
      </ol>
    </section>
  )
}
