// Fine frames over a scroll range: node fine.mjs <w> <h> <fromY> <toY> <stepPx> <tag> [dpr]
import { launch, open, scrollTo, sheet, SCRATCH } from "./lib.mjs";
const BASE = process.env.BASE || "http://localhost:3410";
const [w, h, a, b, st] = process.argv.slice(2, 7).map(Number); const tag = process.argv[7] || "fine"; const dpr = +(process.argv[8] || 1);
const browser = await launch();
const { ctx, page } = await open(browser, BASE + "/", { w, h, dpr, wait: 1500 });
const files = [], labels = [];
for (let y = a; y <= b; y += st) { const got = await scrollTo(page, y, 450); const f = `${SCRATCH}/${tag}-${y}.png`; await page.screenshot({ path: f }); files.push(f); labels.push(`y=${got}`); }
await sheet(browser, files, `${SCRATCH}/${tag}-sheet.png`, { cols: 4, tw: 460, labels });
await ctx.close(); await browser.close(); console.log(files.length);
