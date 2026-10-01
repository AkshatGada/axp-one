"use client";

// The closing: the hero reversed. As the closing arrives, the six plates collapse onto each
// other and stand up flat; then, in one short cut (never a long crossfade), they become the chat
// again with the Sponsored card under the answer. Reduced motion and no JS: the chat.
import { useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { CACHED, CV, HELPFUL_EXCERPT } from "@/data/run";
import { CLOSING, HERO } from "@/data/copy";
import { HostChat } from "@/specimens/HostChat";
import { Fit } from "./Fit";
import { PlateStack, STACK_H, STACK_W } from "./PlateStack";
import { io, seg } from "@/motion/motion";
import useReduced from "@/motion/useReduced";

export default function ClosingStack() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReduced();
  const [v, setV] = useState(1);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 100%", "center 50%"] });
  useMotionValueEvent(scrollYProgress, "change", (x) => {
    if (reduce) return;
    setV((c) => (Math.abs(c - x) < 0.003 ? c : x));
  });
  const t = reduce ? 1 : v;
  const explode = 1 - io(seg(t, 0.05, 0.55));
  const tilt = 1 - io(seg(t, 0.5, 0.78));
  // A cut, never a crossfade: the chat is either fully there or not there at all.
  const swapped = t >= 0.82;
  const stackO = swapped ? 0 : 1;
  return (
    <div ref={ref} className="cs">
      {stackO > 0 ? (
        <div className="cs-viz" aria-hidden style={{ opacity: stackO }}>
          <div className="cs-canvas" style={{ transform: `scale(${0.6 + 0.4 * io(seg(t, 0.1, 0.78))})` }}>
            <Fit w={STACK_W} h={STACK_H}>
              <PlateStack tilt={tilt} explode={explode} callouts={0} />
            </Fit>
          </div>
        </div>
      ) : null}
      <div className="cs-chat" style={{ visibility: swapped ? "visible" : "hidden" }}>
        <HostChat question={CACHED.question} answer={HELPFUL_EXCERPT} answerLabel={HERO.answerLabel} appName={HERO.appName} card={{ name: CV.name, text: CV.approvedText!, destination: CV.destination }} />
        <p className="cs-source">{CLOSING.source}</p>
      </div>
    </div>
  );
}
