import { createRequire } from "node:module";
const require = createRequire("/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/");
const { chromium } = require("playwright-core");
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
await p.goto(""+(process.env.BASE||"http://localhost:3410/")+"", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
const r = await p.evaluate(() => {
  const parse = (c) => { const m = c.match(/[\d.]+/g); return m ? m.map(Number) : [0,0,0,0]; };
  const lum = ([r,g,b]) => { const f = (v) => { v/=255; return v <= .03928 ? v/12.92 : ((v+.055)/1.055)**2.4; }; return .2126*f(r)+.7152*f(g)+.0722*f(b); };
  const bgOf = (el) => { let e = el; while (e) { const c = parse(getComputedStyle(e).backgroundColor); if (c.length < 4 ? true : c[3] > 0.9) { if (getComputedStyle(e).backgroundColor !== "rgba(0, 0, 0, 0)") return c; } e = e.parentElement; } return [242,241,236]; };
  const low = []; const seen = new Set();
  for (const el of document.querySelectorAll("main *, footer *, header *")) {
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el); if (cs.visibility === "hidden") continue;
    let op = 1, e = el; while (e) { op *= +getComputedStyle(e).opacity; e = e.parentElement; }
    if (op < 0.95) continue;
    const fg = parse(cs.color); const bg = bgOf(el);
    const a = fg[3] ?? 1; const mix = fg.slice(0,3).map((v,i) => v*a + bg[i]*(1-a));
    const L1 = lum(mix), L2 = lum(bg); const cr = (Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);
    const fs = parseFloat(cs.fontSize); const big = fs >= 24 || (fs >= 18.66 && +cs.fontWeight >= 700);
    if (cr < (big ? 3 : 4.5)) { const k = el.className + cr.toFixed(1); if (!seen.has(k)) { seen.add(k); low.push(`${cr.toFixed(2)} ${fs}px ${el.tagName}.${String(el.className).slice(0,30)} "${el.textContent.trim().slice(0,40)}"`); } }
  }
  const noAlt = [...document.querySelectorAll("img")].filter(i => !i.hasAttribute("alt")).length;
  const imgs = document.querySelectorAll("img").length;
  const noName = [...document.querySelectorAll("a,button")].filter(a => !(a.getAttribute("aria-label") || a.textContent.trim())).map(a => a.outerHTML.slice(0,80));
  const hs = [...document.querySelectorAll("h1,h2,h3,h4")].map(h => +h.tagName[1]);
  let skips = 0; for (let i = 1; i < hs.length; i++) if (hs[i] - hs[i-1] > 1) skips++;
  const ext = [...document.querySelectorAll("a[href^='http']")].map(a => `${a.getAttribute("href")} ${a.target} ${a.rel}`);
  const ch = ext.filter(x => x.includes("contexthint.com")).length;
  return { low: low.slice(0, 30), lowCount: low.length, imgs, noAlt, noName, h1: hs.filter(h=>h===1).length, skips, ext, ch, lang: document.documentElement.lang, title: document.title };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
