"use client";

// A one-time entrance, safe on every kind of arrival.
//   undefined  whole and at rest (server render, motion off, already on screen, reached from below)
//   "wait"     below the screen with motion allowed: the performance is still to come
//   "play"     entering from below: CSS plays the performance once, and it ends in the resting state
// Nothing is ever left waiting: a moment on screen always starts the performance, and a figure the
// reader jumped onto or past (an anchor link, a fast flick, scrolling up from below) is simply whole.
import { useEffect, useRef, useState } from "react";

export type Entry = "wait" | "play" | undefined;

/** `linger`: how long a part of the element may sit on screen, short of `amount`, before it plays anyway. */
export function useEntry<T extends HTMLElement>(amount = 0.3, linger = 700) {
  const ref = useRef<T>(null);
  const [entry, setEntry] = useState<Entry>(undefined);
  useEffect(() => {
    const el = ref.current;
    if (!el || document.documentElement.dataset.pxMotion !== "on") return;
    if (el.getBoundingClientRect().top <= window.innerHeight * 0.88) return;
    setEntry("wait");
    // A tall element (a phone's long column) can never show `amount` of itself while its top is
    // still in the lower half of the screen, so the share asked for is capped to what can be.
    const share = Math.min(amount, (window.innerHeight * 0.42) / Math.max(1, el.getBoundingClientRect().height));
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
        if (e.intersectionRatio >= share) return finish(e.boundingClientRect.top < window.innerHeight * 0.5 ? undefined : "play");
        if (e.isIntersecting && !timer) timer = window.setTimeout(() => finish("play"), linger);
      },
      { threshold: [0, share, 1] },
    );
    io.observe(el);
    window.addEventListener("scroll", passed, { passive: true });
    return () => {
      over = true;
      io.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener("scroll", passed);
    };
  }, [amount, linger]);
  return [ref, entry] as const;
}
