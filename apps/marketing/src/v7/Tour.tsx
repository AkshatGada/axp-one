// v7 inside the MVP: four framed captures of the working MVP (captured at 2x from the live run's
// MVP), one line each, each opening that page. Frames rise into place as they scroll in.
import type { CSSProperties } from "react";
import { ActionPrimary, Arrow } from "@axp/design-system/prospectus";
import { MVP_TOUR, MVP_URL } from "@/data/copy";
import s from "./tour.module.css";

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

export default function Tour() {
  return (
    <section id="mvp" className={s.tour} aria-labelledby="mvp-title">
      <div className="px-wrap">
        <div className={s.head}>
          <div>
            <p className={s.label}>{MVP_TOUR.label}</p>
            <h2 id="mvp-title" className="px-h1">
              {MVP_TOUR.h2}
            </h2>
          </div>
          <ActionPrimary href={MVP_URL} external>
            {MVP_TOUR.action}
          </ActionPrimary>
        </div>
        <ul className={s.grid}>
          {MVP_TOUR.tiles.map((t, i) => (
            <li key={t.key} data-reveal="fade" style={{ "--d": `${(i % 2) * 120}ms` } as CSSProperties}>
              <a className={s.tile} href={t.href} {...ext}>
                <span className={s.frame}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/tour/${t.key}.webp`} alt={t.alt} width={1440} height={900} loading="lazy" decoding="async" />
                </span>
                <span className={s.cap}>
                  <span>{t.title}</span>
                  <Arrow width={20} />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
