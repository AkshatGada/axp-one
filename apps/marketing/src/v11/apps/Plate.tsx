"use client";

// The plate for movement 04: Tidewater (a fictional assistant) shown whole and at rest, with the
// builder's two controls. The answer is one element that never changes: the slot below it keeps
// its place whether it holds the Sponsored card or nothing, so the answer cannot move.
//
// Stages: "still" is the server render and the motion-off page (complete, card shown).
// With motion armed: "pre" (waiting to be seen) > "write" (the answer writes in) > "card" (the card
// arrives, is confirmed, the accrual lands, then the empty slot is demonstrated once) > "done"
// (the reader has control). Any click or key press jumps to "done" for good.
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Ad, Fig, Split, useInView } from "../kit";
import { ADVERTISER, ANSWER, APP, APP_RULES, INDEPENDENCE, QUESTION, RECEIPT } from "../story";
import { APPS } from "../copy";
import s from "./apps.module.css";

type Stage = "still" | "pre" | "write" | "card" | "done";

const NOT_ALLOWED = "Not allowed. Nothing is shown.";
const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);

// The performance, in milliseconds from the moment the plate is seen.
const T = { write: 0, card: 1400, demoOff: 4700, demoOn: 6900, done: 8700, confirm: 640 };

function Latch({ kind, on, onToggle, name, label, state }: { kind: "rule" | "judgment"; on: boolean; onToggle: () => void; name: string; label: string; state?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={name} className={s.latch} data-latch="" onClick={onToggle}>
      <span className={s.sw}>
        <span className="x-sw" data-on={on ? "" : undefined} data-kind={kind === "judgment" ? "judgment" : undefined} aria-hidden />
      </span>
      <span className={s.latchText} aria-hidden>
        <span className={s.latchLabel}>{label}</span>
        {state ? <span className={s.latchState}>{state}</span> : null}
      </span>
    </button>
  );
}

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
  const [allowed, setAllowed] = useState(true);
  const [fits, setFits] = useState(true);
  const [confirmed, setConfirmed] = useState(true);
  const [burst, setBurst] = useState(0);
  const [same, setSame] = useState(false);
  const [reason, setReason] = useState<string>(APPS.empty);
  const [say, setSay] = useState("");
  const [hint, setHint] = useState(false);
  const [entered, setEntered] = useState(false);

  const motion = useRef(false);
  const timers = useRef<number[]>([]);
  const enteredRef = useRef(false);
  const auto = useRef(false);      // the slot is empty because the performance emptied it
  const running = useRef(false);   // the performance owns the plate
  const skip = useRef(false);      // the next confirmation is already on the plate: no ceremony
  const sameTimer = useRef(0);

  const live = stage === "card" || stage === "done";
  const active = live || stage === "still";
  const cardOn = allowed && fits && active;

  const clear = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; };
  const jump = useCallback(() => { setInstant(true); window.setTimeout(() => setInstant(false), 120); }, []);

  // The quiet mark: each time the slot changes, the answer is shown to be unchanged.
  const flash = useCallback(() => {
    window.clearTimeout(sameTimer.current);
    setSame(true);
    sameTimer.current = window.setTimeout(() => setSame(false), 2400);
  }, []);
  useEffect(() => () => window.clearTimeout(sameTimer.current), []);

  // How much of the plate is on screen, and whether it has been scrolled past.
  const measure = () => {
    const el = ref.current;
    if (!el) return { ratio: 0, above: false };
    const r = el.getBoundingClientRect();
    const shown = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
    return { ratio: Math.max(0, shown) / Math.max(1, r.height), above: r.top < -40 };
  };

  // Enter: perform once. `abrupt` means the reader landed on the plate all at once (an anchor
  // link, a flick, coming back up from below): then the plate is whole at once, in the same frame,
  // the writing is skipped, and only the empty slot is demonstrated.
  const enter = useCallback((abrupt: boolean, sync = true) => {
    if (enteredRef.current) return;
    enteredRef.current = true;
    running.current = true;
    const at = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };
    let t0 = 0;
    if (abrupt) {
      const whole = () => { setInstant(true); skip.current = true; setConfirmed(true); setStage("card"); setEntered(true); };
      if (sync) flushSync(whole); else whole();
      window.setTimeout(() => setInstant(false), 120);
      t0 = T.card + 400;
    } else {
      setEntered(true);
      at(T.write, () => setStage("write"));
      at(T.card, () => setStage("card"));
    }
    at(T.demoOff - t0, () => { auto.current = true; setReason(APPS.empty); setFits(false); flash(); });
    at(T.demoOn - t0, () => { auto.current = false; setFits(true); flash(); });
    at(T.done - t0, () => { running.current = false; setStage("done"); setHint(true); });
  }, [flash]);

  // Arm, only when the visitor allows motion. The server render is the whole plate; it is only
  // cleared for the performance while it is still off screen, so nothing ever flashes empty.
  useEffect(() => {
    motion.current = document.documentElement.dataset.pxMotion === "on";
    if (!motion.current) return;
    const first = measure();
    const reset = () => { clear(); enteredRef.current = false; running.current = false; };
    if (first.ratio >= 0.2 || first.above) { enter(true, false); return reset; }
    setConfirmed(false);
    setStage("pre");
    // The plate has entered when a good quarter of it is on screen. A scroll crosses that line
    // gently; a jump lands well past it in one step. Checked on scroll (before the frame paints).
    const check = () => {
      if (enteredRef.current) return;
      const m = measure();
      if (m.ratio < 0.28 && !m.above) return;
      enter(m.above || m.ratio > 0.62);
    };
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

  // Any click or key press hands the plate to the reader, for good.
  useEffect(() => {
    if (!entered || stage === "still" || stage === "done") return;
    const root = ref.current?.closest("section") ?? null;
    const stop = (e: Event) => {
      const target = e.target as Element | null;
      const inside = !!(target && root && root.contains(target));
      if (e.type === "pointerdown" && !inside) return;
      if (e.type === "keydown") {
        const k = e as KeyboardEvent;
        if (k.metaKey || k.ctrlKey || k.altKey) return;
        if (!inside && SCROLL_KEYS.has(k.key)) return; // scrolling by keyboard is not an interaction with the plate
      }
      clear();
      running.current = false;
      if (auto.current && !(target && target.closest?.("[data-latch]"))) setFits(true);
      auto.current = false;
      if (stage !== "card") { jump(); skip.current = true; setConfirmed(true); }
      setStage("done");
    };
    window.addEventListener("pointerdown", stop, true);
    window.addEventListener("keydown", stop, true);
    return () => { window.removeEventListener("pointerdown", stop, true); window.removeEventListener("keydown", stop, true); };
  }, [entered, stage, ref, jump]);

  // Confirmation follows the card; the accrual follows the confirmation.
  useEffect(() => {
    if (!active) return;
    if (!cardOn) { skip.current = false; setConfirmed(false); return; }
    if (!motion.current || skip.current) { skip.current = false; setConfirmed(true); return; }
    const t = window.setTimeout(() => { setConfirmed(true); setBurst((n) => n + 1); }, T.confirm);
    return () => window.clearTimeout(t);
  }, [cardOn, active]);

  const change = (nextAllowed: boolean, nextFits: boolean) => {
    const was = allowed && fits;
    const now = nextAllowed && nextFits;
    const why = !nextAllowed ? NOT_ALLOWED : APPS.empty;
    if (!now) setReason(why);
    if (was !== now) flash();
    setAllowed(nextAllowed);
    setFits(nextFits);
    setSay(`${now ? "One Sponsored card is shown below the answer." : why} The answer is unchanged.`);
  };
  const toggleAllowed = () => change(!allowed, fits);
  const toggleFits = () => change(allowed, !fits);

  const [model, slot, rules, earn] = APPS.points;

  return (
    <div className={s.figWrap}>
      <Fig no="4" caption={`${APP.name}, a fictional assistant`} className={s.fig}>
        <div className={s.stage} data-stage={stage} data-card={cardOn ? "on" : "off"} data-confirmed={confirmed ? "" : undefined} data-instant={instant ? "" : undefined} data-same={same ? "" : undefined} data-hint={hint ? "" : undefined}>
          {/* The sheet itself (its material and depth). The plate's parts are laid over it. */}
          <div ref={ref} className={s.sheet} aria-hidden />
          <div className={s.plate}>
            <div className={s.bar}>
              <span className={s.brand}><i className={s.tide} aria-hidden />{APP.name}</span>
              <span className={s.barRight} aria-hidden>
                <span className={s.ghost}>
                  <svg viewBox="0 0 14 14" width="12" height="12" fill="none"><path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" /></svg>
                  New question
                </span>
                <i className={s.me}><i /></i>
              </span>
              <i className={s.tideLine} aria-hidden />
            </div>

            <div className={s.col}>
              <p className={s.q}><span className={s.sr}>The question: </span>{QUESTION}</p>

              <div className={s.a}>
                <p className={s.aLabel}>
                  <i className={s.tide} data-s="" aria-hidden />{APP.name}
                  <span className={s.same} aria-hidden><i />Unchanged</span>
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
                  <i className={s.ticks} aria-hidden><b /><b /><b /><b /></i>
                  <p className={s.reason} aria-hidden={cardOn}>{reason}</p>
                  <div className={s.cardWrap} aria-hidden={!cardOn}>
                    <Ad name={ADVERTISER.name} text={ADVERTISER.creative} domain={ADVERTISER.domain} className={s.card} />
                  </div>
                  <i className={s.chip} aria-hidden><Tick size={12} /></i>
                </div>
                {burst > 0 ? <i key={burst} className={`${s.token} ${s.dk}`} aria-hidden /> : null}

                <i className={`${s.lead} ${s.leadL} ${s.lead3} ${s.dk}`} aria-hidden />
                <div className={`${s.note} ${s.noteL} ${s.note3}`}>
                  <p className={s.k}>{rules.k}</p>
                  <p className={s.line}>{rules.line}</p>
                  <Latch kind="rule" on={allowed} onToggle={toggleAllowed} name={`Allow ${APP_RULES.allow.toLowerCase()}`} label={APP_RULES.allow} state={allowed ? "Allowed" : "Not allowed"} />
                </div>

                <i className={`${s.lead} ${s.leadR} ${s.lead2} ${s.dk}`} aria-hidden />
                <div className={`${s.note} ${s.noteR} ${s.note2}`}>
                  <p className={s.k}>{slot.k}</p>
                  <p className={s.line}>{slot.line}</p>
                  <Latch kind="judgment" on={fits} onToggle={toggleFits} name="An ad fits this question" label={fits ? "An ad fits" : "No ad fits"} />
                </div>

                <i className={`${s.lead} ${s.leadR} ${s.lead4} ${s.dk}`} aria-hidden />
                <div className={`${s.note} ${s.noteR} ${s.note4}`}>
                  <p className={s.k}>{earn.k}</p>
                  <p className={s.line}>{earn.line}</p>
                  {/* The accrual: an ink tab on the leader's end. Words only, never a figure. */}
                  <p className={s.tag} aria-hidden={!confirmed}><Tick /><span>{RECEIPT.app.state}</span></p>
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
      </Fig>

      <p className={s.sr} role="status" aria-live="polite">{say}</p>
    </div>
  );
}
