// PolySans via next/font/local: preloaded, with a metric-matched fallback, so text does not shift when fonts arrive.
// Same files as design-system/fonts (the Steel foundation's faces); these variables take precedence in the app.
import localFont from "next/font/local";

export const polySans = localFont({
  src: [
    { path: "../../../../design-system/fonts/PolySans-Neutral.woff2", weight: "400" },
    { path: "../../../../design-system/fonts/PolySans-Median.woff2", weight: "500" },
    { path: "../../../../design-system/fonts/PolySans-Bulky.woff2", weight: "700" },
  ],
  variable: "--nf-body",
  display: "swap",
  adjustFontFallback: "Arial",
});
export const polySansWide = localFont({
  src: [
    { path: "../../../../design-system/fonts/PolySans-SlimWide.woff2", weight: "300" },
    { path: "../../../../design-system/fonts/PolySans-NeutralWide.woff2", weight: "400" },
    { path: "../../../../design-system/fonts/PolySans-MedianWide.woff2", weight: "500" },
  ],
  variable: "--nf-display",
  display: "swap",
  adjustFontFallback: "Arial",
});
export const polySansMono = localFont({
  src: [
    { path: "../../../../design-system/fonts/PolySans-NeutralMono.woff2", weight: "400" },
    { path: "../../../../design-system/fonts/PolySans-MedianMono.woff2", weight: "500" },
  ],
  variable: "--nf-mono",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["ui-monospace", "monospace"],
});
