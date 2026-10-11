"use client";

// Marks its element for a short one-time entrance as it enters the view from below. Whole and at
// rest in every other case (motion off, already on screen, reached from below): see useEntry.
import type { ReactNode } from "react";
import { useEntry } from "../rule/useEntry";

export default function Seen({ className, children }: { className?: string; children: ReactNode }) {
  const [ref, entry] = useEntry<HTMLDivElement>(0.22);
  return (
    <div ref={ref} className={className} data-entry={entry}>
      {children}
    </div>
  );
}
