import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Ld } from "@axp/design-system/ledger";
import { channelFor, nameOf, run, usdc } from "@/data/select";
import { campaignStats } from "@/components/v2/derive";
import { RowLink } from "@/components/v2/RowLink";
import { NET, capWords, list, numWord, onePayer } from "@/data/story";

export const metadata: Metadata = { title: "Campaigns" };
const L = Link as unknown as Ld.LinkC;
const plain = capWords;

export default function CampaignsPage() {
  const stats = run.campaigns.map((c) => campaignStats(c.campaignId));
  const stage = (label: string, ok: boolean | "pending", detail: ReactNode, tag?: ReactNode) => (
    <div className="ad2-stage" data-state={ok === true ? "done" : ok === "pending" ? "pending" : "skip"}>
      <span className="ad2-stage-h">
        <i aria-hidden>{ok === true ? "✓" : ""}</i>
        {label}
        {tag}
      </span>
      <span className="ld-secondary">{detail}</span>
    </div>
  );
  return (
    <>
      <Ld.PageBar
        title="Campaigns"
        meta={<Ld.Pv kind="fictional" label="Fictional advertisers" />}
        sub={`${numWord(run.campaigns.length).replace(/^./, (c) => c.toUpperCase())} fictional advertisers joined this run. What they sell are declarations, not verified product facts. Each declared, got one version approved, accepted the limits and, to bid, funded a payment channel on ${NET.the}. Then the run froze them.`}
        actions={
          <Ld.Button href="/try/" Link={L}>
            Draft a campaign (synthetic)
          </Ld.Button>
        }
      />
      <Ld.Panel title="All campaigns" flush>
        <Ld.Table
          columns={[
            { key: "c", head: "Campaign", cell: (s: (typeof stats)[number]) => <RowLink href={`/advertisers/${s.c.slug}/`}><span className="ld-row" style={{ gap: 10 }}><span className="ld-avatar" data-tone={s.funded ? undefined : "muted"} style={{ width: 28, height: 28, fontSize: 13, borderRadius: 7 }}>{s.c.businessName[0]}</span><span className="ld-strong">{s.c.businessName}</span></span></RowLink> },
            { key: "s", head: "Status", cell: (s) => (s.funded ? <Ld.Tag tone="success" dot>Active, funded</Ld.Tag> : <Ld.Tag tone="dashed">Unfunded</Ld.Tag>) },
            { key: "d", head: "Declares", cell: (s) => <span className="ld-secondary">{s.c.declaredConstraints.map(plain).join(", ")}</span> },
            { key: "e", head: "Eligible", num: true, cell: (s) => `${s.eligible} of ${run.opportunities.length}` },
            { key: "calls", head: "Agent calls", num: true, cell: (s) => s.calls },
            { key: "w", head: "Wins", num: true, cell: (s) => s.wins },
            { key: "sp", head: "Spend vs cap", cell: (s) => <Ld.Progress value={s.spend} max={s.cap} label={`${usdc(s.spend)} of ${usdc(s.cap)} USDC`} /> },
          ]}
          rows={stats}
        />
      </Ld.Panel>

      <Ld.Panel title="How each one joined" sub="Recorded onboarding, five stages, before the first question">
        <div className="ad2-flow">
          <span />
          {["1 Declare", "2 Approve", "3 Limits", "4 Fund", "5 Frozen"].map((h) => (
            <span key={h} className="ld-label ad2-col">
              {h}
            </span>
          ))}
          {run.campaigns.map((c) => {
            const ch = channelFor(c.campaignId);
            return [
              <Link key={`${c.slug}-n`} href={`/advertisers/${c.slug}/`} className="ad2-name">
                <span className="ld-avatar" data-tone={c.funded ? undefined : "muted"} style={{ width: 32, height: 32, fontSize: 14, borderRadius: 8 }}>
                  {c.businessName[0]}
                </span>
                <span className="ld-strong">{c.businessName}</span>
              </Link>,
              <div key={`${c.slug}-1`}>{stage("Declared", true, `${c.declaredConstraints.length} capabilities: ${c.declaredConstraints.map(plain).join(", ")}`)}</div>,
              <div key={`${c.slug}-2`}>{stage("Approved", c.approved, `Version ${c.version}. Editing makes a new version; approved versions never change.`)}</div>,
              <div key={`${c.slug}-3`}>{stage("Limits set", true, `Max bid ${usdc(c.maxBidBaseUnits)} USDC, cap ${usdc(c.budgetCapBaseUnits)} USDC, placed at most ${run.policy.frequencyCap === 2 ? "twice" : `${run.policy.frequencyCap} times`} per session`)}</div>,
              <div key={`${c.slug}-4`}>{ch ? stage("Funded", true, `${usdc(ch.depositBaseUnits)} USDC (test) locked in a payment channel on ${NET.the}`) : stage("Not funded", "pending", "No channel opened, so it could never be charged", <Ld.Tag tone="dashed">Unfunded</Ld.Tag>)}</div>,
              <div key={`${c.slug}-5`}>{stage("Frozen", true, `Locked with the others before the first question`)}</div>,
            ];
          })}
        </div>
        <p className="ld-caption" style={{ marginTop: 12 }}>{onePayer ? `One disposable test payer funded ${list(run.channels.map((c) => nameOf(c.campaignId)))}; they are not independent wallets. ` : ""}Destinations are .example addresses shown as text, never linked.</p>
      </Ld.Panel>

      <div className="ld-cols-3">
        {run.campaigns.map((c) => (
          <Ld.Panel key={c.campaignId} title={`${c.businessName} creative`} sub="Approved Sponsored card" actions={<Ld.Button variant="ghost" size="sm" href={`/advertisers/${c.slug}/`} Link={L}>Open</Ld.Button>}>
            <Ld.SponsoredCard text={c.creative.approvedText} advertiser={c.businessName} url={c.creative.destinationURL} />
          </Ld.Panel>
        ))}
      </div>
    </>
  );
}
