// What one buying agent saw for one question, as a chain: the observed prompt, the observed ad it
// drew, the inferred audience, the hand-off to ClearVault's agent and what changed.
import type { ReactNode } from "react";
import { Provenance } from "@axp/design-system/foundation";
import type { ProvenanceKind } from "@axp/design-system/foundation";
import { CACHED, CV, RUN, decision } from "@/data/run";
import { CONTEXTHINT } from "@/data/copy";

function Step({ kind, kicker, children, note }: { kind: ProvenanceKind; kicker: ReactNode; children: ReactNode; note?: ReactNode }) {
  return (
    <li className="sp-chain-step">
      <span className="sp-chain-node" aria-hidden>
        <Provenance kind={kind} label="" />
      </span>
      <div className="sp-chain-main">
        <span className="sp-chain-kicker">{kicker}</span>
        {children}
        {note ? <p className="sp-chain-note">{note}</p> : null}
      </div>
    </li>
  );
}

export function ScoreRuler({ from, to, line = 2.5, fromLabel, toLabel }: { from: number; to: number; line?: number; fromLabel: string; toLabel: string }) {
  const lo = 2;
  const hi = 3;
  const x = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  return (
    <div className="sp-ruler" role="img" aria-label={`Intent score ${from} without history, ${to} with history; level 3 starts at ${line}`}>
      <i className="sp-ruler-axis" />
      {[2, 2.5, 3].map((v) => (
        <i key={v} className="sp-ruler-tick" style={{ left: x(v) }}>
          <span>{v.toFixed(1)}</span>
        </i>
      ))}
      <i className="sp-ruler-line" style={{ left: x(line) }}>
        <span>from {line}, intent rounds to 3</span>
      </i>
      <i className="sp-ruler-mark" style={{ left: x(from) }} title={fromLabel}>
        <span data-side="left">{from} text only</span>
      </i>
      <i className="sp-ruler-mark" data-filled="" style={{ left: x(to) }} title={toLabel}>
        <span data-side="right">{to} with history</span>
      </i>
    </div>
  );
}

export function EvidenceChain({ compact }: { compact?: boolean }) {
  const ev = RUN.evidence;
  const t = decision(CACHED, "v3-clearvault", "text_only");
  const h = decision(CACHED, "v3-clearvault", "history");
  return (
    <ol className="sp-chain">
      <Step kind="observed" kicker={<>{CONTEXTHINT.chain.prompt} <span className="px-num">{ev.observedId}</span></>} note="The same question had been asked before and recorded.">
        <p className="sp-chain-text">
          <q>{ev.observedPrompt}</q>
        </p>
      </Step>
      <Step kind="observed" kicker={CONTEXTHINT.chain.ad} note={CONTEXTHINT.brandNote}>
        <p className="sp-chain-text">{ev.observedCreative}</p>
      </Step>
      <Step kind="inferred" kicker={<>{CONTEXTHINT.chain.hint} <span className="px-num">{ev.hintId}</span></>} note="A hypothesis about who the ad was after, not an advertiser setting.">
        <p className="sp-chain-text">{ev.hintText}</p>
      </Step>
      <Step kind="fictional" kicker={CONTEXTHINT.chain.handed} note={compact ? undefined : `Retrieved by ${ev.method} search, similarity ${ev.similarity}. No rival bids, budgets or wallets in the packet.`}>
        <p className="sp-chain-text">
          {CV.name} is fictional. Its agent saw this one example and one hint, beside its own campaign.
        </p>
      </Step>
      <Step kind="actual" kicker={`Actual output, ${h.model}`} note={CONTEXTHINT.chain.resultNote}>
        <span className="sp-chain-result">{CONTEXTHINT.chain.result}.</span>
        <ScoreRuler from={t.intentScore!} to={h.intentScore!} fromLabel="Question text only" toLabel="With history" />
      </Step>
    </ol>
  );
}
