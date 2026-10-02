"use client";

// v7 closing: ultramarine. The story comes back to the wall: the camera pulls back out of a quiet,
// white-on-ultramarine wall of questions as the closing scrolls in, under the three promises.
import { useRef } from "react";
import { useScroll, useTransform } from "motion/react";
import { ActionPrimary, ActionText } from "@axp/design-system/prospectus";
import { CH_URL, CLOSING, MVP_URL, VIDEO_ANCHOR } from "@/data/copy";
import useReduced from "@/motion/useReduced";
import { io, seg } from "@/motion/motion";
import { Wall } from "./Hero";
import s from "./closing.module.css";

export default function Closing() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReduced();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const t = (v: number) => io(seg(v, 0, 0.9));
  const z = useTransform(p, (v) => 560 * (1 - t(v)));
  const rx = useTransform(p, (v) => 10 + 16 * t(v));
  const rz = useTransform(p, (v) => -3 - 8 * t(v));
  return (
    <section ref={ref} data-world="brand" className={s.close} data-tone="brand" data-header-tone="brand" aria-labelledby="close-title">
      <div className={s.wallMask} aria-hidden>
        <Wall lite tone="brand" opacity={0.2} plane={{ x: reduce ? 26 : rx, y: 6, z: reduce ? -11 : rz }} cam={{ z: reduce ? 0 : z, y: 0 }} />
      </div>
      <div className={s.fog} aria-hidden />
      <div className={`px-wrap ${s.in}`} data-tone-text="">
        <h2 id="close-title" className={s.h2}>
          {CLOSING.h2}
        </h2>
        <div className={s.actions}>
          <ActionPrimary href={MVP_URL} external>
            {CLOSING.primary}
          </ActionPrimary>
          <ActionText href={VIDEO_ANCHOR}>{CLOSING.video}</ActionText>
          <ActionText href={CH_URL} external>
            {CLOSING.contexthint}
          </ActionText>
        </div>
      </div>
    </section>
  );
}
