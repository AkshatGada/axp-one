import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InspectButton, Ld } from "@axp/design-system/ledger";
import { campaignBySlug, channelFor, decisionFor, evidenceRecord, run, usdc } from "@/data/select";
import type { Opportunity } from "@/data/types";
import { campaignStats, shortLabel } from "@/components/v2/derive";
import { inspect } from "@/components/opportunity/parts";
import { RowLink } from "@/components/v2/RowLink";
import { NET, capChip, capWords, list } from "@/data/story";

const L = Link as unknown as Ld.LinkC;
const plain = capWords;

export function generateStaticParams() {
  return run.campaigns.map((c) => ({ slug: c.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: campaignBySlug(slug)?.businessName ?? "Campaign" };
}

export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = campaignBySlug(slug);
  if (!c) notFound();
  const s = campaignStats(c.campaignId);
  const ch = channelFor(c.campaignId);
  const rows = run.opportunities.map((o) => {
    const ex = o.eligibility.excluded.find((x) => x.campaignId === c.campaignId);
    const h = decisionFor(o, c.campaignId, "history");
    const b = decisionFor(o, c.campaignId, "text_only");
    const bid = o.auction.bids.find((x) => x.campaignId === c.campaignId);
    const won = o.award?.campaignId === c.campaignId;
    let outcome: { label: string; tone?: "brand" | "warning" | "dashed" | "outline" | "solid" } = { label: "" };
    if (o.status === "no_fill" && !o.decisions.length) outcome = { label: "No fill, nobody called", tone: "dashed" };
    else if (o.status === "no_fill") outcome = { label: "No fill", tone: "dashed" };
    else if (won) outcome = { label: o.auction.tieBreakApplied ? "Won on tie-break" : "Won", tone: "solid" };
    else if (bid) outcome = { label: o.auction.tieBreakApplied ? "Lost the tie-break" : "Lost", tone: "outline" };
    else if (ex?.reason === "frequency_cap") outcome = { label: "Bid, not admitted (cap)", tone: "warning" };
    else if (ex) outcome = { label: "Excluded by rule", tone: "dashed" };
    else if (h && h.decision !== "bid") outcome = { label: "Agent skipped", tone: "outline" };
    return { o, ex, h, b, bid, won, outcome };
  });
  const neverPaid = s.wins === 0;
  const firstAsked = run.opportunities.find((o) => decisionFor(o, c.campaignId, "history")?.retrieval);
  const evidence = neverPaid && firstAsked ? (decisionFor(firstAsked, c.campaignId, "history")?.retrieval?.examples ?? []) : [];
  const nExcluded = rows.filter((r) => r.ex && r.ex.reason !== "frequency_cap").length;
  const nSkipped = rows.filter((r) => !r.ex && r.h && r.h.decision !== "bid").length;
  const nLost = rows.filter((r) => r.bid && !r.won).length;
  const why = [nExcluded ? `excluded by rule in ${nExcluded} of ${run.opportunities.length} questions` : null, nSkipped ? `its agent skipped ${nSkipped === 1 ? "once" : `${nSkipped} times`}` : null, nLost ? `it lost ${nLost === 1 ? "one auction" : `${nLost} auctions`}` : null, !s.funded ? "it never funded a channel" : null].filter(Boolean) as string[];
  return (
    <>
      <Ld.Breadcrumbs Link={L} items={[{ label: "Campaigns", href: "/advertisers/" }, { label: c.businessName }]} />
      <Ld.CampaignHeader
        initial={c.businessName[0]}
        muted={!s.funded}
        name={c.businessName}
        status={
          <>
            {s.funded ? <Ld.Tag tone="success" dot>Active, funded</Ld.Tag> : <Ld.Tag tone="dashed">Unfunded</Ld.Tag>}
            <Ld.Pv kind="fictional" />
          </>
        }
        kpis={<span className="ld-secondary">{neverPaid ? `Why ${c.businessName} never paid: ${list(why) || "it never won"}.` : `Bid through its own agent, decided with Jev; paid only for signed deliveries.`}</span>}
        actions={ch ? <Ld.Button variant="secondary" size="sm" href={`/settlement/#${c.slug}`} Link={L}>Channel</Ld.Button> : null}
      />
      <div className="ld-kpis">
        <Ld.Kpi label="Eligible" value={`${s.eligible} of ${run.opportunities.length}`} context="Opportunities it could enter" />
        <Ld.Kpi label="Agent calls" value={s.calls} context="Including research-only baseline answers" />
        <Ld.Kpi label="Bids" value={s.bids} context="Admitted to an auction" />
        <Ld.Kpi label="Wins" value={s.wins} context="Delivered, signed, charged" />
        <Ld.Kpi label="Spend" value={usdc(s.spend)} unit="USDC" context={`of the ${usdc(s.cap)} USDC cap`} spark={<Ld.Progress value={s.spend} max={s.cap} />} />
      </div>
      <div className="ld-stack" style={{ gap: 16 }}>
        <Ld.Panel title="Decision history" sub="Every opportunity, in story order. Levels run from 0 to 3." flush>
          <Ld.Table
            columns={[
              { key: "o", head: "Opportunity", cell: (r: (typeof rows)[number]) => <RowLink href={`/opportunity/${r.o.n}/`}><span className="ld-faint">{r.o.n}</span> <span className="ld-strong">{shortLabel(r.o)}</span></RowLink> },
              { key: "e", head: "Eligible", cell: (r) => (r.ex ? <span className="ld-stack" style={{ gap: 2 }}><Ld.Tag tone="dashed">Excluded</Ld.Tag><span className="ld-caption">{r.ex.reason === "missing_constraint" ? `Missing ${r.ex.missing.map(plain).join(", ")}` : "Frequency cap"}</span></span> : "Yes") },
              { key: "b", head: "Baseline", cell: (r) => (r.b ? <span className="ld-nowrap">{`${r.b.decision === "bid" ? "Bid" : "Skip"}, relevance ${r.b.relevanceLevel}, intent ${r.b.commercialIntentLevel}`}</span> : <span className="ld-faint">not asked</span>) },
              { key: "h", head: "With history", cell: (r) => (r.h ? <span className="ld-nowrap">{`${r.h.decision === "bid" ? "Bid" : "Skip"}, relevance ${r.h.relevanceLevel}, intent ${r.h.commercialIntentLevel}`}</span> : <span className="ld-faint">not asked</span>) },
              { key: "bid", head: "Bid, USDC", num: true, cell: (r) => (r.bid ? usdc(r.bid.amountBaseUnits) : <span className="ld-faint">none</span>) },
              { key: "out", head: "Outcome", cell: (r) => (r.outcome.label ? <Ld.Tag tone={r.outcome.tone}>{r.outcome.label}</Ld.Tag> : null) },
              { key: "ch", head: "Charged, USDC", num: true, cell: (r) => (r.won && r.o.charge ? <span className="ld-strong">{usdc(r.o.charge.amountBaseUnits)}</span> : <span className="ld-faint">0</span>) },
            ]}
            rows={rows}
          />
        </Ld.Panel>
        <div className="ld-cols-2">
          <Ld.Panel title="Creative" sub={`Version ${c.version}, approved`} actions={<InspectButton payload={{ key: `campaign:${c.slug}`, title: `${c.businessName} campaign`, sourcePath: `state.exchange.campaigns[campaignId=${c.campaignId}]`, json: c, hashes: [{ label: "Creative hash", value: c.creativeHash, recomputable: true }] }}>Inspect</InspectButton>}>
            <Ld.SponsoredCard text={c.creative.approvedText} advertiser={c.businessName} url={c.creative.destinationURL} />
          </Ld.Panel>
          <Ld.Panel title="Declared capabilities" sub="Declarations, not verified product facts">
            <div className="ld-stack">
              <span className="ld-row" style={{ gap: 6 }}>
                {c.declaredConstraints.map((x) => (
                  <Ld.Tag key={x} tone="outline">
                    {capChip(x)}
                  </Ld.Tag>
                ))}
              </span>
              <span className="ld-secondary">“{c.contextHints}”</span>
            </div>
          </Ld.Panel>
        </div>
      </div>
      {ch ? (
        <Ld.Panel title={`Payment channel on ${NET.the}`} sub="Test USDC; vouchers against the deposit, campaign cap as a line">
          <div className="st2-cols">
            <Ld.BalanceBar
              total={Number(ch.depositBaseUnits)}
              legend
              segments={[
                ...ch.vouchers.map((v) => ({ key: `v${v.sequence}`, value: Number(v.incrementBaseUnits), state: "settled" as const, label: `Paid ${usdc(v.incrementBaseUnits)} (opportunity ${v.opportunityN})` })),
                { key: "r", value: Number(ch.refundBaseUnits), state: "refunded" as const, label: `Refunded ${usdc(ch.refundBaseUnits)}` },
              ]}
            />
            <Ld.StepChart max={Number(ch.depositBaseUnits)} cap={s.cap} format={(x) => usdc(x)} points={ch.vouchers.map((v) => ({ key: String(v.sequence), label: `Voucher ${v.sequence}, opp ${v.opportunityN}`, value: Number(v.cumulativeAmountBaseUnits) }))} />
          </div>
        </Ld.Panel>
      ) : null}
      {neverPaid && firstAsked ? (
        <Ld.Panel title="The evidence its agent saw" sub={`ContextHint history ${c.businessName}'s agent received for opportunity ${firstAsked.n}. Evidence cannot add a capability.`}>
          <div className="ld-cols-3">
            {evidence.map((e) => {
              const r = evidenceRecord(e.id)!;
              return <Ld.EvidenceCard key={e.id} prompt={r.promptText} advertiser={r.advertiser} creative={r.creativeText} sim={e.similarity} method={decisionFor(firstAsked, c.campaignId, "history")?.retrieval?.method ?? "vector"} />;
            })}
          </div>
          <div style={{ marginTop: 12 }}>
            <InspectButton payload={inspect.decision(firstAsked, decisionFor(firstAsked, c.campaignId, "history")!)}>Inspect its decision</InspectButton>
          </div>
        </Ld.Panel>
      ) : null}
    </>
  );
}
