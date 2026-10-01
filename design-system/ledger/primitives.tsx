import type { ReactNode } from "react";
import { Provenance } from "../foundation/marks";
import type { ProvenanceKind } from "../foundation/provenance";

export function Chip({ children, tone, mono, dashed, strike, title }: { children: ReactNode; tone?: "ink" | "quiet" | "white"; mono?: boolean; dashed?: boolean; strike?: boolean; title?: string }) {
  return (
    <span className="lg-chip" data-tone={tone} data-mono={mono || undefined} data-dashed={dashed || undefined} data-strike={strike || undefined} title={title}>
      {children}
    </span>
  );
}

/** A scope chip: provenance glyph + word, always visible in the scope bar. */
export function ScopeChip({ kind, label, title }: { kind?: ProvenanceKind; label: ReactNode; title?: string }) {
  return <Chip title={title}>{kind ? <Provenance kind={kind} label={label} /> : label}</Chip>;
}

export function Key({ children }: { children: ReactNode }) {
  return <kbd className="lg-key">{children}</kbd>;
}
export function KeyHint({ keys, children }: { keys: string[]; children: ReactNode }) {
  return (
    <span className="lg-keyhint">
      {keys.map((k) => (
        <Key key={k}>{k}</Key>
      ))}
      <span>{children}</span>
    </span>
  );
}

export function Sheet({ children, raised, sunk, className, id }: { children: ReactNode; raised?: boolean; sunk?: boolean; className?: string; id?: string }) {
  return (
    <div id={id} className={`lg-sheet${className ? ` ${className}` : ""}`} data-raised={raised || undefined} data-sunk={sunk || undefined}>
      {children}
    </div>
  );
}
export function SheetHeader({ title, meta, sub }: { title: ReactNode; meta?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="lg-sheet-head">
      <div className="lg-stack-sm" style={{ gap: 4 }}>
        <span className="lg-label">{title}</span>
        {sub ? <span className="lg-small">{sub}</span> : null}
      </div>
      {meta ? <div className="lg-sheet-head-meta">{meta}</div> : null}
    </div>
  );
}

export function Section({ id, title, aside, children, lede }: { id?: string; title: ReactNode; aside?: ReactNode; lede?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="lg-section">
      <div className="lg-section-head">
        <h2 className="lg-h1">{title}</h2>
        {aside}
      </div>
      {lede ? <p className="lg-body">{lede}</p> : null}
      {children}
    </section>
  );
}

export function PageHead({ kicker, title, lede, children }: { kicker?: ReactNode; title: ReactNode; lede?: ReactNode; children?: ReactNode }) {
  return (
    <header className="lg-pagehead">
      {kicker ? <div className="lg-pvline">{kicker}</div> : null}
      <h1 className="lg-title">{title}</h1>
      {lede ? <p className="lg-lede">{lede}</p> : null}
      {children}
    </header>
  );
}

export function KeyValue({ rows, dense }: { rows: Array<{ k: ReactNode; v: ReactNode; key?: string }>; dense?: boolean }) {
  return (
    <dl className="lg-kv" data-dense={dense || undefined}>
      {rows.map((r, i) => (
        <div key={r.key ?? i}>
          <dt>{r.k}</dt>
          <dd>{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}

export type Column<T> = { key: string; head: ReactNode; cell: (row: T, i: number) => ReactNode; num?: boolean; width?: string };
export function DataTable<T>({ columns, rows, boxed, rowProps, caption }: { columns: Column<T>[]; rows: T[]; boxed?: boolean; rowProps?: (row: T, i: number) => { strong?: boolean; dim?: boolean; id?: string }; caption?: ReactNode }) {
  return (
    <div className="lg-table-wrap">
      <table className="lg-table" data-boxed={boxed || undefined}>
        {caption ? <caption className="steel-visually-hidden">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} data-num={c.num || undefined} style={c.width ? { width: c.width } : undefined}>
                {c.head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const p = rowProps?.(r, i) ?? {};
            return (
              <tr key={i} id={p.id} data-strong={p.strong || undefined} data-dim={p.dim || undefined}>
                {columns.map((c) => (
                  <td key={c.key} data-num={c.num || undefined}>
                    {c.cell(r, i)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Callout({ title, children, tone }: { title?: ReactNode; children: ReactNode; tone?: "ink" | "plain" }) {
  return (
    <div className="lg-callout" data-tone={tone}>
      {title ? <span className="lg-h3">{title}</span> : null}
      {children}
    </div>
  );
}

export function StatusStamp({ children, tone, kind }: { children: ReactNode; tone?: "outline" | "dashed" | "ink" | "fail"; kind?: ProvenanceKind }) {
  return (
    <span className="lg-stamp" data-tone={tone}>
      {kind ? <Provenance kind={kind} label="" /> : null}
      <span>{children}</span>
    </span>
  );
}

/** A check result. pass/fail are computed now; "recorded" means a recorded hash that cannot be recomputed here. */
export function CheckMark({ state, children }: { state: "pass" | "fail" | "idle" | "skip" | "recorded"; children: ReactNode }) {
  const glyph = state === "pass" ? "✓" : state === "fail" ? "✕" : "";
  return (
    <span className="lg-check" data-state={state}>
      <i className="lg-check-box" aria-hidden>
        {glyph}
      </i>
      <span>{children}</span>
    </span>
  );
}

const group3 = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
/** Lamports (test SOL) never mix with USDC: always labelled, always integer. */
export function Lamports({ value, signed }: { value: string | number; signed?: boolean }) {
  const s = String(value);
  const neg = s.startsWith("-");
  const body = group3(s.replace(/^-/, ""));
  return (
    <span className="steel-data" title={`${s} lamports (test SOL)`}>
      {neg ? "-" : signed && s !== "0" ? "+" : ""}
      {body}
      <span style={{ marginLeft: "0.35em", fontFamily: "var(--font-body)", fontSize: "0.82em", color: "var(--muted)" }}>lamports</span>
    </span>
  );
}
export const groupDigits = group3;

export function NumberStrip({ items }: { items: Array<{ value: ReactNode; label: ReactNode; key?: string }> }) {
  return (
    <div className="lg-numbers">
      {items.map((it, i) => (
        <div className="lg-number" key={it.key ?? i}>
          <span className="lg-number-v">{it.value}</span>
          <span className="lg-number-l">{it.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Inline glossary term: hover or focus shows the definition. No JavaScript. */
export function Term({ children, title, def }: { children: ReactNode; title?: ReactNode; def: ReactNode }) {
  return (
    <span className="lg-term" tabIndex={0} role="button" aria-label={typeof children === "string" ? `${children}: definition` : undefined}>
      {children}
      <span className="lg-term-pop" role="tooltip">
        {title ? <strong>{title}</strong> : null}
        {def}
      </span>
    </span>
  );
}

export function Button({ children, variant, size, onClick, type = "button", disabled, ariaLabel }: { children: ReactNode; variant?: "outline" | "text"; size?: "lg"; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean; ariaLabel?: string }) {
  return (
    <button type={type} className="lg-btn" data-variant={variant} data-size={size} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
