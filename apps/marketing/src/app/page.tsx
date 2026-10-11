// axp.one: the product landing page. One story on one paper ground: the Exchange Wall, the
// exploded Sponsored card, the five stages, then what each side gets (advertisers, AI apps),
// trust and billing, where it stands, and a door per audience. Every word is server-rendered and
// visible without JS; motion layers on top. Copy: src/data/copy.ts. Technical evidence (the
// original MVP, benchmark, payment proof) is linked from the footer, not told here.
import Header from "@/v7/Header";
import MotionRoot from "@/motion/MotionRoot";
import FilmMode from "@/motion/FilmMode";
import Hero from "@/v7/Hero";
import How from "@/v7/How";
import Advertisers from "@/v7/Advertisers";
import Publishers from "@/v7/Publishers";
import Billing from "@/v7/Billing";
import Status from "@/v7/Status";
import Closing from "@/v7/Closing";
import Footer from "@/v7/Footer";

export default function Home() {
  return (
    <>
      <MotionRoot />
      <FilmMode />
      <Header />
      <main id="main" className="pg-main">
        <Hero />
        <How />
        <Advertisers />
        <Publishers />
        <Billing />
        <Status />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
