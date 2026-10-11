// 00 The cover. A banner headline over one picture: a field of people asking, in very large type,
// and above it a sheet where one question is followed (asked, answered, and sometimes one
// labelled card below). The headline, deck and actions are server rendered and never animate in.
// See NOTES.md.
import { Action, Arrow, Chapter, TextLink } from "../kit";
import { COVER } from "../copy";
import Field from "./Field";
import Sheet from "./Sheet";
import s from "./cover.module.css";

export default function Cover() {
  const at = COVER.h1.indexOf(COVER.accent);
  const lead = at > 0 ? COVER.h1.slice(0, at) : COVER.h1;
  const accent = at >= 0 ? COVER.accent : "";
  return (
    <Chapter id="top" bare labelledBy="cover-h" className={s.cover}>
      <div className={`x-wrap ${s.in}`}>
        <h1 id="cover-h" className={s.h1}>
          {lead}{accent ? <em>{accent}</em> : null}
        </h1>
        <div className={`x-grid ${s.body}`}>
          <Field />
          <div className={s.lede} data-cover="">
            <p className={`x-deck ${s.deck}`}>{COVER.deck}</p>
            <div className={s.actions}>
              <Action href={COVER.primary.href}>{COVER.primary.label}</Action>
              <TextLink href={COVER.secondary.href}>{COVER.secondary.label}</TextLink>
            </div>
          </div>
          <Sheet />
        </div>
        <div className={s.foot}>
          <p className={`x-cap ${s.note}`}>{COVER.note}</p>
          <span className={s.down} aria-hidden><Arrow width={26} /></span>
        </div>
      </div>
    </Chapter>
  );
}
