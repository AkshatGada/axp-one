import type { Metadata } from "next";
import { Callout, CheckMark, CopyHash, DataTable, KeyValue, PageHead, Provenance, Section } from "@axp/design-system/ledger";
import { VerifyRunner } from "@/components/VerifyRunner";
import { buildMeta, run } from "@/data/select";
import { asset } from "@/lib/paths";

export const metadata: Metadata = { title: "Verify" };

export default function VerifyPage() {
  const r = run.restart;
  return (
    <>
      <PageHead
        kicker={<Provenance kind="replay" />}
        title="Check the record yourself."
        lede="Your browser downloads the public record of the run and recomputes its hashes, the publisher's Ed25519 signatures and the money arithmetic. Nothing here trusts the page that displays it."
      >
        <div className="lg-row" style={{ gap: 12 }}>
          <a className="lg-btn" href={asset("/run.public.json")} download="run.public.json">
            Download run.public.json
          </a>
          <span className="lg-small">
            sha256 <span className="lg-data-sm">{buildMeta.output.sha256.slice(0, 16)}…</span>, {buildMeta.output.bytes.toLocaleString("en-US")} bytes, projected from <span className="lg-data-sm">{run.source.runPath}</span> (sha256 <span className="lg-data-sm">{run.source.runSha256.slice(0, 12)}…</span>, matching the run manifest).
          </span>
        </div>
      </PageHead>

      <VerifyRunner />

      <Section id="restart" title="Restart without models or payments" lede={r.method}>
        <KeyValue
          rows={[
            { k: "State before", v: <CopyHash value={r.beforeHash} label="state hash before" /> },
            { k: "State after", v: <span className="lg-stack-sm" style={{ gap: 6 }}><CopyHash value={r.afterHash} label="state hash after" /><CheckMark state={r.beforeHash === r.afterHash ? "pass" : "fail"}>{r.beforeHash === r.afterHash ? "Identical" : "Different"}</CheckMark></span> },
            { k: "New model calls", v: <span className="lg-data">{r.newCalls}</span> },
            { k: "New charges", v: <span className="lg-data">{r.newCharges}</span> },
            { k: "New signatures", v: <span className="lg-data">{r.newSignatures}</span> },
            { k: "New broadcasts", v: <span className="lg-data">{r.newBroadcasts}</span> },
            { k: "Receipts replayed", v: <span className="lg-small">{r.duplicateReceipts.filter((d) => d.replayed).length} of {r.duplicateReceipts.length} original signed receipts replayed, none charged twice</span> },
          ]}
        />
        <p className="lg-small">Recorded by the run at restart; these values are reported, not recomputed here.</p>
      </Section>

      <Section id="scope" title="What this proves, and what it does not">
        <div className="vf-proves">
          <div className="lg-stack-sm">
            <span className="lg-label" style={{ color: "var(--ink)" }}>Proves</span>
            <ul className="vf-list">
              <li>The record you downloaded is internally consistent: every hash shown on these pages matches its content.</li>
              <li>Three receipts were signed by the publisher key {run.publisher.publisherKeyId}, over exactly these fields.</li>
              <li>Each charge is linked to its award, receipt and voucher, and the vouchers add up.</li>
              <li>Every bid equals the bid table applied to the agent's levels; ties went to the lower campaign ID.</li>
              <li>Each channel paid out plus refunded exactly its deposit; fees and rent stayed under the cap.</li>
            </ul>
          </div>
          <div className="lg-stack-sm">
            <span className="lg-label" style={{ color: "var(--ink)" }}>Does not prove</span>
            <ul className="vf-list">
              <li>That a person saw or read a card. A receipt is the app's assertion that it inserted a labelled card. {/* claim-ok: negation */}</li>
              <li>Anything on mainnet or devnet. Money moved on a hosted Solana sandbox in test USDC. {/* claim-ok: negation */}</li>
              <li>Independent advertisers. One disposable test payer funded both fictional advertisers.</li>
              <li>That history improves targeting. One observation per arm; not a measured lift. {/* claim-ok: negation */}</li>
              <li>The model outputs themselves. Raw outputs, requests and organic completions are recorded hashes only.</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section id="removed" title="What the public file leaves out" lede="The public record is a projection of the run with private or irrelevant fields removed. The build fails if any of them leak, if any numeric array is longer than 64 (no vectors), or if the counts or money do not add up.">
        <DataTable
          columns={[
            { key: "f", head: "Removed", cell: (r: { field: string; count: number }) => r.field },
            { key: "c", head: "Items", num: true, cell: (r) => <span className="lg-data-sm">{r.count.toLocaleString("en-US")}</span> },
          ]}
          rows={buildMeta.sanitization.removed}
        />
        <Callout>
          <p>
            {buildMeta.selfChecks.filter((c) => c.ok).length} of {buildMeta.selfChecks.length} build-time self-checks passed when this page was built, including the vector guard, the forbidden-string scan and the 300 KB size budget.
          </p>
        </Callout>
      </Section>
    </>
  );
}
