// Devnet explorer links, rendered only when src/data/devnet.public.json exists (see src/data/devnet.ts).
import { Ld } from "@axp/design-system/ledger";
import { devnet, explorerAddress, explorerTx, type DevnetTx } from "@/data/devnet";
import { nameOf } from "@/data/select";

const short = (s: string) => `${s.slice(0, 8)}…${s.slice(-6)}`;
const Ext = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a className="ld-link" href={href} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
);

export const hasDevnet = !!devnet;

/** Full list: Settlement and Verify. */
export function DevnetPanel({ context }: { context: "settlement" | "verify" }) {
  if (!devnet) return null;
  return (
    <Ld.Panel
      id="devnet"
      title="Devnet explorer links"
      sub={
        context === "verify"
          ? "The same three receipts, also settled on Solana devnet. These links open the public explorer; this page does not check the chain itself."
          : "The same three receipts, also settled on Solana devnet with test tokens. Open each transaction in the public explorer."
      }
      actions={<Ld.Tag tone="outline">Solana devnet</Ld.Tag>}
      flush
      foot={devnet.note ? <span>{devnet.note}</span> : undefined}
    >
      <Ld.Table
        columns={[
          { key: "l", head: "Transaction", cell: (t: DevnetTx) => <span className="ld-stack" style={{ gap: 2 }}><span className="ld-strong">{t.label}</span>{t.campaignId ? <span className="ld-caption">{nameOf(t.campaignId)}</span> : null}</span> },
          { key: "s", head: "Signature", cell: (t) => <span className="ld-mono">{short(t.signature)}</span> },
          { key: "slot", head: "Slot", num: true, cell: (t) => (typeof t.slot === "number" ? t.slot.toLocaleString("en-US") : <span className="ld-faint">not given</span>) },
          { key: "x", head: "", cell: (t) => <Ext href={explorerTx(t.signature)}>Open in explorer</Ext> },
        ]}
        rows={devnet.transactions}
      />
      {devnet.programId || devnet.accounts.length ? (
        <div className="ld-stack" style={{ gap: 6, padding: "12px 16px", borderTop: "1px solid var(--ld-border)" }}>
          {devnet.programId ? (
            <span className="ld-secondary">
              Program <span className="ld-mono">{short(devnet.programId)}</span> <Ext href={explorerAddress(devnet.programId)}>Open in explorer</Ext>
            </span>
          ) : null}
          {devnet.accounts.map((a) => (
            <span key={a.address} className="ld-secondary">
              {a.label} <span className="ld-mono">{short(a.address)}</span> <Ext href={explorerAddress(a.address)}>Open in explorer</Ext>
            </span>
          ))}
        </div>
      ) : null}
    </Ld.Panel>
  );
}

/** One line for the Overview "Why Solana" panel. */
export function DevnetLine() {
  if (!devnet) return null;
  return (
    <span className="ld-secondary">
      The same three receipts were also settled on Solana devnet: {devnet.transactions.length} transaction{devnet.transactions.length === 1 ? "" : "s"} you can open in the public explorer. <a className="ld-link" href="/settlement/#devnet">See the links</a>
    </span>
  );
}
