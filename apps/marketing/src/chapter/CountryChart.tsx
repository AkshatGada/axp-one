// "Collecting in 12 countries." Fresh Ads live collection: for each country, calls (outline)
// and calls whose answer carried an ad (vermillion fill), with the hit rate. Bars fill as the
// chart scrolls in; still under reduced motion. Country names only, no flags.
import type { CSSProperties } from "react";
import { FRESH_ADS, pct } from "@/data/library";

export function CountryChart() {
  const max = Math.max(...FRESH_ADS.rows.map((r) => r.calls));
  return (
    <div className="cc" data-reveal="">
      <div className="cc-head" aria-hidden>
        <span>Country</span>
        <span>
          <i className="cc-key-out" /> Calls <i className="cc-key-in" /> Calls that returned ads
        </span>
        <span>Returned</span>
        <span>Hit rate</span>
      </div>
      <ol className="cc-rows">
        {FRESH_ADS.rows.map((r, i) => (
          <li key={r.country} style={{ "--i": i } as CSSProperties}>
            <span className="cc-name">{r.country}</span>
            <span className="cc-bar" role="img" aria-label={`${r.country}: ${r.withAds} of ${r.calls} calls returned ads`}>
              <span className="cc-out" style={{ width: `${(r.calls / max) * 100}%` }} />
              <span className="cc-in" style={{ width: `${(r.withAds / max) * 100}%` }} />
            </span>
            <span className="cc-nums px-num">
              {r.withAds} of {r.calls}
            </span>
            <b className="cc-rate px-num">{pct(r.withAds, r.calls)}</b>
          </li>
        ))}
      </ol>
    </div>
  );
}
