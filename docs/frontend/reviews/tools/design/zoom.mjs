import { createRequire } from "node:module";
const require = createRequire("/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/");
const { chromium } = require("playwright-core");
const [sel, prog, x, y, w, h, name, vp, scaleArg] = process.argv.slice(2);
const [vw, vh] = (vp || "1440x900").split("x").map(Number);
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const p = await (await b.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: Number(scaleArg || 2) })).newPage();
await p.goto("http://localhost:3410/", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
await p.evaluate(async ([sel, prog]) => {
  const el = document.querySelector(sel); const top = el.getBoundingClientRect().top + scrollY; const span = Math.max(0, el.offsetHeight - innerHeight);
  const [pp, off] = prog.split(",").map(Number);
  const y = top + pp * span + (off || 0);
  window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y);
  await new Promise(r => setTimeout(r, 600));
}, [sel, prog]);
await p.screenshot({ path: `out/${name}.png`, clip: { x: +x, y: +y, width: +w, height: +h } });
await b.close();
