"use client";
// Runs every recomputable check in the viewer's browser against /run.public.json (the same file as the download).
import { useEffect, useState } from "react";
import { CheckMark, VerifyRow } from "@axp/design-system/ledger";
import { verifyChecks, GROUP_LABEL, type Check, type CheckGroup } from "@/lib/verify.ts";
import type { ProductRun } from "@/data/types";
import { asset } from "@/lib/paths";

const METHOD: Record<Check["method"], string> = {
  recomputed: "sha256 of canonical JSON, recomputed here",
  signature: "Ed25519 signature checked here with the publisher's public key",
  arithmetic: "re-added here in whole base units",
  policy: "re-run here with the ported exchange rules",
};

export function VerifyRunner() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [bytes, setBytes] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(asset("/run.public.json"), { cache: "no-store" });
        const text = await res.text();
        if (!live) return;
        setBytes(new TextEncoder().encode(text).length);
        const run = JSON.parse(text) as ProductRun;
        const out = await verifyChecks(run);
        if (!live) return;
        setChecks(out);
        setDone(true);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail");
  const skipped = checks.filter((c) => c.status === "skip");
  const groups = Array.from(new Set(checks.map((c) => c.group))) as CheckGroup[];
  if (error)
    return (
      <div className="lg-stamp" data-tone="fail">
        Could not load run.public.json: {error}
      </div>
    );
  return (
    <div className="lg-stack-lg">
      <div className="vf-summary" data-state={!done ? "idle" : failed.length ? "fail" : "pass"} role="status" aria-live="polite">
        {done ? (
          <>
            <span className="vf-big">
              {passed} of {checks.length}
            </span>
            <span className="lg-stack-sm" style={{ gap: 4 }}>
              <span className="lg-h2" style={{ color: "inherit" }}>
                {failed.length ? `${failed.length} check${failed.length > 1 ? "s" : ""} FAILED in this browser` : "checks passed in this browser"}
              </span>
              <span className="lg-small" style={{ color: "inherit" }}>
                Computed from run.public.json ({bytes?.toLocaleString("en-US")} bytes), the same file you can download above.{skipped.length ? ` ${skipped.length} signature check${skipped.length > 1 ? "s" : ""} could not run: this browser cannot verify Ed25519 signatures; the hash checks still ran.` : ""}
              </span>
            </span>
          </>
        ) : (
          <span className="lg-h2" style={{ color: "inherit" }}>
            Checks run in this browser when the page loads.
          </span>
        )}
      </div>
      {failed.length ? (
        <div className="lg-stack-sm">
          {failed.map((c) => (
            <VerifyRow key={c.id} status="fail" label={c.label} method={`${GROUP_LABEL[c.group]} · ${c.path}`} note={c.note} expected={`expected ${c.expected}`} actual={`got ${c.actual}`} />
          ))}
        </div>
      ) : null}
      {groups.map((g) => {
        const rows = checks.filter((c) => c.group === g);
        const ok = rows.every((c) => c.status === "pass");
        return (
          <section key={g} className="vf-group">
            <div className="vf-group-head">
              <span className="lg-h3">{GROUP_LABEL[g]}</span>
              <span className="lg-row" style={{ gap: 12 }}>
                <span className="lg-small">{METHOD[rows[0].method]}</span>
                <CheckMark state={ok ? "pass" : rows.some((c) => c.status === "fail") ? "fail" : "skip"}>
                  {rows.filter((c) => c.status === "pass").length}/{rows.length}
                </CheckMark>
              </span>
            </div>
            <div className="lg-verify-row vf-colhead" aria-hidden>
              <span />
              <span className="lg-label">Check</span>
              <span className="lg-label">Recorded</span>
              <span className="lg-label">Computed here</span>
            </div>
            {rows.map((c) => (
              <VerifyRow key={c.id} status={c.status} label={c.label} note={c.note} expected={c.expected} actual={c.actual} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
