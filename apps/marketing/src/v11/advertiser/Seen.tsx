"use client";

// One part of the section. It marks itself [data-seen] once it has entered the view (kit
// useInView, with its fail safe), so its server-rendered figure can play once in CSS and rest.
import type { CSSProperties, ReactNode } from "react";
import { useInView } from "../kit";

export default function Seen({ amount = 0.3, className, style, labelledBy, children }: { amount?: number; className?: string; style?: CSSProperties; labelledBy?: string; children: ReactNode }) {
  const [ref, seen] = useInView<HTMLElement>(amount);
  return (
    <article ref={ref} className={className} style={style} aria-labelledby={labelledBy} data-seen={seen ? "" : undefined}>
      {children}
    </article>
  );
}
