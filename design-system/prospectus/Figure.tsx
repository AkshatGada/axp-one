// Prospectus figures: a framed figure with a title bar and provenance, an exhibit set like a
// document on a table, and the source note that sits under every number.
import type { ReactNode } from "react";
import { Provenance } from "../foundation/marks";
import type { ProvenanceKind } from "../foundation/provenance";

export function Marks({ kinds, onStage, quiet }: { kinds: ProvenanceKind[]; onStage?: boolean; quiet?: boolean }) {
  return (
    <span className="px-marks">
      {kinds.map((k) => (
        <Provenance key={k} kind={k} onStage={onStage} quiet={quiet} />
      ))}
    </span>
  );
}

export function Figure({
  title,
  kinds = [],
  caption,
  controls,
  children,
  flush,
  className,
  onStage,
  id,
}: {
  title?: ReactNode;
  kinds?: ProvenanceKind[];
  caption?: ReactNode;
  /** Pause / Replay text controls for animated figures (client island from the app). */
  controls?: ReactNode;
  children: ReactNode;
  flush?: boolean;
  className?: string;
  onStage?: boolean;
  id?: string;
}) {
  return (
    <figure id={id} className={`px-figure${className ? ` ${className}` : ""}`}>
      <div className="px-figure-frame">
        {title || kinds.length ? (
          <div className="px-figure-bar">
            <span className="px-figure-title">{title}</span>
            <Marks kinds={kinds} onStage={onStage} />
          </div>
        ) : null}
        <div className="px-figure-body" data-flush={flush ? "" : undefined}>
          {children}
        </div>
      </div>
      {caption || controls ? (
        <figcaption className="px-figcaption">
          <span className="px-figcaption-text">{caption}</span>
          {controls ? <span className="px-figure-controls">{controls}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function Exhibit({
  label,
  kinds = [],
  tilt,
  note,
  children,
  className,
}: {
  label: ReactNode;
  kinds?: ProvenanceKind[];
  tilt?: "left" | "right";
  note?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure className={`px-exhibit${className ? ` ${className}` : ""}`} data-tilt={tilt}>
      <div className="px-exhibit-head">
        <span className="px-exhibit-label">{label}</span>
        <Marks kinds={kinds} />
      </div>
      <div className="px-exhibit-sheet">{children}</div>
      {note ? <figcaption className="px-small">{note}</figcaption> : null}
    </figure>
  );
}

export function SourceNote({ label = "Source", children, className }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <p className={`px-source${className ? ` ${className}` : ""}`}>
      <b>{label}</b>
      <span>{children}</span>
    </p>
  );
}
