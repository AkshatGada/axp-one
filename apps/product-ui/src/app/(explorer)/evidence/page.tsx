import type { Metadata } from "next";
import { Ld, Term } from "@axp/design-system/ledger";
import { GLOSSARY } from "@/data/glossary";
import { run } from "@/data/select";

export const metadata: Metadata = { title: "Evidence" };
const n = (x: number) => x.toLocaleString("en-US");

export default function EvidencePage() {
  const d = run.dataset;
  const tiers = Object.entries(d.hintTiers);
  const tierMax = Math.max(...tiers.map(([, v]) => v));
  const used = new Map<string, { sim: number; method: string; who: Set<string>; opps: Set<number> }>();
  for (const o of run.opportunities)
    for (const dec of o.decisions)
      for (const e of dec.retrieval?.examples ?? []) {
        const cur = used.get(e.id) ?? { sim: e.similarity, method: dec.retrieval!.method, who: new Set(), opps: new Set() };
        if (e.similarity > cur.sim) cur.sim = e.similarity;
        cur.who.add(dec.campaignId);
        cur.opps.add(o.n);
        used.set(e.id, cur);
      }
  const shownIds = new Set(used.keys());
  const neighbours = run.evidence.records.filter((r) => !shownIds.has(r.id));
  return (
    <>
      <Ld.PageBar
        title="Evidence"
        meta={<Ld.Tag tone="ch" dot>ContextHint</Ld.Tag>}
        sub={
          <>
            ContextHint is the intelligence platform for ChatGPT ads. Agents judged each moment with history from <Term title={GLOSSARY.contexthint.term} def={GLOSSARY.contexthint.def}>ContextHint</Term> (
            <a className="ld-link" href="https://contexthint.com" target="_blank" rel="noopener noreferrer">
              contexthint.com
            </a>
            ): prompts and the ads that appeared beside them, from ContextHint&apos;s stored ad library and ContextHint&apos;s collection, plus inferred targeting hints. Brands below are observed historical references, not axp.one advertisers.
          </>
        }
      />
      <div className="ld-kpis">
        <Ld.Kpi label="Prompt and ad pairs" value={n(d.counts.associations)} context="In the screened slice" />
        <Ld.Kpi label="Distinct prompts" value={n(d.counts.normalizedPrompts)} context="Each ranked once" />
        <Ld.Kpi label="Ad creatives" value={n(d.counts.creatives)} context="Observed, not enrolled" />
        <Ld.Kpi label="Inferred hints" value={n(d.counts.hints)} context="Hypotheses, not settings" />
        <Ld.Kpi label="Used in this run" value={`${run.evidence.records.length} + ${run.evidence.hints.length}`} context="Records and hints shown to agents" />
      </div>
      <div className="ld-cols-3">
        <Ld.Panel title="Topics in the slice">
          <span className="ld-row" style={{ gap: 6 }}>
            {d.selection.niches.map((x) => (
              <Ld.Tag key={x} tone="outline">
                {({ "crypto-hardware-wallets-self-custody": "Hardware wallets and self-custody", "crypto-investing": "Crypto investing", "web3-infrastructure": "Web3 infrastructure", "crypto-tax-software-defi-accounting": "Crypto tax and DeFi accounting", "privacy-preserving-blockchains-zk-compliance": "Privacy blockchains and compliance" } as Record<string, string>)[x] ?? x.replace(/-/g, " ")}
              </Ld.Tag>
            ))}
          </span>
        </Ld.Panel>
        <Ld.Panel title="Hint tiers">
          <div className="ld-stack" style={{ gap: 8 }}>
            {tiers.map(([k, v]) => (
              <span key={k} className="ld-stack" style={{ gap: 4 }}>
                <span className="ld-label">{k === "loo" ? "Leave-one-out tested" : k === "holdout" ? "Held-out tested" : "Sparse (few supporting ads)"}</span>
                <Ld.Progress value={v} max={tierMax} tone="ink" label={n(v)} />
              </span>
            ))}
          </div>
        </Ld.Panel>
        <Ld.Panel title="Sources">
          <div className="ld-stack" style={{ gap: 8 }}>
            {Object.entries(d.counts.sources).map(([k, v]) => (
              <span key={k} className="ld-stack" style={{ gap: 4 }}>
                <span className="ld-label">{k === "aws" ? "ContextHint's stored ad library" : k === "verseodin" ? "ContextHint's collection" : k}</span>
                <Ld.Progress value={v} max={d.counts.associations} tone="ink" label={n(v)} />
              </span>
            ))}
          </div>
        </Ld.Panel>
      </div>
      <Ld.Panel title="How agents got their evidence" sub="Retrieval method, per question">
        <div className="ld-cols-2">
          <Ld.Callout tone="brand" title="Vector match (cosine similarity) for stored questions">
            When the exact question already had a stored embedding (BGE, 768 dimensions), retrieval ranked prompts by cosine similarity. No embeddings were generated during the run, and vectors never leave the backend.
          </Ld.Callout>
          <Ld.Callout tone="warning" title="Lexical fallback for new wording">
            When no stored vector existed, retrieval ranked prompts by shared words. That is an overlap score, not semantic similarity, and it is labelled that way wherever it appears.
          </Ld.Callout>
        </div>
      </Ld.Panel>
      <Ld.Panel title="Records shown to agents" sub="The observed examples placed in agent packets">
        <div className="ld-cols-2">
          {[...used.entries()].map(([id, u]) => {
            const r = run.evidence.records.find((x) => x.id === id)!;
            return (
              <div key={id} id={`evidence-${id}`} className="ld-stack" style={{ gap: 6 }}>
                <Ld.EvidenceCard prompt={r.promptText} advertiser={r.advertiser} creative={r.creativeText} sim={u.sim} method={u.method} />
                <span className="ld-caption">
                  Shown to {[...u.who].map((w) => run.campaigns.find((c) => c.campaignId === w)!.businessName).join(", ")}, in {u.opps.size === 1 ? "opportunity" : "opportunities"} {[...u.opps].join(", ")}
                </span>
              </div>
            );
          })}
        </div>
      </Ld.Panel>
      <div className="ld-cols-2">
        <Ld.Panel title="Inferred hints shown to agents">
          <div className="ld-stack">
            {run.evidence.hints.map((h) => (
              <div key={h.id} id={`evidence-${h.id}`} className="ld-evidence">
                <div className="ld-between">
                  <Ld.Pv kind="inferred" label="Inferred hint" />
                  <Ld.Tag>{h.tier === "sparse" ? "Sparse" : h.tier === "loo" ? "Leave-one-out tested" : "Held-out tested"}</Ld.Tag>
                </div>
                <span className="ld-secondary" style={{ color: "var(--ld-text)" }}>
                  {h.text}
                </span>
              </div>
            ))}
          </div>
        </Ld.Panel>
        <Ld.Panel title="Other nearby prompts" sub="Neighbours listed in packets but not shown as examples">
          <div className="ld-stack" style={{ gap: 8 }}>
            {neighbours.map((r) => (
              <div key={r.id} id={`evidence-${r.id}`} className="ld-stack" style={{ gap: 2, paddingBottom: 8, borderBottom: "1px solid var(--ld-border)" }}>
                <span className="ld-secondary" style={{ color: "var(--ld-text)" }}>“{r.promptText}”</span>
                <span className="ld-caption">
                  <Ld.Pv kind="observed" label={r.advertiser} /> Observed historical reference, not an axp.one advertiser
                </span>
              </div>
            ))}
          </div>
        </Ld.Panel>
      </div>
      <Ld.Panel title="What this evidence is not" sub="From the dataset manifest">
        <ul className="ev2-list">
          {d.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </Ld.Panel>
    </>
  );
}
