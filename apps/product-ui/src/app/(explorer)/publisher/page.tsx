import type { Metadata } from "next";
import { InspectButton, Ld } from "@axp/design-system/ledger";
import { nameOf, run, usdc } from "@/data/select";
import { inspect } from "@/components/opportunity/parts";
import { shortLabel } from "@/components/v2/derive";
import { RowLink } from "@/components/v2/RowLink";
import { LiveSignatureV2 } from "@/components/v2/live";
import { NET } from "@/data/story";

export const metadata: Metadata = { title: "Publisher" };

export default function PublisherPage() {
  const p = run.publisher;
  const filled = run.opportunities.filter((o) => o.award);
  return (
    <>
      <Ld.PageBar
        title="What the publisher saw and earned"
        meta={<Ld.Tag>Demo AI app</Ld.Tag>}
        sub="The organic answer never receives advertiser material. A no-fill turn still answers the user in full. The app is paid only for deliveries it signed."
        actions={
          <InspectButton payload={{ key: "publisher", title: "Publisher", sourcePath: "publishers[0]", json: p, note: `The publisher ID ${p.publisherId} is inherited from an earlier prototype.` }}>
            Inspect publisher
          </InspectButton>
        }
      />
      <div className="ld-kpis">
        <Ld.Kpi label="Opportunities offered" value={run.opportunities.length} context="One Sponsored slot per answer" />
        <Ld.Kpi label="Filled" value={`${filled.length} of ${run.opportunities.length}`} context="1 no fill by rule" />
        <Ld.Kpi label="Signed receipts" value={filled.length} context="Each verified in your browser" />
        <Ld.Kpi label="Earned" value={usdc(run.totals.paidBaseUnits)} unit="USDC" context={`Test USDC, paid at channel close on ${NET.the}`} />
      </div>
      <div className="ov2-grid">
        <Ld.Panel title="Fill by opportunity" flush>
          <Ld.Table
            columns={[
              { key: "o", head: "Opportunity", cell: (o: (typeof run.opportunities)[number]) => <RowLink href={`/opportunity/${o.n}/`}><span className="ld-faint">{o.n}</span> <span className="ld-strong">{shortLabel(o)}</span></RowLink> },
              { key: "s", head: "Slot", cell: (o) => (o.award ? <Ld.Tag tone="brand">Filled</Ld.Tag> : <Ld.Tag tone="dashed">No fill</Ld.Tag>) },
              { key: "w", head: "Card shown", cell: (o) => (o.award ? nameOf(o.award.campaignId) : <span className="ld-faint">publisher note only</span>) },
              { key: "p", head: "Price", num: true, cell: (o) => (o.award ? usdc(o.award.priceBaseUnits) : <span className="ld-faint">none</span>) },
              { key: "d", head: "Delivered", num: true, cell: (o) => (o.delivery ? `+${(o.delivery.msAfterAward / 1000).toFixed(1)} s` : <span className="ld-faint">none</span>) },
              { key: "r", head: "Receipt", cell: (o) => (o.receipt ? <InspectButton payload={inspect.receipt(o)} variant="text">Signed</InspectButton> : <span className="ld-faint">none</span>) },
            ]}
            rows={run.opportunities}
          />
        </Ld.Panel>
        <Ld.Panel title="Payout by channel" sub={`Payment channels on ${NET.the}, test USDC`}>
          <div className="ld-stack">
            {run.channels.map((ch) => (
              <div key={ch.channelId} className="ld-between">
                <span className="ld-row" style={{ gap: 8 }}>
                  <Ld.Money state="settled" label={`From ${nameOf(ch.campaignId)}`} />
                </span>
                <span className="ld-strong ld-num">{usdc(ch.settledBaseUnits)}</span>
              </div>
            ))}
            <div className="ld-divider" />
            <div className="ld-between">
              <span className="ld-strong">Total</span>
              <span className="ld-kpi-num" style={{ fontSize: 22 }}>{usdc(run.totals.paidBaseUnits)}</span>
            </div>
            <span className="ld-caption">Each close transaction added exactly this to the publisher; earlier balances are not shown.</span>
          </div>
        </Ld.Panel>
      </div>
      <Ld.Panel title="Signature checks" sub="The publisher key signed each receipt; your browser verifies it now">
        <div className="ld-cols-3">
          {filled.map((o) => (
            <div key={o.n} className="ld-stack" style={{ gap: 6 }}>
              <span className="ld-strong">Opportunity {o.n}, {nameOf(o.award!.campaignId)}</span>
              <LiveSignatureV2 fields={o.receipt!.fields} signature={o.receipt!.signature} pem={p.publicKeyPEM} />
            </div>
          ))}
        </div>
      </Ld.Panel>
      <div className="ld-cols-2">
        <Ld.Panel title="Slot settings">
          <div className="ld-cols-2">
            <Ld.Stat label="Slot" value="One Sponsored card under the answer" />
            <Ld.Stat label="Floor price" value={`${usdc(p.floorBaseUnits)} test USDC`} />
            <Ld.Stat label="Topic offered" value="Crypto wallet tools" />
            <Ld.Stat label="Frequency cap" value="2 per campaign per session" />
          </div>
        </Ld.Panel>
        <Ld.Callout title="A receipt is not attention">
          A signed receipt proves the app's assertion that it inserted a labelled card. It does not show that a person saw, read or acted on it.
        </Ld.Callout>
      </div>
    </>
  );
}
