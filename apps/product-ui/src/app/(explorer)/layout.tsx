import type { ReactNode } from "react";
import { Chrome, type SpineOpp } from "@/components/chrome";
import { outcomeLine, run, usdc } from "@/data/select";

export default function ExplorerLayout({ children }: { children: ReactNode }) {
  const opps: SpineOpp[] = run.opportunities.map((o) => ({
    n: o.n,
    question: o.question,
    outcome: outcomeLine(o),
    glyph: o.status === "no_fill" ? "nofill" : o.auction.notAdmitted.length ? "capped" : "filled",
    total: usdc(o.runningTotalBaseUnits),
  }));
  return (
    <Chrome runId={run.source.runId} opps={opps}>
      {children}
    </Chrome>
  );
}
