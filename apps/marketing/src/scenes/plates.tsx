// The six plates behind one Sponsored card. Each plate is a small, real specimen from the
// recorded run (cached question): the answer, the card, the auction, the agents, the evidence
// and the payment. Shared by the hero stack, the closing collapse and the /design showcase.
import type { ReactNode } from "react";
import { Provenance, type ProvenanceKind } from "@axp/design-system/foundation";
import { CACHED, CV, CV_CHANNEL, RUN, decision, usdc } from "@/data/run";
import { HERO } from "@/data/copy";
import { SponsoredCard } from "@/specimens/SponsoredCard";
import { ChannelMeter } from "@/specimens/ChannelMeter";

export type PlateId = "answer" | "card" | "auction" | "agents" | "evidence" | "payment";
export type PlateDef = { id: PlateId; name: string; kinds: ProvenanceKind[]; body: ReactNode };

const cv = decision(CACHED, "v3-clearvault", "history");
const kf = decision(CACHED, "v3-keyforge", "history");
const lg = decision(CACHED, "v3-leatherguard", "history");
const firstSentence = CACHED.organic.excerpt.split(/(?<=[.!?])\s/)[0];

function Agent({ name, d }: { name: string; d: typeof cv }) {
  return (
    <div className="sc-agent" data-skip={d.decision === "skip" ? "" : undefined}>
      <b>{name}</b>
      <span className="sp-tag" data-solid={d.decision === "bid" ? "" : undefined}>
        {d.decision === "bid" ? "Bid" : "Skip"}
      </span>
      <span className="px-num">
        R{d.relevanceLevel} I{d.intentLevel}
      </span>
    </div>
  );
}

export const PLATES: PlateDef[] = [
  {
    id: "answer",
    name: "Answer",
    kinds: ["actual"],
    body: (
      <>
        <p className="sc-plate-q">{CACHED.question}</p>
        <p className="sc-plate-lines">{firstSentence}</p>
      </>
    ),
  },
  {
    id: "card",
    name: "Card",
    kinds: ["fictional"],
    body: <SponsoredCard name={CV.name} text={CV.approvedText!} destination={CV.destination} square />,
  },
  {
    id: "auction",
    name: "Auction",
    kinds: ["policy"],
    body: (
      <div>
        {CACHED.bids.map((b) => (
          <div key={b.campaign} className="sp-row" data-win={b.campaign === CACHED.winner ? "" : undefined}>
            <span>
              {b.name} {b.campaign === CACHED.winner ? <span className="sp-tag" data-solid="">Won</span> : null}
            </span>
            <span className="px-num">{usdc(b.amount)} USDC</span>
          </div>
        ))}
        <div className="sp-row">
          <span>Tie rule</span>
          <span>campaign ID order</span>
        </div>
        <div className="sp-row">
          <span>Policy</span>
          <span className="px-num">{RUN.policy.bidPolicy}</span>
        </div>
      </div>
    ),
  },
  {
    id: "agents",
    name: "Agents",
    kinds: ["actual"],
    body: (
      <div className="sc-agents">
        <Agent name={CV.name} d={cv} />
        <Agent name={RUN.campaigns["v3-keyforge"].name} d={kf} />
        <Agent name={RUN.campaigns["v3-leatherguard"].name} d={lg} />
      </div>
    ),
  },
  {
    id: "evidence",
    name: "Evidence",
    kinds: ["observed", "inferred"],
    body: (
      <div className="sc-evi">
        <div>
          <Provenance kind="observed" label="Prompt" />
          <span>{RUN.evidence.observedPrompt}</span>
        </div>
        <div>
          <Provenance kind="observed" label="Ad" />
          <span>{RUN.evidence.observedCreative.split(" | ")[0]}</span>
        </div>
        <div>
          <Provenance kind="inferred" label="Audience" />
          <span>{RUN.evidence.hintText.split(" looking")[0]}</span>
        </div>
      </div>
    ),
  },
  {
    id: "payment",
    name: "Payment",
    kinds: ["settled"],
    body: (
      <div style={{ paddingTop: 6 }}>
        <ChannelMeter ch={CV_CHANNEL} t={1} compact />
        <div className="sp-row" style={{ marginTop: 14 }}>
          <span>This card</span>
          <span className="px-num">{usdc(CACHED.price!)} USDC</span>
        </div>
      </div>
    ),
  },
];

export const CALLOUTS = PLATES.map((p) => ({ id: p.id, kinds: p.kinds, ...HERO.callouts[p.id] }));

export function PlateSheet({ p }: { p: PlateDef }) {
  return (
    <div className="sc-plate-sheet">
      <div className="sc-plate-bar">
        <span className="sc-plate-name">{p.name}</span>
        <span className="px-marks">
          {p.kinds.map((k) => (
            <Provenance key={k} kind={k} />
          ))}
        </span>
      </div>
      <div className="sc-plate-body">{p.body}</div>
    </div>
  );
}
