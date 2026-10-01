"use client";

// Hero lab B, "The Order Book". A deep ultramarine night: a perspective floor, a terminal tape of
// opportunities streaming towards the viewer. Each row is a real observed question, the capability
// a matching advertiser would need (illustrative), three bids drawn as ultramarine bars, a winner
// and a Solana purple settle tick; the auction clears as the row comes close. Depth fog at the
// horizon; the floor follows the cursor. On scroll (>= 900px, motion on):
//   0.00 to 0.16  the headline lifts away;
//   0.04          the tape stops; the floor lays down and fades into the night;
//   0.06 to 0.50  the one recorded opportunity rises off the floor, flattens and settles centred;
//   0.46 to 0.64  its bids draw, the tie is broken by the fixed rule, the card is paid;
//   0.70 to 0.80  the caption; then a hold.
// Reduced motion, no JS and below 900px: a still tape, the copy and the resolved row in flow.
import { useEffect, useRef, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { ActionPrimary, Words } from "@axp/design-system/prospectus";
import { MVP_URL } from "@/data/copy";
import useReduced, { usePinned } from "@/motion/useReduced";
import { io, lerp, out, seg } from "@/motion/motion";
import { FOCAL, LAB, TAPE } from "./data";
import s from "./book.module.css";

const T = 15;

function Row({ r, i }: { r: (typeof TAPE)[number]; i: number }) {
  return (
    <div className={s.row} style={{ "--i": i, "--n": TAPE.length, "--t": `${T}s` } as CSSProperties}>
      <span className={s.rq}>{r.q}</span>
      <span className={s.rn}>{r.need}</span>
      <span className={s.rb}>
        {r.bids.map((b, k) => (
          <i key={k} className={s.bar} data-win={k === r.win ? "" : undefined} style={{ "--b": b, "--k": k } as CSSProperties}>
            <b />
          </i>
        ))}
      </span>
      <span className={s.rw}>Cleared</span>
      <span className={s.rs}>Settled</span>
    </div>
  );
}

/** The recorded opportunity, resolved: question, needs, bids, the tie rule, payment. */
function FocalRow({ focalRef }: { focalRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={focalRef} className={s.focal}>
      <div className={s.fHead}>
        <span className={s.fK}>The recorded opportunity</span>
        <span className={s.fApp}>{FOCAL.appName}</span>
      </div>
      <p className={s.fQ}>{FOCAL.question}</p>
      <div className={s.fGrid}>
        <div className={s.fCell}>
          <span className={s.fL}>Needs</span>
          <ul className={s.fNeeds}>
            {FOCAL.needs.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
        <div className={s.fCell}>
          <span className={s.fL}>Bids</span>
          <ul className={s.fBids}>
            {FOCAL.bids.map((b, k) => (
              <li key={b.name} data-out={b.state === "out" ? "" : undefined} style={{ "--k": k } as CSSProperties}>
                <span className={s.fName}>{b.name}</span>
                {b.state === "out" ? (
                  <span className={s.fOut}>{FOCAL.outLine}</span>
                ) : (
                  <i className={s.fBar} data-win={k === 0 ? "" : undefined}>
                    <b />
                  </i>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className={s.fCell}>
          <span className={s.fL}>Winner</span>
          <p className={s.fWin}>
            <span className={s.fWinName}>{FOCAL.card.name}</span>
            <span className={s.fWhy}>{FOCAL.tieLine}</span>
          </p>
        </div>
        <div className={s.fCell}>
          <span className={s.fL}>Payment</span>
          <p className={s.fPaid}>
            <span className={s.fTick}>Settled</span>
            <span className={s.fWhy}>{FOCAL.paidLine}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OrderBook() {
  const ref = useRef<HTMLElement>(null);
  const floorRef = useRef<HTMLDivElement>(null);
  const focalRef = useRef<HTMLDivElement>(null);
  const pinned = usePinned();
  const reduce = useReduced();
  const pinnedRef = useRef(false);
  pinnedRef.current = pinned;
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });

  // Cursor parallax: the floor turns a few degrees under the pointer.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 45, damping: 16 });
  const smy = useSpring(my, { stiffness: 45, damping: 16 });
  function onMove(e: RPointerEvent<HTMLDivElement>) {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
    my.set(((e.clientY - r.top) / r.height) * 2 - 1);
  }

  const lay = useTransform(p, (v) => (pinnedRef.current ? io(seg(v, 0.04, 0.5)) : 0));
  const floorX = useTransform([lay, smy] as MotionValue<number>[], ([l, m]: number[]) => 64 + 16 * l! + m! * 2.5 * (1 - l!));
  const floorZ = useTransform([lay, smx] as MotionValue<number>[], ([l, m]: number[]) => -m! * 3 * (1 - l!));
  const floorY = useTransform(lay, (l) => 140 * l);
  const floorO = useTransform(p, (v) => 1 - 0.9 * io(seg(v, 0.1, 0.5)));
  const copyY = useTransform(p, (v) => -140 * out(seg(v, 0, 0.18)));
  const copyO = useTransform(p, (v) => 1 - seg(v, 0.02, 0.13));
  const noteO = useTransform(p, (v) => 1 - seg(v, 0.02, 0.1));

  // The recorded row rises off the floor and flattens, centred.
  const rise = useTransform(p, (v) => io(seg(v, 0.06, 0.5)));
  const fO = useTransform(p, (v) => seg(v, 0.06, 0.2));
  const fRot = useTransform(rise, (t) => 62 * (1 - t));
  const fY = useTransform(rise, (t) => lerp(250, 0, t));
  const fS = useTransform(rise, (t) => lerp(0.72, 1, t));
  const cap = useTransform(p, (v) => seg(v, 0.7, 0.8));
  const capY = useTransform(p, (v) => 14 * (1 - out(seg(v, 0.7, 0.82))));

  useMotionValueEvent(p, "change", (v) => {
    const on = pinnedRef.current;
    const floor = floorRef.current;
    if (floor) floor.dataset.hold = on && v > 0.035 ? "1" : "";
    const f = focalRef.current;
    if (!f || !on) return;
    const set = (k: string, at: number) => {
      if (v > at && f.dataset[k] !== "1") f.dataset[k] = "1";
      else if (v <= at && f.dataset[k] === "1") f.dataset[k] = "";
    };
    set("bids", 0.46);
    set("win", 0.56);
    set("paid", 0.63);
  });

  // The tape stops while the hero is off screen.
  useEffect(() => {
    const floor = floorRef.current;
    if (!floor) return;
    const ioObs = new IntersectionObserver(([e]) => {
      floor.dataset.paused = e?.isIntersecting ? "" : "1";
    });
    ioObs.observe(floor);
    return () => ioObs.disconnect();
  }, []);

  const still = (v: MotionValue<number>, rest: number) => (pinned ? v : rest);

  return (
    <section ref={ref} className={s.hero} data-tone="stage" data-header-tone="stage" aria-labelledby="lab-b-title" data-pinned={pinned ? "" : undefined}>
      <div className={s.stage} onPointerMove={onMove}>
        <div className={s.screen}>
        <motion.div className={s.view} style={{ opacity: still(floorO, 1) }} aria-hidden>
          <motion.div ref={floorRef} className={s.floor} style={{ rotateX: reduce ? 64 : floorX, rotateZ: reduce ? 0 : floorZ, y: still(floorY, 0) }}>
            <div className={s.grid} />
            {TAPE.map((r, i) => (
              <Row key={i} r={r} i={i} />
            ))}
          </motion.div>
        </motion.div>
        <div className={s.fog} aria-hidden />

        <motion.div className={s.copy} style={{ y: still(copyY, 0), opacity: still(copyO, 1) }}>
          <div className={s.copyIn}>
            <h1 id="lab-b-title" className={`px-dxl ${s.h1}`}>
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
        </div>

        <div className={s.focalPos}>
          <div className={s.focalPersp}>
            <motion.div className={s.focalMove} style={pinned ? { opacity: fO, rotateX: fRot, y: fY, scale: fS } : undefined}>
              <FocalRow focalRef={focalRef} />
            </motion.div>
          </div>
          <motion.p className={s.cap} style={{ opacity: still(cap, 1), y: still(capY, 0) }}>
            {LAB.rowNote}
          </motion.p>
        </div>
      </div>
    </section>
  );
}
