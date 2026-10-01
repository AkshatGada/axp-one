"use client";
// Opportunity controller: the pipeline stepper drives one stage at a time (J/K, ←/→, click, URL hash per stage),
// or "Show all stages" stacks every panel for scrolling. The app's Sponsored slot follows the stage.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Ld } from "@axp/design-system/ledger";

type Ctx = { active: number; all: boolean; setActive: (i: number) => void; setAll: (v: boolean) => void; ids: string[]; deliveredFrom: number };
const C = createContext<Ctx | null>(null);
const use = () => {
  const c = useContext(C);
  if (!c) throw new Error("OpportunityProvider missing");
  return c;
};

export function OpportunityProvider({ ids, deliveredFrom, children }: { ids: string[]; deliveredFrom: number; children: ReactNode }) {
  const [active, setA] = useState(0);
  const [all, setAllS] = useState(false);
  useEffect(() => {
    const read = () => {
      const h = window.location.hash.replace("#", "");
      const i = ids.indexOf(h);
      if (i >= 0) setA(i);
      if (new URLSearchParams(window.location.search).get("all") === "1") setAllS(true);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [ids]);
  const setActive = useCallback(
    (i: number) => {
      const j = Math.max(0, Math.min(ids.length - 1, i));
      setA(j);
      history.replaceState(history.state, "", `${window.location.pathname}${window.location.search}#${ids[j]}`);
      if (all) document.getElementById(`stage-${ids[j]}`)?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    },
    [ids, all],
  );
  const setAll = useCallback((v: boolean) => {
    setAllS(v);
    const u = new URL(window.location.href);
    if (v) u.searchParams.set("all", "1");
    else u.searchParams.delete("all");
    history.replaceState(history.state, "", u.toString());
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "j" || e.key === "J" || e.key === "ArrowRight") setActive(active + 1);
      else if (e.key === "k" || e.key === "K" || e.key === "ArrowLeft") setActive(active - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, setActive]);
  const value = useMemo(() => ({ active, all, setActive, setAll, ids, deliveredFrom }), [active, all, setActive, setAll, ids, deliveredFrom]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function PipelineBar({ stages }: { stages: Ld.PipeStage[] }) {
  const { active, setActive, all, setAll } = use();
  return (
    <div className="ld-stack" style={{ gap: 10 }}>
      <Ld.Pipeline stages={stages} active={active} onSelect={setActive} keys={false} />
      <div className="ld-between">
        <span className="ld-row" style={{ gap: 6 }}>
          <Ld.Key>J</Ld.Key>
          <Ld.Key>K</Ld.Key>
          <span className="ld-caption">next and previous stage · stage {active + 1} of {stages.length}</span>
        </span>
        <div className="ld-seg" role="group" aria-label="View">
          <button type="button" aria-pressed={!all} onClick={() => setAll(false)}>
            One stage
          </button>
          <button type="button" aria-pressed={all} onClick={() => setAll(true)}>
            Show all stages
          </button>
        </div>
      </div>
    </div>
  );
}

export function StageView({ panels }: { panels: ReactNode[] }) {
  const { active, all, ids } = use();
  return (
    <div className="ld-stack" style={{ gap: 16 }}>
      {panels.map((p, i) => (
        <div key={ids[i]} id={`stage-${ids[i]}`} className="op2-stage" hidden={!all && i !== active} data-active={i === active || undefined}>
          <div key={!all && i === active ? `a${active}` : "s"} className={!all && i === active ? "ld-chart-reveal" : undefined}>
            {p}
          </div>
        </div>
      ))}
    </div>
  );
}

/** The Sponsored slot in the app: waiting until the delivery stage in one-stage view; the card otherwise. */
export function SlotV2({ card, awaiting }: { card: ReactNode; awaiting: ReactNode }) {
  const { active, all, deliveredFrom } = use();
  if (all || active >= deliveredFrom) return <div key="card" className="ld-ad-enter">{card}</div>;
  return <>{awaiting}</>;
}

export function StageNav({ total }: { total: number }) {
  const { active, setActive } = use();
  return (
    <div className="ld-row" style={{ gap: 8 }}>
      <Ld.Button variant="secondary" size="sm" disabled={active === 0} onClick={() => setActive(active - 1)}>
        Previous stage
      </Ld.Button>
      <Ld.Button size="sm" disabled={active === total - 1} onClick={() => setActive(active + 1)}>
        Next stage
      </Ld.Button>
    </div>
  );
}
