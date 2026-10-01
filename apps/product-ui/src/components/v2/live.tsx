"use client";
import { useEffect, useState } from "react";
import { Ld } from "@axp/design-system/ledger";
import { canonical, hashCanonical, verifyEd25519 } from "@/lib/canonical.ts";
import { verifyChecks } from "@/lib/verify.ts";
import type { ProductRun } from "@/data/types";
import { asset } from "@/lib/paths";

export function LiveHashV2({ value, expected, label }: { value: unknown; expected: string; label: string }) {
  const [s, setS] = useState<"idle" | "pass" | "fail">("idle");
  useEffect(() => {
    let live = true;
    hashCanonical(value).then((h) => live && setS(h === expected ? "pass" : "fail"));
    return () => {
      live = false;
    };
  }, [value, expected]);
  return <Ld.Verified state={s}>{s === "fail" ? `${label}: mismatch` : label}</Ld.Verified>;
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
  return <Ld.Verified state={s}>{s === "recorded" ? "Ed25519 not supported in this browser" : s === "fail" ? "Signature invalid" : "Ed25519 signature verified here"}</Ld.Verified>;
}

export function LiveVerifyTile() {
  const [r, setR] = useState<{ pass: number; total: number; fail: number } | null>(null);
  useEffect(() => {
    let live = true;
    fetch(asset("/run.public.json"))
      .then((x) => x.json() as Promise<ProductRun>)
      .then((run) => verifyChecks(run))
      .then((cs) => live && setR({ pass: cs.filter((c) => c.status === "pass").length, total: cs.length, fail: cs.filter((c) => c.status === "fail").length }));
    return () => {
      live = false;
    };
  }, []);
  return (
    <Ld.Kpi
      tone="live"
      label="Verify"
      value={r ? `${r.pass}/${r.total}` : ""}
      context={r ? "Recomputed in this browser just now" : "Recomputing hashes and signatures here"}
      chip={r ? <Ld.Tag tone={r.fail ? "danger" : "success"} dot>{r.fail ? `${r.fail} failed` : "Passing"}</Ld.Tag> : null}
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
