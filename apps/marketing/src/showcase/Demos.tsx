"use client";

// Interactive pieces of the /design brand book: the explode scrubber, the switchboard beats and
// the motion demos with Replay. Showcase only; the page drives the same scenes by scroll.
import { useState, type ReactNode } from "react";
import { Words } from "@axp/design-system/prospectus";
import { Fit } from "@/scenes/Fit";
import { PlateStack, STACK_H, STACK_W } from "@/scenes/PlateStack";
import { BOARD_H, BOARD_W, Switchboard } from "@/scenes/Switchboard";
import { STAGE } from "@/data/copy";
import { CV } from "@/data/run";
import { LIBRARY, fmt } from "@/data/library";
import { SponsoredCard } from "@/specimens/SponsoredCard";
import { seg } from "@/motion/motion";

export function ExplodeScrubber() {
  const [v, setV] = useState(1);
  const tilt = seg(v, 0, 0.35);
  const explode = seg(v, 0.25, 0.7);
  const callouts = seg(v, 0.6, 0.9);
  const marker = v > 0.9 ? seg(v, 0.9, 1) : -1;
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div className="sc-scrub">
        <label className="px-label" htmlFor="explode">
          Explode
        </label>
        <input id="explode" type="range" min={0} max={1} step={0.001} value={v} onChange={(e) => setV(Number(e.target.value))} />
        <output className="px-num" htmlFor="explode">
          {v.toFixed(2)}
        </output>
      </div>
      <Fit w={STACK_W} h={STACK_H}>
        <PlateStack tilt={tilt} explode={explode} callouts={callouts} marker={marker} />
      </Fit>
    </div>
  );
}

export function BoardBeats() {
  const [beat, setBeat] = useState(0);
  const b = STAGE.beats[beat]!;
  return (
    <div style={{ display: "grid", gap: 32 }}>
      <div className="px-split" data-ratio="74" data-align="end">
        <div className="sc-beat-copy">
          <div className="sc-ticks" aria-hidden>
            {STAGE.beats.map((_, i) => (
              <i key={i} data-on={i <= beat ? "" : undefined} />
            ))}
          </div>
          <h3>{b.title}</h3>
          <p>{b.body}</p>
        </div>
        <div className="sc-beats" role="group" aria-label="Beats">
          {STAGE.beats.map((x, i) => (
            <button key={x.title} type="button" aria-pressed={i === beat} onClick={() => setBeat(i)}>
              {x.title.replace(/\.$/, "")}
            </button>
          ))}
        </div>
      </div>
      <Fit w={BOARD_W} h={BOARD_H}>
        <Switchboard beat={beat} />
      </Fit>
    </div>
  );
}

function Demo({ name, token, children, stageStyle }: { name: string; token: ReactNode; children: ReactNode; stageStyle?: React.CSSProperties }) {
  const [k, setK] = useState(0);
  return (
    <div className="mo-cell">
      <div className="mo-head">
        <span className="mo-name">{name}</span>
        <span className="mo-token">{token}</span>
      </div>
      <div className="mo-stage" key={k} style={stageStyle}>
        {children}
      </div>
      <div className="mo-foot">
        <button type="button" className="mo-replay" onClick={() => setK((x) => x + 1)}>
          Replay
        </button>
      </div>
    </div>
  );
}

function ExplodeLoop() {
  const [v, setV] = useState(0);
  const [k, setK] = useState(0);
  return (
    <div className="mo-cell">
      <div className="mo-head">
        <span className="mo-name">Plate explode</span>
        <span className="mo-token">
          scroll scrubbed, <code>io</code> ease
        </span>
      </div>
      <div className="mo-stage" style={{ placeItems: "stretch" }}>
        <Fit w={STACK_W} h={STACK_H} key={k}>
          <PlateStack tilt={1} explode={v} callouts={0} />
        </Fit>
      </div>
      <div className="mo-foot">
        <input aria-label="Explode" type="range" min={0} max={1} step={0.01} value={v} onChange={(e) => setV(Number(e.target.value))} style={{ flex: 1 }} />
        <button type="button" className="mo-replay" onClick={() => { setV(0); setK((x) => x + 1); }}>
          Reset
        </button>
      </div>
    </div>
  );
}

export function MotionDemos() {
  return (
    <div className="mo-grid">
      <Demo name="Word rise" token={<>900ms, <code>--ease-out</code>, 38ms stagger</>}>
        <p className="px-h2 mo-word" style={{ margin: 0, padding: "0 24px" }}>
          <Words text="Agents advise. Code decides the money." />
        </p>
      </Demo>
      <Demo name="Number mask rise" token={<>1100ms, <code>--ease-out</code>, never counts</>}>
        <span className="px-mask">
          <span className="px-stat-value mo-num" style={{ display: "block", fontSize: 96 }}>
            {fmt(LIBRARY.advertisers)}
          </span>
        </span>
      </Demo>
      <Demo name="Rule draw" token={<>1100ms, <code>--ease</code></>}>
        <i className="mo-rule" />
      </Demo>
      <Demo name="Route and travelling marker" token={<>1200ms draw, 1600ms travel, <code>--ease</code></>}>
        <span className="mo-route" style={{ ["--w" as string]: "300px", width: 300 }}>
          <i />
          <b />
        </span>
      </Demo>
      <Demo name="Card lands on its shadow" token={<>750ms, <code>--ease-out</code>, hard offset</>}>
        <div className="mo-land">
          <SponsoredCard name={CV.name} text={CV.approvedText!} destination={CV.destination} />
        </div>
      </Demo>
      <ExplodeLoop />
      <Demo name="Square shutter" token={<>1400ms, <code>--ease</code>, clip-path inset</>}>
        <div className="mo-shutter">
          <span>The stage</span>
        </div>
      </Demo>
      <Demo name="Rise: the sheet handover" token={<>1200ms, <code>--ease-out</code></>}>
        <div className="mo-rise-under">The section before</div>
        <div className="mo-rise-sheet">The next section rises</div>
      </Demo>
    </div>
  );
}
