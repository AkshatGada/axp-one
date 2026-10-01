// The footer: the big wordmark, the full provenance legend and the scope lines.
import type { ReactNode } from "react";
import { ProvenanceLegend } from "./Blocks";

export function SiteFooter({ scope, base, children }: { scope: string[]; base: ReactNode; children?: ReactNode }) {
  return (
    <footer className="px-footer">
      <div className="px-wrap px-footer-in">
        <p className="px-footer-mark mh-wordmark" aria-label="AXP.one">
          AXP<span>.one</span>
        </p>
        {children}
        <div className="px-footer-grid">
          <ul className="px-footer-scope">
            {scope.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <ProvenanceLegend />
        </div>
        <div className="px-footer-base">{base}</div>
      </div>
    </footer>
  );
}
