"use client";

// Stages and entry triggers (FROZEN; owner: the orchestrator).
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useScroll, type MotionValue } from "motion/react";
import s from "./kit.module.css";

/** "pinned": the visitor allows motion (and the screen is at least `minWidth` wide), so a stage may
 *  stick and be driven by scroll. "flow": render the same story as a still sequence in normal flow.
 *  It is "flow" during server render and hydration, so every word is in the HTML. */
export function useStageMode(minWidth = 0): "pinned" | "flow" {
  const [mode, setMode] = useState<"pinned" | "flow">("flow");
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`);
    const update = () => setMode(mq.matches && document.documentElement.dataset.pxMotion === "on" ? "pinned" : "flow");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [minWidth]);
  return mode;
}

/** A scroll-driven stage. `length` is its total height in viewport heights (for example 3.4): the
 *  inner frame sticks for (length - 1) screens while `pinned(progress)` draws it, progress running
 *  0 to 1 across that travel. When motion is off (or the screen is narrower than `minWidth`) it
 *  renders `flow` instead: the same story as a complete still sequence in normal flow.
 *  Never trap the reader: keep `length` within your budget and make every part of the travel move. */
export function Stage({ length, minWidth = 0, pinned, flow, className, frameClassName, style }: { length: number; minWidth?: number; pinned: (progress: MotionValue<number>) => ReactNode; flow: ReactNode; className?: string; frameClassName?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const mode = useStageMode(minWidth);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  // The ref is attached in both modes: useScroll needs a hydrated target even when nothing sticks.
  // Before hydration, when motion is allowed, the block already takes its pinned height (CSS, from
  // --x-len), so anchors land in the right place and nothing shifts when the stage arms.
  if (mode === "flow") return <div ref={ref} className={`${minWidth === 0 ? s.stageFlow : ""}${className ? ` ${className}` : ""}`} style={{ ...style, "--x-len": length } as CSSProperties} data-stage="flow">{flow}</div>;
  return (
    <div ref={ref} className={`${s.stage}${className ? ` ${className}` : ""}`} style={{ ...style, height: `${length * 100}vh` }} data-stage="pinned">
      <div className={`${s.stick}${frameClassName ? ` ${frameClassName}` : ""}`}>{pinned(scrollYProgress)}</div>
    </div>
  );
}

/** True once the element has entered the viewport (and stays true): for a short, one-time
 *  performance. It is also true at once when motion is off, when the element is already well inside
 *  the screen on first sight, or after a second on screen: a reader must never see an empty figure. */
export function useInView<T extends HTMLElement>(amount = 0.3) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (document.documentElement.dataset.pxMotion !== "on") return setSeen(true);
    const el = ref.current;
    if (!el) return;
    let timer = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        if (e.intersectionRatio >= amount || e.boundingClientRect.top < 0) {
          setSeen(true);
          io.disconnect();
          window.clearTimeout(timer);
        } else if (e.isIntersecting && !timer) {
          timer = window.setTimeout(() => { setSeen(true); io.disconnect(); }, 1000);
        }
      },
      { threshold: [0, amount, 1] },
    );
    io.observe(el);
    return () => { io.disconnect(); window.clearTimeout(timer); };
  }, [amount]);
  return [ref, seen] as const;
}
