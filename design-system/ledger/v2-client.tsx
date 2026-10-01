"use client";
// Interactive Ledger v2 controls. Real state, no fake execution.
import { useEffect, useRef, useState, type ReactNode } from "react";

export type PipeStage = { id: string; label: string; value: ReactNode; status: "done" | "skipped" | "upcoming" };
/** Pipeline stepper: Moment to Charge. Click or J/K to move; the parent decides what each stage shows. */
export function Pipeline({ stages, active, onSelect, keys = true }: { stages: PipeStage[]; active?: number; onSelect?: (i: number) => void; keys?: boolean }) {
  const [own, setOwn] = useState(active ?? 0);
  const cur = active ?? own;
  const pick = (i: number) => {
    const j = Math.max(0, Math.min(stages.length - 1, i));
    if (onSelect) onSelect(j);
    else setOwn(j);
  };
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!keys) return;
    const el = ref.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "j") pick(cur + 1);
      else if (e.key === "ArrowLeft" || e.key === "k") pick(cur - 1);
      else return;
      e.preventDefault();
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  });
  return (
    <div className="ld-pipe" ref={ref} role="tablist" aria-label="Pipeline" style={{ ["--n" as string]: stages.length }}>
      {stages.map((s, i) => (
        <button key={s.id} type="button" role="tab" className="ld-pipe-step" data-status={s.status} aria-current={i === cur ? "step" : undefined} aria-selected={i === cur} onClick={() => pick(i)}>
          <span className="ld-pipe-top">
            <span className="ld-pipe-ix">{s.status === "done" && i !== cur ? "✓" : i + 1}</span>
            {s.label}
          </span>
          <span className="ld-pipe-v">{s.status === "upcoming" ? "Upcoming" : s.value}</span>
        </button>
      ))}
    </div>
  );
}

export function Segmented({ options, initial = 0, label }: { options: string[]; initial?: number; label: string }) {
  const [i, setI] = useState(initial);
  return (
    <div className="ld-seg" role="group" aria-label={label}>
      {options.map((o, j) => (
        <button key={o} type="button" aria-pressed={i === j} onClick={() => setI(j)}>
          {o}
        </button>
      ))}
    </div>
  );
}

export function Tabs({ tabs, initial = 0, label }: { tabs: Array<{ key: string; label: ReactNode; count?: ReactNode; panel: ReactNode }>; initial?: number; label: string }) {
  const [i, setI] = useState(initial);
  return (
    <div className="ld-stack" style={{ gap: 12 }}>
      <div className="ld-tabs" role="tablist" aria-label={label}>
        {tabs.map((t, j) => (
          <button key={t.key} type="button" role="tab" aria-selected={i === j} onClick={() => setI(j)}>
            {t.label}
            {t.count !== undefined ? <span className="ld-tab-n">{t.count}</span> : null}
          </button>
        ))}
      </div>
      {tabs.map((t, j) => (
        <div key={t.key} role="tabpanel" hidden={i !== j}>
          {t.panel}
        </div>
      ))}
    </div>
  );
}

export function Toggle({ label, initial = false, disabled }: { label: ReactNode; initial?: boolean; disabled?: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <button type="button" role="switch" aria-checked={on} className="ld-toggle" data-on={on || undefined} disabled={disabled} onClick={() => setOn((v) => !v)} style={{ border: 0, background: "none", padding: 0, font: "inherit", opacity: disabled ? 0.45 : 1 }}>
      <span className="ld-toggle-track" aria-hidden />
      <span>{label}</span>
    </button>
  );
}

export function Checkbox({ label, initial = false }: { label: ReactNode; initial?: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <button type="button" role="checkbox" aria-checked={on} className="ld-check" data-on={on || undefined} onClick={() => setOn((v) => !v)} style={{ border: 0, background: "none", padding: 0, font: "inherit" }}>
      <span className="ld-check-box" aria-hidden>
        ✓
      </span>
      <span>{label}</span>
    </button>
  );
}

/** Re-mounts its children on Replay so a chart or card reveal can be watched again. */
export function RevealOnView({ children, label = "Replay", caption }: { children: ReactNode; label?: string; caption?: ReactNode }) {
  const [k, setK] = useState(0);
  return (
    <div className="ld-stack">
      <div key={k}>{children}</div>
      <div className="ld-between">
        <span className="ld-caption">{caption}</span>
        <button type="button" className="ld-btn ld-btn--secondary ld-btn--sm" onClick={() => setK((x) => x + 1)}>
          {label}
        </button>
      </div>
    </div>
  );
}
