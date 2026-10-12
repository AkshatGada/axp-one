// The V4 kit (FROZEN; owner: the orchestrator). Builders import from here and never edit it.
// If you need something the kit lacks, build it in your own folder and note it in NOTES.md.
import type { CSSProperties, ElementType, ReactNode } from "react";
import s from "./kit.module.css";
export { default as useReduced } from "@/motion/useReduced";
export { Stage, useStageMode, useInView } from "./stage";

/** A movement of the feature. Renders a plain <section>: no folio, no running title, no rule;
 *  one movement runs into the next. Give your own heading an id and pass it as `labelledBy`. */
export function Chapter({ id, no, title, note, bare, labelledBy, className, children }: { id: string; no?: string; title?: string; note?: string; bare?: boolean; labelledBy?: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={`${s.chapter}${className ? ` ${className}` : ""}`} aria-labelledby={labelledBy} data-chapter={no}>
      {children}
    </section>
  );
}

/** The folio line that opens a movement: "01  THE SHIFT". Use it yourself if you render `bare`. */
export function ChapterMark({ no, title, note, className }: { no: string; title?: string; note?: string; className?: string }) {
  return (
    <p className={`${s.mark}${className ? ` ${className}` : ""}`} data-rise="">
      <span className={s.markNo}>{no}</span>
      {title ? <span className={s.markTitle}>{title}</span> : null}
      {note ? <span className={s.markNote}>{note}</span> : null}
    </p>
  );
}

/** A figure with its caption. Every illustrated figure says so once: pass `illustration`. */
export function Fig({ no, caption, illustration = true, className, children }: { no?: string; caption?: string; illustration?: boolean; className?: string; children: ReactNode }) {
  return (
    <figure className={`${s.fig}${className ? ` ${className}` : ""}`}>
      {children}
      <figcaption className={s.figCap}>
        {no ? <span className={s.figNo}>Fig. {no}</span> : null}
        <span>{[caption, illustration ? "Illustration" : null].filter(Boolean).join(". ")}{caption || illustration ? "." : ""}</span>
      </figcaption>
    </figure>
  );
}

/** The one Sponsored card. The text is always the advertiser's approved words, unaltered, and the
 *  card always sits below the answer. */
export function Ad({ name, text, domain, size = "m", className, style }: { name: string; /** The approved words. A node is allowed so a figure can mark a changed word. */ text: ReactNode; domain?: string; size?: "s" | "m" | "l"; className?: string; style?: CSSProperties }) {
  return (
    <div className={`${s.ad}${className ? ` ${className}` : ""}`} data-size={size} style={style}>
      <div className={s.adHead}>
        <span className={s.adTag}>Sponsored</span>
        <span className={s.adName}>{name}</span>
      </div>
      <p className={s.adText}>{text}</p>
      {domain ? <span className={s.adFoot}>{domain}</span> : null}
    </div>
  );
}

/** Kinetic type. Splits text into words (and characters with `chars`) as inline blocks, each with
 *  its index in --i (and the count in --n on the parent), so CSS or motion can move them.
 *  "\n" starts a new line (.x-line). The text stays ordinary, readable text for assistive tech. */
export function Split({ text, as: Tag = "span", chars, className, style, id }: { text: string; as?: ElementType; chars?: boolean; className?: string; style?: CSSProperties; id?: string }) {
  let i = 0;
  const lines = text.split("\n");
  const total = chars ? text.replace(/\s/g, "").length : text.split(/\s+/).filter(Boolean).length;
  return (
    <Tag id={id} className={className} style={{ ...style, "--n": total } as CSSProperties} aria-label={text.replace(/\n/g, " ")}>
      {lines.map((line, li) => (
        <span key={li} className="x-line" aria-hidden>
          {line.split(/(\s+)/).map((tok, ti) =>
            /^\s+$/.test(tok) || tok === "" ? (
              tok
            ) : chars ? (
              <span key={ti} className="x-w">
                {Array.from(tok).map((ch, ci) => (
                  <span key={ci} className="x-c" style={{ "--i": i++ } as CSSProperties}>{ch}</span>
                ))}
              </span>
            ) : (
              <span key={ti} className="x-w" style={{ "--i": i++ } as CSSProperties}>{tok}</span>
            ),
          )}
        </span>
      ))}
    </Tag>
  );
}

/** The long, thin arrow: the only arrow on the page. */
export function Arrow({ width = 26 }: { width?: number }) {
  return (
    <svg width={width} height={12} viewBox={`0 0 ${width} 12`} fill="none" aria-hidden>
      <path d={`M0 6h${width - 1}M${width - 7} 1l6 5-6 5`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

/** The primary action: a pill. Tone "blue" (default), "ink", or "white" (on the ultramarine spread). */
export function Action({ href, children, tone = "blue", size = "m", external, className }: { href: string; children: ReactNode; tone?: "blue" | "ink" | "white"; size?: "m" | "s"; external?: boolean; className?: string }) {
  return (
    <a href={href} className={`${s.action}${className ? ` ${className}` : ""}`} data-tone={tone === "blue" ? undefined : tone} data-size={size === "s" ? "s" : undefined} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      <span>{children}</span>
      <Arrow width={size === "s" ? 20 : 26} />
    </a>
  );
}

/** The quiet action: underlined text with the arrow. */
export function TextLink({ href, children, external, className }: { href: string; children: ReactNode; external?: boolean; className?: string }) {
  return (
    <a href={href} className={`${s.link}${className ? ` ${className}` : ""}`} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      <span>{children}</span>
      <Arrow width={20} />
    </a>
  );
}
