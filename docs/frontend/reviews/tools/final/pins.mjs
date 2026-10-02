// Pinned scenes frame by frame: node pins.mjs <w> <h> [dpr]. Hero (0..1 in 0.05), How and Solana pins (0..1 in 0.1), then back-scroll checks.
import fs from "node:fs";
import { launch, open, scrollTo, sheet, SCRATCH } from "./lib.mjs";
const BASE = process.env.BASE || "http://localhost:3410";
const w = +process.argv[2] || 1440, h = +process.argv[3] || 900, dpr = +(process.argv[4] || 1);
const browser = await launch();
const { ctx, page, log } = await open(browser, BASE + "/", { w, h, dpr, wait: 1500 });
const pins = await page.evaluate(() => ["top", "how", "solana"].map((id) => { const el = document.getElementById(id); const r = el.getBoundingClientRect(); return { id, top: Math.round(r.top + scrollY), h: Math.round(r.height) }; }));
const out = {};
for (const p of pins) {
  const span = p.h - innerHeightFix(h);
  const steps = p.id === "top" ? 20 : 10;
  const files = [], labels = [];
  for (let i = 0; i <= steps; i++) {
    const y = p.top + Math.round((span * i) / steps);
    await scrollTo(page, y, 500);
    const f = `${SCRATCH}/pin-${w}x${dpr}-${p.id}-${String(i).padStart(2, "0")}.png`;
    await page.screenshot({ path: f });
    files.push(f); labels.push(`${p.id} ${(i / steps).toFixed(2)}`);
  }
  // back-scroll: go to the end of the pin then step back to 0.5 and compare with the forward 0.5 frame
  await scrollTo(page, p.top + span + h, 500);
  const yb = p.top + Math.round(span * 0.5);
  await scrollTo(page, yb, 700);
  const fb = `${SCRATCH}/pin-${w}x${dpr}-${p.id}-back50.png`; await page.screenshot({ path: fb });
  files.push(fb); labels.push(`${p.id} 0.50 after back-scroll`);
  await sheet(browser, files, `${SCRATCH}/pins-${w}x${dpr}-${p.id}.png`, { cols: 4, tw: w < 600 ? 200 : 460, labels });
  out[p.id] = { top: p.top, h: p.h, span };
}
function innerHeightFix(h) { return h; }
console.log(w, h, dpr, JSON.stringify(out), "console", log.console);
await ctx.close(); await browser.close();
