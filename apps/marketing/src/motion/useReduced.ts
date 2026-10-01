"use client";

// Reduced motion, read after mount: false during SSR and hydration (so the markup always
// matches), then the visitor's real preference. CSS already renders the still page first.
import { useEffect, useState } from "react";

export default function useReduced() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduce(mq.matches || document.documentElement.dataset.pxMotion !== "on");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduce;
}

/** True when a scene may pin: wide enough (>= 900px) and motion armed. */
export function usePinned() {
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const update = () => setPinned(mq.matches && document.documentElement.dataset.pxMotion === "on");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return pinned;
}
