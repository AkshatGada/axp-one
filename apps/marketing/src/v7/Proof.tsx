// v7 proof: what the live run did, in four big numbers; verify it yourself (the checks run in the
// visitor's browser, in the MVP); the four minute walkthrough; one compact "what's real" popover;
// then working now vs building next (planned items marked as planned).
import { ActionPrimary } from "@axp/design-system/prospectus";
import { RUN } from "@/data/run";
import { MVP_VERIFY_URL, NEXT, PROOF, VIDEO } from "@/data/copy";
import s from "./proof.module.css";

export default function Proof() {
  const v = RUN.video;
  return (
    <section id="proof" data-world="paper2" className={s.proof} aria-labelledby="proof-title">
      <div className={`px-wrap ${s.grid}`}>
        <div className={s.left} data-tone-text="">
          <p className={s.label}>{PROOF.label}</p>
          <h2 id="proof-title" className="px-h1">
            {PROOF.h2}
          </h2>
          <p className={s.runline}>{PROOF.run}</p>
          <ul className={s.figs}>
            {PROOF.figures.map((f) => (
              <li key={f.k} data-reveal="fade">
                <b>{f.n}</b>
                <span>{f.k}</span>
              </li>
            ))}
          </ul>
          <div className={s.verify}>
            <ActionPrimary href={MVP_VERIFY_URL} external>
              {PROOF.verify}
            </ActionPrimary>
            <span>{PROOF.verifySub}</span>
          </div>
          <details className={s.real}>
            <summary>{PROOF.realSummary}</summary>
            <p>{PROOF.real}</p>
            <p>{PROOF.illustrative}</p>
            <p>{PROOF.limits}</p>
          </details>
        </div>
        {v ? (
          <figure id="video" className={s.video}>
            <div className={s.frame}>
              <video controls preload="none" playsInline poster="/video-poster.png" aria-label={VIDEO.title} style={{ aspectRatio: `${v.width} / ${v.height}` }}>
                <source src={`/${v.file}`} type="video/mp4" />
                <track kind="captions" src={`/${v.captions}`} srcLang="en" label="English" default />
              </video>
            </div>
            <figcaption data-tone-text="">
              <b>{PROOF.video}</b> {VIDEO.caption}
            </figcaption>
          </figure>
        ) : null}
      </div>
      <div className={`px-wrap ${s.next}`} data-tone-text="">
        <h3 className={s.h3}>{NEXT.h3}</h3>
        <ul className={s.pills} aria-label="Working now">
          {NEXT.now.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <ul className={s.pills} data-planned="" aria-label="Planned">
          <li className={s.k}>{NEXT.nextLabel}</li>
          {NEXT.next.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
