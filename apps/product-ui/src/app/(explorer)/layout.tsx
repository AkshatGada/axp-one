import type { ReactNode } from "react";
import { Chrome, type NavCampaign, type NavOpp } from "@/components/chrome";
import { run, usdc } from "@/data/select";
import { shortLabel } from "@/components/v2/derive";
import { CHECK_TOTAL } from "@/data/checks";
import { NET, runPhrase } from "@/data/story";
import { devnet } from "@/data/devnet";
import { verifyDevnet } from "@/lib/verify-devnet.ts";

export default function ExplorerLayout({ children }: { children: ReactNode }) {
  const opps: NavOpp[] = run.opportunities.map((o) => ({ n: o.n, label: shortLabel(o), meta: o.award ? usdc(o.award.priceBaseUnits) : "no fill" }));
  const campaigns: NavCampaign[] = run.campaigns.map((c) => ({ slug: c.slug, name: c.businessName, meta: c.funded ? "" : "unfunded" }));
  return (
    <Chrome
      runNote={`Recorded replay of a run on ${NET.a}, test USDC`}
      otherRuns={process.env.AXP_OTHER_RUN_HREF ? [{ label: process.env.AXP_OTHER_RUN_LABEL ?? "Other run", href: process.env.AXP_OTHER_RUN_HREF, note: process.env.AXP_OTHER_RUN_NOTE }] : []}
      navFoot={(() => {
        const byTime = run.opportunities.slice().sort((a, b) => a.createdAt - b.createdAt);
        const same = byTime.every((o, i) => o.n === i + 1);
        return same ? "Opportunities are in the order they ran." : byTime[0].n !== 1 ? `Opportunities are in story order. On the exchange clock, the ${shortLabel(byTime[0]).toLowerCase()} question ran first.` : "Opportunities are in story order, which differs a little from the exchange clock.";
      })()}
      runId={run.source.runId}
      runLabel={process.env.AXP_RUN_LABEL ?? runPhrase}
      opps={opps}
      campaigns={campaigns}
      verifyMeta={devnet ? `${CHECK_TOTAL} + ${verifyDevnet(run, devnet).length}` : `${CHECK_TOTAL} checks`}
    >
      {children}
    </Chrome>
  );
}
