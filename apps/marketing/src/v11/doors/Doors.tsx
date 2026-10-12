// The doors (the V3 design, on the V5 foundation). The page ends where it began: the wall of
// conversations returns, quiet, on the page's one field of ultramarine, with the placement we
// followed lit in its place. The panel has the receipt's anatomy at the largest scale on the page:
// a head, a perforation, two sides. Each side is a door that opens to white when it is hovered,
// focused or pressed: white slides in flat from the door's outer edge, and the words are never
// covered (the white carries its own ink copy of them, hidden from assistive technology).
// Existing routes only.
import { Fragment } from "react";
import { Arrow } from "../kit";
import { DOORS } from "../copy";
import Seen from "./Seen";
import Wall from "./Wall";
import s from "./doors.module.css";

/** One sentence per line where a line has two. */
const sentences = (line: string) => line.split(/(?<=\.)\s+/);
type DoorCopy = (typeof DOORS.doors)[number];

function Body({ d }: { d: DoorCopy }) {
  return (
    <>
      <span className={s.line}>
        {sentences(d.line).map((t, i) => (
          <Fragment key={t}>{i ? " " : null}<span className={s.sentence}>{t}</span></Fragment>
        ))}
      </span>
      {" "}
      <span className={s.go}>
        <span>{d.action}</span> <Arrow width={26} />
      </span>
    </>
  );
}

export default function Doors() {
  return (
    <section id="start" className={s.close} aria-labelledby="start-h">
      <div className="x-wrap" data-rise="">
        <Seen className={s.panel}>
          <div className={s.top}>
            <Wall />
            <h2 id="start-h" className={s.h2} data-rise="">{DOORS.h}</h2>
          </div>
          <i className={s.perf} aria-hidden />
          <ul className={s.doors}>
            {DOORS.doors.map((d) => (
              <li key={d.who}>
                <a href={d.href} className={s.door}>
                  <span className={s.who}>{d.who}</span>
                  {" "}
                  <span className={s.face}><Body d={d} /></span>
                  <span className={s.open} aria-hidden>
                    <span className={s.openIn}><Body d={d} /></span>
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
