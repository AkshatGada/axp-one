import { AlertTriangle } from 'lucide-react'
import { BatchSettlement } from '@/components/BatchSettlement'
import { Architecture } from '@/components/Architecture'
import { Comparison } from '@/components/Comparison'
import { Deliveries } from '@/components/Deliveries'
import { Funding } from '@/components/Funding'
import { Header } from '@/components/Header'
import { Provenance } from '@/components/Provenance'
import { RecordedSummary } from '@/components/RecordedSummary'
import { RunLocally } from '@/components/RunLocally'
import { evidence, explorerAddress } from '@/evidence'

export default function App() {
  return (
    <div className="mx-auto min-h-dvh max-w-6xl space-y-6 px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      <Header />
      <RecordedSummary />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Funding />
          <BatchSettlement />
        </div>
        <Deliveries />
      </div>
      <Architecture />
      <Comparison />
      <Provenance />
      <RunLocally />
      <section className="card p-5" aria-label="Limitations">
        <p className="eyebrow flex items-center gap-2">
          <AlertTriangle size={14} className="text-[var(--warn)]" /> Limitations, as reported
        </p>
        <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
          {evidence.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
          <li>
            An earlier custom escrow was deployed on Arc Testnet from this Studio project at{' '}
            <a className="mono break-all text-[var(--accent)] hover:underline" href={explorerAddress(evidence.studio.unusedEscrow.address)} target="_blank" rel="noopener noreferrer">
              {evidence.studio.unusedEscrow.address}
            </a>
            . It is unfunded, unused by this integration, and is not evidence for any payment, funding or batch shown here.
          </li>
        </ul>
      </section>
    </div>
  )
}
