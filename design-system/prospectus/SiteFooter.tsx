// The footer: the big wordmark, the full provenance legend and the scope lines.
import type { ReactNode } from "react";
import { ProvenanceLegend } from "./Blocks";
import { Wordmark } from "./Type";

export function SiteFooter({ scope, base, children }: { scope: string[]; base: ReactNode; children?: ReactNode }) {
  return (
    <footer className="px-footer">
      <div className="px-wrap px-footer-in">
        <Wordmark as="p" className="px-footer-mark" />
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
