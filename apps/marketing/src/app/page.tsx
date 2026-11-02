// axp.one: the product landing page (V5). The 3D wall cover, one question followed through, what
// each side gets, agentic payments, and the doors. One flow, no controls. Copy: src/v11/copy.ts.
import "@/v11/v11.css";
import MotionRoot from "@/motion/MotionRoot";
import Masthead from "@/v11/shell/Masthead";
import Footer from "@/v11/shell/Footer";
import Rises from "@/v11/shell/Rises";
import Cover from "@/v11/cover";
import Shift from "@/v11/shift";
import Film from "@/v11/film";
import Advertiser from "@/v11/advertiser";
import Apps from "@/v11/apps";
import Rule from "@/v11/rule";

export default function Home() {
  return (
    <div className="v10">
      <MotionRoot />
      <Rises />
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
