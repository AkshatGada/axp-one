import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@axp/design-system/steel.css";
import "@axp/design-system/ledger.css";
import "./app.css";

export const metadata: Metadata = {
  title: { default: "AXP.one MVP: one recorded run", template: "%s · AXP.one MVP" },
  description: "Explore one recorded run of an ad exchange inside an AI app: agent decisions, a sealed auction, a disclosed Sponsored card, a signed receipt and test USDC settled on a hosted Solana sandbox.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#f5f4f0", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
