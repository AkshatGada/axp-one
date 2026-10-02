// First-load JS (gzip, computed), LCP and CLS without scrolling, on a static export. node perf.mjs <base> <path...>
import zlib from "node:zlib";
import { launch, open } from "./lib.mjs";
const [base, ...paths] = process.argv.slice(2);
const browser = await launch();
for (const path of paths) for (const [w, h, mobile, cpu] of [[1440, 900, false, 1], [390, 844, true, 4]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  const js = new Map(); const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 120)); });
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("response", async (r) => { if (/\.js(\?|$)/.test(r.url())) { try { const b = await r.body(); js.set(r.url(), zlib.gzipSync(b).length); } catch {} } });
  const cdp = await ctx.newCDPSession(page);
  if (cpu > 1) { await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu }); await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8 * 1024 / 1000 * 1000, uploadThroughput: 750e3 / 8 }); }
  await page.addInitScript(`window.__p={lcp:0,el:'',cls:0};new PerformanceObserver(l=>{for(const e of l.getEntries()){__p.lcp=e.startTime;__p.el=e.element?e.element.tagName+' '+(e.element.textContent||'').slice(0,30):''}}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)__p.cls+=e.value}).observe({type:'layout-shift',buffered:true});`);
  const t0 = Date.now();
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const p = await page.evaluate(() => window.__p);
  const total = [...js.values()].reduce((a, b) => a + b, 0);
  console.log(`${path} ${w}${cpu > 1 ? " (4x CPU, slow 4G)" : ""}: firstLoadJS ${(total / 1024).toFixed(1)} KB gz (${js.size} files), LCP ${Math.round(p.lcp)} ms [${p.el}], CLS ${p.cls.toFixed(4)}, load ${Date.now() - t0} ms, errors ${errs.length}`);
  await ctx.close();
}
await browser.close();
