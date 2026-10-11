"use client";

// The ultramarine sheet. It rises over the paper with rounded shoulders and widens to the full
// bleed as it arrives (driven by scroll, so it can never be caught half way and left there).
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { useStageMode } from "../kit";
import Manifesto from "./Manifesto";
import Figure from "./Figure";
import Doors from "./Doors";
import s from "./rule.module.css";

export default function Spread() {
  const ref = useRef<HTMLDivElement>(null);
  const live = useStageMode() === "pinned";
  const { scrollYProgress: entry } = useScroll({ target: ref, offset: ["start end", "start start"] });
  const scaleX = useTransform(entry, [0, 0.8], [0.84, 1]);
  return (
    <div ref={ref} className={s.sheet} data-on-blue="" data-masthead="blue">
      <motion.div className={s.ground} style={live ? { scaleX } : undefined} aria-hidden />
      <div className={s.groundRest} aria-hidden />
      <Manifesto entry={entry} />
      <Figure />
      <Doors />
    </div>
  );
}
