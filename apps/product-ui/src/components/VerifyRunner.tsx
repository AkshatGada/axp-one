"use client";
// Runs every recomputable check in the viewer's browser against /run.public.json (the same file as the download).
import { useEffect, useState } from "react";
import { Ld } from "@axp/design-system/ledger";
import { verifyChecks, GROUP_LABEL, type Check, type CheckGroup } from "@/lib/verify.ts";
import type { ProductRun } from "@/data/types";
import { asset } from "@/lib/paths";

const METHOD: Record<Check["method"], string> = {
  recomputed: "SHA-256 of canonical JSON, recomputed here",
  signature: "Ed25519 signature, checked here with the publisher's public key",
  arithmetic: "Re-added here in whole base units",
  policy: "Re-run here with the exchange's own rules",
};

export function VerifyRunner() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [bytes, setBytes] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const text = await (await fetch(asset("/run.public.json"), { cache: "no-store" })).text();
        if (!live) return;
        setBytes(new TextEncoder().encode(text).length);
        const out = await verifyChecks(JSON.parse(text) as ProductRun);
        if (live) setChecks(out);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  if (error) return <Ld.Callout tone="warning" title="Could not load run.public.json">{error}</Ld.Callout>;
  const done = checks.length > 0;
  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail");
  const skipped = checks.filter((c) => c.status === "skip");
  const groups = Array.from(new Set(checks.map((c) => c.group))) as CheckGroup[];
  return (
    <div className="ld-stack-lg" style={{ gap: 16 }}>
      <div className="ld-kpis" role="status" aria-live="polite">
        <Ld.Kpi
          tone="live"
          label="Checks in this browser"
          value={done ? `${passed}/${checks.length}` : ""}
          context={done ? `Computed from run.public.json, ${bytes?.toLocaleString("en-US")} bytes` : "Recomputing hashes, signatures and sums here"}
          chip={done ? <Ld.Tag tone={failed.length ? "danger" : "success"} dot>{failed.length ? `${failed.length} failed` : "Passing"}</Ld.Tag> : null}
        />
        <Ld.Kpi label="Hashes recomputed" value={done ? checks.filter((c) => c.method === "recomputed").length : ""} context="Questions, packets, creatives, receipts" />
        <Ld.Kpi label="Signatures verified" value={done ? checks.filter((c) => c.method === "signature" && c.status === "pass").length : ""} context={skipped.length ? "This browser cannot verify Ed25519; hashes still ran" : "Ed25519, publisher key"} />
        <Ld.Kpi label="Sums and rules" value={done ? checks.filter((c) => c.method === "arithmetic" || c.method === "policy").length : ""} context="Vouchers, conservation, bids, tie-break, cap" />
      </div>
      {failed.length ? (
        <Ld.Panel title={`${failed.length} check${failed.length > 1 ? "s" : ""} failed`} raised>
          <div className="ld-stack">
            {failed.map((c) => (
              <Ld.Callout key={c.id} tone="warning" title={c.label}>
                Expected {c.expected}, got {c.actual}. {c.note}
              </Ld.Callout>
            ))}
          </div>
        </Ld.Panel>
      ) : null}
      {groups.map((g) => {
        const rows = checks.filter((c) => c.group === g);
        const ok = rows.every((c) => c.status === "pass");
        return (
          <Ld.Panel key={g} title={GROUP_LABEL[g]} sub={METHOD[rows[0].method]} actions={<Ld.Tag tone={ok ? "success" : rows.some((c) => c.status === "fail") ? "danger" : "warning"} dot>{rows.filter((c) => c.status === "pass").length} of {rows.length}</Ld.Tag>} flush>
            <Ld.Table
              columns={[
                { key: "s", head: "", width: "40px", cell: (c: Check) => <Ld.Verified state={c.status === "pass" ? "pass" : c.status === "fail" ? "fail" : "recorded"}>{""}</Ld.Verified> },
                { key: "l", head: "Check", cell: (c) => <span className="ld-stack" style={{ gap: 2 }}><span>{c.label}</span>{c.note ? <span className="ld-caption">{c.note}</span> : null}</span> },
                { key: "e", head: "Recorded", cell: (c) => <span className="ld-mono">{c.expected}</span> },
                { key: "a", head: "Computed here", cell: (c) => <span className="ld-mono">{c.actual}</span> },
              ]}
              rows={rows}
            />
          </Ld.Panel>
        );
      })}
    </div>
  );
}
