"use client";

// The advertiser specimen, one scene in three parts:
//   left    You declare: the offer, the conversations wanted, and the declared capabilities as a
//           column of chips on the card's edge.
//   centre  The agent decides: a small field of conversation tiles (the hero wall's atoms). Each
//           slot holds the outcome: the Sponsored card, or a few words for why it was left alone.
//   right   You approve and bound: the exact Sponsored words, the two limits, the pause switch.
// The connection is drawn: a line runs from each capability to every question that asks for it
// (dashed where it is not declared), and from the approved card to the slot where it appears.
// A change sends a pulse along its lines and the tile turns when the pulse arrives.
// Every control changes only local state; the decisions are a pure function of it (local.ts).
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ADVERTISER_SIDE as C } from "../copy";
import { Illustration, SponsoredCard, Tile, useInView } from "../kit";
import { ADVERTISER as A } from "../story";
import { CAPS, DECLARED, L, VERDICT, WORDS, changeNote, decideAll, type CapId, type Decision, type Gate } from "./local";
import { boxOf, capWires, wordWires, type Geo, type Wire } from "./wires";
import s from "./advertiser.module.css";

type State = { has: CapId[]; paused: boolean; approved: "a" | "b"; draft: boolean };
const START: State = { has: DECLARED, paused: false, approved: "a", draft: false };
const gateOf = (st: State): Gate => (st.paused ? "paused" : st.draft ? "pending" : "running");
const other = (k: "a" | "b") => (k === "a" ? "b" : "a");
const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Entry timeline, ms after the scene enters the view, in story order. */
const T = { brief: 0, caps: 260, capStep: 80, tiles: 300, tileStep: 90, card: 460, wires: 820, wireStep: 55, verdict: 1320, seal: 1380, words: 1560, joined: 1900, bounds: 2050 };

const Check = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
    <path d="M2 6.4l2.7 2.7L10 3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Plus = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
    <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

function Caption({ actor, agent, k, at }: { actor: string; agent?: boolean; k: string; at: number }) {
  return (
    <header className={`${s.caption} ${s.in}`} style={d(at)} data-agent={agent ? "" : undefined}>
      <span className={s.actor}>{actor}</span>
      <h3 className="v8-h3">{k}</h3>
    </header>
  );
}

/** The tile's Sponsored slot is the verdict: the card when it joined, otherwise a few words. */
function Slot({ dec, at }: { dec: Decision; at: number }) {
  const joined = dec.verdict === "joined";
  return (
    <div className={s.slot} data-verdict={dec.verdict}>
      <span key={`${dec.verdict}|${dec.reason}`} className={`${s.slotWord} ${s.land}`} style={d(at)}>
        <span className={s.sr}>
          {VERDICT[dec.verdict]}
          {dec.reason ? ": " : ""}
        </span>
        {dec.verdict === "may" ? VERDICT.may : dec.reason}
      </span>
      <div className={s.miniCard} data-on={joined ? "" : undefined} aria-hidden>
        <span className={s.miniTag}>Sponsored</span>
        <b>{A.name}</b>
        <i />
      </div>
    </div>
  );
}

function Draft({ from, to }: { from: "a" | "b"; to: "a" | "b" }) {
  const rest = WORDS[to].slice(WORDS.changed[to].length);
  return (
    <div className={`${s.draft} ${s.land}`}>
      <div className={s.draftHead}>
        <span className={s.draftTag}>{L.draft}</span>
        <span className={s.draftName}>{A.name}</span>
      </div>
      <p className={s.draftText}>
        <del>{WORDS.changed[from]}</del> <ins>{WORDS.changed[to]}</ins>
        {rest}
      </p>
    </div>
  );
}

export default function Surface({ action }: { action: ReactNode }) {
  const [st, setSt] = useState<State>(START);
  const [spoken, setSpoken] = useState("");
  const [flash, setFlash] = useState<{ ids: string[]; n: number; wire: boolean }>({ ids: [], n: 0, wire: false });
  const [pulses, setPulses] = useState<{ n: number; items: { d: string; tone: "on" | "off" }[] }>({ n: 0, items: [] });
  const [hot, setHot] = useState<{ cap?: CapId; tile?: string } | null>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [resolved, setResolved] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const geoRef = useRef<Geo | null>(null);
  const [ref, seen] = useInView<HTMLDivElement>("0px 0px -12% 0px");

  const gate = gateOf(st);
  const decisions = decideAll(new Set(st.has), gate);
  const changedBrief = st.has.length !== DECLARED.length || st.has.some((c) => !DECLARED.includes(c));

  // Measure chips, tiles and the approved card whenever layout can have changed.
  useIso(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => {
      const g: Geo = { chips: {}, tiles: {}, card: null };
      el.querySelectorAll<HTMLElement>("[data-cap]").forEach((n) => (g.chips[n.dataset.cap as CapId] = boxOf(n, el)));
      el.querySelectorAll<HTMLElement>("[data-tile]").forEach((n) => (g.tiles[n.dataset.tile!] = boxOf(n, el)));
      const card = el.querySelector<HTMLElement>("[data-card]");
      g.card = card ? boxOf(card, el) : null;
      if (JSON.stringify(g) !== JSON.stringify(geoRef.current)) {
        geoRef.current = g;
        setGeo(g);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.querySelectorAll<HTMLElement>("[data-card], [data-brief]").forEach((n) => ro.observe(n));
    void document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, []);

  // The joined tile takes its outline when its card lands, not before.
  useEffect(() => {
    if (!seen) return;
    if (document.documentElement.dataset.pxMotion !== "on") return setResolved(true);
    const t = window.setTimeout(() => setResolved(true), T.joined);
    return () => window.clearTimeout(t);
  }, [seen]);

  const caps = geo ? capWires(geo, decisions) : [];
  const words = geo ? wordWires(geo, decisions, gate) : [];

  /** Apply a change: mark the decisions it moved, and send a pulse along the lines it travels. */
  function apply(next: State, via?: { cap: CapId; on: boolean } | { words: "on" | "off" }) {
    const before = decideAll(new Set(st.has), gateOf(st));
    const after = decideAll(new Set(next.has), gateOf(next));
    const ids = after.filter((x, i) => x.verdict !== before[i]!.verdict || x.reason !== before[i]!.reason).map((x) => x.id);
    const g = geoRef.current;
    let items: { d: string; tone: "on" | "off" }[] = [];
    if (g && via) {
      if ("cap" in via) {
        // Removing a capability: the lines still exist in the state being left.
        const src = capWires(g, via.on ? after : before).filter((w) => w.cap === via.cap);
        items = src.map((w) => ({ d: w.d, tone: via.on && w.state !== "clash" ? "on" : "off" }));
      } else {
        const src = wordWires(g, via.words === "on" ? after : before, "running");
        items = src.map((w) => ({ d: w.d, tone: via.words }));
      }
    }
    setPulses((p) => ({ n: p.n + 1, items }));
    setFlash((f) => ({ ids, n: f.n + 1, wire: items.length > 0 }));
    const g2 = gateOf(next);
    setSpoken(g2 === "paused" ? L.spokenPaused : g2 === "pending" ? L.spokenPending : via && "cap" in via ? changeNote(before, after) : L.spokenRunning);
    setSt(next);
  }
  const toggleCap = (id: CapId) => {
    const on = st.has.includes(id);
    const has = on ? st.has.filter((c) => c !== id) : CAPS.filter((c) => c.id === id || st.has.includes(c.id)).map((c) => c.id);
    apply({ ...st, has }, { cap: id, on: !on });
  };

  const isHot = (w: Wire) => !!hot && ((hot.cap && w.cap === hot.cap) || (hot.tile && w.tile === hot.tile));
  const hotTiles = new Set(hot?.cap ? caps.filter((w) => w.cap === hot.cap).map((w) => w.tile) : []);
  const hotCaps = new Set(hot?.tile ? caps.filter((w) => w.tile === hot.tile).map((w) => w.cap) : []);

  return (
    <div
      ref={ref}
      className={s.root}
      data-seen={seen ? "" : undefined}
      data-resolved={resolved ? "" : undefined}
      data-touched={flash.n ? "" : undefined}
      data-via={flash.wire ? "wire" : undefined}
      data-gate={gate}
    >
      <div ref={stage} className={s.stage}>
        <svg className={s.wires} aria-hidden data-hot={hot ? "" : undefined}>
          {[...caps, ...words].filter((w) => w.drawn).map((w, i) => (
            <g key={w.id} className={s.wire} data-state={w.state} data-hot={isHot(w) ? "" : undefined} style={d(T.wires + i * T.wireStep)}>
              <path d={w.d} />
              {w.state === "clash" ? (
                <>
                  <circle className={s.stop} cx={w.end.x - 1} cy={w.end.y} r={8} />
                  <path className={s.cross} d={`M${w.end.x - 4} ${w.end.y - 3}l6 6M${w.end.x + 2} ${w.end.y - 3}l-6 6`} />
                </>
              ) : (
                <circle cx={w.end.x} cy={w.end.y} r={3.5} />
              )}
            </g>
          ))}
          {/* Entry: a pulse runs each live line once, from what you set to the tile it reaches. */}
          {flash.n === 0
            ? [...caps, ...words].filter((w) => w.drawn && w.state === "on").map((w) => (
                <path key={`e-${w.id}`} className={s.pulse} data-entry="" data-tone="on" pathLength={1} d={w.d} style={d(w.cap ? T.wires : T.words)} />
              ))
            : null}
          {pulses.items.map((p, i) => (
            <path key={`${pulses.n}-${i}`} className={s.pulse} data-tone={p.tone} pathLength={1} d={p.d} />
          ))}
        </svg>

        {/* 1. You declare */}
        <section className={s.colA} aria-label={C.beats[0]!.k}>
          <Caption actor={L.actorYou} k={C.beats[0]!.k} at={T.brief} />
          <div className={`${s.brief} ${s.in}`} style={d(T.brief + 60)} data-brief="">
            <div className={s.who}>
              <span className={s.badge} aria-hidden>{A.name.slice(0, 1)}</span>
              <b>{A.name}</b>
            </div>
            <p className={s.offer}>{A.offer}</p>
            <ul className={s.wantList}>
              {A.contexts.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <div className={s.caps} role="group" aria-label="Declared capabilities">
              {CAPS.map((c, k) => {
                const on = st.has.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    data-cap={c.id}
                    className={`${s.cap} ${s.pop}`}
                    style={d(T.caps + k * T.capStep)}
                    aria-pressed={on}
                    data-hot={hotCaps.has(c.id) ? "" : undefined}
                    onClick={() => toggleCap(c.id)}
                    onPointerEnter={() => setHot({ cap: c.id })}
                    onPointerLeave={() => setHot(null)}
                    onFocus={() => setHot({ cap: c.id })}
                    onBlur={() => setHot(null)}
                  >
                    {on ? <Check /> : <Plus />}
                    <span>{c.label}</span>
                    <span className={s.sr}>, {on ? L.declared : L.notDeclared}</span>
                  </button>
                );
              })}
            </div>
            <p className={s.hint}>
              {changedBrief ? (
                <button type="button" className={s.reset} onClick={() => {
                    apply({ ...st, has: DECLARED });
                    stage.current?.querySelector<HTMLElement>("[data-cap]")?.focus();
                  }}
                >
                  {L.reset}
                </button>
              ) : (
                L.tryIt
              )}
            </p>
          </div>
        </section>

        {/* 2. The agent decides */}
        <section className={s.colB} aria-label={C.beats[1]!.k}>
          <Caption actor={L.actorAgent} agent k={C.beats[1]!.k} at={T.tiles - 100} />
          <p role="status" className={s.sr}>{spoken}</p>
          <ul className={s.field}>
            {decisions.map((dec, i) => (
              <li
                key={dec.id}
                data-tile={dec.id}
                data-verdict={dec.verdict}
                data-hot={hotTiles.has(dec.id) ? "" : undefined}
                className={`${s.item} ${s.in}`}
                style={d(T.tiles + i * T.tileStep)}
                onPointerEnter={() => setHot({ tile: dec.id })}
                onPointerLeave={() => setHot(null)}
              >
                <Tile
                  className={s.tile}
                  question={dec.question}
                  tone={dec.verdict === "joined" ? "lit" : undefined}
                  answer={
                    <div className={s.lines} aria-hidden>
                      <i />
                      <i />
                    </div>
                  }
                  slot={<Slot dec={dec} at={T.verdict + i * T.tileStep} />}
                />
                {flash.ids.includes(dec.id) ? <i key={flash.n} className={s.flash} aria-hidden /> : null}
              </li>
            ))}
          </ul>
          <Illustration className={s.illus} />
        </section>

        {/* 3. You approve and bound */}
        <section className={s.colC} aria-label={`${C.beats[2]!.k}. ${C.beats[3]!.k}`}>
          <Caption actor={L.actorYou} k={C.beats[2]!.k} at={T.card - 60} />
          <div className={`${s.words} ${s.in}`} style={d(T.card)}>
            <div data-card="" className={s.cardWrap}>
              {st.draft ? <Draft from={st.approved} to={other(st.approved)} /> : <SponsoredCard name={A.name} text={WORDS[st.approved]} />}
            </div>
            <div className={s.sealRow}>
              <p key={`${st.approved}${st.draft}`} className={s.seal} data-pending={st.draft ? "" : undefined}>
                {st.draft ? null : (
                  <span className={`${s.stamp} ${s.pop}`} style={d(T.seal)}>
                    <Check />
                  </span>
                )}
                <span>{st.draft ? L.pendingState : L.approved}</span>
              </p>
              <div className={s.btns}>
                <button
                  type="button"
                  className={s.btn}
                  data-strong={st.draft ? "" : undefined}
                  onClick={() => (st.draft ? apply({ ...st, approved: other(st.approved), draft: false }, { words: "on" }) : apply({ ...st, draft: true }, { words: "off" }))}
                >
                  {st.draft ? L.approve : L.edit}
                </button>
                {st.draft ? (
                  <button type="button" className={s.btn} onClick={() => apply({ ...st, draft: false }, { words: "on" })}>
                    {L.undo}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          <Caption actor={L.actorYou} k={C.beats[3]!.k} at={T.card + 140} />
          <div className={`${s.limits} ${s.in}`} style={d(T.card + 200)} data-paused={st.paused ? "" : undefined}>
            {/* The two limits drawn as bounds: one placement's ceiling inside the whole budget.
                Settings, not spend: nothing fills. */}
            <dl className={s.bounds}>
              <div className={s.bound} data-k="ceiling">
                <dt>{L.ceiling}</dt>
                <dd>
                  <b>{A.limits.maxBid}</b> {A.limits.unit}
                </dd>
                <i className={s.rule} style={d(T.bounds)} aria-hidden />
              </div>
              <div className={s.bound} data-k="budget">
                <i className={s.rule} style={d(T.bounds + 160)} aria-hidden />
                <dt>{L.budget}</dt>
                <dd>
                  <b>{A.limits.budget}</b> {A.limits.unit}
                </dd>
              </div>
            </dl>
            <button type="button" role="switch" aria-checked={!st.paused} aria-label={L.switchLabel} className={s.switch} onClick={() => apply({ ...st, paused: !st.paused })}>
              <span>{st.paused ? L.paused : L.running}</span>
              <span className={s.track} aria-hidden>
                <i />
              </span>
            </button>
          </div>
          <div className={`${s.action} ${s.in}`} style={d(T.card + 320)}>{action}</div>
        </section>
      </div>
    </div>
  );
}
