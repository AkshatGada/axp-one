"use client";

// A fixed-size design canvas scaled to fit its container's width (and an optional max height).
// Scenes draw in design pixels; this keeps routes, leader lines and plates in one coordinate space.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export function Fit({ w, h, maxH, children, className, style }: { w: number; h: number; maxH?: number | string; children: ReactNode; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const cw = el.clientWidth;
      let limit = Infinity;
      if (maxH !== undefined) {
        const px = typeof maxH === "number" ? maxH : (parseFloat(maxH) / 100) * window.innerHeight;
        limit = px / h;
      }
      setK(Math.min(cw / w, limit));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h, maxH]);
  return (
    <div ref={ref} className={`sc-fit${className ? ` ${className}` : ""}`} style={{ height: h * k, ...style }}>
      <div className="sc-fit-in" style={{ width: w, height: h, left: `calc(50% - ${(w * k) / 2}px)`, transform: `scale(${k})` }}>
        {children}
      </div>
    </div>
  );
}
