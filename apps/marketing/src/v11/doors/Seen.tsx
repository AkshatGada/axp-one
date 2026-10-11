"use client";

// Marks its element once it has entered the view, so CSS can play a short one-time entrance.
// With motion off the kit's hook reports true at once and the still is complete.
import type { ReactNode } from "react";
import { useInView } from "../kit";

export default function Seen({ className, children }: { className?: string; children: ReactNode }) {
  const [ref, seen] = useInView<HTMLDivElement>("0px 0px -12% 0px");
  return (
    <div ref={ref} className={className} data-seen={seen ? "" : undefined}>
      {children}
    </div>
  );
}
