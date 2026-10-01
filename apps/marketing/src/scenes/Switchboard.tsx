// The exchange as a schematic switchboard on the dark stage: the publisher tile, three agent cards,
// the ContextHint feed, the exchange core (eligibility gate, bid policy, auction, reservation),
// the receipt and the channel. `beat` (0..6) lights the region the step is about; the others dim.
// Values are actual (cached question). Motion is illustrative.
import { Provenance } from "@axp/design-system/foundation";
import type { CSSProperties, ReactNode } from "react";
import { CACHED, CV, CV_CHANNEL, RUN, decision, receiptFor, usdc } from "@/data/run";
import { ChannelMeter } from "@/specimens/ChannelMeter";

export const BOARD_W = 1000;
export const BOARD_H = 660;

type Box = { x: number; y: number; w: number; h: number };
const B: Record<string, Box> = {
  pub: { x: 300, y: 14, w: 400, h: 132 },
  rec: { x: 740, y: 14, w: 246, h: 132 },
  a0: { x: 14, y: 196, w: 236, h: 84 },
  a1: { x: 14, y: 292, w: 236, h: 84 },
  a2: { x: 14, y: 388, w: 236, h: 84 },
  feed: { x: 14, y: 520, w: 236, h: 126 },
  gate: { x: 300, y: 196, w: 160, h: 276 },
  pol: { x: 476, y: 196, w: 160, h: 276 },
  auc: { x: 652, y: 196, w: 160, h: 276 },
  res: { x: 828, y: 196, w: 158, h: 276 },
  chan: { x: 300, y: 520, w: 686, h: 126 },
};

/** Which regions and wires each beat lights. */
export const BEAT_LIGHT: { nodes: string[]; wires: string[] }[] = [
  { nodes: ["pub"], wires: [] },
  { nodes: ["gate"], wires: ["pub-gate"] },
  { nodes: ["feed", "a0", "a1"], wires: ["feed-a"] },
  { nodes: ["a0", "a1", "a2"], wires: ["gate-a"] },
  { nodes: ["pol", "auc", "res"], wires: ["a-pol", "pol-auc", "auc-res"] },
  { nodes: ["pub", "rec"], wires: ["res-pub", "pub-rec"] },
  { nodes: ["chan", "rec"], wires: ["rec-chan"] },
];

const WIRES: Record<string, string> = {
  "pub-gate": "M380 146 V196",
  "gate-a": "M300 334 H250",
  "feed-a": "M132 520 V472",
  "a-pol": "M250 238 H276 V170 H556 V196",
  "pol-auc": "M636 334 H652",
  "auc-res": "M812 334 H828",
  "res-pub": "M907 196 V170 H660 V146",
  "pub-rec": "M700 80 H740",
  "rec-chan": "M863 146 V178 H996 V583 H986",
};

function Node({ id, beat, children, ruled, label }: { id: string; beat: number; children: ReactNode; ruled?: boolean; label?: string }) {
  const b = B[id]!;
  const on = beat < 0 || BEAT_LIGHT[beat]?.nodes.includes(id);
  const seen = !on && BEAT_LIGHT.slice(0, beat).some((l) => l.nodes.includes(id));
  return (
    <div className="sc-node" data-on={on ? "" : undefined} data-seen={seen ? "" : undefined} data-ruled={ruled ? "" : undefined} aria-label={label} style={{ left: b.x, top: b.y, width: b.w, height: b.h } as CSSProperties}>
      {children}
    </div>
  );
}

const REASON: Record<string, string> = { missing_constraint: "missing capability", frequency_cap: "frequency cap" };

export function Switchboard({ beat }: { beat: number }) {
  const cv = decision(CACHED, "v3-clearvault", "history");
  const cvT = decision(CACHED, "v3-clearvault", "text_only");
  const kf = decision(CACHED, "v3-keyforge", "history");
  const lg = decision(CACHED, "v3-leatherguard", "history");
  const r = receiptFor("v3-cached");
  const lit = beat < 0 ? Object.keys(WIRES) : (BEAT_LIGHT[beat]?.wires ?? []);
  const agents = [
    { id: "a0", name: CV.name, d: cv },
    { id: "a1", name: RUN.campaigns["v3-keyforge"].name, d: kf },
    { id: "a2", name: RUN.campaigns["v3-leatherguard"].name, d: lg },
  ];
  const excl = CACHED.excluded[0]!;
  return (
    <div className="sc-board on-stage">
      <svg className="sc-wires" viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} width={BOARD_W} height={BOARD_H} aria-hidden>
        {Object.entries(WIRES).map(([k, d]) => (
          <path key={k} className="sc-wire" d={d} data-on={lit.includes(k) ? "" : undefined} />
        ))}
      </svg>

      <Node id="pub" beat={beat} label="The AI app">
        <div className="sc-node-h">
          <span className="sc-node-name">Our demo AI app</span>
          <Provenance kind="actual" />
        </div>
        <p style={{ color: "var(--stage-ink)" }}>{CACHED.question}</p>
        <div className="sc-kv">
          <span>Required capability</span>
          <b className="px-num">{CACHED.required.join(", ")}</b>
        </div>
        <div className="sc-kv">
          <span>Slot</span>
          <span>{beat >= 5 || beat < 0 ? <span className="sp-tag" data-solid="">Sponsored card shown</span> : "Sponsored card, separate"}</span>
        </div>
      </Node>

      <Node id="rec" beat={beat} label="Receipt">
        <div className="sc-node-h">
          <span className="sc-node-name">Receipt</span>
          <span className="sc-node-sub">signed by the app</span>
        </div>
        <div className="sc-kvs">
          <div className="sc-kv">
            <span>Hash</span>
            <b className="px-num">{r.receiptHash}</b>
          </div>
          <div className="sc-kv">
            <span>Charge</span>
            <b className="px-num">{usdc(r.amount)}</b>
          </div>
          <div className="sc-kv">
            <span>Status</span>
            <span>accepted</span>
          </div>
        </div>
      </Node>

      {agents.map((a) => (
        <Node key={a.id} id={a.id} beat={beat} ruled={a.d.decision === "skip"} label={`${a.name} agent`}>
          <div className="sc-node-h">
            <span className="sc-node-name">
              {a.name} <span className="sc-node-sub">agent</span>
            </span>
            <span className="sp-tag" data-solid={a.d.decision === "bid" ? "" : undefined}>
              {a.d.decision === "bid" ? "Bid" : "Skip"}
            </span>
          </div>
          <div className="sc-kv">
            <span>Relevance, intent</span>
            <b className="px-num">
              {a.d.relevanceLevel}, {a.d.intentLevel}
            </b>
          </div>
          {a.id === "a0" ? (
            <div className="sc-kv">
              <span>Without history</span>
              <s className="px-num">intent {cvT.intentLevel}</s>
            </div>
          ) : a.id === "a2" ? (
            <div className="sc-kv">
              <span>Asked to compare</span>
              <span>no auction</span>
            </div>
          ) : (
            <div className="sc-kv">
              <span>Own campaign only</span>
              <span>no rival data</span>
            </div>
          )}
        </Node>
      ))}

      <Node id="feed" beat={beat} label="ContextHint evidence">
        <div className="sc-node-h">
          <span className="sc-node-name">ContextHint</span>
          <span className="px-marks">
            <Provenance kind="observed" label="" />
            <Provenance kind="inferred" label="" />
          </span>
        </div>
        <p>
          {RUN.evidence.examples} example and {RUN.evidence.hints} hint per wallet agent, in separate lanes.
        </p>
        <div className="sc-kv">
          <span>{RUN.evidence.method} search</span>
          <b className="px-num">similarity {RUN.evidence.similarity}</b>
        </div>
      </Node>

      <Node id="gate" beat={beat} label="Eligibility gate">
        <span className="sc-node-name">Eligibility</span>
        <span className="sc-node-sub">in code</span>
        <div className="sc-kvs" style={{ marginTop: 8 }}>
          {CACHED.eligible.map((c) => (
            <div key={c} className="sc-kv">
              <span>{RUN.campaigns[c as keyof typeof RUN.campaigns].name}</span>
              <b>ok</b>
            </div>
          ))}
          <div className="sc-kv">
            <span>{excl.name}</span>
            <b>out</b>
          </div>
        </div>
        <p style={{ marginTop: "auto" }}>
          {excl.name}: {REASON[excl.reason]}
          <br />
          <span className="px-num" style={{ fontSize: 11 }}>
            {excl.reason}
          </span>
        </p>
        <Provenance kind="policy" />
      </Node>

      <Node id="pol" beat={beat} label="Bid policy">
        <span className="sc-node-name">Bid policy</span>
        <span className="px-num">{RUN.policy.bidPolicy}</span>
        <div className="sc-kvs" style={{ marginTop: 8 }}>
          <div className="sc-kv">
            <span>Max bid</span>
            <b className="px-num">{usdc(RUN.policy.maxBid)}</b>
          </div>
          <div className="sc-kv">
            <span>Levels 3, 3</span>
            <b>full max</b>
          </div>
          <div className="sc-kv">
            <span>Floor</span>
            <b className="px-num">{usdc(RUN.policy.floor)}</b>
          </div>
        </div>
        <Provenance kind="policy" />
      </Node>

      <Node id="auc" beat={beat} label="Auction">
        <span className="sc-node-name">Auction</span>
        <span className="sc-node-sub">{RUN.policy.auction}</span>
        <div className="sc-kvs" style={{ marginTop: 8 }}>
          {CACHED.bids.map((b) => (
            <div key={b.campaign} className="sc-kv">
              <span>{b.name}</span>
              <b className="px-num">{usdc(b.amount)}</b>
            </div>
          ))}
        </div>
        <p style={{ marginTop: "auto" }}>Tie: campaign ID order picks {CACHED.winnerName}.</p>
        <Provenance kind="policy" />
      </Node>

      <Node id="res" beat={beat} label="Reservation">
        <span className="sc-node-name">Reservation</span>
        <span className="sc-node-sub">not a charge yet</span>
        <div className="sc-kvs" style={{ marginTop: 8 }}>
          <div className="sc-kv">
            <span>Award</span>
            <b>{CACHED.winnerName}</b>
          </div>
          <div className="sc-kv">
            <span>Reserved</span>
            <b className="px-num">{usdc(CACHED.price!)}</b>
          </div>
          <div className="sc-kv">
            <span>Budget cap</span>
            <b className="px-num">{usdc(CV.budgetCap)}</b>
          </div>
        </div>
        <span className="ms" data-state="reserved" style={{ color: "var(--stage-ink)" }}>
          <i className="ms-swatch" aria-hidden />
          Reserved
        </span>
      </Node>

      <Node id="chan" beat={beat} label="Payment channel">
        <ChannelMeter ch={CV_CHANNEL} t={beat >= 6 || beat < 0 ? 1 : beat >= 5 ? 0.45 : 0} onStage compact />
        <div className="sc-kv" style={{ marginTop: 4 }}>
          <span>
            Vouchers {CV_CHANNEL.vouchers.map((v) => usdc(v.cumulative)).join(" then ")}. Paid {usdc(CV_CHANNEL.settled)}, refunded {usdc(CV_CHANNEL.refund)}.
          </span>
          <Provenance kind="settled" />
        </div>
      </Node>
    </div>
  );
}
