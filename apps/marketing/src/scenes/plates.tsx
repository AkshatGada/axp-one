// The six plates behind one Sponsored card. Each plate is a small, real specimen from the
// recorded run (the cached question), in plain words: the answer, the card, the auction, the
// agents, the evidence and the payment. Shared by the hero stack, the closing and /design.
import type { ReactNode } from "react";
import { CACHED, CV, CV_CHANNEL, HELPFUL_EXCERPT, RUN, usdc } from "@/data/run";
import { HERO } from "@/data/copy-v6";
import { SponsoredCard } from "@/specimens/SponsoredCard";
import { ChannelMeter } from "@/specimens/ChannelMeter";

export type PlateId = "answer" | "card" | "auction" | "agents" | "evidence" | "payment";
export type PlateDef = { id: PlateId; name: string; note: string; body: ReactNode };

const KF = RUN.campaigns["v3-keyforge"];
const LG = RUN.campaigns["v3-leatherguard"];
const cut = (t: string, n: number) => (t.length <= n ? t : `${t.slice(0, n).replace(/\s+\S*$/, "")}…`);

export const PLATES: PlateDef[] = [
  {
    id: "answer",
    name: "Answer",
    note: "excerpt",
    body: (
      <>
        <p className="sc-plate-q">{CACHED.question}</p>
        <p className="sc-plate-lines">{cut(HELPFUL_EXCERPT, 150)}</p>
      </>
    ),
  },
  {
    id: "card",
    name: "Card",
    note: "Sponsored",
    body: <SponsoredCard name={CV.name} text={CV.approvedText!} destination={CV.destination} square />,
  },
  {
    id: "auction",
    name: "Auction",
    note: "decided in code",
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
          <span>Tie</span>
          <span>broken by a fixed rule</span>
        </div>
        <div className="sp-row">
          <span>Price</span>
          <span>set by policy, capped</span>
        </div>
      </div>
    ),
  },
  {
    id: "agents",
    name: "Agents",
    note: "judged with Jev",
    body: (
      <div className="sc-agents">
        <div className="sc-agent">
          <b>{CV.name}</b>
          <span className="sp-tag" data-solid="">Bid</span>
        </div>
        <div className="sc-agent">
          <b>{KF.name}</b>
          <span className="sp-tag" data-solid="">Bid</span>
        </div>
        <div className="sc-agent" data-skip="">
          <b>{LG.name}</b>
          <span className="sp-tag">Ruled out</span>
          <span className="sc-agent-note">asked anyway: skip</span>
        </div>
      </div>
    ),
  },
  {
    id: "evidence",
    name: "Evidence",
    note: "from ContextHint",
    body: (
      <div className="sc-evi-wrap">
        <div className="sc-evi">
          <div>
            <span className="sc-evi-k">Prompt</span>
            <span>{RUN.evidence.observedPrompt}</span>
          </div>
          <div>
            <span className="sc-evi-k">Ad shown</span>
            <span>{cut(RUN.evidence.observedCreative, 46)}</span>
          </div>
          <div>
            <span className="sc-evi-k">Audience</span>
            <span>{cut(RUN.evidence.hintText, 52)}</span>
          </div>
        </div>
        <p className="sc-evi-note">{HERO.brandNote}</p>
      </div>
    ),
  },
  {
    id: "payment",
    name: "Payment",
    note: "settled on Solana",
    body: (
      <div style={{ paddingTop: 4 }}>
        <ChannelMeter ch={CV_CHANNEL} t={1} compact title="Solana payment channel" />
        <div className="sp-row" style={{ marginTop: 12 }}>
          <span>This card</span>
          <span className="px-num">{usdc(CACHED.price!)} USDC</span>
        </div>
      </div>
    ),
  },
];

export const CALLOUTS = PLATES.map((p) => ({ id: p.id, ...HERO.callouts[p.id] }));

export function PlateSheet({ p }: { p: PlateDef }) {
  return (
    <div className="sc-plate-sheet">
      <div className="sc-plate-bar">
        <span className="sc-plate-name">
          {p.name} <span className="sc-plate-note">{p.note}</span>
        </span>
      </div>
      <div className="sc-plate-body">{p.body}</div>
    </div>
  );
}
