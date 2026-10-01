"use client";
// Motion and verify demonstrations for the /design showcase. Real values; motion is illustrative of the UI only.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AwaitingSlot, Provenance, VerifyRow } from "@axp/design-system/ledger";
import { hashCanonical } from "@/lib/canonical.ts";

function ReplayBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="lg-btn" data-variant="outline" onClick={onClick}>
      Replay
    </button>
  );
}

export function RevealDemo({ children }: { children: ReactNode }) {
  const [k, setK] = useState(0);
  return (
    <div className="lg-stack">
      <div className="ds-motion-stage">
        <div key={k} className="lg-reveal">
          {children}
        </div>
      </div>
      <div className="lg-row" style={{ justifyContent: "space-between" }}>
        <span className="lg-small">Step reveal: 220 ms, one easing curve, 4 px travel.</span>
        <ReplayBtn onClick={() => setK((x) => x + 1)} />
      </div>
    </div>
  );
}

export function RouteDemo({ step, target }: { step: ReactNode; target: ReactNode }) {
  const [k, setK] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const from = useRef<HTMLDivElement>(null);
  const to = useRef<HTMLDivElement>(null);
  const [d, setD] = useState<{ path: string; len: number; end: [number, number] } | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const s = stage.current?.getBoundingClientRect();
      const a = from.current?.getBoundingClientRect();
      const b = to.current?.getBoundingClientRect();
      if (!s || !a || !b) return;
      const x1 = a.left - s.left, y1 = a.top - s.top + 14;
      const x2 = b.right - s.left + 2, y2 = b.top - s.top + b.height / 2;
      const mid = x2 + (x1 - x2) / 2;
      setD({ path: `M ${x1} ${y1} H ${mid} V ${y2} H ${x2}`, len: Math.abs(x1 - mid) + Math.abs(y1 - y2) + Math.abs(mid - x2), end: [x2, y2] });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [k]);
  return (
    <div className="lg-stack">
      <div ref={stage} className="ds-motion-stage" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "start" }}>
        <div ref={to} style={{ marginTop: 56 }}>{target}</div>
        <div ref={from}>{step}</div>
        {d ? (
          <svg aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}>
            <path key={k} className="lg-route-anim" d={d.path} style={{ fill: "none", stroke: "var(--brand)", strokeWidth: 1.5, strokeDasharray: d.len, ["--len" as string]: d.len }} />
            <rect x={d.end[0] - 3} y={d.end[1] - 3} width={6} height={6} style={{ fill: "var(--brand)" }} />
          </svg>
        ) : null}
      </div>
      <div className="lg-row" style={{ justifyContent: "space-between" }}>
        <span className="lg-small">Route line: ultramarine, 420 ms, from the active step to the app.</span>
        <ReplayBtn onClick={() => setK((x) => x + 1)} />
      </div>
    </div>
  );
}

export function CardIntoSlotDemo({ card }: { card: ReactNode }) {
  const [phase, setPhase] = useState<"await" | "card">("card");
  const [k, setK] = useState(0);
  useEffect(() => {
    if (phase !== "await") return;
    const t = setTimeout(() => setPhase("card"), 900);
    return () => clearTimeout(t);
  }, [phase, k]);
  return (
    <div className="lg-stack">
      <div className="ds-motion-stage">{phase === "await" ? <AwaitingSlot /> : <div key={k} className="lg-ad-enter">{card}</div>}</div>
      <div className="lg-row" style={{ justifyContent: "space-between" }}>
        <span className="lg-small">Card into slot: 420 ms, after the dashed awaiting state.</span>
        <ReplayBtn
          onClick={() => {
            setPhase("await");
            setK((x) => x + 1);
          }}
        />
      </div>
    </div>
  );
}

/** One real check and one deliberately altered copy, both computed in this browser. */
export function VerifyDemo({ receipt, receiptHash }: { receipt: Record<string, string>; receiptHash: string }) {
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  useEffect(() => {
    hashCanonical(receipt).then(setA);
    const altered = { ...receipt, nonce: receipt.nonce.slice(0, -1) + (receipt.nonce.endsWith("a") ? "b" : "a") };
    hashCanonical(altered).then(setB);
  }, [receipt]);
  const s = (h: string | null) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : "");
  const short = `${receiptHash.slice(0, 10)}…${receiptHash.slice(-6)}`;
  return (
    <div>
      <VerifyRow status={a ? (a === receiptHash ? "pass" : "fail") : "idle"} label="Opportunity 1: receipt fields" method="sha256 of canonical JSON, recomputed in this browser" expected={short} actual={s(a)} />
      <VerifyRow
        status={b ? (b === receiptHash ? "pass" : "fail") : "idle"}
        label="Altered copy: one byte of the nonce changed"
        method={
          <span className="lg-row" style={{ gap: 8 }}>
            <Provenance kind="synthetic" label="Demonstration of a failure" />
          </span>
        }
        note="This is how a mismatch renders on Verify: loud, with both values."
        expected={short}
        actual={s(b)}
      />
    </div>
  );
}
