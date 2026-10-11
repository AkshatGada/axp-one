"use client";

// Scene A, "The moment". Four nearby questions on one topic, and one reply at human size.
// The picture carries the idea: in the chosen question the words that decide light up (blue
// where HarborKey offers it, grey where it does not), and the slot beside the answer resolves
// to HarborKey's card, another advertiser's card, or stays empty.
// Every state is rendered and stacked in the same cells (only the chosen one is visible), so the
// specimen never changes size, the default state is complete without JS, and a change of state is
// a short cross-fade. See NOTES.md for the idea, the decisions and the copy proposals.
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Illustration, Scene, SponsoredCard, useInView } from "../kit";
import { MOMENT } from "../copy";
import { ADVERTISER, MOMENTS, type Moment } from "../story";
import s from "./moment.module.css";

/** The four moments this scene uses, in reading order. "staking" is left out on purpose (NOTES). */
const IDS = ["compare", "mobile", "learn", "bitcoin"] as const;
type Id = (typeof IDS)[number];
const ITEMS = IDS.map((id) => MOMENTS.find((m) => m.id === id)!);

/** The words in each question that decide, in order of appearance. Each phrase is an exact
 *  substring of the frozen question; `ok` is true where HarborKey declared that capability. */
const DECIDES: Record<Id, { t: string; ok: boolean }[]> = {
  compare: [{ t: "hardware wallets", ok: true }, { t: "Ethereum and Solana", ok: true }, { t: "offline key storage", ok: true }],
  mobile: [{ t: "mobile-only", ok: false }, { t: "don't want to carry a device", ok: false }],
  learn: [{ t: "How does", ok: false }, { t: "actually work", ok: false }],
  bitcoin: [{ t: "hardware wallet", ok: true }, { t: "only needs to hold Bitcoin", ok: false }],
};

/** Local wording (proposals, listed in NOTES.md). */
const LOCAL = { choosing: "Choosing", learning: "Learning", beside: "Beside the answer", noAdShort: "No ad" };

type Kind = "own" | "other" | "none";
const kindOf = (m: Moment): Kind => (m.placed === ADVERTISER.name ? "own" : m.placed ? "other" : "none");
const personOf = (m: Moment) => (m.buying ? LOCAL.choosing : LOCAL.learning);

function marked(m: Moment): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = m.question;
  DECIDES[m.id as Id].forEach((p, k) => {
    const i = rest.indexOf(p.t);
    if (i < 0) return;
    if (i > 0) out.push(rest.slice(0, i));
    out.push(<mark key={k} className={s.mark} data-ok={p.ok ? "" : undefined} style={{ "--k": k } as CSSProperties}>{p.t}</mark>);
    rest = rest.slice(i + p.t.length);
  });
  if (rest) out.push(rest);
  return out;
}

/** One cell of the specimen: every state stacked in place, only the chosen one shown. */
function Stack({ value, className, children }: { value: Id; className?: string; children: (m: Moment) => ReactNode }) {
  return (
    <div className={`${s.stack}${className ? ` ${className}` : ""}`}>
      {ITEMS.map((m) => (
        <div key={m.id} className={s.layer} data-on={m.id === value ? "" : undefined} aria-hidden={m.id === value ? undefined : true}>
          {children(m)}
        </div>
      ))}
    </div>
  );
}

function Slot({ m }: { m: Moment }) {
  const kind = kindOf(m);
  if (kind === "own") return <SponsoredCard className={s.own} name={ADVERTISER.name} text={ADVERTISER.creative} />;
  if (kind === "other")
    return (
      <div className={s.other}>
        <div className={s.otherHead}>
          <span className={s.otherTag}>Sponsored</span>
          <span className={s.otherName}>{m.placed}</span>
        </div>
        <div className={s.otherLines} aria-hidden><i /><i /><i /></div>
      </div>
    );
  return <div className={s.empty}>{MOMENT.noAd}</div>;
}

export default function TheMoment() {
  const [value, setValue] = useState<Id>("compare");
  const [touched, setTouched] = useState(false);
  const [ref, seen] = useInView<HTMLDivElement>();
  const current = ITEMS.find((m) => m.id === value)!;
  // Once the one-time entry has played, state changes use the short timings.
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!seen) return;
    const id = window.setTimeout(() => setDone(true), 1600);
    return () => window.clearTimeout(id);
  }, [seen]);

  return (
    <Scene id="moment" className={s.sec} who={MOMENT.who} question={MOMENT.question} lede={MOMENT.lede}>
      <div ref={ref} className={s.root} data-in={seen ? (done ? "done" : "") : undefined}>
        <p id="moment-hint" className={s.hint}>{MOMENT.hint}</p>
        <Illustration className={s.illus} />

        <div className={s.opts} role="radiogroup" aria-labelledby="moment-hint">
          {ITEMS.map((m, i) => (
            <label key={m.id} className={s.opt} style={{ "--i": i } as CSSProperties}>
              <input
                type="radio"
                name="moment-question"
                value={m.id}
                checked={m.id === value}
                onChange={() => {
                  setValue(m.id as Id);
                  setTouched(true);
                }}
              />
              <span className={s.bubble}>{marked(m)}</span>
              <span className={s.meta}>
                <span className={s.person}>{personOf(m)}</span>
                <span className={s.out} data-kind={kindOf(m)}>
                  <i className={s.glyph} aria-hidden />
                  <span className={s.vh}>{LOCAL.beside}: </span>
                  {m.placed ?? LOCAL.noAdShort}
                </span>
              </span>
            </label>
          ))}
        </div>

        {/* The reply: the app's answer (neutral lines, the same in every state) and its one slot. */}
        <div className={s.tile} data-kind={kindOf(current)}>
          <div className={s.ans} aria-hidden>{Array.from({ length: 11 }, (_, i) => <i key={i} />)}</div>
          <Stack value={value} className={s.slot}>{(m) => <Slot m={m} />}</Stack>
        </div>

        <Stack value={value} className={s.why}>{(m) => <p className={s.reason}>{m.reason}</p>}</Stack>

        {/* Announced only after the reader changes the question. */}
        <p className={s.vh} aria-live="polite">
          {touched ? `${personOf(current)}. ${LOCAL.beside}: ${current.placed ? `${current.placed}, Sponsored.` : MOMENT.noAd} ${current.reason}` : ""}
        </p>
      </div>
    </Scene>
  );
}
