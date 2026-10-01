"use client";
import { useState, type ReactNode } from "react";

/** Segmented tabs whose panels are all server-rendered; only the visible one is shown. */
export function Tabs({ tabs, initial = 0, label }: { tabs: Array<{ key: string; label: ReactNode; panel: ReactNode }>; initial?: number; label: string }) {
  const [i, setI] = useState(initial);
  return (
    <div className="lg-stack">
      <div className="op-tabs" role="tablist" aria-label={label}>
        {tabs.map((t, j) => (
          <button key={t.key} type="button" role="tab" aria-selected={i === j} aria-controls={`panel-${t.key}`} id={`tab-${t.key}`} onClick={() => setI(j)}>
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, j) => (
        <div key={t.key} id={`panel-${t.key}`} role="tabpanel" aria-labelledby={`tab-${t.key}`} hidden={i !== j}>
          {t.panel}
        </div>
      ))}
    </div>
  );
}
