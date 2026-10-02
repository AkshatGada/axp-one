"use client";
// A finished live run, opened from the live-run API: its bundle is projected in this browser with the same code the
// build uses (src/lib/project-core.mjs), checked with the same structural and browser checks, and shown with the same
// Ledger components. Nothing here is precomputed; every number comes from the bundle the API serves.
import { useEffect, useState } from "react";
import { Ld } from "@axp/design-system/ledger";
import { createLiveClient } from "@/lib/live-client.mjs";
import { project, structuralChecks } from "@/lib/project-core.mjs";
import { makeStory, usdcText as usdc, auctionKind, list } from "@/lib/narrative.ts";
import { expectedCheckCount, verifyChecks, summarize } from "@/lib/verify.ts";
import type { ProductRun } from "@/data/types";
import { asset } from "@/lib/paths";
import SAMPLE from "@/data/live-sample.json";

/** The finished live run saved with this site (public/live-runs/), opened the same way as a run from the API. */
const SAMPLE_ID = (SAMPLE as { runId: string | null }).runId;

type Loaded = { run: ProductRun; failed: string[]; checks: { pass: number; total: number; expected: number; passing: boolean } | null };

export function RunView() {
  const [id, setId] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "absent" | "error" | "ready">("loading");
  const [msg, setMsg] = useState("");
  const [data, setData] = useState<Loaded | null>(null);
  const [fromSite, setFromSite] = useState(false);

  useEffect(() => {
    const runId = new URLSearchParams(window.location.search).get("id");
    setId(runId);
    if (!runId) {
      setState("error");
      setMsg("No run id in the address.");
      return;
    }
    const saved = runId === SAMPLE_ID;
    if (process.env.NEXT_PUBLIC_LIVE_API !== "1" && !saved) {
      setState("absent");
      return;
    }
    let live = true;
    (async () => {
      try {
        // The saved run is served with this site; any other id needs the live API.
        const cfg = saved ? null : await createLiveClient().config().catch(() => null);
        if (!saved && !cfg) {
          if (live) setState("absent");
          return;
        }
        setFromSite(saved);
        // The exact bytes the service (or this site) serves, so the manifest's run.json hash is checked as at build time.
        const raw = async (p: string) => {
          const res = await fetch(saved ? asset(`/live-runs/${encodeURIComponent(runId)}/${p}`) : `/api/runs/${encodeURIComponent(runId)}/files/${p}`);
          if (!res.ok) throw new Error(`${p}: HTTP ${res.status}`);
          return new Uint8Array(await res.arrayBuffer());
        };
        const [runBytes, manifestBytes, chainBytes] = await Promise.all([raw("replay/run.json"), raw("replay/manifest.json"), raw("chain-check.json")]);
        const failed: string[] = [];
        const check = (name: string, ok: boolean) => {
          if (!ok) failed.push(name);
        };
        const { projection } = project({ runBytes, manifestBytes, chainCheck: JSON.parse(new TextDecoder().decode(chainBytes)), paths: { run: `live/${runId}/replay/run.json`, manifest: `live/${runId}/replay/manifest.json` } }, { check });
        structuralChecks(projection, check, JSON.parse(new TextDecoder().decode(runBytes)));
        const cs = await verifyChecks(projection);
        const s = summarize(cs, cs.map((x) => x.id));
        if (!live) return;
        setData({ run: projection, failed, checks: { pass: s.pass, total: cs.length, expected: expectedCheckCount(projection), passing: s.passing && cs.length === expectedCheckCount(projection) } });
        setState("ready");
      } catch (e) {
        if (!live) return;
        setState("error");
        setMsg(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  if (state === "loading") return <Ld.Panel title="Loading the run">Fetching the bundle and checking it in this browser.</Ld.Panel>;
  if (state === "absent")
    return (
      <Ld.Callout tone="brand" title="This run needs the live-run service">
        This copy of the MVP is static, so it can only open the finished live run saved with it. <a className="ld-link" href={asset("/live/")}>Back to Run it live</a>
      </Ld.Callout>
    );
  if (state === "error" || !data)
    return (
      <Ld.Callout tone="danger" title="This run could not be opened">
        {msg || "Unknown error."} <a className="ld-link" href={asset("/live/")}>Back to Run it live</a>
      </Ld.Callout>
    );

  const r = data.run;
  const story = makeStory(r);
  const hl = story.highlight();
  return (
    <div className="ld-stack-lg" style={{ gap: 16 }}>
      <Ld.PageBar
        crumbs={<Ld.Breadcrumbs items={[{ label: "Run it live", href: asset("/live/") }, { label: "Finished run" }]} />}
        title="A live run on Solana Devnet"
        meta={<Ld.Tag tone="brand">Live run</Ld.Tag>}
        sub={<>Run <span className="ld-mono">{id}</span>, projected and checked in this browser from {fromSite ? "its saved bundle: started through the live-run service, with a browser page confirming each card" : "the bundle the live service serves"}.</>}
      />
      <div className="ld-kpis">
        <Ld.Kpi label="Questions" value={r.counts.opportunities} context={`${r.counts.auctions} filled${r.counts.noFill ? `, ${r.counts.noFill} no fill` : ""}`} />
        <Ld.Kpi label="Agent decisions" value={r.counts.decisions} context="By Jev" />
        <Ld.Kpi label="Paid to the app" value={usdc(r.totals.paidBaseUnits)} unit="USDC" context={`Devnet test USDC; ${usdc(r.totals.refundedBaseUnits)} refunded`} />
        <Ld.Kpi label="Devnet transactions" value={r.chainTxs.length} context={`For ${r.counts.receipts} paid deliveries`} />
        <Ld.Kpi tone="live" label="Checks in this browser" value={data.checks ? `${data.checks.pass}/${data.checks.expected}` : "none"} context="Hashes, signatures, sums and rules" chip={<Ld.Tag tone={data.checks?.passing && !data.failed.length ? "success" : "danger"} dot>{data.checks?.passing && !data.failed.length ? "Passing" : "Not passing"}</Ld.Tag>} />
      </div>
      {data.failed.length ? (
        <Ld.Callout tone="danger" title={`${data.failed.length} structural check${data.failed.length === 1 ? "" : "s"} did not pass`}>
          {data.failed.join("; ")}
        </Ld.Callout>
      ) : null}
      {hl ? (
        <Ld.Callout tone="brand" title={hl.title}>
          {hl.body} {story.otherAuctionsLine(hl.n)}
        </Ld.Callout>
      ) : null}
      <Ld.Panel title="Each question" flush>
        <Ld.Table
          columns={[
            { key: "q", head: "Question", cell: (o: ProductRun["opportunities"][number]) => <span className="ld-stack" style={{ gap: 2 }}><span className="ld-strong">{o.question}</span><span className="ld-caption">{auctionKind(o) === "nofill" ? story.noFillSentence(o) : story.auctionSentence(o)}</span></span> },
            { key: "w", head: "Winner", cell: (o) => (o.award ? story.nameOf(o.award.campaignId) : <span className="ld-faint">nobody</span>) },
            { key: "p", head: "USDC", num: true, cell: (o) => (o.award ? usdc(o.award.priceBaseUnits) : <span className="ld-faint">none</span>) },
            { key: "r", head: "Receipt", cell: (o) => (o.receipt ? <span className="ld-mono">{`${o.receipt.receiptHash.slice(0, 10)}…`}</span> : <span className="ld-faint">none</span>) },
          ]}
          rows={r.opportunities}
        />
      </Ld.Panel>
      <Ld.Panel title="Settlement on Solana Devnet" sub="Every transaction opens in the Solana explorer" flush>
        <Ld.Table
          columns={[
            { key: "c", head: "Channel", cell: (ch: ProductRun["channels"][number]) => <span className="ld-strong">{story.nameOf(ch.campaignId)}</span> },
            { key: "d", head: "Deposit", num: true, cell: (ch) => usdc(ch.depositBaseUnits) },
            { key: "v", head: "Vouchers", cell: (ch) => list(ch.vouchers.map((v) => usdc(v.cumulativeAmountBaseUnits))) || "none" },
            { key: "p", head: "Paid, refunded", cell: (ch) => `${usdc(ch.settledBaseUnits)}, ${usdc(ch.refundBaseUnits)}` },
            {
              key: "x",
              head: "Explorer",
              cell: (ch) => (
                <span className="ld-row" style={{ gap: 10 }}>
                  {[
                    ["Channel", ch.explorerUrl],
                    ["Open", ch.open.explorerUrl],
                    ["Close", ch.close.explorerUrl],
                  ].map(([k, u]) =>
                    u ? (
                      <a key={k} className="ld-link" href={u as string} target="_blank" rel="noopener noreferrer">
                        {k} ↗
                      </a>
                    ) : null,
                  )}
                </span>
              ),
            },
          ]}
          rows={r.channels}
        />
      </Ld.Panel>
      <p className="ld-caption">Devnet test USDC; not mainnet. A signed receipt shows the app inserted a labelled card, not that a person read it. The demo operator runs the advertisers&apos; test wallets.</p>
    </div>
  );
}
