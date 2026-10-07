// v7 Jev chapter: an ultramarine world. One real judgment from the live run, as a sheet that plays
// when it scrolls in: the evidence goes in, Jev returns relevance, buying intent and creative fit
// with its confidence, and code turns that into the capped bid. Modest credit: built with Jev.
import type { CSSProperties } from "react";
import { Arrow } from "@axp/design-system/prospectus";
import { CACHED } from "@/data/run";
import { JEV_SECTION as J, JEV_URL } from "@/data/copy";
import s from "./jev.module.css";

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

export default function Jev() {
  return (
    <section id="jev" data-world="brand" data-step="jev" className={s.jev} data-tone="brand" data-header-tone="brand" aria-labelledby="jev-title">
      <div className={`px-wrap ${s.grid}`}>
        <div className={s.left} data-tone-text="">
          <p className={s.label}>
            {J.label}
          </p>
          <h2 id="jev-title" className={s.h2}>
            {J.h2}
          </h2>
          <p className={s.note}>{J.note}</p>
          <a className={s.credit} href={JEV_URL} {...ext}>
            <span>{J.credit}</span>
            <Arrow width={20} />
          </a>
        </div>
        <div className={s.sheet} data-reveal="sheet" data-visual="">
          <div className={s.col}>
            <span className={s.k}>{J.inLabel}</span>
            {J.inputs.map((x, i) => (
              <div key={x} className={s.input} style={{ "--i": i } as CSSProperties}>
                <span>{x}</span>
                {i === 0 ? <q className={s.q}>{CACHED.question}</q> : null}
              </div>
            ))}
          </div>
          <div className={s.flow} aria-hidden>
            <i style={{ "--i": 0 } as CSSProperties} />
            <i style={{ "--i": 1 } as CSSProperties} />
            <i style={{ "--i": 2 } as CSSProperties} />
            <span className={s.engine}>Jev</span>
          </div>
          <div className={s.col}>
            <span className={s.k}>{J.outLabel}</span>
            {J.outputs.map((o, i) => (
              <div key={o.k} className={s.out} style={{ "--i": i } as CSSProperties}>
                <div className={s.outTop}>
                  <span>{o.k}</span>
                  <b>{o.v}</b>
                </div>
                {/* One bar, sized to Jev's own confidence: the number printed beside it. */}
                <div className={s.levels} role="img" aria-label={o.conf}>
                  <i data-on="" style={{ "--v": o.value } as CSSProperties} />
                </div>
                <span className={s.conf}>{o.conf}</span>
              </div>
            ))}
          </div>
          <div className={s.code}>
            <span className={s.rule}>{J.rule}</span>
            <span className={s.k}>{J.codeLabel}</span>
            <p className={s.bid}>
              <b>{J.bid}</b> USDC <span>{J.cap}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
