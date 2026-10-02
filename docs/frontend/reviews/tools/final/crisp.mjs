// 2x DPR crops of the exploded stack and the hero tile, to check for blur.
import { launch, open, scrollTo, SCRATCH } from "./lib.mjs";
const BASE = process.env.BASE || "http://localhost:3410";
const browser = await launch();
const { ctx, page } = await open(browser, BASE + "/", { w: 1440, h: 900, dpr: 2, wait: 1500 });
await scrollTo(page, 0, 800);
await page.screenshot({ path: `${SCRATCH}/crisp-hero-tile.png`, clip: { x: 1000, y: 120, width: 420, height: 300 } });
await scrollTo(page, Math.round(1890 * 0.85), 900);
await page.screenshot({ path: `${SCRATCH}/crisp-stack.png`, clip: { x: 620, y: 300, width: 500, height: 330 } });
const m = await page.evaluate(() => [...document.querySelectorAll("[class*=plate]")].slice(0, 8).map((e) => { const cs = getComputedStyle(e); return [String(e.className).slice(0, 30), cs.transform.slice(0, 80), cs.willChange, cs.filter]; }));
console.log(JSON.stringify(m, null, 0));
await ctx.close(); await browser.close();
