// MVP final review (read-only). BASE=http://127.0.0.1:3421 node mvp.mjs bench|shots|verify|present|live
import fs from "node:fs";
import zlib from "node:zlib";
import { launch, open, scrollTo, sheet, SHOTS, OUT, SCRATCH } from "./lib.mjs";
const BASE = (process.env.BASE || "http://127.0.0.1:3421") + (process.env.PREFIX || "");
const mode = process.argv[2] || "bench";
const browser = await launch();
const ROUTES = ["/", "/opportunity/1/", "/opportunity/2/", "/opportunity/3/", "/opportunity/4/", "/advertisers/", "/advertisers/clearvault/", "/advertisers/leatherguard/", "/publisher/", "/settlement/", "/evidence/", "/verify/", "/try/", "/live/", "/live/run/", "/present/", "/first-recording/", "/first-recording/settlement/", "/first-recording/verify/"];

if (mode === "bench") {
  const res = [];
  for (const r of ROUTES) for (const [w, h, mobile] of [[1440, 900], [1280, 800], [390, 844, true]]) {
    const { ctx, page, log } = await open(browser, BASE + r, { w, h, mobile, wait: r.includes("verify") ? 5000 : 1500 });
    const info = await page.evaluate(() => ({
      cls: window.__perf.cls, lcp: Math.round(window.__perf.lcp), sh: document.documentElement.scrollHeight,
      over: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      dashes: (document.body.innerText.match(/[–—]/g) || []).length,
      fontsFailed: [...document.fonts].filter((f) => f.status === "error").length,
      small: [...document.querySelectorAll("body *")].filter((e) => e.children.length === 0 && e.textContent.trim() && e.offsetParent && parseFloat(getComputedStyle(e).fontSize) < 11.5).length,
      title: document.title,
    }));
    const gz = log.jsFiles.length; // count only
    res.push({ r, w, ...info, console: log.console, failed: log.failed, off: log.offOrigin });
    await ctx.close();
  }
  fs.writeFileSync(`${OUT}/mvp-bench.json`, JSON.stringify(res, null, 1));
  const bad = res.filter((x) => x.console.length || x.failed.length || x.off.length || x.over || x.cls >= 0.02 || x.dashes);
  console.log("combos", res.length, "bad", bad.length, "maxCLS", Math.max(...res.map((x) => x.cls)).toFixed(4), "maxLCP", Math.max(...res.map((x) => x.lcp)));
  for (const b of bad) console.log(JSON.stringify(b).slice(0, 400));
  console.log(res.filter((x) => x.w === 1440).map((x) => `${x.r} ${(x.sh / 900).toFixed(1)}scr small${x.small} "${x.title}"`).join("\n"));
}

if (mode === "shots") {
  const list = JSON.parse(process.env.LIST || "[]");
  for (const [name, path, w, h, full, wait, mobile] of list) {
    const { ctx, page } = await open(browser, BASE + path, { w, h, mobile: !!mobile, wait: wait || 1500 });
    await page.screenshot({ path: `${process.env.DIR || SCRATCH}/${name}.png`, fullPage: !!full });
    await ctx.close();
  }
}
await browser.close();
