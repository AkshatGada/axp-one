// Copy words (excluding figures marked data-visual / aria-hidden) and copy hygiene checks on the landing.
import { launch, open } from "./lib.mjs";
const browser = await launch();
const { ctx, page } = await open(browser, (process.env.BASE || "http://localhost:3411") + "/", { w: 1440, h: 900, reduced: true });
const r = await page.evaluate(() => {
  const clone = document.body.cloneNode(true);
  clone.querySelectorAll("[data-visual],[aria-hidden=true],script,style,noscript,video").forEach((e) => e.remove());
  const t = clone.textContent.replace(/\s+/g, " ");
  const words = t.split(" ").filter((x) => /[A-Za-z0-9]/.test(x));
  const ids = (document.body.innerText.match(/\b[0-9a-f]{12,}\b|\b[A-Za-z0-9]{32,}\b|v3-[a-z]+|run_[a-z0-9]+/g) || []).slice(0, 10);
  const exact = (document.body.innerText.match(/\b\d{1,3},\d{3}\b/g) || []).slice(0, 10);
  const secs = [...document.querySelectorAll("main > *")].map((s) => { const c = s.cloneNode(true); c.querySelectorAll("[data-visual],[aria-hidden=true]").forEach((e) => e.remove()); return [s.id || s.className.slice(0, 20), c.textContent.replace(/\s+/g, " ").split(" ").filter((x) => /[A-Za-z0-9]/.test(x)).length]; });
  return { words: words.length, ids, exact, secs, eyebrows: [...document.querySelectorAll("main i")].filter((i) => /^\d$/.test(i.textContent.trim())).length };
});
console.log(JSON.stringify(r));
await ctx.close(); await browser.close();
