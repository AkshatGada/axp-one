// The doors: the page's ending. Two tall doors, each half the measure. A door is closed ultramarine
// with a strip of paper light under it; on hover, focus and press the paper comes up through it,
// and that paper is the page that follows.
import { Arrow, TextLink } from "../kit";
import { DOORS } from "../copy";
import s from "./rule.module.css";

type DoorCopy = (typeof DOORS.doors)[number];

function Body({ d }: { d: DoorCopy }) {
  return (
    <>
      <span className={s.who}>{d.who}</span>
      <span className={s.doorLine}>{d.line}</span>
      <span className={s.go}>
        <span>{d.action}</span>
        <Arrow width={56} />
      </span>
    </>
  );
}

function Door({ d }: { d: DoorCopy }) {
  return (
    <a className={s.door} href={d.href}>
      <span className={s.face}><Body d={d} /></span>
      <span className={s.open} aria-hidden>
        <span className={s.openIn}><Body d={d} /></span>
      </span>
    </a>
  );
}

export default function Doors() {
  return (
    <section id="start" className={s.start} aria-labelledby="start-h">
      <div className={`x-wrap ${s.startIn}`}>
        <h2 id="start-h" className={s.startH}>{DOORS.h}</h2>
        <p className={s.also}>
          {DOORS.also.map((l) => <TextLink key={l.href} href={l.href} className={s.quiet}>{l.label}</TextLink>)}
        </p>
        {DOORS.doors.map((d) => <Door key={d.href} d={d} />)}
      </div>
    </section>
  );
}
