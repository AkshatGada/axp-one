"use client";

// v7 hero: the Exchange Wall, then the camera dives into one tile and lands in the exploded card.
// A tilted wall of AI app conversation tiles (real questions observed by ContextHint) drifts; about
// once a second an auction clears somewhere on it (ultramarine bid pulses, a neutral Sponsored
// fill, a Solana purple settle tick). One tile, the run's recorded question with ClearVault's card,
// is lifted off the wall. Pinned scroll (>= 900px, motion on), progress p:
//   0.00 to 0.08  the headline lifts away;
//   0.03 to 0.30  the camera dollies into the wall (it dims from 0.14); the tile flattens, travels
//                 to the centre and lands at exactly 1x, on whole pixels, as a 2D, unpromoted layer;
//   0.37 to 0.47  the tile lies down as a plate; the line arrives;
//   0.45 to 0.48  hand-over to the collapsed stack of six plates (same place, same size);
//   0.47 to 0.72  the stack explodes along the route; then a hold.
// Crispness: the plates and the landed tile are never promoted (no will-change, no 3D at rest),
// sit on whole pixels and never scale above 1, so their text is painted live at screen resolution.
// Reduced motion: the still hero, then the still exploded stack. Below 900px: copy, a band of the
// wall, the recorded tile, then the six plates flat.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { ActionPrimary, ActionText, Words } from "@axp/design-system/prospectus";
import { CACHED, CV, HELPFUL_EXCERPT } from "@/data/run";
import { DEVNET_URL, HERO, MVP_URL, STACK } from "@/data/copy";
import { PROMPTS } from "@/hero-lab/data";
import useReduced, { usePinned } from "@/motion/useReduced";
import { IDENTITY, io, lerp, mixM, mul, out, seg, type M2 } from "@/motion/motion";
import { FlatStack, PH, PLATE_IDS, PLATE_M7, PW, Plate, GAP, StillStack, plateCss, plateMatrix, stackSize } from "./Plates";
import s from "./hero.module.css";

/** Scroll progress over the 294vh pin (194vh of travel) to the timeline v, which was written for a
 *  310vh pin (210vh of travel). Every phase keeps its original pace per pixel of scroll, except the
 *  stretch where the landed tile sits alone on paper (v 0.27 to 0.40), which plays 2.5x faster. */
const WARP = { D: 210, A: 0.27, B: 0.4, k: 2.5, T: 194 };
function warpHero(u: number) {
  const { D, A, B, k, T } = WARP;
  const sv = u * T;
  const sA = A * D;
  const sB = sA + ((B - A) * D) / k;
  if (sv <= sA) return sv / D;
  if (sv <= sB) return A + ((sv - sA) * k) / D;
  return Math.min(1, B + (sv - sB) / D);
}

const COLS = 7;
const PER = 5;
const DURS = [96, 118, 88, 124, 104, 112, 92];
const DEPTH = [-110, 30, -40, 70, -80, 10, -60];
const LIFT = [-6, 4, -10, 1, -7, 6, -3];
const PREFILLED = new Set(["0-3", "1-1", "2-4", "3-0", "4-2", "5-3", "2-1", "6-0", "6-3"]);
const cols = Array.from({ length: COLS }, (_, c) => Array.from({ length: PER }, (_, r) => PROMPTS[(c * PER + r * 7 + c) % PROMPTS.length]!));
const ext = { target: "_blank", rel: "noopener noreferrer" } as const;
const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

function Tile({ q, filled, n }: { q: string; filled: boolean; n: number }) {
  const w = (k: number) => ({ "--w": `${58 + ((n * 17 + k * 23) % 38)}%` }) as CSSProperties;
  return (
    <div className={s.tile} data-tile="" data-filled={filled ? "1" : undefined}>
      <p className={s.q}>{q}</p>
      <div className={s.ans}>
        <i style={w(1)} />
        <i style={w(2)} />
        <i style={w(3)} />
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
        <span className={s.settle}>Settled</span>
      </div>
    </div>
  );
}

type MV = MotionValue<number> | number;

export function Wall({ plane, cam, opacity, wallRef, tone, lite }: { plane: { x: MV; y: MV; z: MV }; cam?: { z: MV; y: MV }; opacity?: MV; wallRef?: React.RefObject<HTMLDivElement | null>; tone?: "brand"; lite?: boolean }) {
  const shown = lite ? cols.slice(1, 6).map((qs) => qs.slice(0, 4)) : cols;
  return (
    <motion.div ref={wallRef} className={s.view} data-tone={tone} style={{ opacity: opacity ?? 1 }} aria-hidden>
      <motion.div className={s.cam} style={{ z: cam?.z ?? 0, y: cam?.y ?? 0 }}>
        <motion.div className={s.plane} style={{ z: -170, rotateX: plane.x, rotateY: plane.y, rotateZ: plane.z }}>
          {shown.map((qs, c) => (
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
    </motion.div>
  );
}

/** The recorded question in the demo AI app, with ClearVault's card (the run's own text). */
function FocalTile() {
  return (
    <div className={s.chat}>
      <div className={s.chatBar}>
        <span className={s.chatApp}>{HERO.appName}</span>
        <span className={s.chatSlot}>{HERO.slotLine}</span>
      </div>
      <div className={s.chatBody}>
        <p className={s.chatQ}>{CACHED.question}</p>
        <div className={s.chatA}>
          <span className={s.chatWho}>{HERO.answerLabel}</span>
          <p className={s.chatText}>{HELPFUL_EXCERPT}</p>
        </div>
        <span className={s.chatGap}>{HERO.gap}</span>
        <div className={s.fSlot}>
          <div className={s.fWait}>Sponsored slot</div>
          <div className={s.card}>
            <div className={s.cardHead}>
              <span className={s.cardLabel}>Sponsored</span>
              <span className={s.cardName}>{CV.name}</span>
            </div>
            <p className={s.cardText}>{(CV.approvedText ?? "").split(". ")[0]}.</p>
            <span className={s.cardFoot}>{(CV.destination ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
          </div>
          <i className={`${s.fPulse} ${s.fpl}`} />
          <i className={`${s.fPulse} ${s.fpr}`} />
          <i className={`${s.fPulse} ${s.fpb}`} />
          <span className={s.fSettle}>Settled</span>
        </div>
      </div>
    </div>
  );
}

function Copy() {
  return (
    <div className={s.copyIn}>
      <h1 id="hero-title" className={`px-dxl ${s.h1}`}>
        <Words text={HERO.h1} accent={HERO.accent} />
      </h1>
      <p className={`px-lead ${s.lede}`}>{HERO.lede}</p>
      <div className={s.actions}>
        <ActionPrimary href={MVP_URL} external>
          {HERO.primary}
        </ActionPrimary>
        <ActionText href="/demo/">Watch the product demo</ActionText>
      </div>
      <p className={s.trio}>
        {HERO.trio.map((t) => (
          <a key={t.name} href={t.href} {...ext} data-tone={t.tone}>
            {t.k ? <span>{t.k}</span> : null}
            <b>{t.name}</b>
            {t.rest}
          </a>
        ))}
      </p>
      <p className={s.status}>
        <span>{HERO.status}</span>{" "}
        {DEVNET_URL ? (
          <a href={DEVNET_URL} {...ext}>
            {HERO.devnet}
          </a>
        ) : null}
      </p>
    </div>
  );
}

type Geo = { ox: number; oy: number; vw: number; vh: number; w: number; h: number; hx: number; hy: number; k0: number; k1: number; cx: number; cy: number; sx: number; sy: number; ks: number };

const r = (n: number) => Math.round(n);

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const homeRef = useRef<HTMLDivElement>(null);
  const focalRef = useRef<HTMLDivElement>(null);
  const capRef = useRef<HTMLParagraphElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const routeRef = useRef<HTMLElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const plateRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hold = useRef(false);
  const geo = useRef<Geo | null>(null);
  const pinned = usePinned();
  const reduce = useReduced();
  const pinnedRef = useRef(false);
  pinnedRef.current = pinned;
  const { scrollYProgress: raw } = useScroll({ target: ref, offset: ["start start", "end end"] });
  // The timeline below is written in v (0 to 1); warpHero maps the 294vh pin onto it.
  const p = useTransform(raw, warpHero);

  // Cursor parallax: a few springy degrees, fading as the plane straightens.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 50, damping: 16 });
  const smy = useSpring(my, { stiffness: 50, damping: 16 });
  function onMove(e: RPointerEvent<HTMLDivElement>) {
    if (reduce || e.pointerType !== "mouse") return;
    const b = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - b.left) / b.width) * 2 - 1);
    my.set(((e.clientY - b.top) / b.height) * 2 - 1);
  }

  const flat = useTransform(p, (v) => io(seg(v, 0, 0.34)));
  const rotX = useTransform([flat, smy] as MotionValue<number>[], ([f, m]: number[]) => 26 * (1 - f!) - m! * 3.5 * (1 - f!));
  const rotY = useTransform([flat, smx] as MotionValue<number>[], ([f, m]: number[]) => 7 * (1 - f!) + m! * 5 * (1 - f!));
  const rotZ = useTransform(flat, (f) => -11 * (1 - f));
  const camZ = useTransform(p, (v) => 900 * io(seg(v, 0.03, 0.34)));
  const camY = useTransform(p, (v) => -80 * out(seg(v, 0, 0.3)));
  const wallO = useTransform(p, (v) => 1 - io(seg(v, 0.14, 0.36)));
  const copyY = useTransform(p, (v) => -140 * out(seg(v, 0, 0.12)));
  const copyO = useTransform(p, (v) => 1 - seg(v, 0.01, 0.08));
  const fogO = useTransform(p, (v) => 1 - 0.9 * seg(v, 0.03, 0.14));
  const noteO = useTransform(p, (v) => 1 - seg(v, 0.01, 0.06));

  // The tile's own load intro (CSS) is over after about 3.4s; then its children drop it.
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
      const ks = Math.min(1, (vh - 110) / unit.h, (vw * 0.56) / unit.w);
      geo.current = {
        ox: fr.left - sr.left,
        oy: fr.top - sr.top,
        vw,
        vh,
        w,
        h,
        hx: home.offsetLeft + home.offsetWidth / 2,
        hy: home.offsetTop + home.offsetHeight / 2,
        k0: home.offsetWidth / w,
        k1: Math.min(1, (vh - 120) / h),
        cx: r(vw / 2),
        cy: r(vh / 2),
        sx: r(vw * 0.6),
        sy: r(vh / 2 + 10),
        ks,
      };
      apply(p.get());
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned]);

  function apply(v: number) {
    const g = geo.current;
    const focal = focalRef.current;
    if (!g || !focal || !pinnedRef.current) return;
    // 1. The tile: from its lifted pose on the wall to the centre at 1x.
    const m = io(seg(v, 0.03, 0.3));
    const lie = io(seg(v, 0.37, 0.47));
    const k = lerp(g.k0, g.k1, m);
    const tilt = 0.45 * (1 - m);
    const fx = lerp(g.hx, g.cx, m);
    const fy = lerp(g.hy, g.cy, m);
    let t: string;
    if (m < 1) {
      // In flight: a real 3D pose (composited while moving, no will-change, so it re-rasters).
      t = `translate(${(fx - g.w / 2 - g.ox).toFixed(2)}px, ${(fy - g.h / 2 - g.oy).toFixed(2)}px) perspective(1400px) rotateX(${(rotX.get() * tilt).toFixed(3)}deg) rotateY(${(rotY.get() * tilt).toFixed(3)}deg) rotateZ(${(rotZ.get() * tilt).toFixed(3)}deg) scale(${k.toFixed(4)})`;
    } else {
      // Landed, then lying down into the top plate: a 2D matrix on whole pixels.
      const cx = lerp(g.cx, g.sx, lie);
      const cy = lerp(g.cy, g.sy, lie);
      const sx = lerp(g.k1, (g.ks * PW) / g.w, lie);
      const sy = lerp(g.k1, (g.ks * PH) / g.h, lie);
      const base = mixM(IDENTITY, PLATE_M7, lie);
      const mm = mul([1, 0, 0, 1, r(cx - g.w / 2) - g.ox, r(cy - g.h / 2) - g.oy], mul(base, [sx, 0, 0, sy, 0, 0]));
      t = `matrix(${mm.map((v) => +v.toFixed(5)).join(",")})`;
    }
    focal.style.transform = t;
    focal.style.opacity = String(1 - seg(v, 0.455, 0.48));
    focal.dataset.landed = m >= 1 ? "1" : "";
    if (capRef.current) capRef.current.style.opacity = String(seg(v, 0.27, 0.31) * (1 - seg(v, 0.36, 0.39)));
    // 2. The stack: hands over at the same place and size, then explodes.
    const ex = io(seg(v, 0.47, 0.72));
    const stack = stackRef.current;
    if (stack) stack.style.opacity = String(seg(v, 0.445, 0.47));
    plateRefs.current.forEach((el, i) => {
      if (!el) return;
      el.style.left = `${g.sx - PW / 2}px`;
      el.style.top = `${g.sy - PH / 2}px`;
      el.style.transform = plateCss(plateMatrix(i, 1, ex, g.ks));
      // The answer is the top card; the layers beneath slide out from under it.
      el.style.zIndex = String(PLATE_IDS.length - i);
    });
    const route = routeRef.current;
    if (route) {
      const span = r((PLATE_IDS.length - 1) * GAP * g.ks * ex);
      route.style.left = `${g.sx}px`;
      route.style.top = `${g.sy - r(span / 2)}px`;
      route.style.height = `${span}px`;
      route.style.opacity = ex > 0.04 ? "1" : "0";
    }
    const line = lineRef.current;
    if (line) {
      const lt = seg(v, 0.4, 0.48);
      line.style.opacity = String(lt);
      line.style.transform = lt >= 1 ? "none" : `translate(0, ${r(24 * (1 - out(lt)))}px)`;
    }
  }

  useMotionValueEvent(p, "change", (v) => {
    const h = pinnedRef.current && v > 0.03;
    if (h !== hold.current) {
      hold.current = h;
      if (wallRef.current) wallRef.current.dataset.hold = h ? "1" : "";
    }
    apply(v);
  });
  useMotionValueEvent(rotX, "change", () => {
    if (p.get() < 0.3) apply(p.get());
  });
  useMotionValueEvent(rotY, "change", () => {
    if (p.get() < 0.3) apply(p.get());
  });

  // Leaving pinned mode clears every inline style so the stills read cleanly.
  useEffect(() => {
    if (pinned) return;
    const els = [focalRef.current, capRef.current, stackRef.current, lineRef.current, routeRef.current, ...plateRefs.current];
    for (const el of els) if (el) for (const k of ["transform", "opacity", "left", "top", "height"] as const) el.style[k] = "";
  }, [pinned]);

  // The auctions: about once a second, one tile in view (clear of the headline and the lifted
  // tile) clears. CSS plays the pulses, fill and tick. Stops off screen, in hidden tabs, and
  // while the camera moves.
  useEffect(() => {
    if (reduce) return;
    const wall = wallRef.current;
    if (!wall) return;
    const tiles = Array.from(wall.querySelectorAll<HTMLElement>("[data-tile]"));
    let visible = true;
    let timer = 0;
    const obs = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      wall.dataset.paused = visible ? "" : "1";
    });
    obs.observe(wall);
    const ends: number[] = [];
    const tick = () => {
      timer = window.setTimeout(tick, 820 + Math.random() * 420);
      if (!visible || document.hidden || hold.current) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const home = homeRef.current?.getBoundingClientRect();
      const picks: HTMLElement[] = [];
      for (const t of tiles) {
        if (t.dataset.run || t.dataset.filled) continue;
        const b = t.getBoundingClientRect();
        const cx = b.left + b.width / 2;
        const cy = b.top + b.height / 2;
        if (cx < vw * 0.06 || cx > vw * 0.96 || cy < 110 || cy > vh * 0.94) continue;
        if (cx < vw * 0.46 && cy > vh * 0.3) continue;
        if (home && cx > home.left - 60 && cx < home.right + 60 && cy > home.top - 60 && cy < home.bottom + 60) continue;
        picks.push(t);
      }
      const t = picks[Math.floor(Math.random() * picks.length)];
      if (!t) return;
      t.dataset.run = "1";
      ends.push(window.setTimeout(() => delete t.dataset.run, 6600));
    };
    timer = window.setTimeout(tick, 380);
    return () => {
      window.clearTimeout(timer);
      ends.forEach((e) => window.clearTimeout(e));
      obs.disconnect();
    };
  }, [reduce]);

  // The reduced-motion still of the exploded stack fits its column.
  const stillRef = useRef<HTMLDivElement>(null);
  const [stillK, setStillK] = useState(0.86);
  useEffect(() => {
    const el = stillRef.current;
    if (!el || pinned) return;
    const fit = () => {
      const unit = stackSize(1);
      setStillK(Math.min(0.94, el.clientWidth / unit.w));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pinned]);

  const still = (v: MotionValue<number>, rest: number) => (pinned ? v : rest);

  return (
    <section ref={ref} id="top" data-world="paper" className={s.hero} aria-labelledby="hero-title" data-pinned={pinned ? "" : undefined}>
      <div ref={stageRef} className={s.stage} onPointerMove={onMove}>
        <Wall wallRef={wallRef} plane={{ x: reduce ? 26 : rotX, y: reduce ? 7 : rotY, z: still(rotZ, -11) }} cam={{ z: still(camZ, 0), y: still(camY, 0) }} opacity={still(wallO, 1)} />
        <motion.div className={s.fog} style={{ opacity: still(fogO, 1) }} aria-hidden />

        <motion.div className={s.copy} style={{ y: still(copyY, 0), opacity: still(copyO, 1) }}>
          <Copy />
        </motion.div>
        <motion.p className={s.note} style={{ opacity: still(noteO, 1) }}>
          {HERO.wallNote}
        </motion.p>

        {/* The resting box of the lifted tile; the tile is drawn at 1x and scaled into it. */}
        <div ref={homeRef} className={s.home} aria-hidden />
        <div ref={focalRef} className={s.focal} data-visual="">
          <FocalTile />
        </div>
        <p ref={capRef} className={s.cap}>
          {HERO.focalNote}
        </p>

        {/* Pinned only: the line and the exploding stack (painted plates, no layers). */}
        <div ref={lineRef} className={s.line}>
          <h2 className={`px-h1 ${s.lineH}`}>{STACK.line}</h2>
          <p className={s.lineNote}>{STACK.note}</p>
        </div>
        <div ref={stackRef} className={s.stack} data-visual="" aria-label={PLATE_IDS.map((id) => `${STACK.plates[id].name}, ${STACK.plates[id].note}`).join(". ")}>
          <i ref={routeRef} className={s.route} />
          {PLATE_IDS.map((id, i) => (
            <Plate key={id} id={id} plateRef={(el) => (plateRefs.current[i] = el)} style={{ zIndex: PLATE_IDS.length - i }} />
          ))}
        </div>
      </div>

      {/* Not pinned (reduced motion, no JS, phones): the end frame as a still. */}
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
            <div className={s.onlyNarrow}>
              <FlatStack />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
