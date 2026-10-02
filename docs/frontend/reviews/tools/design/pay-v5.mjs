import { createRequire } from "node:module";
const require = createRequire("/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/");
const { chromium } = require("playwright-core");
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto("http://localhost:3410/", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
const top = await p.evaluate(() => document.querySelector("#payments .sp-meter").getBoundingClientRect().top + scrollY);
for (const [off, n] of [[-700, "pay-a"], [-450, "pay-b"], [-250, "pay-c"], [-50, "pay-d"]]) {
  await p.evaluate((y) => window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y), top + off); await p.waitForTimeout(1500);
  await p.screenshot({ path: `out/v5/${n}.png`, clip: { x: 560, y: 0, width: 820, height: 900 } });
  console.log(n, await p.evaluate(() => [...document.querySelectorAll("#payments .sp-meter-seg")].map(e => e.dataset.state + ":" + e.style.transform + ":" + e.style.opacity).join(" | ")));
}
await b.close();
