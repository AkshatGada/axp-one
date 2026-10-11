// Lab route for one V5 movement on its own (development only).
import "@/v11/v11.css";
import MotionRoot from "@/motion/MotionRoot";
import Movement from "@/v11/rule";

export default function Lab() {
  return (
    <>
      <MotionRoot />
      <main id="main" className="v10">
        <div style={{ height: "70vh" }} aria-hidden />
        <Movement />
        <div style={{ height: "60vh" }} aria-hidden />
      </main>
    </>
  );
}
