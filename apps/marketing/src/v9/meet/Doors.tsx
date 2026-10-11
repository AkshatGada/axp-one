// Two doors. The page ends where it began: the wall of conversations returns, now quiet on the
// page's one field of ultramarine, with the placement we followed back in its place among the
// others. The panel repeats the receipt's anatomy at the largest scale on the page: a head, a
// perforation, two sides. Existing routes only.
import { Arrow } from "@axp/design-system/prospectus";
import { ADVERTISER, PLACEMENT } from "../story";
import { DOORS } from "../copy";
import { EmptySlot, SponsoredCard, Tile } from "../kit";
import { WALL_QUESTIONS } from "./local";
import Seen from "./Seen";
import s from "./doors.module.css";

const COLS = 5;
const PER = 4;
/** Where the page's own placement sits in the wall: [column, row]. */
const LIT: [number, number] = [2, 1];

function Wall() {
  return (
    <div className={s.wall} aria-hidden>
      <div className={s.plane}>
        {Array.from({ length: COLS }, (_, c) => (
          <div key={c} className={s.col}>
            {Array.from({ length: PER }, (_, r) =>
              c === LIT[0] && r === LIT[1] ? (
                <Tile key={r} className={s.lit} question={PLACEMENT.moment.question} slot={<SponsoredCard size="s" name={ADVERTISER.name} text={ADVERTISER.creative} />} />
              ) : (
                <Tile key={r} className={s.dim} question={WALL_QUESTIONS[(c * PER + r) % WALL_QUESTIONS.length]!} slot={<EmptySlot />} />
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

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
                  <span className={s.who}>{d.who}</span>
                  <span className={s.line}>{d.line}</span>
                  <span className={s.go}>
                    {d.action} <Arrow width={24} />
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
