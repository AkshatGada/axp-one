// axp.one landing, V5 (local review): V4 made calmer and more practical. The 3D wall cover, one
// flow with no controls, the V3 doors. V4 stays at /v4/.
import "@/v11/v11.css";
import MotionRoot from "@/motion/MotionRoot";
import Masthead from "@/v11/shell/Masthead";
import Footer from "@/v11/shell/Footer";
import Cover from "@/v11/cover";
import Shift from "@/v11/shift";
import Film from "@/v11/film";
import Advertiser from "@/v11/advertiser";
import Apps from "@/v11/apps";
import Rule from "@/v11/rule";

export default function HomeV5() {
  return (
    <div className="v10">
      <MotionRoot />
      <Masthead />
      <main id="main">
        <Cover />
        <Shift />
        <Film />
        <Advertiser />
        <Apps />
        <Rule />
        <Footer />
      </main>
    </div>
  );
}
