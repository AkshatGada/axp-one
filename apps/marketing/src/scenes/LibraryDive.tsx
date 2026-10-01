"use client";

// The Library Dive (ContextHint). Pinned for ~240vh at >= 900px with motion on:
//   0.00-0.18  the field of 983 niche squares settles; the rest dims, the run's niche stays lit;
//   0.18-0.42  that one square lifts out of the field and flies to the head of the evidence chain;
//   0.40-0.92  the chain builds step by step: observed prompt, observed ad, inferred audience
//              (vermillion), handed to ClearVault's agent, intent rated 3 not 2 (ultramarine).
// Below 900px, under reduced motion and without JS: field and chain side by side, all visible.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { Figure } from "@axp/design-system/prospectus";
import { CONTEXTHINT } from "@/data/copy";
import { NicheField } from "@/specimens/NicheField";
import { EvidenceChain } from "@/specimens/EvidenceChain";
import { io, seg } from "@/motion/motion";
import { usePinned } from "@/motion/useReduced";

export default function LibraryDive() {
  const ref = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const flyRef = useRef<HTMLDivElement>(null);
  const pinned = usePinned();
  const [v, setV] = useState(1);
  const geo = useRef<{ from: DOMRect; to: DOMRect; base: DOMRect } | null>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });

  useEffect(() => {
    if (!pinned) {
      setV(1);
      return;
    }
    const measure = () => {
      const base = stageRef.current?.getBoundingClientRect();
      const from = stageRef.current?.querySelector('[data-niche="run"]')?.getBoundingClientRect();
      const to = stageRef.current?.querySelector(".sp-chain-node")?.getBoundingClientRect();
      if (base && from && to) geo.current = { base, from, to };
    };
    measure();
    setV(p.get());
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned]);

  useMotionValueEvent(p, "change", (x) => {
    if (!pinned) return;
    if (!geo.current) {
      const base = stageRef.current?.getBoundingClientRect();
      const from = stageRef.current?.querySelector('[data-niche="run"]')?.getBoundingClientRect();
      const to = stageRef.current?.querySelector(".sp-chain-node")?.getBoundingClientRect();
      if (base && from && to) geo.current = { base, from, to };
    }
    setV((c) => (Math.abs(c - x) < 0.003 ? c : x));
  });

  const dim = pinned ? seg(v, 0.08, 0.2) : 0;
  const fly = pinned ? io(seg(v, 0.18, 0.42)) : 1;
  const steps = [0, 1, 2, 3, 4].map((i) => (pinned ? seg(v, 0.4 + i * 0.1, 0.47 + i * 0.1) : 1));

  let flyStyle: CSSProperties = { opacity: 0 };
  const g = geo.current;
  if (pinned && g && v > 0.16 && v < 0.46) {
    const x0 = g.from.left - g.base.left;
    const y0 = g.from.top - g.base.top;
    const x1 = g.to.left - g.base.left + (g.to.width - g.from.width) / 2;
    const y1 = g.to.top - g.base.top + (g.to.height - g.from.height) / 2;
    const arc = Math.sin(fly * Math.PI) * -60;
    const s = 1 + Math.sin(fly * Math.PI) * 1.6;
    flyStyle = {
      left: 0,
      top: 0,
      width: g.from.width,
      height: g.from.height,
      opacity: 1 - seg(v, 0.41, 0.45),
      transform: `translate3d(${x0 + (x1 - x0) * fly}px, ${y0 + (y1 - y0) * fly + arc}px, 0) scale(${s})`,
    };
  }

  return (
    <div ref={ref} className="ld" data-pinned={pinned ? "" : undefined}>
      <div ref={stageRef} className="ld-stage">
        <div className="pg-dive-grid ld-grid">
          <div style={{ "--ld-dim": String(1 - 0.62 * dim) } as CSSProperties} className="ld-field">
            <h3 className="px-h2 ld-head">{CONTEXTHINT.dive}</h3>
            <Figure title="The library, one square per niche" kinds={["observed", "illustrative"]} caption={CONTEXTHINT.fieldNote}>
              <NicheField reveal={!pinned} />
            </Figure>
          </div>
          <div className="ld-chain" style={{ "--s0": steps[0], "--s1": steps[1], "--s2": steps[2], "--s3": steps[3], "--s4": steps[4] } as CSSProperties}>
            <EvidenceChain />
          </div>
        </div>
        <div ref={flyRef} className="ld-fly" aria-hidden style={flyStyle} />
      </div>
    </div>
  );
}
