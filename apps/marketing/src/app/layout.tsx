import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@axp/design-system/steel.css";
import "@axp/design-system/prospectus.css";
import "./fonts.css";
import "@/specimens/specimens.css";
import "./site.css";
import { MOTION_SCRIPT } from "@/motion/MotionRoot";

export const metadata: Metadata = {
  metadataBase: new URL("https://axp.one"),
  applicationName: "axp.one",
  title: "axp.one: the advertising network for the agentic internet",
  description:
    "The advertising network for the agentic internet. Advertisers reach people when they ask; AI apps earn from clearly labelled ads beside their own answers.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "axp.one: the advertising network for the agentic internet",
    description: "Reach people when they ask. AI apps earn from clearly labelled ads. Explore the advertiser dashboard, integration guide and example chat in a test workspace.",
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
        {["SlimWide", "Neutral", "Median", "NeutralWide"].map((f) => (
          <link key={f} rel="preload" href={`/fonts/PolySans-${f}.woff2`} as="font" type="font/woff2" crossOrigin="anonymous" />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}
