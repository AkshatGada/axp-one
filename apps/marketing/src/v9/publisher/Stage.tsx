"use client";

// The specimen for scene C (V3). A close-up of the fictional assistant with the one placement in
// it: the person's question, the app's own answer, and the Sponsored slot as a separate object.
//
// It plays once when it enters view: the question lands, the answer writes itself in, the card
// arrives separately while it writes and the accrual note lands; after a beat no ad fits, the slot empties and the answer is held exactly where it is; then the card returns and
// the controls are handed to the reader. Any interaction stops the performance for good.
//
// The write-in is presentation only: every word of the answer is in the markup from the first
// render (server included), in the same nodes, and only its opacity changes. The slot is always
// laid out, so the answer never reflows. With motion off the scene rests complete, card shown.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Arrow } from "@axp/design-system/prospectus";
import { Illustration, SponsoredCard, useInView } from "../kit";
import { PUBLISHER_SIDE } from "../copy";
import { ADVERTISER, PLACEMENT, RECEIPT } from "../story";
import { CARD_CATEGORY, WORDS } from "./words";
import s from "./publisher.module.css";

function Check() {
  return (
    <svg className={s.check} width="11" height="9" viewBox="0 0 11 9" fill="none" aria-hidden>
      <path d="M1 4.6 4 7.6 10 1.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Tidewater's mark: two tide lines in a rounded square. Drawn here; the app is fictional. */
function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg className={s.mark} width={size} height={size} viewBox="0 0 26 26" fill="none" aria-hidden>
      <rect width="26" height="26" rx="8" fill="currentColor" />
      <path d="M6 11.2c2.2-2.2 4.3-2.2 6.5 0s4.3 2.2 7.5 0M6 16.2c2.2-2.2 4.3-2.2 6.5 0s4.3 2.2 7.5 0" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Line icons for the assistant's own chrome (decoration only). */
const ICONS = {
  search: "M8 13.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11ZM12.2 12.2l3.3 3.3",
  plus: "M9 3.5v11M3.5 9h11",
  copy: "M6.5 6.5V4.2c0-.7.5-1.2 1.2-1.2h6.1c.7 0 1.2.5 1.2 1.2v6.1c0 .7-.5 1.2-1.2 1.2h-2.3M4.2 6.5h6.1c.7 0 1.2.5 1.2 1.2v6.1c0 .7-.5 1.2-1.2 1.2H4.2c-.7 0-1.2-.5-1.2-1.2V7.7c0-.7.5-1.2 1.2-1.2Z",
  again: "M14.5 9a5.5 5.5 0 1 1-1.7-4M14.5 2.8v2.7h-2.7",
  share: "M9 11V3M6 5.8 9 3l3 2.8M3.5 10.5v3c0 .6.4 1 1 1h9c.6 0 1-.4 1-1v-3",
  mic: "M9 2.5a2 2 0 0 0-2 2v4a2 2 0 0 0 4 0v-4a2 2 0 0 0-2-2ZM4.5 8.5a4.5 4.5 0 0 0 9 0M9 13v2.5",
  send: "M9 14.5v-11M4.5 8 9 3.5 13.5 8",
} as const;
function Icon({ name, size = 18 }: { name: keyof typeof ICONS; size?: number }) {
  return (
    <svg className={s.icon} width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d={ICONS[name]} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The answer, split once into words so each can fade in. Joined back it is the story's text. */
const ANSWER_WORDS = PLACEMENT.answer.split(" ");

/** The performance, in milliseconds after the window enters view. */
const BEATS = { ask: 420, write: 1150, card: 2050, empty: 4500, back: 6150, hand: 7500 } as const;

type Play = "pre" | "run" | "done";

export default function Stage() {
  const [fits, setFits] = useState(true);
  const [allowed, setAllowed] = useState(true);
  const [changes, setChanges] = useState(0);
  const [play, setPlay] = useState<Play>("pre");
  const [step, setStep] = useState(0);
  const [written, setWritten] = useState<"1" | "run">("1");
  const [ref, seen] = useInView<HTMLDivElement>("0px 0px -38% 0px");
  const timers = useRef<number[]>([]);
  const stopped = useRef(false);

  /** Any interaction ends the performance for good. The write-in is left to finish on its own. */
  const stop = useCallback(() => {
    if (stopped.current) return;
    stopped.current = true;
    timers.current.forEach((t) => window.clearTimeout(t));
    setPlay("done");
  }, []);

  useEffect(() => {
    if (!seen || stopped.current) return;
    if (document.documentElement.dataset.pxMotion !== "on") {
      stopped.current = true;
      setPlay("done");
      return;
    }
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    setPlay("run");
    setStep(1);
    at(BEATS.ask, () => setStep(2));
    at(BEATS.write, () => {
      setStep(3);
      setWritten("run");
    });
    at(BEATS.card, () => setStep(4));
    at(BEATS.empty, () => {
      setFits(false);
      setChanges((n) => n + 1);
    });
    at(BEATS.back, () => {
      setFits(true);
      setChanges((n) => n + 1);
    });
    at(BEATS.hand, () => {
      stopped.current = true;
      setPlay("done");
    });
    const all = timers.current;
    return () => all.forEach((t) => window.clearTimeout(t));
  }, [seen]);

  // The app's rule comes first: a blocked category is never shown, whatever the network has.
  const blocked = !allowed;
  const state = blocked ? "blocked" : fits ? "shown" : "none";
  const shown = state === "shown";
  const running = play === "run";
  const qOn = !running || step >= 2;
  const replyOn = !running || step >= 3;
  const cardOn = shown && (!running || step >= 4);
  const why = blocked ? WORDS.blocked : PUBLISHER_SIDE.empty;
  const answerPath = PUBLISHER_SIDE.points[0]!;
  const act = (fn: () => void) => {
    stop();
    fn();
    setChanges((n) => n + 1);
  };

  return (
    <div className={s.stage} data-play={play} data-written={written} data-state={state}>
      {/* The opener, as every scene has it: who and the question left, the lede right. */}
      <header className={s.head}>
        <div className={s.headQ}>
          <p className="v8-who">{PUBLISHER_SIDE.who}</p>
          <h2 id="publishers-q" className={`v8-q ${s.h}`}>
            {PUBLISHER_SIDE.question}
          </h2>
        </div>
        <p className={`v8-lede ${s.lede}`}>{PUBLISHER_SIDE.lede}</p>
      </header>

      {/* The bridge, quietly, on the app it describes. */}
      <p className={s.bridge}>{PUBLISHER_SIDE.bridge}</p>

      {/* One object: the product, with its controls on the frame. */}
      <div ref={ref} className={s.unit} onPointerDownCapture={stop} onKeyDownCapture={stop} onFocusCapture={stop}>
        <figure className={s.app} data-window="" aria-label={`${PLACEMENT.app.name}: ${PLACEMENT.app.kind.toLowerCase()}, showing the question, its own answer and the Sponsored slot`}>
          <div className={s.side} aria-hidden>
            <span className={s.lights}>
              <i />
              <i />
              <i />
            </span>
            <div className={s.brand}>
              <Mark size={24} />
              <span>{PLACEMENT.app.name}</span>
            </div>
            <span className={s.search}>
              <Icon name="search" size={15} />
              {WORDS.chat.search}
            </span>
            <span className={s.fresh}>
              <Icon name="plus" size={15} />
              {WORDS.chat.fresh}
            </span>
            <span className={s.label}>{WORDS.chat.today}</span>
            <span className={s.chat} data-active="">
              {WORDS.chat.title}
            </span>
            <span className={s.label}>{WORDS.chat.earlier}</span>
            {WORDS.chat.recents.map((t) => (
              <span key={t} className={s.chat}>
                {t}
              </span>
            ))}
            <span className={s.kind}>{PLACEMENT.app.kind}</span>
          </div>

          <div className={s.main}>
            <div className={s.top} aria-hidden>
              <span className={s.topBrand}>
                <Mark size={22} />
              </span>
              <span className={s.topTitle}>{WORDS.chat.title}</span>
              <span className={s.topTools}>
                <Icon name="share" size={16} />
                <span className={s.dots}>
                  <i />
                  <i />
                  <i />
                </span>
              </span>
            </div>

            <div className={s.thread}>
              <p className={s.q} data-on={qOn ? "1" : "0"}>
                {PLACEMENT.moment.question}
              </p>

              <div className={s.reply} data-reply="" data-on={replyOn ? "1" : "0"}>
                <p className={s.who}>
                  <Mark size={22} />
                  <span>{PLACEMENT.app.name}</span>
                </p>
                <p className={s.answer} data-answer="">
                  {ANSWER_WORDS.map((w, i) => (
                    <span key={i}>
                      {i ? " " : ""}
                      <span className={s.w} style={{ "--i": i } as CSSProperties}>
                        {w}
                      </span>
                    </span>
                  ))}
                </p>
                <span className={s.tools} aria-hidden>
                  <Icon name="copy" />
                  <Icon name="again" />
                  <Icon name="share" />
                </span>
                {/* A quiet hold on the answer while the slot changes: ours, not the app's. */}
                <span key={changes} className={s.hold} data-run={changes ? "" : undefined} aria-hidden>
                  <i />
                  <i />
                  <i />
                  <i />
                  <b>
                    <Check />
                  </b>
                </span>
              </div>

              {/* The slot's place. Always laid out, so nothing else is ever pushed; the card is
                  visible only when one is shown. The outline is a passing trace, not app UI. */}
              <div className={s.bay} data-on={cardOn ? "1" : "0"} data-why={state} data-left={!running || step >= 4 ? "" : undefined}>
                <i className={s.trace} aria-hidden />
                {/* Why nothing is shown, in the empty place itself. Ours, not the app's. */}
                <p className={s.why} role="status" data-on={shown ? "0" : "1"}>
                  <span aria-hidden={shown}>{why}</span>
                  <span className={s.sr}>{shown ? (changes ? `${WORDS.shown} ${WORDS.unchanged}` : "") : ` ${WORDS.unchanged}`}</span>
                </p>
                <div className={s.slot}>
                  <SponsoredCard className={s.card} name={ADVERTISER.name} text={ADVERTISER.creative} domain={ADVERTISER.domain} />
                  <span className={s.accrued}>
                    <b>
                      <Check />
                    </b>
                    {RECEIPT.app.state}
                  </span>
                </div>
              </div>
            </div>

            <div className={s.composer} aria-hidden>
              <span className={s.attach}>
                <Icon name="plus" size={16} />
              </span>
              <span className={s.ask}>{WORDS.chat.composer}</span>
              <Icon name="mic" />
              <i>
                <Icon name="send" size={16} />
              </i>
            </div>
          </div>
        </figure>

        {/* The controls, on the frame. Each one changes the slot. Local state only. */}
        <div className={s.tray} data-wake={play === "done" ? "" : undefined}>
          <fieldset className={s.choice}>
            <legend className={s.sr}>{WORDS.fitLegend}</legend>
            {[
              { on: true, label: WORDS.fits },
              { on: false, label: WORDS.noFit },
            ].map((o) => (
              <label key={o.label} className={s.opt}>
                <input type="radio" name="pub-fits" value={o.on ? "yes" : "no"} checked={fits === o.on} onChange={() => act(() => setFits(o.on))} />
                <span>{o.label}</span>
              </label>
            ))}
          </fieldset>
          <label className={s.rule}>
            <span className={s.ruleK}>{WORDS.rules}</span>
            <input type="checkbox" role="switch" name="pub-allow" checked={allowed} onChange={(e) => { const on = e.currentTarget.checked; act(() => setAllowed(on)); }} />
            <i className="v8-sw" data-on={allowed ? "" : undefined} aria-hidden />
            <span className={s.ruleV}>{CARD_CATEGORY}</span>
          </label>
          <Illustration className={s.illus} />
        </div>
      </div>

      {/* One scoped claim, and code as one quiet line. */}
      <div className={s.foot}>
        <p className={s.claim}>
          <b>{answerPath.k}.</b> {answerPath.v}
        </p>
        <p className={s.kindNarrow}>{PLACEMENT.app.kind}</p>
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
