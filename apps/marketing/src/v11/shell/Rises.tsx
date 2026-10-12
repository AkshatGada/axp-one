"use client";

// Section entrances. Anything marked data-rise that starts below the screen waits, then rises into
// place once as the reader reaches it; things that arrive together follow one another. Whole and
// at rest in every other case (server render, motion off, already on screen, scrolled past).
import { useEffect } from "react";

export default function Rises() {
  useEffect(() => {
    if (document.documentElement.dataset.pxMotion !== "on") return;
    const waiting = [...document.querySelectorAll<HTMLElement>(".v10 [data-rise]")].filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.92);
    const io = new IntersectionObserver(
      (entries) => {
        let n = 0;
        for (const e of [...entries].sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)) {
          const el = e.target as HTMLElement;
          if (!e.isIntersecting && e.boundingClientRect.bottom >= 0) continue;
          io.unobserve(el);
          if (!e.isIntersecting) { el.dataset.state = ""; continue; }
          el.style.setProperty("--rise-d", `${n++ * 90}ms`);
          el.dataset.state = "play";
        }
      },
      { rootMargin: "0px 0px -7% 0px" },
    );
    waiting.forEach((el) => { el.dataset.state = "wait"; io.observe(el); });
    return () => {
      io.disconnect();
      waiting.forEach((el) => { el.dataset.state = ""; });
    };
  }, []);
  return null;
}
