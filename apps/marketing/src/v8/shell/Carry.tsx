"use client";

// The seam between the advertiser's side and the app's side: the tile that joined leaves the
// advertiser's field and grows toward the reader until it is the app itself. Scroll-linked,
// native scrolling, no pin. Without motion: the tile, at rest, between the two scenes.
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import useReduced from "@/motion/useReduced";
import { SponsoredCard, Tile } from "../kit";
import { ADVERTISER, PLACEMENT } from "../story";
import s from "./shell.module.css";

const io = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const seg = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)));

export default function Carry() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReduced();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start 80%", "end 55%"] });
  const scale = useTransform(p, (v) => 0.8 + 0.5 * io(v));
  const y = useTransform(p, (v) => 36 * io(v));
  const opacity = useTransform(p, (v) => seg(v, 0, 0.12) * (1 - seg(v, 0.62, 0.95)));
  const line = useTransform(p, (v) => seg(v, 0, 0.5));
  return (
    <div ref={ref} className={s.carry} aria-hidden>
      <motion.i className={s.carryLine} style={reduce ? undefined : { scaleY: line }} />
      <motion.div className={s.carryTile} style={reduce ? undefined : { scale, y, opacity }}>
        <Tile tone="lit" question={PLACEMENT.moment.question} slot={<SponsoredCard size="s" name={ADVERTISER.name} text={ADVERTISER.creative} />} />
      </motion.div>
    </div>
  );
}
