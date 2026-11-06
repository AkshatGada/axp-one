const KEPT = [
  'Requirements shape: scheme exact, network eip155:5042002, extra.name GatewayWalletBatched, version "1".',
  '402 body (x402 version 2) and the base64 header encoding.',
  'Authorization validity: at least 7 days remaining, already valid (validAfter not in the future).',
  'Binding intent: payer, payee and amount in the signed authorization must equal the challenge; resource must match.',
  'Transfer-stage mapping: received to accepted, batched, confirmed, completed to finalized, failed.',
]

const CHANGED = [
  'Network, token and Gateway Wallet come from AXP\'s own testnet constants instead of the SDK chain table; no facilitator discovery, version fixed at "1".',
  'Authorization window is 8 days (7 plus one for delayed submission of saved signatures); the Studio SDK used 604,900 seconds.',
  'The payee must be a non-zero address; the amount must pass AXP\'s base-unit check.',
  'Stricter binding: the echoed "accepted" requirements must be canonically identical, and the signer must equal the expected payer.',
  'The signature must be a 65-byte value; errors are coded arc_* checks. Signatures are validated, never displayed.',
  'Not carried over: price cap, facilitator-kind discovery and display helpers.',
]

const FILES: Array<[string, string, string]> = [
  ['sdk/axp-arc-x402/requirements.ts', 'This Studio project', 'Source the AXP module was adapted from'],
  ['sdk/axp-arc-x402/reconcile.ts', 'This Studio project', 'Source of the stage mapping; also used by the status check'],
  ['packages/arc/protocol.mjs', 'AXP repository (adapted)', 'Public excerpt kept at docs/provenance/protocol.adapted.mjs, read-only'],
  ['artifacts/arc/gateway-accepted.json', 'AXP repository (sanitized)', 'Earlier acceptance snapshot, kept as src/evidence/accepted-snapshot.json (historical, pending)'],
  ['axp-arc-final-public.json', 'AXP repository (sanitized)', 'Final observation, src/evidence/final.json; drives this page'],
  ['docs/arc/architecture.svg, docs/arc/README.md', 'AXP repository', 'Diagram shown above; run commands in Run it'],
  ['sdk/, server/, tests/, examples/', 'This Studio project', 'Reusable adapter, gate, ledger, sponsor, API and offline tests; unchanged logic'],
]

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="inner p-5">
      <p className="text-sm font-semibold">{title}</p>
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

export function Provenance() {
  return (
    <section className="card p-5 sm:p-6" aria-label="Code provenance">
      <p className="eyebrow">Code provenance</p>
      <h2 className="display mt-1 text-2xl font-semibold">From the Studio adapter to the AXP module</h2>
      <p className="mt-2 max-w-[65ch] text-sm text-[var(--muted)]">
        The AXP team adopted the challenge, binding and stage logic from this project's adapter, reviewed it, and tightened it. The comparison below is read from the two
        modules; the AXP module's imports were not supplied.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <List title="Kept from the Studio adapter" items={KEPT} />
        <List title="Changed or tightened by AXP" items={CHANGED} />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="eyebrow">
              <th className="py-2 pr-4">File</th>
              <th className="py-2 pr-4">Origin</th>
              <th className="py-2">Note</th>
            </tr>
          </thead>
          <tbody>
            {FILES.map(([file, origin, note]) => (
              <tr key={file} className="border-t border-[var(--border)] align-top">
                <td className="mono py-2 pr-4 text-xs">{file}</td>
                <td className="py-2 pr-4 text-[var(--ink-2)]">{origin}</td>
                <td className="py-2 text-[var(--muted)]">{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
