// The provenance glyphs drawn large, as the brand book's cover graphic. Same shapes as the marks.
import type { ReactElement } from "react";
import { PROVENANCE, type ProvenanceKind } from "@axp/design-system/foundation";

const S = "currentColor";
export const GLYPHS: Record<ProvenanceKind, ReactElement> = {
  actual: <rect x="18" y="18" width="64" height="64" fill={S} />,
  observed: <circle cx="50" cy="50" r="33" fill={S} />,
  inferred: (
    <>
      <circle cx="50" cy="50" r="31" fill="none" stroke={S} strokeWidth="4" />
      <path d="M50 19a31 31 0 0 0 0 62z" fill={S} />
    </>
  ),
  fictional: <rect x="20" y="20" width="60" height="60" fill="none" stroke={S} strokeWidth="4" />,
  policy: <path d="M50 12L88 50 50 88 12 50z" fill={S} />,
  settled: <rect x="10" y="38" width="80" height="24" fill={S} />,
  synthetic: <rect x="20" y="20" width="60" height="60" fill="none" stroke={S} strokeWidth="4" strokeDasharray="9 7" />,
  replay: (
    <>
      <circle cx="50" cy="50" r="31" fill="none" stroke={S} strokeWidth="4" />
      <circle cx="50" cy="50" r="17" fill={S} />
    </>
  ),
  illustrative: <path d="M50 16L86 80H14z" fill="none" stroke={S} strokeWidth="4" strokeLinejoin="miter" />,
  vision: <circle cx="50" cy="50" r="31" fill="none" stroke={S} strokeWidth="4" strokeDasharray="2 7" strokeLinecap="round" />,
};

export function GlyphPlate({ kinds }: { kinds: ProvenanceKind[] }) {
  return (
    <div className="bk-glyphs">
      {kinds.map((k) => (
        <div key={k} className="bk-glyph">
          <svg viewBox="0 0 100 100" className="" aria-hidden>
            {GLYPHS[k]}
          </svg>
          <span>{PROVENANCE[k].word}</span>
        </div>
      ))}
    </div>
  );
}
