"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppFrame, InspectorProvider, RunSpine, ScopeBar, ScopeChip, Provenance, Wordmark, type LinkComponent, type SpineItem } from "@axp/design-system/ledger";
import { LANDING_URL } from "@/lib/paths";

export type SpineOpp = { n: number; question: string; outcome: string; glyph: "filled" | "capped" | "nofill"; total: string };

const L = Link as unknown as LinkComponent;

export function Chrome({ runId, opps, children }: { runId: string; opps: SpineOpp[]; children: ReactNode }) {
  const path = usePathname() ?? "/";
  const is = (p: string) => path === p || path === p.replace(/\/$/, "");
  const starts = (p: string) => path.startsWith(p);
  const link = (href: string, label: string, current?: boolean): SpineItem => ({ kind: "link", href, label, current: current ?? is(href) });
  const groups: Array<{ label: string; items: SpineItem[] }> = [
    { label: "Run", items: [link("/", "Overview")] },
    { label: "Setup", items: [link("/advertisers/", "Advertisers", starts("/advertisers")), link("/publisher/", "Publisher"), link("/evidence/", "Evidence")] },
    {
      label: "Opportunities, by question",
      items: opps.map((o) => ({ kind: "opportunity", href: `/opportunity/${o.n}/`, n: o.n, question: o.question, outcome: o.outcome, glyph: o.glyph, total: o.total, current: starts(`/opportunity/${o.n}`) })),
    },
    { label: "Money and proof", items: [link("/settlement/", "Settlement"), link("/timeline/", "Timeline"), link("/verify/", "Verify")] },
  ];
  return (
    <InspectorProvider verifyHref="/verify/">
      <AppFrame
        scopeBar={
          <ScopeBar
            Link={L}
            brand={<Wordmark />}
            brandHref={LANDING_URL}
            runId={runId}
            chips={
              <>
                <ScopeChip kind="replay" label="Recorded replay" title="Read-only presentation of the saved run. Nothing executes again." />
                <ScopeChip kind="settled" label="Hosted Solana sandbox" title="Not devnet, not mainnet." />
                <ScopeChip label="Test USDC" title="Test tokens on the hosted sandbox, not real money." />
                <ScopeChip kind="fictional" label="Fictional advertisers" title="ClearVault, KeyForge and LeatherGuard were created for this demonstration." />
              </>
            }
            actions={
              <>
                <Link className="lg-btn" data-variant="outline" href="/present/">
                  Present
                </Link>
                <Link className="lg-btn" href="/verify/">
                  Verify
                </Link>
              </>
            }
          />
        }
        spine={
          <RunSpine
            Link={L}
            groups={groups}
            foot={
              <>
                Ordered by question. Recorded order: the mobile question ran first. <Link href="/timeline/">See the timeline</Link>.
                <div style={{ marginTop: 10 }}>
                  <Provenance kind="replay" quiet />
                </div>
              </>
            }
          />
        }
      >
        {children}
      </AppFrame>
    </InspectorProvider>
  );
}
