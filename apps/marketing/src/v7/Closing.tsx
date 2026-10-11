// The route ends here: one ultramarine panel on the paper, one door per audience.
import { ActionText, Arrow } from "@axp/design-system/prospectus";
import { CLOSING, PRODUCT_VIDEO_URL } from "@/data/copy";
import s from "./closing.module.css";

export default function Closing() {
  return (
    <section id="start" className={s.close} aria-labelledby="close-title">
      <div className={`px-wrap ${s.panel}`} data-tone="brand">
        <h2 id="close-title" className={s.h2}>{CLOSING.h2}</h2>
        <ul className={s.paths}>
          {CLOSING.paths.map((p) => (
            <li key={p.who}>
              <a href={p.href} className={s.path}>
                <span className={s.who}>{p.who}</span>
                <span className={s.line}>{p.line}</span>
                <span className={s.go}>{p.action} <Arrow width={22} /></span>
              </a>
            </li>
          ))}
        </ul>
        <div className={s.foot}>
          <p className={s.note}>{CLOSING.note}</p>
          <ActionText href={PRODUCT_VIDEO_URL}>{CLOSING.video}</ActionText>
        </div>
      </div>
    </section>
  );
}
