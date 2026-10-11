// Lab route for one V3 scene on its own (development only).
import "@/v9/v9.css";
import MotionRoot from "@/motion/MotionRoot";
import Scene from "@/v9/publisher";

export default function Lab() {
  return (
    <>
      <MotionRoot />
      <main id="main" className="pg-main v8 v9">
        <Scene />
      </main>
    </>
  );
}
