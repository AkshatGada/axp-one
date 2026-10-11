"use client";

// The advertiser specimen: one picture.
//   left    Say where you belong: the brief, with its declared capabilities as a column of chips
//           on the card's edge. Each chip is where its lines begin.
//   centre  See every decision: four conversation tiles (the hero wall's atoms). The slot is the
//           verdict: the Sponsored card, or two or three words for why it was left alone.
//   right   Approve what is said, bound what is spent: the approved card with its seal, the two
//           limits drawn as bounds that end in a wall, and the pause switch.
// Lines run from each capability to every question that asks for it (dotted where it is not
// declared, stopped by a bar where the question rules it out) and from the approved card to the
// slot it fills. A change sends a pulse along its lines; the tile turns when the pulse arrives.
// On entering the view the scene performs once, declares Bitcoin and takes it back as a
// demonstration, then hands over. Any pointer or key input ends the demonstration for good.
// Every control changes only local state; the decisions are a pure function of it (local.ts).
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ADVERTISER_SIDE as C } from "../copy";
import { Illustration, SponsoredCard, Tile, useInView } from "../kit";
import { ADVERTISER as A } from "../story";
import { CAPS, DECLARED, L, VERDICT, WORDS, changeNote, decideAll, type CapId, type Decision, type Gate } from "./local";
import { boxOf, capWires, wordWires, type Geo, type Wire } from "./wires";
import s from "./advertiser.module.css";

type State = { has: CapId[]; paused: boolean; approved: "a" | "b"; draft: boolean };
type Via = { cap: CapId; on: boolean } | { words: "on" | "off" };
const START: State = { has: DECLARED, paused: false, approved: "a", draft: false };
const gateOf = (st: State): Gate => (st.paused ? "paused" : st.draft ? "pending" : "running");
const other = (k: "a" | "b") => (k === "a" ? "b" : "a");
const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** The performance, ms after the scene enters the view, in story order. */
const T = { brief: 0, caps: 280, capStep: 85, tiles: 380, tileStep: 95, card: 560, wires: 950, verdict: 1750, seal: 1950, words: 2250, joined: 2800, bounds: 2450, end: 3300 };
/** The demonstration after it: declare Bitcoin, hold, take it back, hand over. */
/** How long a pulse takes to reach its tile. */
const ARRIVE = 600;
const DEMO = { press: T.end + 1200, release: T.end + 4300, invite: T.end + 5600 };

const Check = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden>
    <path d="M2 6.4l2.7 2.7L10 3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Plus = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
    <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

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
    <div className={s.draft}>
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
  const [demo, setDemo] = useState<"press" | "release" | "invite" | null>(null);
  // What the tiles show. It follows the state at once, except when a pulse is on its way: then
  // the tiles turn when it arrives.
  const [shown, setShown] = useState<Decision[]>(() => decideAll(new Set(START.has), gateOf(START)));
  const arrive = useRef(0);
  const stage = useRef<HTMLDivElement>(null);
  const geoRef = useRef<Geo | null>(null);
  const stRef = useRef(st);
  const auto = useRef<{ timers: number[]; over: boolean }>({ timers: [], over: false });
  const [ref, seen] = useInView<HTMLDivElement>("0px 0px -22% 0px");
  stRef.current = st;

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

  /** Apply a change: mark the decisions it moved, and send a pulse along the lines it travels. */
  const apply = useCallback((next: State, via?: Via, silent = false) => {
    const cur = stRef.current;
    const before = decideAll(new Set(cur.has), gateOf(cur));
    const after = decideAll(new Set(next.has), gateOf(next));
    const ids = after.filter((x, i) => x.verdict !== before[i]!.verdict || x.reason !== before[i]!.reason).map((x) => x.id);
    stRef.current = next;
    const g = geoRef.current;
    let items: { d: string; tone: "on" | "off" }[] = [];
    if (g && via) {
      if ("cap" in via) {
        // Removing a capability: its lines still exist in the state being left.
        const src = capWires(g, via.on ? after : before).filter((w) => w.cap === via.cap);
        items = src.map((w) => ({ d: w.d, tone: via.on && w.state !== "clash" ? "on" : "off" }));
      } else {
        const src = wordWires(g, via.words === "on" ? after : before, "running");
        items = src.map((w) => ({ d: w.d, tone: via.words }));
      }
    }
    setPulses((p) => ({ n: p.n + 1, items }));
    window.clearTimeout(arrive.current);
    const land = () => {
      setShown(decideAll(new Set(stRef.current.has), gateOf(stRef.current)));
      setFlash((f) => ({ ids, n: f.n + 1, wire: false }));
    };
    if (items.length && document.documentElement.dataset.pxMotion === "on") {
      setFlash((f) => ({ ...f, ids: [], n: f.n + 1 }));
      arrive.current = window.setTimeout(land, ARRIVE);
    } else land();
    if (!silent) {
      const g2 = gateOf(next);
      setSpoken(g2 === "paused" ? L.spokenPaused : g2 === "pending" ? L.spokenPending : via && "cap" in via ? changeNote(before, after) : L.spokenRunning);
    }
    setSt(next);
  }, []);

  const endDemo = useCallback(() => {
    if (auto.current.over) return;
    auto.current.over = true;
    auto.current.timers.forEach((t) => window.clearTimeout(t));
    setDemo(null);
  }, []);

  // The performance and the demonstration (motion on only). The joined tile takes its outline
  // when its card lands, not before.
  useEffect(() => {
    if (!seen) return;
    if (document.documentElement.dataset.pxMotion !== "on") {
      auto.current.over = true;
      return setResolved(true);
    }
    const at = (ms: number, fn: () => void) => auto.current.timers.push(window.setTimeout(fn, ms));
    const t0 = window.setTimeout(() => setResolved(true), T.joined);
    at(DEMO.press, () => {
      setDemo("press");
      const cur = stRef.current;
      if (!cur.has.includes("btc")) apply({ ...cur, has: [...cur.has, "btc"] }, { cap: "btc", on: true }, true);
    });
    at(DEMO.release, () => {
      setDemo("release");
      const cur = stRef.current;
      if (cur.has.includes("btc")) apply({ ...cur, has: cur.has.filter((c) => c !== "btc") }, { cap: "btc", on: false }, true);
    });
    at(DEMO.invite, () => {
      setDemo("invite");
      auto.current.over = true;
    });
    const timers = auto.current.timers;
    return () => {
      window.clearTimeout(t0);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [seen, apply]);

  const toggleCap = (id: CapId) => {
    const on = st.has.includes(id);
    const has = on ? st.has.filter((c) => c !== id) : CAPS.filter((c) => c.id === id || st.has.includes(c.id)).map((c) => c.id);
    apply({ ...st, has }, { cap: id, on: !on });
  };

  const caps = geo ? capWires(geo, decisions) : [];
  const words = geo ? wordWires(geo, decisions, gate) : [];
  const drawn = [...caps, ...words].filter((w) => w.drawn);
  const isHot = (w: Wire) => !!hot && ((!!hot.cap && w.cap === hot.cap) || (!!hot.tile && w.tile === hot.tile));
  const hotTiles = new Set(hot?.cap ? caps.filter((w) => w.cap === hot.cap).map((w) => w.tile) : []);
  const hotCaps = new Set(hot?.tile ? caps.filter((w) => w.tile === hot.tile).map((w) => w.cap) : []);
  const stopAuto = () => {
    endDemo();
    if (demo) setDemo(null);
  };

  return (
    <div
      ref={ref}
      className={s.root}
      data-seen={seen ? "" : undefined}
      data-resolved={resolved ? "" : undefined}
      data-touched={flash.n ? "" : undefined}
      data-via={flash.wire ? "wire" : undefined}
      data-gate={gate}
      onPointerDownCapture={stopAuto}
      onKeyDownCapture={stopAuto}
    >
      <div ref={stage} className={s.stage}>
        {/* Under the cards: the lines themselves. */}
        <svg className={s.wires} aria-hidden data-hot={hot ? "" : undefined}>
          {drawn.map((w) => (
            <g key={w.id} className={s.wire} data-state={w.state} data-hot={isHot(w) ? "" : undefined} style={d(T.wires)}>
              <path className={s.line} d={w.d} />
              {isHot(w) && w.state !== "off" ? <path className={s.flow} d={w.d} /> : null}
            </g>
          ))}
        </svg>

        {/* 1. Say where you belong */}
        <section className={s.colA} aria-label={C.beats[0]!.k}>
          <h3 className={`${s.caption} ${s.in}`} style={d(T.brief)}>{C.beats[0]!.k}</h3>
          <div className={s.briefWrap}>
            <div className={`${s.brief} ${s.in}`} style={d(T.brief + 60)} data-brief="">
              <div className={s.who}>
                <span className={s.badge} aria-hidden>{A.name.slice(0, 1)}</span>
                <b>{A.name}</b>
              </div>
              <p className={s.offer}>{A.offer}</p>
            </div>
            <div className={s.capsBlock}>
              <Illustration className={s.illusM} />
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
                      data-demo={c.id === "btc" && demo ? demo : undefined}
                      onClick={() => toggleCap(c.id)}
                      onPointerEnter={() => setHot({ cap: c.id })}
                      onPointerLeave={() => setHot(null)}
                      onFocus={() => setHot({ cap: c.id })}
                      onBlur={() => setHot(null)}
                    >
                      <span className={s.capIcon}>{on ? <Check /> : <Plus />}</span>
                      <span>{c.label}</span>
                      <span className={s.sr}>, {on ? L.declared : L.notDeclared}</span>
                    </button>
                  );
                })}
              </div>
              <p className={s.hint}>
                {changedBrief && !demo ? (
                  <button
                    type="button"
                    className={s.reset}
                    onClick={() => {
                      apply({ ...st, has: DECLARED });
                      stage.current?.querySelector<HTMLElement>("[data-cap]")?.focus();
                    }}
                  >
                    {L.reset}
                  </button>
                ) : null}
              </p>
            </div>
          </div>
        </section>

        {/* 2. See every decision */}
        <section className={s.colB} aria-label={C.beats[1]!.k}>
          <h3 className={`${s.caption} ${s.in}`} style={d(T.tiles - 80)}>{C.beats[1]!.k}</h3>
          <p role="status" className={s.sr}>{spoken}</p>
          <ul className={s.field}>
            {shown.map((dec, i) => (
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

        {/* 3. Approve what is said. Bound what is spent. */}
        <section className={s.colC} aria-label={`${C.beats[2]!.k}. ${C.beats[3]!.k}`}>
          <h3 className={`${s.caption} ${s.in}`} style={d(T.card - 60)}>{C.beats[2]!.k}</h3>
          <div className={`${s.words} ${s.in}`} style={d(T.card)}>
            <div data-card="" className={s.cardWrap} data-draft={st.draft ? "" : undefined}>
              {st.draft ? <Draft from={st.approved} to={other(st.approved)} /> : <SponsoredCard className={s.bigCard} name={A.name} text={WORDS[st.approved]} />}
              {/* The seal: it sits on the card while the words are approved and lifts off the
                  moment one changes. */}
              <span className={s.seal} data-on={st.draft ? undefined : ""} aria-hidden>
                <span className={s.sealIn} style={d(T.seal)}>
                  <Check size={16} />
                </span>
              </span>
            </div>
            <div className={s.sealRow}>
              <p key={String(st.draft)} className={`${s.sealWord} ${s.land}`} style={d(T.seal + 120)} data-pending={st.draft ? "" : undefined}>
                {st.draft ? L.pendingState : L.approved}
              </p>
              <div className={s.btns}>
                <button
                  type="button"
                  className={s.btn}
                  data-strong={st.draft ? "" : undefined}
                  aria-label={st.draft ? undefined : L.editLabel}
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
          <h3 className={`${s.caption} ${s.in}`} style={d(T.card + 140)}>{C.beats[3]!.k}</h3>
          <div className={`${s.limits} ${s.in}`} style={d(T.card + 200)} data-paused={st.paused ? "" : undefined}>
            {/* The two limits drawn as bounds: one placement's ceiling inside the whole budget,
                which ends in a wall. Settings, not spend: nothing fills. */}
            <dl className={s.bounds}>
              <div className={s.bound} data-k="ceiling">
                <dt>{L.ceiling}</dt>
                <dd>
                  <b>{A.limits.maxBid}</b> {A.limits.unit}
                </dd>
                <i className={s.rule} style={d(T.bounds)} aria-hidden />
              </div>
              <div className={s.bound} data-k="budget">
                <i className={s.rule} style={d(T.bounds + 200)} aria-hidden>
                  <i className={`${s.wall} ${s.pop}`} style={d(T.bounds + 720)} />
                </i>
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

        {/* Over the cards: where lines plug in, where one is stopped, and the pulses. */}
        <svg className={s.wiresTop} aria-hidden data-hot={hot ? "" : undefined}>
          {drawn.map((w) => (
            <g key={w.id} className={s.plug} data-state={w.state} data-hot={isHot(w) ? "" : undefined} style={d(T.wires + 200)}>
              {w.state === "clash" ? (
                <path className={s.stop} d={w.dir === "h" ? `M${w.end.x} ${w.end.y - 8}v16` : `M${w.end.x - 8} ${w.end.y}h16`} />
              ) : (
                <circle className={s.socket} cx={w.end.x} cy={w.end.y} r={4} />
              )}
            </g>
          ))}
          {/* The performance: a pulse runs each live line once, from what you set to its tile. */}
          {flash.n === 0
            ? drawn.filter((w) => w.state === "on").map((w) => (
                <g key={`e-${w.id}`} className={s.pulse} data-entry="" data-tone="on" style={d(w.cap ? T.wires + 100 : T.words)}>
                  <path className={s.tail} pathLength={1} d={w.d} />
                  <path className={s.headDot} pathLength={1} d={w.d} />
                </g>
              ))
            : null}
          {pulses.items.map((p, i) => (
            <g key={`${pulses.n}-${i}`} className={s.pulse} data-tone={p.tone}>
              <path className={s.tail} pathLength={1} d={p.d} />
              <path className={s.headDot} pathLength={1} d={p.d} />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
