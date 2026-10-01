"use client";

// The closing: the hero reversed. As the closing arrives, the six plates collapse back onto each
// other, stand up flat and become one Sponsored card again. Reduced motion and no JS: the card.
import { useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { Provenance } from "@axp/design-system/foundation";
import { CV } from "@/data/run";
import { SponsoredCard } from "@/specimens/SponsoredCard";
import { Fit } from "./Fit";
import { PlateStack, STACK_H, STACK_W } from "./PlateStack";
import { io, seg } from "@/motion/motion";
import useReduced from "@/motion/useReduced";

export default function ClosingStack() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReduced();
  const [v, setV] = useState(1);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 95%", "center 45%"] });
  useMotionValueEvent(scrollYProgress, "change", (x) => {
    if (reduce) return;
    setV((c) => (Math.abs(c - x) < 0.003 ? c : x));
  });
  const t = reduce ? 1 : v;
  const explode = 1 - io(seg(t, 0.05, 0.6));
  const stackO = 1 - seg(t, 0.72, 0.86);
  const cardO = seg(t, 0.74, 0.9);
  return (
    <div ref={ref} className="cs">
      <div className="cs-viz" aria-hidden style={{ opacity: stackO }}>
        <div className="cs-canvas" style={{ transform: `scale(${0.55 + 0.45 * io(seg(t, 0.1, 0.75))})` }}>
          <Fit w={STACK_W} h={STACK_H}>
            <PlateStack tilt={1 - io(seg(t, 0.55, 0.8))} explode={explode} callouts={0} />
          </Fit>
        </div>
      </div>
      <div className="cs-card" style={{ opacity: cardO, transform: `translate3d(0, ${(1 - cardO) * 18}px, 0)` }}>
        <SponsoredCard name={CV.name} text={CV.approvedText!} destination={CV.destination} />
        <div className="px-marks" style={{ marginTop: 16 }}>
          <Provenance kind="actual" label="The card from the cached question" onStage />
          <Provenance kind="fictional" onStage />
        </div>
      </div>
    </div>
  );
}
