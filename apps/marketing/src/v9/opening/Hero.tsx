"use client";

// The opening: the wall, then the camera dives into one tile and it opens into six plates.
// A tilted wall of AI conversation tiles (illustrative questions) drifts; about once a second
// something clears on it (ultramarine pulses, a Sponsored fill, a Delivered tick; now and then a
// question that takes no ad). One tile, the placement the page follows, floats off the wall and
// plays its own story once.
//
// Pinned scroll (>= 900px, motion on), 240vh in all. Progress u over the 140vh of travel:
//   0.00 to 0.10  the headline lifts away;
//   0.02 to 0.40  the camera dollies into the wall (it dims from 0.20); the tile flattens, travels
//                 to the centre and lands at exactly 1x, on whole pixels, as a 2D, unpromoted layer;
//   0.43 to 0.56  the tile lies down as a plate; the line arrives;
//   0.535 to 0.57 hand-over to the collapsed stack of six plates (same place, same size);
//   0.56 to 0.86  the stack opens along the route, plate after plate; a short hold.
// Then, with no pin (exit progress e, the stage scrolling away): the plates gather back into one
// deck that rides down to the edge of the next scene, so the reader arrives there with one card.
//
// Crispness: the plates and the landed tile are never promoted (no will-change, no 3D at rest),
// sit on whole pixels and never scale above 1, so their text is painted live at screen resolution.
// Motion off: the still hero, then the still open stack. Below 900px: the copy, a band of the wall
// with the tile resting on it, then the six plates upright on the route.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { ActionPrimary, ActionText, Words } from "@axp/design-system/prospectus";
import { ADVERTISER_URL, PUBLISHER_URL } from "@/data/copy";
import { PROMPTS } from "@/hero-lab/data";
import useReduced, { usePinned } from "@/motion/useReduced";
import { IDENTITY, io, lerp, mixM, mul, out, seg } from "@/motion/motion";
import { HERO, STACK } from "../copy";
import { ADVERTISER, PLACEMENT } from "../story";
import { useInView } from "../kit/useInView";
import { FlatStack, PH, PLATE_IDS, PLATE_M7, PW, Plate, StillStack, plateCss, plateMatrix, plateY, stackSize } from "./Plates";
import s from "./hero.module.css";

/** The pinned timeline, in u (0 to 1 over the pin's travel). */
const T = {
  dive: [0.02, 0.4],
  lie: [0.43, 0.56],
  line: [0.44, 0.54],
  swap: [0.535, 0.57],
  open: [0.56, 0.86],
} as const;
/** A settle with a breath of overshoot (about 2%), for the plates. */
const settle = (t: number) => 1 + 1.8 * Math.pow(t - 1, 3) + 0.8 * Math.pow(t - 1, 2);

const COLS = 7;
const PER = 5;
const DURS = [96, 118, 88, 124, 104, 112, 92];
const DEPTH = [-110, 30, -40, 70, -80, 10, -60];
const LIFT = [-6, 4, -10, 1, -7, 6, -3];
const PREFILLED = new Set(["0-3", "1-1", "2-4", "3-0", "4-2", "5-3", "2-1", "6-0", "6-3"]);
const cols = Array.from({ length: COLS }, (_, c) => Array.from({ length: PER }, (_, r) => PROMPTS[(c * PER + r * 7 + c) % PROMPTS.length]!));
const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

function Tile({ q, filled, n }: { q: string; filled: boolean; n: number }) {
  const w = (k: number) => ({ "--w": `${52 + ((n * 17 + k * 23) % 44)}%` }) as CSSProperties;
  const rows = 2 + (n % 3);
  return (
    <div className={s.tile} data-tile="" data-filled={filled ? "1" : undefined}>
      <p className={s.q}>{q}</p>
      <div className={s.ans}>
        {Array.from({ length: rows }, (_, k) => <i key={k} style={w(k + 1)} />)}
      </div>
      <div className={s.slot}>
        <span className={s.slotEmpty}>Sponsored</span>
        <div className={s.ad}>
          <span className={s.adTag}>Sponsored</span>
          <i className={s.adLine} />
          <i className={s.adLine2} />
        </div>
        <i className={`${s.pulse} ${s.pl}`} />
        <i className={`${s.pulse} ${s.pr}`} />
        <i className={`${s.pulse} ${s.pb}`} />
        <span className={s.settle}>{HERO.delivered}</span>
      </div>
    </div>
  );
}

type MV = MotionValue<number> | number;

export function Wall({ plane, cam, opacity, wallRef }: { plane: { x: MV; y: MV; z: MV }; cam?: { z: MV; y: MV }; opacity?: MV; wallRef?: React.RefObject<HTMLDivElement | null> }) {
  return (
    <motion.div ref={wallRef} className={s.view} style={{ opacity: opacity ?? 1 }} aria-hidden>
      <div className={s.camIn}>
        <motion.div className={s.cam} style={{ z: cam?.z ?? 0, y: cam?.y ?? 0 }}>
          <motion.div className={s.plane} style={{ z: -170, rotateX: plane.x, rotateY: plane.y, rotateZ: plane.z }}>
            {cols.map((qs, c) => (
              <div key={c} className={s.col} style={{ transform: `translateZ(${DEPTH[c]}px) translateY(${LIFT[c]}rem)` }}>
                <div className={s.track} style={{ "--dur": `${DURS[c]}s` } as CSSProperties}>
                  {[...qs, ...qs].map((q, n) => (
                    <Tile key={n} q={q} n={c * 11 + n} filled={PREFILLED.has(`${c}-${n % qs.length}`)} />
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

/** The placement the page follows: the question, the app's own answer, one labelled card. */
function FocalTile() {
  return (
    <div className={s.chat}>
      <div className={s.chatBar}>
        <span className={s.chatApp}>{HERO.appName}</span>
        <span className={s.chatSlot}>{HERO.slotLine}</span>
      </div>
      <div className={s.chatBody}>
        <p className={s.chatQ}>{PLACEMENT.moment.question}</p>
        <div className={s.chatA}>
          <span className={s.chatWho}>{HERO.answerLabel}</span>
          <p className={s.chatText}>{PLACEMENT.answer}</p>
        </div>
        <span className={s.chatGap}>{HERO.gap}</span>
        <div className={s.fSlot}>
          <div className={s.fWait}>Sponsored</div>
          <div className={s.card}>
            <div className={s.cardHead}>
              <span className={s.cardLabel}>Sponsored</span>
              <span className={s.cardName}>{ADVERTISER.name}</span>
            </div>
            <p className={s.cardText}>{ADVERTISER.creative}</p>
          </div>
          <i className={`${s.fPulse} ${s.fpl}`} />
          <i className={`${s.fPulse} ${s.fpr}`} />
          <i className={`${s.fPulse} ${s.fpb}`} />
          <span className={s.fSettle}>{HERO.delivered}</span>
        </div>
      </div>
    </div>
  );
}

type Geo = { ox: number; oy: number; vw: number; vh: number; w: number; h: number; hx: number; hy: number; k0: number; k1: number; cx: number; cy: number; sx: number; sy: number; ks: number };

const r = (n: number) => Math.round(n);
const N = PLATE_IDS.length;

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const homeRef = useRef<HTMLDivElement>(null);
  const focalRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const routeRef = useRef<HTMLElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const plateRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hold = useRef(false);
  const visible = useRef(true);
  const bob = useRef(0);
  const geo = useRef<Geo | null>(null);
  const pinned = usePinned();
  const reduce = useReduced();
  const pinnedRef = useRef(false);
  pinnedRef.current = pinned;
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const { scrollYProgress: exit } = useScroll({ target: ref, offset: ["end end", "end start"] });

  // Cursor parallax: a few springy degrees, fading as the plane straightens.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 46, damping: 17 });
  const smy = useSpring(my, { stiffness: 46, damping: 17 });
  function onMove(e: RPointerEvent<HTMLDivElement>) {
    if (reduce || e.pointerType !== "mouse") return;
    const b = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - b.left) / b.width) * 2 - 1);
    my.set(((e.clientY - b.top) / b.height) * 2 - 1);
  }

  const flat = useTransform(p, (v) => io(seg(v, 0, 0.42)));
  const rotX = useTransform([flat, smy] as MotionValue<number>[], ([f, m]: number[]) => 26 * (1 - f!) - m! * 3.2 * (1 - f!));
  const rotY = useTransform([flat, smx] as MotionValue<number>[], ([f, m]: number[]) => 7 * (1 - f!) + m! * 4.6 * (1 - f!));
  const rotZ = useTransform(flat, (f) => -11 * (1 - f));
  const camZ = useTransform(p, (v) => 900 * io(seg(v, T.dive[0], 0.43)));
  const camY = useTransform(p, (v) => -80 * out(seg(v, 0, 0.38)));
  const wallO = useTransform(p, (v) => 1 - io(seg(v, 0.2, 0.44)));
  const copyY = useTransform(p, (v) => -120 * out(seg(v, 0, 0.14)));
  const copyO = useTransform(p, (v) => 1 - seg(v, 0.01, 0.09));
  const fogO = useTransform(p, (v) => 1 - 0.92 * seg(v, 0.03, 0.18));
  const noteO = useTransform(p, (v) => 1 - seg(v, 0.01, 0.07));
  const liftO = useTransform(p, (v) => 1 - seg(v, 0.01, 0.12));

  // The tile's own load story (CSS) is over after about 3.4s; then its children drop it.
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (focalRef.current) focalRef.current.dataset.intro = "done";
    }, 3600);
    return () => window.clearTimeout(id);
  }, []);

  // Geometry: where the tile rests, where it lands, where the stack sits and at what scale.
  useIso(() => {
    if (!pinned) return;
    const measure = () => {
      const stage = stageRef.current;
      const home = homeRef.current;
      const focal = focalRef.current;
      if (!stage || !home || !focal) return;
      const vw = stage.clientWidth;
      const vh = stage.clientHeight;
      const w = focal.offsetWidth;
      const h = focal.offsetHeight;
      // The tile's exact (possibly fractional) layout origin, so the landed pose sits on whole pixels.
      const prev = focal.style.transform;
      focal.style.transform = "none";
      const fr = focal.getBoundingClientRect();
      const sr = stage.getBoundingClientRect();
      focal.style.transform = prev;
      const unit = stackSize(1);
      const ks = Math.min(1, (vh - 104) / unit.h, (vw * 0.56) / unit.w);
      const k0 = home.offsetWidth / w;
      geo.current = {
        ox: fr.left - sr.left,
        oy: fr.top - sr.top,
        vw,
        vh,
        w,
        h,
        hx: home.offsetLeft + home.offsetWidth / 2,
        hy: home.offsetTop + (h * k0) / 2,
        k0,
        k1: Math.min(1, (vh - 120) / h),
        cx: r(vw / 2),
        cy: r(vh / 2),
        sx: r(vw * 0.66),
        sy: r(vh / 2 + 6),
        ks,
      };
      apply();
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned]);

  function apply() {
    const g = geo.current;
    const focal = focalRef.current;
    if (!g || !focal || !pinnedRef.current) return;
    const v = p.get();
    const e = exit.get();
    // 1. The tile: from its floating pose off the wall to the centre at 1x.
    const m = io(seg(v, T.dive[0], T.dive[1]));
    const lie = io(seg(v, T.lie[0], T.lie[1]));
    if (v < T.swap[1]) {
      let t: string;
      if (m < 1) {
        // In flight: a real 3D pose (composited while moving, no will-change, so it re-rasters).
        const k = lerp(g.k0, g.k1, m);
        const tilt = 0.45 * (1 - m);
        const fx = lerp(g.hx, g.cx, m);
        const fy = lerp(g.hy, g.cy, m) + bob.current * (1 - seg(v, 0, 0.06));
        t = `translate(${(fx - g.w / 2 - g.ox).toFixed(2)}px, ${(fy - g.h / 2 - g.oy).toFixed(2)}px) perspective(1400px) rotateX(${(rotX.get() * tilt).toFixed(3)}deg) rotateY(${(rotY.get() * tilt).toFixed(3)}deg) rotateZ(${(rotZ.get() * tilt).toFixed(3)}deg) scale(${k.toFixed(4)})`;
      } else {
        // Landed, then lying down into the top plate: a 2D matrix on whole pixels.
        const cx = lerp(g.cx, g.sx, lie);
        const cy = lerp(g.cy, g.sy, lie);
        const sx = lerp(g.k1, (g.ks * PW) / g.w, lie);
        const sy = lerp(g.k1, (g.ks * PH) / g.h, lie);
        const base = mixM(IDENTITY, PLATE_M7, lie);
        const mm = mul([1, 0, 0, 1, r(cx - g.w / 2) - g.ox, r(cy - g.h / 2) - g.oy], mul(base, [sx, 0, 0, sy, 0, 0]));
        t = `matrix(${mm.map((n) => +n.toFixed(5)).join(",")})`;
      }
      focal.style.transform = t;
      focal.style.visibility = "";
    } else {
      focal.style.visibility = "hidden";
    }
    focal.style.opacity = String(1 - seg(v, T.swap[0] + 0.012, T.swap[1]));
    focal.dataset.landed = m >= 1 ? "1" : "";
    // 2. The stack: takes over at the same place and size, opens plate after plate, and on the
    //    way out gathers back into one deck.
    const open = seg(v, T.open[0], T.open[1]);
    const close = io(seg(e, 0.03, 0.6));
    const stack = stackRef.current;
    if (stack) {
      const so = seg(v, T.swap[0], T.swap[0] + 0.022);
      stack.style.opacity = String(so);
      stack.style.visibility = so > 0 ? "" : "hidden";
    }
    let y0 = 0;
    let y1 = 0;
    plateRefs.current.forEach((el, i) => {
      if (!el) return;
      const ex = settle(seg(open, i * 0.045, 0.775 + i * 0.045));
      const y = plateY(i, ex, close, g.ks);
      if (i === 0) y0 = y;
      if (i === N - 1) y1 = y;
      el.style.left = `${g.sx - PW / 2}px`;
      el.style.top = `${g.sy - PH / 2}px`;
      const mm = plateMatrix(i, 1, 0, g.ks);
      mm[5] = y;
      el.style.transform = plateCss(mm);
    });
    const route = routeRef.current;
    if (route) {
      route.style.left = `${g.sx}px`;
      route.style.top = `${g.sy + y0}px`;
      route.style.height = `${Math.max(0, y1 - y0)}px`;
      route.style.opacity = open > 0.05 ? String(1 - close) : "0";
    }
    const line = lineRef.current;
    if (line) {
      const lt = seg(v, T.line[0], T.line[1]);
      line.style.opacity = String(lt);
      line.style.transform = lt >= 1 ? "none" : `translate(0, ${r(28 * (1 - out(lt)))}px)`;
    }
  }

  useMotionValueEvent(p, "change", (v) => {
    const h = pinnedRef.current && v > 0.02;
    if (h !== hold.current) {
      hold.current = h;
      if (wallRef.current) wallRef.current.dataset.hold = h ? "1" : "";
    }
    // Once the wall has faded out it stops being drawn at all.
    if (wallRef.current && pinnedRef.current) wallRef.current.style.visibility = v > 0.45 ? "hidden" : "";
    apply();
  });
  useMotionValueEvent(exit, "change", apply);
  useMotionValueEvent(rotX, "change", () => {
    if (p.get() < T.dive[1]) apply();
  });
  useMotionValueEvent(rotY, "change", () => {
    if (p.get() < T.dive[1]) apply();
  });

  // The floating tile breathes a few pixels while the hero is at rest (pinned, on screen).
  useEffect(() => {
    if (!pinned || reduce) return;
    let raf = 0;
    const t0 = performance.now();
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible.current || document.hidden || p.get() > 0.06) return;
      bob.current = Math.sin((t - t0) / 1500) * 5;
      apply();
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      bob.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned, reduce]);

  // Leaving pinned mode clears every inline style so the stills read cleanly.
  useEffect(() => {
    if (pinned) return;
    const els = [focalRef.current, stackRef.current, lineRef.current, routeRef.current, wallRef.current, ...plateRefs.current];
    for (const el of els) if (el) for (const k of ["transform", "opacity", "left", "top", "height", "visibility"] as const) el.style[k] = "";
  }, [pinned]);

  // The wall's life: about once a second a tile in view (clear of the headline and the floating
  // tile) clears. Mostly a card is delivered; now and then the question takes no ad; sometimes
  // two clear almost together. CSS plays each one. Stops off screen, in hidden tabs, and while
  // the camera moves.
  useEffect(() => {
    if (reduce) return;
    const wall = wallRef.current;
    if (!wall) return;
    const tiles = Array.from(wall.querySelectorAll<HTMLElement>("[data-tile]"));
    let timer = 0;
    const obs = new IntersectionObserver(([e]) => {
      visible.current = !!e?.isIntersecting;
      wall.dataset.paused = visible.current ? "" : "1";
    });
    obs.observe(wall);
    const ends: number[] = [];
    const pad = (b: DOMRect | undefined, x: number, y: number, by: number) => !!b && x > b.left - by && x < b.right + by && y > b.top - by && y < b.bottom + by;
    const clear = () => {
      const view = wall.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const wide = vw >= 900;
      const home = (wide ? homeRef.current : focalRef.current)?.getBoundingClientRect();
      const copy = wide ? copyRef.current?.getBoundingClientRect() : undefined;
      const picks: HTMLElement[] = [];
      for (const t of tiles) {
        if (t.dataset.run || t.dataset.filled) continue;
        const b = t.getBoundingClientRect();
        const cx = b.left + b.width / 2;
        const cy = b.top + b.height / 2;
        if (cx < Math.max(vw * 0.05, view.left) || cx > Math.min(vw * 0.96, view.right)) continue;
        if (cy < Math.max(wide ? 120 : 0, view.top + 30) || cy > Math.min(vh * 0.93, view.bottom - 30)) continue;
        if (pad(copy, cx, cy, 70) || pad(home, cx, cy, 50)) continue;
        picks.push(t);
      }
      const t = picks[Math.floor(Math.random() * picks.length)];
      if (!t) return;
      const none = Math.random() < 0.18;
      t.dataset.run = none ? "0" : "1";
      ends.push(window.setTimeout(() => delete t.dataset.run, none ? 2700 : 6600));
    };
    const tick = () => {
      timer = window.setTimeout(tick, 640 + Math.random() * 760);
      if (!visible.current || document.hidden || hold.current) return;
      clear();
      if (Math.random() < 0.22) ends.push(window.setTimeout(clear, 150 + Math.random() * 180));
    };
    timer = window.setTimeout(tick, 900);
    return () => {
      window.clearTimeout(timer);
      ends.forEach((e) => window.clearTimeout(e));
      obs.disconnect();
    };
  }, [reduce]);

  // The still open stack (motion off, wide) fits its column.
  const stillRef = useRef<HTMLDivElement>(null);
  const [stillK, setStillK] = useState(0.86);
  useEffect(() => {
    const el = stillRef.current;
    if (!el || pinned) return;
    const fit = () => setStillK(Math.min(0.94, el.clientWidth / stackSize(1).w));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pinned]);
  const [flatRef, flatSeen] = useInView<HTMLDivElement>("0px 0px -12% 0px");

  const still = (v: MotionValue<number>, rest: number) => (pinned ? v : rest);

  return (
    <section ref={ref} id="top" className={s.hero} aria-labelledby="hero-title" data-pinned={pinned ? "" : undefined}>
      <div ref={stageRef} className={s.stage} onPointerMove={onMove}>
        <Wall wallRef={wallRef} plane={{ x: reduce ? 26 : rotX, y: reduce ? 7 : rotY, z: still(rotZ, -11) }} cam={{ z: still(camZ, 0), y: still(camY, 0) }} opacity={still(wallO, 1)} />
        <motion.div className={s.fog} style={{ opacity: still(fogO, 1) }} aria-hidden />

        <motion.div className={s.copy} style={{ y: still(copyY, 0), opacity: still(copyO, 1) }}>
          <div ref={copyRef} className={s.copyIn}>
            <h1 id="hero-title" className={`px-dxl ${s.h1}`}>
              <Words text={HERO.h1} accent={HERO.accent} />
            </h1>
            <p className={`px-lead ${s.lede}`}>{HERO.lede}</p>
            <div className={s.actions}>
              <ActionPrimary href={ADVERTISER_URL}>{HERO.primary}</ActionPrimary>
              <ActionText href={PUBLISHER_URL}>{HERO.secondary}</ActionText>
            </div>
          </div>
        </motion.div>
        <motion.p className={s.note} style={{ opacity: still(noteO, 1) }}>
          {HERO.wallNote}
        </motion.p>

        {/* The resting box of the floating tile; the tile is drawn at 1x and scaled into it. */}
        <div ref={homeRef} className={s.home} aria-hidden />
        <motion.div className={s.lift} style={{ opacity: still(liftO, 1) }} aria-hidden />
        <div ref={focalRef} className={s.focal} data-visual="">
          <FocalTile />
        </div>

        {/* Pinned only: the line and the opening stack (painted plates, no layers). */}
        <div ref={lineRef} className={s.line}>
          <h2 className={`px-h1 ${s.lineH}`}>{STACK.line}</h2>
          <p className={s.lineNote}>{STACK.note}</p>
        </div>
        <div ref={stackRef} className={s.stack} data-visual="" aria-label={PLATE_IDS.map((id) => `${STACK.plates[id].name}, ${STACK.plates[id].note}`).join(". ")}>
          <i ref={routeRef} className={s.route} />
          {PLATE_IDS.map((id, i) => (
            <Plate key={id} id={id} plateRef={(el) => (plateRefs.current[i] = el)} style={{ zIndex: N - i }} />
          ))}
        </div>
      </div>

      {/* Not pinned (motion off, no JS, phones): the end frame as a still. */}
      <div className={s.after}>
        <div className={`px-wrap ${s.afterIn}`}>
          <div className={s.afterCopy}>
            <h2 className="px-h1">{STACK.line}</h2>
            <p className={s.lineNote}>{STACK.note}</p>
          </div>
          <div ref={stillRef} className={s.afterStack} data-visual="">
            <div className={s.onlyWide}>
              <StillStack k={stillK} />
            </div>
            <div ref={flatRef} className={s.onlyNarrow}>
              <FlatStack seen={flatSeen} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
