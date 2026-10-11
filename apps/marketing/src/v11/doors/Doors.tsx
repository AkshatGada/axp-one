// The doors (the V3 design, on the V5 foundation). The page ends where it began: the wall of
// conversations returns, quiet, on the page's one field of ultramarine, with the placement we
// followed lit in its place. The panel has the receipt's anatomy at the largest scale on the page:
// a head, a perforation, two sides. Each side is a door that opens to white (a leaf swinging
// inward on its outer hinge) when it is hovered, focused or pressed. Existing routes only.
import { Fragment } from "react";
import { Arrow } from "../kit";
import { DOORS } from "../copy";
import Seen from "./Seen";
import Wall from "./Wall";
import s from "./doors.module.css";

/** One sentence per line where a line has two. */
const sentences = (line: string) => line.split(/(?<=\.)\s+/);

export default function Doors() {
  return (
    <section id="start" className={s.close} aria-labelledby="start-h">
      <div className="x-wrap">
        <Seen className={s.panel}>
          <div className={s.top}>
            <Wall />
            <h2 id="start-h" className={s.h2}>{DOORS.h}</h2>
          </div>
          <i className={s.perf} aria-hidden />
          <ul className={s.doors}>
            {DOORS.doors.map((d) => (
              <li key={d.who}>
                <a href={d.href} className={s.door}>
                  <span className={s.frame} aria-hidden><i className={s.leaf} /></span>
                  <span className={s.who}>{d.who}</span>
                  {" "}
                  <span className={s.line}>
                    {sentences(d.line).map((t, i) => (
                      <Fragment key={t}>{i ? " " : null}<span className={s.sentence}>{t}</span></Fragment>
                    ))}
                  </span>
                  {" "}
                  <span className={s.go}>
                    <span>{d.action}</span> <Arrow width={26} />
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className={s.also}>
            {DOORS.also.map((a) => (
              <a key={a.href} href={a.href}><span>{a.label}</span></a>
            ))}
          </p>
        </Seen>
      </div>
    </section>
  );
}
