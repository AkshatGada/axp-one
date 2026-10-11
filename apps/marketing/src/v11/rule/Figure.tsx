"use client";

// The figure: one Sponsored card that exists only while three things hold. Two are rules (square
// ink latches that snap) and one is a judgment (round, it settles). Release any one and the card
// ceases to exist, and so does its receipt. Controls change only this illustration's local state.
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Ad, Arrow, Fig, useInView } from "../kit";
import { PROOF, RULE } from "../copy";
import { ADVERTISER, RECEIPT } from "../story";
import s from "./rule.module.css";

type Kind = "rule" | "judgment";
const ALL = RULE.agree.map(() => true);
const NONE = RULE.agree.map(() => false);
const FIT = RULE.agree.findIndex((a) => a.kind === "judgment");

export default function Figure() {
  const [ref, seen] = useInView<HTMLDivElement>(0.4);
  const [held, setHeld] = useState<boolean[]>(ALL);
  const [cause, setCause] = useState<Kind>("judgment");
  const [said, setSaid] = useState("");
  const [instant, setInstant] = useState(false); // made whole without a performance: no transitions
  const armed = useRef(false); // the full entry performance is still to come
  const begun = useRef(false); // the performance has started
  const stopped = useRef(false); // the reader has taken over (or motion is off): for good
  const fresh = useRef(false); // the reader's first toggle interrupts a performance
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  // Before first sight (and only when motion is allowed and the figure is still below the screen)
  // the three are released, so the reader can watch them come to hold the card.
  useEffect(() => {
    if (document.documentElement.dataset.pxMotion !== "on") {
      stopped.current = true;
      return;
    }
    const el = ref.current;
    if (!el || el.getBoundingClientRect().top <= window.innerHeight * 0.8) return;
    armed.current = true;
    setCause("rule");
    setHeld(NONE);
    // If the reader jumps clean past the figure, it is whole when they come back up to it.
    const passed = () => {
      if (!armed.current || begun.current) return window.removeEventListener("scroll", passed);
      if (el.getBoundingClientRect().bottom < 0) {
        armed.current = false;
        setInstant(true);
        setHeld(ALL);
        window.removeEventListener("scroll", passed);
      }
    };
    window.addEventListener("scroll", passed, { passive: true });
    return () => window.removeEventListener("scroll", passed);
  }, [ref]);

  useEffect(() => {
    if (!seen || stopped.current) return;
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    let t = 0;
    // Passed by, or reached from below: no performance to catch up on. The figure is simply whole.
    const el = ref.current;
    if (armed.current && el && el.getBoundingClientRect().top < -40) {
      armed.current = false;
      stopped.current = true;
      setInstant(true);
      setHeld(ALL);
      return;
    }
    begun.current = true;
    if (armed.current) {
      RULE.agree.forEach((a, i) => {
        t += i === 0 ? 260 : 340;
        at(t, () => {
          setCause(a.kind);
          setHeld((h) => h.map((v, j) => (j <= i ? true : v)));
        });
      });
    }
    // One release, on its own, after a beat. Then it returns and the reader has the controls.
    at((t += 3400), () => {
      setCause("judgment");
      setHeld((h) => h.map((v, j) => (j === FIT ? false : v)));
    });
    at((t += 2300), () => {
      setCause("judgment");
      setHeld(ALL);
      stopped.current = true;
    });
    return clear;
  }, [seen, ref]);

  /** The reader touched the figure: the performance ends for good. */
  const halt = useCallback((restore: boolean) => {
    setInstant(false);
    if (stopped.current) return;
    stopped.current = true;
    clear();
    if (restore) {
      setCause("rule");
      setHeld(ALL);
    } else fresh.current = true;
  }, []);

  const onSwitch = (target: EventTarget) => target instanceof Element && !!target.closest('[role="switch"]');
  const onPointerDown = (e: PointerEvent) => halt(!onSwitch(e.target));
  const onKeyDown = (e: KeyboardEvent) => halt(!(onSwitch(e.target) && (e.key === " " || e.key === "Enter")));

  const toggle = (i: number) => {
    const interrupting = fresh.current || !stopped.current;
    stopped.current = true;
    fresh.current = false;
    clear();
    const a = RULE.agree[i];
    if (!a) return;
    setInstant(false);
    const next = held.map((v, j) => (j === i ? !v : interrupting ? true : v));
    setCause(a.kind);
    setHeld(next);
    setSaid(`${a.k}: ${next[i] ? a.on : a.off}. ${next.every(Boolean) ? RECEIPT.confirms : RULE.none}`);
  };

  const card = held.every(Boolean);

  return (
    <div className={`x-wrap ${s.figure}`} ref={ref} onPointerDownCapture={onPointerDown} onKeyDownCapture={onKeyDown} onFocusCapture={() => halt(true)}>
      <Fig className={s.fig}>
        <div className={s.board} data-card={card ? "on" : "off"} data-cause={cause} data-instant={instant ? "" : undefined}>
          <div className={s.holds}>
            {RULE.agree.map((a, i) => {
              const on = !!held[i];
              return (
                <button key={a.k} type="button" role="switch" aria-checked={on} className={s.hold} data-kind={a.kind} data-on={on ? "" : undefined} onClick={() => toggle(i)}>
                  <span className={s.holdText}>
                    <span className={s.holdK}>{a.k}</span>
                    <span className={s.holdState}>{on ? a.on : a.off}</span>
                  </span>
                  <span className={s.track} aria-hidden><span className={s.bolt} /></span>
                </button>
              );
            })}
          </div>

          <div className={s.slot}>
            <div className={s.cardBox} aria-hidden={!card}>
              <Ad name={ADVERTISER.name} text={ADVERTISER.creative} domain={ADVERTISER.domain} size="l" className={s.ad} />
            </div>
          </div>

          <div className={s.receiptSlot}>
            <p className={s.none} aria-hidden={card}>{RULE.none}</p>
            <div className={s.receipt} aria-hidden={!card} inert={!card}>
              <div className={s.rHead}>
                <p className={s.rTitle}>{RECEIPT.title}</p>
                <p className={s.rConfirms}>{RECEIPT.confirms}</p>
                {PROOF.href ? (
                  <a className={s.proof} href={PROOF.href} target="_blank" rel="noopener noreferrer">
                    <span className={s.proofText}>{PROOF.text}<Arrow width={20} /></span>
                    <span className={s.proofLabel}>{PROOF.label}</span>
                  </a>
                ) : null}
              </div>
              <div className={s.rSides}>
                {[RECEIPT.advertiser, RECEIPT.app].map((side) => (
                  <div key={side.label} className={s.rSide}>
                    <p className={s.rLabel}>{side.label}</p>
                    <p className={s.rState}><i aria-hidden />{side.state}</p>
                  </div>
                ))}
              </div>
              <div className={s.rFoot}>
                <p>{RECEIPT.later}</p>
                <p>{RECEIPT.limit}</p>
              </div>
            </div>
          </div>
        </div>
      </Fig>
      <p className={s.sr} role="status" aria-live="polite">{said}</p>
    </div>
  );
}
