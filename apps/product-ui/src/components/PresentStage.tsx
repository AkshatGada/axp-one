"use client";
// Present mode: a 1920x1080 stage scaled to the window, one beat at a time, keyboard driven, optional autoplay.
// Recorded values only; timings here pace the presentation, they are not execution.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Key, Provenance, Wordmark } from "@axp/design-system/ledger";

export type BeatMeta = { id: string; n: number; title: string; steps: number; durationMs: number; exploreHref: string; caption: string };

function beatFromHash(count: number): number {
  if (typeof window === "undefined") return 0;
  const n = Number(window.location.hash.replace("#", ""));
  return Number.isInteger(n) && n >= 1 && n <= count ? n - 1 : 0;
}

export function PresentStage({ beats, views }: { beats: BeatMeta[]; views: ReactNode[] }) {
  const router = useRouter();
  const [beat, setBeat] = useState(0);
  const [step, setStep] = useState(1);
  const [auto, setAuto] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [help, setHelp] = useState(false);
  const [scale, setScale] = useState(0.5);
  const [ready, setReady] = useState(false);
  const viewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setBeat(beatFromHash(beats.length));
    if (params.get("auto") === "1") setAuto(true);
    if (params.get("captions") === "0") setCaptions(false);
    setReady(true);
    const fit = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    fit();
    window.addEventListener("resize", fit);
    const onHash = () => {
      setBeat(beatFromHash(beats.length));
      setStep(1);
    };
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("hashchange", onHash);
    };
  }, [beats.length]);

  useEffect(() => {
    if (!ready) return;
    history.replaceState(history.state, "", `${window.location.pathname}${window.location.search}#${beat + 1}`);
  }, [beat, ready]);

  // Reveal elements marked data-from <= step inside the current view.
  useEffect(() => {
    const root = viewRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>("[data-from]").forEach((el) => {
      const from = Number(el.dataset.from);
      if (from <= step) el.setAttribute("data-shown", "");
      else el.removeAttribute("data-shown");
    });
    root.querySelectorAll<HTMLElement>("[data-show-from]").forEach((el) => {
      el.hidden = Number(el.dataset.showFrom) > step;
    });
    root.querySelectorAll<HTMLElement>("[data-hide-from]").forEach((el) => {
      el.hidden = Number(el.dataset.hideFrom) <= step;
    });
  }, [step, beat]);

  const goBeat = useCallback((b: number) => {
    const j = Math.max(0, Math.min(beats.length - 1, b));
    setBeat(j);
    setStep(1);
  }, [beats.length]);
  const next = useCallback(() => {
    if (step < beats[beat].steps) setStep((s) => s + 1);
    else if (beat < beats.length - 1) goBeat(beat + 1);
    else setAuto(false);
  }, [beat, step, beats, goBeat]);
  const prev = useCallback(() => {
    if (step > 1) setStep((s) => s - 1);
    else if (beat > 0) {
      setBeat(beat - 1);
      setStep(beats[beat - 1].steps);
    }
  }, [beat, step, beats]);

  // Autoplay: a beat's duration is split evenly across its steps.
  useEffect(() => {
    if (!auto || !ready) return;
    const b = beats[beat];
    const t = setTimeout(next, b.durationMs / b.steps);
    return () => clearTimeout(t);
  }, [auto, ready, beat, step, beats, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (k === "ArrowRight" && e.shiftKey) goBeat(beat + 1);
      else if (k === "ArrowRight" || k === " " || k === "PageDown") next();
      else if (k === "ArrowLeft" || k === "PageUp") prev();
      else if (/^[0-9]$/.test(k)) goBeat(k === "0" ? 9 : Number(k) - 1);
      else if (k === "a" || k === "A") setAuto((v) => !v);
      else if (k === "c" || k === "C") setCaptions((v) => !v);
      else if (k === "e" || k === "E") router.push(beats[beat].exploreHref);
      else if (k === "r" || k === "R") {
        goBeat(0);
      } else if (k === "Escape") {
        if (help) setHelp(false);
        else router.push("/");
      } else if (k === "?") setHelp((v) => !v);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [beat, next, prev, goBeat, router, beats, help]);

  const b = beats[beat];
  const elapsed = useMemo(() => beats.slice(0, beat).reduce((n, x) => n + x.durationMs, 0), [beats, beat]);
  const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

  return (
    <div className="lg-present" data-cursor={auto ? "hidden" : undefined}>
      <div className="lg-present-frame pr-frame" style={{ transform: `scale(${scale})` }} onClick={() => !auto && next()}>
        <header className="pr-top">
          <span className="pr-brand">
            <Wordmark />
          </span>
          <span className="pr-title">
            <span className="pr-beatn">
              {b.n} / {beats.length}
            </span>
            {b.title}
          </span>
          <span className="pr-top-r">
            <Provenance kind="replay" />
            <span className="pr-scope">Hosted Solana sandbox · Test USDC · Fictional advertisers</span>
          </span>
        </header>
        <div className="pr-view" ref={viewRef} key={b.id}>
          {views[beat]}
        </div>
        <footer className="lg-present-captions">
          <div className="lg-present-caption" aria-live="polite">
            {captions ? b.caption : <span style={{ color: "var(--stage-muted)" }}>Captions off · press C</span>}
          </div>
          <div className="pr-foot-r">
            <div className="lg-present-ticks" role="tablist" aria-label="Beats">
              {beats.map((x, i) => (
                <button
                  key={x.id}
                  type="button"
                  aria-label={`Beat ${x.n}: ${x.title}`}
                  data-on={i === beat || undefined}
                  data-done={i < beat || undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    goBeat(i);
                  }}
                />
              ))}
            </div>
            <span className="pr-time">
              {mmss(elapsed)} · {auto ? "autoplay" : "manual"} · <span className="pr-k">?</span> keys
            </span>
          </div>
        </footer>
        {help ? (
          <div className="pr-help" onClick={(e) => e.stopPropagation()}>
            <span className="lg-h2" style={{ color: "inherit" }}>Keys</span>
            {[
              [["→", "Space"], "Next step"],
              [["←"], "Back"],
              [["Shift", "→"], "Next beat"],
              [["1", "…", "0"], "Jump to beat"],
              [["A"], "Autoplay on or off"],
              [["C"], "Captions on or off"],
              [["E"], "Open this in the explorer"],
              [["R"], "Restart"],
              [["Esc"], "Leave Present"],
            ].map(([ks, l]) => (
              <span key={String(l)} className="lg-row" style={{ gap: 8 }}>
                {(ks as string[]).map((k) => (
                  <Key key={k}>{k}</Key>
                ))}
                <span>{l as string}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
