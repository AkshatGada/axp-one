// Prospectus blocks: the role rail, the principle ledger, now and next, audience tiles,
// and the provenance legend (the truth contract set as a design element).
import type { CSSProperties, ReactNode } from "react";
import { Provenance } from "../foundation/marks";
import { PROVENANCE, type ProvenanceKind } from "../foundation/provenance";

export type Role = { name: string; body: string; kind?: "agent" | "code" | "party" };

/** Six parties on one dashed route. A filled node marks a party whose part is decided in code. */
export function RoleRail({ roles }: { roles: Role[] }) {
  return (
    <ol className="px-rail" style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {roles.map((r, i) => (
        <li key={r.name} className="px-rail-item" data-kind={r.kind} data-reveal="fade" style={{ "--d": `${i * 70}ms` } as CSSProperties}>
          <i className="px-rail-node" aria-hidden />
          <span className="px-rail-name">{r.name}</span>
          <p className="px-rail-body">{r.body}</p>
        </li>
      ))}
    </ol>
  );
}

export type Principle = { rule: string; run: string; kind?: ProvenanceKind };

export function PrincipleLedger({ rows, runLabel = "In the run" }: { rows: Principle[]; runLabel?: string }) {
  return (
    <div className="px-ledger" role="list">
      {rows.map((r) => (
        <div key={r.rule} className="px-ledger-row" role="listitem" data-reveal="fade">
          <p className="px-ledger-rule">{r.rule}</p>
          <div className="px-ledger-run">
            <Provenance kind={r.kind ?? "actual"} label={runLabel} />
            <p>{r.run}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function NowNext({
  now,
  next,
  nowTitle = "Working now",
  nextTitle = "Building next",
}: {
  now: string[];
  next: string[];
  nowTitle?: string;
  nextTitle?: string;
}) {
  return (
    <div className="px-nownext">
      <div className="px-nn-col" data-kind="now">
        <div className="px-nn-head">
          <span className="px-h3">{nowTitle}</span>
          <Provenance kind="actual" label="Demonstrated" />
        </div>
        <ul className="px-nn-list">
          {now.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
      <div className="px-nn-col" data-kind="next">
        <div className="px-nn-head">
          <span className="px-h3">{nextTitle}</span>
          <Provenance kind="vision" />
        </div>
        <ul className="px-nn-list">
          {next.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function AudienceTile({ title, body, planned, children }: { title: string; body: string; planned?: boolean; children?: ReactNode }) {
  return (
    <div className="px-tile" data-planned={planned ? "" : undefined} data-reveal="fade">
      <div className="px-tile-head">
        <h3 className="px-tile-title">{title}</h3>
        {planned ? <Provenance kind="vision" /> : null}
      </div>
      <p>{body}</p>
      {children}
    </div>
  );
}

const ORDER: ProvenanceKind[] = ["actual", "observed", "inferred", "fictional", "policy", "settled", "replay", "illustrative", "synthetic", "vision"];

export function ProvenanceLegend({ kinds = ORDER, compact, onStage }: { kinds?: ProvenanceKind[]; compact?: boolean; onStage?: boolean }) {
  return (
    <ul className="px-legend" data-compact={compact ? "" : undefined}>
      {kinds.map((k) => (
        <li key={k}>
          <Provenance kind={k} onStage={onStage} />
          {compact ? null : <p>{PROVENANCE[k].meaning}</p>}
        </li>
      ))}
    </ul>
  );
}
