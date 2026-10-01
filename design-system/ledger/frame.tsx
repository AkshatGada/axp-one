import type { ComponentType, ReactNode } from "react";

/** The lowercase wordmark with the ultramarine dot. */
export function Wordmark() {
  return (
    <>
      axp<span className="lg-brand-dot">.</span>one
    </>
  );
}

/** A link component (next/link in the app, a plain anchor by default). */
export type LinkComponent = ComponentType<{ href: string; className?: string; children?: ReactNode; "aria-current"?: "page" | undefined; title?: string; prefetch?: boolean }>;
const A: LinkComponent = ({ href, className, children, title, ...rest }) => (
  <a href={href} className={className} title={title} aria-current={rest["aria-current"]}>
    {children}
  </a>
);

/** The app shell: scope bar on top, run spine on the left, the canvas in the middle. */
export function AppFrame({ scopeBar, spine, children }: { scopeBar: ReactNode; spine: ReactNode; children: ReactNode }) {
  return (
    <div className="lg-app">
      <a className="lg-skip" href="#main">
        Skip to content
      </a>
      {scopeBar}
      {spine}
      <main id="main" className="lg-main" tabIndex={-1}>
        <div className="lg-main-inner">{children}</div>
      </main>
    </div>
  );
}

/** Persistent scope: what this is (a recorded run), where money moved (sandbox), what is fictional. */
export function ScopeBar({ brand, brandHref, runId, chips, actions, Link = A }: { brand: ReactNode; brandHref: string; runId: string; chips: ReactNode; actions?: ReactNode; Link?: LinkComponent }) {
  return (
    <header className="lg-scope">
      <Link href={brandHref} className="lg-brand" title="AXP.one">
        <span className="lg-brand-mark">{brand}</span>
      </Link>
      <span className="lg-brand-sep" aria-hidden />
      <span className="lg-runid" title="Run ID">
        {runId}
      </span>
      <div className="lg-scope-chips" aria-label="Scope of this run">
        {chips}
      </div>
      {actions ? <div className="lg-scope-actions">{actions}</div> : null}
    </header>
  );
}

export type SpineItem =
  | { kind: "link"; href: string; label: ReactNode; current?: boolean }
  | {
      kind: "opportunity";
      href: string;
      n: number;
      question: string;
      outcome: ReactNode;
      glyph: "filled" | "capped" | "nofill";
      total: ReactNode;
      current?: boolean;
    };

export function OutcomeGlyph({ kind, label }: { kind: "filled" | "capped" | "nofill"; label?: string }) {
  return <i className="lg-og" data-kind={kind} aria-label={label} role={label ? "img" : undefined} />;
}

/** The left spine: setup, the four opportunities in story order with running totals, then money and proof. */
export function RunSpine({ groups, foot, Link = A }: { groups: Array<{ label: string; items: SpineItem[] }>; foot?: ReactNode; Link?: LinkComponent }) {
  return (
    <nav className="lg-spine" aria-label="Run">
      {groups.map((g) => (
        <div className="lg-spine-group" key={g.label}>
          <div className="lg-spine-head">{g.label}</div>
          {g.items.map((it) =>
            it.kind === "link" ? (
              <Link key={it.href} href={it.href} className="lg-spine-link" aria-current={it.current ? "page" : undefined}>
                {it.label}
              </Link>
            ) : (
              <Link key={it.href} href={it.href} className="lg-spine-link lg-spine-opp" aria-current={it.current ? "page" : undefined} title={it.question}>
                <span className="lg-spine-n">{it.n}</span>
                <span>
                  <span className="lg-spine-q">{it.question}</span>
                  <span className="lg-spine-out">
                    <OutcomeGlyph kind={it.glyph} />
                    {it.outcome}
                  </span>
                  <span className="lg-spine-total">
                    <span>Accepted so far</span>
                    <span className="lg-data-sm">{it.total}</span>
                  </span>
                </span>
              </Link>
            ),
          )}
        </div>
      ))}
      {foot ? <div className="lg-spine-foot">{foot}</div> : null}
    </nav>
  );
}
