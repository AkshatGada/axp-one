"use client";

// The masthead: wordmark, three anchors and the advertiser action. It leaves on the way down and returns on the way up,
// and takes the ultramarine spread's colours while a [data-masthead="blue"] element sits under it.
import { useEffect, useRef, useState } from "react";
import { Action } from "../kit";
import { ADVERTISER_URL, NAV } from "../copy";
import s from "./shell.module.css";

export default function Masthead() {
  const [hidden, setHidden] = useState(false);
  const [raised, setRaised] = useState(false);
  const [blue, setBlue] = useState(false);
  const last = useRef(0);
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const outside = (e: PointerEvent) => { if (menu.current && !menu.current.contains(e.target as Node)) menu.current.open = false; };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (menu.current?.open) { menu.current.open = false; menu.current.querySelector("summary")?.focus(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", esc); };
  }, []);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = 0;
      const y = window.scrollY;
      const dy = y - last.current;
      if (Math.abs(dy) > 4) { setHidden(dy > 0 && y > 160); last.current = y; }
      setRaised(y > 8);
      let on = false;
      document.querySelectorAll<HTMLElement>('[data-masthead="blue"]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top <= 34 && r.bottom >= 34) on = true;
      });
      setBlue(on);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener("scroll", on, { passive: true });
    return () => { window.removeEventListener("scroll", on); cancelAnimationFrame(raf); };
  }, []);

  return (
    <header className={s.mast} data-hidden={hidden ? "" : undefined} data-raised={raised ? "" : undefined} data-tone={blue ? "blue" : undefined} data-on-blue={blue ? "" : undefined} onFocusCapture={() => setHidden(false)}>
      <a className={s.skip} href="#main">Skip to content</a>
      <div className={`x-wrap ${s.mastIn}`}>
        <a className={s.word} href="#top" aria-label="axp.one, back to top">
          axp<i aria-hidden />one
        </a>
        <nav className={s.nav} aria-label="Sections">
          {NAV.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
          <a href="/account/">Sign in</a>
        </nav>
        <details className={s.menu} ref={menu}>
          <summary>Menu</summary>
          <nav className={s.menuNav} aria-label="Sections">
            <a href="/account/">Sign in</a>
            {NAV.map((l) => <a key={l.href} href={l.href} onClick={() => { if (menu.current) menu.current.open = false; }}>{l.label}</a>)}
          </nav>
        </details>
        <div className={s.cta}>
          <Action href={ADVERTISER_URL} size="s" tone={blue ? "white" : "ink"}><span className={s.ctaLong}>Advertiser dashboard</span><span className={s.ctaShort} aria-label="Advertiser dashboard">Dashboard</span></Action>
        </div>
      </div>
    </header>
  );
}
