import type { ReactNode } from "react";
import { Chrome, type NavCampaign, type NavOpp } from "@/components/chrome";
import { run, usdc } from "@/data/select";
import { shortLabel } from "@/components/v2/derive";
import { hasDevnet } from "@/components/v2/devnet";

export default function ExplorerLayout({ children }: { children: ReactNode }) {
  const opps: NavOpp[] = run.opportunities.map((o) => ({ n: o.n, label: shortLabel(o), meta: o.award ? usdc(o.award.priceBaseUnits) : "no fill" }));
  const campaigns: NavCampaign[] = run.campaigns.map((c) => ({ slug: c.slug, name: c.businessName, meta: c.funded ? "" : "unfunded" }));
  return (
    <Chrome devnet={hasDevnet} runId={run.source.runId} runLabel={`Recorded run, ${new Date(run.opportunities[0].createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`} opps={opps} campaigns={campaigns} verifyMeta="48 checks">
      {children}
    </Chrome>
  );
}
