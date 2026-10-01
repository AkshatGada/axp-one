// What one buying agent saw for one question: a recorded prompt, the ad shown beside it, the
// audience it implies (ContextHint, vermillion) and the hand-off to ClearVault's agent, where
// the evidence turns ultramarine. Plain words only; record IDs live in the MVP.
import type { ReactNode } from "react";
import { Provenance } from "@axp/design-system/foundation";
import type { ProvenanceKind } from "@axp/design-system/foundation";
import { RUN } from "@/data/run";
import { CONTEXTHINT } from "@/data/copy-book";

function Step({ kind, kicker, children, note, tone }: { kind: ProvenanceKind; kicker: ReactNode; children: ReactNode; note?: ReactNode; tone?: "ch" | "hand" | "brand" }) {
  return (
    <li className="sp-chain-step" data-tone={tone}>
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

export function EvidenceChain() {
  const ev = RUN.evidence;
  const c = CONTEXTHINT.chain;
  return (
    <ol className="sp-chain">
      <Step tone="ch" kind="observed" kicker={c.prompt} note={c.promptNote}>
        <p className="sp-chain-text">
          <q>{ev.observedPrompt}</q>
        </p>
      </Step>
      <Step tone="ch" kind="observed" kicker={c.ad} note={c.adNote}>
        <p className="sp-chain-text">
          <q>{ev.observedCreative}</q>
        </p>
      </Step>
      <Step tone="hand" kind="inferred" kicker={c.hint} note={c.hintNote}>
        <p className="sp-chain-text">{ev.hintText}</p>
      </Step>
      <Step tone="brand" kind="fictional" kicker={c.handed} note={c.handedNote}>
        <p className="sp-chain-text">The agent judged the moment with this evidence beside its own campaign.</p>
      </Step>
    </ol>
  );
}

/** The payoff, with changed and unchanged results at equal weight, and the eligibility guard. */
export function EvidencePayoff() {
  const p = CONTEXTHINT.payoff;
  return (
    <div className="sp-payoff">
      <p className="sp-payoff-title">{p.title}</p>
      <div className="sp-payoff-grid">
        <div>
          <span className="px-label">{p.changed.q}</span>
          <p>{p.changed.a}</p>
        </div>
        <div>
          <span className="px-label">{p.unchanged.q}</span>
          <p>{p.unchanged.a}</p>
        </div>
        <div data-guard="">
          <span className="px-label">And the guard</span>
          <p>{p.leather}</p>
        </div>
      </div>
      <p className="px-small">{p.note}</p>
    </div>
  );
}
