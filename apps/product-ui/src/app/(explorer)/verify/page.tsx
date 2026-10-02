import type { Metadata } from "next";
import { Ld } from "@axp/design-system/ledger";
import { VerifyRunner, type CheckRow } from "@/components/VerifyRunner";
import { buildMeta, run } from "@/data/select";
import { verifyChecks } from "@/lib/verify.ts";
import { asset } from "@/lib/paths";
import { DevnetVerifyLinks, hasDevnet } from "@/components/v2/devnet";
import { devnet } from "@/data/devnet";
import { verifyDevnet } from "@/lib/verify-devnet.ts";
import { NET, numWord, onDevnet, onePayer } from "@/data/story";

export const metadata: Metadata = { title: "Verify" };

export default async function VerifyPage() {
  const r = run.restart;
  // The list of checks (labels and recorded values) is laid out at build time; the browser computes the results.
  const rows: CheckRow[] = (await verifyChecks(run)).map(({ id, group, label, method }) => ({ id, group, label, method }));
  const expectedIds = buildMeta.verify.ids;
  const devnetRows: CheckRow[] = devnet ? verifyDevnet(run, devnet).map(({ id, group, label, method }) => ({ id, group, label, method })) : [];
  const removed = ["agent and agent-run IDs", "raw model requests and outputs (their hashes are kept)", "model output fields the demo does not use", "packet byte copies", ...(onDevnet ? [] : ["the sandbox network address and settlement links"]), "absolute wallet balances", "the full evidence catalogue", "laboratory data"];
  return (
    <>
      <Ld.PageBar
        title="Verify the record yourself"
        sub={`Your browser downloads the public record of the run and recomputes ${expectedIds.length} checks: its hashes, the publisher's Ed25519 signatures (against the key published in the same file) and the money arithmetic.${devnetRows.length ? ` Then ${devnetRows.length} more checks tie the Devnet re-settlement file to the same receipts.` : ""} The checks use the downloadable files, not the values printed on these pages.`}
        actions={
          <a className="ld-btn ld-btn--primary" href={asset("/run.public.json")} download="run.public.json">
            Download run.public.json
          </a>
        }
      />
      <VerifyRunner rows={rows} expectedIds={expectedIds} devnetRows={devnetRows} devnetLinks={<DevnetVerifyLinks />} />
      <div className="ld-cols-2">
        <Ld.Panel title="Restart without models or payments" sub="Recorded when the run was restarted; reported here, not recomputed">
          <div className="ld-cols-2">
            <Ld.Stat label="New model calls" value={r.newCalls} />
            <Ld.Stat label="New charges" value={r.newCharges} />
            <Ld.Stat label="New signatures" value={r.newSignatures} />
            <Ld.Stat label={`New ${NET.short === "Devnet" ? "Devnet" : "Solana sandbox"} transactions`} value={r.newBroadcasts} />
          </div>
          <p className="ld-secondary" style={{ marginTop: 12 }}>
            {r.beforeHash === r.afterHash ? "The recorded state hash was identical before and after the restart." : "The recorded state hash changed across the restart."}
          </p>
        </Ld.Panel>
        <Ld.Panel title="The public file" sub="What it contains and what was left out">
          <div className="ld-stack" style={{ gap: 8 }}>
            <span className="ld-secondary">
              Projected from the run's saved record, whose hash matches its manifest. {buildMeta.selfChecks.filter((c) => c.ok).length} of {buildMeta.selfChecks.length} build checks passed, including a check that no embeddings ship and a scan for private fields.
            </span>
            <span className="ld-secondary">Left out: {removed.join(", ")}.</span>
          </div>
        </Ld.Panel>
      </div>
      <div className="ld-cols-2">
        <Ld.Panel title="What this proves">
          <ul className="ev2-list" style={{ color: "var(--ld-text)" }}>
            <li>The record is internally consistent: every hash marked recomputable (questions, packets, creatives, acknowledgements, receipts) matches its content. Hashes marked recorded only are reported, not checked.</li>
            <li>{`${numWord(run.counts.receipts).replace(/^./, (c) => c.toUpperCase())} receipt${run.counts.receipts === 1 ? " was" : "s were"} signed by the key published in the file, over exactly these fields.`}</li>
            <li>Each charge links to its award, receipt and voucher, and the vouchers add up.</li>
            <li>Every bid equals the bid table applied to the agent&apos;s levels{run.opportunities.some((o) => o.auction.tieBreakApplied) ? "; ties went to the lower campaign ID" : ""}.</li>
            <li>Each payment channel on {NET.the} paid out plus refunded exactly its deposit; fees and rent stayed under the cap.</li>
          </ul>
        </Ld.Panel>
        <Ld.Panel title="What it does not prove">
          <ul className="ev2-list">
            <li>That a person saw or read a card. A receipt is the app's assertion that it inserted a labelled card.</li>
            <li>{onDevnet ? "Anything on chain by itself: these checks read the file, not the chain. Open the Devnet explorer links on Settlement to compare. Devnet test USDC; not mainnet." : hasDevnet ? "Anything on chain: these checks read the files, not a chain. The recorded run settled on a hosted Solana sandbox in test USDC; Devnet links are below to open yourself." : "Anything on mainnet or Devnet: money moved on a hosted Solana sandbox in test USDC."}</li>
            {onePayer ? <li>Independent advertisers: one disposable test payer funded every funded advertiser.</li> : run.channels.length > 1 ? <li>Independent advertisers: each has its own test wallet, but the demo operator runs all of them.</li> : null}
            <li>That history improves targeting: this is one run, not a benchmark.</li>
            <li>The model outputs themselves, or that displayed scores and evidence text match them: raw outputs and organic completions are recorded hashes only.</li>
            <li>That the file and the checker are independent: both are served by this site.</li>
          </ul>
        </Ld.Panel>
      </div>
    </>
  );
}
