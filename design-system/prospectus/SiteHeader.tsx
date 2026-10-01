"use client";

// The page header: wordmark, the Hackathon MVP chip, section anchors and the one ink action.
// It hides while you scroll down, returns when you scroll up, and flips to the stage colours
// while a [data-header-tone] section (stage, brand, ch, sol) sits under it.
import { useEffect, useRef, useState } from "react";
import { ActionPrimary } from "./Actions";
import { Wordmark } from "./Type";

export type NavLink = { href: string; label: string };
type Tone = "paper" | "stage" | "brand" | "ch" | "sol";
const TONES: Tone[] = ["stage", "brand", "ch", "sol"];

export function SiteHeader({ links, cta, chip = "Hackathon MVP" }: { links: NavLink[]; cta: { href: string; label: string; external?: boolean }; chip?: string }) {
  const [hidden, setHidden] = useState(false);
  const [tone, setTone] = useState<Tone>("paper");
  const last = useRef(0);

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
      const probe = 36;
      let next: Tone = "paper";
      document.querySelectorAll<HTMLElement>("[data-header-tone]").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top <= probe && r.bottom >= probe) next = TONES.find((x) => x === el.dataset.headerTone) ?? "stage";
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

  return (
    <header className="px-header" data-hidden={hidden ? "" : undefined} data-tone={tone === "paper" ? undefined : tone} onFocusCapture={() => setHidden(false)}>
      <a className="px-skip" href="#main">
        Skip to content
      </a>
      <div className="px-wrap px-header-in">
        <a className="px-wordmark" href="#top" aria-label="axp.one, back to top">
          <Wordmark />
        </a>
        <span className="px-chip">{chip}</span>
        <nav className="px-nav" aria-label="Sections">
          {links.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="px-header-cta">
          <ActionPrimary href={cta.href} size="s" external={cta.external}>
            {cta.label}
          </ActionPrimary>
        </div>
      </div>
    </header>
  );
}
