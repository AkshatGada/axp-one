// The exchange as a schematic switchboard on the dark stage: the AI app, the receipt, the
// ContextHint feed, three agents, the exchange core (eligibility, bid policy, auction,
// reservation) and the Solana channel. `beat` (0..6) lights the region the step is about; the
// rest dims to a readable half. Plain words only. Values are from the cached question.
import type { CSSProperties, ReactNode } from "react";
import { CACHED, CV, CV_CHANNEL, RUN, usdc } from "@/data/run";
import { ChannelMeter } from "@/specimens/ChannelMeter";

export const BOARD_W = 1000;
export const BOARD_H = 660;

type Box = { x: number; y: number; w: number; h: number };
const B: Record<string, Box> = {
  feed: { x: 10, y: 10, w: 236, h: 158 },
  pub: { x: 282, y: 10, w: 440, h: 158 },
  rec: { x: 758, y: 10, w: 232, h: 158 },
  a0: { x: 10, y: 206, w: 236, h: 88 },
  a1: { x: 10, y: 304, w: 236, h: 88 },
  a2: { x: 10, y: 402, w: 236, h: 100 },
  gate: { x: 282, y: 206, w: 172, h: 296 },
  pol: { x: 468, y: 206, w: 150, h: 296 },
  auc: { x: 632, y: 206, w: 190, h: 296 },
  res: { x: 836, y: 206, w: 154, h: 296 },
  chan: { x: 282, y: 528, w: 708, h: 122 },
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
  "pub-gate": "M368 168 V206",
  "gate-a": "M282 354 H246",
  "feed-a": "M128 168 V206",
  "a-pol": "M246 250 H264 V188 H543 V206",
  "pol-auc": "M618 354 H632",
  "auc-res": "M822 354 H836",
  "res-pub": "M913 206 V188 H660 V168",
  "pub-rec": "M722 90 H758",
  "rec-chan": "M874 168 V184 H996 V589 H990",
};

function Node({ id, beat, children, tone, label }: { id: string; beat: number; children: ReactNode; tone?: "ch" | "ruled"; label?: string }) {
  const b = B[id]!;
  const on = beat < 0 || BEAT_LIGHT[beat]?.nodes.includes(id);
  const seen = !on && BEAT_LIGHT.slice(0, Math.max(0, beat)).some((l) => l.nodes.includes(id));
  return (
    <div className="sc-node" data-on={on ? "" : undefined} data-seen={seen ? "" : undefined} data-tone={tone} aria-label={label} style={{ left: b.x, top: b.y, width: b.w, height: b.h } as CSSProperties}>
      {children}
    </div>
  );
}

export function Switchboard({ beat }: { beat: number }) {
  const r = RUN.receipts.find((x) => x.turn === "v3-cached")!;
  const lit = beat < 0 ? Object.keys(WIRES) : (BEAT_LIGHT[beat]?.wires ?? []);
  const KF = RUN.campaigns["v3-keyforge"];
  const LG = RUN.campaigns["v3-leatherguard"];
  const all = beat < 0;
  return (
    <div className="sc-board on-stage">
      <svg className="sc-wires" viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} width={BOARD_W} height={BOARD_H} aria-hidden>
        <defs>
          <linearGradient id="ch-hand" x1="0" y1="0" x2="0" y2="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 168) scale(1 38)">
            <stop offset="0" stopColor="#f65a20" />
            <stop offset="1" stopColor="#6573ff" />
          </linearGradient>
        </defs>
        {Object.entries(WIRES).map(([k, d]) => (
          <path key={k} className="sc-wire" d={d} data-on={lit.includes(k) ? "" : undefined} style={k === "feed-a" && lit.includes(k) ? { stroke: "url(#ch-hand)", strokeWidth: 4 } : undefined} />
        ))}
      </svg>

      <Node id="feed" beat={beat} tone="ch" label="ContextHint evidence">
        <span className="sc-node-name">ContextHint</span>
        <p>One real example and one inferred audience for each wallet agent.</p>
      </Node>

      <Node id="pub" beat={beat} label="The AI app">
        <span className="sc-node-name">Our demo AI app</span>
        <p className="sc-node-q">{CACHED.question}</p>
        <div className="sc-kv">
          <span>Must store crypto</span>
          {beat >= 5 || all ? <span className="sp-tag" data-solid="">Sponsored card shown</span> : <span>Sponsored slot open</span>}
        </div>
      </Node>

      <Node id="rec" beat={beat} label="Receipt">
        <span className="sc-node-name">Receipt</span>
        <p>Signed by the app after the card was shown.</p>
        <div className="sc-kv">
          <span>Charge</span>
          <b className="px-num">{usdc(r.amount)}</b>
        </div>
      </Node>

      {[
        { id: "a0", name: CV.name },
        { id: "a1", name: KF.name },
      ].map((a) => (
        <Node key={a.id} id={a.id} beat={beat} label={`${a.name} agent`}>
          <div className="sc-node-h">
            <span className="sc-node-name">{a.name}</span>
            <span className="sp-tag" data-solid="">
              Bid
            </span>
          </div>
          <p>Judged with Jev</p>
        </Node>
      ))}
      <Node id="a2" beat={beat} tone="ruled" label={`${LG.name} agent`}>
        <div className="sc-node-h">
          <span className="sc-node-name">{LG.name}</span>
          <span className="sp-tag">Skip</span>
        </div>
        <p>Ruled out in code. Asked anyway, to compare.</p>
      </Node>

      <Node id="gate" beat={beat} label="Eligibility">
        <span className="sc-node-name">Eligibility</span>
        <span className="sc-node-sub">decided in code</span>
        <div className="sc-kvs">
          <div className="sc-kv">
            <span>{CV.name}</span>
            <b>in</b>
          </div>
          <div className="sc-kv">
            <span>{KF.name}</span>
            <b>in</b>
          </div>
          <div className="sc-kv">
            <span>{LG.name}</span>
            <b>out</b>
          </div>
        </div>
        <p style={{ marginTop: "auto" }}>No crypto storage, no entry.</p>
      </Node>

      <Node id="pol" beat={beat} label="Bid policy">
        <span className="sc-node-name">Bid policy</span>
        <span className="sc-node-sub">in code</span>
        <p>Turns a judgment into a bid.</p>
        <div className="sc-kv" style={{ marginTop: "auto" }}>
          <span>Cap</span>
          <b className="px-num">{usdc(RUN.policy.maxBid)}</b>
        </div>
      </Node>

      <Node id="auc" beat={beat} label="Auction">
        <span className="sc-node-name">Auction</span>
        <span className="sc-node-sub">highest bid wins</span>
        <div className="sc-kvs">
          {CACHED.bids.map((b) => (
            <div key={b.campaign} className="sc-kv sc-bid" data-win={b.campaign === CACHED.winner && (beat >= 4 || all) ? "" : undefined}>
              <span>{b.name}</span>
              <b className="px-num">{usdc(b.amount)}</b>
            </div>
          ))}
        </div>
        <p style={{ marginTop: "auto" }}>A tie, broken by a fixed rule.</p>
      </Node>

      <Node id="res" beat={beat} label="Reservation">
        <span className="sc-node-name">Reserved</span>
        <span className="sc-node-sub">not a charge yet</span>
        <p style={{ color: "var(--stage-ink)" }}>{CACHED.winnerName}</p>
        <b className="px-num sc-big">{usdc(CACHED.price!)}</b>
      </Node>

      <Node id="chan" beat={beat} label="Solana payment channel">
        <ChannelMeter ch={CV_CHANNEL} t={beat >= 6 || all ? 1 : beat >= 5 ? 0.45 : 0} onStage compact title={`${CV.name}'s Solana payment channel`} />
      </Node>
    </div>
  );
}
