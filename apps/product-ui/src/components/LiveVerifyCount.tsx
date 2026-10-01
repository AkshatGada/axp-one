"use client";
import { useEffect, useState } from "react";
import { verifyChecks } from "@/lib/verify.ts";
import type { ProductRun } from "@/data/types";
import { asset } from "@/lib/paths";

/** "48 of 48": every recomputable check, run in this browser against the public file. */
export function LiveVerifyCount() {
  const [r, setR] = useState<{ pass: number; total: number; fail: number } | null>(null);
  useEffect(() => {
    let live = true;
    fetch(asset("/run.public.json"))
      .then((x) => x.json() as Promise<ProductRun>)
      .then((run) => verifyChecks(run))
      .then((cs) => live && setR({ pass: cs.filter((c) => c.status === "pass").length, total: cs.length, fail: cs.filter((c) => c.status === "fail").length }))
      .catch(() => live && setR({ pass: 0, total: 0, fail: 1 }));
    return () => {
      live = false;
    };
  }, []);
  return (
    <div className="vf-summary" data-state={r ? (r.fail ? "fail" : "pass") : "idle"}>
      {r ? <span className="vf-big">{`${r.pass} of ${r.total}`}</span> : null}
      <span className="lg-h2" style={{ color: "inherit" }}>
        {r ? (r.fail ? `${r.fail} failed in this browser` : "checks passed in this browser") : "Hashes, signatures and sums, recomputed in this browser"}
      </span>
    </div>
  );
}
