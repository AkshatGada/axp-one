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
import How from "@/v7/How";
import ContextHint from "@/v7/ContextHint";
import Jev from "@/v7/Jev";
import Solana from "@/v7/Solana";
import Tour from "@/v7/Tour";
import Proof from "@/v7/Proof";
import Closing from "@/v7/Closing";
import Footer from "@/v7/Footer";
import Tone from "@/v7/Tone";

export default function Home() {
  return (
    <>
      <MotionRoot />
      <Tone />
      <FilmMode />
      <SiteHeader links={NAV} cta={{ href: MVP_URL, label: HEADER.cta, external: true }} chip={HEADER.chip} />
      <main id="main" className="pg-main">
        <Hero />
        <How />
        <ContextHint />
        <Jev />
        <Solana />
        <Tour />
        <Proof />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
