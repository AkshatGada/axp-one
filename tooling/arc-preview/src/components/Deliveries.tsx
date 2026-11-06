import { STAGE_META, TONE_CLASS, evidence, payments, shorten, stageForStatus, isTransferStatus, usdc3, channel, explorerAddress, explorerTx, snapshotPayments } from '@/evidence'
import { StatusCheck } from './StatusCheck'

function Hash({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--subtle)]">{label}</dt>
      <dd className="mono break-all text-[var(--ink-2)]">{value}</dd>
    </div>
  )
}

export function Deliveries() {
  return (
    <section className="card p-5 sm:p-6" aria-label="Recorded deliveries and payments">
      <p className="eyebrow">Recorded · Deliveries and nanopayments</p>
      <h2 className="display mt-1 text-2xl font-semibold">Two DOM-acknowledged deliveries, two finalized charges</h2>
      <p className="mt-2 max-w-[65ch] text-sm text-[var(--muted)]">
        Payer {shorten(channel.payer)} paid publisher{' '}
        <a className="mono text-[var(--accent)] hover:underline" href={explorerAddress(channel.publisher)} target="_blank" rel="noopener noreferrer">
          {shorten(channel.publisher)}
        </a>
        . Only hashes are shown: the signed authorizations and their signatures stay private.
      </p>
      <ul className="mt-4 space-y-4">
        {payments.map((p, i) => {
          const stage = isTransferStatus(p.transferStatus) ? stageForStatus(p.transferStatus) : 'failed'
          const meta = STAGE_META[stage]
          return (
            <li key={p.chargeId} className="inner p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Delivery {i + 1}</p>
                  <p className="mono text-xs text-[var(--subtle)]">{p.chargeId}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="display text-xl font-semibold tabular-nums">{usdc3(p.amountBaseUnits)}</p>
                  <span className="text-xs text-[var(--subtle)]">USDC</span>
                  {meta && (
                    <span title={meta.detail} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[meta.tone]}`}>
                      {meta.label}
                    </span>
                  )}
                </div>
              </div>
              <dl className="mt-3 space-y-2 text-xs">
                <Hash label="Receipt hash" value={p.receiptHash} />
                <Hash label="Authorization hash" value={p.authorizationHash} />
                <Hash label="Gateway transfer ID" value={p.transferId} />
                <div className="grid grid-cols-2 gap-x-6 sm:grid-cols-3">
                  <div>
                    <dt className="text-[var(--subtle)]">Recorded transfer status</dt>
                    <dd className="mono">{p.transferStatus}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--subtle)]">Gateway accepted</dt>
                    <dd className="mono">{p.gatewayAccepted ? 'yes' : 'no'}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--subtle)]">Batch transaction</dt>
                    <dd className="mono">
                      <a className="text-[var(--success)] hover:underline" href={explorerTx(p.batchProof.transactionHash)} target="_blank" rel="noopener noreferrer">
                        {shorten(p.batchProof.transactionHash, 10, 8)}
                      </a>
                    </dd>
                  </div>
                </div>
                <p className="text-[var(--subtle)]">
                  Earlier snapshot: "{snapshotPayments[i]?.transferStatus}", no batch proof (historical, pending at the time).
                </p>
              </dl>
              <StatusCheck transferId={p.transferId} recordedStatus={p.transferStatus} />
            </li>
          )
        })}
      </ul>

    </section>
  )
}
