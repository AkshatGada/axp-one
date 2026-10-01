// Hero lab A, the Exchange Wall (noindex, removed from the production export).
import type { Metadata } from "next";
import LabShell from "@/hero-lab/LabShell";
import ExchangeWall from "@/hero-lab/ExchangeWall";

export const metadata: Metadata = { title: "Hero lab A", robots: { index: false, follow: false } };

export default function HeroLabA() {
  return (
    <LabShell name="A, the Exchange Wall" other={{ href: "/hero-lab/b/", label: "See B, the Order Book" }}>
      <ExchangeWall />
    </LabShell>
  );
}
