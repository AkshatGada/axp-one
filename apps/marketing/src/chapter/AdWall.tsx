// A wall of real ads observed by ContextHint inside ChatGPT, drawn the way ChatGPT renders its
// sponsored unit (a third-party UI, so it keeps ChatGPT's own radius and neutral palette).
// Columns drift in alternate directions (CSS only); still under reduced motion.
import type { CSSProperties } from "react";
import { OBSERVED_ADS, type ObservedAd } from "./observedAds";

function GptAd({ ad }: { ad: ObservedAd }) {
  return (
    <div className="gpt">
      <div className="gpt-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/observed-ads/creatives/${ad.slug}.webp`} alt="" className="gpt-creative" loading="lazy" decoding="async" width={96} height={96} />
        <div className="gpt-copy">
          <div className="gpt-top">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/observed-ads/logos/${ad.slug}.webp`} alt="" width={16} height={16} className="gpt-logo" loading="lazy" decoding="async" />
            <span className="gpt-brand">{ad.brand}</span>
            <span className="gpt-tag">Ad</span>
          </div>
          <p className="gpt-title">{ad.title}</p>
          <p className="gpt-body">{ad.body}</p>
        </div>
      </div>
    </div>
  );
}

const DURS = [70, 88, 62, 94];

export function AdWall({ cols = 4 }: { cols?: number }) {
  const pool = OBSERVED_ADS;
  const columns = Array.from({ length: cols }, (_, c) => Array.from({ length: 6 }, (_, r) => pool[(c * 5 + r * 3) % pool.length]!));
  return (
    <div className="aw" aria-hidden>
      <div className="aw-plane">
        {columns.map((ads, c) => (
          <div key={c} className="aw-col" data-dir={c % 2 ? "down" : "up"} style={{ "--dur": `${DURS[c % DURS.length]}s` } as CSSProperties}>
            <div className="aw-track">
              {[...ads, ...ads].map((ad, n) => (
                <GptAd key={`${ad.slug}-${n}`} ad={ad} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
