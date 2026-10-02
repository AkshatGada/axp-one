// Present autoplay timing: /present/?auto=1, sample the "n / 11" label + elapsed text every second.
import { launch, open } from "./lib.mjs";
const BASE = process.env.BASE || "http://127.0.0.1:3421";
const browser = await launch();
const { ctx, page, log } = await open(browser, BASE + (process.env.PREFIX || "") + "/present/?auto=1", { w: 1920, h: 1080, wait: 500 });
const t0 = Date.now(); let last = ""; const seen = [];
while (Date.now() - t0 < 275000) {
  const s = await page.evaluate(() => { const t = document.body.innerText; const m = t.match(/(\d+)\s*\/\s*11/); const e = t.match(/(\d+:\d\d), (autoplay|manual)/); return (m ? m[1] : "?") + "|" + (e ? e[2] : ""); });
  if (s !== last) { seen.push([((Date.now() - t0) / 1000).toFixed(1), s]); last = s; }
  await page.waitForTimeout(1000);
}
const end = await page.evaluate(() => (document.body.innerText.match(/(\d+:\d\d), (autoplay|manual)/) || [])[0]);
console.log(JSON.stringify(seen), end, log.console);
await ctx.close(); await browser.close();
