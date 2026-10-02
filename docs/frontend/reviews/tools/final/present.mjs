// Present: step through beats with ArrowRight at a size, capture each beat, measure frame fit; optional autoplay timing.
import { launch, open, sheet, SCRATCH } from "./lib.mjs";
const BASE = process.env.BASE || "http://127.0.0.1:3421";
const [w, h] = [+process.argv[2] || 1440, +process.argv[3] || 900];
const auto = process.argv[4] === "auto";
const browser = await launch();
const { ctx, page, log } = await open(browser, BASE + "/present/", { w, h, wait: 2000 });
if (auto) {
  // autoplay: sample the beat label every 2 s for 270 s
  const seen = []; let last = "";
  const t0 = Date.now();
  await page.keyboard.press("Space").catch(() => {});
  while (Date.now() - t0 < 270000) {
    const b = await page.evaluate(() => (document.querySelector("[data-beat],[aria-current='step'],.pr-beat") || document.body).getAttribute?.("data-beat") || document.title + "|" + (document.querySelector("[class*=timer],[class*=clock]")?.textContent || ""));
    if (b !== last) { seen.push([Math.round((Date.now() - t0) / 1000), b]); last = b; }
    await page.waitForTimeout(2000);
  }
  console.log(JSON.stringify(seen)); console.log(log.console);
} else {
  const files = [], labels = [];
  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(3600);
    const f = `${SCRATCH}/pr-${w}-${String(i).padStart(2, "0")}.png`; await page.screenshot({ path: f }); files.push(f);
    const info = await page.evaluate(() => { const fr = document.querySelector("[class*=frame]"); const r = fr?.getBoundingClientRect(); return { beat: document.querySelector("[data-beat]")?.getAttribute("data-beat") || "", fr: r ? [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] : null, over: document.documentElement.scrollWidth > innerWidth }; });
    labels.push(`${i} ${JSON.stringify(info)}`);
    await page.keyboard.press("ArrowRight");
  }
  await sheet(browser, files, `${SCRATCH}/pr-${w}-sheet.png`, { cols: 4, tw: 460, labels });
  console.log(labels.join("\n"), log.console);
}
await ctx.close(); await browser.close();
