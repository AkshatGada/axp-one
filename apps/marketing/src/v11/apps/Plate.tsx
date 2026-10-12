"use client";

// The plate for movement 04: Tidewater (a fictional assistant) shown whole, with four marginal
// notes. Nothing here is a control: the plate plays once as it enters and then rests complete.
// The answer is one element that no state touches, and the slot below it always keeps its place
// (the card is in the flow from the first paint), so the answer cannot move.
//
// Stages: "still" is the server render, the motion-off page and an abrupt arrival (complete).
// With motion armed and the plate still below the screen: "pre" (waiting) > "write" (the answer
// writes in) > "card" (the card arrives below the answer, is confirmed, the accrual lands; rest).
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Ad, Split, useInView } from "../kit";
import { ADVERTISER, ANSWER, APP, APP_RULES, INDEPENDENCE, QUESTION, RECEIPT } from "../story";
import { APPS } from "../copy";
import s from "./apps.module.css";

type Stage = "still" | "pre" | "write" | "card";

// The performance, in milliseconds from the moment the plate is seen.
const T = { write: 0, card: 1400, confirm: 2040 };

function Tick({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 15 15" width={size} height={size} fill="none" aria-hidden>
      <path d="M3.2 7.9l2.8 2.8 5.8-6.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
    </svg>
  );
}

export default function Plate() {
  const [ref, seen] = useInView<HTMLDivElement>(0.35);
  const [stage, setStage] = useState<Stage>("still");
  const [instant, setInstant] = useState(false);
  const [confirmed, setConfirmed] = useState(true);
  const [entered, setEntered] = useState(false);

  const motion = useRef(false);
  const timers = useRef<number[]>([]);
  const enteredRef = useRef(false);
  const tagRef = useRef<HTMLParagraphElement>(null);
  const tagSeen = useRef(false);   // the accrual tab is on screen
  const cardDone = useRef(false);  // the card has arrived and may be confirmed

  const cardOn = stage === "card" || stage === "still";

  // How much of the plate is on screen, and whether it has been scrolled past.
  const measure = () => {
    const el = ref.current;
    if (!el) return { ratio: 0, above: false };
    const r = el.getBoundingClientRect();
    const shown = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
    return { ratio: Math.max(0, shown) / Math.max(1, r.height), above: r.top < -40 };
  };

  // Enter: perform once. `abrupt` means the reader landed on the plate all at once (an anchor
  // link, a flick, coming back up from below): then the plate is whole at once, in the same frame.
  const enter = useCallback((abrupt: boolean) => {
    if (enteredRef.current) return;
    enteredRef.current = true;
    const at = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };
    if (abrupt) {
      flushSync(() => { setInstant(true); setConfirmed(true); setStage("still"); setEntered(true); });
      at(160, () => setInstant(false));
      return;
    }
    setEntered(true);
    at(T.write, () => setStage("write"));
    at(T.card, () => setStage("card"));
    // On a laptop the accrual is beside the card, so it lands with it. On narrow screens the tab
    // sits in the notes under the plate: there it lands when the reader reaches it.
    at(T.confirm, () => {
      cardDone.current = true;
      if (tagSeen.current || !window.matchMedia("(max-width: 1179px)").matches) setConfirmed(true);
    });
  }, []);

  // Arm, only when the visitor allows motion. The server render is the whole plate; it is only
  // cleared for the performance while it is still off screen, so nothing ever flashes empty.
  useEffect(() => {
    motion.current = document.documentElement.dataset.pxMotion === "on";
    if (!motion.current) return;
    let io: IntersectionObserver | null = null;
    const reset = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; enteredRef.current = false; cardDone.current = false; tagSeen.current = false; io?.disconnect(); };
    const first = measure();
    if (first.ratio >= 0.2 || first.above) { enteredRef.current = true; setEntered(true); return reset; }
    setConfirmed(false);
    setStage("pre");
    // The plate has entered when a good quarter of it is on screen. A scroll crosses that line
    // gently; a jump lands well past it in one step. Checked on scroll (before the frame paints).
    const check = () => {
      if (enteredRef.current) return;
      const m = measure();
      if (m.ratio < 0.28 && !m.above) return;
      enter(m.above);
    };
    // The accrual tab: seen once most of it is on screen (or it has been passed).
    if (tagRef.current) {
      io = new IntersectionObserver(([e]) => {
        if (!e || !(e.intersectionRatio >= 0.9 || e.boundingClientRect.top < 0)) return;
        tagSeen.current = true;
        io?.disconnect();
        if (cardDone.current) setConfirmed(true);
      }, { threshold: [0, 0.9], rootMargin: "0px 0px -8% 0px" });
      io.observe(tagRef.current);
    }
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => { reset(); window.removeEventListener("scroll", check); window.removeEventListener("resize", check); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The kit's fail safe: if the plate has been in sight for a while without properly entering
  // (a sliver at the bottom of the screen), stop waiting and show it whole.
  useEffect(() => {
    if (!seen || entered || !motion.current) return;
    const t = window.setTimeout(() => enter(true), 4000);
    return () => window.clearTimeout(t);
  }, [seen, entered, enter]);

  const [model, slot, rules, earn] = APPS.points;

  return (
    <div className={s.figWrap}>
      <figure className={s.fig}>
        <div className={s.stage} data-stage={stage} data-card={cardOn ? "on" : "off"} data-confirmed={confirmed ? "" : undefined} data-instant={instant ? "" : undefined}>
          {/* The sheet itself (its material and depth). The plate's parts are laid over it. */}
          <div ref={ref} className={s.sheet} aria-hidden />
          <div className={s.plate}>
            <div className={s.bar}>
              <span className={s.brand}><i className={s.tide} aria-hidden />{APP.name}</span>
              <span className={s.barRight} aria-hidden>
                <span className={s.ghost}>
                  <svg viewBox="0 0 14 14" width="12" height="12" fill="none"><path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" /></svg>
                  New prompt
                </span>
                <i className={s.me}><i /></i>
              </span>
            </div>

            <div className={s.col}>
              <p className={s.q}><span className={s.sr}>The prompt: </span>{QUESTION}</p>

              <div className={s.a}>
                <p className={s.aLabel}>
                  <i className={s.tide} data-s="" aria-hidden />{APP.name}
                </p>
                <Split as="p" text={ANSWER} className={s.answer} />
                <i className={`${s.brace} ${s.dk}`} aria-hidden />
                <i className={`${s.lead} ${s.leadL} ${s.lead1} ${s.dk}`} aria-hidden />
                <div className={`${s.note} ${s.noteL} ${s.note1}`}>
                  <p className={s.k}>{model.k}</p>
                  <p className={s.line}>{model.line}</p>
                  <p className={s.claim}>{INDEPENDENCE}</p>
                </div>
              </div>

              <div className={s.slot}>
                <div className={s.slotIn}>
                  <div className={s.cardWrap} aria-hidden={!cardOn}>
                    <Ad name={ADVERTISER.name} text={ADVERTISER.creative} domain={ADVERTISER.domain} className={s.card} />
                  </div>
                  <i className={s.chip} aria-hidden><Tick size={12} /></i>
                </div>
                {stage === "card" && confirmed ? <i className={`${s.token} ${s.dk}`} aria-hidden /> : null}

                <i className={`${s.lead} ${s.leadL} ${s.lead3} ${s.dk}`} aria-hidden />
                <div className={`${s.note} ${s.noteL} ${s.note3}`}>
                  <p className={s.k}>{rules.k}</p>
                  <p className={s.line}>{rules.line}</p>
                  {/* A plain statement of the allowed category: one small ink tick and its name. Not a control. */}
                  <p className={s.mark}><i aria-hidden><Tick size={13} /></i><b>{APP_RULES.allow}</b></p>
                </div>

                <i className={`${s.lead} ${s.leadR} ${s.lead2} ${s.dk}`} aria-hidden />
                <div className={`${s.note} ${s.noteR} ${s.note2}`}>
                  <p className={s.k}>{slot.k}</p>
                  <p className={s.line}>{slot.line}</p>
                </div>

                <i className={`${s.lead} ${s.leadR} ${s.lead4} ${s.dk}`} aria-hidden />
                <div className={`${s.note} ${s.noteR} ${s.note4}`}>
                  <p className={s.k}>{earn.k}</p>
                  <p className={s.line}>{earn.line}</p>
                  {/* The accrual: an ink tab on the leader's end. Words only, never a figure. */}
                  <p ref={tagRef} className={s.tag} aria-hidden={!confirmed}><Tick /><span>{RECEIPT.app.state}</span></p>
                </div>
              </div>

              <div className={s.composer} aria-hidden>
                <i className={s.plus}>
                  <svg viewBox="0 0 14 14" width="12" height="12" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" /></svg>
                </i>
                <span className={s.ask}>Ask a follow up</span>
                <i className={s.send}>
                  <svg viewBox="0 0 14 14" width="14" height="14" fill="none"><path d="M7 12V2.5M2.8 6.4L7 2.2l4.2 4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" /></svg>
                </i>
              </div>
            </div>
          </div>
        </div>
      </figure>
    </div>
  );
}
