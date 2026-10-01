"use client";
import { useEffect, useState } from "react";
import { Ld } from "@axp/design-system/ledger";
import { canonical, hashCanonical, verifyEd25519 } from "@/lib/canonical.ts";
import { verifyChecks, summarize, summaryWords, type CheckSummary } from "@/lib/verify.ts";
import { CHECK_TOTAL } from "@/data/checks";
import meta from "@/data/build-meta.json";
import type { ProductRun } from "@/data/types";
import { asset } from "@/lib/paths";

export function LiveHashV2({ value, expected, label }: { value: unknown; expected: string; label: string }) {
  const [s, setS] = useState<"idle" | "pass" | "fail">("idle");
  useEffect(() => {
    let live = true;
    hashCanonical(value)
      .then((h) => live && setS(h === expected ? "pass" : "fail"))
      .catch(() => live && setS("fail"));
    return () => {
      live = false;
    };
  }, [value, expected]);
  return <Ld.Verified state={s}>{s === "fail" ? `${label}: mismatch` : s === "idle" ? `${label.replace(/ recomputed here$/, "")}: checking` : label}</Ld.Verified>;
}

export function LiveSignatureV2({ fields, signature, pem }: { fields: unknown; signature: string; pem: string }) {
  const [s, setS] = useState<"idle" | "pass" | "fail" | "recorded">("idle");
  useEffect(() => {
    let live = true;
    verifyEd25519(pem, signature, `AXP.delivery.v1\n${canonical(fields)}`).then((r) => live && setS(!r.supported ? "recorded" : r.ok ? "pass" : "fail"));
    return () => {
      live = false;
    };
  }, [fields, signature, pem]);
  return <Ld.Verified state={s}>{s === "recorded" ? "Ed25519 not supported in this browser" : s === "fail" ? "Signature invalid or key unreadable" : s === "idle" ? "Ed25519 signature: checking" : "Ed25519 signature verified here"}</Ld.Verified>;
}

/** Runs all checks on the served file. "Passing" only when exactly the expected 48 ran and passed. */
export function useVerifySummary() {
  const [r, setR] = useState<CheckSummary | null>(null);
  useEffect(() => {
    let live = true;
    fetch(asset("/run.public.json"))
      .then((x) => x.json() as Promise<ProductRun>)
      .then((run) => verifyChecks(run))
      .then((cs) => live && setR(summarize(cs, meta.verify.ids)))
      .catch(() => live && setR({ expected: CHECK_TOTAL, pass: 0, fail: 1, skip: 0, missing: 0, extra: 0, passing: false }));
    return () => {
      live = false;
    };
  }, []);
  return r;
}

export function LiveVerifyTile({ context }: { context?: string }) {
  const r = useVerifySummary();
  return (
    <Ld.Kpi
      tone="live"
      label="Verify"
      value={r ? `${r.pass}/${CHECK_TOTAL}` : `${CHECK_TOTAL} checks`}
      context={r ? context ?? "Checked in your browser on the public file" : "Not run yet"}
      chip={r ? <Ld.Tag tone={r.passing ? "success" : "danger"} dot>{summaryWords(r)}</Ld.Tag> : <Ld.Tag dot>Not run yet</Ld.Tag>}
    />
  );
}

export function DesignPipelineDemo({ stagesFilled, stagesNoFill }: { stagesFilled: Ld.PipeStage[]; stagesNoFill: Ld.PipeStage[] }) {
  const [i, setI] = useState(4);
  const [mode, setMode] = useState<"filled" | "nofill">("filled");
  const stages = mode === "filled" ? stagesFilled : stagesNoFill;
  return (
    <div className="ld-stack">
      <div className="ld-between">
        <div className="ld-seg" role="group" aria-label="Example">
          <button type="button" aria-pressed={mode === "filled"} onClick={() => { setMode("filled"); setI(4); }}>
            Opportunity 1 · filled
          </button>
          <button type="button" aria-pressed={mode === "nofill"} onClick={() => { setMode("nofill"); setI(1); }}>
            Opportunity 4 · no fill
          </button>
        </div>
        <span className="ld-caption">Stage {i + 1} of {stages.length}: {stages[i].label}</span>
      </div>
      <Ld.Pipeline stages={stages} active={i} onSelect={setI} />
    </div>
  );
}

export function DrawerDemo() {
  const [run, setRun] = useState<ProductRun | null>(null);
  useEffect(() => {
    fetch(asset("/run.public.json")).then((x) => x.json()).then(setRun);
  }, []);
  const o = run?.opportunities[0];
  return (
    <div className="ld-row" style={{ alignItems: "flex-start", gap: 20 }}>
      <Ld.Drawer title="Signed publisher receipt" path={o ? `run.json · receipts[awardId=${o.award!.id}]` : "run.json · receipts[awardId]"}>
        {o ? (
          <>
            <div className="ld-stack" style={{ gap: 8 }}>
              <div className="ld-between">
                <span className="ld-label">Receipt hash</span>
                <Ld.Tag tone="success" dot>Recomputable</Ld.Tag>
              </div>
              <span className="ld-mono">{o.receipt!.receiptHash}</span>
              <div className="ld-between">
                <span className="ld-label">Publisher completion hash</span>
                <Ld.Tag dot>Recorded only</Ld.Tag>
              </div>
              <span className="ld-mono">{o.organic.completionHash}</span>
            </div>
            <pre className="ld-json">{JSON.stringify(o.receipt, null, 2)}</pre>
          </>
        ) : null}
      </Ld.Drawer>
      <p className="ld-secondary" style={{ maxWidth: "40ch" }}>
        Width 440, radius 14, shadow 3. Slides in over 220 ms from the right; a bottom sheet under 900 px. Hashes are labelled recomputable (checked on Verify) or recorded only.
      </p>
    </div>
  );
}

/** Present: the tamper flow, computed live on a copy of the public file (one changed character in a receipt). */
export function LiveTamperResult({ n }: { n: number }) {
  const [r, setR] = useState<{ s: CheckSummary; receipt: boolean; signature: boolean; n: number } | null>(null);
  useEffect(() => {
    let live = true;
    fetch(asset("/run.public.json"))
      .then((x) => x.json() as Promise<ProductRun>)
      .then(async (run) => {
        const target = run.opportunities.find((o) => o.receipt)!;
        const f = target.receipt!.fields;
        f.nonce = f.nonce.slice(0, -1) + (f.nonce.endsWith("a") ? "b" : "a");
        const cs = await verifyChecks(run);
        const st = (id: string) => cs.find((c) => c.id === id)?.status === "pass";
        if (live) setR({ s: summarize(cs, meta.verify.ids), receipt: st(`receipt-${target.n}`), signature: st(`signature-${target.n}`), n: target.n });
      })
      .catch(() => live && setR(null));
    return () => {
      live = false;
    };
  }, []);
  const row = (label: string, ok: boolean | undefined) => (
    <div className="ld-between pr2-tamper-row">
      <span>{label}</span>
      {r ? <Ld.Tag tone={ok ? "success" : "danger"}>{ok ? "Matches" : "Mismatch"}</Ld.Tag> : <Ld.Tag>Checking</Ld.Tag>}
    </div>
  );
  return (
    <div className="ld-panel pr2-tamper" data-tampered={r ? "" : undefined}>
      <div className="ld-between">
        <span className="ld-card-title">Change one byte of a receipt</span>
        <Ld.Tag tone={r ? "danger" : undefined} dot>
          {r ? `${r.s.pass} of ${CHECK_TOTAL}` : "Checking"}
        </Ld.Tag>
      </div>
      <span className="ld-caption">One character of opportunity {n}&apos;s receipt nonce, changed in a copy and re-checked here</span>
      {row("Receipt hash", r?.receipt)}
      {row("Publisher signature (Ed25519)", r?.signature)}
    </div>
  );
}
