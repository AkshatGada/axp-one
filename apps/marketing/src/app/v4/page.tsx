// axp.one landing, V4 (local review): an editorial feature, redesigned from first principles.
// One question followed from the moment it is asked, in six movements. Plan:
// docs/frontend/LANDING_V4_PLAN.md. V3.1, V2 and V1 stay at /v3/, /v2/ and /.
import "@/v10/v10.css";
import MotionRoot from "@/motion/MotionRoot";
import Masthead from "@/v10/shell/Masthead";
import Footer from "@/v10/shell/Footer";
import Cover from "@/v10/cover";
import Shift from "@/v10/shift";
import Film from "@/v10/film";
import Advertiser from "@/v10/advertiser";
import Apps from "@/v10/apps";
import Rule from "@/v10/rule";

export default function HomeV4() {
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
