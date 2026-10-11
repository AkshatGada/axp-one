"use client";

// The specimen for scene C. A close-up of the fictional assistant with the one placement in it:
// the person's question, the app's own answer, and the Sponsored slot as a separate object.
// The reader operates two things: what the network returned for this moment, and the app's own
// category rules. The answer is one node that is never re-rendered with different text and never
// moves. All state is local to this component.
import { useEffect, useState } from "react";
import { Arrow } from "@axp/design-system/prospectus";
import { Illustration, SponsoredCard, useInView } from "../kit";
import { PUBLISHER_SIDE } from "../copy";
import { ADVERTISER, PLACEMENT, RECEIPT } from "../story";
import { CARD_CATEGORY, RETURNS, WORDS, type Returned } from "./words";
import s from "./publisher.module.css";

/** A conversation tile in miniature: the same atom as the wall. `lit` says which part this view
 *  is about; `card` whether the slot holds anything. */
function Glyph({ card, lit }: { card: boolean; lit?: "card" | "answer" }) {
  return (
    <svg className={s.glyph} data-lit={lit} width="46" height="34" viewBox="0 0 46 34" fill="none" aria-hidden>
      <rect className={s.gTile} x=".75" y=".75" width="44.5" height="32.5" rx="6.25" />
      <rect className={s.gQ} x="25" y="5.5" width="15" height="5" rx="2.5" />
      <rect className={s.gBar} x="6" y="15" width="17" height="2.6" rx="1.3" />
      <rect className={s.gBar} x="6" y="20" width="14" height="2.6" rx="1.3" />
      <rect className={s.gBar} x="6" y="25" width="10" height="2.6" rx="1.3" />
      {card ? <rect className={s.gCard} x="27.75" y="14.75" width="12.5" height="13.5" rx="2.75" /> : null}
    </svg>
  );
}

function Check() {
  return (
    <svg width="11" height="9" viewBox="0 0 11 9" fill="none" aria-hidden>
      <path d="M1 4.6 4 7.6 10 1.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Tidewater's mark: two tide lines in a disc. Drawn here; the app is fictional. */
function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg className={s.mark} width={size} height={size} viewBox="0 0 26 26" fill="none" aria-hidden>
      <rect width="26" height="26" rx="8" fill="currentColor" />
      <path d="M6 11.2c2.2-2.2 4.3-2.2 6.5 0s4.3 2.2 7.5 0M6 16.2c2.2-2.2 4.3-2.2 6.5 0s4.3 2.2 7.5 0" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Small line icons for the assistant's own reply tools (decoration only). */
function Tool({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d={d} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const TOOLS = [
  "M6.5 6.5V4.2c0-.7.5-1.2 1.2-1.2h6.1c.7 0 1.2.5 1.2 1.2v6.1c0 .7-.5 1.2-1.2 1.2h-2.3M4.2 6.5h6.1c.7 0 1.2.5 1.2 1.2v6.1c0 .7-.5 1.2-1.2 1.2H4.2c-.7 0-1.2-.5-1.2-1.2V7.7c0-.7.5-1.2 1.2-1.2Z",
  "M14.5 9a5.5 5.5 0 1 1-1.7-4M14.5 2.8v2.7h-2.7",
  "M9 11V3M6 5.8 9 3l3 2.8M3.5 10.5v3c0 .6.4 1 1 1h9c.6 0 1-.4 1-1v-3",
];

export default function Stage() {
  const [returned, setReturned] = useState<Returned>("ad");
  const [carried, setCarried] = useState<Record<string, boolean>>({ [CARD_CATEGORY]: true });
  const [changes, setChanges] = useState(0);
  const [ref, seen] = useInView<HTMLDivElement>("0px 0px -45% 0px");
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!seen) return;
    const t = window.setTimeout(() => setSettled(true), 1900);
    return () => window.clearTimeout(t);
  }, [seen]);

  // The app's rule comes first: a blocked category is never shown, whatever the network has.
  const blocked = !carried[CARD_CATEGORY];
  const state = blocked ? "blocked" : returned === "none" ? "none" : "shown";
  const shown = state === "shown";
  const status = shown ? WORDS.status.shown : blocked ? WORDS.status.blocked : PUBLISHER_SIDE.empty;
  const answerPath = PUBLISHER_SIDE.points[0]!;
  const categories = [CARD_CATEGORY, ...PLACEMENT.appRules.blocked];
  const bump = () => setChanges((n) => n + 1);

  return (
    <div className={s.stage} data-seen={seen ? "1" : "0"} data-settled={settled ? "1" : "0"} data-state={state}>
      {/* The bridge: the sentence leads; the pair only says which side this is. */}
      <div className={s.bridge}>
        <p className={`v8-strong ${s.bridgeLine}`}>{PUBLISHER_SIDE.bridge}</p>
        <p className={s.views}>
          <a className={s.view} href="#advertisers">
            <Glyph card lit="card" />
            <span>{WORDS.views.advertiser}</span>
          </a>
          <span className={s.view} data-current="" aria-current="true">
            <Glyph card lit="answer" />
            <span>{WORDS.views.app}</span>
          </span>
        </p>
      </div>

      {/* One object: the product, with its controls on the frame. */}
      <div ref={ref} className={s.unit}>
        <figure className={s.app} data-window="" aria-label={`${PLACEMENT.app.name}: ${PLACEMENT.app.kind.toLowerCase()}, showing the question, its own answer and the Sponsored slot`}>
          <div className={s.side} aria-hidden>
            <div className={s.brand}>
              <Mark />
              <span>{PLACEMENT.app.name}</span>
            </div>
            <span className={s.fresh}>
              <i />
              {WORDS.chat.fresh}
            </span>
            <span className={s.recent}>{WORDS.chat.recent}</span>
            <span className={s.chat} data-active="">
              {WORDS.chat.title}
            </span>
            {WORDS.chat.recents.map((t) => (
              <span key={t} className={s.chat}>
                {t}
              </span>
            ))}
          </div>

          <div className={s.main}>
            <div className={s.top} aria-hidden>
              <span className={s.topBrand}>
                <Mark size={22} />
              </span>
              <span className={s.topTitle}>{WORDS.chat.title}</span>
              <span className={s.dots}>
                <i />
                <i />
                <i />
              </span>
            </div>

            <div className={s.thread}>
              <p className={s.q}>{PLACEMENT.moment.question}</p>

              <div className={s.reply} data-reply="">
                <p className={s.who}>
                  <Mark size={24} />
                  <span>{PLACEMENT.app.name}</span>
                </p>
                <p className={s.answer} data-answer="">
                  {PLACEMENT.answer}
                </p>
                {/* A note on the picture, not part of the app: it re-confirms on every change. */}
                <span className={s.pin} aria-hidden>
                  <i key={changes} data-beat={changes ? "" : undefined}>
                    <Check />
                  </i>
                  {changes ? WORDS.pinAfter : WORDS.pin}
                </span>
                <span className={s.tools} aria-hidden>
                  {TOOLS.map((d) => (
                    <Tool key={d} d={d} />
                  ))}
                </span>
              </div>

              {/* The slot's place. Always laid out, so nothing else is ever pushed; the card is
                  visible only when one is shown. The outline is a passing trace, not app UI. */}
              <div className={s.bay} data-on={shown ? "1" : "0"}>
                <i className={s.trace} aria-hidden />
                <div className={s.slot}>
                  <SponsoredCard className={s.card} name={ADVERTISER.name} text={ADVERTISER.creative} domain={ADVERTISER.domain} />
                  <span className={s.accrued}>
                    <Check />
                    {RECEIPT.app.state}
                  </span>
                </div>
              </div>
            </div>

            <div className={s.composer} aria-hidden>
              <span>{WORDS.chat.composer}</span>
              <i>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 12V2M2.8 6.2 7 2l4.2 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </i>
            </div>
          </div>
        </figure>

        {/* The controls, on the frame. Local state only. */}
        <div className={s.tray}>
          <fieldset className={s.group}>
            <legend>{WORDS.returnsLegend}</legend>
            {RETURNS.map((o) => (
              <label key={o.id} className={s.opt}>
                <input
                  type="radio"
                  name="pub-returned"
                  value={o.id}
                  checked={returned === o.id}
                  onChange={() => {
                    setReturned(o.id);
                    bump();
                  }}
                />
                <span className={s.face}>
                  <Glyph card={o.id === "ad"} />
                  <span>{o.label}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <fieldset className={s.group}>
            <legend>{WORDS.rules}</legend>
            {categories.map((name) => (
              <label key={name} className={s.sw}>
                <input
                  type="checkbox"
                  role="switch"
                  name="pub-carry"
                  value={name}
                  checked={!!carried[name]}
                  onChange={(e) => {
                    const on = e.currentTarget.checked;
                    setCarried((c) => ({ ...c, [name]: on }));
                    bump();
                  }}
                />
                <i aria-hidden />
                <span>{name}</span>
              </label>
            ))}
          </fieldset>
        </div>
      </div>

      <div className={s.under}>
        <p className={s.status} role="status" data-quiet={shown ? "" : undefined}>
          {status}
          <span className={s.sr}> {changes ? WORDS.unchanged : ""}</span>
        </p>
        <div className={s.caption}>
          <Illustration />
          <span className="v8-cap">{PLACEMENT.app.kind}</span>
        </div>
      </div>

      {/* One scoped claim, and code as one quiet line. */}
      <div className={s.foot}>
        <p className={s.claim}>
          <b>{answerPath.k}.</b> {answerPath.v}
        </p>
        <p className={s.code}>
          <span>{PUBLISHER_SIDE.code}</span>
          <a className={`px-textaction ${s.guide}`} href={PUBLISHER_SIDE.action.href}>
            <span>{PUBLISHER_SIDE.action.label}</span>
            <Arrow width={18} />
          </a>
        </p>
      </div>
    </div>
  );
}
