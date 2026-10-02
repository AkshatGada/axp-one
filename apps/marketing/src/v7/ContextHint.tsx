"use client";

// v7 ContextHint chapter: a full-bleed vermillion world. The moat line at display size, ContextHint's
// scale in words (never the exact counts: those live on contexthint.com), its traction (ContextHint's,
// not axp.one's), how agents use it, and a tilted, drifting wall of real ads observed inside ChatGPT,
// labelled before the wall. The wall straightens a little as the chapter scrolls through.
import { useRef, type CSSProperties } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { CH_URL, CONTEXTHINT } from "@/data/copy";
import { OBSERVED_ADS, type ObservedAd } from "@/chapter/observedAds";
import useReduced from "@/motion/useReduced";
import { Arrow } from "@axp/design-system/prospectus";
import s from "./ch.module.css";

function GptAd({ ad }: { ad: ObservedAd }) {
  return (
    <div className={s.gpt}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/observed-ads/creatives/${ad.slug}.webp`} alt="" className={s.creative} loading="lazy" decoding="async" width={88} height={88} />
      <div className={s.copy}>
        <div className={s.top}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/observed-ads/logos/${ad.slug}.webp`} alt="" width={16} height={16} className={s.logo} loading="lazy" decoding="async" />
          <span className={s.brand}>{ad.brand}</span>
          <span className={s.tag}>Ad</span>
        </div>
        <p className={s.title}>{ad.title}</p>
        <p className={s.body}>{ad.body}</p>
      </div>
    </div>
  );
}

const DURS = [76, 92, 68, 98];
const columns = Array.from({ length: 4 }, (_, c) => Array.from({ length: 6 }, (_, r) => OBSERVED_ADS[(c * 5 + r * 3) % OBSERVED_ADS.length]!));
const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

export default function ContextHint() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReduced();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const rotateX = useTransform(p, (v) => 30 - 16 * v);
  const y = useTransform(p, (v) => 60 - 120 * v);
  return (
    <section ref={ref} id="data" data-world="ch" data-step="ch" className={s.ch} data-header-tone="ch" aria-labelledby="ch-title">
      <div className={`px-wrap ${s.grid}`}>
        <div className={s.left} data-tone-text="">
          <p className={s.label}>
            {CONTEXTHINT.label}
          </p>
          <h2 id="ch-title" className={s.moat} data-reveal="fade">
            {CONTEXTHINT.moat} <span className={s.accent}>{CONTEXTHINT.moatAccent}</span>
          </h2>
          <a className={s.what} href={CH_URL} {...ext}>
            {CONTEXTHINT.what}
          </a>
          <ul className={s.scale}>
            {CONTEXTHINT.scale.map((x, i) => (
              <li key={x.small} data-reveal="fade" style={{ "--d": `${120 + i * 90}ms` } as CSSProperties}>
                <b>{x.big}</b> <span>{x.small}</span>
              </li>
            ))}
          </ul>
          <p className={s.traction}>{CONTEXTHINT.traction}</p>
          <p className={s.use}>{CONTEXTHINT.use}</p>
          <a className={s.action} href={CH_URL} {...ext}>
            <span>{CONTEXTHINT.action}</span>
            <Arrow width={22} />
          </a>
        </div>
        <div className={s.right} data-token-avoid="">
          <p className={s.wallLabel} data-tone-text="">{CONTEXTHINT.wallLabel}</p>
          <div className={s.wall} aria-hidden>
            <motion.div className={s.plane} style={reduce ? undefined : { rotateX, y, transformPerspective: 1400 }}>
              {columns.map((ads, c) => (
                <div key={c} className={s.col} data-dir={c % 2 ? "down" : "up"} style={{ "--dur": `${DURS[c]}s` } as CSSProperties}>
                  <div className={s.track}>
                    {[...ads, ...ads].map((ad, n) => (
                      <GptAd key={`${ad.slug}-${n}`} ad={ad} />
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
