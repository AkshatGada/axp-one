// Reduced-motion full page at 1440 (half scale) split into 3 strips.
import { launch, open, SCRATCH } from "./lib.mjs";
const BASE = process.env.BASE || "http://localhost:3411";
const browser = await launch();
const { ctx, page, log } = await open(browser, BASE + "/", { w: 1440, h: 900, reduced: true, dpr: 0.5, wait: 1500 });
const sh = await page.evaluate(() => document.documentElement.scrollHeight);
const third = Math.ceil(sh / 3);
for (let i = 0; i < 3; i++) await page.screenshot({ path: `${SCRATCH}/rm1440-${i}.png`, fullPage: true, clip: { x: 0, y: i * third, width: 1440, height: Math.min(third, sh - i * third) } });
console.log(sh, log.console);
await ctx.close(); await browser.close();
