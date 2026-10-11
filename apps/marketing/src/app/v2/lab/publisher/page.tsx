// Lab route for one V2 scene on its own (development only; removed from the export).
import "@/v8/v8.css";
import MotionRoot from "@/motion/MotionRoot";
import Scene from "@/v8/publisher";

export default function Lab() {
  return (
    <>
      <MotionRoot />
      <main id="main" className="v8">
        <Scene />
      </main>
    </>
  );
}
