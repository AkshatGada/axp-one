"use client";

// One part of the section, with a one-time entrance that is safe on every kind of arrival
// (own copy of the logic in v11/rule/useEntry.ts).
//   no data-entry  whole and at rest: server render, motion off, already on screen, jumped onto,
//                  or reached from below
//   "wait"         below the screen with motion allowed: the entrance is still to come
//   "play"         entering on a normal downward scroll: CSS plays once and ends at rest
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type Entry = "wait" | "play" | undefined;

function useEntry<T extends HTMLElement>(amount = 0.3) {
  const ref = useRef<T>(null);
  const [entry, setEntry] = useState<Entry>(undefined);
  useEffect(() => {
    const el = ref.current;
    if (!el || document.documentElement.dataset.pxMotion !== "on") return;
    if (el.getBoundingClientRect().top <= window.innerHeight * 0.88) return;
    setEntry("wait");
    const share = Math.min(amount, (window.innerHeight * 0.42) / Math.max(1, el.getBoundingClientRect().height));
    let timer = 0;
    let over = false;
    let edged = false;
    const finish = (to: Entry) => {
      if (over) return;
      over = true;
      setEntry(to);
      io.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener("scroll", passed);
    };
    // Jumped clean past: nothing to catch up on.
    const passed = () => {
      if (el.getBoundingClientRect().bottom < 0) finish(undefined);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        if (e.boundingClientRect.top < 0) return finish(undefined);
        // A scroll brings a part in by its edge first; a jump lands it on screen in one step.
        if (e.intersectionRatio >= share) return finish(edged && e.boundingClientRect.top >= window.innerHeight * 0.3 ? "play" : undefined);
        if (e.isIntersecting) {
          edged = true;
          if (!timer) timer = window.setTimeout(() => finish("play"), 700);
        }
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
  }, [amount]);
  return [ref, entry] as const;
}

export default function Seen({ amount = 0.3, className, style, labelledBy, children }: { amount?: number; className?: string; style?: CSSProperties; labelledBy?: string; children: ReactNode }) {
  const [ref, entry] = useEntry<HTMLElement>(amount);
  return (
    <article ref={ref} className={className} style={style} aria-labelledby={labelledBy} data-entry={entry}>
      {children}
    </article>
  );
}
