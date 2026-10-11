// 04 For AI apps: "Your answer stays yours."
// One large plate (the fictional assistant Tidewater, whole and at rest) with the four ideas set
// as marginal notes whose leader lines run to the parts they describe. See NOTES.md.
import { Action, Chapter, Split } from "../kit";
import { APPS } from "../copy";
import Plate from "./Plate";
import s from "./apps.module.css";

export default function Apps() {
  return (
    <Chapter id="apps" no={APPS.no} title={APPS.title} labelledBy="apps-h" className={s.root}>
      <div className="x-wrap">
        <header className={s.head} data-reveal="">
          <Split as="h2" id="apps-h" text={APPS.h} className={`x-h1 ${s.h}`} />
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
