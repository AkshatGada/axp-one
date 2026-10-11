// Lab route for one V4 movement on its own (development only).
import "@/v10/v10.css";
import MotionRoot from "@/motion/MotionRoot";
import Movement from "@/v10/shift";

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
