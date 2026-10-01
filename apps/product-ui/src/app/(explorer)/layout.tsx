import type { ReactNode } from "react";
import { Chrome, type NavCampaign, type NavOpp } from "@/components/chrome";
import { run, usdc } from "@/data/select";
import { shortLabel } from "@/components/v2/derive";
import { hasDevnet } from "@/components/v2/devnet";
import { CHECK_TOTAL } from "@/data/checks";
import { NET, onDevnet, runDate } from "@/data/story";
import { devnet } from "@/data/devnet";
import { verifyDevnet } from "@/lib/verify-devnet.ts";

export default function ExplorerLayout({ children }: { children: ReactNode }) {
  const opps: NavOpp[] = run.opportunities.map((o) => ({ n: o.n, label: shortLabel(o), meta: o.award ? usdc(o.award.priceBaseUnits) : "no fill" }));
  const campaigns: NavCampaign[] = run.campaigns.map((c) => ({ slug: c.slug, name: c.businessName, meta: c.funded ? "" : "unfunded" }));
  return (
    <Chrome
      scope={onDevnet ? "Live on Solana Devnet" : hasDevnet ? "Solana sandbox, re-settled on Devnet" : "Hosted Solana sandbox"}
      runNote={`Recorded replay of a run on ${NET.a}, test USDC`}
      otherRuns={process.env.AXP_OTHER_RUN_HREF ? [{ label: process.env.AXP_OTHER_RUN_LABEL ?? "Other run", href: process.env.AXP_OTHER_RUN_HREF, note: process.env.AXP_OTHER_RUN_NOTE }] : []}
      runId={run.source.runId}
      runLabel={process.env.AXP_RUN_LABEL ?? `${onDevnet ? "Live Devnet run" : "Recorded run"}, ${runDate}`}
      opps={opps}
      campaigns={campaigns}
      verifyMeta={devnet ? `${CHECK_TOTAL} + ${verifyDevnet(run, devnet).length}` : `${CHECK_TOTAL} checks`}
    >
      {children}
    </Chrome>
  );
}
