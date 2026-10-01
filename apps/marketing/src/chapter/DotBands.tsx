"use client";

// "420,540 times an ad was seen." One square per 100 placements (4,205). They start as an
// even field, then sort themselves into country bands sized by real placements: the United
// States, no country recorded, Australia, South Korea. The US-heavy library becomes the picture.
// Pinned and scrubbed at >= 900px with motion on; otherwise the sorted bands, still.
import { useEffect, useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { LIBRARY, LIBRARY_BY_COUNTRY, fmt } from "@/data/library";
import { CONTEXTHINT } from "@/data/copy";
import { io, seg } from "@/motion/motion";
import { usePinned } from "@/motion/useReduced";

const PER = 100;
const COLS = 96;
const CELL = 7;
const GAP = 2;
const BAND_GAP = 26;
const BANDS = LIBRARY_BY_COUNTRY.rows.map((r) => ({ ...r, dots: Math.round(r.placements / PER) }));
const TOTAL = Math.round(LIBRARY.placements / PER);
/** Bands settle in order: the United States first, then no country, Australia, South Korea. */
const BAND_DELAY = [0, 0.14, 0.24, 0.3];
const SETTLE = 0.5;

// Deterministic pseudo-random so the "before" field is the same every load.
function rand(i: number) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

type Dot = { x0: number; y0: number; x1: number; y1: number; band: number; d: number };

function layout() {
  const dots: Dot[] = [];
  const W = COLS * (CELL + GAP);
  let y = 0;
  const bandTop: number[] = [];
  BANDS.forEach((b, bi) => {
    bandTop.push(y);
    for (let k = 0; k < b.dots; k++) {
      const c = k % COLS;
      const r = Math.floor(k / COLS);
      dots.push({ x0: 0, y0: 0, x1: c * (CELL + GAP), y1: y + r * (CELL + GAP), band: bi, d: 0 });
    }
    y += Math.ceil(b.dots / COLS) * (CELL + GAP) + BAND_GAP;
  });
  const H = y - BAND_GAP;
  // Before: the same dots scattered evenly over the whole canvas, shuffled.
  const order = dots.map((_, i) => i).sort((a, b) => rand(a) - rand(b));
  const fieldCols = COLS;
  const fieldRows = Math.ceil(TOTAL / fieldCols);
  const sy = H / (fieldRows * (CELL + GAP));
  order.forEach((di, k) => {
    const c = k % fieldCols;
    const r = Math.floor(k / fieldCols);
    dots[di]!.x0 = c * (CELL + GAP);
    dots[di]!.y0 = r * (CELL + GAP) * sy;
    dots[di]!.d = BAND_DELAY[dots[di]!.band]! + rand(di + 7) * 0.2;
  });
  return { dots, W, H, bandTop };
}

const L = layout();
const COLORS = ["#f65a20", "#b9bcc8", "#f65a20", "#f65a20"];

export default function DotBands() {
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pinned = usePinned();
  const [t, setT] = useState(1);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });

  useMotionValueEvent(p, "change", (v) => {
    if (!pinned) return;
    const x = seg(v, 0.1, 0.7);
    setT((c) => (Math.abs(c - x) < 0.002 ? c : x));
  });
  useEffect(() => {
    if (pinned) setT(seg(p.get(), 0.1, 0.7));
    else setT(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = L.W * dpr;
    cv.height = L.H * dpr;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, L.W, L.H);
    for (const d of L.dots) {
      const k = io(seg(t, d.d, d.d + SETTLE));
      ctx.fillStyle = k > 0.5 ? COLORS[d.band]! : "#d9a58e";
      ctx.fillRect(d.x0 + (d.x1 - d.x0) * k, d.y0 + (d.y1 - d.y0) * k, CELL, CELL);
    }
  }, [t]);

  const shown = pinned ? t : 1;
  return (
    <div ref={ref} className="db" data-pinned={pinned ? "" : undefined}>
      <div className="db-stage px-wrap">
        <div className="db-copy">
          <h3 className="px-h1 db-title">{CONTEXTHINT.dotsTitle}</h3>
          <p className="px-body">{CONTEXTHINT.dotsBody}</p>
          <ul className="db-legend">
            {BANDS.map((b, i) => (
              <li key={b.country} style={{ opacity: 0.3 + 0.7 * seg(shown, BAND_DELAY[i]! + SETTLE, BAND_DELAY[i]! + SETTLE + 0.12) }}>
                <i style={{ background: COLORS[i] }} />
                <span>{b.country}</span>
                <b className="px-num">{fmt(b.placements)}</b>
              </li>
            ))}
            <li style={{ opacity: 0.3 + 0.7 * seg(shown, 0.9, 1) }}>
              <i style={{ border: "1px solid var(--line)" }} />
              <span>{LIBRARY_BY_COUNTRY.othersNote}</span>
            </li>
          </ul>
          <p className="db-source">
            {CONTEXTHINT.dotsCaption} {CONTEXTHINT.source}
          </p>
        </div>
        <div className="db-viz">
          {BANDS.map((b, i) => (
            <span key={b.country} className="db-band" style={{ top: `${(L.bandTop[i]! / L.H) * 100}%`, opacity: seg(shown, BAND_DELAY[i]! + SETTLE, BAND_DELAY[i]! + SETTLE + 0.12) }}>
              {b.country} <b className="px-num">{fmt(b.placements)}</b>
            </span>
          ))}
          <canvas ref={canvasRef} className="db-canvas" style={{ aspectRatio: `${L.W} / ${L.H}` }} role="img" aria-label={`${fmt(LIBRARY.placements)} placements as ${fmt(TOTAL)} squares, sorted into bands: ${BANDS.map((b) => `${b.country} ${fmt(b.placements)}`).join(", ")}`} />
        </div>
      </div>
    </div>
  );
}
