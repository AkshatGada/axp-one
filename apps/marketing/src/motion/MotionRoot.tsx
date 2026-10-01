"use client";

// Arms the page's motion system. The inline MOTION_SCRIPT has already set html[data-px-motion]
// before paint (so nothing flashes); this confirms it after hydration, reveals [data-reveal]
// elements as they enter the view, and runs Lenis smooth scrolling on fine pointers.
// Under reduced motion, ?still=1, or below the fold without JS, everything is already final.
import { useEffect, useLayoutEffect } from "react";

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

declare global {
  interface Window {
    __lenis?: { scrollTo: (target: number | string | HTMLElement, opts?: Record<string, unknown>) => void; raf: (t: number) => void; destroy: () => void };
  }
}

export default function MotionRoot() {
  useIso(() => {
    const html = document.documentElement;
    const q = new URLSearchParams(location.search);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || q.has("still");
    html.dataset.pxMotion = reduce ? "off" : "on";
    html.dataset.pxReady = "1";
    if (q.has("still")) html.dataset.pxStill = "1";
    if (q.has("film")) html.dataset.pxFilm = "1";
  }, []);

  useEffect(() => {
    if (document.documentElement.dataset.pxMotion !== "on") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.in = "";
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0 },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      if (!el.closest("[data-manual]")) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (document.documentElement.dataset.pxMotion !== "on") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    let raf = 0;
    let cancelled = false;
    void import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      document.documentElement.style.scrollBehavior = "auto";
      const lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 0.95, smoothWheel: true, anchors: true });
      window.__lenis = lenis as unknown as Window["__lenis"];
      const loop = (t: number) => {
        lenis.raf(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.__lenis?.destroy();
      window.__lenis = undefined;
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);

  return null;
}

/** Inline, before paint: arm motion unless the visitor asked for less (or ?still=1); disarm
 *  if the page never hydrates, so a broken bundle can never leave content hidden. */
export const MOTION_SCRIPT = `(function(){var d=document.documentElement;try{var s=location.search.indexOf("still=1")>-1;d.dataset.pxMotion=(s||matchMedia("(prefers-reduced-motion: reduce)").matches)?"off":"on"}catch(e){d.dataset.pxMotion="off"}setTimeout(function(){if(!d.dataset.pxReady)d.dataset.pxMotion="off"},4500)})();`;
