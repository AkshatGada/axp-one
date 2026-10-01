// Prospectus numbers: a big stat rises out of its own mask. The value never counts up.
import type { CSSProperties, ReactNode } from "react";
import { Provenance } from "../foundation/marks";
import type { ProvenanceKind } from "../foundation/provenance";

export function BigStat({
  value,
  unit,
  label,
  sub,
  kind,
  size = "m",
  delay = 0,
  mono,
  accent,
}: {
  value: ReactNode;
  unit?: ReactNode;
  label: ReactNode;
  sub?: ReactNode;
  kind?: ProvenanceKind;
  size?: "m" | "s";
  delay?: number;
  /** Amounts and identifiers are real data: set them in mono. */
  mono?: boolean;
  /** Key numbers in ultramarine; ContextHint's own numbers in its vermillion. */
  accent?: "brand" | "ch";
}) {
  return (
    <div className="px-stat" data-size={size === "s" ? "s" : undefined} data-accent={accent} data-reveal="mask" style={{ "--d": `${delay}ms` } as CSSProperties}>
      <span className="px-mask">
        <span className={`px-mask-in px-stat-value${mono ? " px-num" : ""}`}>
          {value}
          {unit ? <span className="px-stat-unit">{unit}</span> : null}
        </span>
      </span>
      <span className="px-stat-label">{label}</span>
      {sub ? <span className="px-stat-sub">{sub}</span> : null}
      {kind ? <Provenance kind={kind} quiet /> : null}
    </div>
  );
}

export function StatGrid({ children, cols, className }: { children: ReactNode; cols?: 3; className?: string }) {
  return (
    <div className={`px-statgrid${className ? ` ${className}` : ""}`} data-cols={cols}>
      {children}
    </div>
  );
}
