// One customer chapter: the route's node, the stages it belongs to, then problem, product action
// and outcome beside a specimen. Server-rendered; the reveal is the shared [data-reveal] fade.
import type { ReactNode } from "react";
import { ActionText } from "@axp/design-system/prospectus";
import s from "./story.module.css";

const STAGE_NAMES: Record<string, string> = { "01": "Campaign", "02": "Opportunity", "03": "Eligible auction", "04": "Disclosed delivery", "05": "Accounting and payment" };

export type ChapterCopy = { label: string; h2: string; problem?: string; points?: { k: string; v: string }[]; outcome?: string };

export default function Chapter({ id, copy, stages, flip, first, last, actions, children }: { id: string; copy: ChapterCopy; stages?: string[]; flip?: boolean; first?: boolean; last?: boolean; actions?: { href: string; label: string }[]; children: ReactNode }) {
  return (
    <section id={id} className={s.chapter} data-first={first ? "" : undefined} data-last={last ? "" : undefined} aria-labelledby={`${id}-title`}>
      <div className={`px-wrap ${s.grid}`} data-flip={flip ? "" : undefined}>
        <span className={s.node} aria-hidden />
        <div className={s.copy} data-reveal="fade">
          <p className={s.kicker}>
            {stages?.length ? (
              <span className={s.stages}>
                {stages.map((n) => (
                  <a key={n} href="#how" aria-label={`Stage ${n}, ${STAGE_NAMES[n]}: back to how it works`} title={STAGE_NAMES[n]}>
                    {n}
                  </a>
                ))}
              </span>
            ) : null}
            <span>{copy.label}</span>
          </p>
          <h2 id={`${id}-title`} className={s.h2}>{copy.h2}</h2>
          {copy.problem ? <p className={s.problem}>{copy.problem}</p> : null}
          {copy.points ? (
            <dl className={s.points}>
              {copy.points.map((p) => (
                <div key={p.k}>
                  <dt>{p.k}</dt>
                  <dd>{p.v}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {copy.outcome ? <p className={s.outcome}>{copy.outcome}</p> : null}
          {actions?.length ? (
            <div className={s.actions}>
              {actions.map((a) => (
                <ActionText key={a.href} href={a.href}>{a.label}</ActionText>
              ))}
            </div>
          ) : null}
        </div>
        <div className={s.visual} data-reveal="fade" style={{ "--d": "120ms" } as React.CSSProperties}>
          {children}
        </div>
      </div>
    </section>
  );
}

export function Sheet({ name, note, className, children, ...rest }: { name: string; note?: string; className?: string; children: ReactNode } & Record<`data-${string}`, string | undefined>) {
  return (
    <div className={`${s.sheet}${className ? ` ${className}` : ""}`} {...rest}>
      <div className={s.bar}>
        <span className={s.barName}>{name}</span>
        {note ? <span className={s.barNote}>{note}</span> : null}
      </div>
      {children}
    </div>
  );
}

/** The story's one Sponsored card, the same in every chapter. */
export function Ad({ name, text }: { name: string; text: string }) {
  return (
    <div className={s.ad}>
      <div className={s.adHead}>
        <span className={s.tag}>Sponsored</span>
        <span className={s.adName}>{name}</span>
      </div>
      <p>{text}</p>
    </div>
  );
}
