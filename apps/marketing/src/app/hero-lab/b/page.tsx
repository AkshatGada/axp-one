// Hero lab B, the Order Book (noindex, removed from the production export).
import type { Metadata } from "next";
import LabShell from "@/hero-lab/LabShell";
import OrderBook from "@/hero-lab/OrderBook";

export const metadata: Metadata = { title: "Hero lab B", robots: { index: false, follow: false } };

export default function HeroLabB() {
  return (
    <LabShell name="B, the Order Book" other={{ href: "/hero-lab/a/", label: "See A, the Exchange Wall" }}>
      <OrderBook />
    </LabShell>
  );
}
