"use client";

// True once the element has entered the viewport (and stays true). For starting a short, one-time
// animation with native scrolling; never for pinning. Starts true when motion is off, so stills
// render complete.
import { useEffect, useRef, useState } from "react";

export function useInView<T extends HTMLElement>(margin = "0px 0px -18% 0px") {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (document.documentElement.dataset.pxMotion !== "on") return setSeen(true);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setSeen(true); io.disconnect(); } }, { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return [ref, seen] as const;
}
