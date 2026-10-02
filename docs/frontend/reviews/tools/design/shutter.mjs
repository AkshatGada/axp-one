import { createRequire } from "node:module";
const require = createRequire("/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/");
const { chromium } = require("playwright-core");
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto("http://localhost:3410/", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
for (const vy of [880, 800, 700, 600, 500, 400, 300, 200, 120, 90, 60]) {
  const r = await p.evaluate(async (vy) => {
    const s = document.querySelector("#how"); const top = s.getBoundingClientRect().top + scrollY;
    window.__lenis ? window.__lenis.scrollTo(top - vy, { immediate: true, force: true }) : scrollTo(0, top - vy);
    await new Promise(r => setTimeout(r, 400));
    const cp = s.style.clipPath; const H = s.offsetHeight; const m = cp.match(/inset\(([\d.]+)%/);
    const ins = m ? +m[1] : 0; const visTop = s.getBoundingClientRect().top + ins / 100 * H;
    return { vy, cp: cp.slice(0, 60), H, visibleTopInViewport: Math.round(visTop) };
  }, vy);
  console.log(JSON.stringify(r));
}
await b.close();
