"use client";
// The product shell (Ledger v2): top bar with run switcher and scope, sidebar sections, inspector drawer.
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { InspectorProvider, Ld } from "@axp/design-system/ledger";
import { LANDING_URL } from "@/lib/paths";

export type NavOpp = { n: number; label: string; meta: string };
export type NavCampaign = { slug: string; name: string; meta: string };

const L = Link as unknown as Ld.LinkC;

export function Chrome({ runId, runLabel, runNote, navFoot, otherRuns = [], opps, campaigns, verifyMeta, children }: { runId: string; runLabel: string; runNote: string; navFoot: string; otherRuns?: Array<{ label: string; href: string; note?: string }>; opps: NavOpp[]; campaigns: NavCampaign[]; verifyMeta: string; children: ReactNode }) {
  const path = usePathname() ?? "/";
  const is = (p: string) => path === p || path === p.replace(/\/$/, "");
  const starts = (p: string) => path.startsWith(p);
  return (
    <InspectorProvider verifyHref="/verify/" scopeClass="ld">
      <Ld.Shell
        top={
          <Ld.TopBar
            brand={<Ld.Wordmark href={LANDING_URL} Link={L} />}
            run={<Ld.RunSwitcher runId={runId} label={runLabel} note={runNote} others={otherRuns} />}
            chips={
              <>
                <Ld.Tag>Test USDC</Ld.Tag>
                <Ld.Pv kind="fictional" label="Fictional advertisers" />
              </>
            }
            actions={
              <>
                <Ld.Button variant="secondary" href="/present/" Link={L}>
                  Present
                </Ld.Button>
                <Ld.Button href="/verify/" Link={L}>
                  Verify
                </Ld.Button>
              </>
            }
          />
        }
        side={
          <Ld.SideNav
            Link={L}
            groups={[
              {
                items: [
                  { key: "overview", href: "/", label: "Overview", current: is("/") },
                  {
                    key: "opps",
                    href: "/opportunity/1/",
                    label: "Opportunities",
                    meta: String(opps.length),
                    children: opps.map((o) => ({ key: `o${o.n}`, href: `/opportunity/${o.n}/`, label: `${o.n}  ${o.label}`, current: starts(`/opportunity/${o.n}`) })),
                  },
                  {
                    key: "campaigns",
                    href: "/advertisers/",
                    label: "Campaigns",
                    meta: String(campaigns.length),
                    current: is("/advertisers/"),
                    children: [
                      ...campaigns.map((c) => ({ key: c.slug, href: `/advertisers/${c.slug}/`, label: c.name, meta: c.meta, current: starts(`/advertisers/${c.slug}`) })),
                      { key: "try", href: "/try/", label: "Draft a campaign", meta: "synthetic", current: starts("/try") },
                    ],
                  },
                  { key: "publisher", href: "/publisher/", label: "Publisher", current: starts("/publisher") },
                  { key: "settlement", href: "/settlement/", label: "Settlement", current: starts("/settlement") },
                  { key: "evidence", href: "/evidence/", label: "Evidence", current: starts("/evidence") },
                  { key: "verify", href: "/verify/", label: "Verify", meta: verifyMeta, current: starts("/verify") },
                  { key: "live", href: "/live/", label: "Run it live", meta: "Devnet", current: starts("/live") },
                ],
              },
            ]}
            foot={navFoot}
          />
        }
      >
        {children}
      </Ld.Shell>
    </InspectorProvider>
  );
}
