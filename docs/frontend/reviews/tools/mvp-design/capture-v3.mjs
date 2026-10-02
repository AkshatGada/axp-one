// Design critic capture for the axp.one MVP, round 3 (read-only; localhost only).
// BASE=http://127.0.0.1:3421 node capture-v3.mjs bench|shots|present|auto [w h]|keys|verify|mobile
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/");
const { chromium } = require("playwright-core");
const BASE = process.env.BASE || "http://localhost:3420";
const SHOTS = "/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/mvp-v3";
const OUT = "/Users/akshat/agentic-dsp/docs/frontend/reviews/tools/mvp-design/out/v3";
fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });
const mode = process.argv[2] || "bench";
const INIT = `window.__perf={lcp:0,lcpEl:'',cls:0,shifts:[]};try{new PerformanceObserver(l=>{for(const e of l.getEntries()){window.__perf.lcp=e.startTime;window.__perf.lcpEl=e.element?(e.element.tagName+' '+(e.element.textContent||'').slice(0,50)):''}}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries()){if(!e.hadRecentInput){window.__perf.cls+=e.value;window.__perf.shifts.push({t:Math.round(e.startTime),v:+e.value.toFixed(4),src:(e.sources||[]).map(s=>s.node?(s.node.nodeName+'.'+String(s.node.className||'').slice(0,40)):'').join('|')})}}}).observe({type:'layout-shift',buffered:true})}catch(e){}`;
const ROUTES = ["/", "/opportunity/1/", "/opportunity/2/", "/opportunity/3/", "/opportunity/4/", "/opportunity/1/?all=1", "/advertisers/", "/advertisers/clearvault/", "/advertisers/keyforge/", "/advertisers/leatherguard/", "/publisher/", "/settlement/", "/evidence/", "/verify/", "/try/", "/present/", "/design/"];
const LOCAL = ["localhost", "127.0.0.1"];
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
async function open(path, { w = 1440, h = 900, mobile = false, wait = 1200 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  const log = { console: [], failed: [], offOrigin: [], bytes: 0, js: 0 };
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") log.console.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
  page.on("pageerror", (e) => log.console.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) => log.failed.push(`${r.url()} ${r.failure()?.errorText}`));
  page.on("response", async (r) => {
    if (r.status() >= 400) log.failed.push(`${r.status()} ${r.url()}`);
    try { const b = await r.body(); log.bytes += b.length; if (/\.js(\?|$)/.test(r.url())) log.js += b.length; } catch {}
  });
  await page.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (!LOCAL.includes(u.hostname) && !["data:", "blob:"].includes(u.protocol)) { log.offOrigin.push(u.href); return route.abort(); }
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
    const { ctx, page, log } = await open(r, { wait: r.startsWith("/verify") ? 5000 : 2000 });
    const info = await page.evaluate(() => ({
      perf: window.__perf,
      fonts: [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family + " " + f.weight),
      fontsFailed: [...document.fonts].filter((f) => f.status === "error").map((f) => f.family),
      bodyFont: getComputedStyle(document.body).fontFamily.slice(0, 80),
      sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
      title: document.title,
      skip: !!document.querySelector("a[href='#main'], a[href='#content'], .skip-link, [class*=skip]"),
      monoProse: [...document.querySelectorAll("body *")].filter((e) => e.children.length === 0 && e.offsetParent && /mono/i.test(getComputedStyle(e).fontFamily) && /[a-z]{4,} [a-z]{3,} [a-z]{3,}/i.test(e.textContent)).map((e) => e.textContent.trim().slice(0, 50)).slice(0, 6),
      smallText: [...document.querySelectorAll("body *")].filter((e) => e.children.length === 0 && e.textContent.trim() && e.offsetParent && parseFloat(getComputedStyle(e).fontSize) < 12).map((e) => parseFloat(getComputedStyle(e).fontSize) + ":" + e.textContent.trim().slice(0, 30)).slice(0, 8),
      dashes: (document.body.innerText.match(/[–—]/g) || []).length,
      middots: (document.body.innerText.match(/·/g) || []).length,
      leaks: (document.body.innerText.match(/Tier loo|Source: aws|verseodin|\b[a-z]+_[a-z_]+\b/g) || []).slice(0, 8),
    }));
    res.push({ route: r, ...log, ...info });
    await ctx.close();
  }
  for (const r of ROUTES) {
    for (const [w, h, mobile] of [[390, 844, true], [1280, 800, false]]) {
      const { ctx, page, log } = await open(r, { w, h, mobile, wait: 900 });
      const ov = await page.evaluate(() => {
        const W = document.documentElement.clientWidth;
        const off = [...document.querySelectorAll("body *")].filter((e) => { const b = e.getBoundingClientRect(); return b.right > W + 1 && b.width > 0 && getComputedStyle(e).position !== "fixed"; });
        const real = off.filter((e) => { let p = e.parentElement; while (p && p !== document.body) { const s = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return false; p = p.parentElement; } return true; });
        return { sw: document.documentElement.scrollWidth, cw: W, offenders: real.slice(0, 5).map((e) => e.tagName + "." + String(e.className).slice(0, 40) + " r=" + Math.round(e.getBoundingClientRect().right)) };
      });
      res.find((x) => x.route === r)["v" + w] = { ...ov, console: log.console, cls: await page.evaluate(() => +window.__perf.cls.toFixed(4)) };
      await ctx.close();
    }
  }
  fs.writeFileSync(`${OUT}/bench.json`, JSON.stringify(res, null, 2));
  for (const x of res) console.log(x.route, "| con", x.console.length, "| fail", x.failed.length, "| off", x.offOrigin.length, "| lcp", Math.round(x.perf.lcp), "| cls", x.perf.cls.toFixed(4), "| KB", Math.round(x.bytes / 1024), "js", Math.round(x.js / 1024), "| fF", x.fontsFailed.length, "| dash", x.dashes, "| mid", x.middots, "| 390", x.v390.sw, x.v390.offenders.join(";"), "cls", x.v390.cls, "| 1280", x.v1280.sw, x.v1280.offenders.join(";"), "cls", x.v1280.cls, "| leaks", x.leaks.join(","));
  for (const x of res) if (x.console.length || x.failed.length || x.offOrigin.length) console.log("ERR", x.route, x.console, x.failed, x.offOrigin);
  for (const x of res) if (x.perf.cls > 0.005) console.log("SHIFT", x.route, JSON.stringify(x.perf.shifts));
  console.log("fonts", [...new Set(res.flatMap((x) => x.fonts))], res[0].bodyFont, "skip link:", res[0].skip);
  console.log("small text", JSON.stringify(res.map((x) => [x.route, x.smallText]).filter((x) => x[1].length)));
  console.log("mono prose", JSON.stringify(res.map((x) => [x.route, x.monoProse]).filter((x) => x[1].length)));
}

if (mode === "shots") {
  const s = async (path, name, opts = {}, full = false, pre) => { const { ctx, page } = await open(path, opts); if (pre) await pre(page); await shot(page, name, full); await ctx.close(); };
  await s("/", "01-overview-1280", { w: 1280, h: 800 });
  await s("/", "02-overview-1440-full", {}, true);
  await s("/opportunity/1/", "03-opp1-moment-1440");
  await s("/opportunity/1/#decisions", "04-opp1-decisions-1440");
  await s("/opportunity/1/#auction", "05-opp1-auction-1440");
  await s("/opportunity/1/#award", "06-opp1-award-1440");
  await s("/opportunity/1/#receipt", "07-opp1-receipt-1440");
  await s("/opportunity/3/#auction", "08-opp3-auction-1440");
  await s("/opportunity/4/", "09-opp4-nofill-1440");
  await s("/opportunity/1/#evidence", "10-opp1-evidence-1280", { w: 1280, h: 800 });
  await s("/settlement/", "11-settlement-1440-full", {}, true);
  await s("/verify/", "12-verify-1440", { wait: 5000 });
  await s("/advertisers/leatherguard/", "13-leatherguard-1440-full", {}, true);
  await s("/evidence/", "14-evidence-1440");
  await s("/try/", "15-try-1440");
}

if (mode === "present") {
  const report = [];
  const SHOT = { "1280x800": [1, 6], "1440x900": [1, 5, 7, 10], "1920x1080": [2, 3, 4, 8, 9], "2560x1440": [6] };
  for (const [w, h] of [[1280, 800], [1440, 900], [1920, 1080], [2560, 1440]]) {
    for (let n = 1; n <= 10; n++) {
      const { ctx, page, log } = await open(`/present/#${n}`, { w, h, wait: 900 });
      const steps = await page.evaluate(() => 3);
      // advance to the final step of the beat without leaving it
      for (let i = 0; i < steps; i++) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(450); if (await page.evaluate((n) => location.hash !== "#" + n, n)) { await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(500); break; } }
      await page.waitForTimeout(500);
      const info = await page.evaluate(() => {
        const R = (el) => el && el.getBoundingClientRect();
        const f = R(document.querySelector(".lg-present-frame"));
        const view = document.querySelector(".pr-view");
        const fit = document.querySelector(".pr-fit");
        const v = R(view), ft = R(fit);
        const cs = getComputedStyle(view);
        const k = v.height / view.offsetHeight;
        const padT = parseFloat(cs.paddingTop) * k, padB = parseFloat(cs.paddingBottom) * k;
        const avail = v.height - padT - padB;
        // clipped descendants (visible ones extending past the view box)
        const clipped = [...fit.querySelectorAll("*")].filter((e) => { const b = e.getBoundingClientRect(); return b.height > 0 && (b.bottom > v.bottom + 1 || b.right > v.right + 1) && getComputedStyle(e).visibility !== "hidden"; }).slice(0, 3).map((e) => e.className && String(e.className).slice(0, 30));
        const cap = document.querySelector(".lg-present-caption");
        return {
          hash: location.hash,
          frame: [Math.round(f.left), Math.round(f.top), Math.round(f.right), Math.round(f.bottom)],
          inside: f.left >= -1 && f.top >= -1 && f.right <= innerWidth + 1 && f.bottom <= innerHeight + 1,
          centred: Math.abs(f.left - (innerWidth - f.right)) < 2 && Math.abs(f.top - (innerHeight - f.bottom)) < 2,
          scale: +(f.width / 1920).toFixed(3),
          zoom: fit.style.zoom,
          fill: +(ft.height / avail).toFixed(2),
          topGap: Math.round((ft.top - v.top - padT) / k), botGap: Math.round((v.bottom - padB - ft.bottom) / k),
          clipped,
          capPx: +(parseFloat(getComputedStyle(cap).fontSize) * k).toFixed(1),
          capText: cap.innerText.slice(0, 160),
        };
      });
      report.push({ w, h, n, ...info, console: log.console });
      console.log(`${w}x${h} #${n} frame=${info.frame} inside=${info.inside} centred=${info.centred} s=${info.scale} zoom=${info.zoom} fill=${info.fill} gaps=${info.topGap}/${info.botGap} cap=${info.capPx}px clipped=${info.clipped.join(",")} ${log.console.length ? log.console : ""}`);
      if ((SHOT[`${w}x${h}`] || []).includes(n)) await shot(page, `p${String(n).padStart(2, "0")}-${w}`);
      await ctx.close();
    }
  }
  // phone
  const { ctx, page, log } = await open(`/present/#6`, { w: 390, h: 844, mobile: true, wait: 900 });
  await shot(page, "p-390");
  console.log("390", await page.evaluate(() => document.body.innerText.slice(0, 200)), log.console);
  await ctx.close();
  fs.writeFileSync(`${OUT}/present.json`, JSON.stringify(report, null, 2));
}

if (mode === "auto") {
  const w = Number(process.argv[3] || 1920), h = Number(process.argv[4] || 1080);
  const { ctx, page, log } = await open(`/present/?auto=1`, { w, h, wait: 100 });
  const t0 = Date.now(); const seen = [];
  let last = "";
  while (Date.now() - t0 < 262000) {
    const st = await page.evaluate(() => { const f = document.querySelector(".lg-present-frame").getBoundingClientRect(); return { h: location.hash, t: document.querySelector(".pr-time")?.innerText, ok: f.left >= -1 && f.top >= -1 && f.right <= innerWidth + 1 && f.bottom <= innerHeight + 1 }; });
    if (st.h !== last) { seen.push([st.h, +((Date.now() - t0) / 1000).toFixed(1), st.ok]); last = st.h; }
    await page.waitForTimeout(250);
  }
  const end = await page.evaluate(() => document.querySelector(".pr-time")?.innerText);
  const out = `${w}x${h} ${JSON.stringify(seen)} end="${end}" console=${JSON.stringify(log.console)}`;
  console.log(out);
  fs.writeFileSync(`${OUT}/auto-${w}.txt`, out);
  await ctx.close();
}

if (mode === "keys") {
  const { ctx, page, log } = await open(`/opportunity/1/`, {});
  const out = [];
  for (let i = 0; i < 10; i++) { await page.keyboard.press("j"); await page.waitForTimeout(250); out.push(await page.evaluate(() => location.hash)); }
  for (let i = 0; i < 3; i++) { await page.keyboard.press("k"); await page.waitForTimeout(250); out.push(await page.evaluate(() => location.hash)); }
  console.log("J/K", out.join(" "));
  // stepper state at stage 1: are later stages shown as upcoming?
  await page.goto(BASE + "/opportunity/1/#moment"); await page.waitForTimeout(900);
  console.log("stepper@1", await page.evaluate(() => [...document.querySelectorAll("[class*=pipe] li, [class*=pipe] button, [class*=stepper] button, [class*=step] a")].slice(0, 10).map((e) => (e.getAttribute("data-state") || e.getAttribute("data-status") || "") + ":" + e.innerText.replace(/\n/g, " ").slice(0, 30))));
  // tab focus
  await page.goto(BASE + "/"); await page.waitForTimeout(800);
  const foc = [];
  for (let i = 0; i < 6; i++) { await page.keyboard.press("Tab"); foc.push(await page.evaluate(() => { const a = document.activeElement; const s = getComputedStyle(a); return a.tagName + ":" + (a.innerText || a.getAttribute("aria-label") || "").slice(0, 25).replace(/\n/g, " ") + " ring=" + (s.outlineStyle !== "none" ? s.outlineWidth + " " + s.outlineColor : s.boxShadow.slice(0, 30)); })); }
  console.log("Tab", foc);
  await shot(page, "zz-focus-ring-1440");
  // inspector key I per stage
  for (const st of ["evidence", "decisions", "auction", "receipt", "charge"]) {
    await page.goto(BASE + `/opportunity/1/#${st}`); await page.waitForTimeout(900);
    await page.keyboard.press("i"); await page.waitForTimeout(600);
    const t = await page.evaluate(() => { const d = document.querySelector("[role=dialog], .ld-drawer, .lg-drawer, [class*=inspector] aside, aside[class*=insp]"); return d ? d.innerText.replace(/\n/g, " | ").slice(0, 120) : "none"; });
    console.log("I @", st, "->", t);
    if (st === "auction") await shot(page, "16-inspector-auction-1440");
    await page.keyboard.press("Escape");
  }
  // present keys
  await page.goto(BASE + "/present/#1"); await page.waitForTimeout(900);
  const pk = [];
  for (const k of ["ArrowRight", "ArrowRight", "Shift+ArrowRight", "5", "0", "ArrowLeft", "r"]) { await page.keyboard.press(k); await page.waitForTimeout(350); pk.push(k + "=" + (await page.evaluate(() => location.hash))); }
  await page.keyboard.press("?"); await page.waitForTimeout(300);
  pk.push("help=" + (await page.evaluate(() => !!document.querySelector(".pr-help"))));
  console.log("present keys", pk.join(" "), log.console);
  await ctx.close();
}

if (mode === "verify") {
  const { ctx, page, log } = await open(`/verify/`, { wait: 200 });
  const early = await page.evaluate(() => document.body.innerText.match(/(\d+\/\d+)/)?.[0]);
  await page.waitForTimeout(6000);
  const t = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync(`${OUT}/verify.txt`, t);
  const kpi = t.match(/(\d+)\/(\d+)/);
  const groups = t.match(/\d+ of \d+/g);
  const fails = (t.match(/✕|Mismatch|failed|not checked/gi) || []).length;
  console.log("early", early, "kpi", kpi?.[0], "groups", groups, "fail-words", fails, "cls", await page.evaluate(() => JSON.stringify(window.__perf.shifts)));
  // tamper demo
  const tamper = page.getByRole("button", { name: "Tamper with one byte" });
  await tamper.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => document.querySelector(".vf2-tamper")?.innerText.replace(/\n/g, " | ").slice(0, 400));
  await tamper.click(); await page.waitForTimeout(1500);
  const after = await page.evaluate(() => ({ tampered: document.querySelector(".vf2-tamper")?.hasAttribute("data-tampered"), text: document.querySelector(".vf2-tamper")?.innerText.replace(/\n/g, " | ").slice(0, 600), danger: [...document.querySelectorAll(".vf2-tamper [data-tone=danger], .vf2-tamper .ld-tag")].map((e) => e.innerText).join(",") }));
  await page.locator(".vf2-tamper").evaluate((e) => e.closest(".ld-panel")?.scrollIntoView({ block: "center" }));
  await shot(page, "17-verify-tampered-1440");
  const kpiAfterTamper = await page.evaluate(() => document.body.innerText.match(/(\d+)\/(\d+)/)?.[0]);
  await page.getByRole("button", { name: "Reset" }).click(); await page.waitForTimeout(1500);
  const reset = await page.evaluate(() => ({ tampered: document.querySelector(".vf2-tamper")?.hasAttribute("data-tampered"), text: document.querySelector(".vf2-tamper")?.innerText.replace(/\n/g, " | ").slice(0, 300) }));
  console.log("BEFORE", before, "\nAFTER", JSON.stringify(after), "\nKPI after tamper", kpiAfterTamper, "\nRESET", JSON.stringify(reset), "\nconsole", log.console);
  await ctx.close();
}

if (mode === "mobile") {
  for (const r of ["/", "/opportunity/1/#decisions", "/settlement/", "/verify/"]) {
    const { ctx, page } = await open(r, { w: 390, h: 844, mobile: true, wait: r.startsWith("/verify") ? 4000 : 1000 });
    await shot(page, `m390-${r.replace(/[\/#?=]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "overview"}`, r === "/");
    await ctx.close();
  }
}
await browser.close();
