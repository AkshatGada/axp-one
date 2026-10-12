"use client";

// One part of the section, with a one-time entrance (see v11/rule/useEntry.ts).
import type { CSSProperties, ReactNode } from "react";
import { useEntry } from "../rule/useEntry";

export default function Seen({ amount = 0.3, className, style, labelledBy, children }: { amount?: number; className?: string; style?: CSSProperties; labelledBy?: string; children: ReactNode }) {
  const [ref, entry] = useEntry<HTMLElement>(amount);
  return (
    <article ref={ref} className={className} style={style} aria-labelledby={labelledBy} data-entry={entry}>
      {children}
    </article>
  );
}
