import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/");
const { chromium } = require("playwright-core");
const [mode, prefix, sliceH, per, outW] = process.argv.slice(2); // mode=mobile|reduced
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const isM = mode === "mobile";
const ctx = await b.newContext({ viewport: { width: isM ? 390 : 1440, height: isM ? 844 : 900 }, isMobile: isM, hasTouch: isM, reducedMotion: isM ? "no-preference" : "reduce" });
const p = await ctx.newPage();
await p.goto(""+(process.env.BASE||"http://localhost:3410/")+"", { waitUntil: "networkidle" }); await p.waitForTimeout(3000);
// scroll through so reveals fire
const H = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < H; y += 400) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(60); }
await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(800);
const W = isM ? 390 : 1440; const sh = +sliceH; const n = Math.ceil(H / sh);
const bufs = [];
for (let i = 0; i < n; i++) bufs.push((await p.screenshot({ fullPage: true, clip: { x: 0, y: i * sh, width: W, height: Math.min(sh, H - i * sh) } })).toString("base64"));
const m = await (await b.newContext({ viewport: { width: +outW, height: sh } })).newPage();
for (let g = 0; g * per < n; g++) {
  const imgs = bufs.slice(g * per, g * per + +per).map((s, k) => `<div style="display:inline-block;vertical-align:top;margin-right:8px"><div style="font:12px sans-serif;background:#000;color:#fff;padding:2px">${(g * per + k) * sh}px</div><img src="data:image/png;base64,${s}" style="width:${(+outW - 8 * per) / per}px;display:block"></div>`).join("");
  await m.setContent(`<body style="margin:0;background:#888;white-space:nowrap">${imgs}</body>`);
  await m.waitForTimeout(200);
  await m.screenshot({ path: `out/v5/${prefix}-${g}.png`, fullPage: true });
}
console.log("H", H, "slices", n);
await b.close();
