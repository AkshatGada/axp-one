"use client";
// Opportunity controller: the pipeline stepper drives one stage at a time (J/K, ←/→, click, URL hash per stage),
// or "Show all stages" stacks every panel for scrolling. The app's Sponsored slot follows the stage.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
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
    // The stage follows the URL hash: deep links, Back/Forward and in-page #stage links all move it.
    const read = () => {
      const h = window.location.hash.replace("#", "");
      const i = ids.indexOf(h);
      if (i >= 0) {
        setA(i);
        document.documentElement.dataset.opStage = ids[i];
      } else {
        setA(0);
        document.documentElement.removeAttribute("data-op-stage");
      }
      const wantAll = new URLSearchParams(window.location.search).get("all") === "1";
      setAllS(wantAll);
      document.documentElement.classList.toggle("op-all", wantAll);
    };
    read();
    window.addEventListener("hashchange", read);
    window.addEventListener("popstate", read);
    return () => {
      window.removeEventListener("hashchange", read);
      window.removeEventListener("popstate", read);
      document.documentElement.removeAttribute("data-op-stage");
      document.documentElement.classList.remove("op-all");
    };
  }, [ids]);
  const setActive = useCallback(
    (i: number) => {
      const j = Math.max(0, Math.min(ids.length - 1, i));
      setA(j);
      document.documentElement.dataset.opStage = ids[j];
      if (window.location.hash !== `#${ids[j]}`) history.pushState(history.state, "", `${window.location.pathname}${window.location.search}#${ids[j]}`);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (all) document.getElementById(`stage-${ids[j]}`)?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
      else {
        // On a tall stage the next one starts at the top of the stage area, under the sticky stepper.
        const el = document.getElementById(`stage-${ids[j]}`);
        const top = el ? el.getBoundingClientRect().top : 0;
        if (el && top < 0) el.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
      }
    },
    [ids, all],
  );
  const setAll = useCallback((v: boolean) => {
    setAllS(v);
    document.documentElement.classList.toggle("op-all", v);
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
  // In one-stage view, later stages stay unrevealed until reached.
  const shown = stages.map((s, i) => (!all && i > active && s.status === "done" ? { ...s, status: "upcoming" as const } : s));
  return (
    <>
      <div className="op2-pipe">
        <Ld.Pipeline stages={shown} active={active} onSelect={setActive} keys={false} />
      </div>
      <div className="ld-between">
        <span className="ld-row" style={{ gap: 6 }}>
          <Ld.Key>J</Ld.Key>
          <Ld.Key>K</Ld.Key>
          <span className="ld-caption op2-keyhint">next and previous stage, stage {active + 1} of {stages.length}</span>
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
    </>
  );
}

export function StageView({ panels }: { panels: ReactNode[] }) {
  const { active, all, ids } = use();
  return (
    <div className="ld-stack" style={{ gap: 16 }}>
      {panels.map((p, i) => (
        <div key={ids[i]} id={`stage-${ids[i]}`} data-id={ids[i]} className="op2-stage" hidden={!all && i !== active} data-active={i === active || undefined}>
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
  const showCard = all || active >= deliveredFrom;
  return (
    <>
      <div data-slot="card" hidden={!showCard} className={showCard ? "ld-ad-enter" : undefined}>
        {card}
      </div>
      <div data-slot="await" hidden={showCard}>
        {awaiting}
      </div>
    </>
  );
}

/** Runs before first paint: applies ?all=1 and #stage so the server HTML does not jump on hydration. */
export const OPP_BOOT = `(function(){try{var d=document.documentElement;if(new URLSearchParams(location.search).get("all")==="1")d.classList.add("op-all");var h=location.hash.slice(1);if(["moment","eligibility","evidence","decisions","auction","award","delivery","receipt","charge","nofill"].indexOf(h)>=0)d.setAttribute("data-op-stage",h);}catch(e){}})();`;

export function StageNav({ total, next }: { total: number; next: { href: string; label: string } }) {
  const { active, setActive, all } = use();
  const last = all || active === total - 1;
  return (
    <div className="ld-row" style={{ gap: 8 }}>
      <Ld.Button variant="secondary" size="sm" disabled={active === 0 || all} onClick={() => setActive(active - 1)}>
        Previous stage
      </Ld.Button>
      {last ? (
        <Link className="ld-btn ld-btn--primary ld-btn--sm" href={next.href}>
          {next.label}
        </Link>
      ) : (
        <Ld.Button size="sm" onClick={() => setActive(active + 1)}>
          Next stage
        </Ld.Button>
      )}
    </div>
  );
}
