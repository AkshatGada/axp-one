import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClampText, InspectButton, Ld } from "@axp/design-system/ledger";
import { nameOf, opportunity, run } from "@/data/select";
import { inspect } from "@/components/opportunity/parts";
import { outcomeTag, shortLabel } from "@/components/v2/derive";
import { pipeStages, stageIds, stagePanels } from "@/components/v2/stages";
import { OPP_BOOT, OpportunityProvider, PipelineBar, SlotV2, StageNav, StageView } from "@/components/v2/OpportunityStages";

const L = Link as unknown as Ld.LinkC;

export function generateStaticParams() {
  return run.opportunities.map((o) => ({ n: String(o.n) }));
}
export async function generateMetadata({ params }: { params: Promise<{ n: string }> }): Promise<Metadata> {
  const { n } = await params;
  const o = run.opportunities.find((x) => String(x.n) === n);
  return { title: o ? `Opportunity ${o.n}: ${shortLabel(o)}` : "Opportunity" };
}

export default async function OpportunityPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const num = Number(n);
  if (!run.opportunities.some((x) => x.n === num)) notFound();
  const o = opportunity(num);
  const tag = outcomeTag(o);
  const noFill = o.status === "no_fill";
  const prev = num > 1 ? num - 1 : null;
  const next = num < run.opportunities.length ? num + 1 : null;
  return (
    <OpportunityProvider ids={stageIds(o)} deliveredFrom={6}>
      <script dangerouslySetInnerHTML={{ __html: OPP_BOOT }} />
      <Ld.PageBar
        crumbs={<Ld.Breadcrumbs Link={L} items={[{ label: "Opportunities", href: "/opportunity/1/" }, { label: `${o.n} of ${run.opportunities.length}` }]} />}
        title={shortLabel(o)}
        meta={
          <>
            <Ld.Tag tone={tag.tone}>{tag.label}</Ld.Tag>
            {o.award ? <Ld.Tag>{`${nameOf(o.award.campaignId)} won`}</Ld.Tag> : null}
          </>
        }
        sub={`“${o.question}”`}
        actions={
          <>
            {prev ? (
              <Ld.Button variant="secondary" href={`/opportunity/${prev}/`} Link={L}>
                ← Opportunity {prev}
              </Ld.Button>
            ) : null}
            {next ? (
              <Ld.Button variant="secondary" href={`/opportunity/${next}/`} Link={L}>
                Opportunity {next} →
              </Ld.Button>
            ) : (
              <Ld.Button variant="secondary" href="/settlement/" Link={L}>
                Settlement →
              </Ld.Button>
            )}
          </>
        }
      />
      <PipelineBar stages={pipeStages(o)} />
      <div className="op2-grid">
        <aside className="op2-app" aria-label="In the app">
          <div className="ld-between">
            <span className="ld-label">In the app</span>
            <InspectButton payload={inspect.organic(o)} variant="text">
              Inspect answer
            </InspectButton>
          </div>
          <div className="ld-chat">
            <div className="ld-chat-bar">
              <span>{run.publisher.displayName}</span>
              <Ld.Pv kind="replay" label="Recorded" />
            </div>
            <div className="ld-chat-body">
              <div className="ld-chat-q">{o.question}</div>
              <div className="ld-chat-meta">
                <Ld.Pv kind="actual" />
                <span>The app's own answer, no advertiser material</span>
              </div>
              <div className="op2-answer">
                <ClampText text={o.organic.answer} lines={7} />
              </div>
              {noFill ? (
                <div className="ld-nofill">
                  <Ld.Pv kind="policy" label="No fill" /> No sponsored placement for this turn
                </div>
              ) : (
                <SlotV2 card={<Ld.SponsoredCard text={o.award!.creative.approvedText} advertiser={nameOf(o.award!.campaignId)} url={o.award!.creative.destinationURL} />} awaiting={<div className="ld-await">Sponsored slot, awaiting auction</div>} />
              )}
            </div>
          </div>
          <span className="ld-caption">{noFill ? "Demo AI app (the publisher). No card for this turn; the answer still serves the user." : "Demo AI app (the publisher). In one-stage view the slot fills when the replay reaches delivery."}</span>
        </aside>
        <div className="ld-stack" style={{ gap: 16, minWidth: 0 }}>
          <StageView panels={stagePanels(o)} />
          <div className="ld-between">
            <span className="ld-caption">Recorded replay. Timings are as recorded; nothing re-executes.</span>
            <StageNav total={stageIds(o).length} next={next ? { href: `/opportunity/${next}/`, label: `Next: Opportunity ${next} →` } : { href: "/settlement/", label: "Next: Settlement →" }} />
          </div>
        </div>
      </div>
    </OpportunityProvider>
  );
}
