import { launch, open, scrollTo, SCRATCH } from "./lib.mjs";
const browser = await launch();
const { ctx, page } = await open(browser, "http://localhost:3411/", { w: 1440, h: 900, dpr: 3 });
for (const id of ["data", "jev", "solana"]) {
  await page.evaluate((id) => document.getElementById(id).scrollIntoView(), id); await page.waitForTimeout(900);
  const b = await page.evaluate((id) => { const i = [...document.querySelectorAll(`#${id} i`)].find((x) => /^\d$/.test(x.textContent.trim())); const r = i.parentElement.getBoundingClientRect(); return { x: r.x - 4, y: r.y - 4, width: r.width + 8, height: r.height + 8 }; }, id);
  await page.screenshot({ path: `${SCRATCH}/chip-${id}.png`, clip: b });
}
await ctx.close(); await browser.close();
