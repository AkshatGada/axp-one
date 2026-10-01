"use client";
// Guided step-through of one opportunity: J/K (or arrows) move one step, Esc leaves.
// Each step dims the others, draws a route to the app, reveals its values. No count-ups, no spinners.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Key, Provenance, RouteLine, Step } from "@axp/design-system/ledger";

export type StepDef = { id: string; n: number; title: string; target: "answer" | "slot"; slotFrom?: number };
type Ctx = { mode: boolean; active: number; steps: StepDef[]; start: (i?: number) => void; go: (i: number) => void; exit: () => void; revealKey: number };
const C = createContext<Ctx | null>(null);
const useSteps = () => {
  const c = useContext(C);
  if (!c) throw new Error("StepThrough missing");
  return c;
};

function reduced() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function StepThrough({ steps, children }: { steps: StepDef[]; children: ReactNode }) {
  const [mode, setMode] = useState(false);
  const [active, setActive] = useState(0);
  const [revealKey, setRevealKey] = useState(0);
  const scrollTo = useCallback((i: number) => {
    const el = document.getElementById(steps[i].id);
    if (!el) return;
    el.scrollIntoView({ block: "start", behavior: reduced() ? "auto" : "smooth" });
    history.replaceState(history.state, "", `#${steps[i].id}`);
  }, [steps]);
  const go = useCallback((i: number) => {
    const j = Math.max(0, Math.min(steps.length - 1, i));
    setActive(j);
    setRevealKey((k) => k + 1);
    scrollTo(j);
  }, [steps.length, scrollTo]);
  const start = useCallback((i = 0) => {
    setMode(true);
    go(i);
  }, [go]);
  const exit = useCallback(() => setMode(false), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "j" || e.key === "J" || (mode && e.key === "ArrowDown")) {
        e.preventDefault();
        if (!mode) start(0);
        else go(active + 1);
      } else if ((e.key === "k" || e.key === "K" || (mode && e.key === "ArrowUp")) && mode) {
        e.preventDefault();
        go(active - 1);
      } else if (e.key === "Escape" && mode) {
        exit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, active, start, go, exit]);
  const value = useMemo(() => ({ mode, active, steps, start, go, exit, revealKey }), [mode, active, steps, start, go, exit, revealKey]);
  const cur = steps[active];
  return (
    <C.Provider value={value}>
      {children}
      <RouteLine active={mode} from={cur ? `#${cur.id} [data-step-node]` : null} to={cur ? `[data-route-target="${cur.target}"]` : null} replayKey={`${active}-${revealKey}`} />
    </C.Provider>
  );
}

export function StartButton({ label = "Step through" }: { label?: string }) {
  const { mode, start, exit } = useSteps();
  return (
    <span className="lg-row" style={{ gap: 10 }}>
      <button type="button" className="lg-btn" onClick={() => (mode ? exit() : start(0))}>
        {mode ? "Leave step-through" : label}
      </button>
      <span className="lg-keyhint">
        <Key>J</Key>
        <Key>K</Key>
        <span>step</span>
      </span>
    </span>
  );
}

export function ReplayChip() {
  const { mode, active, steps, go, exit } = useSteps();
  if (!mode) return null;
  return (
    <div className="lg-replay-chip" role="status" aria-live="polite">
      <span className="lg-row" style={{ gap: 12 }}>
        <Provenance kind="replay" label="Replaying recorded run" />
        <span>
          step {active + 1} of {steps.length}: {steps[active].title}
        </span>
      </span>
      <span className="lg-row" style={{ gap: 6 }}>
        <button type="button" onClick={() => go(active - 1)} disabled={active === 0} aria-label="Previous step">
          Back <Key>K</Key>
        </button>
        <button type="button" onClick={() => go(active + 1)} disabled={active === steps.length - 1} aria-label="Next step">
          Next <Key>J</Key>
        </button>
        <button type="button" onClick={exit} aria-label="Leave step-through">
          Done <Key>Esc</Key>
        </button>
      </span>
    </div>
  );
}

/** A step that knows whether it is the active one in step-through. Its content stays server-rendered. */
export function StepShell({ index, id, n, title, explain, aside, children, collapsed }: { index: number; id: string; n: number; title: string; explain?: ReactNode; aside?: ReactNode; children?: ReactNode; collapsed?: boolean }) {
  const { mode, active, revealKey } = useSteps();
  const isActive = mode && active === index;
  return (
    <Step n={n} id={id} title={title} explain={explain} aside={aside} active={isActive} dim={mode && !isActive} collapsed={collapsed}>
      <div key={isActive ? `r${revealKey}` : "static"} className={isActive ? "lg-reveal" : undefined} style={{ display: "grid", gap: 14 }}>
        {children}
      </div>
    </Step>
  );
}

/** The Sponsored slot in the app: dashed and waiting before delivery, the card after, in step-through. */
export function SlotSwitch({ card, awaiting, deliveredFrom }: { card: ReactNode; awaiting: ReactNode; deliveredFrom: number }) {
  const { mode, active } = useSteps();
  if (!mode) return <>{card}</>;
  return active >= deliveredFrom ? <div key="card" className="lg-ad-enter">{card}</div> : <>{awaiting}</>;
}
