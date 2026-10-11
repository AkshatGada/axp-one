"use client";

// Limit. One heavy ink frame: its top is the most per placement, its side is the total budget.
// Inside it two soft ultramarine bodies drift and press against the ink. Where they meet it they
// are cut flat; what they reach for stays outside as a dashed outline. Nothing here is a quantity:
// no columns, no baseline, no figures. The pause is the rule switch, a square ink latch that
// stills the picture (and only the picture).
import { useState } from "react";
import { useInView } from "../kit";
import { ADVERTISER } from "../story";
import { useOnScreen } from "./Seen";
import c from "./advertiser.module.css";

const [CEILING, WALL] = ADVERTISER.limits;

export default function Limit() {
  const [ref, seen] = useInView<HTMLDivElement>(0.35);
  const [liveRef, live] = useOnScreen<HTMLDivElement>();
  const [paused, setPaused] = useState(false);
  const [said, setSaid] = useState("");

  const toggle = () => {
    const next = !paused;
    setPaused(next);
    setSaid(next ? "Paused. The picture is still." : "Running again.");
  };

  return (
    <div ref={ref} className={`x-grid ${c.limit}`} data-seen={seen ? "" : undefined} data-paused={paused ? "" : undefined} data-live={live ? "" : undefined}>
      <div ref={liveRef} className={c.yard}>
        <div className={c.bay}>
          <div className={c.ghosts} aria-hidden><span className={c.orb} data-o="a" /><span className={c.orb} data-o="b" /></div>
          <div className={c.room} aria-hidden><span className={c.orb} data-o="b" /><span className={c.orb} data-o="a" /></div>
          <span className={c.bar} data-s="l" aria-hidden /><span className={c.bar} data-s="b" aria-hidden />
          <span className={c.bar} data-s="t"><span className={c.bound}>{CEILING}</span></span>
          <span className={c.bar} data-s="r"><span className={c.bound}>{WALL}</span></span>
        </div>
      </div>

      <button type="button" role="switch" aria-checked={paused} className={c.pause} onClick={toggle}>
        <span className={`x-sw ${c.latch}`} data-on={paused ? "" : undefined} aria-hidden />
        <span className={c.pauseWord}>
          <span aria-hidden={paused} data-on={paused ? undefined : ""}>Pause</span>
          <span aria-hidden={!paused} data-on={paused ? "" : undefined}>Paused</span>
        </span>
      </button>
      <span className={c.sr} role="status">{said}</span>
    </div>
  );
}
