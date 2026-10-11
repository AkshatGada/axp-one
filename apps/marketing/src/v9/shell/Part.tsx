"use client";

// The seam between the receipt and the doors: the receipt's two sides part, one toward each
// door. Scroll-linked, native scrolling, no pin. Without motion: the two sides, at rest.
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import useReduced from "@/motion/useReduced";
import { RECEIPT } from "../story";
import s from "./shell.module.css";

const io = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const seg = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)));

export default function Part() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReduced();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start 80%", "end 45%"] });
  const left = useTransform(p, (v) => `${-22 * io(v)}vw`);
  const right = useTransform(p, (v) => `${22 * io(v)}vw`);
  const opacity = useTransform(p, (v) => seg(v, 0, 0.15) * (1 - seg(v, 0.78, 1)));
  return (
    <div ref={ref} className={s.part} aria-hidden>
      <motion.div className={s.half} data-side="l" style={reduce ? undefined : { x: left, opacity }}>
        <span>{RECEIPT.advertiser.label}</span>
        <b>{RECEIPT.advertiser.state}</b>
      </motion.div>
      <motion.div className={s.half} data-side="r" style={reduce ? undefined : { x: right, opacity }}>
        <span>{RECEIPT.app.label}</span>
        <b>{RECEIPT.app.state}</b>
      </motion.div>
    </div>
  );
}
