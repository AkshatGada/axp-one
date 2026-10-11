// axp.one landing, V2 (local review). One placement seen from several sides: the kept hero and
// exploded card, then the moment, the advertiser's side, the app's side, where they meet, and
// two doors. V1 stays at / (tag axp-landing-product-v1). Shell, kit and seams: the integrator.
import "@/v8/v8.css";
import Header from "@/v7/Header";
import MotionRoot from "@/motion/MotionRoot";
import Hero from "@/v7/Hero";
import Footer from "@/v8/shell/Footer";
import Moment from "@/v8/moment";
import Advertiser from "@/v8/advertiser";
import Publisher from "@/v8/publisher";
import Meet from "@/v8/meet";
import Rise from "@/v8/shell/Rise";
import Carry from "@/v8/shell/Carry";
import { ADVERTISER_URL } from "@/data/copy";

const NAV_V2 = [
  { href: "#advertisers", label: "For advertisers" },
  { href: "#publishers", label: "For AI apps" },
  { href: "#network", label: "One network" },
];

export default function HomeV2() {
  return (
    <>
      <MotionRoot />
      <Header nav={NAV_V2} cta={{ href: ADVERTISER_URL, label: "Open the dashboard" }} />
      <main id="main" className="pg-main v8">
        <Hero v2 />
        <Rise><Moment /></Rise>
        <Rise><Advertiser /></Rise>
        <Carry />
        <Rise lift={24}><Publisher /></Rise>
        <Meet />
      </main>
      <Footer />
    </>
  );
}
