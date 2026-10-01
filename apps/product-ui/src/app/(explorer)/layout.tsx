import type { ReactNode } from "react";
import { Chrome, type NavCampaign, type NavOpp } from "@/components/chrome";
import { run, usdc } from "@/data/select";
import { shortLabel } from "@/components/v2/derive";

export default function ExplorerLayout({ children }: { children: ReactNode }) {
  const opps: NavOpp[] = run.opportunities.map((o) => ({ n: o.n, label: shortLabel(o), meta: o.award ? usdc(o.award.priceBaseUnits) : "no fill" }));
  const campaigns: NavCampaign[] = run.campaigns.map((c) => ({ slug: c.slug, name: c.businessName, meta: c.funded ? "" : "unfunded" }));
  return (
    <Chrome runId={run.source.runId} opps={opps} campaigns={campaigns} verifyMeta="48 checks">
      {children}
    </Chrome>
  );
}
