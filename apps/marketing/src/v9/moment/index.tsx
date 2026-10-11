"use client";

// Scene A, "The moment" (V3). The scene performs once, then hands over.
// Four nearby questions on one topic sit beside one reply. HarborKey's own card is a single
// persistent object: it is either seated in the reply's slot or held back outside it. For each
// question the deciding words light (blue where HarborKey offers it, grey where it does not),
// the answer writes itself, and the slot resolves: HarborKey's card drops in, another
// advertiser's card slides in while HarborKey's stays out, or the slot stays empty.
// On entering the view it plays through the four questions by itself, rests on the default and
// leaves the control to the reader; any interaction ends the autoplay for good. With motion off
// it is a complete still of the default state. See NOTES.md.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Illustration, Scene, SponsoredCard, useInView } from "../kit";
import { MOMENT } from "../copy";
import { ADVERTISER, MOMENTS, type Moment } from "../story";
import s from "./moment.module.css";

const IDS = ["compare", "mobile", "learn", "bitcoin"] as const;
type Id = (typeof IDS)[number];
const ITEMS = IDS.map((id) => MOMENTS.find((m) => m.id === id)!);

/** Local, shorter visible forms of the frozen questions (copy proposals, see NOTES.md), the words
 *  in each that decide (`ok` where HarborKey declared that capability), and the reason in a few
 *  words. The frozen question and reason are what a screen reader hears. */
const LOCAL: Record<Id, { q: string; lit: { t: string; ok: boolean }[]; why: string }> = {
  compare: { q: "Compare hardware wallets for Ethereum and Solana.", lit: [{ t: "hardware wallets", ok: true }, { t: "Ethereum and Solana", ok: true }], why: "Fits what you offer" },
  mobile: { q: "Best mobile-only wallet for Solana?", lit: [{ t: "mobile-only", ok: false }, { t: "Solana", ok: true }], why: "They ruled out a device" },
  learn: { q: "How does offline key storage work?", lit: [{ t: "How does", ok: false }, { t: "work", ok: false }], why: "Learning, not choosing" },
  bitcoin: { q: "Cheapest hardware wallet for Bitcoin?", lit: [{ t: "hardware wallet", ok: true }, { t: "Bitcoin", ok: false }], why: "Bitcoin not listed" },
};
const BESIDE = "Below the answer";
/** Whose judgment the tag is: the advertiser's own agent. */
const AGENT = `${ADVERTISER.name}'s agent`;

/** The performance: after the entry, each question holds, then the next. Ends on the default. */
const TOUR: Id[] = ["mobile", "learn", "bitcoin", "compare"];
const ENTRY_MS = 1700;
const FIRST_MS = 2400;
const STEP_MS = 1700;
/** The performance only runs while at least this much of the specimen is on screen. */
const IN_VIEW = 0.6;
/** Left alone out of view for this long mid-performance, it settles on the first question. */
const AWAY_MS = 3500;

type Kind = "own" | "other" | "none";
const kindOf = (m: Moment): Kind => (m.placed === ADVERTISER.name ? "own" : m.placed ? "other" : "none");

function marked(id: Id): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = LOCAL[id].q;
  LOCAL[id].lit.forEach((p, k) => {
    const i = rest.indexOf(p.t);
    if (i < 0) return;
    if (i > 0) out.push(rest.slice(0, i));
    out.push(<mark key={k} className={s.mark} data-ok={p.ok ? "" : undefined} style={{ "--k": k } as CSSProperties}>{p.t}</mark>);
    rest = rest.slice(i + p.t.length);
  });
  if (rest) out.push(rest);
  return out;
}

export default function TheMoment() {
  const [value, setValue] = useState<Id>("compare");
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState(false);
  const [auto, setAuto] = useState(false);
  const [paused, setPaused] = useState(false);
  const [ref, seen] = useInView<HTMLDivElement>();
  const stopped = useRef(false);
  const current = ITEMS.find((m) => m.id === value)!;
  const kind = kindOf(current);

  useEffect(() => {
    if (!seen || document.documentElement.dataset.pxMotion !== "on") return;
    const doneId = window.setTimeout(() => setDone(true), ENTRY_MS);
    const el = ref.current;
    if (stopped.current || !el) return () => window.clearTimeout(doneId);

    // The performance runs on its own clock, which only advances while most of the specimen is
    // on screen and the tab is visible. It always ends at rest on the first question.
    let visible = false;
    let elapsed = 0;
    let away = 0;
    let step = 0;
    let last = performance.now();
    let tick = 0;
    const io = new IntersectionObserver(([e]) => { visible = (e?.intersectionRatio ?? 0) >= IN_VIEW; }, { threshold: [0, 0.2, 0.4, IN_VIEW, 0.8, 1] });
    io.observe(el);
    const end = () => {
      window.clearInterval(tick);
      io.disconnect();
      setAuto(false);
      setPaused(false);
    };
    setAuto(true);
    tick = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(250, now - last);
      last = now;
      if (stopped.current) return end();
      const active = visible && !document.hidden;
      setPaused(!active);
      if (!active) {
        away += dt;
        if (step > 0 && away > AWAY_MS) {
          setValue("compare");
          end();
        }
        return;
      }
      away = 0;
      elapsed += dt;
      while (step < TOUR.length && elapsed >= FIRST_MS + step * STEP_MS) setValue(TOUR[step++]!);
      if (step >= TOUR.length) end();
    }, 100);
    return () => {
      window.clearTimeout(doneId);
      window.clearInterval(tick);
      io.disconnect();
    };
  }, [seen, ref]);

  /** A choice, a key press or keyboard focus ends the performance for good. Touching the
   *  specimen to scroll does not. */
  function stop() {
    if (stopped.current) return;
    stopped.current = true;
    setAuto(false);
    setPaused(false);
  }

  return (
    <Scene id="moment" labelledBy="moment-q">
      <div className={s.comp}>
        <header className={s.head}>
          <p className="v8-who">{MOMENT.who}</p>
          <h2 id="moment-q" className={`v8-q ${s.q}`}>{MOMENT.question}</h2>
          <p className={`v8-lede ${s.lede}`}>{MOMENT.lede}</p>
        </header>

        <div
          ref={ref}
          className={s.root}
          data-in={seen ? (done ? "done" : "") : undefined}
          data-auto={auto ? "" : undefined}
          data-paused={auto && paused ? "" : undefined}
          style={{ "--hold": `${value === "compare" ? FIRST_MS : STEP_MS}ms` } as CSSProperties}
          onKeyDown={stop}
          onFocus={stop}
        >
          <p id="moment-hint" className={s.hint}>{MOMENT.hint}</p>
          <Illustration className={s.illus} />

          <div className={s.opts} role="radiogroup" aria-labelledby="moment-hint">
            {ITEMS.map((m, i) => (
              <label key={m.id} className={s.opt} style={{ "--i": i } as CSSProperties}>
                <input
                  type="radio"
                  name="moment-question"
                  value={m.id}
                  checked={m.id === value}
                  onChange={() => {
                    stop();
                    setValue(m.id as Id);
                    setTouched(true);
                  }}
                />
                <span className={s.bubble}>
                  <span className={s.bq}>{marked(m.id as Id)}</span>
                  <span className={s.out} data-kind={kindOf(m)}>
                    <i className={s.glyph} aria-hidden />
                    <span className={s.vh}>{BESIDE}: {m.placed ?? MOMENT.noAd}</span>
                  </span>
                </span>
              </label>
            ))}
          </div>

          {/* The reply: the app's answer and its one slot. HarborKey's card is always present:
              seated in the slot, or held back outside it. */}
          <div className={s.reply} data-kind={kind}>
            <div className={s.tile}>
              <div key={value} className={s.ans} aria-hidden>{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ "--n": i } as CSSProperties} />)}</div>
              <div className={s.well}>
                {ITEMS.filter((m) => kindOf(m) === "other").map((m) => (
                  <div key={m.id} className={s.other} data-on={m.id === value ? "" : undefined} aria-hidden={m.id === value ? undefined : true}>
                    <div className={s.otherHead}>
                      <span className={s.otherTag}>Sponsored</span>
                      <span className={s.otherName}>{m.placed}</span>
                    </div>
                    <div className={s.otherLines} aria-hidden><i /><i /><i /></div>
                  </div>
                ))}
                <p className={s.empty} data-on={kind === "none" ? "" : undefined} aria-hidden={kind === "none" ? undefined : true}>{MOMENT.noAd}</p>
                <div className={s.mine} data-seated={kind === "own" ? "" : undefined}>
                  <SponsoredCard className={s.card} name={ADVERTISER.name} text={ADVERTISER.creative} />
                  {/* The judgment, and whose it is. It travels with the card. */}
                  <span className={s.tag}>
                    <i className="v8-sw" data-kind="judgment" data-on={kind === "own" ? "" : undefined} aria-hidden />
                    <span className={s.tagText}>
                      <span className={s.agent}>{AGENT}</span>
                      <span key={value} className={s.why}>{LOCAL[value].why}</span>
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Announced only after the reader changes the question, in the story's full words. */}
        <p className={s.vh} aria-live="polite">
          {touched ? `${current.question} ${BESIDE}: ${current.placed ? `${current.placed}, Sponsored.` : MOMENT.noAd} ${current.reason}` : ""}
        </p>
      </div>
    </Scene>
  );
}
