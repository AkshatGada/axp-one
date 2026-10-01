import type { Metadata } from "next";
import { Ld } from "@axp/design-system/ledger";
import { campaign, decisionFor, nameOf, run, usdc } from "@/data/select";
import { computeBid, reason } from "@/lib/policy.ts";
import { shortLabel } from "@/components/v2/derive";
import { TryApp, type TryOpp } from "@/components/v2/TryApp";
import { numWord } from "@/data/story";

export const metadata: Metadata = { title: "Draft a campaign (synthetic)" };

/** Parity of the ported rules with every recorded bid and exclusion, computed when the page is built. */
function parity() {
  let ok = 0;
  let total = 0;
  for (const o of run.opportunities) {
    for (const b of o.auction.bids) {
      const d = decisionFor(o, b.campaignId, "history")!;
      const r = computeBid(d, { maxBidBaseUnits: b.maxBidBaseUnits }, b.availableCampaignBaseUnits, b.availableChannelBaseUnits, o.floorBaseUnits);
      total++;
      if (r.status === "bid" && r.amountBaseUnits === b.amountBaseUnits) ok++;
    }
    for (const x of o.eligibility.excluded) {
      const c = campaign(x.campaignId);
      const prior = run.opportunities.filter((p) => p.award?.campaignId === c.campaignId && p.award.createdAt < o.createdAt).length;
      const r = reason(c, { ...o, taskConstraints: o.mandatoryCapabilities }, { channel: { publisherId: o.publisherId, status: "open" }, sessionAwards: prior, available: { campaign: c.budgetCapBaseUnits, channel: "20000" }, ignoreFunding: true });
      total++;
      if (r === x.reason) ok++;
    }
  }
  return { ok, total };
}

export default function TryPage() {
  const opps: TryOpp[] = run.opportunities.map((o) => {
    const ref = (o.award ? decisionFor(o, o.award.campaignId, "history") : undefined) ?? o.decisions.find((d) => d.arm === "history" && d.decision === "bid") ?? o.decisions.find((d) => d.arm === "history");
    return {
      n: o.n,
      label: shortLabel(o),
      required: o.mandatoryCapabilities,
      coarseIntent: o.coarseIntent,
      destination: o.destination,
      floor: o.floorBaseUnits,
      publisherId: o.publisherId,
      refLevels: ref ? { relevance: ref.relevanceLevel, intent: ref.commercialIntentLevel, from: nameOf(ref.campaignId) } : null,
      recordedWinner: o.award ? `${usdc(o.award.priceBaseUnits)} (${nameOf(o.award.campaignId)})` : null,
    };
  });
  const presets = run.campaigns
    .filter((c) => c.slug !== "keyforge")
    .map((c) => ({ name: c.businessName, creative: c.creative.approvedText, hints: c.contextHints, maxBid: c.maxBidBaseUnits, cap: c.budgetCapBaseUnits, caps: c.declaredConstraints as string[], funded: c.funded }));
  const p = parity();
  return (
    <>
      <Ld.PageBar
        title="Draft a campaign"
        meta={<Ld.Pv kind="synthetic" label="Synthetic preview" />}
        sub={`See how the exchange's own rules would treat a campaign you describe, against the ${numWord(run.opportunities.length)} questions of this run. Rules verified against this run when this page was built.`}
        actions={<Ld.Tag tone={p.ok === p.total ? "success" : "danger"} dot>{`Rules verified ${p.ok}/${p.total}`}</Ld.Tag>}
      />
      <Ld.Callout tone="warning" title="Synthetic preview. Runs in your browser only.">
        No model, no evidence retrieval, no money, and nothing changes the recorded run. Agent levels are yours to set; this preview never shows a win.
      </Ld.Callout>
      <TryApp opps={opps} presets={presets} />
    </>
  );
}
