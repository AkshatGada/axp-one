"use client";
// Runs every recomputable check in the viewer's browser against /run.public.json (the same file as the download).
// Rows are laid out from the build-time list first ("Not run yet"), so nothing jumps when results arrive.
import { useEffect, useState } from "react";
import { Ld } from "@axp/design-system/ledger";
import { verifyChecks, GROUP_LABEL, type Check, type CheckGroup } from "@/lib/verify.ts";
import type { ProductRun } from "@/data/types";
import { asset } from "@/lib/paths";

export type CheckRow = Pick<Check, "id" | "group" | "label" | "method" | "expected">;

const METHOD: Record<Check["method"], string> = {
  recomputed: "SHA-256 of canonical JSON, recomputed in your browser",
  signature: "Ed25519, checked in your browser with the public key published in the same file",
  arithmetic: "Re-added in your browser in whole base units",
  policy: "Re-run in your browser with the exchange's own rules",
};

function useRun() {
  const [run, setRun] = useState<ProductRun | null>(null);
  const [bytes, setBytes] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetch(asset("/run.public.json"), { cache: "no-store" })
      .then((r) => r.text())
      .then((text) => {
        if (!live) return;
        setBytes(new TextEncoder().encode(text).length);
        setRun(JSON.parse(text) as ProductRun);
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, []);
  return { run, bytes, error };
}

export function VerifyRunner({ rows }: { rows: CheckRow[] }) {
  const { run, bytes, error } = useRun();
  const [results, setResults] = useState<Record<string, Check> | null>(null);
  useEffect(() => {
    if (!run) return;
    let live = true;
    verifyChecks(run).then((cs) => live && setResults(Object.fromEntries(cs.map((c) => [c.id, c]))));
    return () => {
      live = false;
    };
  }, [run]);
  const done = !!results;
  const list = rows.map((r) => results?.[r.id]).filter(Boolean) as Check[];
  const passed = list.filter((c) => c.status === "pass").length;
  const failed = list.filter((c) => c.status === "fail");
  const skipped = list.filter((c) => c.status === "skip");
  const missing = done ? rows.length - list.length : 0;
  const allPass = done && passed === rows.length && missing === 0;
  const groups = Array.from(new Set(rows.map((r) => r.group))) as CheckGroup[];
  const headline = !done ? "Not run yet" : allPass ? "Passing" : failed.length ? `${failed.length} failed` : `${skipped.length + missing} not checked`;
  return (
    <div className="ld-stack-lg vf2" style={{ gap: 16 }}>
      {error ? (
        <Ld.Callout tone="warning" title="Could not load run.public.json">
          {error}
        </Ld.Callout>
      ) : null}
      <div className="ld-kpis vf2-kpis" role="status" aria-live="polite">
        <Ld.Kpi tone="live" label="Checks in your browser" value={done ? `${passed}/${rows.length}` : `0/${rows.length}`} context={done ? `On run.public.json, ${bytes?.toLocaleString("en-US")} bytes` : "Not run yet"} chip={<Ld.Tag tone={!done ? undefined : allPass ? "success" : "danger"} dot>{headline}</Ld.Tag>} />
        <Ld.Kpi label="Hashes recomputed" value={rows.filter((r) => r.method === "recomputed").length} context="Questions, packets, creatives, acknowledgements, receipts" />
        <Ld.Kpi label="Signatures checked" value={rows.filter((r) => r.method === "signature").length} context={skipped.length ? "This browser cannot verify Ed25519; hashes still ran" : "Ed25519 receipts from the publisher"} />
        <Ld.Kpi label="Sums and rules" value={rows.filter((r) => r.method === "arithmetic" || r.method === "policy").length} context="Vouchers, conservation, bids, tie rule, fee cap" />
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
      {run ? <TamperDemo run={run} /> : <TamperDemo run={null} />}
      {groups.map((g) => {
        const gr = rows.filter((r) => r.group === g);
        const res = gr.map((r) => results?.[r.id]);
        const ok = done && res.every((c) => c?.status === "pass");
        const nPass = res.filter((c) => c?.status === "pass").length;
        return (
          <Ld.Panel key={g} title={GROUP_LABEL[g]} sub={METHOD[gr[0].method]} actions={<Ld.Tag tone={!done ? undefined : ok ? "success" : "danger"} dot>{done ? `${nPass} of ${gr.length}` : "Not run yet"}</Ld.Tag>} flush>
            <Ld.Table
              columns={[
                {
                  key: "s",
                  head: "",
                  width: "40px",
                  cell: (r: CheckRow) => {
                    const c = results?.[r.id];
                    return <Ld.Verified state={!c ? "idle" : c.status === "pass" ? "pass" : c.status === "fail" ? "fail" : "recorded"}>{""}</Ld.Verified>;
                  },
                },
                { key: "l", head: "Check", cell: (r) => <span className="ld-stack" style={{ gap: 2 }}><span>{r.label}</span>{results?.[r.id]?.note ? <span className="ld-caption">{results[r.id].note}</span> : null}</span> },
                { key: "e", head: "Recorded in the file", cell: (r) => <span className="ld-mono">{r.expected}</span> },
                { key: "a", head: "Computed in your browser", cell: (r) => <span className="ld-mono">{results?.[r.id]?.actual ?? "not run yet"}</span> },
              ]}
              rows={gr}
            />
          </Ld.Panel>
        );
      })}
    </div>
  );
}

/** Flip one character of a receipt in an in-memory copy and re-run its checks; Reset restores the file. */
function TamperDemo({ run }: { run: ProductRun | null }) {
  const [state, setState] = useState<{ tampered: boolean; rows: Check[] } | null>(null);
  const ids = ["receipt-1", "signature-1"];
  const runChecks = async (tamper: boolean) => {
    if (!run) return;
    const copy = JSON.parse(JSON.stringify(run)) as ProductRun;
    if (tamper) {
      const f = copy.opportunities[0].receipt!.fields;
      f.nonce = f.nonce.slice(0, -1) + (f.nonce.endsWith("a") ? "b" : "a");
    }
    const cs = await verifyChecks(copy);
    setState({ tampered: tamper, rows: cs.filter((c) => ids.includes(c.id)) });
  };
  useEffect(() => {
    if (run) void runChecks(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);
  const nonce = run?.opportunities[0].receipt?.fields.nonce ?? "";
  return (
    <Ld.Panel
      title="Tamper with one byte"
      sub="Changes the last character of opportunity 1's receipt nonce in a copy held in this tab, then re-runs its checks. The file itself is never changed."
      actions={
        <>
          <Ld.Button variant="danger" size="sm" disabled={!run || state?.tampered} onClick={() => void runChecks(true)}>
            Tamper with one byte
          </Ld.Button>
          <Ld.Button variant="secondary" size="sm" disabled={!run || !state?.tampered} onClick={() => void runChecks(false)}>
            Reset
          </Ld.Button>
        </>
      }
      flush
    >
      <div className="vf2-tamper" data-tampered={state?.tampered || undefined}>
        <div className="ld-between" style={{ padding: "10px 16px", borderBottom: "1px solid var(--ld-border)" }}>
          <span className="ld-secondary">
            Nonce in the copy: <span className="ld-mono">{state?.tampered ? `${nonce.slice(0, -1)}${nonce.endsWith("a") ? "b" : "a"}` : nonce}</span>
          </span>
          <Ld.Tag tone={!state ? undefined : state.tampered ? "danger" : "success"} dot>
            {!state ? "Not run yet" : state.tampered ? "Tampered copy" : "Original file"}
          </Ld.Tag>
        </div>
        <Ld.Table
          columns={[
            { key: "s", head: "", width: "40px", cell: (id: string) => { const c = state?.rows.find((x) => x.id === id); return <Ld.Verified state={!c ? "idle" : c.status === "pass" ? "pass" : "fail"}>{""}</Ld.Verified>; } },
            { key: "l", head: "Check", cell: (id) => (id === "receipt-1" ? "Opportunity 1: receipt hash" : "Opportunity 1: publisher signature (Ed25519)") },
            { key: "e", head: "Recorded in the file", cell: (id) => <span className="ld-mono">{state?.rows.find((x) => x.id === id)?.expected ?? ""}</span> },
            { key: "a", head: "Computed now", cell: (id) => { const c = state?.rows.find((x) => x.id === id); return c?.status === "fail" ? <span className="ld-row" style={{ gap: 8 }}><span className="ld-mono" style={{ color: "var(--ld-danger)", fontWeight: 500 }}>{c.actual}</span><Ld.Tag tone="danger">Mismatch</Ld.Tag></span> : <span className="ld-mono">{c ? c.actual : "not run yet"}</span>; } },
          ]}
          rows={ids}
        />
      </div>
    </Ld.Panel>
  );
}
