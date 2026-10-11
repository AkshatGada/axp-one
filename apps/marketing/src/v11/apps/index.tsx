// 04 For AI apps: "Your answer stays yours."
// A calm heading and one plate (the fictional assistant Tidewater, whole) with the four ideas set
// as marginal notes whose leader lines run to the parts they describe. No controls: the plate
// plays once as it enters and rests complete. The only focusable element is the action link.
// See NOTES.md.
import { Action, Chapter } from "../kit";
import { APPS } from "../copy";
import Plate from "./Plate";
import s from "./apps.module.css";

export default function Apps() {
  return (
    <Chapter id="apps" no={APPS.no} title={APPS.title} labelledBy="apps-h" className={s.root}>
      <div className="x-wrap">
        <header className={s.head}>
          <h2 id="apps-h" className={`x-h2 ${s.h}`}>{APPS.h}</h2>
        </header>
        <Plate />
        <div className={s.close}>
          <p className={`x-h3 ${s.code}`}>{APPS.code}</p>
          <Action href={APPS.action.href} className={s.action}>{APPS.action.label}</Action>
        </div>
      </div>
    </Chapter>
  );
}
