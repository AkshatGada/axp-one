"use client";

// A scene rises into place as it enters, like a sheet laid on the table: a short, scroll-linked
// lift with native scrolling (nothing pins). Without motion it is simply in place.
import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import useReduced from "@/motion/useReduced";

const out = (t: number) => 1 - Math.pow(1 - t, 3);

export default function Rise({ children, lift = 56 }: { children: ReactNode; lift?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReduced();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start end", "start 45%"] });
  const y = useTransform(p, (v) => lift * (1 - out(v)));
  return (
    <motion.div ref={ref} style={reduce ? undefined : { y }}>
      {children}
    </motion.div>
  );
}
