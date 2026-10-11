// axp.one landing, V3 (local review): V2 taken a level up, scene by scene. V2 stays at /v2/, V1 at /.
import "@/v9/v9.css";
import Header from "@/v7/Header";
import MotionRoot from "@/motion/MotionRoot";
import Hero from "@/v9/opening";
import Footer from "@/v9/footer";
import Moment from "@/v9/moment";
import Advertiser from "@/v9/advertiser";
import Publisher from "@/v9/publisher";
import Meet from "@/v9/meet";
import Rise from "@/v9/shell/Rise";
import Carry from "@/v9/shell/Carry";
import { ADVERTISER_URL } from "@/data/copy";

const NAV_V2 = [
  { href: "#advertisers", label: "For advertisers" },
  { href: "#publishers", label: "For AI apps" },
  { href: "#network", label: "One network" },
];

export default function HomeV3() {
  return (
    <>
      <MotionRoot />
      <Header nav={NAV_V2} cta={{ href: ADVERTISER_URL, label: "Open the dashboard" }} />
      <main id="main" className="pg-main v8 v9">
        <Hero />
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
