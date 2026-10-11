// Two doors. The page ends where it began: the wall of conversations returns, alive but quiet, on
// the page's one field of ultramarine, with the placement we followed back in its place. The panel
// repeats the receipt's anatomy at the largest scale on the page: a head, a perforation, two
// sides. The receipt's two halves, parted by the transition above, land as the two labels on the
// perforation. Each side is a door that opens (a leaf swinging inward on its outer hinge) when it
// is hovered, focused or pressed. Existing routes only.
import { Arrow } from "@axp/design-system/prospectus";
import { DOORS } from "../copy";
import Seen from "./Seen";
import Wall from "./Wall";
import s from "./doors.module.css";

export default function Doors() {
  return (
    <section id="start" className={s.close} aria-labelledby="start-h">
      <div className="px-wrap">
        <Seen className={s.panel}>
          <div className={s.top}>
            <Wall />
            <h2 id="start-h" className={s.h2}>{DOORS.h2}</h2>
          </div>
          <i className={s.perf} aria-hidden />
          <ul className={s.doors}>
            {DOORS.doors.map((d) => (
              <li key={d.who}>
                <a href={d.href} className={s.door}>
                  <span className={s.frame} aria-hidden><i className={s.leaf} /></span>
                  <span className={s.who}>{d.who}</span>
                  <span className={s.line}>{d.line}</span>
                  <span className={s.go}>
                    <span>{d.action}</span> <Arrow width={26} />
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className={s.also}>
            {DOORS.also.map((a) => (
              <a key={a.href} href={a.href}>{a.label}</a>
            ))}
          </p>
        </Seen>
      </div>
    </section>
  );
}
