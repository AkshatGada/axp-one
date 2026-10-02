// LEDGER v2 components (dashboard grade). Use inside an element with class "ld" (or <Shell>), import as `Ld.*`.
// Server-safe unless noted; interactive pieces live in v2-client.tsx and are re-exported here.
import { forwardRef, type ComponentType, type ReactNode } from "react";
import { Provenance } from "../foundation/marks";
import type { ProvenanceKind, MoneyState } from "../foundation/provenance";
import { MONEY_STATE } from "../foundation/provenance";

export { Pipeline, Segmented, Tabs, Toggle, Checkbox, RevealOnView } from "./v2-client";
export type { PipeStage } from "./v2-client";

export type LinkC = ComponentType<{ href: string; className?: string; children?: ReactNode; "aria-current"?: "page" | undefined; title?: string }>;
const A: LinkC = ({ href, className, children, title, ...r }) => (
  <a href={href} className={className} title={title} aria-current={r["aria-current"]}>
    {children}
  </a>
);

// ---------- Shell ----------
export function Shell({ top, side, children }: { top: ReactNode; side: ReactNode; children: ReactNode }) {
  return (
    <div className="ld ld-shell">
      <a className="ld-skip" href="#main">
        Skip to content
      </a>
      {top}
      {side}
      <main className="ld-main" id="main" tabIndex={-1}>
        <div className="ld-main-inner">{children}</div>
      </main>
    </div>
  );
}

export function Wordmark({ href = "/", Link = A }: { href?: string; Link?: LinkC }) {
  return (
    <Link href={href} className="ld-wordmark" title="axp.one">
      axp<span className="lg-brand-dot">.</span>one
    </Link>
  );
}

export function TopBar({ brand, run, chips, actions, style }: { brand: ReactNode; run?: ReactNode; chips?: ReactNode; actions?: ReactNode; style?: React.CSSProperties }) {
  return (
    <header className="ld-top" style={style}>
      {brand}
      <span className="ld-top-sep" aria-hidden />
      {run}
      <div className="ld-top-chips">{chips}</div>
      {actions ? <div className="ld-top-actions">{actions}</div> : null}
    </header>
  );
}

/** Run switcher. Lists the other published runs when the build links them; it never claims a run is the only one. */
export function RunSwitcher({ runId, note, open, label, others = [] }: { runId: string; note: ReactNode; open?: boolean; label?: ReactNode; others?: Array<{ label: ReactNode; href: string; note?: ReactNode }> }) {
  return (
    <details className="ld-switch" open={open}>
      <summary>
        {label ? <span>{label}</span> : <><span className="ld-switch-k">Run</span><span className="ld-mono">{runId}</span></>}
        <span className="ld-switch-caret" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="ld-menu">
        <div className="ld-menu-item" aria-current="true">
          <span>{label ?? runId}</span>
          {label ? null : <span className="ld-mono ld-caption">{runId}</span>}
          <span className="ld-caption">{note}</span>
        </div>
        {others.map((o) => (
          <a key={o.href} className="ld-menu-item" href={o.href}>
            <span>{o.label}</span>
            {o.note ? <span className="ld-caption">{o.note}</span> : null}
          </a>
        ))}
        {others.length ? <div className="ld-menu-note">Separate runs; their numbers are never merged.</div> : null}
      </div>
    </details>
  );
}

export type NavItem = { href: string; label: ReactNode; meta?: ReactNode; current?: boolean; hover?: boolean; children?: NavItem[]; key?: string };
export function SideNav({ groups, foot, Link = A, style }: { groups: Array<{ label?: string; items: NavItem[] }>; foot?: ReactNode; Link?: LinkC; style?: React.CSSProperties }) {
  return (
    <nav className="ld-side" aria-label="Sections" style={style}>
      {groups.map((g, gi) => (
        <div className="ld-nav-group" key={g.label ?? gi}>
          {g.label ? <div className="ld-nav-head">{g.label}</div> : null}
          {g.items.map((it) => (
            <div key={it.key ?? it.href}>
              <Link href={it.href} className={`ld-nav-item${it.hover ? " is-hover" : ""}`} aria-current={it.current ? "page" : undefined}>
                <span>{it.label}</span>
                {it.meta ? <span className="ld-nav-meta">{it.meta}</span> : null}
              </Link>
              {it.children ? (
                <div className="ld-nav-children">
                  {it.children.map((c) => (
                    <Link key={c.key ?? c.href} href={c.href} className="ld-nav-item ld-nav-child" aria-current={c.current ? "page" : undefined}>
                      <span>{c.label}</span>
                      {c.meta ? <span className="ld-nav-meta">{c.meta}</span> : null}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ))}
      {foot ? <div className="ld-nav-foot">{foot}</div> : null}
    </nav>
  );
}

export function Breadcrumbs({ items, Link = A }: { items: Array<{ label: ReactNode; href?: string }>; Link?: LinkC }) {
  return (
    <nav className="ld-crumbs" aria-label="Breadcrumb">
      {items.map((it, i) => (
        <span key={i} className="ld-row" style={{ gap: 6 }}>
          {i > 0 ? <span className="ld-crumbs-sep">/</span> : null}
          {it.href ? <Link href={it.href}>{it.label}</Link> : <span>{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function PageBar({ crumbs, title, sub, actions, meta }: { crumbs?: ReactNode; title: ReactNode; sub?: ReactNode; actions?: ReactNode; meta?: ReactNode }) {
  return (
    <header className="ld-pagebar">
      <div className="ld-pagebar-l">
        {crumbs}
        <div className="ld-row" style={{ gap: 10 }}>
          <h1 className="ld-page-title">{title}</h1>
          {meta}
        </div>
        {sub ? <p className="ld-secondary">{sub}</p> : null}
      </div>
      {actions ? <div className="ld-row">{actions}</div> : null}
    </header>
  );
}

// ---------- Controls ----------
export function Button({ children, variant = "primary", size, disabled, state, href, Link = A, onClick, type = "button" }: { children: ReactNode; variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "lg"; disabled?: boolean; state?: "hover" | "focus" | "active"; href?: string; Link?: LinkC; onClick?: () => void; type?: "button" | "submit" }) {
  const cls = `ld-btn ld-btn--${variant}${size ? ` ld-btn--${size}` : ""}${state ? ` is-${state}` : ""}`;
  if (href)
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  return (
    <button type={type} className={cls} data-size={size} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children }: { label: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode }) {
  return (
    <label className="ld-field">
      <span className="ld-field-l">{label}</span>
      {children}
      {error ? <span className="ld-field-e">{error}</span> : hint ? <span className="ld-field-h">{hint}</span> : null}
    </label>
  );
}

export function Key({ children }: { children: ReactNode }) {
  return <kbd className="ld-key">{children}</kbd>;
}

// ---------- Surfaces ----------
export function Panel({ title, sub, actions, children, flush, foot, raised, id }: { title?: ReactNode; sub?: ReactNode; actions?: ReactNode; children: ReactNode; flush?: boolean; foot?: ReactNode; raised?: boolean; id?: string }) {
  return (
    <section className="ld-panel" data-raised={raised || undefined} id={id}>
      {title || actions ? (
        <div className="ld-panel-head">
          <div className="ld-panel-titles">
            {title ? <h3 className="ld-card-title">{title}</h3> : null}
            {sub ? <span className="ld-caption">{sub}</span> : null}
          </div>
          {actions ? <div className="ld-row">{actions}</div> : null}
        </div>
      ) : null}
      <div className="ld-panel-body" data-flush={flush || undefined}>
        {children}
      </div>
      {foot ? <div className="ld-panel-foot">{foot}</div> : null}
    </section>
  );
}

export function Kpi({ label, value, unit, context, delta, tone, href, Link = A, chip, spark }: { label: ReactNode; value: ReactNode; unit?: ReactNode; context?: ReactNode; delta?: ReactNode; tone?: "live"; href?: string; Link?: LinkC; chip?: ReactNode; spark?: ReactNode }) {
  const body = (
    <>
      <span className="ld-kpi-l">
        <span>{label}</span>
        {chip}
      </span>
      <span className="ld-row ld-kpi-vrow" style={{ alignItems: "baseline", gap: 8 }}>
        <span className="ld-kpi-num">{value}</span>
        {unit ? <span className="ld-kpi-unit">{unit}</span> : null}
        {delta ? <span className="ld-caption">{delta}</span> : null}
      </span>
      {spark}
      {context ? <span className="ld-kpi-s">{context}</span> : null}
    </>
  );
  const cls = `ld-kpi${tone === "live" ? " ld-kpi--live" : ""}`;
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Tag({ children, tone, dot }: { children: ReactNode; tone?: "brand" | "solid" | "success" | "warning" | "danger" | "outline" | "dashed" | "ch"; dot?: boolean }) {
  return (
    <span className="ld-tag" data-tone={tone}>
      {dot ? <i className="ld-dot" aria-hidden /> : null}
      {children}
    </span>
  );
}

/** Provenance, restyled as a product pill: glyph + word. */
export function Pv({ kind, label }: { kind: ProvenanceKind; label?: ReactNode }) {
  return (
    <span className="ld-pv" data-kind={kind}>
      <Provenance kind={kind} label={label} />
    </span>
  );
}

export function Money({ state, label }: { state: MoneyState; label?: ReactNode }) {
  return (
    <span className="ld-ms" data-state={state}>
      <i aria-hidden />
      {label ?? MONEY_STATE[state]}
    </span>
  );
}

export function Progress({ value, max, label, tone }: { value: number; max: number; label?: ReactNode; tone?: "ink" }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <span className="ld-progress" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <span className="ld-progress-track">
        <i data-tone={tone} style={{ width: `${pct * 100}%` }} />
      </span>
      {label ? <span className="ld-progress-l">{label}</span> : null}
    </span>
  );
}

export function Tooltip({ children, tip, open }: { children: ReactNode; tip: ReactNode; open?: boolean }) {
  return (
    <span className={`ld-tip${open ? " is-open" : ""}`} tabIndex={0}>
      {children}
      <span className="ld-tip-pop" role="tooltip">
        {tip}
      </span>
    </span>
  );
}

export function Verified({ state, children }: { state: "pass" | "fail" | "idle" | "recorded"; children: ReactNode }) {
  return (
    <span className="ld-verified" data-state={state === "pass" ? undefined : state}>
      <i aria-hidden>{state === "pass" ? "✓" : state === "fail" ? "✕" : ""}</i>
      <span>{children}</span>
    </span>
  );
}

export type Col<T> = { key: string; head: ReactNode; cell: (r: T, i: number) => ReactNode; num?: boolean; sort?: "asc" | "desc" | true; width?: string };
export function Table<T>({ columns, rows, rowProps, caption }: { columns: Col<T>[]; rows: T[]; rowProps?: (r: T, i: number) => { selected?: boolean; hover?: boolean; id?: string }; caption?: string }) {
  return (
    <div className="ld-table-wrap">
      <table className="ld-table">
        {caption ? <caption className="steel-visually-hidden">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} data-num={c.num || undefined} data-sort={c.sort === true ? "" : c.sort} style={c.width ? { width: c.width } : undefined} aria-sort={c.sort === "desc" ? "descending" : c.sort === "asc" ? "ascending" : undefined}>
                {c.head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const p = rowProps?.(r, i) ?? {};
            return (
              <tr key={i} id={p.id} aria-selected={p.selected || undefined} className={p.hover ? "is-hover" : undefined}>
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

export function Empty({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="ld-empty">
      <span className="ld-card-title">{title}</span>
      {children ? <span className="ld-secondary" style={{ maxWidth: "48ch" }}>{children}</span> : null}
      {action}
    </div>
  );
}

export function Toast({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return (
    <div className="ld-toast" role="status">
      <i className="ld-dot" aria-hidden />
      <span className="ld-stack" style={{ gap: 2 }}>
        <span>{title}</span>
        {sub ? <span className="ld-toast-sub">{sub}</span> : null}
      </span>
    </div>
  );
}

export function Drawer({ title, path, children }: { title: ReactNode; path: ReactNode; children: ReactNode }) {
  return (
    <aside className="ld-drawer" aria-label="Inspector">
      <div className="ld-drawer-head">
        <div className="ld-between">
          <span className="ld-card-title">{title}</span>
          <span className="ld-row" style={{ gap: 6 }}>
            <Key>Esc</Key>
          </span>
        </div>
        <span className="ld-mono ld-faint">{path}</span>
      </div>
      <div className="ld-drawer-body">{children}</div>
    </aside>
  );
}

export function Modal({ title, children, actions }: { title: ReactNode; children: ReactNode; actions: ReactNode }) {
  return (
    <div className="ld-modal-backdrop">
      <div className="ld-modal" role="dialog" aria-label={typeof title === "string" ? title : "Dialog"}>
        <div className="ld-modal-body">
          <span className="ld-section-title">{title}</span>
          {children}
        </div>
        <div className="ld-modal-foot">{actions}</div>
      </div>
    </div>
  );
}

// ---------- Charts ----------
export type BarRow = { key: string; label: ReactNode; sub?: ReactNode; value: number | null; winner?: boolean; note?: ReactNode };
/** Horizontal bar chart on one axis from zero. Winner in ultramarine, others neutral. Floor drawn as a rule. */
export function BidBars({ rows, max, floor, format, floorLabel, reveal }: { rows: BarRow[]; max: number; floor?: number; format: (v: number) => string; floorLabel?: string; reveal?: boolean }) {
  const pct = (v: number) => `${(v / max) * 100}%`;
  return (
    <div className="ld-bars" data-reveal={reveal || undefined}>
      {rows.map((r) => (
        <div className="ld-bar-row" key={r.key} data-winner={r.winner || undefined}>
          <span className="ld-bar-name">
            {r.label}
            {r.sub ? <small>{r.sub}</small> : null}
          </span>
          <span className="ld-bar-track">
            {r.value !== null ? <i className="ld-bar" data-winner={r.winner || undefined} style={{ width: pct(r.value) }} title={`${format(r.value)} USDC`} /> : <span className="ld-bar-none" style={floor !== undefined ? { left: `calc(${pct(floor)} + 10px)` } : undefined}>{r.note}</span>}
            {floor !== undefined ? <span className="ld-bar-floor" style={{ left: pct(floor) }} title={`Floor ${format(floor)}`} /> : null}
          </span>
          <span className="ld-bar-v">{r.value !== null ? format(r.value) : ""}</span>
        </div>
      ))}
      <div className="ld-bar-row">
        <span />
        <span className="ld-bar-scale">
          <span style={{ left: 0 }}>0</span>
          {floor !== undefined ? <span data-floor style={{ left: pct(floor) }}>{floorLabel ?? `floor ${format(floor)}`}</span> : null}
          <span style={{ left: "100%" }}>{format(max)}</span>
        </span>
        <span />
      </div>
    </div>
  );
}

/** Cumulative authorization: each voucher states the total, so the line steps up and never adds a second line.
 *  Scaled to the channel deposit; the campaign cap is drawn as a line. */
export function StepChart({ points, max, cap, format, width = 480, height = 160, maxLabel = "deposit", capLabel = "cap" }: { points: Array<{ key: string; label: string; value: number }>; max: number; cap?: number; format: (v: number) => string; width?: number; height?: number; maxLabel?: string; capLabel?: string }) {
  const padL = 4, padR = 96, padT = 22, padB = 24;
  const n = points.length;
  const x = (i: number) => padL + ((width - padL - padR) * (i + 0.5)) / Math.max(n, 2);
  const y = (v: number) => padT + (height - padT - padB) * (1 - v / max);
  let d = `M ${padL} ${y(0)}`;
  points.forEach((p, i) => (d += ` H ${x(i)} V ${y(p.value)}`));
  d += ` H ${width - padR}`;
  const area = `${d} V ${y(0)} Z`;
  return (
    <svg className="ld-chart-reveal ld-fixed-svg" viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={points.map((p) => `${p.label}: ${format(p.value)} in total`).join("; ")}>
      <line x1={padL} x2={width - padR} y1={y(max)} y2={y(max)} className="ld-chart-grid" />
      <text x={width - padR + 6} y={y(max) + 4} className="ld-chart-t">
        {format(max)} {maxLabel}
      </text>
      {cap !== undefined ? (
        <>
          <line x1={padL} x2={width - padR} y1={y(cap)} y2={y(cap)} className="ld-chart-cap" />
          <text x={width - padR + 6} y={y(cap) + 4} className="ld-chart-t">
            {format(cap)} {capLabel}
          </text>
        </>
      ) : null}
      <line x1={padL} x2={width - padR} y1={y(0)} y2={y(0)} className="ld-chart-axis" />
      <path d={area} className="ld-chart-area" />
      <path d={d} className="ld-chart-line" />
      {points.map((p, i) => (
        <g key={p.key}>
          <circle cx={x(i)} cy={y(p.value)} r={5} className="ld-chart-dot">
            <title>{`${p.label}: ${format(p.value)} in total`}</title>
          </circle>
          <text x={x(i)} y={height - 6} textAnchor="middle" className="ld-chart-t">
            {p.label}
          </text>
          {(() => {
            // Keep the value clear of the dashed cap line: above the step by default, below it when the line is close.
            const above = y(p.value) - 8;
            const near = cap !== undefined && Math.abs(above - 4 - y(cap)) < 12;
            const yy = near ? Math.min(y(p.value) + 18, y(0) - 4) : above;
            return (
              <text x={x(i) + 8} y={yy} className="ld-chart-v ld-chart-knock">
                {format(p.value)}
              </text>
            );
          })()}
        </g>
      ))}
    </svg>
  );
}

export function Sparkline({ values, width = 120, height = 28, label }: { values: number[]; width?: number; height?: number; label: string }) {
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * (width - 4) + 2},${height - 2 - (v / max) * (height - 6)}`);
  const last = pts[pts.length - 1].split(",").map(Number);
  return (
    <svg className="ld-spark" viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={label}>
      <polyline points={pts.join(" ")} className="ld-chart-line" style={{ strokeWidth: 1.5 }} />
      <circle cx={last[0]} cy={last[1]} r={3} className="ld-chart-dot" />
    </svg>
  );
}

export function BalanceBar({ total, segments, legend }: { total: number; segments: Array<{ key: string; value: number; state: "settled" | "refunded" | "authorized" | "accepted"; label: string }>; legend?: boolean }) {
  return (
    <div className="ld-stack" style={{ gap: 8 }}>
      <div className="ld-bal" role="img" aria-label={segments.map((s) => s.label).join(", ")}>
        {segments.map((s) => (
          <span key={s.key} className="ld-bal-seg" data-state={s.state} style={{ flexGrow: s.value / total, flexBasis: 0 }} title={s.label} />
        ))}
      </div>
      {legend ? (
        <div className="ld-bal-legend">
          {segments.map((s) => (
            <span key={s.key} className="ld-row" style={{ gap: 6 }}>
              <span className="ld-bal-seg" data-state={s.state} style={{ width: 10, height: 10, display: "inline-block" }} />
              {s.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export type Lane = { key: string; label: string; marks: Array<{ t: number; title: string; tone?: "brand" | "ink" }> };
/** Activity on the exchange clock as swimlanes, with an explicit axis break between busy windows. Exchange clock only.
 *  HTML labels over a percentage-positioned plot, so text stays the same size at every width. Marks closer than
 *  about 1% are merged into one dot with a count. Under 900 px a compact list replaces the chart. */
export function ActivityChart({ lanes, segments, fmt, gapLabel }: { lanes: Lane[]; segments: Array<{ from: number; to: number }>; fmt: (t: number) => string; gapLabel?: string }) {
  const gapPct = 6;
  const segPct = (100 - gapPct * (segments.length - 1)) / segments.length;
  const xOf = (t: number) => {
    for (let i = 0; i < segments.length; i++) {
      const sg = segments[i];
      if (t >= sg.from && t <= sg.to) return i * (segPct + gapPct) + ((t - sg.from) / (sg.to - sg.from)) * segPct;
    }
    return null;
  };
  const clusters = (l: Lane) => {
    const pts = l.marks.map((m) => ({ ...m, x: xOf(m.t) })).filter((m): m is typeof m & { x: number } => m.x !== null).sort((p, q) => p.x - q.x);
    const out: Array<{ x: number; n: number; titles: string[]; tone?: "brand" | "ink" }> = [];
    for (const m of pts) {
      const last = out[out.length - 1];
      if (last && m.x - last.x < 1.1) {
        last.n++;
        last.titles.push(`${m.title}, ${fmt(m.t)}`);
      } else out.push({ x: m.x, n: 1, titles: [`${m.title}, ${fmt(m.t)}`], tone: m.tone });
    }
    return out;
  };
  return (
    <div className="ld-act">
      <div className="ld-act-chart" role="img" aria-label="Exchange events by type on the exchange clock">
        {lanes.map((l) => (
          <div className="ld-act-lane" key={l.key}>
            <span className="ld-act-label">{l.label}</span>
            <div className="ld-act-plot">
              {segments.map((_, si) => (
                <i key={si} className="ld-act-grid" style={{ left: `${si * (segPct + gapPct)}%`, width: `${segPct}%` }} />
              ))}
              {clusters(l).map((c, j) => (
                <span key={j} className="ld-act-mark" data-tone={c.tone} style={{ left: `${c.x}%` }} title={c.titles.join("\n")}>
                  {c.n > 1 ? <b>{c.n}</b> : null}
                </span>
              ))}
            </div>
          </div>
        ))}
        <div className="ld-act-lane ld-act-axisrow">
          <span className="ld-act-label" />
          <div className="ld-act-plot">
            {segments.map((sg, si) => (
              <span key={si} className="ld-act-axis" style={{ left: `${si * (segPct + gapPct)}%`, width: `${segPct}%` }}>
                <span>{fmt(sg.from)}</span>
                <span>{fmt(sg.to)}</span>
              </span>
            ))}
            {gapLabel
              ? segments.slice(0, -1).map((_, si) => (
                  <span key={si} className="ld-act-gap" style={{ left: `${(si + 1) * segPct + si * gapPct}%`, width: `${gapPct}%` }}>
                    {gapLabel}
                  </span>
                ))
              : null}
          </div>
        </div>
      </div>
      <ul className="ld-act-list">
        {lanes.map((l) => {
          const ts = l.marks.map((m) => m.t).sort((p, q) => p - q);
          return (
            <li key={l.key}>
              <span className="ld-strong">{l.label}</span>
              <span className="ld-caption">{ts.length ? `${ts.length}, ${fmt(ts[0])}${ts.length > 1 ? ` to ${fmt(ts[ts.length - 1])}` : ""}` : "none"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Score on its scale, rounding line in ultramarine; baseline hollow, history filled. */
export function ScoreRuler({ min, max, keyLine = 2.5, marks, ticks, width = 440 }: { min: number; max: number; keyLine?: number; marks: Array<{ value: number; kind: "baseline" | "history"; label: string }>; ticks: number[]; width?: number }) {
  const H = 46, pad = 8;
  const x = (v: number) => pad + ((v - min) / (max - min)) * (width - pad * 2);
  return (
    <div className="ld-ruler">
      <svg className="ld-ruler-svg ld-fixed-svg" viewBox={`0 0 ${width} ${H}`} width={width} height={H} role="img" aria-label={marks.map((m) => `${m.label} ${m.value.toFixed(2)}`).join(", ")}>
        <line x1={x(min)} x2={x(max)} y1={24} y2={24} className="ld-ruler-line" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={20} y2={28} className="ld-chart-axis" />
            <text x={x(t)} y={42} textAnchor="middle" className="ld-chart-t">
              {t}
            </text>
          </g>
        ))}
        <line x1={x(keyLine)} x2={x(keyLine)} y1={6} y2={34} className="ld-ruler-key" />
        <text x={x(keyLine) + 5} y={11} className="ld-chart-t" style={{ fill: "var(--brand-deep)" }}>
          level {Math.ceil(keyLine)} from here
        </text>
        {marks.map((m) =>
          m.kind === "baseline" ? (
            <circle key={m.kind} cx={x(m.value)} cy={24} r={5.5} className="ld-ruler-base">
              <title>{`${m.label} ${m.value.toFixed(2)}`}</title>
            </circle>
          ) : (
            <circle key={m.kind} cx={x(m.value)} cy={24} r={6} className="ld-ruler-hist">
              <title>{`${m.label} ${m.value.toFixed(2)}`}</title>
            </circle>
          ),
        )}
      </svg>
      <div className="ld-ruler-legend">
        {marks.map((m) => (
          <span key={m.kind}>
            <i style={m.kind === "baseline" ? { boxShadow: "inset 0 0 0 1.5px var(--ld-text)" } : { background: "var(--ld-chart-1)" }} />
            {m.label} <b className="ld-num" style={{ color: "var(--ld-text)", fontWeight: 500 }}>{m.value.toFixed(2)}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

export function SimBar({ value, method }: { value: number; method: string }) {
  return (
    <span className="ld-sim" title={`${method === "vector" ? "Cosine similarity" : "Word-overlap score"} ${value.toFixed(3)}`}>
      <span>{method === "vector" ? "Match" : "Overlap"}</span>
      <span className="ld-sim-track">
        <i style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
      </span>
      <b>{value.toFixed(3)}</b>
    </span>
  );
}

// ---------- Domain ----------
export function ChatSpecimen({ app, question, answer, meta, slot }: { app: ReactNode; question: ReactNode; answer: ReactNode; meta?: ReactNode; slot: ReactNode }) {
  return (
    <figure className="ld-chat" style={{ margin: 0 }}>
      <div className="ld-chat-bar">
        <span>{app}</span>
        <Pv kind="replay" label="Recorded" />
      </div>
      <div className="ld-chat-body">
        <div className="ld-chat-q">{question}</div>
        {meta ? <div className="ld-chat-meta">{meta}</div> : null}
        <p className="ld-chat-a">{answer}</p>
        <div data-route-target="slot">{slot}</div>
      </div>
    </figure>
  );
}

/** The disclosed card. `data-sponsored-label` and `data-creative-copy` let a publisher check, from its own DOM, that the
 *  label is shown and the approved text is exact (the live run's delivery acknowledgement reads them). */
export const SponsoredCard = forwardRef<HTMLDivElement, { text: string; advertiser: string; url: string; enter?: boolean }>(function SponsoredCard({ text, advertiser, url, enter }, ref) {
  return (
    <div ref={ref} className={`ld-ad${enter ? " ld-ad-enter" : ""}`} data-sponsored-card="">
      <div className="ld-ad-top">
        <span data-sponsored-label="">Sponsored</span>
        <span className="ld-caption">Fictional advertiser</span>
      </div>
      <p className="ld-ad-text" data-creative-copy="">{text}</p>
      <div className="ld-ad-foot">
        <span className="ld-strong" style={{ color: "var(--ld-text)" }}>
          {advertiser}
        </span>
        {url ? <span>{url.replace(/^https:\/\//, "").replace(/\/$/, "")}</span> : null}
      </div>
    </div>
  );
});

export function EvidenceCard({ prompt, advertiser, creative, sim, method, hint }: { prompt: string; advertiser: string; creative: string; sim: number; method: string; hint?: ReactNode }) {
  const body = creative.startsWith(advertiser) ? creative.slice(advertiser.length).trim() : creative;
  return (
    <article className="ld-evidence">
      <div className="ld-between">
        <Pv kind="observed" label="Observed by ContextHint" />
        <SimBar value={sim} method={method} />
      </div>
      <p className="ld-evidence-q">“{prompt}”</p>
      <p className="ld-evidence-ad">
        <b>{advertiser}</b> {body}
      </p>
      <span className="ld-caption">Observed historical reference, not an axp.one advertiser</span>
      {hint}
    </article>
  );
}

export function ReceiptCard({ title, keyId, rows, checks, caption }: { title: ReactNode; keyId: ReactNode; rows: Array<{ k: string; v: ReactNode; mono?: boolean }>; checks: ReactNode; caption?: ReactNode }) {
  return (
    <div className="ld-receipt">
      <div className="ld-receipt-head">
        <span className="ld-card-title">{title}</span>
        <span className="ld-caption">{keyId}</span>
      </div>
      <div className="ld-receipt-rows">
        {rows.map((r) => (
          <div className="ld-receipt-row" key={r.k}>
            <span className="ld-muted">{r.k}</span>
            <span className={r.mono ? "ld-mono" : undefined}>{r.v}</span>
          </div>
        ))}
      </div>
      <div className="ld-receipt-checks">
        {checks}
        {caption ? <span className="ld-caption">{caption}</span> : null}
      </div>
    </div>
  );
}

export function CampaignHeader({ initial, name, status, kpis, actions, muted }: { initial: string; name: ReactNode; status: ReactNode; kpis: ReactNode; actions?: ReactNode; muted?: boolean }) {
  return (
    <div className="ld-campaign-head">
      <span className="ld-avatar" data-tone={muted ? "muted" : undefined} aria-hidden>
        {initial}
      </span>
      <div className="ld-stack" style={{ gap: 6 }}>
        <div className="ld-row" style={{ gap: 10 }}>
          <span className="ld-section-title">{name}</span>
          {status}
        </div>
        <div className="ld-row" style={{ gap: 18 }}>
          {kpis}
        </div>
      </div>
      {actions ? <div className="ld-row">{actions}</div> : null}
    </div>
  );
}

export function Timeline({ rows }: { rows: Array<{ key: string; time: ReactNode; what: ReactNode; detail?: ReactNode; tone?: "brand" | "ink" }> }) {
  return (
    <div className="ld-timeline">
      {rows.map((r) => (
        <div className="ld-tl" key={r.key} data-tone={r.tone}>
          <i aria-hidden />
          <span className="ld-caption ld-num">{r.time}</span>
          <span>{r.what}</span>
          <span className="ld-caption">{r.detail}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- Additions for the dashboard routes ----------
export function Callout({ title, children, tone, actions }: { title?: ReactNode; children: ReactNode; tone?: "brand" | "warning" | "ch" | "neutral" | "danger"; actions?: ReactNode }) {
  return (
    <div className="ld-callout" data-tone={tone} role={tone === "danger" ? "alert" : undefined}>
      {actions ? <span className="ld-callout-actions">{actions}</span> : null}
      {title ? <span className="ld-card-title">{title}</span> : null}
      <div className="ld-secondary" style={{ color: "var(--ld-text)" }}>
        {children}
      </div>
    </div>
  );
}

export function Stat({ label, value, caption, big }: { label: ReactNode; value: ReactNode; caption?: ReactNode; big?: boolean }) {
  return (
    <div className="ld-stat">
      <span className="ld-label">{label}</span>
      <span className={big ? "ld-kpi-num" : "ld-stat-v"}>{value}</span>
      {caption ? <span className="ld-caption">{caption}</span> : null}
    </div>
  );
}

/** Capability × campaign grid of ticks and crosses, with the ruling at the end of each row. */
export function CapGrid({ caps, rows }: { caps: string[]; rows: Array<{ key: string; name: ReactNode; has: string[]; ok: boolean; result: ReactNode }> }) {
  return (
    <div className="ld-table-wrap">
      <table className="ld-table ld-capgrid">
        <thead>
          <tr>
            <th>Campaign</th>
            {caps.map((c) => (
              <th key={c}>{c.replace(/_/g, " ")}</th>
            ))}
            <th>Ruling</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td>
                <span className="ld-strong">{r.name}</span>
              </td>
              {caps.map((c) => {
                const has = r.has.includes(c);
                return (
                  <td key={c}>
                    <span className="ld-row" style={{ gap: 6 }}>
                      <i className={has ? "ld-tick" : "ld-cross"} role="img" aria-label={has ? "declared" : "not declared"}>
                        {has ? "✓" : "✕"}
                      </i>
                      <span className="ld-caption">{has ? "Declared" : "Not declared"}</span>
                    </span>
                  </td>
                );
              })}
              <td>{r.ok ? <Tag tone="success" dot>May compete</Tag> : <span className="ld-row" style={{ gap: 6 }}><Tag tone="dashed">Excluded</Tag><span className="ld-caption">{r.result}</span></span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FlowTile({ step, title, state, value, children }: { step: ReactNode; title: ReactNode; state?: ReactNode; value?: ReactNode; children?: ReactNode }) {
  return (
    <div className="ld-flowtile">
      <span className="ld-flowtile-step">{step}</span>
      <span className="ld-card-title">{title}</span>
      {state}
      {value ? <span className="ld-kpi-num">{value}</span> : null}
      {children}
    </div>
  );
}
