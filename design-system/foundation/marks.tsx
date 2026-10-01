import type { ReactNode } from "react";
import { MONEY_STATE, PROVENANCE, formatBaseUnits, shortHash, type MoneyState, type ProvenanceKind } from "./provenance";

/** A provenance mark: shape glyph + plain word. Pass `label` to replace the default word. */
export function Provenance({ kind, label, quiet, onStage, title }: { kind: ProvenanceKind; label?: ReactNode; quiet?: boolean; onStage?: boolean; title?: string }) {
  const p = PROVENANCE[kind];
  return (
    <span className={`pv${quiet ? " pv-quiet" : ""}${onStage ? " on-stage" : ""}`} data-kind={kind} title={title ?? p.meaning}>
      <i className="pv-glyph" aria-hidden />
      <span className="pv-word">{label ?? p.word}</span>
    </span>
  );
}

/** Money in test USDC from six-decimal base units. Shows base units on hover. */
export function Amount({ baseUnits, unit = "USDC", className }: { baseUnits: string | number; unit?: string; className?: string }) {
  return (
    <span className={`steel-data${className ? ` ${className}` : ""}`} title={`${baseUnits} base units (6 decimals)`}>
      {formatBaseUnits(baseUnits)}
      {unit ? <span style={{ marginLeft: "0.35em", fontFamily: "var(--font-body)", fontSize: "0.82em", color: "var(--muted)" }}>{unit}</span> : null}
    </span>
  );
}

/** A hash or identifier, shortened, full value in the title. */
export function Hash({ value, head, tail, className }: { value: string; head?: number; tail?: number; className?: string }) {
  return (
    <span className={`steel-data${className ? ` ${className}` : ""}`} title={value}>
      {shortHash(value, head, tail)}
    </span>
  );
}

export function MoneyStateMark({ state, label }: { state: MoneyState; label?: ReactNode }) {
  return (
    <span className="ms" data-state={state}>
      <i className="ms-swatch" aria-hidden />
      {label ?? MONEY_STATE[state]}
    </span>
  );
}
