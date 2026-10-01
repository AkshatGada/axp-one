"use client";

// Hero lab A, "The Exchange Wall". A perspective-tilted wall of AI app conversation tiles, each a
// real observed buyer question with an empty, dashed Sponsored slot. Columns sit at different
// depths and drift; about once a second somewhere on the wall an auction clears: ultramarine bid
// pulses fly in over the wall and drop onto one slot, a neutral Sponsored card fills it and a small
// Solana purple settle tick flashes. The wall follows the cursor. One tile, the run's recorded
// question with ClearVault's card, is lifted off the wall. On scroll (>= 900px, motion on):
//   0.00 to 0.18  the headline lifts away and the paper fog clears;
//   0.05 to 0.62  the camera dollies into the wall while the plane straightens (dims from 0.30);
//   0.05 to 0.52  the lifted tile travels to the centre, flattens and grows to full size;
//   0.52 to 0.74  its frame and caption settle; then a hold, ready for the exploded card stack.
// Reduced motion, no JS and below 900px: a still wall, the copy and the tile in flow.
import { useEffect, useRef, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { ActionPrimary, Words } from "@axp/design-system/prospectus";
import { MVP_URL } from "@/data/copy";
import useReduced, { usePinned } from "@/motion/useReduced";
import { io, lerp, out, seg } from "@/motion/motion";
import { FOCAL, LAB, PROMPTS } from "./data";
import s from "./wall.module.css";

const COLS = 7;
const PER = 5;
const DURS = [96, 118, 88, 124, 104, 112, 92];
const DEPTH = [-110, 30, -40, 70, -80, 10, -60];
const LIFT = [-6, 4, -10, 1, -7, 6, -3];
/** Tiles that already carry a card at first paint (column, row), so the still frame reads too. */
const PREFILLED = new Set(["0-3", "1-1", "2-4", "3-0", "4-2", "5-3", "2-1", "6-0", "6-3"]);

const cols = Array.from({ length: COLS }, (_, c) => Array.from({ length: PER }, (_, r) => PROMPTS[(c * PER + r * 7 + c) % PROMPTS.length]!));

function Tile({ q, filled, n }: { q: string; filled: boolean; n: number }) {
  const w = (k: number) => ({ "--w": `${58 + ((n * 17 + k * 23) % 38)}%` }) as CSSProperties;
  return (
    <div className={s.tile} data-tile="" data-filled={filled ? "1" : undefined}>
      <p className={s.q}>{q}</p>
      <div className={s.ans} aria-hidden>
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

function Wall({ plane, cam, opacity, wallRef }: { plane: { x: MV; y: MV; z: MV }; cam: { z: MV; y: MV }; opacity: MV; wallRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <motion.div ref={wallRef} className={s.view} style={{ opacity }} aria-hidden>
      <motion.div className={s.cam} style={{ z: cam.z, y: cam.y }}>
        <motion.div className={s.plane} style={{ z: -170, rotateX: plane.x, rotateY: plane.y, rotateZ: plane.z }}>
          {cols.map((qs, c) => (
            <div key={c} className={s.col} style={{ transform: `translateZ(${DEPTH[c]}px) translateY(${LIFT[c]}rem)` }}>
              <div className={s.track} style={{ "--dur": `${DURS[c]}s` } as CSSProperties}>
                {[...qs, ...qs].map((q, n) => (
                  <Tile key={n} q={q} n={c * 11 + n} filled={PREFILLED.has(`${c}-${n % PER}`)} />
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

type MV = MotionValue<number> | number;

/** The lifted tile: the run's recorded question in the host chat, with ClearVault's card. */
function FocalTile() {
  return (
    <div className={s.chat}>
      <div className={s.chatBar}>
        <span className={s.chatApp}>{FOCAL.appName}</span>
        <span className={s.chatSlot}>{FOCAL.slotLine}</span>
      </div>
      <div className={s.chatBody}>
        <p className={s.chatQ}>{FOCAL.question}</p>
        <div className={s.chatA}>
          <span className={s.chatWho}>{FOCAL.answerLabel}</span>
          <p className={s.chatText}>{FOCAL.answer}</p>
        </div>
        <span className={s.chatGap}>{FOCAL.gap}</span>
        <div className={s.fSlot}>
          <div className={s.fWait}>Sponsored slot, awaiting the auction</div>
          <div className={s.card}>
            <div className={s.cardHead}>
              <span className={s.cardLabel}>Sponsored</span>
              <span className={s.cardName}>{FOCAL.card.name}</span>
            </div>
            <p className={s.cardText}>{FOCAL.card.text}</p>
            <span className={s.cardFoot}>{FOCAL.card.destination}</span>
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

export default function ExchangeWall() {
  const ref = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const homeRef = useRef<HTMLDivElement>(null);
  const focalRef = useRef<HTMLDivElement>(null);
  const hold = useRef(false);
  const pinned = usePinned();
  const reduce = useReduced();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });

  // Where the lifted tile rests (home), and how far and how much it travels to the centre.
  const geo = useRef({ dx: 0, dy: 0, k0: 0.62, k1: 1 });
  useEffect(() => {
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
      const hx = home.offsetLeft + home.offsetWidth / 2;
      const hy = home.offsetTop + home.offsetHeight / 2;
      const k0 = home.offsetWidth / w;
      const k1 = Math.min(1.12, (vh - 230) / h, (vw * 0.56) / w);
      geo.current = { dx: vw / 2 - hx, dy: vh / 2 + 18 - hy, k0, k1 };
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [pinned, p]);

  // Cursor parallax: a few springy degrees, fading as the plane straightens.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 50, damping: 16 });
  const smy = useSpring(my, { stiffness: 50, damping: 16 });
  function onMove(e: RPointerEvent<HTMLDivElement>) {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
    my.set(((e.clientY - r.top) / r.height) * 2 - 1);
  }

  const flat = useTransform(p, (v) => io(seg(v, 0, 0.6)));
  const rotX = useTransform([flat, smy] as MotionValue<number>[], ([f, m]: number[]) => 26 * (1 - f!) - m! * 3.5 * (1 - f!));
  const rotY = useTransform([flat, smx] as MotionValue<number>[], ([f, m]: number[]) => 7 * (1 - f!) + m! * 5 * (1 - f!));
  const rotZ = useTransform(flat, (f) => -11 * (1 - f));
  const camZ = useTransform(p, (v) => 900 * io(seg(v, 0.05, 0.62)));
  const camY = useTransform(p, (v) => -80 * out(seg(v, 0, 0.5)));
  const wallO = useTransform(p, (v) => 1 - 0.92 * io(seg(v, 0.3, 0.62)));
  const copyY = useTransform(p, (v) => -140 * out(seg(v, 0, 0.2)));
  const copyO = useTransform(p, (v) => 1 - seg(v, 0.02, 0.14));
  const fogO = useTransform(p, (v) => 1 - 0.9 * seg(v, 0.04, 0.22));
  const noteO = useTransform(p, (v) => 1 - seg(v, 0.02, 0.1));

  // The lifted tile: sits on the tilted wall, then flattens and travels to the centre.
  const m = useTransform(p, (v) => io(seg(v, 0.05, 0.52)));
  const fx = useTransform(m, (t) => geo.current.dx * t);
  const fy = useTransform(m, (t) => geo.current.dy * t);
  const fs = useTransform(m, (t) => lerp(geo.current.k0, geo.current.k1, t));
  // At rest it leans with the wall, a little less (it is lifted towards the viewer).
  const frX = useTransform([rotX, m] as MotionValue<number>[], ([r, t]: number[]) => r! * 0.45 * (1 - t!));
  const frY = useTransform([rotY, m] as MotionValue<number>[], ([r, t]: number[]) => r! * 0.45 * (1 - t!));
  const frZ = useTransform([rotZ, m] as MotionValue<number>[], ([r, t]: number[]) => r! * 0.45 * (1 - t!));
  const frame = useTransform(p, (v) => seg(v, 0.52, 0.64));
  const cap = useTransform(p, (v) => seg(v, 0.6, 0.72));
  const capY = useTransform(p, (v) => 14 * (1 - out(seg(v, 0.6, 0.74))));

  const pinnedRef = useRef(false);
  pinnedRef.current = pinned;
  useMotionValueEvent(p, "change", (v) => {
    const h = pinnedRef.current && v > 0.035;
    if (h !== hold.current) {
      hold.current = h;
      if (wallRef.current) wallRef.current.dataset.hold = h ? "1" : "";
    }
  });

  // The auctions: about once a second, one tile in view (clear of the headline and the lifted
  // tile) clears. CSS plays the pulses, the fill and the settle tick; the drift and the clock
  // stop while the hero is off screen, the tab is hidden or the camera moves.
  useEffect(() => {
    if (reduce) return;
    const wall = wallRef.current;
    if (!wall) return;
    const tiles = Array.from(wall.querySelectorAll<HTMLElement>("[data-tile]"));
    let visible = true;
    let timer = 0;
    const ioObs = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      wall.dataset.paused = visible ? "" : "1";
    });
    ioObs.observe(wall);
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
        const r = t.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        if (cx < vw * 0.06 || cx > vw * 0.96 || cy < 110 || cy > vh * 0.94) continue;
        if (cx < vw * 0.46 && cy > vh * 0.3) continue;
        if (home && cx > home.left - 40 && cx < home.right + 40 && cy > home.top - 40 && cy < home.bottom + 40) continue;
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
      ioObs.disconnect();
    };
  }, [reduce]);

  const still = (v: MotionValue<number>, rest: number) => (pinned ? v : rest);

  return (
    <section ref={ref} className={s.hero} aria-labelledby="lab-a-title" data-pinned={pinned ? "" : undefined}>
      <div ref={stageRef} className={s.stage} onPointerMove={onMove}>
        <Wall
          wallRef={wallRef}
          plane={{ x: reduce ? 26 : rotX, y: reduce ? 7 : rotY, z: still(rotZ, -11) }}
          cam={{ z: still(camZ, 0), y: still(camY, 0) }}
          opacity={still(wallO, 1)}
        />
        <motion.div className={s.fog} style={{ opacity: still(fogO, 1) }} aria-hidden />

        <motion.div className={s.copy} style={{ y: still(copyY, 0), opacity: still(copyO, 1) }}>
          <div className={s.copyIn}>
            <h1 id="lab-a-title" className={`px-dxl ${s.h1}`}>
              <Words text={LAB.h1} accent={LAB.accent} />
            </h1>
            <p className={`px-lead ${s.lede}`}>{LAB.lede}</p>
            <div className={s.actions}>
              <ActionPrimary href={MVP_URL} external>
                {LAB.primary}
              </ActionPrimary>
            </div>
          </div>
        </motion.div>
        <motion.p className={s.note} style={{ opacity: still(noteO, 1) }}>
          {LAB.wallNote}
        </motion.p>

        {/* focalPos is the lifted tile's resting box; the tile is drawn at full size and scaled into it. */}
        <motion.div ref={homeRef} className={s.focalPos} style={{ x: still(fx, 0), y: still(fy, 0) }}>
          <div className={s.focalPersp}>
            <motion.div
              ref={focalRef}
              className={s.focal}
              style={pinned ? { scale: fs, rotateX: frX, rotateY: frY, rotateZ: frZ } : undefined}
            >
              <motion.div className={s.frame} style={{ opacity: still(frame, 0) }} aria-hidden />
              <FocalTile />
            </motion.div>
          </div>
        </motion.div>
        <motion.p className={s.cap} style={{ opacity: still(cap, 0), y: still(capY, 0) }}>
          {LAB.focalNote}
        </motion.p>
      </div>
    </section>
  );
}
