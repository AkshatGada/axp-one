// Prospectus layout: sections, the question-led opener and asymmetric split grids.
import type { CSSProperties, ReactNode } from "react";
import { Words } from "./Type";

export type Tone = "paper" | "paper2" | "stage" | "brand";

export function Section({
  id,
  tone = "paper",
  children,
  className,
  labelledBy,
  flush,
  borderless,
  style,
  headerTone,
}: {
  id?: string;
  tone?: Tone;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  flush?: boolean;
  borderless?: boolean;
  style?: CSSProperties;
  /** Marks the section so the SiteHeader flips its colours while it sits under it. */
  headerTone?: "stage" | "brand";
}) {
  return (
    <section
      id={id}
      className={`px-section${tone === "stage" ? " on-stage" : ""}${className ? ` ${className}` : ""}`}
      data-tone={tone === "paper" ? undefined : tone}
      data-flush={flush ? "" : undefined}
      data-borderless={borderless ? "" : undefined}
      data-header-tone={headerTone ?? (tone === "stage" || tone === "brand" ? tone : undefined)}
      aria-labelledby={labelledBy}
      style={style}
    >
      {children}
    </section>
  );
}

/** A section opens on the question it answers. `label` is a plain word, never a number. */
export function Opener({
  id,
  label,
  question,
  lead,
  size = "h1",
  layout = "stack",
  aside,
}: {
  id: string;
  label: string;
  question: string;
  lead?: ReactNode;
  size?: "dxl" | "h1" | "h2";
  layout?: "stack" | "split";
  aside?: ReactNode;
}) {
  return (
    <header className="px-opener" data-layout={layout}>
      <div className="px-opener-label" data-reveal="fade">
        <p className="px-label">{label}</p>
        {aside}
      </div>
      <h2 id={id} className={`px-${size} px-opener-q`} data-reveal="">
        <Words text={question} />
      </h2>
      {lead ? (
        <div className="px-opener-lead" data-reveal="fade" style={{ "--d": "160ms" } as CSSProperties}>
          {typeof lead === "string" ? <p className="px-lead">{lead}</p> : lead}
        </div>
      ) : null}
    </header>
  );
}

export function SplitGrid({
  ratio = "86",
  align,
  children,
  className,
}: {
  ratio?: "86" | "74" | "114" | "50";
  align?: "start" | "center" | "end";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`px-split${className ? ` ${className}` : ""}`} data-ratio={ratio} data-align={align}>
      {children}
    </div>
  );
}

export function Wrap({ children, className, content }: { children: ReactNode; className?: string; content?: boolean }) {
  return <div className={`${content ? "px-wrap-content" : "px-wrap"}${className ? ` ${className}` : ""}`}>{children}</div>;
}
