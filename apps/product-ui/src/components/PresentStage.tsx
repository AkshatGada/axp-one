"use client";
// Present mode: a 1920x1080 stage scaled to the window, one beat at a time, keyboard driven, optional autoplay.
// Recorded values only; timings here pace the presentation, they are not execution.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Key, Provenance, Wordmark } from "@axp/design-system/ledger";

export type BeatMeta = { id: string; n: number; title: string; steps: number; durationMs: number; exploreHref: string; caption: string };

function beatFromHash(count: number): number {
  if (typeof window === "undefined") return 0;
  const n = Number(window.location.hash.replace("#", ""));
  return Number.isInteger(n) && n >= 1 && n <= count ? n - 1 : 0;
}

export function PresentStage({ beats, views, scope, phrase }: { beats: BeatMeta[]; views: ReactNode[]; scope: string; phrase?: string }) {
  const router = useRouter();
  const [beat, setBeat] = useState(0);
  const [step, setStep] = useState(1);
  const [auto, setAuto] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [help, setHelp] = useState(false);
  const [scale, setScale] = useState(0.5);
  const [ready, setReady] = useState(false);
  const [small, setSmall] = useState(false);
  const [tall, setTall] = useState(false);
  const [fitted, setFitted] = useState(false);
  const viewRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setBeat(beatFromHash(beats.length));
    if (params.get("auto") === "1") setAuto(true);
    if (params.get("captions") === "0") setCaptions(false);
    setReady(true);
    const fit = () => {
      setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
      setSmall(window.innerWidth < 700);
      // Taller than 16:9: pin the frame to the top so the spare height sits under the dark caption bar, not above the header.
      setTall(window.innerHeight / window.innerWidth > 1080 / 1920 + 0.001);
    };
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

  const applyStep = useCallback((root: HTMLElement, st: number) => {
    root.querySelectorAll<HTMLElement>("[data-from]").forEach((el) => {
      if (Number(el.dataset.from) <= st) el.setAttribute("data-shown", "");
      else el.removeAttribute("data-shown");
    });
    root.querySelectorAll<HTMLElement>("[data-show-from]").forEach((el) => {
      el.hidden = Number(el.dataset.showFrom) > st;
    });
    root.querySelectorAll<HTMLElement>("[data-hide-from]").forEach((el) => {
      el.hidden = Number(el.dataset.hideFrom) <= st;
    });
  }, []);

  // Fill the 16:9 frame: lay the beat out in its final state, pick the largest surface scale that fits, then
  // return to the current step. The scale stays in a narrow band (1.6x to 1.9x) so type size is steady between
  // beats; sparse beats carry more content rather than bigger type. Below 1.6x only as an overflow guard.
  useLayoutEffect(() => {
    const root = fitRef.current;
    const box = viewRef.current;
    if (!root || !box || small) return;
    applyStep(root, 99);
    const cs = getComputedStyle(box);
    const k = box.getBoundingClientRect().height / box.offsetHeight; // the frame's transform scale
    const availH = (box.offsetHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) * k;
    let z = 1.3;
    for (let t = 1.9; t >= 1.3; t -= 0.05) {
      root.style.zoom = String(t);
      if (root.getBoundingClientRect().height <= availH + 1 && root.scrollWidth <= root.clientWidth + 1) {
        z = t;
        break;
      }
    }
    root.style.zoom = String(z);
    root.dataset.zoom = z.toFixed(2);
    applyStep(root, step);
    setFitted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat, small, ready]);

  // Reveal elements marked data-from <= step inside the current view.
  useEffect(() => {
    const root = fitRef.current;
    if (!root) return;
    applyStep(root, step);
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

  // Autoplay: extra steps arrive about 3 s apart, so no slide sits half-built; the last step holds the rest of the beat.
  const STEP_MS = 3000;
  useEffect(() => {
    if (!auto || !ready) return;
    const b = beats[beat];
    const t = setTimeout(next, step < b.steps ? STEP_MS : b.durationMs - STEP_MS * (b.steps - 1));
    return () => clearTimeout(t);
  }, [auto, ready, beat, step, beats, next]);

  // Elapsed time: the beat's start plus time spent on it (capped at its length), ticking.
  const [beatStart, setBeatStart] = useState(0);
  const [now, setNow] = useState(0);
  useEffect(() => {
    setBeatStart(Date.now());
    setNow(Date.now());
  }, [beat]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (k === "ArrowRight" && e.shiftKey) goBeat(beat + 1);
      else if (k === "ArrowRight" || k === " " || k === "PageDown") next();
      else if (k === "ArrowLeft" || k === "PageUp") prev();
      else if (/^[0-9]$/.test(k)) goBeat(k === "0" ? 9 : Number(k) - 1);
      else if (k === "-") goBeat(beats.length - 1);
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
  const startOfBeat = useMemo(() => beats.slice(0, beat).reduce((n, x) => n + x.durationMs, 0), [beats, beat]);
  const elapsed = startOfBeat + Math.min(Math.max(0, now - beatStart), beats[beat].durationMs);
  const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

  if (small)
    return (
      <div className="ld pr-small">
        <div className="ld-panel" style={{ padding: 20, display: "grid", gap: 10, maxWidth: 420 }}>
          <span className="ld-card-title">Present mode is designed for a laptop or larger screen</span>
          <span className="ld-secondary">It plays the recorded run as a 16:9 slideshow with captions. On a phone, the explorer pages show the same records.</span>
          <Link className="ld-btn ld-btn--primary" href="/">
            Go to the Overview
          </Link>
        </div>
      </div>
    );
  return (
    <div className="lg-present" data-cursor={auto ? "hidden" : undefined}>
      <div className="lg-present-frame pr-frame ld" style={{ top: tall ? 0 : "50%", transformOrigin: tall ? "50% 0" : "50% 50%", transform: `translate(-50%, ${tall ? "0" : "-50%"}) scale(${scale})`, visibility: ready && fitted ? "visible" : "hidden" }} onClick={() => !auto && next()}>
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
            <Provenance kind="replay" label={phrase} />
            <span className="pr-scope">{scope}</span>
          </span>
        </header>
        <div className="pr-view" ref={viewRef} key={b.id}>
          <div className="pr-fit" ref={fitRef}>
            {views[beat]}
          </div>
        </div>
        <footer className="lg-present-captions">
          <div className="lg-present-caption" aria-live="polite">
            {captions ? b.caption : <span style={{ color: "var(--stage-muted)" }}>Captions off. Press C</span>}
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
            {!auto ? (
              <span className="pr-cue" aria-live="polite">
                {step < b.steps ? (
                  <>
                    Press <Key>→</Key> or <Key>Space</Key> for the next part ({step} of {b.steps})
                  </>
                ) : beat < beats.length - 1 ? (
                  <>
                    Press <Key>→</Key> or <Key>Space</Key> to continue
                  </>
                ) : (
                  <>
                    The end. Press <Key>R</Key> to restart or <Key>Esc</Key> to leave
                  </>
                )}
              </span>
            ) : null}
            <span className="pr-time">
              {mmss(elapsed)}, {auto ? "autoplay" : "manual"}, <span className="pr-k">?</span> for keys
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
              [["1", "…", "0", "-"], "Jump to beat (- is the last)"],
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
