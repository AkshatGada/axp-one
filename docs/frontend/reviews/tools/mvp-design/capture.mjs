// Design critic capture for the axp.one MVP (read-only; localhost only).
// node capture.mjs bench|shots|mobile|present|keys|verify
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/");
const { chromium } = require("playwright-core");
const BASE = "http://localhost:3420";
const SHOTS = "/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/mvp-v2";
const OUT = "/Users/akshat/agentic-dsp/docs/frontend/reviews/tools/mvp-design/out";
const mode = process.argv[2] || "bench";
const INIT = `window.__perf={lcp:0,lcpEl:'',cls:0,shifts:[]};try{new PerformanceObserver(l=>{for(const e of l.getEntries()){window.__perf.lcp=e.startTime;window.__perf.lcpEl=e.element?(e.element.tagName+' '+(e.element.textContent||'').slice(0,50)):''}}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries()){if(!e.hadRecentInput){window.__perf.cls+=e.value;window.__perf.shifts.push({v:e.value,src:(e.sources||[]).map(s=>s.node?(s.node.nodeName+'.'+(s.node.className||'')):'').join('|')})}}}).observe({type:'layout-shift',buffered:true})}catch(e){}`;
const ROUTES = ["/", "/opportunity/1/", "/opportunity/2/", "/opportunity/3/", "/opportunity/4/", "/opportunity/1/?all=1", "/advertisers/", "/advertisers/clearvault/", "/advertisers/keyforge/", "/advertisers/leatherguard/", "/publisher/", "/settlement/", "/evidence/", "/verify/", "/try/", "/present/", "/design/"];
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
async function open(path, { w = 1440, h = 900, mobile = false, reduced = false, wait = 1200 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, reducedMotion: reduced ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  const log = { console: [], failed: [], offOrigin: [] };
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") log.console.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
  page.on("pageerror", (e) => log.console.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) => log.failed.push(`${r.url()} ${r.failure()?.errorText}`));
  page.on("response", (r) => { if (r.status() >= 400) log.failed.push(`${r.status()} ${r.url()}`); });
  await page.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (!["localhost", "127.0.0.1"].includes(u.hostname) && !["data:", "blob:"].includes(u.protocol)) { log.offOrigin.push(u.href); return route.abort(); }
    return route.continue();
  });
  await page.addInitScript(INIT);
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(wait);
  return { ctx, page, log };
}
const shot = (page, name, full = false) => page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: full });

if (mode === "bench") {
  const res = [];
  for (const r of ROUTES) {
    const { ctx, page, log } = await open(r, { wait: r.startsWith("/verify") ? 4000 : 1500 });
    const info = await page.evaluate(() => ({
      perf: window.__perf,
      fonts: [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family + " " + f.weight),
      fontsFailed: [...document.fonts].filter((f) => f.status === "error").map((f) => f.family),
      bodyFont: getComputedStyle(document.body).fontFamily.slice(0, 60),
      H: document.documentElement.scrollHeight,
      title: document.title,
      monoCount: [...document.querySelectorAll("*")].filter((e) => e.children.length === 0 && /mono/i.test(getComputedStyle(e).fontFamily) && e.textContent.trim()).length,
      smallText: [...document.querySelectorAll("body *")].filter((e) => e.children.length === 0 && e.textContent.trim() && e.offsetParent && parseFloat(getComputedStyle(e).fontSize) < 12).map((e) => parseFloat(getComputedStyle(e).fontSize) + ":" + e.textContent.trim().slice(0, 30)).slice(0, 8),
      dashes: (document.body.innerText.match(/[–—]/g) || []).length,
      middots: (document.body.innerText.match(/·/g) || []).length,
    }));
    res.push({ route: r, ...log, ...info });
    await ctx.close();
  }
  // 390 overflow
  for (const r of ROUTES) {
    const { ctx, page, log } = await open(r, { w: 390, h: 844, mobile: true, wait: 900 });
    const ov = await page.evaluate(() => {
      const W = document.documentElement.clientWidth;
      const off = [...document.querySelectorAll("body *")].filter((e) => { const b = e.getBoundingClientRect(); return b.right > W + 1 && b.width > 0 && getComputedStyle(e).position !== "fixed"; });
      // exclude elements inside a horizontally scrollable ancestor
      const real = off.filter((e) => { let p = e.parentElement; while (p && p !== document.body) { const s = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return false; p = p.parentElement; } return true; });
      return { sw: document.documentElement.scrollWidth, cw: W, offenders: real.slice(0, 5).map((e) => e.tagName + "." + String(e.className).slice(0, 40) + " r=" + Math.round(e.getBoundingClientRect().right)) };
    });
    res.find((x) => x.route === r).m390 = { ...ov, console: log.console };
    await ctx.close();
  }
  fs.writeFileSync(`${OUT}/bench.json`, JSON.stringify(res, null, 2));
  for (const x of res) console.log(x.route, "| console", x.console.length, "| failed", x.failed.length, "| off", x.offOrigin.length, "| lcp", Math.round(x.perf.lcp), "| cls", x.perf.cls.toFixed(4), "| fontsFail", x.fontsFailed.length, "| mono", x.monoCount, "| dashes", x.dashes, "| middot", x.middots, "| 390 sw", x.m390.sw, x.m390.offenders.join(";"), "| m.console", x.m390.console.length);
  for (const x of res) if (x.console.length || x.failed.length) console.log(x.route, x.console, x.failed);
  console.log("fonts sample", res[0].fonts.slice(0, 12), res[0].bodyFont);
  console.log("small text", res.map((x) => [x.route, x.smallText]).filter((x) => x[1].length));
}

if (mode === "shots") {
  const s = async (path, name, opts = {}, full = false, pre) => { const { ctx, page } = await open(path, opts); if (pre) await pre(page); await shot(page, name, full); await ctx.close(); };
  await s("/", "01-overview-1440");
  await s("/", "02-overview-1920", { w: 1920, h: 1080 });
  await s("/", "02b-overview-full-1440", {}, true);
  const stages = ["moment", "eligibility", "evidence", "decisions", "auction", "award", "delivery", "receipt", "charge"];
  for (let i = 0; i < stages.length; i++) await s(`/opportunity/1/#${stages[i]}`, `opp1-${i + 1}-${stages[i]}-1440`, {}, false);
  await s("/opportunity/1/#decisions", "opp1-4-decisions-1920", { w: 1920, h: 1080 });
  await s("/opportunity/3/#decisions", "opp3-decisions-1440");
  await s("/opportunity/4/", "opp4-1440");
  await s("/opportunity/1/?all=1", "opp1-all-full", {}, true);
  for (const r of ["advertisers", "advertisers/clearvault", "advertisers/leatherguard", "publisher", "settlement", "evidence", "verify", "try", "design"]) {
    const n = r.replace("/", "-");
    await s(`/${r}/`, `r-${n}-1440-full`, { wait: r === "verify" ? 4000 : 1200 }, true);
  }
  await s("/settlement/", "r-settlement-1920", { w: 1920, h: 1080 });
}

if (mode === "fold") {
  // above-the-fold at 1440 for routes (not full page) to judge first impression
  for (const r of ["advertisers", "advertisers/clearvault", "publisher", "settlement", "evidence", "verify", "try"]) {
    const { ctx, page } = await open(`/${r}/`, { wait: r === "verify" ? 4000 : 1200 });
    await shot(page, `f-${r.replace("/", "-")}-1440`); await ctx.close();
  }
}

if (mode === "present") {
  for (const [w, h] of [[1920, 1080], [1440, 900]]) {
    for (const n of [1, 4, 6, 9, 2, 3, 5, 7, 8, 10]) {
      const { ctx, page, log } = await open(`/present/#${n}`, { w, h, wait: 900 });
      for (let i = 0; i < 3; i++) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(500); if (await page.evaluate((n) => location.hash !== "#" + n, n)) { await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(500); break; } }
      const info = await page.evaluate(() => ({ hash: location.hash, cap: document.querySelector(".pr-caption, [class*=caption]")?.innerText?.slice(0, 300), frame: (() => { const f = document.querySelector(".lg-present-frame"); const v = document.querySelector(".pr-view"); return { f: f && f.getBoundingClientRect().toJSON(), v: v && v.getBoundingClientRect().toJSON(), vs: v && { sh: v.scrollHeight, ch: v.clientHeight } }; })() }));
      console.log(w, n, JSON.stringify(info), log.console.length ? log.console : "");
      if (w === 1920 || [1, 6].includes(n)) await shot(page, `present-${String(n).padStart(2, "0")}-${w}`);
      await ctx.close();
    }
  }
}

if (mode === "auto") {
  const { ctx, page, log } = await open(`/present/?auto=1`, { w: 1920, h: 1080, wait: 200 });
  const t0 = Date.now(); const seen = [];
  let last = "";
  while (Date.now() - t0 < 255000) { const h = await page.evaluate(() => location.hash); if (h !== last) { seen.push([h, Math.round((Date.now() - t0) / 1000)]); last = h; } await page.waitForTimeout(1000); }
  console.log(JSON.stringify(seen), log.console);
  await ctx.close();
}

if (mode === "keys") {
  const { ctx, page, log } = await open(`/opportunity/1/`, {});
  const out = [];
  for (let i = 0; i < 10; i++) { await page.keyboard.press("j"); await page.waitForTimeout(250); out.push(await page.evaluate(() => location.hash)); }
  for (let i = 0; i < 3; i++) { await page.keyboard.press("k"); await page.waitForTimeout(250); out.push(await page.evaluate(() => location.hash)); }
  // tab focus visibility
  await page.goto(BASE + "/"); await page.waitForTimeout(800);
  const foc = [];
  for (let i = 0; i < 12; i++) { await page.keyboard.press("Tab"); foc.push(await page.evaluate(() => { const a = document.activeElement; const s = getComputedStyle(a); return a.tagName + ":" + (a.innerText || a.getAttribute("aria-label") || "").slice(0, 25).replace(/\n/g, " ") + " ring=" + (s.outlineStyle !== "none" ? s.outlineWidth + " " + s.outlineColor : s.boxShadow.slice(0, 30)); })); }
  await page.keyboard.press("Tab"); await shot(page, "zz-focus-ring");
  // inspector key I
  await page.goto(BASE + "/opportunity/1/#auction"); await page.waitForTimeout(900);
  await page.keyboard.press("i"); await page.waitForTimeout(600);
  const insp = await page.evaluate(() => !!document.querySelector("[role=dialog], .ld-drawer, [class*=inspector][data-open], [class*=drawer]"));
  await shot(page, "opp1-inspector-1440");
  console.log(out, foc, "inspector", insp, log.console);
  await ctx.close();
}

if (mode === "verify") {
  const { ctx, page, log } = await open(`/verify/`, { wait: 6000 });
  const t = await page.evaluate(() => document.body.innerText);
  const m = t.match(/(\d+)\s*(?:of|\/)\s*(\d+)/g);
  console.log(m?.slice(0, 10), log.console);
  fs.writeFileSync(`${OUT}/verify.txt`, t);
  await ctx.close();
}

if (mode === "mobile") {
  for (const r of ["/", "/opportunity/1/#decisions", "/settlement/", "/verify/", "/present/#6"]) {
    const { ctx, page } = await open(r, { w: 390, h: 844, mobile: true, wait: r.startsWith("/verify") ? 4000 : 1000 });
    await shot(page, `m390-${r.replace(/[\/#?=]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "overview"}`, r === "/" || r.startsWith("/opp"));
    await ctx.close();
  }
}
await browser.close();
