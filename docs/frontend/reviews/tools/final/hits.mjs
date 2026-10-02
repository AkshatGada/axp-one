// Is each visible link/button actually the top element at its centre? (catches invisible overlays blocking clicks)
import { launch, open, scrollTo } from "./lib.mjs";
const base = process.env.BASE || "http://localhost:3411";
const browser = await launch();
for (const [w, h, mobile] of [[1440, 900], [390, 844, true]]) {
  const { ctx, page } = await open(browser, base + "/", { w, h, mobile });
  const sh = await page.evaluate(() => document.documentElement.scrollHeight);
  const blocked = new Map();
  for (let y = 0; y < sh; y += Math.round(h * 0.5)) {
    await scrollTo(page, y, 300);
    const r = await page.evaluate(() => [...document.querySelectorAll("a,button,summary")].map((a) => { const b = a.getBoundingClientRect(); if (b.width < 2 || b.top < 60 || b.bottom > innerHeight - 4) return null; const cs = getComputedStyle(a); if (cs.visibility === "hidden" || +cs.opacity === 0) return null; const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return el && !a.contains(el) && !el.contains(a) ? [a.textContent.trim().slice(0, 30), el.tagName + "." + String(el.className).slice(0, 40)] : null; }).filter(Boolean));
    for (const [t, by] of r) blocked.set(t, `${by} @y=${y}`);
  }
  console.log(w, base, JSON.stringify([...blocked]));
  await ctx.close();
}
await browser.close();
