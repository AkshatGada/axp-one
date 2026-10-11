// The field: several rows of very large questions, drifting at different speeds in alternating
// directions. Server rendered and CSS driven, so it is complete as a still and moving from the
// first frame when motion is on. Purely a picture: hidden from assistive tech.
import type { CSSProperties } from "react";
import Drift from "./Drift";
import { FIELD, type Ask } from "./questions";
import s from "./cover.module.css";

const PACE = [1.5, 1.15, 1.7, 1.3, 1.05, 1.45];
const START = [0.07, 0.31, 0.18, 0.44, 0.02, 0.26];

function Item({ a }: { a: Ask }) {
  const end = a.t.slice(-1);
  const body = a.t.slice(0, -1);
  const at = a.hi ? a.t.indexOf(a.hi) : -1;
  if (at < 0 || !a.hi) return <span className={s.ask} data-q={a.id}>{body}<b>{end}</b></span>;
  const tail = a.t.slice(at + a.hi.length);
  return (
    <span className={s.ask} data-q={a.id}>
      {a.t.slice(0, at)}<i>{tail ? a.hi : a.hi.slice(0, -1)}</i>{tail ? tail.slice(0, -1) : ""}<b>{end}</b>
    </span>
  );
}

export default function Field() {
  return (
    <div className={s.field} aria-hidden>
      <Drift className={s.lean}>
        {FIELD.map((row, r) => {
          const chars = row.reduce((n, a) => n + a.t.length, 0);
          return (
            <div key={r} className={s.row} data-back={r % 2 ? "" : undefined} style={{ "--dur": `${Math.round(chars * PACE[r]!)}s`, "--p": START[r] } as CSSProperties}>
              <div className={s.track}>
                <span className={s.set}>{row.map((a) => <Item key={a.t} a={a} />)}</span>
                <span className={s.set}>{row.map((a) => <Item key={a.t} a={a} />)}</span>
              </div>
            </div>
          );
        })}
      </Drift>
    </div>
  );
}
