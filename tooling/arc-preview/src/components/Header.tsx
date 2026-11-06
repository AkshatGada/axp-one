import { useEffect, useState } from 'react'
import { Check, Link2 } from 'lucide-react'
import { evidence } from '@/evidence'

export function Header() {
  const [link, setLink] = useState<string>()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.resolve(new URL('/', window.location.origin).href)
      .then((url) => alive && setLink(url))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  const copy = async () => {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-3xl">
        <p className="eyebrow">AXP Arc Nanopayments</p>
        <h1 className="display mt-2 text-balance text-[34px] font-semibold leading-[1.05] sm:text-[46px]">
          Sponsored deliveries paid in test USDC, finalized in an Arc batch.</h1>
        <p className="mt-3 max-w-[62ch] text-pretty text-[15px] text-[var(--muted)]">
          This page replays a recorded local run of AXP on Arc Testnet: one Gateway deposit and two DOM-acknowledged deliveries, each paid with an exact 0.002 test USDC
          nanopayment. Gateway first accepted them offchain; a later observation shows both completed in one Arc batch, 0.004 test USDC in the publisher's Gateway balance.
        </p>
      </div>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-[rgba(233,196,106,0.45)] px-3 py-1 font-semibold text-[var(--warn)]">Recorded, not live</span>
          <span className="rounded-full border border-[var(--border)] px-3 py-1 font-semibold text-[var(--ink-2)]">Arc Testnet only</span>
          <span className="mono rounded-full border border-[var(--border)] px-3 py-1 text-[var(--subtle)]">{evidence.schemaVersion}</span>
        </div>
        <a className="text-xs underline" href={evidence.studio.url} target="_blank" rel="noopener noreferrer">Open Arc Studio project</a>
        <button type="button" className="btn btn-ghost" onClick={() => void copy()} disabled={!link}>
          {copied ? <Check size={16} /> : <Link2 size={16} />}
          {copied ? 'Link copied' : 'Copy share link'}
        </button>
      </div>
    </header>
  )
}
