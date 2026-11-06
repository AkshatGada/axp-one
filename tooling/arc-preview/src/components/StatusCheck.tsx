import { useState } from 'react'
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { STAGE_META, TONE_CLASS, explorerTx, shorten, usdc3 } from '@/evidence'
import { fetchGatewayTransfer, type GatewayTransferView } from '@/lib/gatewayStatus'

/** Read-only live check of one public Gateway transfer ID. Never signs, never sends funds. */
export function StatusCheck({ transferId, recordedStatus }: { transferId: string; recordedStatus?: string }) {
  const [view, setView] = useState<GatewayTransferView>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    setError(undefined)
    try {
      setView(await fetchGatewayTransfer(transferId))
    } catch (e) {
      setView(undefined)
      setError(e instanceof Error ? e.message : 'Status check failed')
    } finally {
      setBusy(false)
    }
  }

  const meta = view ? STAGE_META[view.stage] : undefined
  return (
    <div className="mt-3">
      <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void run()}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
        {busy ? 'Checking Gateway…' : 'Check live Gateway status'}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      {view && meta && (
        <div className="inner mt-3 p-4" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="eyebrow">Live check · {new Date(view.checkedAt).toLocaleTimeString([], { hour12: false })} · not part of the recorded evidence</p>
            <span title={meta.detail} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[meta.tone]}`}>
              {meta.label}
            </span>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-[var(--subtle)]">Gateway status</dt>
              <dd className="mono">{view.status}</dd>
            </div>
            <div>
              <dt className="text-[var(--subtle)]">Amount</dt>
              <dd className="mono tabular-nums">{view.amountBaseUnits ? `${usdc3(view.amountBaseUnits)} USDC` : 'unknown'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[var(--subtle)]">Nonce hash (keccak256)</dt>
              <dd className="mono break-all">{view.nonceHash ? shorten(view.nonceHash, 14, 10) : 'not reported'}</dd>
            </div>
            <div className="col-span-2 sm:col-span-4">
              <dt className="text-[var(--subtle)]">Batch transaction reported by Gateway</dt>
              <dd className="mono break-all">
                {view.txHash ? (
                  <a className="inline-flex min-h-[44px] items-center gap-1 text-[var(--success)] hover:underline" href={explorerTx(view.txHash)} target="_blank" rel="noopener noreferrer">
                    {view.txHash} <ExternalLink size={12} className="shrink-0" />
                  </a>
                ) : (
                  'None reported'
                )}
              </dd>
            </div>
          </dl>
          {recordedStatus && view.status !== recordedStatus && (
            <p className="mt-2 text-xs text-[var(--warn)]">
              Gateway now reports "{view.status}"; the recorded evidence says "{recordedStatus}". The recorded run is unchanged.
            </p>
          )}
          {view.txHash && view.status !== 'completed' && (
            <p className="mt-2 text-xs text-[var(--muted)]">A batch transaction is reported but the transfer is not completed, so it is not treated as final.</p>
          )}
        </div>
      )}
    </div>
  )
}
