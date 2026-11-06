import diagram from '@/assets/architecture.svg'

// Same text as the <title> and <desc> inside the supplied SVG, repeated here so it is readable on the page
// and available as the image's accessible name and description.
const TITLE = 'AXP with Circle Gateway Nanopayments on Arc'
const DESC =
  'The existing approved campaign, deterministic auction, separate Sponsored insertion and signed receipt ledger feed a new Arc rail. Gateway deposits fund exact offchain authorizations per accepted receipt, which the facilitator accepts before later onchain batch settlement. Solana and Tempo stay available.'

export function Architecture() {
  return (
    <section className="card p-5 sm:p-6" aria-labelledby="arch-heading">
      <p className="eyebrow">Architecture</p>
      <h2 id="arch-heading" className="display mt-1 text-2xl font-semibold">
        {TITLE}
      </h2>
      <figure className="mt-4">
        <div className="overflow-x-auto rounded-2xl bg-[#f7f6f2] p-2">
          <img src={diagram} width={1400} height={860} alt={`${TITLE}. ${DESC}`} className="h-auto min-w-[720px] w-full" />
        </div>
        <figcaption className="mt-3 max-w-[70ch] text-sm text-[var(--muted)]">{DESC}</figcaption>
      </figure>
      <p className="mt-3 text-xs text-[var(--subtle)]">
        Diagram supplied by the AXP team. Gateway acceptance and batch finality are separate facts; unused funds remain in the payer's Gateway balance.
      </p>
    </section>
  )
}
