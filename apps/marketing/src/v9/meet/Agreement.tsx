"use client";

// Where they meet, V3: the scene plays before it is touched.
//
// The advertiser's limits slide in from the left and the app's rules from the right; each throws a
// bolt (a solid ink rod with a jaw) that grips the card's edge. The fit settles in from above and
// its dotted line starts to flow. Only when all three hold does the card come into being, and the
// receipt is printed below it in steps. After a beat the scene demonstrates itself once: one bolt
// withdraws, the card falls away, the slip is gone, then it returns. Then the reader has it.
//
// Rules move like machines (fast, exact, a hard stop). The judgment moves like something alive
// (slow, soft, breathing). Each agreement is a native switch (Tab, Space). Any interaction ends
// the autoplay for good. Local state only. Server-rendered complete, agreed, and that is also the
// still shown when motion is off.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ADVERTISER, RECEIPT } from "../story";
import { MEET } from "../copy";
import { Illustration, SponsoredCard, useInView } from "../kit";
import { KEYS, LOCAL, type Key } from "./local";
import s from "./meet.module.css";

type Flags = Record<Key, boolean>;
type Stage = "pre" | "play" | "yours";
const KIND: Record<Key, "rule" | "judgment"> = { adv: "rule", app: "rule", fit: "judgment" };
const ALL: Flags = { adv: true, app: true, fit: true };
const NONE: Flags = { adv: false, app: false, fit: false };
/** The agreement the scene releases once, by itself, to show what it means. */
const DEMO: Key = "adv";
const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

export default function Agreement({ judge, fixed, foot }: { judge: ReactNode; fixed: ReactNode; foot: ReactNode }) {
  const [on, setOn] = useState<Flags>(ALL);
  const [here, setHere] = useState<Flags>(ALL);
  const [stage, setStage] = useState<Stage>("yours");
  const [armed, setArmed] = useState(false);
  const [cue, setCue] = useState(false);
  const [spoken, setSpoken] = useState(false);
  const [ref, seen] = useInView<HTMLDivElement>("0px 0px -32% 0px");
  const timers = useRef<number[]>([]);
  const taken = useRef(false);

  // With motion on, start empty so the three can be seen arriving. Otherwise stay complete.
  useIso(() => {
    if (document.documentElement.dataset.pxMotion === "on") {
      setHere(NONE);
      setStage("pre");
    }
    setArmed(true);
  }, []);

  useEffect(() => {
    if (!seen || taken.current || document.documentElement.dataset.pxMotion !== "on") return;
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    setStage("play");
    at(120, () => setHere((h) => ({ ...h, adv: true })));
    at(420, () => setHere((h) => ({ ...h, app: true })));
    at(820, () => setHere((h) => ({ ...h, fit: true })));
    // One demonstration: a cue on the switch, the release, a hold, the return.
    at(3500, () => setCue(true));
    at(3900, () => setOn((o) => ({ ...o, [DEMO]: false })));
    at(6100, () => setOn((o) => ({ ...o, [DEMO]: true })));
    at(6500, () => setCue(false));
    at(7500, () => setStage("yours"));
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, [seen]);

  /** The reader takes over: the autoplay ends for good and everything is present. */
  const take = () => {
    if (taken.current) return;
    taken.current = true;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setHere(ALL);
    setCue(false);
    setStage("yours");
    setSpoken(true);
  };

  const whole = here.adv && here.app && here.fit;
  const card = whole && on.adv && on.app && on.fit;
  const off = KEYS.filter((k) => !on[k]);
  const yes = (v: boolean) => (v ? "" : undefined);

  return (
    <div ref={ref} className={s.spec} data-armed={yes(armed)} data-stage={stage} data-whole={yes(whole)} data-card={yes(card)} onPointerDown={take} onKeyDown={take} onFocus={take}>
      <div className={s.label}>
        <Illustration />
        <p className={s.hint}>{LOCAL.hint}</p>
      </div>

      {KEYS.map((k, i) => {
        const a = MEET.agree[i]!;
        return (
          <label key={k} className={s.node} data-key={k} data-kind={KIND[k]} data-here={yes(here[k])} data-on={yes(on[k])} data-cue={yes(cue && k === DEMO)}>
            <span className={`v8-h3 ${s.k}`}>{a.k}</span>
            <span id={`meet-${k}-v`} className={s.sr}>{a.v}</span>
            <span className={s.ctl}>
              <input
                type="checkbox"
                role="switch"
                aria-label={a.k}
                aria-describedby={`meet-${k}-v`}
                checked={on[k]}
                onChange={(e) => {
                  take();
                  setOn((p) => ({ ...p, [k]: e.target.checked }));
                }}
              />
              <span className={`v8-sw ${s.sw}`} data-kind={KIND[k] === "judgment" ? "judgment" : undefined} data-on={yes(on[k])} aria-hidden />
              <span className={s.st}>{LOCAL.state[k][on[k] ? 0 : 1]}</span>
            </span>
          </label>
        );
      })}

      {/* The two bolts. On a narrow screen the fit's line also lives here, as the last link of a chain. */}
      {KEYS.map((k) => (
        <i key={k} className={s.link} data-key={k} data-kind={KIND[k]} data-here={yes(here[k])} data-on={yes(on[k])} aria-hidden>
          <b className={s.rod} />
        </i>
      ))}

      <div className={s.mid}>
        <i className={s.link} data-key="fit" data-in="" data-kind="judgment" data-here={yes(here.fit)} data-on={yes(on.fit)} aria-hidden>
          <b className={s.rod} />
        </i>
        <div className={s.slot}>
          <SponsoredCard name={ADVERTISER.name} text={ADVERTISER.creative} domain={ADVERTISER.domain} className={s.card} />
          <div className={s.none} aria-hidden={card}>
            <span className={s.noneH}>{LOCAL.none}</span>
            {off.map((k) => (
              <span key={k}>{LOCAL.reason[k]}</span>
            ))}
          </div>
        </div>
        <i className={s.drop} aria-hidden />
      </div>

      <div className={s.rcpt}>
        <div className={s.slip} aria-hidden={!card}>
          <div className={s.rHead}>
            <span className={s.rTitle}>{RECEIPT.title}</span>
            <p className={s.rConf}>{RECEIPT.confirms}</p>
          </div>
          <i className={s.perf} aria-hidden />
          <dl className={s.sides}>
            {[RECEIPT.advertiser, RECEIPT.app].map((side) => (
              <div key={side.label} className={s.side}>
                <dt>{side.label}</dt>
                <dd className={s.sState}>{side.state}</dd>
              </div>
            ))}
          </dl>
          <div className={s.foot}>{foot}</div>
        </div>
        <p className={s.void} aria-hidden={card}>{LOCAL.noReceipt}</p>
      </div>

      <p className={s.sr} aria-live="polite">
        {spoken ? (card ? LOCAL.agreed : `${LOCAL.none} ${off.map((k) => LOCAL.reason[k]).join(" ")} ${LOCAL.noReceipt}`) : ""}
      </p>

      <p className={s.say} data-k="judge">{judge}</p>
      <p className={s.say} data-k="fixed">{fixed}</p>
    </div>
  );
}
