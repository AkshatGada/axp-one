// axp.one: the landing page, v7. Visual first; words are captions. The story of what happens in
// the MVP: the Exchange Wall and the dive into the exploded card, how it works, the three pillar
// chapters (ContextHint, Jev, Solana), inside the MVP, proof, closing. Every word is
// server-rendered and visible without JS; motion layers on top. Copy: src/data/copy.ts; run
// values: src/data/run.ts (the slim slice written by scripts/extract-specimens.mjs).
import { SiteHeader } from "@axp/design-system/prospectus";
import MotionRoot from "@/motion/MotionRoot";
import FilmMode from "@/motion/FilmMode";
import { HEADER, MVP_URL, NAV } from "@/data/copy";
import Hero from "@/v7/Hero";

export default function Home() {
  return (
    <>
      <MotionRoot />
      <FilmMode />
      <SiteHeader links={NAV} cta={{ href: MVP_URL, label: HEADER.cta, external: true }} chip={HEADER.chip} />
      <main id="main" className="pg-main">
        <Hero />
        <section style={{ height: "100vh" }} />
      </main>
    </>
  );
}
