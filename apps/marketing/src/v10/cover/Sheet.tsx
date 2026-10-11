"use client";

// The sheet: one moment, followed. A question leaves the field and arrives on the sheet, the app
// answers, and under some answers one labelled card lands. Under others, nothing does.
// Server render, first paint and motion off: the first moment, complete, as a still. With motion
// on that frame is held briefly, then the loop follows whichever of its questions is in clear
// view in the field.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Ad, Split } from "../kit";
import { APP } from "../story";
import { NONE, THREAD } from "./questions";
import s from "./cover.module.css";

type Stage = "first" | "in" | "out";

const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
const Q_STEP = 46;
const A_STEP = 20;
const LEAVE = 560;
const LIFT = 900;
const FIRST_HOLD = 1700;

/** When each part of a moment starts, in ms, and how long the whole moment stays. */
function clock(i: number, lead: number) {
  const m = THREAD[i]!;
  const answer = lead + words(m.q) * Q_STEP + 560;
  const slot = answer + words(m.a) * A_STEP + 700;
  const total = slot + (m.ad ? 1200 + 3800 : 800 + 2600);
  return { lead, answer, slot, total };
}

/** How much of an element can be seen: on screen, and not behind the sheet or the lede. */
function clear(r: DOMRect, covers: DOMRect[]) {
  const vw = window.innerWidth;
  let x0 = Math.max(r.left, 0);
  let x1 = Math.min(r.right, vw);
  for (const c of covers) {
    if (c.bottom <= r.top + 6 || c.top >= r.bottom - 6) continue;
    if (c.left <= x0 && c.right > x0) x0 = Math.min(c.right, x1);
    else if (c.left < x1 && c.left > x0) x1 = c.left;
  }
  return { width: Math.max(0, x1 - x0), startSeen: r.left >= x0 - 2 && r.left < x1 };
}

export default function Sheet() {
  const ref = useRef<HTMLDivElement>(null);
  const from = useRef<HTMLElement | null>(null);
  const gone = useRef<HTMLElement | null>(null);
  const past = useRef<number[]>([0]);
  const [i, setI] = useState(0);
  const [stage, setStage] = useState<Stage>("first");
  const [lead, setLead] = useState(0);
  const [live, setLive] = useState(false);
  const [run, setRun] = useState(0);

  // Live only while motion is on, the tab is visible and the sheet is on screen.
  useEffect(() => {
    const el = ref.current;
    if (!el || document.documentElement.dataset.pxMotion !== "on") return;
    let seen = true;
    let was = true;
    const update = () => {
      const now = seen && document.visibilityState === "visible";
      if (now && !was) setRun((r) => r + 1);
      was = now;
      setLive(now);
    };
    const io = new IntersectionObserver(([e]) => { seen = !!e?.isIntersecting; update(); }, { threshold: 0.2 });
    io.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);

  // The loop.
  useEffect(() => {
    if (!live) return;
    let wait = LEAVE;
    if (stage === "first") wait = FIRST_HOLD;
    else if (stage === "in") wait = clock(i, lead).total;
    const t = window.setTimeout(() => {
      if (stage !== "out") return setStage("out");
      const host = ref.current?.closest("section");
      const covers = host ? Array.from(host.querySelectorAll<HTMLElement>("[data-cover]")).map((e) => e.getBoundingClientRect()) : [];
      // Prefer the question shown longest ago among those in clear view, so the loop keeps
      // moving through all of them; if only recent ones are in view, take the next in order.
      const age = (id: number) => { const n = past.current.lastIndexOf(id); return n < 0 ? 99 : past.current.length - n; };
      let best: HTMLElement | null = null;
      let score = 0;
      host?.querySelectorAll<HTMLElement>("[data-q]").forEach((el) => {
        const id = Number(el.dataset.q);
        if (id === i || age(id) < 5 || el.offsetParent === null) return;
        const r = el.getBoundingClientRect();
        const c = clear(r, covers);
        const n = age(id) * 10000 + c.width + (c.startSeen ? 400 : 0);
        if (c.width > Math.min(r.width * 0.45, 260) && n > score) { score = n; best = el; }
      });
      let next = best ? Number((best as HTMLElement).dataset.q) : -1;
      if (next < 0) { next = 0; for (let k = 0; k < THREAD.length; k++) if (age(k) > age(next)) next = k; }
      past.current = [...past.current, next].slice(-12);
      from.current = best;
      setI(next);
      setLead(best ? LIFT : 0);
      setStage("in");
    }, wait);
    return () => window.clearTimeout(t);
  }, [live, stage, i, lead, run]);

  // The lift: the chosen question lights in the field, a copy of it travels to the sheet and
  // shrinks into place as the sheet's own words rise, and the original leaves the field.
  useEffect(() => {
    if (stage !== "in") return;
    const back = gone.current;
    if (back) { delete back.dataset.lift; gone.current = null; }
    const src = from.current;
    const host = ref.current?.closest("section");
    const q = ref.current?.querySelector<HTMLElement>("[data-sheet-q]");
    from.current = null;
    if (!src || !host || !q) return;
    gone.current = src;
    const hr = host.getBoundingClientRect();
    const sr = src.getBoundingClientRect();
    const qr = q.getBoundingClientRect();
    const size = parseFloat(getComputedStyle(src).fontSize);
    const k = parseFloat(getComputedStyle(q).fontSize) / size;
    const ghost = document.createElement("span");
    ghost.className = s.ghost!;
    ghost.textContent = src.textContent;
    ghost.style.cssText = `left:${sr.left - hr.left}px;top:${sr.top - hr.top}px;font-size:${size}px;line-height:${sr.height}px`;
    host.appendChild(ghost);
    src.dataset.lift = "lit";
    const hide = window.setTimeout(() => { src.dataset.lift = "gone"; }, 380);
    const dx = qr.left - sr.left;
    const dy = qr.top - sr.top - (sr.height * k - parseFloat(getComputedStyle(q).lineHeight)) / 2;
    const fly = ghost.animate(
      [
        { transform: "translate3d(0,0,0) scale(1)", opacity: 0, offset: 0 },
        { transform: "translate3d(0,0,0) scale(1)", opacity: 1, offset: 0.28 },
        { opacity: 1, offset: 0.7 },
        { transform: `translate3d(${dx}px,${dy}px,0) scale(${k})`, opacity: 0, offset: 1 },
      ],
      { duration: LIFT + 260, easing: "cubic-bezier(.65,0,.35,1)", fill: "both" },
    );
    fly.onfinish = () => ghost.remove();
    return () => { window.clearTimeout(hide); fly.cancel(); ghost.remove(); if (src.dataset.lift === "lit") src.dataset.lift = "gone"; };
  }, [stage, i, run]);

  const m = THREAD[i]!;
  const c = clock(i, lead);
  const vars = { "--t-q": `${c.lead}ms`, "--t-a": `${c.answer}ms`, "--t-s": `${c.slot}ms`, "--t-all": `${stage === "first" ? FIRST_HOLD : c.total}ms` } as CSSProperties;

  return (
    <div
      ref={ref}
      className={s.sheet}
      role="img"
      aria-label="Illustration. Someone asks an AI assistant a question in a full sentence and the assistant answers. Below some answers one card labelled Sponsored appears. Below others, nothing appears."
      data-cover=""
      data-stage={stage}
      data-kind={m.ad ? "ad" : "none"}
      data-live={live ? "" : undefined}
      data-paused={!live && stage !== "first" ? "" : undefined}
      style={vars}
    >
      <div key={`${i}-${run}`} className={s.page} aria-hidden>
        <div className={s.bar}>
          <span className={s.app}>{APP.name}</span>
          <span className={s.kind}>{APP.kind}</span>
          <span className={s.clock} />
        </div>
        <div className={s.thread}>
          <div data-sheet-q=""><Split text={m.q} as="p" className={s.q} /></div>
          <Split text={m.a} as="p" className={s.a} />
          <div className={s.slot}>
            {m.ad ? (
              <div className={s.land}>
                <Ad name={m.ad.name} text={m.ad.text} domain={m.ad.domain} size="m" className={s.adM} />
                <Ad name={m.ad.name} text={m.ad.text} size="m" className={s.adN} />
                <Ad name={m.ad.name} text={m.ad.text} domain={m.ad.domain} size="s" className={s.adS} />
              </div>
            ) : (
              <p className={s.none}><i />{NONE}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
