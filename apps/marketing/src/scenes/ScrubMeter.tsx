"use client";

// The payments band: ClearVault's real channel fills and settles as the figure passes through
// the view (scrubbed, not pinned). Reduced motion and no JS: the closed channel.
import { useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { ChannelMeter } from "@/specimens/ChannelMeter";
import { CV_CHANNEL } from "@/data/run";
import useReduced from "@/motion/useReduced";

export default function ScrubMeter() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReduced();
  const [t, setT] = useState(1);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 92%", "end 38%"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (reduce) return;
    setT((x) => (Math.abs(x - v) < 0.003 ? x : v));
  });
  return (
    <div ref={ref}>
      <ChannelMeter ch={CV_CHANNEL} t={reduce ? 1 : t} />
    </div>
  );
}
