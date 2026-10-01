import type { Metadata } from "next";
import { Ld } from "@axp/design-system/ledger";
import { VerifyRunner, type CheckRow } from "@/components/VerifyRunner";
import { buildMeta, run } from "@/data/select";
import { verifyChecks } from "@/lib/verify.ts";
import { asset } from "@/lib/paths";

export const metadata: Metadata = { title: "Verify" };

export default async function VerifyPage() {
  const r = run.restart;
  // The list of checks (labels and recorded values) is laid out at build time; the browser computes the results.
  const rows: CheckRow[] = (await verifyChecks(run)).map(({ id, group, label, method, expected }) => ({ id, group, label, method, expected }));
  const removed = ["agent and agent-run IDs", "raw model requests and outputs (their hashes are kept)", "the conversion field", "packet byte copies", "the sandbox network address and settlement links", "absolute wallet balances", "the full evidence catalogue", "laboratory data"];
  return (
    <>
      <Ld.PageBar
        title="Verify the record yourself"
        sub="Your browser downloads the public record of the run and recomputes its hashes, the publisher's Ed25519 signatures (against the key published in the same file) and the money arithmetic. The checks use the downloadable file, not the values printed on these pages."
        actions={
          <a className="ld-btn ld-btn--primary" href={asset("/run.public.json")} download="run.public.json">
            Download run.public.json
          </a>
        }
      />
      <VerifyRunner rows={rows} />
      <div className="ld-cols-2">
        <Ld.Panel title="Restart without models or payments" sub="Recorded when the run was restarted; reported here, not recomputed">
          <div className="ld-cols-2">
            <Ld.Stat label="New model calls" value={r.newCalls} />
            <Ld.Stat label="New charges" value={r.newCharges} />
            <Ld.Stat label="New signatures" value={r.newSignatures} />
            <Ld.Stat label="New Solana sandbox transactions" value={r.newBroadcasts} />
          </div>
          <p className="ld-secondary" style={{ marginTop: 12 }}>
            {r.beforeHash === r.afterHash ? "The recorded state hash was identical before and after the restart." : "The recorded state hash changed across the restart."}
          </p>
        </Ld.Panel>
        <Ld.Panel title="The public file" sub="What it contains and what was left out">
          <div className="ld-stack" style={{ gap: 8 }}>
            <span className="ld-secondary">
              Projected from the run's saved record, whose hash matches its manifest. {buildMeta.selfChecks.filter((c) => c.ok).length} of {buildMeta.selfChecks.length} build checks passed, including a vector guard (no embeddings ship) and a scan for private fields.
            </span>
            <span className="ld-secondary">Left out: {removed.join(", ")}.</span>
          </div>
        </Ld.Panel>
      </div>
      <div className="ld-cols-2">
        <Ld.Panel title="What this proves">
          <ul className="ev2-list" style={{ color: "var(--ld-text)" }}>
            <li>The record is internally consistent: every hash marked recomputable (questions, packets, creatives, acknowledgements, receipts) matches its content. Hashes marked recorded only are reported, not checked.</li>
            <li>Three receipts were signed by the key published in the file, over exactly these fields.</li>
            <li>Each charge links to its award, receipt and voucher, and the vouchers add up.</li>
            <li>Every bid equals the bid table applied to the agent's levels; ties went to the lower campaign ID.</li>
            <li>Each payment channel on the hosted Solana sandbox paid out plus refunded exactly its deposit; fees and rent stayed under the cap.</li>
          </ul>
        </Ld.Panel>
        <Ld.Panel title="What it does not prove">
          <ul className="ev2-list">
            <li>That a person saw or read a card. A receipt is the app's assertion that it inserted a labelled card.</li>
            <li>Anything on mainnet or devnet: money moved on a hosted Solana sandbox in test USDC.</li>
            <li>Independent advertisers: one disposable test payer funded both fictional advertisers.</li>
            <li>That history improves targeting: one observation per arm; not a measured lift.</li>
            <li>The model outputs themselves, or that displayed scores and evidence text match them: raw outputs and organic completions are recorded hashes only.</li>
            <li>That the file and the checker are independent: both are served by this site.</li>
          </ul>
        </Ld.Panel>
      </div>
    </>
  );
}
