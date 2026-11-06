import { evidence } from '@/evidence'

const INSTALL = `pnpm install --frozen-lockfile --ignore-scripts
npm ci --ignore-scripts --no-audit --no-fund --prefix tooling/arc-sdk
npm run arc:test
npm run verify:review`

const VERIFY = 'node scripts/arc/verify-evidence.mjs artifacts/arc/batch-finalized.json'

const STUDIO_STEPS = [
  ['Install', 'npm ci --ignore-scripts --prefix tooling/arc-preview'],
  ['Start this viewer', 'npm run dev --prefix tooling/arc-preview'],
  ['Typecheck and build', 'npm run build --prefix tooling/arc-preview'],
] as const

function Code({ children }: { children: string }) {
  return <pre className="mono mt-2 overflow-x-auto rounded-lg bg-black/30 p-3 text-xs leading-relaxed">{children}</pre>
}

export function RunLocally() {
  return (
    <section className="card p-5 sm:p-6" aria-label="Run locally">
      <p className="eyebrow">Run it</p>
      <h2 className="display mt-1 text-2xl font-semibold">Run this viewer and the AXP stack locally</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="inner p-5">
          <p className="text-sm font-semibold">AXP frontend and backend (from the AXP Arc README)</p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Requires Node 22.18+, npm and pnpm 10.18.3 (the run used Node 22.23.4). From the AXP repository root. These use fixtures and loopback HTTP: no wallet, no funding, no paid model
            providers.
          </p>
          <Code>{INSTALL}</Code>
          <p className="mt-4 text-sm font-semibold">Start the prepared local demo</p>
          <Code>npm run arc:demo</Code>
          <ul className="mt-2 space-y-1 text-xs text-[var(--muted)]">
            <li>
              Advertiser: <span className="mono break-all">http://127.0.0.1:3440/advertiser-dashboard/</span>
            </li>
            <li>
              Publisher: <span className="mono break-all">http://127.0.0.1:3440/publisher-demo/?network=arc-testnet</span>
            </li>
            <li>One local origin (port 3440) serves the existing AXP frontend and backend. Startup does not fund a campaign or resubmit a transfer.</li>
            <li>
              The prepared workspace is <span className="mono">local-state/arc/product</span> and holds the funded state and original payment identities. Do not delete or reset it; its keys are in an
              ignored wallet file and never leave that machine.
            </li>
          </ul>
          <p className="mt-4 text-sm font-semibold">Verify the preserved evidence (read-only)</p>
          <Code>{VERIFY}</Code>
          <p className="mt-2 text-xs text-[var(--subtle)]">
            Read-only Arc RPC and Gateway requests. It checks funding calldata and amounts, native receipts and fees, transfer IDs, parties and amounts, and the completed batch receipt. It never reads a
            wallet and never signs or sends.
          </p>
          <details className="mt-4 text-xs text-[var(--muted)]">
            <summary className="min-h-[44px] cursor-pointer py-3 font-semibold text-[var(--warn)]">Fresh test workspace only (funds a wallet, needs separate authorization)</summary>
            <p>
              Not for reviewers. A fresh, separately authorized workspace uses <span className="mono">npm run arc:wallet</span>, a human faucet top-up of the printed public payer address,{' '}
              <span className="mono">npm run arc:prepare</span> (one campaign, one 0.02 test USDC Gateway deposit) and then <span className="mono">npm run arc:demo</span>. Development caps: two
              allocations, 0.04 test USDC deposits, 0.016 aggregate accepted obligations, 1 test USDC native fees. It does not authorize another run on a new machine, mainnet or real funds.
            </p>
          </details>
        </div>
        <div className="space-y-4">
          <div className="inner p-5">
            <p className="text-sm font-semibold">This read-only preview (from the AXP repository)</p>
            <dl className="mt-3 space-y-2 text-sm">
              {STUDIO_STEPS.map(([label, cmd]) => (
                <div key={cmd} className="flex flex-wrap items-baseline justify-between gap-2">
                  <dt className="text-[var(--muted)]">{label}</dt>
                  <dd className="mono rounded-md bg-black/25 px-2 py-1 text-xs">{cmd}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-[var(--subtle)]">
              The viewer needs no keys or backend. Wallet providers, signing code and development traces are excluded from this preview package.
            </p>
          </div>
          <div className="inner p-5">
            <p className="text-sm font-semibold">Opening this project, as observed</p>
            <ul className="mt-2 space-y-1.5 text-xs text-[var(--muted)]">
              <li>
                The owner app URL <span className="mono break-all">{evidence.studio.url}</span> redirected to the Studio root in a private Safari window, so it is not an anonymous link.
              </li>
              <li>The Studio Share menu offered deployment hosts only. No anonymous share URL is known, and none is claimed here.</li>
              <li>The preview source is preserved in the AXP branch at tooling/arc-preview. Studio itself must be shown in the submission video.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
