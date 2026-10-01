// /design: the v7 Prospectus brand book (noindex, removed from the production export). The one
// shape system (the Ledger v2 radius scale and shadow levels), the colour worlds, the type scale,
// the actions and the signature components, drawn from the same code the landing uses.
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { ActionPrimary, ActionText, SiteHeader, Wordmark } from "@axp/design-system/prospectus";
import MotionRoot from "@/motion/MotionRoot";
import { HEADER, MVP_URL, NAV, STACK } from "@/data/copy";
import { Plate, StillStack } from "@/v7/Plates";
import s from "@/v7/design.module.css";

export const metadata: Metadata = { title: "Prospectus v7", robots: { index: false, follow: false } };

const RADII = [
  { k: "xs", v: "4px", use: "Tags in dense rows" },
  { k: "sm", v: "6px", use: "Controls: buttons, inputs" },
  { k: "md", v: "10px", use: "Cards, specimens" },
  { k: "lg", v: "12px", use: "Panels, plates, blocks" },
  { k: "xl", v: "16px", use: "Large frames, sheets, lanes" },
  { k: "full", v: "999px", use: "Pills, chips, nodes" },
];
const SHADOWS = ["1", "2", "3", "4"];
const WORLDS = [
  { name: "Paper", bg: "var(--paper)", fg: "var(--ink)", use: "Hero, MVP, proof" },
  { name: "Stage", bg: "var(--stage)", fg: "var(--stage-ink)", use: "How it works" },
  { name: "ContextHint", bg: "var(--contexthint)", fg: "var(--ink)", use: "Its chapter only" },
  { name: "Ultramarine", bg: "var(--brand)", fg: "#fff", use: "Jev, closing, actions" },
  { name: "Solana", bg: "var(--sol)", fg: "#fff", use: "Its chapter only" },
  { name: "Solana green", bg: "var(--sol-green)", fg: "var(--sol-ink)", use: "Money that moved" },
];

export default function Design() {
  return (
    <>
      <MotionRoot />
      <SiteHeader links={NAV} cta={{ href: MVP_URL, label: HEADER.cta, external: true }} chip={HEADER.chip} />
      <main className={s.book}>
        <section className={s.cover}>
          <div className="px-wrap">
            <Wordmark as="p" className={s.mark} />
            <h1 className="px-dxl">Prospectus v7</h1>
            <p className="px-lead">One shape system, one accent, three pillar worlds. Visual first; words are captions.</p>
          </div>
        </section>

        <section className="px-wrap">
          <h2 className="px-h2">Shape</h2>
          <ul className={s.radii}>
            {RADII.map((r) => (
              <li key={r.k}>
                <i style={{ borderRadius: r.v } as CSSProperties} />
                <b>
                  --px-r-{r.k} <span>{r.v}</span>
                </b>
                <span>{r.use}</span>
              </li>
            ))}
          </ul>
          <ul className={s.shadows}>
            {SHADOWS.map((n) => (
              <li key={n} style={{ boxShadow: `var(--px-shadow-${n})` }}>
                --px-shadow-{n}
              </li>
            ))}
          </ul>
        </section>

        <section className="px-wrap">
          <h2 className="px-h2">Colour worlds</h2>
          <ul className={s.worlds}>
            {WORLDS.map((w) => (
              <li key={w.name} style={{ background: w.bg, color: w.fg }}>
                <b>{w.name}</b>
                <span>{w.use}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="px-wrap">
          <h2 className="px-h2">Type</h2>
          <div className={s.type}>
            <p className="px-dxl">Display</p>
            <p className="px-h1">Heading one</p>
            <p className="px-h2">Heading two</p>
            <p className="px-lead">Lead: one short supporting sentence.</p>
            <p className="px-body">Body, for the rare paragraph. PolySans only; figures tabular.</p>
          </div>
        </section>

        <section className="px-wrap">
          <h2 className="px-h2">Actions</h2>
          <div className={s.row}>
            <ActionPrimary href="#">See the working MVP</ActionPrimary>
            <ActionPrimary href="#" variant="outline">
              Outline
            </ActionPrimary>
            <ActionText href="#">Text action</ActionText>
            <span className="px-chip">Hackathon MVP</span>
          </div>
        </section>

        <section className="px-wrap">
          <h2 className="px-h2">The exploded card</h2>
          <p className="px-small">{STACK.line} Painted plates, 2D matrices on whole pixels, no layers: live, crisp text.</p>
          <div className={s.stack}>
            <StillStack k={0.8} />
          </div>
          <div className={s.flatOne}>
            <Plate id="auction" style={{ position: "relative" }} />
          </div>
        </section>
      </main>
    </>
  );
}
