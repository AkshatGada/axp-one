"use client";

// The advertiser specimen: one picture.
//   left    Say where you belong: the brief, with its listed capabilities as a column of chips on
//           the card's edge.
//   centre  See every decision: four conversation tiles. The verdict is the largest thing on each:
//           "Appears here" with the Sponsored card, "Left alone" with two or three words of why,
//           "Would appear", or "Held".
//   right   Approve what is said, bound what is spent: the approved card with its seal, two
//           labelled limits drawn as a ceiling and a wall, and the page's rule switch for pause.
// The connection is drawn in its own lane: each chip has a stub into one trunk, and one branch
// leaves the trunk for each question that depends on what is listed, entering the tile on its
// left edge at mid height (dotted while something is missing, a stop mark on the edge where a
// listed capability is ruled out). A line also runs from the approved card to the slot it fills.
// A change sends a pulse along its route; the tile turns when the pulse arrives.
// Well into view, the scene performs once (about 2.9 s, left to right), declares Bitcoin and takes
// it back as a demonstration, then hands over. A press, a key or focus inside the scene ends the
// demonstration for good. Every control changes only local state (local.ts decides).
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ADVERTISER_SIDE as C } from "../copy";
import { Illustration, SponsoredCard, Tile } from "../kit";
import { ADVERTISER as A } from "../story";
import { CAPS, DECLARED, L, VERDICT, WORDS, changeNote, decideAll, type CapId, type Decision, type Gate } from "./local";
import { boxOf, capNet, wordNet, type Geo } from "./wires";
import s from "./advertiser.module.css";

type State = { has: CapId[]; paused: boolean; approved: "a" | "b"; draft: boolean };
type Via = { cap: CapId; on: boolean } | { words: "on" | "off" };
const START: State = { has: DECLARED, paused: false, approved: "a", draft: false };
const gateOf = (st: State): Gate => (st.paused ? "paused" : st.draft ? "pending" : "running");
const other = (k: "a" | "b") => (k === "a" ? "b" : "a");
const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** The performance, ms after the specimen is well into view, left to right. */
const T = { brief: 0, caps: 240, capStep: 90, tiles: 600, tileStep: 70, stubs: 820, trunk: 960, branch: 1140, verdict: 1450, verdictStep: 200, card: 1500, seal: 1850, words: 2000, joined: 2450, bounds: 2000, end: 2900 };
/** The demonstration, ms after the entry has ended: list Bitcoin, hold, take it back, hand over. */
const DEMO = { press: 1300, release: 4400, invite: 5700 };
/** How long a pulse takes to reach its tile. */
const ARRIVE = 620;
/** The order verdicts land in: down the near column, then the far one. */
const ORDER: Record<string, number> = { mobile: 0, learn: 1, bitcoin: 2, compare: 3 };

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

/** The verdict, then the Sponsored slot that shows it: the card, or two or three words of why. */
function Verdict({ dec, at }: { dec: Decision; at: number }) {
  return (
    <p key={dec.verdict} className={`${s.verdict} ${s.land}`} style={d(at)} data-verdict={dec.verdict}>
      {VERDICT[dec.verdict]}
    </p>
  );
}
function Slot({ dec, at }: { dec: Decision; at: number }) {
  return (
    <div className={s.slot} data-verdict={dec.verdict}>
      {dec.reason ? (
        <span key={dec.reason} className={`${s.reason} ${s.land}`} style={d(at + 90)}>
          {dec.reason}
        </span>
      ) : null}
      <div className={s.miniCard} data-on={dec.verdict === "joined" ? "" : undefined} aria-hidden>
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
  const [flash, setFlash] = useState<{ ids: string[]; n: number }>({ ids: [], n: 0 });
  const [pulses, setPulses] = useState<{ n: number; items: { d: string; tone: "on" | "off" }[] }>({ n: 0, items: [] });
  const [hot, setHot] = useState<{ cap?: CapId; tile?: string } | null>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [seen, setSeen] = useState(false);
  const [instant, setInstant] = useState(false);
  const [armed, setArmed] = useState(false);
  const seenAt = useRef(0);
  const [resolved, setResolved] = useState(false);
  const [demo, setDemo] = useState<"press" | "release" | "invite" | null>(null);
  // What the tiles show. It follows the state at once, except when a pulse is on its way: then
  // the tiles turn when it arrives.
  const [shown, setShown] = useState<Decision[]>(() => decideAll(new Set(START.has), gateOf(START)));
  const stage = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLUListElement>(null);
  const geoRef = useRef<Geo | null>(null);
  const stRef = useRef(st);
  const arrive = useRef(0);
  const auto = useRef<{ timers: number[]; over: boolean; skip: boolean }>({ timers: [], over: false, skip: false });
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

  // When the entry starts. Nothing waits invisibly: the staged entry starts as soon as a modest
  // part of the specimen has scrolled into view (a quarter of it, or two fifths of the screen).
  // If the reader did not arrive that way (a jump, a flick, an anchor, coming back up from below:
  // the specimen is first seen already well inside the screen), or a second passes with any of it
  // on screen and the entry still not started, the complete resting state is shown at once.
  useEffect(() => {
    if (document.documentElement.dataset.pxMotion !== "on") return setSeen(true);
    const el = stage.current;
    if (!el) return;
    let timer = 0;
    let done = false;
    const start = (instant: boolean) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      io.disconnect();
      if (instant) {
        auto.current.skip = true;
        setInstant(true);
        setResolved(true);
        // Held until every entry animation's own time has passed, so none can replay.
        window.setTimeout(() => setInstant(false), T.end + 900);
      }
      setSeen(true);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e || done) return;
        if (!e.isIntersecting) {
          window.clearTimeout(timer);
          timer = 0;
          return;
        }
        const vh = window.innerHeight;
        const top = e.boundingClientRect.top;
        const visible = e.intersectionRect.height;
        if (!timer && top < vh * 0.6 && visible > 8) return start(true); // first seen already well inside
        if (e.intersectionRatio >= 0.25 || visible >= vh * 0.4) return start(false);
        if (!timer) timer = window.setTimeout(() => start(true), 1100);
      },
      { threshold: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5] },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  // The demonstration is optional and keeps a stricter condition: the field of tiles well in view
  // (nearly all of it on a phone, so the Bitcoin chip and the tile it turns share the screen).
  useEffect(() => {
    if (document.documentElement.dataset.pxMotion !== "on") return;
    const el = field.current;
    if (!el) return;
    const need = window.matchMedia("(max-width: 759px)").matches ? 0.92 : 0.72;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e && e.intersectionRatio >= need) {
          setArmed(true);
          io.disconnect();
        }
      },
      { threshold: [need] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /** Apply a change: mark the decisions it moved, and send a pulse along the routes it travels. */
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
        const tone = via.on ? "on" : "off";
        items = capNet(g, after, new Set(next.has)).routes.filter((w) => w.cap === via.cap).map((w) => ({ d: w.d, tone }));
      } else {
        items = wordNet(g, via.words === "on" ? after : before, "running").paths.map((p) => ({ d: p, tone: via.words }));
      }
    }
    setPulses((p) => ({ n: p.n + 1, items }));
    window.clearTimeout(arrive.current);
    const land = () => {
      setShown(decideAll(new Set(stRef.current.has), gateOf(stRef.current)));
      setFlash((f) => ({ ids, n: f.n + 1 }));
    };
    if (items.length && document.documentElement.dataset.pxMotion === "on") {
      setFlash((f) => ({ ids: [], n: f.n + 1 }));
      arrive.current = window.setTimeout(land, ARRIVE);
    } else land();
    if (!silent) {
      const g2 = gateOf(next);
      setSpoken(g2 === "paused" ? L.spokenPaused : g2 === "pending" ? L.spokenPending : via && "cap" in via ? changeNote(before, after) : L.spokenRunning);
    }
    setSt(next);
  }, []);

  const endDemo = useCallback(() => {
    if (!auto.current.over) {
      auto.current.over = true;
      auto.current.timers.forEach((t) => window.clearTimeout(t));
    }
    setDemo(null);
  }, []);

  // The joined tile takes its outline when its card lands, not before.
  useEffect(() => {
    if (!seen) return;
    seenAt.current = performance.now();
    if (document.documentElement.dataset.pxMotion !== "on" || auto.current.skip) return setResolved(true);
    const t0 = window.setTimeout(() => setResolved(true), T.joined);
    return () => window.clearTimeout(t0);
  }, [seen]);

  // The demonstration (motion on only): after the entry has finished and once its own condition
  // is met. If that never happens it simply does not play.
  useEffect(() => {
    if (!seen || !armed || auto.current.over) return;
    if (document.documentElement.dataset.pxMotion !== "on") return;
    const wait = auto.current.skip ? 0 : Math.max(0, T.end - (performance.now() - seenAt.current));
    const at = (ms: number, fn: () => void) => auto.current.timers.push(window.setTimeout(fn, wait + ms));
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
    return () => timers.forEach((x) => window.clearTimeout(x));
  }, [seen, armed, apply]);

  const toggleCap = (id: CapId) => {
    const on = st.has.includes(id);
    const has = on ? st.has.filter((c) => c !== id) : CAPS.filter((c) => c.id === id || st.has.includes(c.id)).map((c) => c.id);
    apply({ ...st, has }, { cap: id, on: !on });
  };

  const net = geo ? capNet(geo, decisions, new Set(st.has)) : { segs: [], routes: [], plugs: [] };
  const words = geo ? wordNet(geo, decisions, gate) : { segs: [], plugs: [], paths: [] };
  const hotRoutes = hot ? net.routes.filter((w) => w.drawn && ((!!hot.cap && w.cap === hot.cap) || (!!hot.tile && w.tile === hot.tile))) : [];
  const hotTiles = new Set(hot?.cap ? net.routes.filter((w) => w.cap === hot.cap).map((w) => w.tile) : []);
  const hotCaps = new Set(hot?.tile ? net.routes.filter((w) => w.tile === hot.tile).map((w) => w.cap) : []);
  const segAt = (part: string) => (part === "stub" ? T.stubs : part === "trunk" ? T.trunk : part === "branch" ? T.branch : T.words);

  return (
    <div
      className={s.root}
      data-seen={seen ? "" : undefined}
      data-instant={instant ? "" : undefined}
      data-resolved={resolved ? "" : undefined}
      data-touched={flash.n ? "" : undefined}
      data-gate={gate}
      data-demo={demo ?? undefined}
      onPointerDownCapture={endDemo}
      onKeyDownCapture={endDemo}
      onFocusCapture={endDemo}
    >
      <div ref={stage} className={s.stage}>
        {/* Under the cards: the lines themselves. */}
        <svg className={s.wires} aria-hidden data-hot={hotRoutes.length ? "" : undefined}>
          {[...net.segs, ...words.segs].map((w) => (
            <path
              key={`${w.id}-${w.state}`}
              className={s.line}
              data-part={w.part}
              data-state={w.state}
              pathLength={w.state === "on" || w.state === "clash" ? 1 : undefined}
              d={w.d}
              style={d(segAt(w.part))}
            />
          ))}
          {hotRoutes.map((w) => (
            <g key={`hot-${w.id}`} className={s.hot}>
              <path className={s.hotLine} d={w.d} data-off={st.has.includes(w.cap) ? undefined : ""} />
              {st.has.includes(w.cap) ? <path className={s.flow} d={w.d} /> : null}
            </g>
          ))}
        </svg>

        {/* 1. Say where you belong */}
        <section className={s.colA} aria-label={C.beats[0]!.k}>
          <h3 className={`${s.caption} ${s.in}`} style={d(T.brief)}>{C.beats[0]!.k}</h3>
          <div className={s.briefWrap}>
            <div className={`${s.brief} ${s.in}`} style={d(T.brief + 40)} data-brief="">
              <div className={s.who}>
                <span className={s.badge} aria-hidden>{A.name.slice(0, 1)}</span>
                <b>{A.name}</b>
              </div>
              <p className={s.offer}>{A.offer}</p>
            </div>
            <div className={s.capsBlock}>
              <Illustration className={s.illusM} />
              <div className={s.caps} role="group" aria-label="What you list">
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
          <h3 className={`${s.caption} ${s.in}`} style={d(T.tiles - 60)}>{C.beats[1]!.k}</h3>
          <p role="status" className={s.sr}>{spoken}</p>
          <ul ref={field} className={s.field}>
            {shown.map((dec) => {
              const o = ORDER[dec.id] ?? 0;
              const at = dec.id === "compare" ? T.joined - 250 : T.verdict + o * T.verdictStep;
              return (
                <li
                  key={dec.id}
                  data-tile={dec.id}
                  data-verdict={dec.verdict}
                  data-hot={hotTiles.has(dec.id) ? "" : undefined}
                  className={`${s.item} ${s.in}`}
                  style={d(T.tiles + o * T.tileStep)}
                  onPointerEnter={() => setHot({ tile: dec.id })}
                  onPointerLeave={() => setHot(null)}
                >
                  <Tile className={s.tile} question={dec.question} answer={<Verdict dec={dec} at={at} />} slot={<Slot dec={dec} at={at} />} tone={dec.verdict === "joined" ? "lit" : undefined} />
                  {flash.ids.includes(dec.id) ? <i key={flash.n} className={s.flash} aria-hidden /> : null}
                </li>
              );
            })}
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
          <h3 className={`${s.caption} ${s.in}`} style={d(T.bounds - 200)}>{C.beats[3]!.k}</h3>
          <div className={`${s.limits} ${s.in}`} style={d(T.bounds - 140)} data-paused={st.paused ? "" : undefined}>
            {/* Two labelled limits, no figures: a ceiling for one placement, inside a budget that
                ends in a wall. Outlines only; nothing ever fills. */}
            <div className={s.bounds}>
              <p className={s.boundK}>{L.ceiling}</p>
              <i className={s.rule} data-k="ceiling" style={d(T.bounds)} aria-hidden />
              <i className={s.rule} data-k="budget" style={d(T.bounds + 220)} aria-hidden>
                <i className={`${s.wall} ${s.pop}`} style={d(T.bounds + 480)} />
              </i>
              <p className={s.boundK}>{L.budget}</p>
            </div>
            <button type="button" role="switch" aria-checked={!st.paused} aria-label={L.switchLabel} className={s.switch} onClick={() => apply({ ...st, paused: !st.paused })}>
              <span>{st.paused ? L.paused : L.running}</span>
              <span className="v8-sw" data-on={st.paused ? undefined : ""} aria-hidden />
            </button>
          </div>
          <div className={`${s.action} ${s.in}`} style={d(T.bounds + 300)}>{action}</div>
        </section>

        {/* Over the cards: where lines meet the tiles, and the pulses. */}
        <svg className={s.wiresTop} aria-hidden>
          {[...net.plugs, ...words.plugs].map((p) => (
            <g key={`${p.id}-${p.state}`} className={`${s.plug} ${s.pop}`} data-state={p.state} data-hot={hotRoutes.some((w) => w.tile === p.tile) && !p.id.startsWith("plug-words") ? "" : undefined} style={d(p.id.startsWith("plug-words") ? T.words + 500 : T.branch + 420)}>
              {p.state === "clash" ? (
                <>
                  <circle className={s.stop} cx={p.x} cy={p.y} r={8} />
                  <path className={s.stopBar} d={`M${p.x - 4} ${p.y}h8`} />
                </>
              ) : (
                <circle className={s.socket} cx={p.x} cy={p.y} r={4} />
              )}
            </g>
          ))}
          {/* The performance: a pulse runs from the approved card to its slot. */}
          {flash.n === 0
            ? words.segs.filter((w) => w.state === "on").map((w) => (
                <g key={`e-${w.id}`} className={s.pulse} data-entry="" data-tone="on" style={d(T.words)}>
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
