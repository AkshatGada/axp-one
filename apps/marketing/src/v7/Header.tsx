"use client";

// The landing header: wordmark, the story's anchors, one link out to ContextHint (described on
// hover and on keyboard focus), and the demo action. It hides on the way down, returns on the way
// up, and takes the colours of the blue sections while one sits under it.
import { useEffect, useId, useRef, useState } from "react";
import { ActionPrimary, Wordmark } from "@axp/design-system/prospectus";
import { CONTEXTHINT_LINK, HEADER, NAV, PUBLISHER_URL } from "@/data/copy";
import s from "./header.module.css";

type Tone = "paper" | "stage" | "brand";

export default function Header() {
  const [hidden, setHidden] = useState(false);
  const [tone, setTone] = useState<Tone>("paper");
  const last = useRef(0);
  const menu = useRef<HTMLDetailsElement>(null);
  const tip = useId();

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector("summary")?.focus();
      }
      // Escape also dismisses the ContextHint description while it is hovered or focused.
      document.querySelector<HTMLElement>(`.${s.ch}`)?.setAttribute("data-dismissed", "");
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = 0;
      const y = window.scrollY;
      const dy = y - last.current;
      if (Math.abs(dy) > 4) {
        setHidden(dy > 0 && y > 160);
        last.current = y;
      }
      let next: Tone = "paper";
      document.querySelectorAll<HTMLElement>("[data-header-tone]").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top <= 36 && r.bottom >= 36) next = el.dataset.headerTone === "brand" ? "brand" : "stage";
      });
      setTone(next);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const undismiss = (e: { currentTarget: HTMLElement }) => e.currentTarget.removeAttribute("data-dismissed");
  const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

  return (
    <header className={`px-header ${s.header}`} data-hidden={hidden ? "" : undefined} data-tone={tone === "paper" ? undefined : tone} onFocusCapture={() => setHidden(false)}>
      <a className="px-skip" href="#main">
        Skip to content
      </a>
      <div className="px-wrap px-header-in">
        <a className="px-wordmark" href="#top" aria-label="axp.one, back to top">
          <Wordmark />
        </a>
        <nav className="px-nav" aria-label="Sections">
          {NAV.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
          <span className={s.ch} onPointerEnter={undismiss} onFocusCapture={undismiss}>
            <a href={CONTEXTHINT_LINK.href} aria-describedby={tip} {...ext}>
              {CONTEXTHINT_LINK.label}
              <span className={s.out} aria-hidden>
                ↗
              </span>
            </a>
            <span id={tip} role="tooltip" className={s.tip}>
              {CONTEXTHINT_LINK.description}
            </span>
          </span>
        </nav>
        <details className="px-mobile-menu" ref={menu}>
          <summary>Menu</summary>
          <nav className="px-mobile-nav" aria-label="Sections">
            {NAV.map((l) => (
              <a key={l.href} href={l.href} onClick={() => { if (menu.current) menu.current.open = false; }}>
                {l.label}
              </a>
            ))}
            <a className={s.mch} href={CONTEXTHINT_LINK.href} {...ext}>
              <span>{CONTEXTHINT_LINK.label} <span aria-hidden>↗</span></span>
              <small>{CONTEXTHINT_LINK.description}</small>
            </a>
          </nav>
        </details>
        <div className="px-header-cta">
          <ActionPrimary href={PUBLISHER_URL} size="s">
            {HEADER.cta}
          </ActionPrimary>
        </div>
      </div>
    </header>
  );
}
