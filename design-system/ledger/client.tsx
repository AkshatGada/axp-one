"use client";
// Client islands of the Ledger system: the inspector drawer, copy-to-clipboard, the answer clamp, the route line.
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

// ---------- Inspector ----------
export type InspectHash = { label: string; value: string; recomputable: boolean; note?: string };
export type InspectPayload = { key: string; title: string; sourcePath: string; json: unknown; hashes?: InspectHash[]; note?: ReactNode };
type Ctx = { open: (p: InspectPayload) => void; close: () => void; current: InspectPayload | null; register: (p: InspectPayload) => void };
const InspectorCtx = createContext<Ctx | null>(null);

export function useInspector(): Ctx {
  const c = useContext(InspectorCtx);
  if (!c) throw new Error("InspectorProvider missing");
  return c;
}

function readParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("inspect");
}
function writeParam(key: string | null) {
  const url = new URL(window.location.href);
  if (key) url.searchParams.set("inspect", key);
  else url.searchParams.delete("inspect");
  window.history.replaceState(window.history.state, "", url.toString());
}

/** Holds the inspector drawer. Any InspectButton on the page registers its payload so ?inspect=<key> deep links open it. */
export function InspectorProvider({ children, verifyHref = "/verify/", initial, scopeClass }: { children: ReactNode; verifyHref?: string; initial?: InspectPayload | null; scopeClass?: string }) {
  const [current, setCurrent] = useState<InspectPayload | null>(initial ?? null);
  const registry = useRef(new Map<string, InspectPayload>());
  const wanted = useRef<string | null>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const open = useCallback((p: InspectPayload) => {
    lastFocus.current = document.activeElement as HTMLElement | null;
    setCurrent(p);
    writeParam(p.key);
  }, []);
  const close = useCallback(() => {
    setCurrent(null);
    writeParam(null);
    lastFocus.current?.focus?.();
  }, []);
  const register = useCallback((p: InspectPayload) => {
    registry.current.set(p.key, p);
    if (wanted.current === p.key) {
      wanted.current = null;
      setCurrent(p);
    }
  }, []);
  useEffect(() => {
    const k = readParam();
    if (k) {
      const p = registry.current.get(k);
      if (p) setCurrent(p);
      else wanted.current = k;
    }
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "Escape" && current) close();
      if ((e.key === "i" || e.key === "I") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (current) close();
        else {
          const visible = (el: Element) => (el as HTMLElement).offsetParent !== null;
          const primary = Array.from(document.querySelectorAll(".lg-inspect-btn[data-primary]")).find(visible) as HTMLElement | undefined;
          if (primary) primary.click();
          else {
            const first = registry.current.values().next().value as InspectPayload | undefined;
            if (first) open(first);
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, close, open]);
  const value = useMemo(() => ({ open, close, current, register }), [open, close, current, register]);
  return (
    <InspectorCtx.Provider value={value}>
      {children}
      {scopeClass ? (
        <div className={scopeClass} style={{ display: "contents" }}>
          <InspectorDrawer payload={current} onClose={close} verifyHref={verifyHref} />
        </div>
      ) : (
        <InspectorDrawer payload={current} onClose={close} verifyHref={verifyHref} />
      )}
    </InspectorCtx.Provider>
  );
}

export function InspectorDrawer({ payload, onClose, verifyHref, staticOpen }: { payload: InspectPayload | null; onClose?: () => void; verifyHref: string; staticOpen?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (payload && !staticOpen) ref.current?.focus();
  }, [payload, staticOpen]);
  const json = useMemo(() => (payload ? JSON.stringify(payload.json, null, 2) : ""), [payload]);
  return (
    <aside
      ref={ref}
      className="lg-inspector"
      data-open={payload ? "" : undefined}
      aria-label="Inspector"
      aria-hidden={payload ? undefined : true}
      tabIndex={-1}
      style={staticOpen ? { position: "relative", top: 0, transform: "none", visibility: "visible", width: "100%", height: "100%", zIndex: 0, boxShadow: "none", border: "1px solid var(--line)" } : undefined}
    >
      {payload ? (
        <>
          <div className="lg-inspector-head">
            <div className="lg-inspector-top">
              <span className="lg-h3">{payload.title}</span>
              {onClose ? (
                <button type="button" className="lg-inspect-btn" onClick={onClose} aria-label="Close inspector">
                  Close <kbd className="lg-key">Esc</kbd>
                </button>
              ) : null}
            </div>
            <span className="lg-inspector-path">run.json · {payload.sourcePath}</span>
          </div>
          <div className="lg-inspector-body">
            {payload.note ? <div className="lg-small">{payload.note}</div> : null}
            {payload.hashes && payload.hashes.length ? (
              <div className="lg-inspector-hashes">
                {payload.hashes.map((h) => (
                  <div className="lg-inspector-hash" key={h.label}>
                    <div className="lg-inspector-hash-top">
                      <span className="lg-label">{h.label}</span>
                      {h.recomputable ? (
                        <a className="ld-hashtag" data-kind="recomputable" href={verifyHref}>
                          Recomputable on Verify
                        </a>
                      ) : (
                        <span className="ld-hashtag" data-kind="recorded">
                          Recorded hash only, not checked here
                        </span>
                      )}
                    </div>
                    <CopyHash value={h.value} full />
                    {h.note ? <span className="lg-small">{h.note}</span> : null}
                  </div>
                ))}
              </div>
            ) : null}
            <div className="lg-stack-sm">
              <span className="lg-label">Raw JSON from the public projection</span>
              <pre className="lg-json">{json}</pre>
            </div>
          </div>
        </>
      ) : null}
    </aside>
  );
}

/** Opens the inspector with a payload; registers the payload for ?inspect= deep links. */
export function InspectButton({ payload, children = "Inspect", variant, primary }: { payload: InspectPayload; children?: ReactNode; variant?: "text"; primary?: boolean }) {
  const ctx = useContext(InspectorCtx);
  useEffect(() => {
    ctx?.register(payload);
  }, [ctx, payload]);
  const active = ctx?.current?.key === payload.key;
  return (
    <button type="button" className="lg-inspect-btn" data-variant={variant} data-primary={primary || undefined} data-active={active || undefined} onClick={() => ctx?.open(payload)} aria-haspopup="dialog">
      {children}
    </button>
  );
}

// ---------- Copyable hash ----------
export function CopyHash({ value, head = 10, tail = 6, full, label }: { value: string; head?: number; tail?: number; full?: boolean; label?: string }) {
  const [copied, setCopied] = useState(false);
  const shown = full || value.length <= head + tail + 1 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`;
  return (
    <span className="lg-hash">
      <span className="lg-hash-value" title={value}>
        {shown}
      </span>
      <button
        type="button"
        className="lg-hash-copy"
        aria-label={`Copy ${label ?? "value"}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}

// ---------- Organic answer with a clamp ----------
export function ClampText({ text, lines = 7, moreLabel = "Show the full answer", lessLabel = "Show less" }: { text: string; lines?: number; moreLabel?: string; lessLabel?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg-stack-sm">
      <p className="lg-answer-text" data-clamp={open ? undefined : ""} style={{ ["--clamp" as string]: lines }}>
        {text}
      </p>
      <button type="button" className="lg-btn" data-variant="text" onClick={() => setOpen((v) => !v)} style={{ justifySelf: "start", fontSize: 13 }}>
        {open ? lessLabel : moreLabel}
      </button>
    </div>
  );
}

// ---------- Route line: a 1px steel line from a step to the chat region ----------
export function RouteLine({ from, to, active, replayKey }: { from: string | null; to: string | null; active: boolean; replayKey?: string | number }) {
  const [d, setD] = useState<{ path: string; len: number; end: [number, number] } | null>(null);
  const measure = useCallback(() => {
    if (!active || !from || !to) return setD(null);
    const a = document.querySelector(from)?.getBoundingClientRect();
    const b = document.querySelector(to)?.getBoundingClientRect();
    if (!a || !b || a.width === 0 || b.width === 0) return setD(null);
    const x1 = a.left;
    const y1 = a.top + Math.min(a.height / 2, 14);
    const x2 = b.right + 2;
    const y2 = Math.max(b.top + 12, Math.min(b.bottom - 12, y1));
    const mid = x2 + Math.max(12, (x1 - x2) / 2);
    const path = `M ${x1} ${y1} H ${mid} V ${y2} H ${x2}`;
    setD({ path, len: Math.abs(x1 - mid) + Math.abs(y1 - y2) + Math.abs(mid - x2), end: [x2, y2] });
  }, [active, from, to]);
  useLayoutEffect(() => {
    measure();
    if (!active) return;
    const on = () => measure();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    const t = setTimeout(measure, 460);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      clearTimeout(t);
    };
  }, [measure, active, replayKey]);
  if (!d) return null;
  return (
    <svg className="lg-route" aria-hidden width="100%" height="100%">
      <path key={`${replayKey}`} className="lg-route-anim" d={d.path} style={{ strokeDasharray: d.len, ["--len" as string]: d.len }} />
      <rect x={d.end[0] - 3} y={d.end[1] - 3} width={6} height={6} />
    </svg>
  );
}
