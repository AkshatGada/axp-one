// "Three numbers, kept apart." The library, the screened slice this MVP drew on, and one packet:
// narrowing, vermillion until the packet enters the agent, where it turns ultramarine.
import type { CSSProperties } from "react";
import { CONTEXTHINT } from "@/data/copy";

const WIDTHS = [100, 58, 24];

export function Funnel() {
  return (
    <div className="fn">
      <p className="px-h3">{CONTEXTHINT.funnelTitle}</p>
      <ol className="fn-rows">
        {CONTEXTHINT.funnel.map((f, i) => (
          <li key={f.title} data-step={i} data-reveal="fade" style={{ "--d": `${i * 120}ms` } as CSSProperties}>
            <div className="fn-bar" style={{ width: `${WIDTHS[i]}%` }}>
              <span className="fn-value">
                {f.value}
                <span className="fn-unit">{f.unit}</span>
              </span>
            </div>
            <div className="fn-text">
              <b>{f.title}</b>
              <p>{f.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
