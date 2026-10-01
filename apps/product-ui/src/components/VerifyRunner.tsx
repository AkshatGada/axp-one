"use client";
// Runs every recomputable check in the viewer's browser against /run.public.json (the same file as the download).
// Rows are laid out from the build-time list first ("Not run yet"), so nothing jumps when results arrive.
// "Recorded in the file" shows values read from the fetched file, never build-time copies.
import { useEffect, useState, type ReactNode } from "react";
import { Ld } from "@axp/design-system/ledger";
import { verifyChecks, summarize, summaryWords, GROUP_LABEL, type Check, type CheckGroup, type CheckSummary } from "@/lib/verify.ts";
import type { ProductRun } from "@/data/types";
import { asset } from "@/lib/paths";
import { verifyDevnet } from "@/lib/verify-devnet.ts";
import type { DevnetProjection } from "@/data/devnet-types";

export type CheckRow = Pick<Check, "id" | "group" | "label" | "method">;

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

const isHashLike = (v: string) => /^[0-9a-f]{6,}…[0-9a-f]{4,}$/i.test(v) || /^[0-9]+$/.test(v) || /^[0-9a-f]{16,}$/i.test(v);
/** Hashes and numbers in mono; prose results (for example "signature does not match") in body type. */
const Val = ({ v, danger }: { v: string; danger?: boolean }) => <span className={isHashLike(v) ? "ld-mono" : undefined} style={danger ? { color: "var(--ld-danger)", fontWeight: 500 } : undefined}>{v}</span>;

type Tamper = { tampered: boolean; checks: Check[]; summary: CheckSummary } | null;

export function VerifyRunner({ rows, expectedIds, devnetRows = [], devnetLinks }: { rows: CheckRow[]; expectedIds: string[]; devnetRows?: CheckRow[]; devnetLinks?: ReactNode }) {
  const { run, bytes, error } = useRun();
  const [results, setResults] = useState<Record<string, Check> | null>(null);
  const [summary, setSummary] = useState<CheckSummary | null>(null);
  const [tamper, setTamper] = useState<Tamper>(null);
  const [devnetResults, setDevnetResults] = useState<Record<string, Check> | null>(null);
  useEffect(() => {
    if (!run || !devnetRows.length) return;
    let live = true;
    fetch(asset("/devnet.public.json"), { cache: "no-store" })
      .then((r) => r.json() as Promise<DevnetProjection>)
      .then((d) => live && setDevnetResults(Object.fromEntries(verifyDevnet(run, d).map((c) => [c.id, c]))))
      .catch((e) => live && setDevnetResults(Object.fromEntries(devnetRows.map((r) => [r.id, { ...r, status: "fail", expected: "devnet.public.json", actual: e instanceof Error ? e.message : String(e), path: "" } as Check]))));
    return () => {
      live = false;
    };
  }, [run, devnetRows]);
  useEffect(() => {
    if (!run) return;
    let live = true;
    verifyChecks(run).then((cs) => {
      if (!live) return;
      setResults(Object.fromEntries(cs.map((c) => [c.id, c])));
      setSummary(summarize(cs, expectedIds));
    });
    return () => {
      live = false;
    };
  }, [run, expectedIds]);
  const runTamper = async (on: boolean) => {
    if (!run) return;
    const copy = JSON.parse(JSON.stringify(run)) as ProductRun;
    if (on) {
      const f = copy.opportunities.find((o) => o.receipt)!.receipt!.fields;
      f.nonce = f.nonce.slice(0, -1) + (f.nonce.endsWith("a") ? "b" : "a");
    }
    const cs = await verifyChecks(copy);
    setTamper({ tampered: on, checks: cs, summary: summarize(cs, expectedIds) });
  };
  useEffect(() => {
    if (run) void runTamper(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);
  const done = !!results && !!summary;
  const groups = Array.from(new Set(rows.map((r) => r.group))) as CheckGroup[];
  const failed = done ? (Object.values(results!).filter((c) => c.status === "fail") as Check[]) : [];
  const ok = (m: Check["method"][]) => (done ? rows.filter((r) => m.includes(r.method) && results![r.id]?.status === "pass").length : 0);
  const total = (m: Check["method"][]) => rows.filter((r) => m.includes(r.method)).length;
  const headline = !done ? "Not run yet" : summaryWords(summary!);
  return (
    <div className="ld-stack-lg vf2" style={{ gap: 16 }}>
      {error ? (
        <Ld.Callout tone="warning" title="Could not load run.public.json">
          {error}
        </Ld.Callout>
      ) : null}
      <div className="ld-kpis vf2-kpis" role="status" aria-live="polite">
        <Ld.Kpi tone="live" label="The served file, checked in your browser" value={done ? `${summary!.pass}/${expectedIds.length}` : "Not run yet"} context={done ? `run.public.json, ${bytes?.toLocaleString("en-US")} bytes` : `${expectedIds.length} checks to run`} chip={<Ld.Tag tone={!done ? undefined : summary!.passing ? "success" : "danger"} dot>{headline}</Ld.Tag>} />
        <Ld.Kpi label="Hash checks" value={done ? `${ok(["recomputed"])} of ${total(["recomputed"])}` : "Not run yet"} context="Questions, packets, creatives, acknowledgements, receipts" />
        <Ld.Kpi label="Signature checks" value={done ? `${ok(["signature"])} of ${total(["signature"])}` : "Not run yet"} context="Ed25519 receipts from the publisher" />
        <Ld.Kpi label="Sum and rule checks" value={done ? `${ok(["arithmetic", "policy"])} of ${total(["arithmetic", "policy"])}` : "Not run yet"} context="Vouchers, conservation, bids, tie rule, fee cap" />
        {devnetRows.length ? <Ld.Kpi label="Plus Devnet checks" value={devnetResults ? `${devnetRows.filter((r) => devnetResults[r.id]?.status === "pass").length} of ${devnetRows.length}` : "Not run yet"} context="The re-settlement file against these receipts" href="#devnet-checks" /> : null}
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
      <TamperDemo served={summary?.pass ?? 0} ready={!!run} state={tamper} onTamper={() => void runTamper(true)} onReset={() => void runTamper(false)} nonce={run?.opportunities.find((o) => o.receipt)?.receipt?.fields.nonce ?? ""} n={run?.opportunities.find((o) => o.receipt)?.n ?? 1} total={expectedIds.length} />
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
                { key: "e", head: "Recorded in the file", cell: (r) => (results?.[r.id] ? <Val v={results[r.id].expected} /> : <span className="ld-faint">not run yet</span>) },
                { key: "a", head: "Computed in your browser", cell: (r) => (results?.[r.id] ? <Val v={results[r.id].actual} danger={results[r.id].status === "fail"} /> : <span className="ld-faint">not run yet</span>) },
              ]}
              rows={gr}
            />
          </Ld.Panel>
        );
      })}
      {devnetRows.length ? (
        <div className="ld-stack" style={{ gap: 0 }} id="devnet-checks">
          <CheckGroupPanel title={GROUP_LABEL.devnet} sub="Compares the Devnet evidence file with the recorded run, in your browser. It does not query the chain; the explorer links right below do." rows={devnetRows} results={devnetResults} />
          {devnetLinks}
        </div>
      ) : null}
    </div>
  );
}

function CheckGroupPanel({ title, sub, rows, results }: { title: string; sub: string; rows: CheckRow[]; results: Record<string, Check> | null }) {
  const done = !!results;
  const nPass = rows.filter((r) => results?.[r.id]?.status === "pass").length;
  const ok = done && nPass === rows.length;
  return (
    <Ld.Panel title={title} sub={sub} actions={<Ld.Tag tone={!done ? undefined : ok ? "success" : "danger"} dot>{done ? `${nPass} of ${rows.length}` : "Not run yet"}</Ld.Tag>} flush>
      <Ld.Table
        columns={[
          { key: "s", head: "", width: "40px", cell: (r: CheckRow) => { const c = results?.[r.id]; return <Ld.Verified state={!c ? "idle" : c.status === "pass" ? "pass" : "fail"}>{""}</Ld.Verified>; } },
          { key: "l", head: "Check", cell: (r) => r.label },
          { key: "e", head: "Recorded run", cell: (r) => (results?.[r.id] ? <Val v={results[r.id].expected} /> : <span className="ld-faint">not run yet</span>) },
          { key: "a", head: "Devnet evidence", cell: (r) => (results?.[r.id] ? <Val v={results[r.id].actual} danger={results[r.id].status === "fail"} /> : <span className="ld-faint">not run yet</span>) },
        ]}
        rows={rows}
      />
    </Ld.Panel>
  );
}

/** Flip one character of a receipt in an in-memory copy and re-run every check; Reset restores the file. */
function TamperDemo({ served, ready, state, onTamper, onReset, nonce, n, total }: { served: number; ready: boolean; state: Tamper; onTamper: () => void; onReset: () => void; nonce: string; n: number; total: number }) {
  const ids = [`receipt-${n}`, `signature-${n}`];
  const row = (id: string) => state?.checks.find((x) => x.id === id);
  return (
    <Ld.Panel
      title="Tamper with one byte"
      sub={`Changes the last character of opportunity ${n}'s receipt nonce in a copy held in this tab, then re-runs all ${total} checks on the copy. The served file is never changed.`}
      actions={
        <>
          <Ld.Button variant="danger" size="sm" disabled={!ready || state?.tampered} onClick={onTamper}>
            Tamper with one byte
          </Ld.Button>
          <Ld.Button variant="secondary" size="sm" disabled={!ready || !state?.tampered} onClick={onReset}>
            Reset
          </Ld.Button>
        </>
      }
      flush
    >
      <div className="vf2-tamper" data-tampered={state?.tampered || undefined}>
        {state?.tampered ? (
          <div className="vf2-tamper-alert" role="alert">
            <b>Tampered copy: {state.summary.pass} of {total} pass.</b> One changed character in opportunity {n}&apos;s receipt breaks its hash and its signature. The served file is unchanged: {served} of {total}.
          </div>
        ) : null}
        <div className="ld-between" style={{ padding: "10px 16px", borderBottom: "1px solid var(--ld-border)" }}>
          <span className="ld-secondary">
            Nonce in the copy: <span className="ld-mono">{state?.tampered ? `${nonce.slice(0, -1)}${nonce.endsWith("a") ? "b" : "a"}` : nonce}</span>
          </span>
          <Ld.Tag tone={!state ? undefined : state.tampered ? "danger" : "success"} dot>
            {!state ? "Not run yet" : state.tampered ? `Tampered copy: ${state.summary.pass} of ${total}` : `Original file: ${state.summary.pass} of ${total}`}
          </Ld.Tag>
        </div>
        <Ld.Table
          columns={[
            { key: "s", head: "", width: "40px", cell: (id: string) => { const c = row(id); return <Ld.Verified state={!c ? "idle" : c.status === "pass" ? "pass" : "fail"}>{""}</Ld.Verified>; } },
            { key: "l", head: "Check", cell: (id) => (id.startsWith("receipt") ? `Opportunity ${n}: receipt hash` : `Opportunity ${n}: publisher signature (Ed25519)`) },
            { key: "e", head: "Recorded in the copy", cell: (id) => { const c = row(id); return c ? <Val v={c.expected} /> : <span className="ld-faint">not run yet</span>; } },
            { key: "a", head: "Computed now", cell: (id) => { const c = row(id); return c?.status === "fail" ? <span className="ld-row" style={{ gap: 8 }}><Val v={c.actual} danger /><Ld.Tag tone="danger">Mismatch</Ld.Tag></span> : c ? <Val v={c.actual} /> : <span className="ld-faint">not run yet</span>; } },
          ]}
          rows={ids}
        />
      </div>
    </Ld.Panel>
  );
}
