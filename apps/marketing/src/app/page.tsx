// axp.one: the landing page, v7. Visual first; words are captions. The exchange story:
// the Exchange Wall, how it works, ContextHint's audience and evidence, Jev, Solana,
// then direct product entry points. Every word is
// server-rendered and visible without JS; motion layers on top. Copy: src/data/copy.ts; run
// values: src/data/run.ts (the slim slice written by scripts/extract-specimens.mjs).
import { SiteHeader } from "@axp/design-system/prospectus";
import MotionRoot from "@/motion/MotionRoot";
import FilmMode from "@/motion/FilmMode";
import { HEADER, NAV, PRODUCT_VIDEO_URL } from "@/data/copy";
import Hero from "@/v7/Hero";
import How from "@/v7/How";
import ContextHint from "@/v7/ContextHint";
import Jev from "@/v7/Jev";
import Solana from "@/v7/Solana";
import LedgerBenchmark from "@/v7/LedgerBenchmark";
import Closing from "@/v7/Closing";
import Footer from "@/v7/Footer";
import Tone from "@/v7/Tone";

export default function Home() {
  return (
    <>
      <MotionRoot />
      <Tone />
      <FilmMode />
      <SiteHeader links={NAV} cta={{ href: PRODUCT_VIDEO_URL, label: HEADER.cta }} chip={HEADER.chip} />
      <main id="main" className="pg-main">
        <Hero />
        <How />
        <ContextHint />
        <Jev />
        <Solana />
        <LedgerBenchmark />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
