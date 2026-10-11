"use client";

// The river leans a little away from the pointer. Fine pointers only, motion on only; it eases
// with a slow lerp and stops its frame loop once it has settled.
import { useEffect, useRef, type ReactNode } from "react";

export default function Drift({ className, reach = 44, children }: { className?: string; reach?: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const host = el?.closest("section");
    if (!el || !host) return;
    if (document.documentElement.dataset.pxMotion !== "on") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    let raf = 0;
    let x = 0;
    let to = 0;
    const tick = () => {
      x += (to - x) * 0.05;
      el.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      raf = Math.abs(to - x) > 0.08 ? requestAnimationFrame(tick) : 0;
    };
    const move = (e: PointerEvent) => {
      to = (0.5 - e.clientX / window.innerWidth) * reach;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    host.addEventListener("pointermove", move, { passive: true });
    return () => { host.removeEventListener("pointermove", move); cancelAnimationFrame(raf); };
  }, [reach]);
  return <div ref={ref} className={className}>{children}</div>;
}
