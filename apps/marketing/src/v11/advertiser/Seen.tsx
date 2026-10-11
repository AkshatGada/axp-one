"use client";

// A wrapper that marks itself [data-seen] once it has entered the view (kit useInView, with its
// fail safe), so server-rendered children can perform once in CSS. Also a small non-latching
// on-screen hook, used to rest the one looping figure while it is out of sight.
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useInView } from "../kit";

export default function Seen({ as = "div", amount = 0.4, className, children }: { as?: "div" | "ol" | "header"; amount?: number; className?: string; children: ReactNode }) {
  const [ref, seen] = useInView<HTMLElement>(amount);
  const Tag = as as "div";
  return (
    <Tag ref={ref as RefObject<HTMLDivElement | null>} className={className} data-seen={seen ? "" : undefined}>
      {children}
    </Tag>
  );
}

/** True while the element is on screen (and the tab is visible). Starts true so nothing waits on it. */
export function useOnScreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let inside = true;
    const update = () => setOn(inside && document.visibilityState !== "hidden");
    const io = new IntersectionObserver(([e]) => { if (e) { inside = e.isIntersecting; update(); } }, { rootMargin: "10% 0px" });
    io.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);
  return [ref, on] as const;
}
