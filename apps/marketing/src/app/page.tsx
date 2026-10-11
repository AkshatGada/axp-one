// axp.one: the landing page, v7. Visual first; words are captions. The exchange story:
// the Exchange Wall, ContextHint's audience and evidence, the complete flow, Jev, Solana,
// then direct product entry points. Every word is
// server-rendered and visible without JS; motion layers on top. Copy: src/data/copy.ts; run
// values: src/data/run.ts (the slim slice written by scripts/extract-specimens.mjs).
import Header from "@/v7/Header";
import MotionRoot from "@/motion/MotionRoot";
import FilmMode from "@/motion/FilmMode";
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
      <Header />
      <main id="main" className="pg-main">
        <Hero />
        <ContextHint />
        <How />
        <Jev />
        <Solana />
        <LedgerBenchmark />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
