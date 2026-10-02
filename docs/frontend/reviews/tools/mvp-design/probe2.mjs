import { createRequire } from "node:module";
const require = createRequire("/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/");
const { chromium } = require("playwright-core");
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto("http://localhost:3420/opportunity/4/#evidence", { waitUntil: "networkidle" }); await p.waitForTimeout(1000);
await p.screenshot({ path: "/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/mvp-v2/opp4-evidence-nofill-1440.png" });
await p.goto("http://localhost:3420/opportunity/2/#evidence", { waitUntil: "networkidle" }); await p.waitForTimeout(1000);
await p.screenshot({ path: "/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/mvp-v2/opp2-evidence-1440.png" });
// verify CLS timeline
const q = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await q.addInitScript(`window.__s=[];new PerformanceObserver(l=>{for(const e of l.getEntries())window.__s.push([Math.round(e.startTime),e.value.toFixed(3),(e.sources||[]).map(s=>s.node&&s.node.className).join('|').slice(0,80)])}).observe({type:'layout-shift',buffered:true})`);
await q.goto("http://localhost:3420/verify/", { waitUntil: "networkidle" }); await q.waitForTimeout(4000);
console.log(await q.evaluate(() => window.__s));
// sidebar link dead-end check: all internal links status
const links = await p.evaluate(() => [...new Set([...document.querySelectorAll("a[href^='/']")].map(a => a.getAttribute("href")))]);
for (const l of links) { const r = await p.request.get("http://localhost:3420" + l.split("#")[0]); if (r.status() >= 400) console.log("BROKEN", l, r.status()); }
console.log("links checked", links.length);
await b.close();
