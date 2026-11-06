import { ExternalLink } from 'lucide-react'
import { attoToUsd, channel, derivedDepositFeeAtto, evidence, explorerAddress, explorerTx, isNumeric, operations, shorten } from '@/evidence'

const derived = derivedDepositFeeAtto()

export function Funding() {
  return (
    <section className="card p-5 sm:p-6" aria-label="Gateway funding transactions">
      <p className="eyebrow">Recorded · Onchain funding</p>
      <h2 className="display mt-1 text-2xl font-semibold">Approve and deposit into Gateway</h2>
      <p className="mt-2 max-w-[65ch] text-sm text-[var(--muted)]">
        Payer{' '}
        <a className="mono text-[var(--accent)] hover:underline" href={explorerAddress(channel.payer)} target="_blank" rel="noopener noreferrer">
          {shorten(channel.payer)}
        </a>{' '}
        funded its Gateway balance from Arc Testnet USDC. Gateway Wallet{' '}
        <a className="mono text-[var(--accent)] hover:underline" href={explorerAddress(evidence.network.gatewayWallet)} target="_blank" rel="noopener noreferrer">
          {shorten(evidence.network.gatewayWallet)}
        </a>
        . Receipts below are the recorded native operations; links open the Arc explorer reported by the evidence.
      </p>
      <ol className="mt-4 space-y-3">
        {operations.map((op) => (
          <li key={op.transactionHash} className="inner p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold capitalize">{op.kind}</p>
              <span className="rounded-full border border-[rgba(141,216,159,0.5)] px-2.5 py-1 text-xs font-semibold text-[var(--success)]">
                {op.receipt.finality}
              </span>
            </div>
            <a
              className="mono mt-2 inline-flex min-h-[44px] items-center gap-1 break-all text-xs text-[var(--accent)] hover:underline"
              href={explorerTx(op.transactionHash)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {op.transactionHash} <ExternalLink size={12} className="shrink-0" />
            </a>
            <dl className="mt-1 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
              <div>
                <dt className="text-[var(--subtle)]">Block</dt>
                <dd className="mono tabular-nums">{op.receipt.blockNumber}</dd>
              </div>
              <div>
                <dt className="text-[var(--subtle)]">Gas used</dt>
                <dd className="mono tabular-nums">{op.receipt.gasUsed}</dd>
              </div>
              <div>
                <dt className="text-[var(--subtle)]">Fee (base units)</dt>
                <dd className="mono tabular-nums">{op.receipt.feeAmountBaseUnits}</dd>
              </div>
              <div>
                <dt className="text-[var(--subtle)]">Fee (USD)</dt>
                <dd className="mono tabular-nums">{isNumeric(op.receipt.feeAttoUSD) ? attoToUsd(op.receipt.feeAttoUSD) : derived ? `${attoToUsd(derived)} (derived)` : 'not in export'}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-[var(--subtle)]">
        Fees are native test USDC, using 18 decimals. Both funding transactions are separate from the batch transaction shown below.
      </p>
    </section>
  )
}
