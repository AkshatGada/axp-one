"use client";

// 00 Cover: the wall. One screen, no pin.
// A tilted wall of AI conversations (illustrative questions) drifts slowly. Every second or two a
// placement clears on one of them: two thin ultramarine lines run in the gutters beside the tile,
// a Sponsored card arrives below its answer, and a small tick confirms it. Nothing is lifted off
// the wall: the wall is the picture.
// The headline, deck and the two actions sit bottom left on clean paper and are readable in the
// first painted frame. The bottom edge is a hairline and the note.
// Motion off: the same composition as a still, with the cards the wall holds at first paint.
import { useEffect, useRef, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { PROMPTS } from "@/hero-lab/data";
import { Action, TextLink, useReduced } from "../kit";
import { COVER } from "../copy";
import s from "./hero.module.css";

const COLS = 7;
const PER = 5;
const DURS = [132, 158, 124, 166, 140, 150, 128];
const DEPTH = [-110, 30, -40, 70, -80, 10, -60];
const LIFT = [-6, 4, -10, 1, -7, 6, -3];
/** Which conversations can receive a card (column-row), and which already hold one at first paint. */
const SLOTS = new Set(["0-1", "0-3", "1-0", "1-2", "1-4", "2-1", "2-3", "3-0", "3-2", "3-4", "4-1", "4-3", "5-0", "5-2", "5-4", "6-1", "6-3"]);
const PLACED = new Set(["0-3", "1-4", "2-1", "3-4", "4-3", "5-0", "6-1"]);
const cols = Array.from({ length: COLS }, (_, c) => Array.from({ length: PER }, (_, r) => PROMPTS[(c * PER + r * 7 + c) % PROMPTS.length]!));

function Tile({ q, c, r }: { q: string; c: number; r: number }) {
  const k = `${c}-${r}`;
  const slot = SLOTS.has(k);
  const rows = 2 + ((c * 2 + r) % 3);
  return (
    <div className={s.tile} data-tile={slot ? "" : undefined} data-on={PLACED.has(k) ? "" : undefined}>
      <div className={s.sheet}>
        <p className={s.q}>{q}</p>
        <div className={s.ans}>
          {Array.from({ length: rows }, (_, n) => <i key={n} style={{ "--w": `${54 + ((c * 17 + r * 29 + n * 23) % 42)}%` } as CSSProperties} />)}
        </div>
      </div>
      {slot ? (
        <div className={s.slot}>
          <div className={s.ad}>
            <span className={s.adTag}>Sponsored</span>
            <i className={s.adLine} />
            <i className={s.adLine2} />
          </div>
          <i className={`${s.pulse} ${s.pl}`} />
          <i className={`${s.pulse} ${s.pr}`} />
          <i className={s.tick} />
        </div>
      ) : null}
    </div>
  );
}

/** The headline as one block of plain text (so it is the largest paint), the accent in ultramarine. */
function Headline() {
  const cut = COVER.h1.endsWith(COVER.accent) ? COVER.h1.length - COVER.accent.length : COVER.h1.length;
  return (
    <h1 id="cover-title" className={`x-h1 ${s.h1}`}>
      {COVER.h1.slice(0, cut)}
      {cut < COVER.h1.length ? <em>{COVER.h1.slice(cut)}</em> : null}
    </h1>
  );
}

export default function Cover() {
  const ref = useRef<HTMLElement>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const reduce = useReduced();

  // The cursor leans the wall a degree or two, on a soft spring.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 36, damping: 18 });
  const smy = useSpring(my, { stiffness: 36, damping: 18 });
  const rotX = useTransform(smy, (m) => 26 - m * 1.8);
  const rotY = useTransform(smx, (m) => 7 + m * 2.6);
  function onMove(e: RPointerEvent<HTMLElement>) {
    if (reduce || e.pointerType !== "mouse") return;
    const b = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - b.left) / b.width) * 2 - 1);
    my.set(((e.clientY - b.top) / b.height) * 2 - 1);
  }

  // The wall's life. Every second or two, one conversation in clear view (away from the headline,
  // the masthead and the foot) receives a card. CSS plays it. Everything stops
  // when the cover is off screen or the tab is hidden.
  useEffect(() => {
    const root = ref.current;
    const wall = wallRef.current;
    if (!root || !wall || reduce) return;
    const tiles = Array.from(wall.querySelectorAll<HTMLElement>("[data-tile]"));
    let onScreen = true;
    let timer = 0;
    const ends = new Set<number>();
    const sync = () => {
      root.dataset.paused = onScreen && !document.hidden ? "" : "1";
    };
    const obs = new IntersectionObserver(([e]) => {
      onScreen = !!e?.isIntersecting;
      sync();
    });
    obs.observe(root);
    document.addEventListener("visibilitychange", sync);
    const near = (b: DOMRect | undefined, x: number, y: number, by: number) => !!b && x > b.left - by && x < b.right + by && y > b.top - by && y < b.bottom + by;
    const clear = () => {
      const view = wall.getBoundingClientRect();
      const vw = window.innerWidth;
      const wide = vw >= 900;
      const copy = wide ? copyRef.current?.getBoundingClientRect() : undefined;
      const picks: HTMLElement[] = [];
      for (const t of tiles) {
        if (t.dataset.run !== undefined || t.dataset.on !== undefined) continue;
        const b = t.getBoundingClientRect();
        const x = b.left + b.width / 2;
        const y = b.bottom - 20;
        if (x < vw * 0.04 || x > vw * 0.97) continue;
        if (y < view.top + (wide ? 150 : 60) || y > view.bottom - (wide ? 110 : 50)) continue;
        if (near(copy, x, y, 120)) continue;
        picks.push(t);
      }
      const t = picks[Math.floor(Math.random() * picks.length)];
      if (!t) return;
      t.dataset.run = "";
      const id = window.setTimeout(() => {
        delete t.dataset.run;
        ends.delete(id);
      }, 11200);
      ends.add(id);
    };
    const tick = () => {
      timer = window.setTimeout(tick, 1300 + Math.random() * 1100);
      if (root.dataset.paused === "1") return;
      clear();
    };
    timer = window.setTimeout(tick, 1500);
    return () => {
      window.clearTimeout(timer);
      ends.forEach((id) => window.clearTimeout(id));
      obs.disconnect();
      document.removeEventListener("visibilitychange", sync);
      for (const t of tiles) delete t.dataset.run;
    };
  }, [reduce]);

  return (
    <section ref={ref} id="top" className={s.cover} aria-labelledby="cover-title" onPointerMove={onMove}>
      <div className={`x-wrap ${s.copy}`}>
        <div ref={copyRef} className={s.copyIn}>
          <Headline />
          <p className={`x-deck ${s.deck}`}>{COVER.deck}</p>
          <div className={s.actions}>
            <Action href={COVER.primary.href}>{COVER.primary.label}</Action>
            <TextLink href={COVER.secondary.href}>{COVER.secondary.label}</TextLink>
          </div>
        </div>
      </div>

      <div className={s.scene}>
        <div ref={wallRef} className={s.view} aria-hidden>
          <div className={s.camIn}>
            <motion.div className={s.plane} style={{ z: -110, rotateX: reduce ? 26 : rotX, rotateY: reduce ? 7 : rotY, rotateZ: -11 }}>
              {cols.map((qs, c) => (
                <div key={c} className={s.col} style={{ transform: `translateZ(${DEPTH[c]}px) translateY(${LIFT[c]}rem)` }}>
                  <div className={s.track} style={{ "--dur": `${DURS[c]}s` } as CSSProperties}>
                    {[...qs, ...qs].map((q, n) => <Tile key={n} q={q} c={c} r={n % PER} />)}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
        <div className={s.fog} aria-hidden />
      </div>

      <div className={`x-wrap ${s.foot}`}>
        <p className={`x-cap ${s.note}`}>{COVER.note}</p>
      </div>
    </section>
  );
}
