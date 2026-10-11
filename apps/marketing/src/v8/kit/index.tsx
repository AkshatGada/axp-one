// The shared kit for the V2 landing (FROZEN; owner: the integrator). Builders import from here
// and never edit it. If you need something the kit lacks, build it in your own folder and note it
// in NOTES.md so the integrator can decide whether it belongs here.
import type { CSSProperties, ReactNode } from "react";
import s from "./kit.module.css";
export { default as useReduced } from "@/motion/useReduced";
export { useInView } from "./useInView";

/** A chapter. Opens on the customer's question; the body is the builder's bespoke scene. */
export function Scene({ id, who, question, lede, center, tight, children, className }: { id: string; who?: string; question?: string; lede?: string; center?: boolean; tight?: boolean; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`${s.scene}${className ? ` ${className}` : ""}`} data-tight={tight ? "" : undefined} aria-labelledby={question ? `${id}-q` : undefined}>
      <div className="px-wrap">
        {question ? (
          <header className={s.opener} data-center={center ? "" : undefined}>
            {who ? <p className="v8-who">{who}</p> : null}
            <h2 id={`${id}-q`} className="v8-q">{question}</h2>
            {lede ? <p className="v8-lede">{lede}</p> : null}
          </header>
        ) : null}
        <div className={question ? s.body : undefined}>{children}</div>
      </div>
    </section>
  );
}

/** The local label for a scripted specimen. Use once per specimen, near it. */
export function Illustration({ still, className }: { still?: boolean; className?: string }) {
  return <p className={`${s.illus}${className ? ` ${className}` : ""}`}>{still ? "Illustration" : "Interactive illustration"}</p>;
}

/** The one Sponsored card. The text is always the advertiser's approved words, unaltered. */
export function SponsoredCard({ name, text, domain, size = "m", className, style }: { name: string; text: string; domain?: string; size?: "m" | "s"; className?: string; style?: CSSProperties }) {
  return (
    <div className={`${s.ad}${className ? ` ${className}` : ""}`} data-size={size} style={style}>
      <div className={s.adHead}>
        <span className={s.tag}>Sponsored</span>
        <span className={s.adName}>{name}</span>
      </div>
      <p className={s.adText}>{text}</p>
      {domain ? <span className={s.adFoot}>{domain}</span> : null}
    </div>
  );
}

/** The atom of the wall: a question, the app's answer (as lines, or your own children) and one
 *  slot. `slot` is whatever sits in the Sponsored slot: a SponsoredCard, an EmptySlot, or nothing. */
export function Tile({ question, tone, size = "m", answer, slot, className, style }: { question: string; tone?: "lit" | "dim"; size?: "m" | "l"; answer?: ReactNode; slot?: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`${s.tile}${className ? ` ${className}` : ""}`} data-tone={tone} data-size={size} style={style}>
      <p className={s.tq}>{question}</p>
      {answer ?? <div className={s.ans} aria-hidden><i /><i /><i /></div>}
      {slot !== undefined ? <div className={s.slot}>{slot}</div> : null}
    </div>
  );
}

export function EmptySlot({ children }: { children?: ReactNode }) {
  return <div className={s.slotEmpty}>{children ?? "Sponsored"}</div>;
}

/** A keyboard-selectable set of options (a native radio group: Tab in, arrows to move). */
export function Choices<T extends string>({ name, legend, options, value, onChange, className }: { name: string; legend: string; options: { id: T; label: string }[]; value: T; onChange: (id: T) => void; className?: string }) {
  return (
    <fieldset className={`${s.choices}${className ? ` ${className}` : ""}`}>
      <legend>{legend}</legend>
      {options.map((o) => (
        <label key={o.id} className={s.choice}>
          <input type="radio" name={name} value={o.id} checked={value === o.id} onChange={() => onChange(o.id)} />
          <span>{o.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
