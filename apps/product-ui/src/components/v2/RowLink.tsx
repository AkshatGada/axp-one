import Link from "next/link";
import type { ReactNode } from "react";

/** A table cell link that makes the whole row clickable through a stretched pseudo-element. */
export function RowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="ld-rowlink">
      {children}
    </Link>
  );
}
