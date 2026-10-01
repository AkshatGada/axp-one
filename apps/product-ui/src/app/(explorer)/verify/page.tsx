import type { Metadata } from "next";
import { Ld } from "@axp/design-system/ledger";
import { VerifyRunner } from "@/components/VerifyRunner";
import { buildMeta, run } from "@/data/select";
import { asset } from "@/lib/paths";

export const metadata: Metadata = { title: "Verify" };

export default function VerifyPage() {
  const r = run.restart;
  return (
    <>
      <Ld.PageBar
        title="Verify the record yourself"
        sub="Your browser downloads the public record of the run and recomputes its hashes, the publisher's Ed25519 signatures and the money arithmetic. Nothing here trusts the page that displays it."
        actions={
          <a className="ld-btn ld-btn--primary" href={asset("/run.public.json")} download="run.public.json">
            Download run.public.json
          </a>
        }
      />
      <VerifyRunner />
      <div className="ld-cols-2">
        <Ld.Panel title="Restart without models or payments" sub="Recorded at restart; reported, not recomputed here">
          <div className="ld-cols-2">
            <Ld.Stat label="New model calls" value={r.newCalls} />
            <Ld.Stat label="New charges" value={r.newCharges} />
            <Ld.Stat label="New signatures" value={r.newSignatures} />
            <Ld.Stat label="New Solana transactions" value={r.newBroadcasts} />
          </div>
          <div style={{ marginTop: 12 }}>
            <Ld.Verified state={r.beforeHash === r.afterHash ? "pass" : "fail"}>{r.beforeHash === r.afterHash ? "State identical before and after the restart" : "State changed"}</Ld.Verified>
          </div>
        </Ld.Panel>
        <Ld.Panel title="The public file" sub="What it contains and what was left out">
          <div className="ld-stack" style={{ gap: 8 }}>
            <span className="ld-secondary">
              Projected from the run's saved record, which matches its manifest. {buildMeta.selfChecks.filter((c) => c.ok).length} of {buildMeta.selfChecks.length} build checks passed, including a vector guard (no embeddings ship) and a scan for private fields.
            </span>
            <span className="ld-row" style={{ gap: 6 }}>
              {buildMeta.sanitization.removed.slice(0, 8).map((x) => (
                <Ld.Tag key={x.field}>{x.field.split(":")[0].split(" (")[0]}</Ld.Tag>
              ))}
            </span>
          </div>
        </Ld.Panel>
      </div>
      <div className="ld-cols-2">
        <Ld.Panel title="What this proves">
          <ul className="ev2-list" style={{ color: "var(--ld-text)" }}>
            <li>The record is internally consistent: every hash on these pages matches its content.</li>
            <li>Three receipts were signed by the publisher's key, over exactly these fields.</li>
            <li>Each charge links to its award, receipt and voucher, and the vouchers add up.</li>
            <li>Every bid equals the bid table applied to the agent's levels; ties went to the lower campaign ID.</li>
            <li>Each Solana channel paid out plus refunded exactly its deposit; fees and rent stayed under the cap.</li>
          </ul>
        </Ld.Panel>
        <Ld.Panel title="What it does not prove">
          <ul className="ev2-list">
            <li>That a person saw or read a card. A receipt is the app's assertion that it inserted a labelled card.</li>
            <li>Anything on mainnet or devnet: money moved on a hosted Solana sandbox in test USDC.</li>
            <li>Independent advertisers: one disposable test payer funded both fictional advertisers.</li>
            <li>That history improves targeting: one observation per arm; not a measured lift.</li>
            <li>The model outputs themselves: raw outputs and organic completions are recorded hashes only.</li>
          </ul>
        </Ld.Panel>
      </div>
    </>
  );
}
