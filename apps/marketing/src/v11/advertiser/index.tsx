// 03 For advertisers: "You set the terms."
// One calm section: the heading, then four equal parts on the twelve columns (verb, one line, one
// small figure), then one action. No controls. Notes and decisions: ./NOTES.md
import type { CSSProperties, ReactNode } from "react";
import { Action, Chapter } from "../kit";
import { ADVERTISERS } from "../copy";
import Seen from "./Seen";
import { Approve, Describe, Limit, See } from "./Figures";
import c from "./advertiser.module.css";

const PARTS: { id: string; k: string; line: string; figure: ReactNode }[] = [
  ...ADVERTISERS.verbs.map((v) => ({ id: v.k.toLowerCase(), ...v, figure: v.k === "Describe" ? <Describe /> : v.k === "Approve" ? <Approve /> : <Limit /> })),
  { id: "see", ...ADVERTISERS.see, figure: <See /> },
];

export default function Advertiser() {
  return (
    <Chapter id="advertisers" no={ADVERTISERS.no} title={ADVERTISERS.title} labelledBy="advertisers-h" className={c.root}>
      <div className="x-wrap">
        <div className={`x-grid ${c.head}`}>
          <h2 id="advertisers-h" className={`x-h2 ${c.h}`}>{ADVERTISERS.h}</h2>
        </div>

        <div className={c.parts}>
          {PARTS.map((p, i) => (
            <Seen key={p.id} className={c.part} labelledBy={`advertisers-${p.id}`} style={{ "--p": i } as CSSProperties}>
              <h3 id={`advertisers-${p.id}`} className={`x-h3 ${c.verb}`}>{p.k}</h3>
              <p className={`x-body ${c.line}`}>{p.line}</p>
              <div className={c.fig} data-fig={p.id}>{p.figure}</div>
            </Seen>
          ))}
        </div>

        <p className={`x-cap ${c.note}`}>Illustration.</p>

        <div className={c.end}>
          <Action href={ADVERTISERS.action.href}>{ADVERTISERS.action.label}</Action>
        </div>
      </div>
    </Chapter>
  );
}
