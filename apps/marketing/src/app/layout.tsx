import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@axp/design-system/steel.css";
import "@axp/design-system/prospectus.css";
import "@/specimens/specimens.css";
import "@/scenes/scenes.css";
import "./site.css";
import { MOTION_SCRIPT } from "@/motion/MotionRoot";

export const metadata: Metadata = {
  metadataBase: new URL("https://axp.one"),
  title: "AXP.one: the advertising exchange for the agentic internet",
  description:
    "Advertiser agents bid for a disclosed place beside the answer in AI apps. Code decides who wins and what it costs. Publishers are paid in stablecoins for each card they deliver. A working MVP on a hosted Solana sandbox with test USDC.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "AXP.one: the advertising exchange for the agentic internet",
    description: "Disclosed. Decided in code. Paid on delivery. A working MVP, recorded end to end.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#f5f4f0", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
