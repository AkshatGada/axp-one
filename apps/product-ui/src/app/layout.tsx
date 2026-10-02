import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@axp/design-system/steel.css";
import "@axp/design-system/ledger.css";
import "./app.css";
import { polySans, polySansMono, polySansWide } from "./fonts";
import { onDevnet } from "@/data/story";

export const metadata: Metadata = {
  title: { default: onDevnet ? "axp.one MVP: one live Solana Devnet run, replayed" : "axp.one MVP: one recorded run", template: "%s, axp.one MVP" },
  description: "Explore one run of an ad exchange inside an AI app: agent decisions, sealed auctions, disclosed Sponsored cards, signed receipts and test USDC settled through Solana payment channels.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#f5f4f0", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${polySans.variable} ${polySansWide.variable} ${polySansMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
