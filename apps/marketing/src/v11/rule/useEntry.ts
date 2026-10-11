"use client";

// A one-time entrance, safe on every kind of arrival.
//   undefined  whole and at rest (server render, motion off, already on screen, reached from below)
//   "wait"     below the screen with motion allowed: the performance is still to come
//   "play"     entering from below: CSS plays the performance once, and it ends in the resting state
// Nothing is ever left waiting: a moment on screen always starts the performance, and a figure the
// reader jumped onto or past (an anchor link, a fast flick, scrolling up from below) is simply whole.
import { useEffect, useRef, useState } from "react";

export type Entry = "wait" | "play" | undefined;

export function useEntry<T extends HTMLElement>(amount = 0.3) {
  const ref = useRef<T>(null);
  const [entry, setEntry] = useState<Entry>(undefined);
  useEffect(() => {
    const el = ref.current;
    if (!el || document.documentElement.dataset.pxMotion !== "on") return;
    if (el.getBoundingClientRect().top <= window.innerHeight * 0.88) return;
    setEntry("wait");
    let timer = 0;
    let over = false;
    const finish = (to: Entry) => {
      if (over) return;
      over = true;
      setEntry(to);
      io.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener("scroll", passed);
    };
    // Jumped clean past (an anchor link, a fast flick): no performance to catch up on.
    const passed = () => {
      if (el.getBoundingClientRect().bottom < 0) finish(undefined);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        if (e.boundingClientRect.top < 0) return finish(undefined);
        // Arrived well inside the screen in one step (a jump, not a scroll): simply whole.
        if (e.intersectionRatio >= amount) return finish(e.boundingClientRect.top < window.innerHeight * 0.5 ? undefined : "play");
        if (e.isIntersecting && !timer) timer = window.setTimeout(() => finish("play"), 700);
      },
      { threshold: [0, amount, 1] },
    );
    io.observe(el);
    window.addEventListener("scroll", passed, { passive: true });
    return () => {
      over = true;
      io.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener("scroll", passed);
    };
  }, [amount]);
  return [ref, entry] as const;
}
