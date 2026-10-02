import { createRequire } from "node:module";
const require = createRequire("/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/");
const { chromium } = require("playwright-core");
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
await p.goto(process.env.BASE || "http://localhost:3410/", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
for (const [sel, off, name] of [["#payments .sp-meter", -250, "m-pay"], [".pg-close", 300, "m-close"], ["#data", 0, "m-ch"], [".ss", 600, "m-stage"]]) {
  const y = await p.evaluate(([s, o]) => { const e = document.querySelector(s) || document.querySelector("#payments"); return e.getBoundingClientRect().top + scrollY + o; }, [sel, off]);
  for (let k = Math.max(0, y - 1600); k < y; k += 200) { await p.evaluate((k) => scrollTo(0, k), k); await p.waitForTimeout(60); }
  await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(1800);
  await p.screenshot({ path: `out/v5/${name}.png` });
}
console.log(await p.evaluate(() => { const c = document.querySelector(".pg-close"); return { closeH: c?.offsetHeight }; }));
await b.close();
