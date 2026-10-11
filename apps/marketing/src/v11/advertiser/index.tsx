// 03 For advertisers: "You set the terms."
// A tall, unpinned editorial spread. Three enormous verbs, each with one object the reader can
// handle (a written sheet and its blocks, a sealed card, a ceiling and a wall), then the reasons.
// Notes, decisions and proposals: ./NOTES.md
import type { CSSProperties, ReactNode } from "react";
import { Action, Chapter, Fig, Split } from "../kit";
import { ADVERTISERS } from "../copy";
import { MOMENTS } from "../story";
import Seen from "./Seen";
import Describe from "./Describe";
import Approve from "./Approve";
import Limit from "./Limit";
import c from "./advertiser.module.css";

const FIGURES: Record<string, ReactNode> = { Describe: <Describe />, Approve: <Approve />, Limit: <Limit /> };
const SIDES = ["left", "right", "left"] as const;
/** The moments shown under "See why": a yes, a buying question that needs something else, and a
 *  question that is on topic but is not a buying moment. (The Bitcoin moment is in "Describe".) */
const WHY = ["main", "phone", "learn"].flatMap((id) => MOMENTS.filter((m) => m.id === id));
const OUTCOME = { appears: "Appears", "left alone": "Left alone" } as const;

function Head({ k, line, side = "left" }: { k: string; line: string; side?: "left" | "right" }) {
  return (
    <Seen as="header" amount={0.6} className={`x-grid ${c.head}`}>
      <Split as="h3" text={k} chars className={`x-mega ${c.verb}`} />
      <p className={`x-deck ${c.line}`} data-side={side}>{line}</p>
    </Seen>
  );
}

export default function Advertiser() {
  return (
    <Chapter id="advertisers" no={ADVERTISERS.no} title={ADVERTISERS.title} labelledBy="advertisers-h" className={c.root}>
      <div className="x-wrap">
        <Seen amount={0.5} className={c.title}>
          <Split as="h2" id="advertisers-h" text={ADVERTISERS.h} className={`x-h1 ${c.h}`} />
        </Seen>

        {ADVERTISERS.verbs.map((v, i) => (
          <section key={v.k} className={c.act} data-act={v.k.toLowerCase()} data-side={SIDES[i] ?? "left"} aria-label={v.k}>
            <Head k={v.k} line={v.line} side={SIDES[i] ?? "left"} />
            <Fig className={c.plate}>{FIGURES[v.k]}</Fig>
          </section>
        ))}

        <section className={c.act} data-act="see" aria-label={ADVERTISERS.see.k}>
          <Head k={ADVERTISERS.see.k} line={ADVERTISERS.see.line} />
          <Fig className={c.plate}>
            <Seen as="ol" amount={0.3} className={c.why}>
              {WHY.map((m, i) => (
                <li key={m.id} className={`x-grid ${c.whyRow}`} data-outcome={m.outcome === "appears" ? "yes" : "no"} style={{ "--r": i } as CSSProperties}>
                  <p className={c.whyQ}><span>{`“${m.question}”`}</span></p>
                  <div className={c.whyOut}>
                    <span className={c.glyph} aria-hidden><i /><i /><b /></span>
                    <p className={c.whyWord}>{OUTCOME[m.outcome]}</p>
                    <p className={c.whyWhy}>{m.why}</p>
                  </div>
                </li>
              ))}
            </Seen>
          </Fig>
        </section>

        <div className={c.end}>
          <Action href={ADVERTISERS.action.href} className={c.cta}>{ADVERTISERS.action.label}</Action>
        </div>
      </div>
    </Chapter>
  );
}
