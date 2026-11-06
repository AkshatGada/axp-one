const ORIGINAL = [
  'Advertiser campaign, auction and allocation flows.',
  'Publisher turns and the sponsored answer that gets inserted into the page.',
  'DOM insertion receipts: the page acknowledging a delivery, which is the accepted-receipt authority for a charge.',
  'Private signing and frozen payment bounds on the AXP side.',
  'Earlier payment role handled by Solana channels (replaced for Arc by the work on the right).',
]

const ARC = [
  'Circle Gateway Nanopayments over x402 on Arc Testnet as the payment rail.',
  'Challenge builder: one 402 per accepted receipt with the exact amount and payee.',
  'Binding checks: payer, payee, amount, resource, requirements and 7-day validity must match before anything is sent to Gateway.',
  'Transfer-stage mapping: received is accepted, completed is the only batch-finalized state.',
  'Funding path: approve and deposit into the Gateway Wallet, recorded with finalized receipts.',
  'Sanitized evidence export and this read-only viewer, including live status checks by public transfer ID.',
]

function Column({ title, items, accent }: { title: string; items: string[]; accent: boolean }) {
  return (
    <div className="inner p-5">
      <p className={`text-sm font-semibold ${accent ? 'text-[var(--accent)]' : 'text-[var(--ink-2)]'}`}>{title}</p>
      <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--subtle)]" />
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Comparison() {
  return (
    <section className="card p-5 sm:p-6" aria-label="Original AXP versus new Arc work">
      <p className="eyebrow">Scope</p>
      <h2 className="display mt-1 text-2xl font-semibold">Original AXP versus new Arc work</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Column title="Original AXP (not built here)" items={ORIGINAL} accent={false} />
        <Column title="New Arc work" items={ARC} accent />
      </div>
      <p className="mt-3 text-xs text-[var(--subtle)]">
        This Studio project contains the reusable Arc adapter, tests and this viewer. The AXP application code is outside it; the descriptions above follow what the AXP
        team reported.
      </p>
    </section>
  )
}
