// Closing + footer at each desktop size: screenshots near the end and link contrast against the pixels behind them.
import { launch, open, scrollTo, SCRATCH } from "./lib.mjs";
const BASE = process.env.BASE || "http://localhost:3410";
const browser = await launch();
for (const [w, h] of [[1280, 800], [1440, 900], [1920, 1080]]) {
  const { ctx, page } = await open(browser, BASE + "/", { w, h, wait: 1200 });
  const sh = await page.evaluate(() => document.documentElement.scrollHeight);
  const top = await page.evaluate(() => { const el = [...document.querySelectorAll("[data-world]")].at(-2); return el.getBoundingClientRect().top + scrollY; });
  for (const [name, y] of [["closing-centred", top - 0], ["end", sh]]) {
    const got = await scrollTo(page, y, 900);
    await page.screenshot({ path: `${SCRATCH}/close-${w}-${name}.png` });
    // sample pixels under each closing link/button: take screenshot clip and average background around the text box
    const links = await page.evaluate(() => [...document.querySelectorAll("main a")].filter((a) => { const r = a.getBoundingClientRect(); return r.top > 0 && r.bottom < innerHeight && r.width > 0; }).map((a) => { const r = a.getBoundingClientRect(); const cs = getComputedStyle(a); return { t: a.textContent.trim().slice(0, 30), x: r.x, y: r.y, w: r.width, h: r.height, color: cs.color }; }));
    const buf = await page.screenshot();
    const { PNG } = await import("/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/pngjs/lib/png.js").catch(() => ({}));
    console.log(w, name, "y", got, JSON.stringify(links.map((l) => [l.t, Math.round(l.x), Math.round(l.y), l.color])));
  }
  await ctx.close();
}
await browser.close();
